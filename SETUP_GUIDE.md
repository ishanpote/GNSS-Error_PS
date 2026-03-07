# GNSS Error Forecasting System - Complete Setup Guide

## Project Overview

This project provides GNSS (Global Navigation Satellite System) error forecasting with:
- **Python Backend**: Deep learning models (GRU, LSTM, Transformer) for predictions
- **Next.js Frontend**: Modern, domain-specific UI with specialized views

## Quick Start

### 1. Start the Python API Server

```bash
# Install Python dependencies (if not already installed)
pip install fastapi uvicorn python-multipart torch pandas numpy joblib

# Run the API server
python api_server.py
```

The API will be available at `http://localhost:8000`

### 2. Install and Run Next.js UI

```bash
# Navigate to the UI directory
cd nextjs-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will be available at `http://localhost:3000`

### 3. Use the Application

1. Open `http://localhost:3000` in your browser
2. Choose a domain view (General, Defence, Aviation, or Telecommunication)
3. Upload a CSV file with historical GNSS error data
4. View predictions and download results

## Project Structure

```
GNSS-Error_PS/
├── api_server.py              # FastAPI backend server
├── API_README.md              # API documentation
├── app.py                     # Original Streamlit app
├── model/                     # Trained model files
│   ├── 15min-best_gru_model_with_timesereas split.pth
│   ├── 15min-best_bilstm_model_with_timesereas split.pth
│   └── ...
├── scaler/                    # Data scalers
│   └── scaler.pkl
├── nextjs-ui/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/               # Pages and routing
│   │   ├── components/        # Reusable components
│   │   ├── lib/               # Utilities and API client
│   │   └── types/             # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── README.md                  # This file
```

## Features by Domain

### General View
- Standard GNSS error forecasting
- Ensemble model predictions
- Error visualization and statistics
- CSV data export

### Defence View
- Security level monitoring (OPERATIONAL/DEGRADED)
- Integrity risk assessment (LOW/MEDIUM/HIGH)
- Availability metrics
- Mission-critical alerts

### Aviation View
- Flight safety status (SAFE/CAUTION/WARNING)
- FAA compliance metrics
- Horizontal/Vertical Alert Limits (HAL/VAL)
- Flight phase configurations (En-route/Approach/Precision)

### Telecommunication View
- Network timing precision
- Phase stability monitoring
- Network synchronization quality
- 4G/5G/Telecom timing requirements

## Technology Stack

### Backend
- Python 3.13+
- FastAPI (API framework)
- PyTorch (Deep learning)
- NumPy, Pandas (Data processing)
- Joblib (Model serialization)

### Frontend
- Next.js 14 (React framework)
- TypeScript
- Tailwind CSS (Styling)
- Recharts (Visualizations)
- Axios (HTTP client)

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/models` - List loaded models
- `POST /api/predict` - Upload CSV and get predictions
- `POST /api/predict-json` - Send JSON data for predictions

API documentation available at `http://localhost:8000/docs` when running.

## CSV Data Format

Required columns:
- `utc_time`: ISO 8601 timestamp
- `x_error(m)`: X-axis error (meters)
- `y_error(m)`: Y-axis error (meters)
- `z_error(m)`: Z-axis error (meters)
- `satclockerror(m)`: Satellite clock error (meters)

Example:
```csv
utc_time,x_error(m),y_error(m),z_error(m),satclockerror(m)
2024-01-01T00:00:00,1.234,2.345,3.456,4.567
2024-01-01T00:15:00,1.235,2.346,3.457,4.568
```

## Configuration

### Environment Variables

Create `nextjs-ui/.env.local`:
```bash
PYTHON_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Model Configuration

Models are automatically loaded from the `model/` directory:
- GRU Model
- Bidirectional GRU
- LSTM Model
- Bidirectional LSTM
- Transformer Model

## Development

### Running in Development Mode

**Terminal 1 - Python API:**
```bash
python api_server.py
```

**Terminal 2 - Next.js UI:**
```bash
cd nextjs-ui
npm run dev
```

### Building for Production

**Python API:**
```bash
uvicorn api_server:app --host 0.0.0.0 --port 8000
```

**Next.js UI:**
```bash
cd nextjs-ui
npm run build
npm start
```

## Troubleshooting

### Port Already in Use

If port 8000 or 3000 is in use:

**Python API:**
```bash
python api_server.py  # Edit port in the file
```

**Next.js:**
```bash
PORT=3001 npm run dev
```

### CORS Issues

Ensure the API allows requests from your frontend URL. Check `api_server.py`:
```python
allow_origins=["http://localhost:3000"]
```

### Model Loading Errors

- Verify model files exist in `model/` directory
- Check model file integrity
- Ensure PyTorch version compatibility

### Missing Dependencies

**Python:**
```bash
pip install -r requirements.txt  # If available
# Or install individually:
pip install fastapi uvicorn python-multipart torch pandas numpy joblib
```

**JavaScript:**
```bash
cd nextjs-ui
npm install
```

## Performance Notes

- **Model Loading**: Takes 5-15 seconds on startup
- **Prediction Time**: 0.5-3 seconds per request
- **Data Points**: Supports 41 points/day (15-minute intervals)
- **File Size**: Max 10MB CSV uploads

## Security Considerations

- API runs on localhost by default
- No authentication implemented (add for production)
- Sensitive defence data should be encrypted
- Use HTTPS in production environments

## Future Enhancements

- Real-time data streaming
- User authentication
- Database integration
- Advanced analytics
- Mobile applications
- Multi-language support
- Alert notifications

## Support

For issues or questions:
1. Check the README files in each directory
2. Review API documentation at `/docs`
3. Examine console logs for errors
4. Verify all dependencies are installed

## License

Copyright © 2026 GNSS Error Forecasting System

---

**Note**: This system is designed for research and development. Ensure proper validation before using in production environments, especially for defence and aviation applications.
