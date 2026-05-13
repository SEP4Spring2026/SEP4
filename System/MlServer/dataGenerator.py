import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Configuration
NUM_SAMPLES = 100000
SAMPLE_INTERVAL_SECONDS = 5
START_TIME = datetime(2026, 4, 27, 8, 0, 0) # Starting timestamp

def generate_kitchen_data():
    timestamps = []
    co2_list = []
    temp_list = []
    hum_list = []
    labels = []

    # Initial baseline values
    current_time = START_TIME
    co2 = 500.0
    temp = 22.0
    hum = 40.0
    
    # State tracking
    state = "normal"
    ticks_in_state = 0
    target_ticks = 0

    for i in range(NUM_SAMPLES):
        # State Machine Transitions
        if ticks_in_state >= target_ticks:
            # Decide next state
            rand_val = np.random.rand()
            if state == "normal":
                # ML BALANCED LOGIC: Artificially higher chances to ensure enough training data
                if rand_val < 0.15: # 15% chance for a fire 
                    state = "fire"
                    target_ticks = np.random.randint(60, 120) # 5 to 10 mins of fire data
                elif rand_val < 0.50:  # 35% chance to start cooking (0.15 to 0.50)
                    state = "cooking"
                    target_ticks = np.random.randint(240, 720) # 20 to 60 mins of cooking
                else:
                    state = "normal"
                    target_ticks = np.random.randint(200, 600) # Shorter normal periods for more transitions
            else:
                # After cooking or fire, always return to normal to cool down
                state = "normal"
                target_ticks = np.random.randint(360, 1000)
            
            ticks_in_state = 0

        # Apply physics/heuristics based on current state
        if state == "normal":
            # Baseline drifts back to normal
            co2 += (500 - co2) * 0.01 + np.random.normal(0, 2)
            temp += (22 - temp) * 0.01 + np.random.normal(0, 0.05)
            hum += (40 - hum) * 0.01 + np.random.normal(0, 0.1)
        
        elif state == "cooking":
            # CO2 rises up to ~1500 (e.g., gas stove), Temp to ~30, Hum to ~70 (boiling)
            co2 += (1500 - co2) * 0.005 + np.random.normal(0, 5)
            temp += (30 - temp) * 0.002 + np.random.normal(0, 0.1)
            hum += (70 - hum) * 0.005 + np.random.normal(0, 0.5)
            
        elif state == "fire":
            # CO2 spikes dangerously high, Temp spikes rapidly, Hum drops (drying out)
            co2 += (5000 - co2) * 0.05 + np.random.normal(0, 20)
            temp += (80 - temp) * 0.02 + np.random.normal(0, 0.5)
            hum += (15 - hum) * 0.02 + np.random.normal(0, 0.5)

        # Ensure values don't drop below physical/sensor limitations
        co2 = max(400, co2)
        temp = max(10, temp)
        hum = max(0, min(100, hum))

        # Append to lists
        timestamps.append(current_time)
        co2_list.append(round(co2, 1))
        temp_list.append(round(temp, 2))
        hum_list.append(round(hum, 1))
        labels.append(state)

        # Increment time and tick counter
        current_time += timedelta(seconds=SAMPLE_INTERVAL_SECONDS)
        ticks_in_state += 1

    # Create DataFrame and save
    df = pd.DataFrame({
        'timestamp': timestamps,
        'co2': co2_list,
        'temp': temp_list,
        'hum': hum_list,
        'state': labels
    })

    return df

print("Generating 100,000 mock samples... This will take a few seconds.")
df = generate_kitchen_data()
df.to_csv("kitchen_sensor_mock_data.csv", index=False)

# Optional: Print out a quick summary to prove the dataset is balanced
print("\nDataset Generation Complete! Here is the class breakdown:")
print(df['state'].value_counts())
print("\nFile saved as 'kitchen_sensor_mock_data.csv'.")