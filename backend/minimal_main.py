#!/usr/bin/env python3
"""
Nitrix Backend - Minimal Working Version
Guaranteed to work for auto-start functionality
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import time
import logging
from datetime import datetime
from typing import Dict, List, Any

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage
projects = {}
models = {}
sessions = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 Nitrix Backend starting up...")
    logger.info("✅ All endpoints initialized")
    yield
    logger.info("🛑 Nitrix Backend shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="Nitrix Backend", 
    version="1.0.0",
    description="Nitrix AI Training Platform - Minimal Backend",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "🚀 Nitrix Backend is running!",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "nitrix-backend",
        "timestamp": datetime.now().isoformat(),
        "uptime": time.time()
    }

# API status endpoint
@app.get("/api/status")
async def api_status():
    return {
        "api": "ready",
        "ml_engine": "initialized",
        "projects": len(projects),
        "models": len(models),
        "sessions": len(sessions)
    }

# System info endpoint
@app.get("/api/system/info")
async def system_info():
    return {
        "system": {
            "platform": "auto-start",
            "status": "ready"
        },
        "ml_engine": {
            "algorithms": ["random_forest", "neural_network", "svm"],
            "status": "ready"
        }
    }

# Project management
@app.post("/api/projects")
async def create_project(project: Dict[str, Any]):
    project_id = f"proj_{int(time.time())}"
    projects[project_id] = {
        "id": project_id,
        "name": project.get("name", "Untitled Project"),
        "description": project.get("description", ""),
        "created_at": datetime.now().isoformat(),
        "status": "created"
    }
    logger.info(f"Created project: {project_id}")
    return {"project_id": project_id, "status": "created"}

@app.get("/api/projects")
async def list_projects():
    return {"projects": list(projects.values())}

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    return projects[project_id]

# Data upload
@app.post("/api/projects/{project_id}/upload")
async def upload_data(project_id: str, file: UploadFile = File(...)):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Simple file validation
    if not file.filename.endswith(('.csv', '.json', '.txt')):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    # Mock file processing
    content = await file.read()
    data_size = len(content.decode('utf-8', errors='ignore').split('\n'))
    
    projects[project_id].update({
        "data_uploaded": True,
        "filename": file.filename,
        "data_size": data_size,
        "upload_time": datetime.now().isoformat()
    })
    
    logger.info(f"Uploaded data for project {project_id}: {file.filename}")
    return {
        "status": "uploaded",
        "filename": file.filename,
        "data_size": data_size,
        "message": f"Successfully uploaded {data_size} rows"
    }

# Model training
@app.post("/api/projects/{project_id}/train")
async def train_model(project_id: str, config: Dict[str, Any]):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Mock training
    algorithm = config.get("algorithm", "random_forest")
    session_id = f"session_{int(time.time())}"
    model_id = f"model_{int(time.time())}"
    
    # Mock training results
    accuracy = 0.85 + (0.15 * ((time.time() % 100) / 100))
    
    sessions[session_id] = {
        "id": session_id,
        "project_id": project_id,
        "algorithm": algorithm,
        "status": "completed",
        "accuracy": accuracy,
        "model_id": model_id,
        "created_at": datetime.now().isoformat()
    }
    
    models[model_id] = {
        "id": model_id,
        "project_id": project_id,
        "algorithm": algorithm,
        "accuracy": accuracy,
        "status": "ready",
        "created_at": datetime.now().isoformat()
    }
    
    logger.info(f"Trained model {model_id} for project {project_id}")
    return {
        "session_id": session_id,
        "model_id": model_id,
        "status": "training_completed",
        "accuracy": accuracy
    }

# Model prediction
@app.post("/api/models/{model_id}/predict")
async def predict(model_id: str, request: Dict[str, Any]):
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    
    model = models[model_id]
    features = request.get("features", [])
    
    # Mock prediction
    prediction = "positive" if sum(features) > len(features) * 0.5 else "negative"
    confidence = min(0.95, max(0.65, model["accuracy"] + 0.05))
    
    result = {
        "model_id": model_id,
        "prediction": prediction,
        "confidence": confidence,
        "algorithm": model["algorithm"],
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"Prediction made with model {model_id}: {prediction}")
    return result

# List models
@app.get("/api/models")
async def list_models():
    return {"models": list(models.values())}

# Get model details
@app.get("/api/models/{model_id}")
async def get_model(model_id: str):
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    return models[model_id]

# Training session status
@app.get("/api/training/{session_id}/status")
async def training_status(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Training session not found")
    return sessions[session_id]

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": str(exc)}
    )

# Startup and shutdown events are now handled by lifespan

# Main execution
if __name__ == "__main__":
    print("🚀 Starting Nitrix Minimal Backend...")
    print("=" * 50)
    print("🌐 Server: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("🔧 Health Check: http://localhost:8000/health")
    print("=" * 50)
    
    try:
        uvicorn.run(
            "minimal_main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        exit(1)