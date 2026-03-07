import georinex as gr
import pandas as pd
import numpy as np
import os

# -------------------------------
# FILE PATHS
# -------------------------------

NAV_FILE = "brdc0660.26n"
SP3_FILE = "GFZ0MGXRAP_20260660000_01D_05M_ORB.SP3"

# -------------------------------
# DEBUG: SHOW FILES
# -------------------------------

print("Current working directory:", os.getcwd())
print("Files in folder:", os.listdir())

# -------------------------------
# LOAD NAVIGATION FILE
# -------------------------------

print("\nLoading RINEX Navigation File...")

nav = gr.load(NAV_FILE)

print("Navigation file loaded")

# Extract clock parameters
clock_bias = nav["SVclockBias"]
clock_drift = nav["SVclockDrift"]
clock_drift_rate = nav["SVclockDriftRate"]

# -------------------------------
# COMPUTE CLOCK ERROR
# -------------------------------

print("Computing broadcast clock error...")

t = 1000

clock_error = clock_bias + clock_drift * t + clock_drift_rate * (t ** 2)

clock_error_df = clock_error.to_dataframe(name="clock_error").reset_index()

# -------------------------------
# LOAD PRECISE ORBIT FILE
# -------------------------------

print("\nLoading SP3 precise orbit file...")

sp3 = gr.load(SP3_FILE)

print("SP3 orbit file loaded")

# SP3 coordinates
precise_x = sp3["x"].to_dataframe(name="x").reset_index()
precise_y = sp3["y"].to_dataframe(name="y").reset_index()
precise_z = sp3["z"].to_dataframe(name="z").reset_index()

# -------------------------------
# SIMULATE BROADCAST ORBIT
# -------------------------------

print("Simulating broadcast orbit...")

broadcast_x = precise_x["x"] + np.random.normal(0, 2, len(precise_x))
broadcast_y = precise_y["y"] + np.random.normal(0, 2, len(precise_y))
broadcast_z = precise_z["z"] + np.random.normal(0, 2, len(precise_z))

# -------------------------------
# COMPUTE ORBIT ERROR
# -------------------------------

print("Computing orbit error...")

orbit_error = np.sqrt(
    (broadcast_x - precise_x["x"])**2 +
    (broadcast_y - precise_y["y"])**2 +
    (broadcast_z - precise_z["z"])**2
)

# -------------------------------
# BUILD DATASET
# -------------------------------

print("Creating dataset...")

dataset = pd.DataFrame()

dataset["clock_error"] = clock_error_df["clock_error"][:len(orbit_error)]
dataset["orbit_error"] = orbit_error

dataset["time"] = pd.date_range(
    start="2026-03-07",
    periods=len(dataset),
    freq="5T"
)

dataset = dataset.set_index("time")

# -------------------------------
# RESAMPLE TO 15 MINUTES
# -------------------------------

dataset_15min = dataset.resample("15T").mean()

# -------------------------------
# SAVE DATASET
# -------------------------------

dataset_15min.to_csv("gnss_error_dataset.csv")

print("\nDataset successfully created!")
print("Saved as: gnss_error_dataset.csv")

print("\nPreview:")
print(dataset_15min.head())