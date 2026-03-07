@echo off
echo ====================================
echo GNSS Forecasting System - Quick Start
echo ====================================
echo.

echo [1/4] Starting Backend Server...
start "GNSS Backend" cmd /k "cd backend && python app.py"
timeout /t 3 /nobreak > nul

echo [2/4] Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo [3/4] Starting Frontend Development Server...
start "GNSS Frontend" cmd /k "cd frontend && npm start"

echo [4/4] Done!
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Default Admin Credentials:
echo Username: admin
echo Password: admin123
echo.
echo Press any key to exit this window (servers will continue running)...
pause > nul
