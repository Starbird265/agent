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
import time # For history timestamps
import traceback # For logging exception tracebacks
# uuid was already imported, will use existing import for job_id

# Placeholder for API Key - IN A REAL APP, USE ENVIRONMENT VARIABLES
STATIC_API_KEY = os.getenv("API_KEY", "dev_secret_key")

# --- Job History Function (Revised as per new instructions) ---
def append_history(project_id: str, entry: dict):
    """
    Appends an event entry to the project's training history JSON file.
    Each call adds a new entry.
    """
    history_dir = os.path.join("projects", project_id)
    os.makedirs(history_dir, exist_ok=True)  # Ensure project directory exists
    history_path = os.path.join(history_dir, "train_history.json")

    history = []
    if os.path.exists(history_path):
        try:
            with open(history_path, "r") as f:
                history = json.load(f)
            if not isinstance(history, list): # Ensure history is a list
                print(f"Warning: train_history.json for project {project_id} was not a list. Resetting.")
                history = []
        except json.JSONDecodeError:
            print(f"Warning: train_history.json for project {project_id} is corrupted. Starting fresh history.")
            history = []
        except Exception as e:
            print(f"Error reading train_history.json for project {project_id}: {e}. Starting fresh history.")
            history = []

    history.append(entry) # Always append the new event

    try:
        with open(history_path, "w") as f:
            json.dump(history, f, indent=2)
    except IOError as e:
        print(f"Error writing to train_history.json for project {project_id}: {e}")

# --- End Job History Function ---

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

# Standalone function for running the training job (Revised: no job_id parameter for history)
def run_training_job(project_id: str, cpu_limit: int):
    """
    Runs the training script for a given project_id with a specified CPU limit.
    This function is intended to be run in a separate process.
    It appends event entries to the job history.
    """
    project_dir_path = os.path.join("projects", project_id)
    log_path = os.path.join(project_dir_path, "train.log")
    pid_path = os.path.join(project_dir_path, "train.pid") # For external monitoring or cancellation (if PID is reliable)

    os.makedirs(project_dir_path, exist_ok=True)

    append_history(project_id, {"event": "running", "timestamp": time.time()})

    try:
        with open(log_path, "w") as log_file:
            cmd = []
            python_executable = sys.executable
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
                append_history(project_id, {
                    "event": "failed", # Specific error details are in train.log / train_error.log
                    "timestamp": time.time()
                })
                return False # Indicate failure
            else:
                append_history(project_id, {"event": "finished", "timestamp": time.time()})

    except Exception as e:
        append_history(project_id, {
            "event": "failed", # Specific error details are in train.log / train_error.log
            "timestamp": time.time()
        })
        # Log any exception that occurs during setup or execution within this job to separate file
        error_log_path = os.path.join(project_dir_path, "train_error.log") # This log is more for system debugging
        with open(error_log_path, "a") as ef:
            # job_id is not available here anymore, so logging project_id
            ef.write(f"Training for project {project_id} failed: {str(e)}\nTraceback: {traceback.format_exc()}\n")
        raise # Re-raise for ProcessPoolExecutor to catch
    finally:
        # Clean up PID file
        if os.path.exists(pid_path):
            os.remove(pid_path)

    return True # Indicate success by subprocess completing with 0 and no exceptions


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
        # job_id is no longer passed to run_training_job for history purposes with the new event model
        future = executor.submit(run_training_job, project_id, body.cpu_percent)
        training_tasks[project_id] = future

        append_history(project_id, {
            "event": "queued",
            "timestamp": time.time()
            # If details like cpu_percent are needed in history, add a "details": {} field.
            # For now, matching the simpler spec: {"event": "status", "timestamp": ...}
        })
    except Exception as e:
        # Handle rare errors during submission itself
        append_history(project_id, {
            "event": "submission_failed", # This event implies an error. Specifics in server logs.
            "timestamp": time.time()
        })
        raise HTTPException(status_code=500, detail=f"Failed to submit training job to executor: {str(e)}")

    # job_id is not critical for the client if history is just a log of events per project.
    # If a unique identifier for this specific submission attempt is still needed by client,
    # it could be generated here and returned, but not necessarily used for history correlation.
    return {"success": True, "status": "queued", "project_id": project_id}

@app.get("/projects/{project_id}/train/history")
async def get_training_history(project_id: str):
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    history_path = os.path.join("projects", project_id, "train_history.json")

    if not os.path.exists(history_path):
        # Check if project itself exists to differentiate no history vs no project
        project_metadata_path = os.path.join("projects", project_id + ".json")
        if not os.path.exists(project_metadata_path):
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
        return [] # Project exists, but no history yet

    try:
        with open(history_path, "r") as f:
            history_data = json.load(f)
        return history_data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error reading training history: history file is corrupted.")
    except IOError:
        raise HTTPException(status_code=500, detail="Error reading training history: could not open history file.")

@app.post("/projects/{project_id}/train/cancel")
async def cancel_training(project_id: str):
    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    future = training_tasks.get(project_id)

    if not future:
        # Optionally log this attempt to history if project_id is valid but no task
        # append_history(project_id, {"event": "cancel_attempt_no_task", "timestamp": time.time()})
        raise HTTPException(status_code=404, detail="No training task found for this project to cancel (not in active task list).")

    if future.done():
        append_history(project_id, {
            "event": "cancel_attempt_on_completed_task",
            "timestamp": time.time()
            # No "details" field to match the simple event model
        })
        raise HTTPException(status_code=400, detail="Training task has already completed. Cannot cancel.")

    canceled_by_future = future.cancel()

    pid_terminated_attempt = False
    pid_path = os.path.join("projects", project_id, "train.pid")

    if os.path.exists(pid_path):
        try:
            with open(pid_path, "r") as f_pid:
                pid_str = f_pid.read().strip()
                if pid_str:
                    pid = int(pid_str)
                    print(f"Attempting to send SIGTERM to process {pid} for project {project_id} due to cancellation request.")
                    os.kill(pid, signal.SIGTERM)
                    pid_terminated_attempt = True
        except ValueError:
            print(f"Invalid PID found in {pid_path} for project {project_id} during cancellation.")
        except ProcessLookupError:
            print(f"Process with PID from {pid_path} not found for project {project_id} during cancellation (already terminated?).")
            pid_terminated_attempt = True
        except Exception as e:
            print(f"Error terminating process for project {project_id} during cancellation: {e}")
    else:
        if not canceled_by_future:
             print(f"Warning: Training for project {project_id} was running (future.cancel() returned False) but no PID file found.")

    append_history(project_id, {
        "event": "cancellation_actioned",
        "timestamp": time.time(),
        "details": { # Keeping details here as it's about the cancellation action itself
            "future_cancel_returned": canceled_by_future,
            "pid_kill_attempted": pid_terminated_attempt
        }
    })

    if canceled_by_future or pid_terminated_attempt:
        if project_id in training_tasks:
            del training_tasks[project_id]
            print(f"Removed task for project {project_id} from active list due to cancellation processing.")

    return {
        "success": True,
        "project_id": project_id,
        "future_cancel_call_returned": canceled_by_future,
        "pid_kill_attempted": pid_terminated_attempt,
        "message": "Cancellation request processed. If job was running, termination signal sent. Check status and logs."
    }

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