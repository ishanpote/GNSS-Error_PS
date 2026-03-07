# app.py
import streamlit as st
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import joblib
import os
from typing import Dict

# -------------------------
# Device
# -------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# -------------------------
# Model Definitions
# -------------------------
class GRUModel(nn.Module):
    def __init__(self, input_size, hidden_size=128, num_layers=2, dropout=0.3, output_size=4, bidirectional=True):
        super(GRUModel, self).__init__()
        self.bidirectional = bidirectional
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=bidirectional
        )
        self.fc = nn.Linear(hidden_size * 2, output_size)  # bidirectional

    def forward(self, x, n_future=41):
        # x: (batch, seq_len, input_size)
        out, _ = self.gru(x)
        # take last n_future timesteps
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


class NBeatsBlock(nn.Module):
    def __init__(self, input_size, theta_size, hidden_size=128, n_layers=2):
        super(NBeatsBlock, self).__init__()
        layers = []
        in_features = input_size
        for _ in range(n_layers):
            layers.append(nn.Linear(in_features, hidden_size))
            layers.append(nn.ReLU())
            in_features = hidden_size
        self.fc = nn.Sequential(*layers)
        self.theta = nn.Linear(hidden_size, theta_size)

    def forward(self, x):
        x = x.reshape(x.size(0), -1)
        x = self.fc(x)
        return self.theta(x)


class NBeatsModel(nn.Module):
    def __init__(self, input_size, theta_size, points_per_day=41, n_future_days=1, n_blocks=3, hidden_size=128, n_layers=2):
        super(NBeatsModel, self).__init__()
        self.blocks = nn.ModuleList([
            NBeatsBlock(input_size=input_size, theta_size=theta_size, hidden_size=hidden_size, n_layers=n_layers)
            for _ in range(n_blocks)
        ])
        self.output_size = input_size
        self.points_per_day = points_per_day
        self.n_future_days = n_future_days

    def forward(self, x):
        out = 0
        for block in self.blocks:
            out = out + block(x)
        out = out.view(x.size(0), self.n_future_days * self.points_per_day, self.output_size)
        return out


# -------------------------
# Helper: load models
# -------------------------
def load_models(model_paths: Dict[str, str], device: torch.device, input_size=4, points_per_day=41, n_future_days=1):
    models = {}
    # Best parameters from your training notebooks
    best_gru_params = dict(hidden_size=98, num_layers=2, dropout=0.3, bidirectional=True)  # GRU
    best_bigru_params = dict(hidden_size=107, num_layers=2, dropout=0.3, bidirectional=True)  # biGRU
    best_lstm_params = dict(hidden_size=196, num_layers=2, dropout=0.3, bidirectional=False)  # LSTM
    best_bilstm_params = dict(hidden_size=115, num_layers=1, dropout=0.3, bidirectional=True)  # biLSTM (num_layers=1)
    best_transformer_params = dict(d_model=128, nhead=4, num_layers=2, dim_feedforward=409, dropout=0.3, output_size=input_size)  # Transformer
    nbeats_params = dict(
        input_size=7 * 41 * 4,  # 7 days * 41 points * 4 features = 1148
        theta_size=41 * 4,      # 41 future points * 4 features = 164
        points_per_day=41,
        n_future_days=1,
        hidden_size=96,
        n_layers=2,
        n_blocks=3
    )

    for name, path in model_paths.items():
        try:
            if not os.path.isabs(path):
                path = os.path.join(os.path.dirname(__file__), path)
            if not os.path.exists(path):
                st.error(f"Model file not found: {path}")
                continue
            if name == "GRU":
                model = GRUModel(input_size=input_size, output_size=input_size, **best_gru_params)
            elif name == "biGRU":
                model = GRUModel(input_size=input_size, output_size=input_size, **best_bigru_params)
            elif name == "LSTM":
                model = LSTMModel(input_size=input_size, hidden_size=best_lstm_params['hidden_size'], num_layers=best_lstm_params['num_layers'], dropout=best_lstm_params['dropout'], output_size=input_size, bidirectional=best_lstm_params['bidirectional'])
            elif name == "biLSTM":
                model = LSTMModel(input_size=input_size, hidden_size=best_bilstm_params['hidden_size'], num_layers=best_bilstm_params['num_layers'], dropout=best_bilstm_params['dropout'], output_size=input_size, bidirectional=best_bilstm_params['bidirectional'])
            elif name == "Transformer":
                model = TimeSeriesTransformer(input_size=input_size, **best_transformer_params)
            elif name == "NBEATS":
                # NBEATS expects input_size=1148, theta_size=96, hidden_size=96, n_layers=2, n_blocks=3
                model = NBeatsModel(**nbeats_params)
            else:
                st.warning(f"Unknown model key: {name}. Skipping.")
                continue

            state = torch.load(path, map_location=device)
            model.load_state_dict(state)
            model.to(device)
            model.eval()
            models[name] = model
            st.write(f"Loaded {name} from {path}")
        except Exception as e:
            st.error(f"Failed to load model '{name}' from {path}: {e}")
    return models


# -------------------------
# Streamlit App
# -------------------------
st.title("15-min Time Series Forecasting Ensemble (Voting average)")


st.markdown(
    """
    **Instructions:**
    1. Upload a CSV file with the following columns:
        - `utc_time` (timestamp or string)
        - `x_error(m)`, `y_error(m)`, `z_error(m)`, `satclockerror(m)`
    2. Configure the number of points per day and days to use for prediction below.
    3. After uploading, predictions will be generated and available for download.
    """
)

uploaded_file = st.file_uploader("Upload your CSV", type=["csv"])
points_per_day = st.number_input("Points per day (15-min resolution)", value=41, step=1)
n_past_days = st.number_input("Number of past days to use for sequence", value=7, step=1)
n_future_days = st.number_input("Number of future days to predict (days)", value=1, step=1)

if uploaded_file:
    df = pd.read_csv(uploaded_file)
    st.success("File uploaded successfully!")

    required_cols = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)', 'utc_time']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        st.error(f"Uploaded CSV is missing columns: {missing}")
    else:
        scaler_path = os.path.join(os.path.dirname(__file__), "..", "scaler", "scaler.pkl")
        gp_scaler_path = os.path.join(os.path.dirname(__file__), "model", "scaler_gp.pkl")
        gp_model_path = os.path.join(os.path.dirname(__file__), "model", "GP_models.pkl")
        if not os.path.exists(scaler_path):
            st.error(f"Scaler file not found: {scaler_path}")
            st.stop()
        try:
            scaler = joblib.load(scaler_path)
        except Exception as e:
            st.error(f"Failed to load scaler: {e}")
            st.stop()
        gp_scaler = None
        if os.path.exists(gp_scaler_path):
            try:
                gp_scaler = joblib.load(gp_scaler_path)
            except Exception as e:
                st.warning(f"GP scaler not loaded: {e}")
                gp_scaler = None

        features = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)']
        data = df[features].values.astype(float)
        data_scaled = scaler.transform(data)

        seq_len = int(n_past_days) * int(points_per_day)
        if len(data_scaled) < seq_len:
            st.error(f"Not enough rows in CSV for {n_past_days} past days ({seq_len} rows required). You provided {len(data_scaled)} rows.")
            st.stop()

        # Build sequences: for forecasting each time-step where we can take seq_len history
        X_seq = []
        seq_start_indices = []
        for i in range(seq_len, len(data_scaled) + 1):
            # take the last seq_len leading up to index i (exclusive)
            start = i - seq_len
            X_seq.append(data_scaled[start:i])
            seq_start_indices.append(i)
        X_seq = np.array(X_seq)  # shape (n_samples, seq_len, n_features)

        if X_seq.ndim != 3:
            st.error("Unexpected sequence shape after building X_seq.")
            st.stop()

        # Model paths (adjust paths if needed)
        model_dir = os.path.join(os.path.dirname(__file__), "..", "model")
        model_paths = {
            "GRU": os.path.join(model_dir, "15min-best_gru_model_with_timesereas split.pth"),
            "biGRU": os.path.join(model_dir, "15min-best_bigru_model_with_timesereas split.pth"),
            "LSTM": os.path.join(model_dir, "15min-best_lstm_model.pth"),
            "biLSTM": os.path.join(model_dir, "15min-best_bilstm_model_with_timesereas split.pth"),
            "Transformer": os.path.join(model_dir, "15min-best_transformars_model_with_timesereas split.pth"),
            "NBEATS": os.path.join(model_dir, "15min-best_NBEATS_model.pth")
        }
        # Add Gaussian Process model if available
        if os.path.exists(gp_model_path):
            model_paths["Gaussian Process"] = gp_model_path

        # Load models
        with st.spinner("Loading models..."):
            models = load_models({k: v for k, v in model_paths.items() if k != "Gaussian Process"}, device=device, input_size=len(features), points_per_day=int(points_per_day), n_future_days=int(n_future_days))
            gp_model = None
            if "Gaussian Process" in model_paths:
                try:
                    gp_model_loaded = joblib.load(model_paths["Gaussian Process"])
                    if isinstance(gp_model_loaded, dict):
                        gp_model = gp_model_loaded
                        st.success(f"✅ Gaussian Process loaded successfully ({len(gp_model.keys())} features)")
                    else:
                        st.error(f"❌ Gaussian Process failed to load: Invalid format {type(gp_model_loaded)}")
                except Exception as e:
                    st.error(f"❌ Gaussian Process failed to load: {str(e)}")

        if len(models) == 0 and gp_model is None:
            st.error("No models loaded successfully. Check model paths and files.")
            st.stop()

        # Convert X_seq to tensor once
        X_tensor = torch.tensor(X_seq, dtype=torch.float32).to(device)  # (n_samples, seq_len, n_features)

        preds_list = []
        preds_list = []
        with torch.no_grad():
            # Neural network and NBEATS models
            for name, model in models.items():
                try:
                    if isinstance(model, NBeatsModel):
                        batch_size = X_seq.shape[0]
                        seq_len = X_seq.shape[1]
                        n_features = X_seq.shape[2]
                        X_nbeats = X_seq.reshape(batch_size, seq_len * n_features)
                        X_tensor_nbeats = torch.tensor(X_nbeats, dtype=torch.float32).to(device)
                        pred = model(X_tensor_nbeats)
                        pred = pred.reshape(batch_size, -1, n_features)
                    else:
                        n_future_total = int(points_per_day) * int(n_future_days)
                        pred = model(X_tensor, n_future=n_future_total)
                    pred_np = pred.cpu().numpy()
                    preds_list.append(pred_np)
                except Exception as e:
                    st.warning(f"Model {name} failed during prediction: {e}")
            # Gaussian Process model
            if gp_model is not None:
                try:
                    # Prepare data for GP
                    def prepare_data_for_gp(X, scaler, points_per_day=41, n_past_days=7):
                        if isinstance(X, torch.Tensor):
                            X = X.cpu().numpy()
                        if len(X.shape) == 3:
                            X_reshaped = X
                        else:
                            X_reshaped = X.reshape(-1, points_per_day * n_past_days, 4)
                        X_gp = X_reshaped.reshape(X_reshaped.shape[0], -1)
                        return X_gp
                    X_gp = prepare_data_for_gp(X_tensor, gp_scaler if gp_scaler is not None else scaler, points_per_day=int(points_per_day), n_past_days=int(n_past_days))
                    pred_np = np.zeros((X_gp.shape[0], int(points_per_day), len(features)))
                    for feature_idx, feature in enumerate(features):
                        for t in range(int(points_per_day)):
                            model_key = f"{feature}_t{t}"
                            if model_key in gp_model:
                                pred_np[:, t, feature_idx] = gp_model[model_key].predict(X_gp)
                    preds_list.append(pred_np)
                except Exception as e:
                    st.warning(f"Gaussian Process prediction failed: {e}")

        if len(preds_list) == 0:
            st.error("All models failed to predict.")
            st.stop()

        # Align shapes: find minimal common time-steps returned (in case of mismatches)
        min_time_steps = min(p.shape[1] for p in preds_list)
        aligned_preds = [p[:, :min_time_steps, :] for p in preds_list]

        # Average predictions across models (simple voting average)
        stacked = np.stack(aligned_preds, axis=0)  # (n_models, n_samples, time, features)
        avg_pred = np.mean(stacked, axis=0)  # (n_samples, time, features)

        # Inverse transform predictions (need 2D for scaler.inverse_transform)
        n_samples = avg_pred.shape[0]
        n_time = avg_pred.shape[1]
        n_features = avg_pred.shape[2]
        pred_2d = avg_pred.reshape(-1, n_features)  # (n_samples * n_time, n_features)
        try:
            output_inv = scaler.inverse_transform(pred_2d)
        except Exception as e:
            st.error(f"Scaler inverse transform failed: {e}")
            st.stop()

        # Build output dataframe
        df_out = pd.DataFrame(output_inv, columns=features)

        # Build utc_time column:
        # Grab last len(df_out) utc_time values from input (if available), otherwise duplicate last timestamp
        if 'utc_time' in df.columns and len(df['utc_time']) >= len(df_out):
            utc_times = df['utc_time'].values[-len(df_out):]
        else:
            # fallback: repeat last timestamp or generate simple indices
            last_time = df['utc_time'].values[-1] if 'utc_time' in df.columns else None
            utc_times = [last_time] * len(df_out)

        df_out['utc_time'] = utc_times

        # Reorder columns to have utc_time first
        cols = ['utc_time'] + features
        df_out = df_out[cols]

        # Let user download CSV
        csv_bytes = df_out.to_csv(index=False).encode('utf-8')
        st.download_button("Download predictions CSV", data=csv_bytes, file_name="ensemble_voting_output.csv", mime="text/csv")

        st.dataframe(df_out.head(200))
        st.success("Prediction complete.")

else:
    st.info("Please upload a CSV file to begin. The app will display predictions and download options once your file is processed.")
