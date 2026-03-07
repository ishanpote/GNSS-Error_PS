#!/bin/bash

echo "===================================="
echo "GNSS Forecasting System - Quick Start"
echo "===================================="
echo ""

echo "[1/4] Starting Backend Server..."
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..

echo "[2/4] Waiting for backend to initialize..."
sleep 5

echo "[3/4] Starting Frontend Development Server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "[4/4] Done!"
echo ""
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Default Admin Credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
