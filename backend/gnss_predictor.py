import torch
import torch.nn as nn
import joblib
import numpy as np
import pandas as pd
import os
from typing import Dict, List
import warnings

warnings.filterwarnings('ignore', 'dropout option adds dropout after all but last recurrent layer')

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
        self.fc = nn.Linear(hidden_size * 2, output_size)

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
# GNSS Predictor Class
# -------------------------
class GNSSPredictor:
    def __init__(self, model_dir='../model', scaler_dir='../scaler'):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_dir = model_dir
        self.scaler_dir = scaler_dir
        self.models = {}
        self.scaler = None
        self.input_size = 4
        self.features = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)']
        
    def load_scaler(self):
        """Load the scaler"""
        scaler_path = os.path.join(self.scaler_dir, "scaler.pkl")
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler not found at {scaler_path}")
        self.scaler = joblib.load(scaler_path)
        
    def load_models(self):
        """Load all trained models"""
        if self.scaler is None:
            self.load_scaler()
            
        # Best parameters from training
        best_gru_params = dict(hidden_size=98, num_layers=2, dropout=0.3, bidirectional=True)
        best_bigru_params = dict(hidden_size=107, num_layers=2, dropout=0.3, bidirectional=True)
        best_lstm_params = dict(hidden_size=196, num_layers=2, dropout=0.3, bidirectional=False)
        best_bilstm_params = dict(hidden_size=115, num_layers=1, dropout=0.3, bidirectional=True)
        best_transformer_params = dict(d_model=128, nhead=4, num_layers=2, dim_feedforward=409, dropout=0.3, output_size=self.input_size)
        
        model_configs = {
            "GRU": {
                "path": os.path.join(self.model_dir, "15min-best_gru_model_with_timesereas split.pth"),
                "class": GRUModel,
                "params": {**best_gru_params, "input_size": self.input_size, "output_size": self.input_size}
            },
            "biGRU": {
                "path": os.path.join(self.model_dir, "15min-best_bigru_model_with_timesereas split.pth"),
                "class": GRUModel,
                "params": {**best_bigru_params, "input_size": self.input_size, "output_size": self.input_size}
            },
            "LSTM": {
                "path": os.path.join(self.model_dir, "15min-best_lstm_model.pth"),
                "class": LSTMModel,
                "params": {"input_size": self.input_size, "output_size": self.input_size, **best_lstm_params}
            },
            "biLSTM": {
                "path": os.path.join(self.model_dir, "15min-best_bilstm_model_with_timesereas split.pth"),
                "class": LSTMModel,
                "params": {"input_size": self.input_size, "output_size": self.input_size, **best_bilstm_params}
            },
            "Transformer": {
                "path": os.path.join(self.model_dir, "15min-best_transformars_model_with_timesereas split.pth"),
                "class": TimeSeriesTransformer,
                "params": {"input_size": self.input_size, **best_transformer_params}
            }
        }
        
        for name, config in model_configs.items():
            try:
                if not os.path.exists(config["path"]):
                    print(f"Model file not found: {config['path']}")
                    continue
                    
                model = config["class"](**config["params"])
                state = torch.load(config["path"], map_location=self.device)
                model.load_state_dict(state)
                model.to(self.device)
                model.eval()
                self.models[name] = model
                print(f"Loaded {name} model successfully")
            except Exception as e:
                print(f"Failed to load {name}: {e}")
                
    def predict(self, data_df: pd.DataFrame, n_past_days=7, n_future_days=1, points_per_day=41):
        """
        Make predictions on GNSS data
        
        Args:
            data_df: DataFrame with columns ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)', 'utc_time']
            n_past_days: Number of past days to use for sequence
            n_future_days: Number of future days to predict
            points_per_day: Points per day (15-min intervals = 41 points)
            
        Returns:
            dict with predictions and metadata
        """
        if self.scaler is None or not self.models:
            raise RuntimeError("Models not loaded. Call load_models() first.")
            
        # Extract features
        data = data_df[self.features].values.astype(float)
        data_scaled = self.scaler.transform(data)
        
        seq_len = int(n_past_days) * int(points_per_day)
        n_future = int(n_future_days) * int(points_per_day)
        
        if len(data_scaled) < seq_len:
            raise ValueError(f"Not enough rows in data for {n_past_days} past days ({seq_len} rows required). Provided {len(data_scaled)} rows.")
        
        # Build sequences
        X_seq = []
        for i in range(seq_len, len(data_scaled) + 1):
            start = i - seq_len
            X_seq.append(data_scaled[start:i])
        X_seq = np.array(X_seq)
        
        # Convert to tensor
        X_tensor = torch.tensor(X_seq, dtype=torch.float32).to(self.device)
        
        # Make predictions with each model
        all_predictions = []
        model_results = {}
        
        with torch.no_grad():
            for name, model in self.models.items():
                try:
                    pred = model(X_tensor, n_future=n_future)
                    pred_np = pred.cpu().numpy()
                    all_predictions.append(pred_np)
                    model_results[name] = pred_np
                except Exception as e:
                    print(f"Error predicting with {name}: {e}")
        
        if not all_predictions:
            raise RuntimeError("No models produced predictions")
        
        # Ensemble average
        ensemble_pred = np.mean(all_predictions, axis=0)
        
        # Inverse transform
        n_samples, n_timesteps, n_features = ensemble_pred.shape
        ensemble_pred_flat = ensemble_pred.reshape(-1, n_features)
        ensemble_pred_original = self.scaler.inverse_transform(ensemble_pred_flat)
        ensemble_pred_original = ensemble_pred_original.reshape(n_samples, n_timesteps, n_features)
        
        # Return results
        return {
            'ensemble_predictions': ensemble_pred_original.tolist(),
            'individual_models': {name: pred.tolist() for name, pred in model_results.items()},
            'n_samples': n_samples,
            'n_timesteps': n_timesteps,
            'features': self.features
        }
    
    def predict_and_format(self, data_df: pd.DataFrame, n_past_days=7, n_future_days=1, points_per_day=41):
        """
        Make predictions and return formatted results with timestamps
        """
        predictions = self.predict(data_df, n_past_days, n_future_days, points_per_day)
        
        # Get last timestamp
        if 'utc_time' in data_df.columns:
            last_time = pd.to_datetime(data_df['utc_time'].iloc[-1])
        else:
            last_time = pd.Timestamp.now()
        
        # Generate future timestamps (15-minute intervals)
        future_times = pd.date_range(
            start=last_time + pd.Timedelta(minutes=15),
            periods=predictions['n_timesteps'],
            freq='15min'
        )
        
        # Format results
        ensemble_pred = np.array(predictions['ensemble_predictions'])
        results = []
        
        for sample_idx in range(predictions['n_samples']):
            for time_idx, timestamp in enumerate(future_times):
                result = {
                    'utc_time': timestamp.isoformat(),
                    'x_error(m)': float(ensemble_pred[sample_idx, time_idx, 0]),
                    'y_error(m)': float(ensemble_pred[sample_idx, time_idx, 1]),
                    'z_error(m)': float(ensemble_pred[sample_idx, time_idx, 2]),
                    'satclockerror(m)': float(ensemble_pred[sample_idx, time_idx, 3]),
                }
                results.append(result)
        
        return results
