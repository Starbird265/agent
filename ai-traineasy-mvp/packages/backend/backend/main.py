"""
AI TrainEasy MVP - Secure Backend API
Production-ready version with authentication, database, and security features
"""
import psutil
import torch
import GPUtil
from fastapi import FastAPI, Request, File, UploadFile, Body, HTTPException, Form, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import os, json, uuid
from datetime import datetime, timedelta
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session
import threading
import joblib
import pandas as pd
import subprocess
from fastapi.responses import PlainTextResponse, JSONResponse
import signal
from huggingface_hub import snapshot_download
import requests
import shutil
from dotenv import load_dotenv
import structlog

# Load environment variables
load_dotenv()

# Import our custom modules
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import (
    authenticate_user, create_access_token, get_current_active_user, 
    create_user, fake_users_db, Token, UserCreate, User, ACCESS_TOKEN_EXPIRE_MINUTES
)
from database import get_db, init_db, User as DBUser, Project as DBProject, Dataset as DBDataset
from middleware import SecurityHeadersMiddleware, RateLimitMiddleware, LoggingMiddleware, FileSizeValidationMiddleware

# Initialize structured logging
logger = structlog.get_logger()

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(
    title="AI TrainEasy MVP",
    description="Automated Machine Learning Platform with Security",
    version="1.0.0-beta",
    docs_url="/docs" if os.getenv("ENVIRONMENT") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") == "development" else None,
)

@app.get("/system-info")
async def system_info(current_user: User = Depends(get_current_active_user)):
    """Get system information - requires authentication"""
    try:
        cpu_count = psutil.cpu_count(logical=True)
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        total_ram_gb = round(mem.total / (1024**3), 2)
        ram_percent = mem.percent

        # GPU detection (NVIDIA, AMD, Intel)
        gpus = []
        try:
            for gpu in GPUtil.getGPUs():
                gpus.append({
                    "id": gpu.id,
                    "name": gpu.name,
                    "driver": gpu.driver,
                    "memory_total": gpu.memoryTotal,
                    "memory_used": gpu.memoryUsed,
                    "memory_free": gpu.memoryFree,
                    "load": gpu.load,
                    "temperature": gpu.temperature,
                    "uuid": gpu.uuid
                })
        except Exception:
            pass

        gpu_available = len(gpus) > 0
        gpu_count = len(gpus)
        gpu_names = [g["name"] for g in gpus]

        logger.info("System info accessed", username=current_user.username)
        return {
            "cpu_count": cpu_count,
            "cpu_percent": cpu_percent,
            "total_ram_gb": total_ram_gb,
            "ram_percent": ram_percent,
            "gpu_available": gpu_available,
            "gpu_count": gpu_count,
            "gpu_names": gpu_names,
            "gpus": gpus
        }
    except Exception as e:
        logger.error("Failed to get system info", username=current_user.username, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system information")

@app.get("/projects/{project_id}/training-log")
async def get_training_log(project_id: str, current_user: User = Depends(get_current_active_user)):
    """Get training log JSON for a project"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        log_path = f"projects/{project_id}/training_log.json"
        if os.path.exists(log_path):
            with open(log_path) as f:
                data = json.load(f)
            logger.info("Training log accessed", username=current_user.username, project_id=project_id)
            return data
        else:
            return JSONResponse(status_code=404, content={"error": "No training log found"})
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get training log", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve training log")

# Add Security Middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=int(os.getenv("RATE_LIMIT_REQUESTS", "60")))
app.add_middleware(FileSizeValidationMiddleware, max_size_mb=int(os.getenv("MAX_FILE_SIZE_MB", "100")))

# CORS Configuration - Secure for production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Ensure projects dir exists
os.makedirs('projects', exist_ok=True)

class ProjectCreateRequest(BaseModel):
    name: str

# Authentication Endpoints
@app.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        user = create_user(user_data)
        logger.info("User registered", username=user.username)
        return user
    except HTTPException as e:
        logger.warning("Registration failed", username=user_data.username, error=e.detail)
        raise

@app.post("/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        logger.warning("Login failed", username=form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    logger.info("User logged in", username=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info"""
    return current_user

@app.get("/")
async def read_root():
    return {"status": "AI TrainEasy MVP Backend - Secure Version", "version": "1.0.0-beta"}

@app.get("/projects")
async def list_projects(current_user: User = Depends(get_current_active_user)):
    """List all projects for the current user"""
    projects_dir = "projects"
    try:
        files = os.listdir(projects_dir)
        projects = []
        for fname in files:
            if fname.endswith(".json"):
                path = os.path.join(projects_dir, fname)
                with open(path) as f:
                    project_data = json.load(f)
                    # Only return projects owned by current user
                    if project_data.get("owner") == current_user.username:
                        projects.append(project_data)
        logger.info("Projects listed", username=current_user.username, count=len(projects))
        return {"success": True, "projects": projects}
    except Exception as e:
        logger.error("Failed to list projects", username=current_user.username, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list projects")

@app.post("/projects/create")
async def create_project(data: ProjectCreateRequest, current_user: User = Depends(get_current_active_user)):
    """Create a new project for the current user"""
    try:
        project = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "created_at": datetime.utcnow().isoformat(),
            "status": "initialized",
            "owner": current_user.username
        }
        
        # Create project directory
        project_dir = os.path.join('projects', project['id'])
        os.makedirs(project_dir, exist_ok=True)
        
        # Write project metadata
        file_path = os.path.join('projects', f"{project['id']}.json")
        with open(file_path, 'w') as f:
            json.dump(project, f, indent=2)
        
        logger.info("Project created", username=current_user.username, project_id=project['id'], project_name=data.name)
        return {"success": True, "project": project}
    except Exception as e:
        logger.error("Failed to create project", username=current_user.username, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create project")

async def verify_project_ownership(project_id: str, current_user: User):
    """Verify that the current user owns the project"""
    project_file = os.path.join('projects', f"{project_id}.json")
    if not os.path.exists(project_file):
        raise HTTPException(status_code=404, detail="Project not found")
    
    with open(project_file) as f:
        project_data = json.load(f)
    
    if project_data.get("owner") != current_user.username:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return project_data

@app.post("/projects/{project_id}/data")
async def upload_dataset(
    project_id: str, 
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload dataset file to a project"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        allowed_extensions = ['.csv', '.json']
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Only CSV and JSON files are allowed")
        
        # Validate content type
        allowed_types = ['text/csv', 'application/json', 'text/plain']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        project_dir = os.path.join('projects', project_id)
        data_dir = os.path.join(project_dir, 'data')
        os.makedirs(data_dir, exist_ok=True)

        # Create safe filename
        safe_filename = f"{int(datetime.now().timestamp())}_{file.filename}"
        file_path = os.path.join(data_dir, safe_filename)
        
        contents = await file.read()
        
        # Validate file content for basic structure
        try:
            if file_extension == '.json':
                json.loads(contents.decode('utf-8'))
            elif file_extension == '.csv':
                # Basic CSV validation
                content_str = contents.decode('utf-8')
                if not content_str.strip():
                    raise HTTPException(status_code=400, detail="Empty file")
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise HTTPException(status_code=400, detail="Invalid file format")
        
        with open(file_path, 'wb') as f:
            f.write(contents)

        logger.info("Dataset uploaded", username=current_user.username, project_id=project_id, filename=file.filename, size=len(contents))
        return {"success": True, "filename": file.filename, "size": len(contents)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Dataset upload failed", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(status_code=500, detail="Upload failed")


@app.post("/projects/{project_id}/schema")
async def save_schema(
    project_id: str, 
    request: Request, 
    current_user: User = Depends(get_current_active_user)
):
    """Save schema configuration for a project"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        project_dir = os.path.join("projects", project_id)
        schema = await request.json()
        
        # Basic schema validation
        if not isinstance(schema, dict):
            raise HTTPException(status_code=400, detail="Schema must be a JSON object")
        
        if "inputs" not in schema or "output" not in schema:
            raise HTTPException(status_code=400, detail="Schema must contain 'inputs' and 'output' fields")
        
        if not isinstance(schema["inputs"], list) or not schema["inputs"]:
            raise HTTPException(status_code=400, detail="Schema 'inputs' must be a non-empty list")
        
        if not isinstance(schema["output"], str) or not schema["output"]:
            raise HTTPException(status_code=400, detail="Schema 'output' must be a non-empty string")

        with open(os.path.join(project_dir, "schema.json"), "w") as f:
            json.dump(schema, f, indent=2)

        logger.info("Schema saved", username=current_user.username, project_id=project_id)
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Schema save failed", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to save schema")

# Training endpoint with authentication and validation

# Update TrainRequest model with validation
class TrainRequest(BaseModel):
    cpu_percent: int = 100
    
    @validator('cpu_percent')
    def validate_cpu(cls, v):
        if v < 10 or v > 100:
            raise ValueError('CPU limit must be between 10-100%')
        return v

@app.post("/projects/{project_id}/train")
async def train_project(
    project_id: str, 
    body: TrainRequest, 
    current_user: User = Depends(get_current_active_user)
):
    """Start training for a project"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        # Validate training requirements
        project_dir = os.path.join("projects", project_id)
        schema_path = os.path.join(project_dir, 'schema.json')
        data_dir = os.path.join(project_dir, 'data')
        
        if not os.path.exists(schema_path):
            raise HTTPException(400, "Missing required schema. Please configure your data schema first.")
        
        if not os.path.exists(data_dir) or not os.listdir(data_dir):
            raise HTTPException(400, "No dataset found. Please upload a dataset first.")
            
        # Check for existing training process
        pid_path = os.path.join(project_dir, 'train.pid')
        if os.path.exists(pid_path):
            raise HTTPException(409, "Training already in progress")

        # Validate CPU percentage
        if body.cpu_percent < 10 or body.cpu_percent > 100:
            raise HTTPException(400, "CPU percentage must be between 10 and 100")

        log_path = os.path.join(project_dir, "train.log")
        os.makedirs(project_dir, exist_ok=True)
        
        # Update project status
        project_file = os.path.join('projects', f"{project_id}.json")
        with open(project_file) as f:
            project_data = json.load(f)
        project_data['status'] = 'training'
        project_data['training_started_at'] = datetime.utcnow().isoformat()
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)
    
        cpu_limit = body.cpu_percent
    
        def run_training():
            try:
                with open(log_path, "w") as log_file:
                    cmd = []
                    # Check if cpulimit utility is available
                    cpulimit_path = shutil.which("cpulimit")
                    if 0 < cpu_limit < 100 and cpulimit_path is not None:
                        cmd = [
                            cpulimit_path, "-l", str(cpu_limit),
                            "--", "python", "train_model.py", project_id
                        ]
                    else:
                        cmd = ["python", "train_model.py", project_id]
        
                    proc = subprocess.Popen(
                        cmd,
                        cwd=os.path.dirname(__file__),
                        stdout=log_file, stderr=log_file
                    )
                    with open(pid_path, "w") as f:
                        f.write(str(proc.pid))
                    
                    # Wait for training to complete
                    proc.wait()
                    
                    # Update project status
                    with open(project_file) as f:
                        project_data = json.load(f)
                    project_data['status'] = 'completed' if proc.returncode == 0 else 'failed'
                    project_data['training_completed_at'] = datetime.utcnow().isoformat()
                    with open(project_file, 'w') as f:
                        json.dump(project_data, f, indent=2)
                    
                    # Cleanup PID file
                    if os.path.exists(pid_path):
                        os.remove(pid_path)
                        
            except Exception as e:
                logger.error("Training thread failed", project_id=project_id, error=str(e))
                # Update project status to failed
                try:
                    with open(project_file) as f:
                        project_data = json.load(f)
                    project_data['status'] = 'failed'
                    project_data['error'] = str(e)
                    with open(project_file, 'w') as f:
                        json.dump(project_data, f, indent=2)
                except:
                    pass
                finally:
                    if os.path.exists(pid_path):
                        os.remove(pid_path)
    
        threading.Thread(target=run_training, daemon=True).start()
        logger.info("Training started", username=current_user.username, project_id=project_id, cpu_percent=cpu_limit)
        return {"success": True, "message": "Training started successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training initialization failed", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(500, "Training initialization failed")


@app.get("/projects/{project_id}/logs", response_class=PlainTextResponse)
async def get_logs(project_id: str, current_user: User = Depends(get_current_active_user)):
    """Get training logs for a project"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        log_path = os.path.join("projects", project_id, "train.log")
        if not os.path.isfile(log_path):
            return PlainTextResponse("No training logs available yet.", status_code=200)
        
        with open(log_path, "r") as f:
            content = f.read()
        
        logger.info("Logs accessed", username=current_user.username, project_id=project_id)
        return content
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get logs", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve logs")

class PredictRequest(BaseModel):
    inputs: dict  # e.g. {"col1": 5, "col2": 3}
    
    @validator('inputs')
    def validate_inputs(cls, v):
        if not isinstance(v, dict) or not v:
            raise ValueError('Inputs must be a non-empty dictionary')
        return v

@app.post("/projects/{project_id}/predict")
async def predict(
    project_id: str, 
    body: PredictRequest = Body(...), 
    current_user: User = Depends(get_current_active_user)
):
    """Make predictions using trained model"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        # Locate project model
        model_path = os.path.join("projects", project_id, "model.pkl")
        if not os.path.isfile(model_path):
            raise HTTPException(status_code=404, detail="Model not found. Please train a model first.")

        # Load model
        model = joblib.load(model_path)

        # Prepare input dataframe
        df = pd.DataFrame([body.inputs])

        # Run prediction
        preds = model.predict(df).tolist()

        logger.info("Prediction made", username=current_user.username, project_id=project_id, input_features=len(body.inputs))
        return {"success": True, "predictions": preds, "input": body.inputs}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Prediction failed", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(status_code=500, detail="Prediction failed")

@app.post("/download-hf-model")
async def download_hf_model(
    model_id: str = Form(...), 
    project_id: str = Form(...),
    current_user: User = Depends(get_current_active_user)
):
    """Download a model from Hugging Face Hub into the project's directory"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        token = os.environ.get("HUGGINGFACE_HUB_TOKEN")
        if not token:
            raise HTTPException(status_code=400, detail="Hugging Face token not configured")
        
        # Validate model_id format
        if not model_id or '/' not in model_id:
            raise HTTPException(status_code=400, detail="Invalid model ID format")
        
        target_dir = os.path.join("projects", project_id, "hf_models", model_id.replace('/', '__'))
        os.makedirs(target_dir, exist_ok=True)
        
        snapshot_download(
            repo_id=model_id,
            cache_dir=target_dir,
            token=token,
            local_files_only=False,
            resume_download=True
        )
        
        logger.info("HF model downloaded", username=current_user.username, project_id=project_id, model_id=model_id)
        return {"success": True, "message": f"Model '{model_id}' downloaded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("HF model download failed", username=current_user.username, project_id=project_id, model_id=model_id, error=str(e))
        return {"success": False, "error": str(e)}

@app.get("/search-hf-models")
async def search_hf_models(q: str, current_user: User = Depends(get_current_active_user)):
    """Search Hugging Face Hub for models matching the query string"""
    try:
        if not q or len(q) < 2:
            raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
        
        resp = requests.get(
            "https://huggingface.co/api/models",
            params={"search": q, "limit": 10},
            headers={"Authorization": f"Bearer {os.environ.get('HUGGINGFACE_HUB_TOKEN', '')}"},
            timeout=10
        )
        resp.raise_for_status()
        models = resp.json()
        
        # Return only relevant info
        result = [{
            "modelId": m["modelId"],
            "pipeline_tag": m.get("pipeline_tag"),
            "likes": m.get("likes", 0),
            "downloads": m.get("downloads", 0),
            "description": m.get("cardData", {}).get("summary", "")
        } for m in models]
        
        logger.info("HF models searched", username=current_user.username, query=q, results_count=len(result))
        return result
        
    except requests.RequestException as e:
        logger.error("HF search failed", username=current_user.username, error=str(e))
        raise HTTPException(status_code=503, detail="Hugging Face search service unavailable")
    except Exception as e:
        logger.error("HF search error", username=current_user.username, error=str(e))
        return {"error": str(e)}

@app.get("/projects/{project_id}/hf-models")
async def list_downloaded_hf_models(project_id: str, current_user: User = Depends(get_current_active_user)):
    """List all downloaded Hugging Face models for a project, with metadata"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        import time
        models_dir = os.path.join("projects", project_id, "hf_models")
        if not os.path.isdir(models_dir):
            return {"models": []}
        
        models = []
        for d in os.listdir(models_dir):
            model_path = os.path.join(models_dir, d)
            if os.path.isdir(model_path):
                stat = os.stat(model_path)
                models.append({
                    "model_id": d.replace("__", "/"),
                    "local_dir": model_path,
                    "size_mb": round(sum(os.path.getsize(os.path.join(dp, f)) 
                                       for dp, dn, filenames in os.walk(model_path) 
                                       for f in filenames) / 1024 / 1024, 2),
                    "last_modified": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stat.st_mtime))
                })
        
        logger.info("HF models listed", username=current_user.username, project_id=project_id, count=len(models))
        return {"models": models}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to list HF models", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list models")

@app.delete("/projects/{project_id}/hf-models")
async def delete_all_downloaded_hf_models(project_id: str, current_user: User = Depends(get_current_active_user)):
    """Delete all downloaded Hugging Face models for a project"""
    try:
        # Verify project ownership
        await verify_project_ownership(project_id, current_user)
        
        models_dir = os.path.join("projects", project_id, "hf_models")
        if not os.path.isdir(models_dir):
            return {"success": True, "message": "No models to delete."}
        
        shutil.rmtree(models_dir)
        os.makedirs(models_dir, exist_ok=True)
        
        logger.info("HF models deleted", username=current_user.username, project_id=project_id)
        return {"success": True, "message": "All models deleted successfully."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete HF models", username=current_user.username, project_id=project_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete models")


# Health check endpoint for monitoring
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0-beta"
    }