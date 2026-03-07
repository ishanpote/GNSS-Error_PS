from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import joblib
import os
import io
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

# Import your existing model classes (they should be in a separate file)
# For now, I'll include them here

app = FastAPI(title="GNSS Error Forecasting API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
SCALER_DIR = os.path.join(BASE_DIR, "scaler")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# -------------------------
# Model Definitions (from app.py)
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
# Pydantic Models
# -------------------------
class GNSSDataPoint(BaseModel):
    utc_time: str
    x_error_m: float
    y_error_m: float
    z_error_m: float
    satclockerror_m: float


class PredictionRequest(BaseModel):
    data: List[GNSSDataPoint]
    n_past_days: int = 7
    n_future_days: int = 1


class PredictionResponse(BaseModel):
    predictions: List[Dict]
    models_used: List[str]
    processing_time: float
    metrics: Optional[Dict] = None


# -------------------------
# Helper Functions
# -------------------------
def load_models(model_paths: Dict[str, str], device: torch.device, input_size=4):
    models = {}
    
    best_gru_params = dict(hidden_size=98, num_layers=2, dropout=0.3, bidirectional=True)
    best_bigru_params = dict(hidden_size=107, num_layers=2, dropout=0.3, bidirectional=True)
    best_lstm_params = dict(hidden_size=196, num_layers=2, dropout=0.3, bidirectional=False)
    best_bilstm_params = dict(hidden_size=115, num_layers=1, dropout=0.3, bidirectional=True)
    best_transformer_params = dict(d_model=128, nhead=4, num_layers=2, dim_feedforward=409, dropout=0.3, output_size=input_size)
    
    for name, path in model_paths.items():
        try:
            if not os.path.exists(path):
                print(f"Model file not found: {path}")
                continue
                
            if name == "GRU":
                model = GRUModel(input_size=input_size, output_size=input_size, **best_gru_params)
            elif name == "biGRU":
                model = GRUModel(input_size=input_size, output_size=input_size, **best_bigru_params)
            elif name == "LSTM":
                model = LSTMModel(input_size=input_size, hidden_size=best_lstm_params['hidden_size'], 
                                 num_layers=best_lstm_params['num_layers'], dropout=best_lstm_params['dropout'], 
                                 output_size=input_size, bidirectional=best_lstm_params['bidirectional'])
            elif name == "biLSTM":
                model = LSTMModel(input_size=input_size, hidden_size=best_bilstm_params['hidden_size'], 
                                 num_layers=best_bilstm_params['num_layers'], dropout=best_bilstm_params['dropout'], 
                                 output_size=input_size, bidirectional=best_bilstm_params['bidirectional'])
            elif name == "Transformer":
                model = TimeSeriesTransformer(input_size=input_size, **best_transformer_params)
            else:
                print(f"Unknown model: {name}")
                continue

            state = torch.load(path, map_location=device)
            model.load_state_dict(state)
            model.to(device)
            model.eval()
            models[name] = model
            print(f"Loaded model: {name}")
        except Exception as e:
            print(f"Failed to load model '{name}': {e}")
    
    return models


# Load models on startup
print("Loading models...")
scaler = joblib.load(os.path.join(SCALER_DIR, "scaler.pkl"))
model_paths = {
    "GRU": os.path.join(MODEL_DIR, "15min-best_gru_model_with_timesereas split.pth"),
    "biGRU": os.path.join(MODEL_DIR, "15min-best_bigru_model_with_timesereas split.pth"),
    "LSTM": os.path.join(MODEL_DIR, "15min-best_lstm_model.pth"),
    "biLSTM": os.path.join(MODEL_DIR, "15min-best_bilstm_model_with_timesereas split.pth"),
    "Transformer": os.path.join(MODEL_DIR, "15min-best_transformars_model_with_timesereas split.pth")
}
loaded_models = load_models(model_paths, device)
print(f"Loaded {len(loaded_models)} models")


# -------------------------
# API Endpoints
# -------------------------
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "models_loaded": len(loaded_models)}


@app.get("/api/models")
async def get_models():
    return {
        "models": list(loaded_models.keys()),
        "count": len(loaded_models),
        "device": str(device)
    }


@app.post("/api/predict")
async def predict_from_csv(
    file: UploadFile = File(...),
    n_past_days: int = Form(7),
    n_future_days: int = Form(1)
):
    start_time = datetime.now()
    
    try:
        # Read CSV
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validate columns
        required_cols = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)', 'utc_time']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")
        
        # Prepare data
        features = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)']
        data = df[features].values.astype(float)
        data_scaled = scaler.transform(data)
        
        points_per_day = 41
        seq_len = n_past_days * points_per_day
        n_future = n_future_days * points_per_day
        
        if len(data_scaled) < seq_len:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough rows. Need {seq_len}, got {len(data_scaled)}"
            )
        
        # Build sequences
        X_seq = []
        for i in range(seq_len, len(data_scaled) + 1):
            X_seq.append(data_scaled[i - seq_len:i])
        X_seq = np.array(X_seq)
        
        # Run predictions
        X_tensor = torch.FloatTensor(X_seq).to(device)
        all_predictions = []
        
        with torch.no_grad():
            for name, model in loaded_models.items():
                pred = model(X_tensor, n_future=n_future)
                all_predictions.append(pred.cpu().numpy())
        
        # Ensemble average
        ensemble_pred = np.mean(all_predictions, axis=0)
        
        # Inverse transform
        last_seq_predictions = ensemble_pred[-1]  # Last sequence predictions
        predictions_original = scaler.inverse_transform(last_seq_predictions)
        
        # Generate future timestamps
        last_time = pd.to_datetime(df['utc_time'].iloc[-1])
        future_times = [last_time + timedelta(minutes=15 * (i + 1)) for i in range(n_future)]
        
        # Format response
        predictions = []
        for i, time in enumerate(future_times):
            predictions.append({
                'utc_time': time.isoformat(),
                'x_error(m)': float(predictions_original[i, 0]),
                'y_error(m)': float(predictions_original[i, 1]),
                'z_error(m)': float(predictions_original[i, 2]),
                'satclockerror(m)': float(predictions_original[i, 3])
            })
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return PredictionResponse(
            predictions=predictions,
            models_used=list(loaded_models.keys()),
            processing_time=processing_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-json")
async def predict_from_json(request: PredictionRequest):
    start_time = datetime.now()
    
    try:
        # Convert request data to DataFrame
        data_dict = {
            'x_error(m)': [d.x_error_m for d in request.data],
            'y_error(m)': [d.y_error_m for d in request.data],
            'z_error(m)': [d.z_error_m for d in request.data],
            'satclockerror(m)': [d.satclockerror_m for d in request.data],
            'utc_time': [d.utc_time for d in request.data]
        }
        df = pd.DataFrame(data_dict)
        
        # Rest of the processing is similar to predict_from_csv
        features = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)']
        data = df[features].values.astype(float)
        data_scaled = scaler.transform(data)
        
        points_per_day = 41
        seq_len = request.n_past_days * points_per_day
        n_future = request.n_future_days * points_per_day
        
        if len(data_scaled) < seq_len:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough rows. Need {seq_len}, got {len(data_scaled)}"
            )
        
        # Build sequences and predict
        X_seq = []
        for i in range(seq_len, len(data_scaled) + 1):
            X_seq.append(data_scaled[i - seq_len:i])
        X_seq = np.array(X_seq)
        
        X_tensor = torch.FloatTensor(X_seq).to(device)
        all_predictions = []
        
        with torch.no_grad():
            for name, model in loaded_models.items():
                pred = model(X_tensor, n_future=n_future)
                all_predictions.append(pred.cpu().numpy())
        
        ensemble_pred = np.mean(all_predictions, axis=0)
        last_seq_predictions = ensemble_pred[-1]
        predictions_original = scaler.inverse_transform(last_seq_predictions)
        
        last_time = pd.to_datetime(df['utc_time'].iloc[-1])
        future_times = [last_time + timedelta(minutes=15 * (i + 1)) for i in range(n_future)]
        
        predictions = []
        for i, time in enumerate(future_times):
            predictions.append({
                'utc_time': time.isoformat(),
                'x_error(m)': float(predictions_original[i, 0]),
                'y_error(m)': float(predictions_original[i, 1]),
                'z_error(m)': float(predictions_original[i, 2]),
                'satclockerror(m)': float(predictions_original[i, 3])
            })
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return PredictionResponse(
            predictions=predictions,
            models_used=list(loaded_models.keys()),
            processing_time=processing_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
