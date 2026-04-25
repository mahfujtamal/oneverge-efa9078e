import sqlite3
import pandas as pd
from typing import Optional

DB_NAME = 'predictive_maintenance.db'

def initialize_database(db_name: str = DB_NAME) -> None:
    """
    Initializes the SQLite database and creates the necessary table 
    to store sensor data.
    
    This function establishes the persistent storage layer for the system.
    """
    conn = None
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        
        # Create the table if it doesn't exist.
        # The schema is designed to handle time-series sensor data efficiently.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                vibration_x REAL NOT NULL,
                vibration_y REAL NOT NULL,
                vibration_z REAL NOT NULL,
                machine_id TEXT NOT NULL
            );
        """)
        conn.commit()
        print(f"[Database] Database '{db_name}' initialized successfully. Table 'sensor_readings' ensured.")
    except sqlite3.Error as e:
        print(f"[Database] Error initializing database: {e}")
    finally:
        if conn:
            conn.close()

def store_data(df: pd.DataFrame, machine_id: str, db_name: str = DB_NAME) -> int:
    """
    Stores a DataFrame of sensor readings into the SQLite database.
    
    Args:
        df: DataFrame containing 'timestamp', 'vibration_x', 'vibration_y', 'vibration_z'.
        machine_id: Identifier for the machine generating the data.
        db_name: The name of the SQLite database file.
        
    Returns:
        The number of rows successfully inserted.
    """
    conn = None
    rows_inserted = 0
    try:
        conn = sqlite3.connect(db_name)
        
        # Prepare the data for insertion. We need to add the machine_id column.
        data_to_insert = df.copy()
        data_to_insert['machine_id'] = machine_id
        
        # Use pandas to_sql for efficient bulk insertion
        data_to_sql = data_to_insert[['timestamp', 'vibration_x', 'vibration_y', 'vibration_z', 'machine_id']]
        
        data_to_sql.to_sql('sensor_readings', conn, if_exists='append', index=False)
        
        rows_inserted = len(data_to_sql)
        conn.commit()
        print(f"[Database] Successfully stored {rows_inserted} records for Machine {machine_id}.")
        
    except sqlite3.Error as e:
        print(f"[Database] Error storing data: {e}")
    finally:
        if conn:
            conn.close()
            
    return rows_inserted

if __name__ == '__main__':
    # Example usage demonstrating the workflow
    print("--- [Database] Running database initialization test ---")
    initialize_database()
    
    # Simulate data generation (requires simulator.py to be run first or mock data)
    try:
        from simulator import generate_vibration_data
        print("\n--- [Database] Generating mock data for storage test ---")
        mock_data = generate_vibration_data(num_samples=50)
        
        # Store the data
        store_data(mock_data, machine_id="MCH-42A")
        
    except ImportError:
        print("\n[Database] Warning: Could not import simulator. Run simulator.py first.")
