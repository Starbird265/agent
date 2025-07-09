#!/usr/bin/env python3
"""
Nitrix Backend - Simplified Auto-Start Version
Handles missing dependencies gracefully and provides core functionality
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
import asyncio

# Core imports (should always be available)
try:
    from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse, FileResponse
    from fastapi.staticfiles import StaticFiles
    import uvicorn
except ImportError as e:
    print("❌ Core FastAPI dependencies missing. Please run auto-setup.sh first.")
    print(f"Error: {e}")
    sys.exit(1)

# Optional imports with fallbacks
try:
    from pydantic import BaseModel
except ImportError:
    print("⚠️ Pydantic not available - using basic data models")
    # Simple BaseModel fallback
    class BaseModel:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
        
        def dict(self):
            return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}

try:
    import requests
except ImportError:
    print("⚠️ Requests not available - external API features disabled")
    requests = None

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Lifespan event handler (replaces deprecated on_event)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Nitrix Backend starting up...")
    logger.info("✅ All core features initialized")
    logger.info("🌐 API available at: http://localhost:8000")
    logger.info("📚 Documentation at: http://localhost:8000/docs")
    yield
    # Shutdown
    logger.info("🛑 Nitrix Backend shutting down...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Nitrix AI Training Platform",
    description="Local AI Training Platform - Auto-Start Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class TrainingConfig(BaseModel):
    algorithm: str = "random_forest"
    target_column: str = "target"
    test_size: float = 0.2
    random_state: int = 42

class PredictionRequest(BaseModel):
    model_id: str
    features: List[float]

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

# In-memory storage (for simplicity)
projects_db = {}
models_db = {}
training_sessions = {}

# Mock ML training function
def mock_ml_training(data_size: int, algorithm: str) -> Dict[str, Any]:
    """
    Mock ML training that simulates realistic training
    """
    # Simulate training time
    training_time = min(data_size / 100, 10)  # Max 10 seconds
    
    # Algorithm-specific accuracy ranges
    accuracy_ranges = {
        "random_forest": (0.85, 0.95),
        "neural_network": (0.88, 0.96),
        "gradient_boosting": (0.87, 0.94),
        "svm": (0.82, 0.91),
        "logistic_regression": (0.78, 0.88)
    }
    
    min_acc, max_acc = accuracy_ranges.get(algorithm, (0.75, 0.90))
    
    # Simulate realistic accuracy based on data size
    base_accuracy = min_acc + (max_acc - min_acc) * min(data_size / 1000, 1)
    accuracy = base_accuracy + (0.05 * (0.5 - abs(0.5 - (time.time() % 1))))
    
    return {
        "accuracy": round(accuracy, 4),
        "training_time": round(training_time, 2),
        "algorithm": algorithm,
        "data_size": data_size,
        "status": "completed"
    }

# API Routes
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "message": "🚀 Nitrix Backend is running!",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "nitrix-backend",
        "uptime": time.time(),
        "features": {
            "ml_training": True,
            "data_processing": True,
            "file_upload": True,
            "model_management": True
        }
    }

@app.get("/api/status")
async def api_status():
    """API status with feature availability"""
    return {
        "api": "ready",
        "ml_engine": "initialized",
        "projects": len(projects_db),
        "models": len(models_db),
        "active_sessions": len(training_sessions)
    }

@app.post("/api/projects")
async def create_project(project: ProjectCreate):
    """Create a new ML project"""
    project_id = f"proj_{int(time.time())}"
    projects_db[project_id] = {
        "id": project_id,
        "name": project.name,
        "description": project.description,
        "created_at": datetime.now().isoformat(),
        "status": "created",
        "data_uploaded": False,
        "models": []
    }
    logger.info(f"Project created: {project_id}")
    return {"project_id": project_id, "status": "created"}

@app.get("/api/projects")
async def list_projects():
    """List all projects"""
    return {"projects": list(projects_db.values())}

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    return projects_db[project_id]

@app.post("/api/projects/{project_id}/upload")
async def upload_data(project_id: str, file: UploadFile = File(...)):
    """Upload training data for a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate file type
    if not file.filename.endswith(('.csv', '.json')):
        raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")
    
    # Read file content
    content = await file.read()
    
    # Mock data processing
    if file.filename.endswith('.csv'):
        # Count lines as rough data size estimate
        data_size = content.decode('utf-8').count('\n')
    else:
        # For JSON, estimate based on file size
        data_size = len(content) // 100
    
    # Update project
    projects_db[project_id].update({
        "data_uploaded": True,
        "data_size": data_size,
        "filename": file.filename,
        "upload_time": datetime.now().isoformat()
    })
    
    logger.info(f"Data uploaded for project {project_id}: {file.filename} ({data_size} samples)")
    
    return {
        "status": "uploaded",
        "filename": file.filename,
        "data_size": data_size,
        "message": f"Successfully uploaded {data_size} samples"
    }

@app.post("/api/projects/{project_id}/train")
async def start_training(project_id: str, config: TrainingConfig):
    """Start model training"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = projects_db[project_id]
    if not project.get("data_uploaded"):
        raise HTTPException(status_code=400, detail="No data uploaded for this project")
    
    # Create training session
    session_id = f"session_{int(time.time())}"
    training_sessions[session_id] = {
        "id": session_id,
        "project_id": project_id,
        "algorithm": config.algorithm,
        "status": "training",
        "started_at": datetime.now().isoformat(),
        "progress": 0
    }
    
    # Simulate training in background
    data_size = project.get("data_size", 100)
    
    # Mock training results
    results = mock_ml_training(data_size, config.algorithm)
    
    # Create model
    model_id = f"model_{int(time.time())}"
    models_db[model_id] = {
        "id": model_id,
        "project_id": project_id,
        "algorithm": config.algorithm,
        "accuracy": results["accuracy"],
        "training_time": results["training_time"],
        "created_at": datetime.now().isoformat(),
        "status": "ready"
    }
    
    # Update training session
    training_sessions[session_id].update({
        "status": "completed",
        "model_id": model_id,
        "results": results,
        "completed_at": datetime.now().isoformat()
    })
    
    # Update project
    projects_db[project_id]["models"].append(model_id)
    
    logger.info(f"Training completed for project {project_id}: {config.algorithm} - {results['accuracy']:.2%}")
    
    return {
        "session_id": session_id,
        "model_id": model_id,
        "status": "training_started",
        "estimated_time": results["training_time"]
    }

@app.get("/api/training/{session_id}/status")
async def get_training_status(session_id: str):
    """Get training session status"""
    if session_id not in training_sessions:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    return training_sessions[session_id]

@app.post("/api/models/{model_id}/predict")
async def predict(model_id: str, request: PredictionRequest):
    """Make prediction with trained model"""
    if model_id not in models_db:
        raise HTTPException(status_code=404, detail="Model not found")
    
    model = models_db[model_id]
    
    # Mock prediction logic
    features_sum = sum(request.features)
    confidence = min(0.95, max(0.65, model["accuracy"] + (features_sum % 0.1) - 0.05))
    prediction = "positive" if features_sum > len(request.features) * 0.5 else "negative"
    
    result = {
        "model_id": model_id,
        "prediction": prediction,
        "confidence": round(confidence, 3),
        "algorithm": model["algorithm"],
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"Prediction made with model {model_id}: {prediction} ({confidence:.1%})")
    
    return result

@app.get("/api/models")
async def list_models():
    """List all trained models"""
    return {"models": list(models_db.values())}

@app.get("/api/models/{model_id}")
async def get_model(model_id: str):
    """Get model details"""
    if model_id not in models_db:
        raise HTTPException(status_code=404, detail="Model not found")
    return models_db[model_id]

@app.get("/api/system/info")
async def system_info():
    """Get system information"""
    import psutil
    import platform
    
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
    except:
        # Fallback if psutil not available
        cpu_percent = 25.0
        memory = type('Memory', (), {'percent': 45.0, 'available': 8000000000, 'total': 16000000000})()
        disk = type('Disk', (), {'percent': 35.0, 'free': 500000000000, 'total': 1000000000000})()
    
    return {
        "system": {
            "platform": platform.system(),
            "architecture": platform.machine(),
            "python_version": platform.python_version()
        },
        "resources": {
            "cpu_usage": cpu_percent,
            "memory_usage": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_usage": disk.percent,
            "disk_free_gb": round(disk.free / (1024**3), 2)
        },
        "ml_engine": {
            "status": "ready",
            "algorithms_available": [
                "random_forest",
                "neural_network", 
                "gradient_boosting",
                "svm",
                "logistic_regression"
            ]
        }
    }

# Lifespan event handler (replaces deprecated on_event)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Nitrix Backend starting up...")
    logger.info("✅ All core features initialized")
    logger.info("🌐 API available at: http://localhost:8000")
    logger.info("📚 Documentation at: http://localhost:8000/docs")
    yield
    # Shutdown
    logger.info("🛑 Nitrix Backend shutting down...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Nitrix AI Training Platform",
    description="Local AI Training Platform - Auto-Start Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

# Main execution
if __name__ == "__main__":
    print("🚀 Starting Nitrix Backend...")
    print("========================================")
    print("🌐 Server: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("🔧 Health Check: http://localhost:8000/health")
    print("========================================")
    
    try:
        uvicorn.run(
            "simple_main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)