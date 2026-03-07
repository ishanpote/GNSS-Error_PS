#!/bin/bash

echo "===================================="
echo "GNSS Error Forecasting System"
echo "Starting Backend and Frontend..."
echo "===================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python not found. Please install Python 3.13+ first."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "[1/4] Checking Python dependencies..."
python3 -c "import fastapi, uvicorn, torch, pandas, numpy, joblib" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements-api.txt
fi

echo "[2/4] Checking Node.js dependencies..."
cd nextjs-ui
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

echo "[3/4] Starting Python API Server..."
cd ..
python3 api_server.py &
API_PID=$!
sleep 5

echo "[4/4] Starting Next.js UI..."
cd nextjs-ui
npm run dev &
UI_PID=$!

echo ""
echo "===================================="
echo "Services are running..."
echo ""
echo "API Server: http://localhost:8000"
echo "UI: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services..."
echo "===================================="

# Trap Ctrl+C and stop all services
trap "kill $API_PID $UI_PID; echo 'All services stopped.'; exit" INT

# Wait indefinitely
wait
