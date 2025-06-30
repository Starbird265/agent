"""
AI TrainEasy MVP - Beta-Ready Backend
Simplified version with essential security features for beta testing
"""
import psutil
import torch
import GPUtil
from fastapi import FastAPI, Request, File, UploadFile, Body, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import os, json, uuid
from datetime import datetime
from pydantic import BaseModel, validator
import threading
import joblib
import pandas as pd
import subprocess
from fastapi.responses import PlainTextResponse, JSONResponse
import signal
from huggingface_hub import snapshot_download
import requests
import shutil
import logging
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI TrainEasy MVP",
    description="Automated Machine Learning Platform - Beta Version",
    version="1.0.0-beta",
)

# Secure CORS Configuration
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://localhost:5173",
    "https://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Ensure projects dir exists
os.makedirs('projects', exist_ok=True)

# Models
class ProjectCreateRequest(BaseModel):
    name: str
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Project name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Project name must be less than 100 characters')
        return v.strip()

class TrainRequest(BaseModel):
    cpu_percent: int = 100
    use_gpu: bool = False
    
    @validator('cpu_percent')
    def validate_cpu(cls, v):
        if v < 10 or v > 100:
            raise ValueError('CPU limit must be between 10-100%')
        return v

class PredictRequest(BaseModel):
    inputs: dict
    
    @validator('inputs')
    def validate_inputs(cls, v):
        if not isinstance(v, dict) or not v:
            raise ValueError('Inputs must be a non-empty dictionary')
        return v

# Health check endpoint
@app.get("/")
async def read_root():
    return {
        "status": "AI TrainEasy MVP Backend - Beta Version", 
        "version": "1.0.0-beta",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0-beta"
    }

@app.get("/system-info")
async def system_info():
    """Get system information"""
    try:
        cpu_count = psutil.cpu_count(logical=True)
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        total_ram_gb = round(mem.total / (1024**3), 2)
        ram_percent = mem.percent

        # GPU detection
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
        except Exception as e:
            logger.warning(f"GPU detection failed: {e}")

        gpu_available = len(gpus) > 0
        gpu_count = len(gpus)
        gpu_names = [g["name"] for g in gpus]

        logger.info("System info accessed")
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
        logger.error(f"Failed to get system info: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system information")

@app.get("/projects")
async def list_projects():
    """List all projects"""
    projects_dir = "projects"
    try:
        if not os.path.exists(projects_dir):
            return {"success": True, "projects": []}
            
        files = os.listdir(projects_dir)
        projects = []
        for fname in files:
            if fname.endswith(".json"):
                path = os.path.join(projects_dir, fname)
                try:
                    with open(path) as f:
                        project_data = json.load(f)
                        projects.append(project_data)
                except Exception as e:
                    logger.warning(f"Failed to load project {fname}: {e}")
        
        logger.info(f"Projects listed: {len(projects)}")
        return {"success": True, "projects": projects}
    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to list projects")

@app.post("/projects/create")
async def create_project(data: ProjectCreateRequest):
    """Create a new project"""
    try:
        project = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "created_at": datetime.utcnow().isoformat(),
            "status": "initialized"
        }
        
        # Create project directory
        project_dir = os.path.join('projects', project['id'])
        os.makedirs(project_dir, exist_ok=True)
        
        # Write project metadata
        file_path = os.path.join('projects', f"{project['id']}.json")
        with open(file_path, 'w') as f:
            json.dump(project, f, indent=2)
        
        logger.info(f"Project created: {project['id']} - {data.name}")
        return {"success": True, "project": project}
    except Exception as e:
        logger.error(f"Failed to create project: {e}")
        raise HTTPException(status_code=500, detail="Failed to create project")

def validate_file_security(file: UploadFile):
    """Validate file for security"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Check file extension
    allowed_extensions = ['.csv', '.json']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only CSV and JSON files are allowed")
    
    # Check content type
    allowed_types = ['text/csv', 'application/json', 'text/plain', 'application/octet-stream']
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    return True

@app.post("/projects/{project_id}/data")
async def upload_dataset(project_id: str, file: UploadFile = File(...)):
    """Upload dataset file to a project"""
    try:
        # Validate project exists
        project_file = os.path.join('projects', f"{project_id}.json")
        if not os.path.exists(project_file):
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Validate file
        validate_file_security(file)
        
        project_dir = os.path.join('projects', project_id)
        data_dir = os.path.join(project_dir, 'data')
        os.makedirs(data_dir, exist_ok=True)

        # Create safe filename with timestamp
        timestamp = int(datetime.now().timestamp())
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(data_dir, safe_filename)
        
        contents = await file.read()
        
        # Basic content validation
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # File size limit (100MB)
        if len(contents) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 100MB)")
        
        # Validate file format
        try:
            file_extension = os.path.splitext(file.filename)[1].lower()
            if file_extension == '.json':
                json.loads(contents.decode('utf-8'))
            elif file_extension == '.csv':
                content_str = contents.decode('utf-8')
                if not content_str.strip():
                    raise HTTPException(status_code=400, detail="Empty file")
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise HTTPException(status_code=400, detail="Invalid file format")
        
        with open(file_path, 'wb') as f:
            f.write(contents)

        logger.info(f"Dataset uploaded: {project_id} - {file.filename} ({len(contents)} bytes)")
        return {"success": True, "filename": file.filename, "size": len(contents)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dataset upload failed: {project_id} - {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

@app.post("/projects/{project_id}/schema")
async def save_schema(project_id: str, request: Request):
    """Save schema configuration for a project"""
    try:
        # Validate project exists
        project_dir = os.path.join("projects", project_id)
        if not os.path.isdir(project_dir):
            raise HTTPException(status_code=404, detail="Project not found")
        
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

        logger.info(f"Schema saved: {project_id}")
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Schema save failed: {project_id} - {e}")
        raise HTTPException(status_code=500, detail="Failed to save schema")

@app.post("/projects/{project_id}/train")
async def train_project(project_id: str, body: TrainRequest):
    """Start training for a project"""
    try:
        # Validate project exists
        project_dir = os.path.join("projects", project_id)
        if not os.path.isdir(project_dir):
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Validate training requirements
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

        log_path = os.path.join(project_dir, "train.log")
        
        # Update project status
        project_file = os.path.join('projects', f"{project_id}.json")
        try:
            with open(project_file) as f:
                project_data = json.load(f)
            project_data['status'] = 'training'
            project_data['training_started_at'] = datetime.utcnow().isoformat()
            with open(project_file, 'w') as f:
                json.dump(project_data, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to update project status: {e}")
    
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
                    try:
                        with open(project_file) as f:
                            project_data = json.load(f)
                        project_data['status'] = 'completed' if proc.returncode == 0 else 'failed'
                        project_data['training_completed_at'] = datetime.utcnow().isoformat()
                        with open(project_file, 'w') as f:
                            json.dump(project_data, f, indent=2)
                    except Exception as e:
                        logger.error(f"Failed to update project completion status: {e}")
                    
                    # Cleanup PID file
                    if os.path.exists(pid_path):
                        os.remove(pid_path)
                        
            except Exception as e:
                logger.error(f"Training thread failed: {project_id} - {e}")
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
        logger.info(f"Training started: {project_id} (CPU: {cpu_limit}%)")
        return {"success": True, "message": "Training started successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training initialization failed: {project_id} - {e}")
        raise HTTPException(500, "Training initialization failed")

@app.get("/projects/{project_id}/logs", response_class=PlainTextResponse)
async def get_logs(project_id: str):
    """Get training logs for a project"""
    try:
        log_path = os.path.join("projects", project_id, "train.log")
        if not os.path.isfile(log_path):
            return PlainTextResponse("No training logs available yet.", status_code=200)
        
        with open(log_path, "r") as f:
            content = f.read()
        
        logger.info(f"Logs accessed: {project_id}")
        return content
        
    except Exception as e:
        logger.error(f"Failed to get logs: {project_id} - {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve logs")

@app.post("/projects/{project_id}/predict")
async def predict(project_id: str, body: PredictRequest = Body(...)):
    """Make predictions using trained model"""
    try:
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

        logger.info(f"Prediction made: {project_id} - {len(body.inputs)} features")
        return {"success": True, "predictions": preds, "input": body.inputs}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction failed: {project_id} - {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")

@app.get("/projects/{project_id}/training-log")
async def get_training_log(project_id: str):
    """Get training log JSON for a project"""
    try:
        log_path = f"projects/{project_id}/training_log.json"
        if os.path.exists(log_path):
            with open(log_path) as f:
                data = json.load(f)
            logger.info(f"Training log accessed: {project_id}")
            return data
        else:
            return JSONResponse(status_code=404, content={"error": "No training log found"})
            
    except Exception as e:
        logger.error(f"Failed to get training log: {project_id} - {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve training log")

# Hugging Face Integration
@app.post("/download-hf-model")
async def download_hf_model(model_id: str = Form(...), project_id: str = Form(...)):
    """Download a model from Hugging Face Hub"""
    try:
        # Validate project exists
        project_dir = os.path.join("projects", project_id)
        if not os.path.isdir(project_dir):
            raise HTTPException(status_code=404, detail="Project not found")
        
        token = os.environ.get("HUGGINGFACE_HUB_TOKEN")
        if not token:
            logger.warning("Hugging Face token not configured")
            return {"success": False, "error": "Hugging Face token not configured"}
        
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
        
        logger.info(f"HF model downloaded: {project_id} - {model_id}")
        return {"success": True, "message": f"Model '{model_id}' downloaded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HF model download failed: {project_id} - {model_id} - {e}")
        return {"success": False, "error": str(e)}

@app.get("/search-hf-models")
async def search_hf_models(q: str):
    """Search Hugging Face Hub for models"""
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
        
        logger.info(f"HF models searched: {q} - {len(result)} results")
        return result
        
    except requests.RequestException as e:
        logger.error(f"HF search failed: {e}")
        raise HTTPException(status_code=503, detail="Hugging Face search service unavailable")
    except Exception as e:
        logger.error(f"HF search error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)