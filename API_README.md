# GNSS Error Forecasting - FastAPI Backend

## Installation

```bash
pip install fastapi uvicorn python-multipart
```

## Running the API Server

```bash
python api_server.py
```

Or with uvicorn:

```bash
uvicorn api_server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

- `GET /api/health` - Health check
- `GET /api/models` - List loaded models
- `POST /api/predict` - Upload CSV and get predictions
- `POST /api/predict-json` - Send JSON data and get predictions
