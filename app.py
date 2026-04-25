import streamlit as st
import pandas as pd
import sqlite3
import time

# Configuration
DB_NAME = 'predictive_maintenance.db'

def load_data(db_name: str = DB_NAME) -> pd.DataFrame:
    """
    Loads the latest sensor data from the SQLite database.
    
    In a real-time scenario, this function would query only the most recent batch 
    of data. For this prototype, we load all available data for visualization.
    """
    try:
        conn = sqlite3.connect(db_name)
        # Query the data, ordering by timestamp to ensure correct plotting sequence
        query = "SELECT timestamp, vibration_x, vibration_y, vibration_z, machine_id FROM sensor_readings ORDER BY timestamp ASC"
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except sqlite3.OperationalError:
        st.error(f"Database '{db_name}' not found or table 'sensor_readings' does not exist. Please run database.py first.")
        return pd.DataFrame()

def display_dashboard(df: pd.DataFrame):
    """
    Displays the predictive maintenance dashboard using Streamlit components.
    """
    st.title("⚙️ Predictive Maintenance Dashboard (5G Prototype)")
    st.markdown("---")
    st.subheader("Machine Vibration Analysis")
    
    if df.empty:
        st.warning("No data available to display. Ensure data has been generated and stored.")
        return

    # Display metadata
    st.sidebar.header("System Status")
    st.sidebar.write(f"Total Records Processed: {len(df)}")
    st.sidebar.write(f"Data Source: {DB_NAME}")
    
    # --- Visualization ---
    
    # 1. Time-series chart for Vibration X (Primary focus)
    st.header("📈 Vibration X Trend Over Time")
    st.line_chart(df.set_index('timestamp')[['vibration_x']])
    
    # 2. Multi-sensor comparison chart
    st.header("📊 Multi-Sensor Comparison (X, Y, Z)")
    # We use a multi-plot approach for better comparison
    fig = pd.DataFrame({
        'X': df['vibration_x'],
        'Y': df['vibration_y'],
        'Z': df['vibration_z']
    }).set_index('timestamp')
    
    st.line_chart(fig)

    # 3. Data Summary (Optional: showing min/max/mean)
    st.header("📊 Data Summary Statistics")
    summary_df = df[['vibration_x', 'vibration_y', 'vibration_z']].describe().T
    st.dataframe(summary_df.round(2))


def main():
    """
    Main function to run the Streamlit application.
    """
    # Use st.cache_data to prevent reloading the database on every rerun, improving performance.
    @st.cache_data(ttl=60) # Cache data for 60 seconds
    def get_data():
        return load_data()

    data = get_data()
    display_dashboard(data)

if __name__ == '__main__':
    # To run this dashboard, execute: streamlit run app.py
    main()
