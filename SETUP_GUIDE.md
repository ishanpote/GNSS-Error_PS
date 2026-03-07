# Quick Setup Guide

## First Time Setup

### Step 1: Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 3: Start the Application

#### Windows:
Simply double-click `start.bat` or run:
```bash
start.bat
```

#### Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

#### Manual Start:

**Terminal 1 (Backend):**
```bash
cd backend
python app.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

## Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## Default Login

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Access: All dashboards

**Create New User:**
1. Click "Sign Up" on login page
2. Choose category: Defence, Aviation, or Telecommunication
3. Login with your new credentials
4. Access General + your category dashboard

## Quick Test

1. Open http://localhost:3000
2. Login with admin credentials
3. Navigate through dashboards using the sidebar
4. Try switching between light and dark themes
5. Logout and register a new user to test category-specific access

## Troubleshooting

**Port Already in Use:**
- Backend (5000): Check if another app is using port 5000
- Frontend (3000): Check if another React app is running

**Module Not Found:**
- Backend: Ensure you're in the virtual environment
- Frontend: Run `npm install` again

**Database Errors:**
- Delete `backend/gnss.db` and restart the backend

## Next Steps

- Customize the theme colors in `frontend/src/themes/theme.js`
- Add more visualization types in the Dashboard component
- Integrate real GNSS data instead of sample data
- Deploy to production server
