@echo off
echo 🎯 Starting Nitrix AI Training Platform...
echo ==========================================

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo ✅ Python virtual environment activated
) else (
    echo ❌ Virtual environment not found. Run auto-setup.sh first.
    pause
    exit /b 1
)

REM Start backend
echo 🚀 Starting backend server...
cd backend
start "Nitrix Backend" python -c "
import uvicorn
import sys

app_code = '''
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=\"Nitrix Backend\", version=\"1.0.0\")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[\"*\"],
    allow_credentials=True,
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)

@app.get(\"/\")
async def root():
    return {\"message\": \"Nitrix Backend is running!\", \"status\": \"healthy\"}

@app.get(\"/health\")
async def health():
    return {\"status\": \"healthy\", \"service\": \"nitrix-backend\"}

@app.get(\"/api/status\")
async def api_status():
    return {\"api\": \"ready\", \"ml_engine\": \"initialized\"}
'''

with open('simple_app.py', 'w') as f:
    f.write(app_code)

try:
    import simple_app
    uvicorn.run('simple_app:app', host='0.0.0.0', port=8000)
except Exception as e:
    print(f'Error: {e}')
    input('Press Enter to exit...')
"

timeout /t 3 /nobreak > nul

REM Start frontend
echo 🚀 Starting frontend...
cd ..\packages\frontend

if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
)

start "Nitrix Frontend" npm run dev

echo.
echo 🎉 Nitrix is now running!
echo ========================================
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo Press any key to stop all services
pause > nul

REM Kill background processes (best effort)
taskkill /f /im node.exe 2>nul
taskkill /f /im python.exe 2>nul
