import psutil
import torch
from fastapi import FastAPI, Request, File, UploadFile, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os, json, uuid
from datetime import datetime
from pydantic import BaseModel
import threading
import joblib
import pandas as pd
import subprocess
from fastapi.responses import PlainTextResponse
import signal

app = FastAPI()

@app.get("/system-info")
async def system_info():
    cpu_count = psutil.cpu_count(logical=True)
    cpu_percent = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    total_ram_gb = round(mem.total / (1024**3), 2)
    ram_percent = mem.percent
    gpu_available = torch.cuda.is_available()
    gpu_count = torch.cuda.device_count() if gpu_available else 0
    gpu_names = [torch.cuda.get_device_name(i) for i in range(gpu_count)] if gpu_available else []
    return {
        "cpu_count": cpu_count,
        "cpu_percent": cpu_percent,
        "total_ram_gb": total_ram_gb,
        "ram_percent": ram_percent,
        "gpu_available": gpu_available,
        "gpu_count": gpu_count,
        "gpu_names": gpu_names
    }

@app.get("/projects/{project_id}/training-log")
async def get_training_log(project_id: str):
    log_path = f"projects/{project_id}/training_log.json"
    if os.path.exists(log_path):
        with open(log_path) as f:
            return json.load(f)
    else:
        return JSONResponse(status_code=404, content={"error": "No training log found"})

# 1) CORS must be registered before you define @app.get/@app.post
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # or ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure projects dir exists
os.makedirs('projects', exist_ok=True)

class ProjectCreateRequest(BaseModel):
    name: str

@app.get("/")
async def read_root():
    return {"status": "MVP backend running"}

@app.get("/projects")
async def list_projects():
    projects_dir = "projects"
    try:
        files = os.listdir(projects_dir)
        projects = []
        for fname in files:
            if fname.endswith(".json"):
                path = os.path.join(projects_dir, fname)
                with open(path) as f:
                    projects.append(json.load(f))
        return {"success": True, "projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/create")
async def create_project(data: ProjectCreateRequest):
    project = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "created_at": datetime.utcnow().isoformat(),
        "status": "initialized"
    }
    # Write to disk
    file_path = os.path.join('projects', f"{project['id']}.json")
    with open(file_path, 'w') as f:
        json.dump(project, f, indent=2)
    return {"success": True, "project": project}

@app.post("/projects/{project_id}/data")
async def upload_dataset(project_id: str, file: UploadFile = File(...)):
    project_dir = os.path.join('projects', project_id)
    if not os.path.isdir(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    data_dir = os.path.join(project_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)

    file_path = os.path.join(data_dir, file.filename)
    contents = await file.read()
    with open(file_path, 'wb') as f:
        f.write(contents)

    return {"success": True, "filename": file.filename}


@app.post("/projects/{project_id}/schema")
async def save_schema(project_id: str, request: Request):
    project_dir = os.path.join("projects", project_id)
    if not os.path.isdir(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    schema = await request.json()
    with open(os.path.join(project_dir, "schema.json"), "w") as f:
        json.dump(schema, f, indent=2)

    return {"success": True}

class TrainRequest(BaseModel):
    cpu_percent: int = 100  # default to 100%

@app.post("/projects/{project_id}/train")
async def train_project(project_id: str, body: TrainRequest):
    project_dir = os.path.join("projects", project_id)
    log_path = os.path.join(project_dir, "train.log")
    pid_path = os.path.join(project_dir, "train.pid")
    os.makedirs(project_dir, exist_ok=True)

    cpu_limit = body.cpu_percent  # 0–100

    import shutil

    def run_training():
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
            proc.wait()
            os.remove(pid_path)

    threading.Thread(target=run_training).start()
    return {"success": True}

@app.post("/projects/{project_id}/train/pause")
async def pause_training(project_id: str):
    pid_path = os.path.join("projects", project_id, "train.pid")
    if not os.path.isfile(pid_path):
        raise HTTPException(404, "No running training job")
    pid = int(open(pid_path).read())
    os.kill(pid, signal.SIGSTOP)
    return {"success": True, "status": "paused"}

@app.post("/projects/{project_id}/train/resume")
async def resume_training(project_id: str):
    pid_path = os.path.join("projects", project_id, "train.pid")
    if not os.path.isfile(pid_path):
        raise HTTPException(404, "No paused training job")
    pid = int(open(pid_path).read())
    os.kill(pid, signal.SIGCONT)
    return {"success": True, "status": "running"}

@app.get("/projects/{project_id}/logs", response_class=PlainTextResponse)
async def get_logs(project_id: str):
    log_path = os.path.join("projects", project_id, "train.log")
    if not os.path.isfile(log_path):
        return PlainTextResponse("No logs yet.", status_code=200)
    with open(log_path, "r") as f:
        content = f.read()
    return content

class PredictRequest(BaseModel):
    inputs: dict  # e.g. {"col1": 5, "col2": 3}

@app.post("/projects/{project_id}/predict")
async def predict(project_id: str, body: PredictRequest = Body(...)):
    # Locate project model
    model_path = os.path.join("projects", project_id, "model.pkl")
    if not os.path.isfile(model_path):
        raise HTTPException(status_code=404, detail="Model not found")

    # Load model
    model = joblib.load(model_path)

    # Prepare input dataframe
    df = pd.DataFrame([body.inputs])

    # Run prediction
    preds = model.predict(df).tolist()

    return {"success": True, "predictions": preds}