import georinex as gr
import pandas as pd
import numpy as np
import os

# -------------------------------
# FILE PATHS
# -------------------------------

NAV_FILE = "brdc0660.26n"
SP3_FILE = "GBM0MGXRAP_20260600000_01D_05M_ORB.SP3"

# -------------------------------
# DEBUG INFO
# -------------------------------

print("Current working directory:", os.getcwd())
print("Files in folder:", os.listdir())

# -------------------------------
# LOAD NAVIGATION FILE
# -------------------------------

print("\nLoading RINEX Navigation File...")

nav = gr.load(NAV_FILE)

print("Navigation file loaded")

clock_bias = nav["SVclockBias"]
clock_drift = nav["SVclockDrift"]
clock_drift_rate = nav["SVclockDriftRate"]

# -------------------------------
# CLOCK ERROR
# -------------------------------

print("Computing broadcast clock error...")

t = 1000

clock_error = clock_bias + clock_drift*t + clock_drift_rate*(t**2)

clock_error_df = clock_error.to_dataframe(name="clock_error").reset_index()

# -------------------------------
# LOAD SP3 FILE
# -------------------------------

print("\nLoading SP3 precise orbit file...")

sp3 = gr.load(SP3_FILE)

print("SP3 orbit file loaded")

# -------------------------------
# EXTRACT X Y Z FROM POSITION
# -------------------------------

position = sp3["position"].values

precise_x = position[:, :, 0].flatten()
precise_y = position[:, :, 1].flatten()
precise_z = position[:, :, 2].flatten()

# -------------------------------
# SIMULATE BROADCAST ORBIT
# -------------------------------

print("Simulating broadcast orbit...")

broadcast_x = precise_x + np.random.normal(0,2,len(precise_x))
broadcast_y = precise_y + np.random.normal(0,2,len(precise_y))
broadcast_z = precise_z + np.random.normal(0,2,len(precise_z))

# -------------------------------
# COMPUTE ORBIT ERROR
# -------------------------------

print("Computing orbit error...")

orbit_error = np.sqrt(
(broadcast_x - precise_x)**2 +
(broadcast_y - precise_y)**2 +
(broadcast_z - precise_z)**2
)

# -------------------------------
# BUILD DATASET
# -------------------------------

print("Creating dataset...")

n = min(len(clock_error_df), len(orbit_error))

dataset = pd.DataFrame()

dataset["clock_error"] = clock_error_df["clock_error"][:n]
dataset["orbit_error"] = orbit_error[:n]

dataset["time"] = pd.date_range(
start="2026-03-07",
periods=n,
freq="5min"
)

dataset = dataset.set_index("time")

# -------------------------------
# RESAMPLE 15 MIN
# -------------------------------

dataset_15min = dataset.resample("15min").mean()

# -------------------------------
# SAVE DATASET
# -------------------------------

dataset_15min.to_csv("gnss_error_dataset.csv")

print("\nDataset successfully created")
print("Saved file: gnss_error_dataset.csv")

print("\nPreview:")
print(dataset_15min.head())