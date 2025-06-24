from fastapi import FastAPI, Request, File, UploadFile, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os, json, uuid
from datetime import datetime
from pydantic import BaseModel
import threading
import joblib
import pandas as pd
import subprocess
from fastapi import Depends, Header # Added Depends and Header
from fastapi.responses import PlainTextResponse
import signal
import re # For project_id validation and filename sanitization
import os # For os.getenv (though will use placeholder for now)

# Placeholder for API Key - IN A REAL APP, USE ENVIRONMENT VARIABLES
STATIC_API_KEY = os.getenv("API_KEY", "dev_secret_key") # Default to dev_secret_key if not set

async def verify_api_key(x_api_key: str = Header(None)): # Made Header optional to check presence
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key missing")
    if x_api_key != STATIC_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

app = FastAPI(dependencies=[Depends(verify_api_key)])

# Constants for validation
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
ALLOWED_EXTENSIONS_MIMETYPES = {
    ".csv": "text/csv",
    ".json": "application/json"
}
PROJECT_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,36}$") # Allowing UUIDs too

# 1) CORS must be registered before you define @app.get/@app.post
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    project_dir = os.path.join('projects', project_id)
    if not os.path.isdir(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    # File extension and MIME type validation
    file_ext = os.path.splitext(file.filename)[1].lower()
    expected_mime_type = ALLOWED_EXTENSIONS_MIMETYPES.get(file_ext)

    if not expected_mime_type:
        raise HTTPException(status_code=400, detail=f"File extension not allowed. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS_MIMETYPES.keys())}")

    # FastAPI/Starlette usually sets content_type. If it's missing or doesn't match, reject.
    # For robust checking, python-magic could be used, but for now, rely on browser/client-sent Content-Type.
    if file.content_type != expected_mime_type:
        # A more lenient check might be `if not file.content_type or not file.content_type.startswith(expected_mime_type.split('/')[0]):`
        # But for stricter validation:
        raise HTTPException(status_code=400, detail=f"Invalid file content type. Expected {expected_mime_type} for {file_ext} files, got {file.content_type}.")

    # Filename cleanup (sanitization)
    # Replace characters not in a-zA-Z0-9_.- with _
    # Also, ensure the filename is not excessively long (e.g., > 200 chars) after sanitization.
    temp_safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)
    # Prevent names that are only dots or underscores, or excessively long
    if not temp_safe_name or temp_safe_name.strip("._") == "" or len(temp_safe_name) > 200:
         raise HTTPException(status_code=400, detail="Invalid or unsafe filename after sanitization.")
    safe_filename = temp_safe_name

    # Ensure filename still has an extension part after sanitization, if it had one originally
    # This is a basic check; more complex logic might be needed if `.` is aggressively replaced.
    original_name_part, original_ext_part = os.path.splitext(file.filename)
    sanitized_name_part, sanitized_ext_part = os.path.splitext(safe_filename)

    if original_ext_part and not sanitized_ext_part: # If original had an ext but sanitized doesn't
        # This case might happen if the extension itself had invalid chars.
        # For simplicity, we are expecting the sanitized name to retain a valid extension.
        # Or, one could re-append the original valid extension if the sanitized name lost it.
        # e.g. safe_filename = sanitized_name_part + file_ext (if file_ext is known good)
         raise HTTPException(status_code=400, detail="Filename sanitization resulted in missing extension.")


    data_dir = os.path.join(project_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)
    file_path = os.path.join(data_dir, safe_filename)

    # File size validation (read after initial checks to avoid reading large, invalid files)
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    with open(file_path, 'wb') as f:
        f.write(contents)

    return {"success": True, "filename": safe_filename}


@app.post("/projects/{project_id}/schema")
async def save_schema(project_id: str, request: Request):
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

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

    def run_training():
        with open(log_path, "w") as log_file:
            cmd = []
            # If a cpulimit utility is installed, wrap the python call
            if 0 < cpu_limit < 100:
                cmd = [
                  "cpulimit", "-l", str(cpu_limit),
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