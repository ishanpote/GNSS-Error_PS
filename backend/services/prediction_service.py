"""
Core prediction service.
All ML logic lives here – completely independent of any UI framework.
"""
import os
import io
import warnings
from typing import Dict, Optional

import numpy as np
import pandas as pd
import torch
import joblib

from .models import GRUModel, LSTMModel, TimeSeriesTransformer, NBeatsModel

warnings.filterwarnings("ignore", "dropout option adds dropout after all but last recurrent layer")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "..", "model")
SCALER_DIR = os.path.join(BASE_DIR, "..", "scaler")

FEATURES = ["x_error(m)", "y_error(m)", "z_error(m)", "satclockerror(m)"]
POINTS_PER_DAY = 41  # 15-min resolution → 24h * (60/15) ≈ 41 usable points

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---------------------------------------------------------------------------
# Model hyperparameters (must match training)
# ---------------------------------------------------------------------------
_BEST_GRU = dict(hidden_size=98, num_layers=2, dropout=0.3, bidirectional=True)
_BEST_BIGRU = dict(hidden_size=107, num_layers=2, dropout=0.3, bidirectional=True)
_BEST_LSTM = dict(hidden_size=196, num_layers=2, dropout=0.3, bidirectional=False)
_BEST_BILSTM = dict(hidden_size=115, num_layers=1, dropout=0.3, bidirectional=True)
_BEST_TRANSFORMER = dict(d_model=128, nhead=4, num_layers=2, dim_feedforward=409, dropout=0.3)
_NBEATS_PARAMS = dict(
    input_size=7 * 41 * 4,   # 1148
    theta_size=41 * 4,        # 164
    points_per_day=41,
    n_future_days=1,
    hidden_size=96,
    n_layers=2,
    n_blocks=3,
)

MODEL_FILES = {
    "GRU":         "15min-best_gru_model_with_timesereas split.pth",
    "biGRU":       "15min-best_bigru_model_with_timesereas split.pth",
    "LSTM":        "15min-best_lstm_model.pth",
    "biLSTM":      "15min-best_bilstm_model_with_timesereas split.pth",
    "Transformer": "15min-best_transformars_model_with_timesereas split.pth",
    "NBEATS":      "15min-best_NBEATS_model.pth",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_nn_model(name: str, input_size: int):
    """Instantiate the correct architecture for *name*."""
    if name == "GRU":
        return GRUModel(input_size=input_size, output_size=input_size, **_BEST_GRU)
    if name == "biGRU":
        return GRUModel(input_size=input_size, output_size=input_size, **_BEST_BIGRU)
    if name == "LSTM":
        return LSTMModel(
            input_size=input_size,
            output_size=input_size,
            hidden_size=_BEST_LSTM["hidden_size"],
            num_layers=_BEST_LSTM["num_layers"],
            dropout=_BEST_LSTM["dropout"],
            bidirectional=_BEST_LSTM["bidirectional"],
        )
    if name == "biLSTM":
        return LSTMModel(
            input_size=input_size,
            output_size=input_size,
            hidden_size=_BEST_BILSTM["hidden_size"],
            num_layers=_BEST_BILSTM["num_layers"],
            dropout=_BEST_BILSTM["dropout"],
            bidirectional=_BEST_BILSTM["bidirectional"],
        )
    if name == "Transformer":
        return TimeSeriesTransformer(input_size=input_size, output_size=input_size, **_BEST_TRANSFORMER)
    if name == "NBEATS":
        return NBeatsModel(**_NBEATS_PARAMS)
    raise ValueError(f"Unknown model name: {name}")


def _prepare_for_gp(X_np: np.ndarray) -> np.ndarray:
    """Flatten a 3-D array to 2-D for Gaussian Process inference."""
    return X_np.reshape(X_np.shape[0], -1)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_all_models(input_size: int = len(FEATURES)) -> Dict:
    """
    Load every available model from MODEL_DIR.
    Returns a dict  {name: model_object}.
    Neural-network models are PyTorch `nn.Module`, GP model is a plain dict.
    """
    loaded: Dict = {}

    for name, filename in MODEL_FILES.items():
        path = os.path.join(MODEL_DIR, filename)
        if not os.path.exists(path):
            print(f"[WARNING] Model file not found, skipping: {path}")
            continue
        try:
            nn_model = _build_nn_model(name, input_size)
            state = torch.load(path, map_location=device)
            nn_model.load_state_dict(state)
            nn_model.to(device)
            nn_model.eval()
            loaded[name] = nn_model
            print(f"[INFO] Loaded {name}")
        except Exception as exc:
            print(f"[ERROR] Could not load {name}: {exc}")

    # Gaussian Process (optional)
    gp_path = os.path.join(MODEL_DIR, "GP_models.pkl")
    if os.path.exists(gp_path):
        try:
            gp_obj = joblib.load(gp_path)
            if isinstance(gp_obj, dict):
                loaded["Gaussian Process"] = gp_obj
                print(f"[INFO] Loaded Gaussian Process ({len(gp_obj)} sub-models)")
        except Exception as exc:
            print(f"[ERROR] Could not load Gaussian Process: {exc}")

    return loaded


def run_prediction(
    csv_bytes: bytes,
    n_past_days: int = 7,
    n_future_days: int = 1,
    domain: str = "general",
) -> dict:
    """
    End-to-end prediction pipeline.

    Parameters
    ----------
    csv_bytes     : raw CSV file content (bytes)
    n_past_days   : how many past days to include in each input sequence
    n_future_days : how many future days to predict
    domain        : domain label (recorded in the response, does not change logic)

    Returns
    -------
    dict with keys:
        "status"       : "ok" | "error"
        "message"      : human-readable description
        "csv"          : predicted output as CSV string (on success)
        "preview_rows" : list-of-dicts for the first 200 rows (on success)
        "domain"       : echoed domain
    """
    try:
        df = pd.read_csv(io.BytesIO(csv_bytes))
    except Exception as exc:
        return {"status": "error", "message": f"Could not parse CSV: {exc}", "domain": domain}

    missing = [c for c in FEATURES + ["utc_time"] if c not in df.columns]
    if missing:
        return {
            "status": "error",
            "message": f"CSV is missing required columns: {missing}",
            "domain": domain,
        }

    # ---- Load scaler ----
    scaler_path = os.path.join(SCALER_DIR, "scaler.pkl")
    if not os.path.exists(scaler_path):
        return {"status": "error", "message": f"Scaler not found at {scaler_path}", "domain": domain}
    try:
        scaler = joblib.load(scaler_path)
    except Exception as exc:
        return {"status": "error", "message": f"Failed to load scaler: {exc}", "domain": domain}

    # Optional GP scaler
    gp_scaler_path = os.path.join(MODEL_DIR, "scaler_gp.pkl")
    gp_scaler = None
    if os.path.exists(gp_scaler_path):
        try:
            gp_scaler = joblib.load(gp_scaler_path)
        except Exception:
            pass

    # ---- Pre-process ----
    data = df[FEATURES].values.astype(float)
    data_scaled = scaler.transform(data)

    seq_len = n_past_days * POINTS_PER_DAY
    if len(data_scaled) < seq_len:
        return {
            "status": "error",
            "message": (
                f"Not enough rows: need {seq_len} ({n_past_days} days × {POINTS_PER_DAY} pts/day), "
                f"got {len(data_scaled)}."
            ),
            "domain": domain,
        }

    X_seq = np.array(
        [data_scaled[i - seq_len : i] for i in range(seq_len, len(data_scaled) + 1)],
        dtype=np.float32,
    )  # (n_samples, seq_len, n_features)

    # ---- Load models ----
    models = load_all_models(input_size=len(FEATURES))
    if not models:
        return {"status": "error", "message": "No models could be loaded.", "domain": domain}

    X_tensor = torch.tensor(X_seq, dtype=torch.float32).to(device)
    n_future_total = POINTS_PER_DAY * n_future_days
    preds_list = []

    with torch.no_grad():
        for name, model in models.items():
            try:
                if isinstance(model, NBeatsModel):
                    bs, sl, nf = X_seq.shape
                    nbeats_input_size = _NBEATS_PARAMS["input_size"]  # trained on 7 * 41 * 4 = 1148
                    if sl * nf != nbeats_input_size:
                        raise ValueError(
                            f"N-BEATS was trained with input_size={nbeats_input_size} "
                            f"({nbeats_input_size // (POINTS_PER_DAY * nf)} past days × "
                            f"{POINTS_PER_DAY} pts/day × {nf} features). "
                            f"Got {sl * nf} — ensure n_past_days=7 for N-BEATS."
                        )
                    X_flat = torch.tensor(X_seq.reshape(bs, sl * nf), dtype=torch.float32).to(device)
                    pred_np = model(X_flat).cpu().numpy()
                elif name == "Gaussian Process":
                    active_scaler = gp_scaler if gp_scaler is not None else scaler
                    X_gp = _prepare_for_gp(X_tensor.cpu().numpy())
                    pred_np = np.zeros((X_gp.shape[0], POINTS_PER_DAY, len(FEATURES)))
                    for fi, feat in enumerate(FEATURES):
                        feat_key = feat.replace("(m)", "").strip().replace(" ", "_")
                        for t in range(POINTS_PER_DAY):
                            key = f"{feat_key}_t{t}"
                            if key in model:
                                pred_np[:, t, fi] = model[key].predict(X_gp)
                else:
                    pred_np = model(X_tensor, n_future=n_future_total).cpu().numpy()

                preds_list.append(pred_np)
            except Exception as exc:
                print(f"[WARNING] {name} prediction failed: {exc}")

    if not preds_list:
        return {"status": "error", "message": "All models failed to produce predictions.", "domain": domain}

    # ---- Ensemble average ----
    min_t = min(p.shape[1] for p in preds_list)
    stacked = np.stack([p[:, :min_t, :] for p in preds_list], axis=0)
    avg_pred = np.mean(stacked, axis=0)

    n_s, n_t, n_f = avg_pred.shape
    try:
        output_inv = scaler.inverse_transform(avg_pred.reshape(-1, n_f))
    except Exception as exc:
        return {"status": "error", "message": f"Inverse transform failed: {exc}", "domain": domain}

    df_out = pd.DataFrame(output_inv, columns=FEATURES)

    # Generate 15-min timestamps starting after the last input timestamp
    try:
        last_time = pd.to_datetime(df["utc_time"].iloc[-1])
        future_times = pd.date_range(
            start=last_time + pd.Timedelta(minutes=15),
            periods=len(df_out),
            freq="15min",
        )
        df_out["utc_time"] = future_times.strftime("%d-%m-%Y %H:%M")
    except Exception:
        df_out["utc_time"] = ["N/A"] * len(df_out)

    df_out = df_out[["utc_time"] + FEATURES]
    df_out["domain"] = domain

    return {
        "status": "ok",
        "message": f"Prediction complete. {len(df_out)} rows generated.",
        "csv": df_out.to_csv(index=False),
        "preview_rows": df_out.head(200).to_dict(orient="records"),
        "domain": domain,
    }
