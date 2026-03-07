import georinex as gr
import pandas as pd
import numpy as np

# -----------------------------
# FILE PATHS
# -----------------------------

NAV_FILE = "brdc0660.26n"
SP3_FILE = "GFZ0MGXRAP_20260660000_01D_05M_ORB.SP3"
CLK_FILE = "GFZ0MGXRAP_20260660000_01D_30S_CLK.CLK"

# -----------------------------
# LOAD NAVIGATION DATA
# -----------------------------

print("Loading RINEX Navigation File...")

nav = gr.load(NAV_FILE)

# Extract clock parameters
clock_bias = nav["SVclockBias"]
clock_drift = nav["SVclockDrift"]
clock_drift_rate = nav["SVclockDriftRate"]

print("Navigation file loaded")

# -----------------------------
# COMPUTE BROADCAST CLOCK ERROR
# -----------------------------

print("Computing broadcast clock error...")

t = 1000  # placeholder time value

clock_error = clock_bias + clock_drift * t + clock_drift_rate * (t ** 2)

clock_error = clock_error.to_dataframe().reset_index()

# -----------------------------
# LOAD PRECISE ORBIT DATA
# -----------------------------

print("Loading SP3 precise orbit file...")

sp3 = gr.load(SP3_FILE)

# Extract positions
precise_x = sp3["position_x"]
precise_y = sp3["position_y"]
precise_z = sp3["position_z"]

precise_x = precise_x.to_dataframe().reset_index()
precise_y = precise_y.to_dataframe().reset_index()
precise_z = precise_z.to_dataframe().reset_index()

print("SP3 orbit data loaded")

# -----------------------------
# SIMULATE BROADCAST POSITION
# -----------------------------
# Normally computed using Kepler equations
# For prototype we approximate

print("Computing broadcast satellite position (approx)...")

broadcast_x = precise_x.copy()
broadcast_y = precise_y.copy()
broadcast_z = precise_z.copy()

broadcast_x["position_x"] += np.random.normal(0, 2, len(broadcast_x))
broadcast_y["position_y"] += np.random.normal(0, 2, len(broadcast_y))
broadcast_z["position_z"] += np.random.normal(0, 2, len(broadcast_z))

# -----------------------------
# COMPUTE ORBIT ERROR
# -----------------------------

print("Computing orbit error...")

orbit_error = np.sqrt(
    (broadcast_x["position_x"] - precise_x["position_x"])**2 +
    (broadcast_y["position_y"] - precise_y["position_y"])**2 +
    (broadcast_z["position_z"] - precise_z["position_z"])**2
)

# -----------------------------
# BUILD DATASET
# -----------------------------

print("Creating dataset...")

dataset = pd.DataFrame()

dataset["clock_error"] = clock_error["SVclockBias"]
dataset["orbit_error"] = orbit_error

dataset["time"] = pd.date_range(
    start="2026-03-07",
    periods=len(dataset),
    freq="5T"
)

dataset = dataset.set_index("time")

# -----------------------------
# RESAMPLE TO 15 MINUTES
# -----------------------------

dataset_15min = dataset.resample("15T").mean()

# -----------------------------
# SAVE DATASET
# -----------------------------

dataset_15min.to_csv("gnss_error_dataset.csv")

print("Dataset saved as gnss_error_dataset.csv")

print(dataset_15min.head())