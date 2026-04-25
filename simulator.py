import numpy as np
import pandas as pd
import time
from typing import List, Dict

def generate_vibration_data(num_samples: int = 100, sampling_rate: float = 100.0) -> pd.DataFrame:
    """
    Generates synthetic time-series vibration data simulating a machine's health status.
    
    This function simulates the core data source for the Predictive Maintenance system.
    The data structure mimics real-world sensor readings (e.g., acceleration, velocity).
    
    Args:
        num_samples: The number of data points to generate.
        sampling_rate: The frequency of sampling in Hz.
        
    Returns:
        A pandas DataFrame containing the simulated sensor readings.
    """
    print("--- [Simulator] Starting data generation process ---")
    
    # Time vector generation
    time_vector = np.arange(num_samples) / sampling_rate
    
    # Base signal (simulating normal operation - low noise)
    base_signal = np.sin(2 * np.pi * 5 * time_vector) * 0.5 + np.random.normal(0, 0.1, num_samples)
    
    # Simulate a gradual anomaly (e.g., bearing wear) starting around 50% of the samples
    anomaly_start_index = int(num_samples * 0.5)
    anomaly_duration = num_samples - anomaly_start_index
    
    if anomaly_duration > 0:
        # Increase amplitude and noise to simulate degradation
        anomaly_signal = np.sin(2 * np.pi * 5 * time_vector[anomaly_start_index:]) * (0.5 + np.linspace(0, 1.5, anomaly_duration)) + np.random.normal(0, 0.5, anomaly_duration)
        
        # Combine base signal and anomaly signal
        vibration_data = np.concatenate([
            base_signal[:anomaly_start_index], 
            anomaly_signal
        ])
    else:
        vibration_data = base_signal

    # Create the DataFrame
    data = pd.DataFrame({
        'timestamp': time_vector,
        'vibration_x': vibration_data,
        'vibration_y': vibration_data * 0.8 + np.random.normal(0, 0.1, num_samples), # Correlated but slightly different
        'vibration_z': vibration_data * 0.9 + np.random.normal(0, 0.1, num_samples)
    })
    
    print(f"--- [Simulator] Successfully generated {num_samples} data points. ---")
    return data

if __name__ == '__main__':
    # Example usage: Generate 200 samples
    data = generate_vibration_data(num_samples=200)
    print("\nSample Data Head:")
    print(data.head())
    
    # In a real 5G environment, this function would be called continuously 
    # and streamed data would be processed in near real-time.
