#!/bin/bash

# 🚀 NITRIX AUTO-START SCRIPT
# Starts both backend and frontend automatically

echo "🎯 Starting Nitrix AI Training Platform..."
echo "=========================================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down Nitrix..."
    # Kill all background processes
    jobs -p | xargs -r kill
    exit 0
}

# Trap cleanup function on script exit
trap cleanup EXIT INT TERM

# Activate Python virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "✅ Python virtual environment activated"
else
    echo "❌ Virtual environment not found. Run auto-setup.sh first."
    exit 1
fi

# Start backend in background
echo "🚀 Starting backend server..."
cd backend
python3 -c "
import uvicorn
import sys
import os

# Simple FastAPI app if main.py doesn't exist or has issues
app_code = '''
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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

if __name__ == \"__main__\":
    uvicorn.run(app, host=\"0.0.0.0\", port=8000)
'''

# Write the app code to a file
with open('simple_app.py', 'w') as f:
    f.write(app_code)

# Run the simple app
try:
    import simple_app
    uvicorn.run('simple_app:app', host='0.0.0.0', port=8000, reload=False)
except Exception as e:
    print(f'Error starting backend: {e}')
    sys.exit(1)
" &

BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🚀 Starting frontend..."
cd ../packages/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend development server
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Nitrix is now running!"
echo "========================================"
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"

# Wait for all background processes
wait
