# GNSS Error Forecasting - Next.js UI Summary

## What Was Created

I've built a complete modern Next.js web application to replace your Streamlit interface with specialized domain-specific views.

## Directory Structure

```
GNSS-Error_PS/
├── nextjs-ui/                     # NEW: Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Home page with domain selector
│   │   │   ├── layout.tsx        # Main layout with navigation
│   │   │   ├── general/          # General forecasting view
│   │   │   ├── defence/          # Defence-specific view
│   │   │   ├── aviation/         # Aviation-specific view
│   │   │   └── telecommunication/# Telecom-specific view
│   │   ├── components/
│   │   │   ├── Navigation.tsx    # Top navigation bar
│   │   │   ├── FileUpload.tsx    # Drag-and-drop file uploader
│   │   │   ├── ErrorChart.tsx    # Interactive charts
│   │   │   └── MetricsCard.tsx   # Statistics cards
│   │   ├── lib/
│   │   │   └── api.ts            # API client and utilities
│   │   └── types/
│   │       └── index.ts          # TypeScript definitions
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── README.md
├── api_server.py                  # NEW: FastAPI backend server
├── API_README.md                  # NEW: API documentation
├── requirements-api.txt           # NEW: Python dependencies
├── start.bat                      # NEW: Windows startup script
├── start.sh                       # NEW: Linux/Mac startup script
├── SETUP_GUIDE.md                # NEW: Complete setup instructions
└── (your existing files...)
```

## 🎨 Four Specialized Views

### 1. **General View** (`/general`)
**Purpose**: Standard GNSS error forecasting  
**Features**:
- Upload CSV with historical data
- Configure past/future days
- View ensemble predictions
- Download results

**Colors**: Blue theme

---

### 2. **Defence View** (`/defence`)
**Purpose**: Mission-critical military applications  
**Special Metrics**:
- **Security Level**: OPERATIONAL/DEGRADED status
- **Integrity Risk**: LOW/MEDIUM/HIGH assessment
- **Availability**: % within operational limits
- **Max Position Error**: Peak 3D error

**Colors**: Purple/Violet theme  
**Use Cases**: Military navigation, tactical systems, secure communications

---

### 3. **Aviation View** (`/aviation`)
**Purpose**: Flight safety and FAA compliance  
**Special Metrics**:
- **Flight Safety Status**: SAFE/CAUTION/WARNING
- **HAL** (Horizontal Alert Limit): Based on flight phase
- **VAL** (Vertical Alert Limit): Based on flight phase
- **Integrity Monitoring**: H/V integrity percentages

**Flight Phases**:
- En-route: HAL=3700m, VAL=50m
- Approach: HAL=40m, VAL=50m
- Precision Approach: HAL=40m, VAL=20m

**Colors**: Green/Emerald theme  
**Use Cases**: Aircraft navigation, approach systems, precision landing

---

### 4. **Telecommunication View** (`/telecommunication`)
**Purpose**: Network timing and synchronization  
**Special Metrics**:
- **Timing Status**: EXCELLENT/ACCEPTABLE/DEGRADED
- **Network Sync Quality**: OPTIMAL/GOOD/POOR
- **Phase Stability**: STABLE/MODERATE/UNSTABLE
- **Timing Compliance**: Network-specific requirements

**Network Types**:
- 5G: ≤100 ns timing accuracy
- 4G/LTE: ≤3 μs timing accuracy
- General Telecom: ≤1 μs timing accuracy

**Colors**: Orange theme  
**Use Cases**: 5G base stations, network synchronization, TDD timing

---

## 🚀 Quick Start (Windows)

### Option 1: Automatic (Recommended)
```bash
# Double-click or run:
start.bat
```

This will:
1. Check and install all dependencies
2. Start the Python API server
3. Start the Next.js UI
4. Open both in separate windows

### Option 2: Manual

**Terminal 1 - Start API:**
```bash
pip install -r requirements-api.txt
python api_server.py
```

**Terminal 2 - Start UI:**
```bash
cd nextjs-ui
npm install
npm run dev
```

---

## 🌐 Access the Application

- **UI**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📊 Using the Application

1. **Open** http://localhost:3000 in your browser
2. **Choose** a domain view from the home page:
   - Click "General" for standard forecasting
   - Click "Defence" for military applications
   - Click "Aviation" for flight safety
   - Click "Telecommunication" for network timing
3. **Configure** parameters (past/future days, specific settings)
4. **Upload** CSV file with your GNSS data
5. **View** predictions with interactive charts
6. **Download** results as CSV

---

## 📁 CSV Format Required

Your CSV must have these columns:

```csv
utc_time,x_error(m),y_error(m),z_error(m),satclockerror(m)
2024-01-01T00:00:00,1.234,2.345,3.456,4.567
2024-01-01T00:15:00,1.235,2.346,3.457,4.568
...
```

- Minimum rows: `n_past_days × 41` (41 points per day at 15-min intervals)
- Example: 7 days = 287 rows minimum

---

## 🎯 Key Features

### Common to All Views
✅ Drag-and-drop file upload  
✅ Real-time predictions  
✅ Interactive charts (Recharts)  
✅ CSV export  
✅ Responsive design (mobile-friendly)  
✅ Error handling with user feedback  

### Domain-Specific
✅ Custom metrics for each domain  
✅ Specialized visualizations  
✅ Domain-appropriate color schemes  
✅ Context-specific thresholds  
✅ Compliance indicators  

---

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (React framework with App Router)
- TypeScript (type safety)
- Tailwind CSS (styling)
- Recharts (visualizations)
- Lucide React (icons)

**Backend:**
- FastAPI (Python API framework)
- PyTorch (deep learning models)
- Your existing models (GRU, LSTM, Transformer, etc.)

---

## 🔧 Development

### Frontend Development
```bash
cd nextjs-ui
npm run dev     # Development server
npm run build   # Production build
npm run lint    # Check code quality
```

### Backend Development
```bash
python api_server.py              # Run API
# API auto-reloads on code changes with uvicorn --reload
```

---

## 📱 Screenshots Overview

**Home Page**: Domain selector with 4 cards  
**General View**: Clean, simple prediction interface  
**Defence View**: Purple theme with security metrics  
**Aviation View**: Green theme with FAA compliance  
**Telecom View**: Orange theme with timing metrics  

---

## 🎨 Customization

### Change Colors
Edit `nextjs-ui/tailwind.config.ts`:
```typescript
colors: {
  primary: { ... },    // General
  defense: { ... },    // Defence
  aviation: { ... },   // Aviation
  telecom: { ... },    // Telecommunication
}
```

### Add New View
1. Create `nextjs-ui/src/app/[view-name]/page.tsx`
2. Add to navigation in `Navigation.tsx`
3. Add to home page in `page.tsx`

---

## ⚠️ Troubleshooting

**Port 8000 or 3000 in use?**
```bash
# Change API port in api_server.py (last line)
# Change UI port: PORT=3001 npm run dev
```

**CORS errors?**
- Check `api_server.py` allows `http://localhost:3000`

**Models not loading?**
- Verify files exist in `model/` directory
- Check `scaler/scaler.pkl` exists

---

## 📦 Dependencies

**Already Installed** (from your project):
- Python 3.13+
- PyTorch
- pandas, numpy, joblib

**New Dependencies**:
- FastAPI, uvicorn (Python API)
- Node.js 18+, npm (for Next.js)
- All Next.js packages (auto-installed)

---

## 🚢 Production Deployment

### Build Frontend
```bash
cd nextjs-ui
npm run build
npm start  # Runs on port 3000
```

### Run API in Production
```bash
uvicorn api_server:app --host 0.0.0.0 --port 8000
```

### Docker (Optional)
You can containerize both services:
- Create Dockerfile for API
- Create Dockerfile for Next.js
- Use docker-compose to run both

---

## 📚 Documentation

- **Main Setup**: `SETUP_GUIDE.md`
- **API Details**: `API_README.md`
- **Frontend**: `nextjs-ui/README.md`
- **API Docs**: http://localhost:8000/docs (when running)

---

## 🎓 Next Steps

1. **Test** each view with your CSV data
2. **Customize** colors/branding if needed
3. **Add** authentication (if required)
4. **Deploy** to production server
5. **Monitor** performance and user feedback

---

## 🆚 Streamlit vs Next.js

| Feature | Streamlit (Old) | Next.js (New) |
|---------|----------------|---------------|
| Interface | Single view | 4 specialized views |
| Design | Basic | Modern, responsive |
| Customization | Limited | Highly customizable |
| Performance | Slower | Faster (SSR) |
| Mobile | Basic | Fully responsive |
| Production | Adequate | Production-ready |
| Scalability | Limited | Excellent |

---

## 💡 Benefits of New UI

1. **Domain-Specific**: Each sector gets tailored metrics
2. **Modern UX**: Clean, professional interface
3. **Responsive**: Works on mobile, tablet, desktop
4. **Extensible**: Easy to add new features
5. **Type-Safe**: TypeScript prevents errors
6. **Production-Ready**: Optimized for deployment

---

## 🙋 Need Help?

1. Check `SETUP_GUIDE.md` for setup issues
2. Review console logs for errors
3. Visit http://localhost:8000/docs for API details
4. Check each README file for component details

---

**Congratulations!** 🎉 You now have a modern, production-ready GNSS forecasting system with specialized views for Defence, Aviation, and Telecommunication applications!
