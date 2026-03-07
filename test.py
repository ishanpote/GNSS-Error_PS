# app.py
import streamlit as st
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import joblib
import os
import warnings
from typing import Dict

# Suppress specific warnings
warnings.filterwarnings('ignore', 'dropout option adds dropout after all but last recurrent layer')

# -------------------------
# Device
# -------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# -------------------------
# Helper: Prepare data for GP
# -------------------------
def prepare_data_for_gp(X, scaler, points_per_day=41, n_past_days=7):
    """Prepare data for Gaussian Process prediction"""
    if isinstance(X, torch.Tensor):
        X = X.cpu().numpy()
    if len(X.shape) == 3:
        X_reshaped = X
    else:
        X_reshaped = X.reshape(-1, points_per_day * n_past_days, 4)
    X_gp = X_reshaped.reshape(X_reshaped.shape[0], -1)
    return X_gp

# -------------------------
# Model Definitions
# -------------------------
class GRUModel(nn.Module):
    def __init__(self, input_size, hidden_size=128, num_layers=2, dropout=0.3, output_size=4, bidirectional=True):
        super(GRUModel, self).__init__()
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=bidirectional
        )
        self.fc = nn.Linear(hidden_size * (2 if bidirectional else 1), output_size)

    def forward(self, x, n_future=41):
        out, _ = self.gru(x)
        out = out[:, -n_future:, :]
        out = self.fc(out)
        return out


class LSTMModel(nn.Module):
    def __init__(self, input_size=4, hidden_size=128, num_layers=2, dropout=0.3, output_size=4, n_future=41, bidirectional=False):
        super(LSTMModel, self).__init__()
        self.n_future = n_future
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=bidirectional
        )
        self.fc = nn.Linear(hidden_size * (2 if bidirectional else 1), output_size)

    def forward(self, x, n_future=None):
        if n_future is None:
            n_future = self.n_future
        out, _ = self.lstm(x)
        out = out[:, -n_future:, :]
        out = self.fc(out)
        return out


class TimeSeriesTransformer(nn.Module):
    def __init__(self, input_size, d_model=128, nhead=4, num_layers=2, dim_feedforward=256, dropout=0.3, output_size=4):
        super(TimeSeriesTransformer, self).__init__()
        self.input_fc = nn.Linear(input_size, d_model)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.output_fc = nn.Linear(d_model, output_size)

    def forward(self, x, n_future=41):
        x = self.input_fc(x)
        x = self.transformer_encoder(x)
        out = self.output_fc(x[:, -n_future:, :])
        return out


# -------------------------
# Helper: Load models
# -------------------------
def load_models(model_paths: Dict[str, str], device: torch.device, input_size=4, points_per_day=41, n_future_days=1):
    models = {}

    # Hyperparameters (best found during training)
    best_gru_params = dict(hidden_size=98, num_layers=2, dropout=0.3, bidirectional=True)
    best_bigru_params = dict(hidden_size=107, num_layers=2, dropout=0.3, bidirectional=True)
    best_lstm_params = dict(hidden_size=196, num_layers=2, dropout=0.3, bidirectional=False)
    best_bilstm_params = dict(hidden_size=115, num_layers=1, dropout=0.3, bidirectional=True)
    best_transformer_params = dict(d_model=128, nhead=4, num_layers=2, dim_feedforward=409, dropout=0.3, output_size=input_size)

    for name, path in model_paths.items():
        try:
            if name == "Gaussian Process":
                gp_model = joblib.load(path)
                models[name] = gp_model
                print(f"✅ Loaded {name}")
                continue

            if name == "GRU":
                model = GRUModel(input_size=input_size, output_size=input_size, **best_gru_params)
            elif name == "biGRU":
                model = GRUModel(input_size=input_size, output_size=input_size, **best_bigru_params)
            elif name == "LSTM":
                model = LSTMModel(input_size=input_size, **best_lstm_params)
            elif name == "biLSTM":
                model = LSTMModel(input_size=input_size, **best_bilstm_params)
            elif name == "Transformer":
                model = TimeSeriesTransformer(input_size=input_size, **best_transformer_params)
            else:
                continue

            state = torch.load(path, map_location=device)
            model.load_state_dict(state)
            model.to(device)
            model.eval()
            models[name] = model
            print(f"✅ Loaded {name}")
        except Exception as e:
            print(f"❌ Failed to load {name}: {e}")
    return models


# -------------------------
# Streamlit App
# -------------------------
st.title("15-min Time Series Forecasting Ensemble (Voting Average)")

st.markdown("""
**Instructions:**
1. Upload a CSV with columns: `utc_time`, `x_error(m)`, `y_error(m)`, `z_error(m)`, `satclockerror(m)`
2. Choose past and future days.
3. Download predictions after generation.
""")

points_per_day = 41
uploaded_file = st.file_uploader("Upload your CSV", type=["csv"])
n_past_days = st.number_input("Number of past days", value=7, step=1)
n_future_days = st.number_input("Number of future days", value=1, step=1)

if uploaded_file:
    df = pd.read_csv(uploaded_file)
    st.success("✅ File uploaded successfully!")

    required_cols = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)', 'utc_time']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        st.error(f"Missing columns: {missing}")
        st.stop()

    # Load scaler
    scaler_path = os.path.join(os.path.dirname(__file__), "scaler", "scaler.pkl")
    if not os.path.exists(scaler_path):
        st.error(f"Scaler file not found: {scaler_path}")
        st.stop()
    scaler = joblib.load(scaler_path)

    # Load models
    model_dir = os.path.join(os.path.dirname(__file__), "model")
    model_paths = {
        "GRU": os.path.join(model_dir, "15min-best_gru_model_with_timesereas split.pth"),
        "biGRU": os.path.join(model_dir, "15min-best_bigru_model_with_timesereas split.pth"),
        "LSTM": os.path.join(model_dir, "15min-best_lstm_model.pth"),
        "biLSTM": os.path.join(model_dir, "15min-best_bilstm_model_with_timesereas split.pth"),
        "Transformer": os.path.join(model_dir, "15min-best_transformars_model_with_timesereas split.pth"),
        "Gaussian Process": os.path.join(model_dir, "gp.pkl")
    }

    with st.spinner("Loading models..."):
        models = load_models(model_paths, device=device)
    st.success(f"✅ Loaded {len(models)} models")

    # Prepare sequences
    features = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)']
    data_scaled = scaler.transform(df[features].values.astype(float))
    seq_len = n_past_days * points_per_day
    if len(data_scaled) < seq_len:
        st.error(f"Not enough data for {n_past_days} days ({seq_len} rows required).")
        st.stop()

    X_seq = []
    for i in range(seq_len, len(data_scaled) + 1):
        X_seq.append(data_scaled[i - seq_len:i])
    X_seq = np.array(X_seq)

    X_tensor = torch.tensor(X_seq, dtype=torch.float32).to(device)

    # Predictions
    st.markdown("### Generating Predictions...")
    preds_list = []

    with torch.no_grad():
        for name, model in models.items():
            st.write(f"🔹 Predicting with {name}...")
            try:
                n_future_total = points_per_day * n_future_days
                if name == "Gaussian Process":
                    X_gp = prepare_data_for_gp(X_tensor, scaler, points_per_day=points_per_day)
                    gp_model = model
                    pred_np = np.zeros((X_gp.shape[0], points_per_day, len(features)))
                    if isinstance(gp_model, dict):
                        for i, feat in enumerate(features):
                            key = feat.replace("(m)", "").strip()
                            if key in gp_model:
                                y_pred = gp_model[key].predict(X_gp)
                                pred_np[:, :, i] = y_pred.reshape(-1, points_per_day)
                            else:
                                st.warning(f"Feature '{key}' not found in GP model.")
                    else:
                        y_pred = gp_model.predict(X_gp)
                        pred_np = y_pred.reshape(-1, points_per_day, len(features))
                    pred = torch.FloatTensor(pred_np).to(device)
                else:
                    pred = model(X_tensor, n_future=n_future_total)
                preds_list.append(pred.cpu().numpy())
            except Exception as e:
                st.warning(f"{name} prediction failed: {e}")

    if not preds_list:
        st.error("No predictions generated.")
        st.stop()

    min_time = min(p.shape[1] for p in preds_list)
    aligned_preds = [p[:, :min_time, :] for p in preds_list]
    avg_pred = np.mean(np.stack(aligned_preds, axis=0), axis=0)

    # Inverse transform
    n_samples, n_time, n_features = avg_pred.shape
    pred_2d = avg_pred.reshape(-1, n_features)
    output_inv = scaler.inverse_transform(pred_2d)

    # Build output DataFrame
    df_out = pd.DataFrame(output_inv, columns=features)
    last_time = pd.to_datetime(df['utc_time'].iloc[-1])
    future_times = pd.date_range(start=last_time + pd.Timedelta(minutes=15), periods=len(df_out), freq='15min')
    df_out['utc_time'] = future_times.strftime('%d-%m-%Y %H:%M')
    df_out = df_out[['utc_time'] + features]

    csv_bytes = df_out.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Download predictions CSV", data=csv_bytes, file_name="ensemble_voting_output.csv", mime="text/csv")
    st.dataframe(df_out.head(200))
    st.success("✅ Prediction complete.")

else:
    st.info("Upload a CSV file to begin.")
