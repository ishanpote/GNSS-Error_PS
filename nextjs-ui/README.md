# GNSS Error Forecasting - Next.js UI

A modern, domain-specific web interface for GNSS (Global Navigation Satellite System) error forecasting using Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- **Multiple Domain Views**:
  - **General View**: Standard GNSS error forecasting
  - **Defence View**: Mission-critical forecasting with security metrics
  - **Aviation View**: Flight safety-focused with FAA compliance metrics
  - **Telecommunication View**: Network timing precision and synchronization

- **Real-time Predictions**: Upload CSV data and get instant predictions
- **Interactive Visualizations**: Dynamic charts using Recharts
- **Ensemble Models**: Predictions from GRU, LSTM, Transformer models
- **CSV Export**: Download predictions for further analysis

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Project Structure

```
nextjs-ui/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with navigation
│   │   ├── page.tsx             # Home page
│   │   ├── globals.css          # Global styles
│   │   ├── general/             # General view
│   │   ├── defence/             # Defence-specific view
│   │   ├── aviation/            # Aviation-specific view
│   │   └── telecommunication/   # Telecom-specific view
│   ├── components/
│   │   ├── Navigation.tsx       # Main navigation component
│   │   ├── FileUpload.tsx       # Drag-and-drop file upload
│   │   ├── ErrorChart.tsx       # GNSS error visualization
│   │   └── MetricsCard.tsx      # Statistics display
│   ├── lib/
│   │   └── api.ts               # API client and utilities
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── public/                      # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.13+ (for backend API)
- The trained GNSS models (in `../model/` directory)

### Setup

1. **Install dependencies:**

```bash
cd nextjs-ui
npm install
```

2. **Configure environment variables:**

Create a `.env.local` file:

```bash
PYTHON_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Start the Python backend API:**

In the parent directory:

```bash
# Install Python dependencies
pip install fastapi uvicorn python-multipart torch pandas numpy joblib

# Run the API server
python api_server.py
```

The API will be available at `http://localhost:8000`

4. **Start the Next.js development server:**

```bash
npm run dev
```

The UI will be available at `http://localhost:3000`

## Usage

### General View

1. Navigate to the **General** view
2. Configure past days (default: 7) and future days (default: 1)
3. Upload a CSV file with GNSS error data
4. View predictions and download results

### Domain-Specific Views

Each domain view provides specialized metrics:

#### Defence View
- **Security Level**: OPERATIONAL/DEGRADED status
- **Integrity Risk**: LOW/MEDIUM/HIGH assessment
- **Availability**: Percentage within operational limits
- **Max Position Error**: Peak 3D position error

#### Aviation View
- **Flight Safety Status**: SAFE/CAUTION/WARNING
- **Horizontal/Vertical Alert Limits (HAL/VAL)**: FAA compliance
- **Integrity Percentages**: H/V integrity monitoring
- **Flight Phase Selection**: En-route/Approach/Precision

#### Telecommunication View
- **Timing Status**: EXCELLENT/ACCEPTABLE/DEGRADED
- **Network Sync Quality**: OPTIMAL/GOOD/POOR
- **Phase Stability**: STABLE/MODERATE/UNSTABLE
- **Timing Compliance**: Network-specific requirements
- **Network Type Selection**: 4G/5G/General Telecom

## CSV Data Format

Your CSV file must include these columns:

```csv
utc_time,x_error(m),y_error(m),z_error(m),satclockerror(m)
2024-01-01T00:00:00,1.234,2.345,3.456,4.567
2024-01-01T00:15:00,1.235,2.346,3.457,4.568
...
```

- **utc_time**: ISO 8601 timestamp
- **x_error(m)**: X-axis error in meters
- **y_error(m)**: Y-axis error in meters
- **z_error(m)**: Z-axis error in meters
- **satclockerror(m)**: Satellite clock error in meters

## API Integration

The UI communicates with the Python backend via REST API:

### Endpoints

- `POST /api/predict` - Upload CSV and get predictions
- `POST /api/predict-json` - Send JSON data and get predictions
- `GET /api/models` - List available models
- `GET /api/health` - Health check

### Example API Call

```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('n_past_days', '7')
formData.append('n_future_days', '1')

const response = await fetch('http://localhost:8000/api/predict', {
  method: 'POST',
  body: formData,
})

const result = await response.json()
```

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Customization

### Theme Colors

Edit `tailwind.config.ts` to customize domain-specific colors:

```typescript
colors: {
  primary: { ... },      // General view
  defense: { ... },      // Defence view
  aviation: { ... },     // Aviation view
  telecom: { ... },      // Telecommunication view
}
```

### Adding New Views

1. Create a new page in `src/app/[view-name]/page.tsx`
2. Add navigation link in `src/components/Navigation.tsx`
3. Update domain configs in `src/types/index.ts`

## Performance Optimization

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Use Next.js Image component
- **API Caching**: Configure in `next.config.js`
- **Static Generation**: Consider ISR for stable content

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the Python API has proper CORS configuration:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### File Upload Errors

- Check file size limits (default: 10MB)
- Verify CSV format matches requirements
- Ensure sufficient historical data points

### Model Loading Issues

- Verify model files exist in `../model/` directory
- Check model file permissions
- Ensure PyTorch compatibility

## Architecture Decisions

### Why Next.js?

- Server-side rendering for better performance
- Built-in API routes (if needed)
- Excellent TypeScript support
- Modern React features

### Why Tailwind CSS?

- Utility-first approach for rapid development
- Consistent design system
- Small bundle size with purging
- Excellent responsive design support

### Component Structure

- **Presentational**: Reusable UI components
- **Container**: Page-level components with state
- **Utility**: Helper functions and API clients

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] User authentication and sessions
- [ ] Historical prediction storage
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode support
- [ ] Mobile app (React Native)
- [ ] PDF report generation

## License

Copyright © 2026 GNSS Error Forecasting System

## Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Refer to the main project documentation

## Contributors

- UI/UX Design: Modern responsive interface
- Backend Integration: Python FastAPI
- Domain Expertise: Defence, Aviation, Telecommunication specialists
