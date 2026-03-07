@echo off
echo ====================================
echo GNSS Error Forecasting System
echo Starting Backend and Frontend...
echo ====================================
echo.

REM Check if Python is available
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.13+ first.
    pause
    exit /b 1
)

REM Check if Node.js is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo [1/4] Checking Python dependencies...
python -c "import fastapi, uvicorn, torch, pandas, numpy, joblib" 2>nul
if %errorlevel% neq 0 (
    echo Installing Python dependencies...
    pip install -r requirements-api.txt
)

echo [2/4] Checking Node.js dependencies...
cd nextjs-ui
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
)

echo [3/4] Starting Python API Server...
cd ..
start "GNSS API Server" cmd /k "python api_server.py"
timeout /t 5 /nobreak >nul

echo [4/4] Starting Next.js UI...
cd nextjs-ui
start "GNSS UI" cmd /k "npm run dev"

echo.
echo ====================================
echo Services are starting...
echo.
echo API Server: http://localhost:8000
echo UI: http://localhost:3000
echo.
echo Press any key to stop all services...
echo ====================================
pause >nul

taskkill /FI "WindowTitle eq GNSS API Server*" /T /F
taskkill /FI "WindowTitle eq GNSS UI*" /T /F

echo All services stopped.
pause
