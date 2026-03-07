# GNSS Error Forecasting System

A full-stack web application for GNSS (Global Navigation Satellite System) error forecasting with role-based access control, professional UI, and interactive dashboards.

## Features

### Backend (Flask)
- 🔐 JWT-based authentication
- 👥 Role-based access control (Admin, User)
- 📊 Category-specific dashboards (Defence, Aviation, Telecommunication)
- 🤖 GNSS error prediction using ensemble ML models (GRU, biGRU, LSTM, biLSTM, Transformer)
- 📈 Real-time analytics and visualization data

### Frontend (React)
- 🎨 Professional Material-UI design
- 🌓 Light and Dark theme support
- 📱 Responsive design for all devices
- 📊 Interactive charts and visualizations (Recharts)
- 🔒 Protected routes and authentication flow
- 🎯 Category-specific dashboard access

## Tech Stack

### Backend
- **Flask** - Web framework
- **SQLAlchemy** - ORM
- **Flask-JWT-Extended** - Authentication
- **PyTorch** - Deep learning models
- **Pandas & NumPy** - Data processing

### Frontend
- **React 18** - UI framework
- **Material-UI (MUI)** - UI components
- **Recharts** - Data visualization
- **React Router** - Navigation
- **Axios** - HTTP client

## Project Structure

```
Gnss/
├── backend/
│   ├── app.py                  # Flask application with auth & APIs
│   ├── gnss_predictor.py       # GNSS prediction models
│   ├── requirements.txt        # Python dependencies
│   └── gnss.db                 # SQLite database (auto-created)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/           # Login & Register
│   │   │   ├── Dashboard/      # Dashboard with visualizations
│   │   │   └── Layout/         # Navigation & layout
│   │   ├── contexts/
│   │   │   ├── AuthContext.js  # Authentication state
│   │   │   └── ThemeContext.js # Theme state
│   │   ├── services/
│   │   │   └── api.js          # API service layer
│   │   ├── themes/
│   │   │   └── theme.js        # Light/Dark themes
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── model/                       # Pre-trained ML models
├── scaler/                      # Data scalers
└── README_FULLSTACK.md          # This file
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
```

3. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run the Flask server:
```bash
python app.py
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Open a new terminal and navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## Default Credentials

### Admin Account
- **Username:** admin
- **Password:** admin123
- **Access:** All dashboards (General, Defence, Aviation, Telecommunication)

### Creating User Accounts
Register new users through the registration page. Users must select a category during registration and will have access to:
- General Dashboard (all users)
- Their specific category dashboard (Defence, Aviation, or Telecommunication)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Dashboard & Analytics
- `GET /api/dashboard/access` - Get accessible dashboards
- `GET /api/dashboard/<type>` - Get dashboard data
- `GET /api/analytics/<type>` - Get analytics data

### Predictions
- `POST /api/predict` - Upload CSV and get predictions
- `GET /api/predict/sample` - Get sample prediction data

## Usage

1. **Login/Register**
   - Open `http://localhost:3000`
   - Login with admin credentials or register a new account
   - Select your category during registration (Defence, Aviation, or Telecommunication)

2. **Navigate Dashboards**
   - Use the sidebar to switch between accessible dashboards
   - View real-time analytics and visualizations
   - Toggle between light and dark themes

3. **Access Control**
   - Admin users can access all dashboards
   - Regular users can access General + their category dashboard
   - Unauthorized access attempts are blocked

## Features in Detail

### Role-Based Access Control
- **Admin:** Full access to all dashboards
- **User (Defence):** Access to General + Defence dashboards
- **User (Aviation):** Access to General + Aviation dashboards
- **User (Telecommunication):** Access to General + Telecommunication dashboards

### Dashboard Visualizations
- **Time Series Charts:** Error trends over 24 hours
- **Bar Charts:** Error distribution by axis and model performance
- **Radar Charts:** Multi-dimensional performance metrics
- **Stat Cards:** Key metrics (predictions, accuracy, satellites)

### Theme Support
- Light and Dark themes
- Persistent theme preference
- Smooth transitions
- Optimized color schemes for both modes

## Environment Variables

### Backend
Create a `.env` file in the backend directory:
```
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
```

### Frontend
Create a `.env` file in the frontend directory:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Development

### Backend
- Models are lazy-loaded for performance
- SQLite database is created automatically on first run
- CORS is enabled for frontend communication

### Frontend
- Material-UI provides consistent design
- Context API manages global state
- Protected routes ensure authentication
- API service layer centralizes HTTP calls

## Production Deployment

### Backend
1. Set strong secret keys in environment variables
2. Use a production database (PostgreSQL, MySQL)
3. Enable HTTPS
4. Use a production WSGI server (Gunicorn, uWSGI)

### Frontend
1. Build the production bundle:
```bash
npm run build
```
2. Serve the `build` folder with a web server (Nginx, Apache)
3. Update API URL to production backend

## Troubleshooting

### Backend Issues
- **Models not loading:** Ensure model files exist in `../model` directory
- **Database errors:** Delete `gnss.db` and restart to recreate
- **CORS errors:** Check CORS configuration in app.py

### Frontend Issues
- **API connection failed:** Verify backend is running on port 5000
- **Auth errors:** Clear localStorage and try logging in again
- **Theme not persisting:** Check browser localStorage permissions

## License

This project is part of the ISRO GNSS forecasting system.

## Support

For issues and questions, please refer to the main project documentation or contact the development team.
