import streamlit as st
import pandas as pd
import sqlite3
import time
import numpy as np
from database import initialize_database # Import the initialization function

# Configuration
DB_NAME = 'predictive_maintenance.db'

def load_data(db_name: str = DB_NAME) -> pd.DataFrame:
    """
    Loads the sensor data from the SQLite database.
    
    For a real-time dashboard, this function loads all available data 
    to calculate metrics and display trends.
    """
    try:
        conn = sqlite3.connect(db_name)
        # Query the data, ordering by timestamp
        query = "SELECT timestamp, vibration_x, vibration_y, vibration_z, machine_id FROM sensor_readings ORDER BY timestamp ASC"
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except sqlite3.OperationalError:
        st.error(f"Database '{db_name}' not found or table 'sensor_readings' does not exist. Please ensure database initialization was successful.")
        return pd.DataFrame()

def display_dashboard(df: pd.DataFrame):
    """
    Displays the predictive maintenance dashboard using Streamlit components, 
    focusing on key metrics and real-time visualization.
    """
    st.title("⚙️ Predictive Maintenance Dashboard (5G Prototype)")
    st.markdown("---")
    
    if df.empty:
        st.warning("No data available to display. Ensure data has been generated and stored.")
        return

    # --- 1. Key Metric Cards (Current Status) ---
    st.header("⚡ System Key Metrics")
    
    # Calculate key metrics based on the entire dataset for summary
    latest_vibration_x = df['vibration_x'].iloc[-1]
    max_vibration_x = df['vibration_x'].max()
    avg_vibration_x = df['vibration_x'].mean()
    
    # Simulate Temperature Metric (since it's not stored in the DB)
    # We use a simple calculation based on the average vibration as a proxy.
    simulated_temperature = round(avg_vibration_x * 10 + 20, 2) 

    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(label="Latest Vibration X", value=f"{latest_vibration_x:.2f}")
    with col2:
        st.metric(label="Max Vibration X (Alert)", value=f"{max_vibration_x:.2f}", delta=f"{max_vibration_x - avg_vibration_x:.2f}")
    with col3:
        st.metric(label="Simulated Temp (°C)", value=f"{simulated_temperature:.2f}")

    st.markdown("---")

    # --- 2. Real-time Line Chart ---
    st.header("📈 Vibration Trend Analysis (X-Axis)")
    
    # Use the entire dataset for the trend line
    st.line_chart(df.set_index('timestamp')[['vibration_x']])

    # --- 3. Detailed Analysis ---
    st.header("📊 Data Summary Statistics")
    
    # Display summary statistics for all three axes
    summary_df = df[['vibration_x', 'vibration_y', 'vibration_z']].describe().T
    st.dataframe(summary_df.round(2))


def main():
    """
    Main function to run the Streamlit application.
    """
    # CRITICAL FIX: Ensure the database schema is initialized before attempting to load data.
    initialize_database(DB_NAME)
    
    # Use st.cache_data to prevent reloading the database on every rerun, improving performance.
    @st.cache_data(ttl=60) # Cache data for 60 seconds
    def get_data():
        return load_data()

    data = get_data()
    display_dashboard(data)

if __name__ == '__main__':
    # To run this dashboard, execute: streamlit run app.py
    main()
