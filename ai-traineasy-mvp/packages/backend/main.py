from fastapi import FastAPI, Request, File, UploadFile, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os, json, uuid
from datetime import datetime
from pydantic import BaseModel
import threading
import joblib
import pandas as pd
import subprocess
from fastapi import Depends, Header
from fastapi.responses import PlainTextResponse
import signal
import re # For project_id validation and filename sanitization
import os
import sys # Added for sys.executable
from concurrent.futures import ProcessPoolExecutor, Future # Added ProcessPoolExecutor and Future

# Placeholder for API Key - IN A REAL APP, USE ENVIRONMENT VARIABLES
STATIC_API_KEY = os.getenv("API_KEY", "dev_secret_key")

async def verify_api_key(x_api_key: str = Header(None)): # Made Header optional to check presence
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key missing")
    if x_api_key != STATIC_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

# Initialize ProcessPoolExecutor and task registry
executor = ProcessPoolExecutor(max_workers=2)
training_tasks: dict[str, Future] = {}

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

# Standalone function for running the training job
def run_training_job(project_id: str, cpu_limit: int):
    """
    Runs the training script for a given project_id with a specified CPU limit.
    This function is intended to be run in a separate process.
    """
    project_dir_path = os.path.join("projects", project_id)
    log_path = os.path.join(project_dir_path, "train.log")
    # PID file is less relevant when managed by ProcessPoolExecutor,
    # but train_model.py might still use it or it might be useful for external monitoring.
    # For now, we'll keep it similar to original logic.
    pid_path = os.path.join(project_dir_path, "train.pid")

    # Ensure project directory exists (it should, but good for robustness)
    os.makedirs(project_dir_path, exist_ok=True)

    try:
        with open(log_path, "w") as log_file:
            cmd = []
            python_executable = sys.executable # Use the same python interpreter
            train_script_path = os.path.join(os.path.dirname(__file__), "train_model.py")

            base_cmd = [python_executable, train_script_path, project_id]

            if 0 < cpu_limit < 100:
                # Check if cpulimit is available (basic check)
                if subprocess.call(["which", "cpulimit"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
                    cmd = ["cpulimit", "-l", str(cpu_limit), "--"] + base_cmd
                else:
                    log_file.write("Warning: cpulimit utility not found. Running without CPU limit.\n")
                    cmd = base_cmd
            else:
                cmd = base_cmd

            # Using Popen directly as before. The parent process (this function) will wait.
            proc = subprocess.Popen(
                cmd,
                # cwd=os.path.dirname(__file__), # train_model.py should handle its own paths relative to itself or CWD
                stdout=log_file,
                stderr=log_file
            )

            # Write PID of the actual training process (python train_model.py or cpulimit)
            with open(pid_path, "w") as f_pid:
                f_pid.write(str(proc.pid))

            proc.wait() # Wait for the subprocess to complete

            if proc.returncode != 0:
                log_file.write(f"\nTraining process failed with return code {proc.returncode}\n")
                # Re-raise an exception or return a failure indicator if needed by the Future.
                # For now, just logging. The success/failure is primarily via log content.
                return False # Indicate failure
    except Exception as e:
        # Log any exception that occurs during setup or execution within this job
        error_log_path = os.path.join(project_dir_path, "train_error.log")
        with open(error_log_path, "a") as ef: # Append to error log
            ef.write(f"Error in run_training_job for {project_id}: {str(e)}\n")
        # This exception will be caught by ProcessPoolExecutor and can be retrieved via future.exception()
        raise
    finally:
        # Clean up PID file
        if os.path.exists(pid_path):
            os.remove(pid_path)

    return True # Indicate success


class TrainRequest(BaseModel):
    cpu_percent: int = 100  # default to 100%

@app.post("/projects/{project_id}/train")
async def train_project(project_id: str, body: TrainRequest):
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    project_dir_path = os.path.join("projects", project_id)
    if not os.path.isdir(project_dir_path):
        # This check ensures that data upload and schema save likely happened.
        raise HTTPException(status_code=404, detail=f"Project directory for {project_id} not found. Ensure project exists and data/schema are uploaded.")

    # Check if task is already running or queued for this project_id
    if project_id in training_tasks:
        future = training_tasks[project_id]
        if not future.done():
            status = "running" if future.running() else "queued"
            raise HTTPException(status_code=409, detail=f"Training is already {status} for project {project_id}.")
        # If done, allow re-submission. Consider clearing old task if it failed.
        # For simplicity, we overwrite the old future if resubmitting after completion.

    # Ensure the directory for logs/pid exists (run_training_job also does this, but good for early check)
    os.makedirs(project_dir_path, exist_ok=True)

    try:
        future = executor.submit(run_training_job, project_id, body.cpu_percent)
        training_tasks[project_id] = future
    except Exception as e:
        # Handle rare errors during submission itself
        raise HTTPException(status_code=500, detail=f"Failed to submit training job to executor: {str(e)}")

    return {"success": True, "status": "queued", "project_id": project_id}

# Pause and Resume endpoints are removed as ProcessPoolExecutor doesn't directly support SIGSTOP/SIGCONT on tasks.
# Re-implementing similar pause/resume would require a more complex task management system.

@app.get("/projects/{project_id}/logs", response_class=PlainTextResponse)
async def get_logs(project_id: str):
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    log_path = os.path.join("projects", project_id, "train.log")
    if not os.path.isfile(log_path):
        return PlainTextResponse("No logs yet.", status_code=200)

@app.get("/projects/{project_id}/train/status")
async def get_train_status(project_id: str):
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    future = training_tasks.get(project_id)

    if not future:
        # Could also check if project_id itself is valid first
        project_dir_path = os.path.join("projects", project_id)
        if not os.path.isdir(project_dir_path):
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
        return {"project_id": project_id, "status": "not_started"}

    if future.done():
        try:
            result = future.result() # This will re-raise exception if job failed
            return {"project_id": project_id, "status": "finished", "result": result}
        except Exception as e:
            # Log the exception if desired, or just return its string representation
            # The actual error details should be in train_error.log or train.log
            return {"project_id": project_id, "status": "failed", "error": str(e), "detail": "Check train_error.log or train.log for details."}
    elif future.running():
        return {"project_id": project_id, "status": "running"}
    else:
        # Not done and not running means it's queued (pending in the executor's queue)
        return {"project_id": project_id, "status": "queued"}
    with open(log_path, "r") as f:
        content = f.read()
    return content

class PredictRequest(BaseModel):
    inputs: dict  # e.g. {"col1": 5, "col2": 3}

@app.post("/projects/{project_id}/predict")
async def predict(project_id: str, body: PredictRequest = Body(...)):
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
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