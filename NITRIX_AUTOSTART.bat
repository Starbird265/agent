@echo off
title Nitrix AI Training Platform - Auto-Start
color 0B

echo.
echo 🎯 NITRIX AI TRAINING PLATFORM - AUTO-START
echo =================================================================
echo 🚀 Train Smarter AI—No Cloud, No Code, Just Power
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo 🔹 Checking system requirements...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)
echo ✅ Python found

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm
    pause
    exit /b 1
)
echo ✅ npm found

echo.
echo 🔹 Setting up Python environment...

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 🔹 Creating Python virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
call venv\Scripts\activate.bat
echo ✅ Virtual environment activated

REM Install Python dependencies
echo 🔹 Installing Python dependencies...
pip install --upgrade pip --quiet
pip install --quiet fastapi==0.104.1 uvicorn[standard]==0.24.0 python-multipart==0.0.6 python-dotenv==1.0.0 requests==2.31.0

REM Try to install optional packages
pip install --quiet pydantic 2>nul || echo ⚠️ Pydantic install skipped
pip install --quiet psutil 2>nul || echo ⚠️ psutil install skipped

echo ✅ Python dependencies installed

echo.
echo 🔹 Setting up Node.js environment...

cd packages\frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo 🔹 Installing frontend dependencies...
    npm install --silent
    echo ✅ Frontend dependencies installed
) else (
    echo ✅ Frontend dependencies already installed
)

cd ..\..

echo.
echo 🔹 Starting services...

REM Start backend
echo 🔹 Starting backend server...
cd backend
start "Nitrix Backend" cmd /k "call ..\venv\Scripts\activate.bat && python simple_main.py"

REM Wait for backend to start
echo 🔹 Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

cd ..

REM Start frontend
echo 🔹 Starting frontend development server...
cd packages\frontend
start "Nitrix Frontend" cmd /k "npm run dev"

cd ..\..

REM Wait for frontend to start
echo 🔹 Waiting for frontend to initialize...
timeout /t 5 /nobreak >nul

REM Open browser
echo 🔹 Opening browser...
timeout /t 2 /nobreak >nul
start "" http://localhost:5173

echo.
echo 🎉 NITRIX IS NOW RUNNING!
echo =======================================
echo 🌐 Frontend:  http://localhost:5173
echo 🔧 Backend:   http://localhost:8000
echo 📚 API Docs:  http://localhost:8000/docs
echo 💊 Health:    http://localhost:8000/health
echo.
echo 🔥 FEATURES READY:
echo    • AI Model Training with 8 algorithms
echo    • Drag ^& drop data upload
echo    • Real-time training progress
echo    • Interactive predictions
echo    • Modern responsive UI
echo    • Local privacy-first processing
echo.
echo 📊 SAMPLE DATA: Upload 'sample_iris_dataset.csv' to test immediately
echo 🎯 EXPECTED: 90-95%% accuracy in 1-2 minutes
echo.
echo Press any key to stop all services...
echo =======================================

pause >nul

echo.
echo 🛑 Shutting down Nitrix...

REM Kill processes
taskkill /f /im python.exe 2>nul
taskkill /f /im node.exe 2>nul
taskkill /f /im cmd.exe /fi "WINDOWTITLE eq Nitrix*" 2>nul

echo ✅ Backend stopped
echo ✅ Frontend stopped
echo 👋 Nitrix stopped. Thanks for using the platform!

pause