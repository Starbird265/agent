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
# uuid was already imported
import secrets # For generating secure random codes
from passlib.context import CryptContext # For password hashing

# Placeholder for API Key - IN A REAL APP, USE ENVIRONMENT VARIABLES
STATIC_API_KEY = os.getenv("API_KEY", "dev_secret_key")

# --- Password Hashing Setup ---
# NOTE: `passlib` and `bcrypt` would need to be added to requirements.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
# --- End Password Hashing Setup ---

# --- Data Storage Paths ---
DATA_DIR = "data"
WAITING_LIST_FILE = os.path.join(DATA_DIR, "waiting_list.json")
INVITES_FILE = os.path.join(DATA_DIR, "invites.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json") # For later steps

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def read_json_file(file_path: str, default_value=None):
    if default_value is None:
        default_value = []
    if not os.path.exists(file_path):
        return default_value
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading {file_path}: {e}. Returning default value.")
        return default_value

def write_json_file(file_path: str, data):
    try:
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except IOError as e:
        print(f"Error writing to {file_path}: {e}")
        return False
# --- End Data Storage Helpers ---

# --- Export Control Helper ---
def can_export(user_data: dict) -> bool:
    """
    Checks if the user can export a model based on their subscription type and export credits.
    Modifies user_data in-place by decrementing credits if applicable.
    Returns True if export is allowed, False otherwise.
    """
    # Ensure keys exist with defaults, especially for older user records if schema changes
    subscription_type = user_data.get("subscription_type", "none")
    export_credits = user_data.get("export_credits", 0)

    if subscription_type == "unlimited_pro_annual": # Ensure this string matches plan activation
        return True

    if export_credits > 0:
        user_data["export_credits"] = export_credits - 1
        return True

    return False
# --- End Export Control Helper ---

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

# Ensure projects dir exists (for project-specific data)
os.makedirs('projects', exist_ok=True)

# --- Pydantic Models for Waiting List & Auth ---
class WaitingListSignupRequest(BaseModel):
    email: str # Could add Pydantic EmailStr for validation

class UserSignupRequest(BaseModel):
    email: str # Could add Pydantic EmailStr
    password: str
    invite_code: str

class UserLoginRequest(BaseModel):
    email: str # Could add Pydantic EmailStr
    password: str

class UserResponse(BaseModel):
    id: str # UUID
    email: str # Could use EmailStr
    created_at: str # datetime iso format
    stripe_customer_id: str | None = None
    subscription_status: str
    has_beta_access: bool
    export_credits: int
    subscription_type: str
    beta_credit_available: bool

    class Config:
        from_attributes = True # Changed from orm_mode for Pydantic v2

# --- Auth Endpoints ---
@app.post("/auth/signup", status_code=201)
# Consider changing response_model to UserResponse if returning full user object
async def user_signup(payload: UserSignupRequest):
    invites = read_json_file(INVITES_FILE, [])
    users = read_json_file(USERS_FILE, [])

    # 1. Validate Invite Code
    invite_entry = None
    invite_idx = -1
    for i, inv in enumerate(invites):
        if inv.get("code") == payload.invite_code:
            invite_entry = inv
            invite_idx = i
            break

    if not invite_entry:
        raise HTTPException(status_code=400, detail="Invalid invite code.")

    if invite_entry.get("redeemed"):
        raise HTTPException(status_code=400, detail="Invite code has already been redeemed.")

    # Optional: Check if payload.email matches invite_entry.get("email")
    # if invite_entry.get("email") and payload.email != invite_entry.get("email"):
    #     raise HTTPException(status_code=400, detail="Invite code not valid for this email address.")

    # 2. Check if email already exists in users
    for user in users:
        if user.get("email") == payload.email:
            raise HTTPException(status_code=400, detail="Email already registered.")

    # 3. Create User
    new_user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(payload.password)

    new_user = {
        "id": new_user_id,
        "email": payload.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "stripe_customer_id": None, # To be filled by Stripe integration
        "subscription_status": "beta_access_granted", # More descriptive status
        "has_beta_access": True,
        "export_credits": 0,
        "subscription_type": "beta_only", # Initial plan type
        "beta_credit_available": True
    }
    users.append(new_user)

    # 4. Mark invite code as redeemed
    invites[invite_idx]["redeemed"] = True
    invites[invite_idx]["redeemed_at"] = datetime.utcnow().isoformat() + "Z"
    invites[invite_idx]["redeemed_by_user_id"] = new_user_id

    # 5. Write changes to files
    if not write_json_file(USERS_FILE, users):
        # Attempt to revert invite redemption if user save fails? Complex for file-based.
        # For now, prioritize user not being created if save fails.
        raise HTTPException(status_code=500, detail="Failed to create user account (user data save error).")

    if not write_json_file(INVITES_FILE, invites):
        # User was saved, but invite not marked. This is an inconsistent state.
        # Manual cleanup or more robust transaction logic would be needed for DBs.
        # For file system, this is a risk. Log it.
        print(f"CRITICAL: User {new_user_id} created, but failed to mark invite {payload.invite_code} as redeemed.")
        # Not failing the request here as user is created, but admin should be alerted.
        # Alternatively, could try to delete the created user if this step fails.

    # JWT will be returned here in a later phase
    # For now, signup returns a simple message. If UserResponse is desired, change here.
    return {"message": "User created successfully.", "user_id": new_user_id, "email": payload.email}

@app.post("/auth/login", response_model=UserResponse) # Set response_model
async def user_login(payload: UserLoginRequest):
    users = read_json_file(USERS_FILE, [])

    user_entry = None
    for user in users:
        if user.get("email") == payload.email:
            user_entry = user
            break

    if not user_entry:
        raise HTTPException(status_code=401, detail="Incorrect email or password.") # Generic message for security

    if not verify_password(payload.password, user_entry.get("hashed_password")):
        raise HTTPException(status_code=401, detail="Incorrect email or password.") # Generic message

    # JWT will be returned here in a later phase
    # Return the user entry, Pydantic will serialize it according to UserResponse
    return user_entry

# --- Project Model Export Endpoint (Conceptual User Auth) ---
@app.post("/projects/{project_id}/export", status_code=200)
async def export_project_model(project_id: str): # Simulate getting user_id, replace with Depends(get_current_user) later
    # This is a placeholder for user_id until JWT auth is implemented.
    # In a real app, user_id would come from an auth dependency.
    # For testing this endpoint without full auth, you might temporarily pass it as a query param
    # or use a fixed ID known to exist in your users.json.

    # --- Placeholder User ID ---
    # To make this testable without UI for user selection yet, let's assume a user ID.
    # Find the first user in users.json to act as the exporter.
    # This is highly insecure and temporary.
    users_for_placeholder = read_json_file(USERS_FILE, [])
    if not users_for_placeholder:
        raise HTTPException(status_code=500, detail="No users available to perform export. (Placeholder error)")

    # For this conceptual endpoint, let's just pick the first user for simplicity of testing flow.
    # In a real scenario, user_id would be from a JWT token.
    user_id_placeholder = users_for_placeholder[0].get("id")
    if not user_id_placeholder:
        raise HTTPException(status_code=500, detail="First user has no ID. (Placeholder error)")
    # --- End Placeholder User ID ---

    if not PROJECT_ID_PATTERN.match(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    # 1. Fetch user data
    users = read_json_file(USERS_FILE, [])
    user_data = None
    user_idx = -1
    for i, u in enumerate(users):
        if u.get("id") == user_id_placeholder: # Using placeholder
            user_data = u
            user_idx = i
            break

    if not user_data:
        raise HTTPException(status_code=404, detail=f"User {user_id_placeholder} not found.")

    # 2. Check if user can export (this modifies user_data if credits are used)
    if can_export(user_data):
        # 3. Save updated user data (if credits were modified)
        # can_export modifies user_data in-place, so we always write it back if export is allowed
        # and credits might have changed.
        if not write_json_file(USERS_FILE, users): # users list contains the modified user_data
            # This is a critical failure: export allowed, credits notionally deducted, but state not saved.
            # Ideally, this would be a transaction. For file system, log and maybe alert.
            print(f"CRITICAL: User {user_id_placeholder} data (export credits) failed to save after export approval.")
            raise HTTPException(status_code=500, detail="Export approved but failed to update user credits. Please contact support.")

        # 4. Simulate model export
        # TODO: Actual model export logic would go here (e.g., find model.pkl, zip, return as FileResponse)
        print(f"Simulating model export for project {project_id} for user {user_id_placeholder}...")

        return {
            "success": True,
            "message": f"Model export for project {project_id} initiated successfully.",
            "user_id": user_id_placeholder,
            "remaining_credits": user_data.get("export_credits", 0), # Show updated credits
            "subscription_type": user_data.get("subscription_type", "none")
        }
    else:
        # 5. Deny export
        raise HTTPException(status_code=402, detail="Payment Required: Insufficient export credits or no active unlimited plan.")


# --- Conceptual Export Control Logic (Not an active endpoint yet) ---
# def conceptual_allow_and_process_export(user_id: str, project_id: str) -> bool:
#     """
#     Conceptual logic for checking if a user can export a model and updating their state.
#     This is not an active endpoint. For planning purposes only.
#     """
#     users = read_json_file(USERS_FILE, [])
#     user_to_update = None
#     user_idx = -1
#     for i, u in enumerate(users):
#         if u.get("id") == user_id:
#             user_to_update = u
#             user_idx = i
#             break
#
#     if not user_to_update:
#         print(f"Export denied: User {user_id} not found.")
#         return False # User not found
#
#     subscription_type = user_to_update.get("subscription_type")
#     export_credits = user_to_update.get("export_credits", 0)
#
#     can_export = False
#     needs_credit_update = False
#
#     if subscription_type == "unlimited_pro_annual":
#         can_export = True
#         print(f"Export allowed for user {user_id} (Unlimited Pro Annual).")
#     elif export_credits > 0:
#         can_export = True
#         user_to_update["export_credits"] = export_credits - 1
#         needs_credit_update = True
#         print(f"Export allowed for user {user_id} (using 1 credit). Credits remaining: {user_to_update['export_credits']}.")
#     else:
#         print(f"Export denied for user {user_id}. No export credits or unlimited plan.")
#         # Here, one might also check if they have `has_beta_access` and `beta_credit_available`
#         # and are attempting to make their *very first* export, to guide them to a purchase
#         # that could use the beta credit. But the export action itself depends on having credits first.
#         return False
#
#     if can_export:
#         # --- Placeholder for actual export action ---
#         print(f"Performing export for user {user_id}, project {project_id}...")
#         # export_successful = do_the_actual_export(project_id)
#         export_successful = True # Assume success for conceptual logic
#         # --- End Placeholder ---
#
#         if export_successful and needs_credit_update:
#             users[user_idx] = user_to_update
#             if not write_json_file(USERS_FILE, users):
#                 print(f"CRITICAL: Export for user {user_id} occurred, but failed to save updated export_credits.")
#                 # This is an inconsistent state. Ideally, rollback export or ensure save.
#                 return False # Indicate overall failure due to state save issue
#         elif not export_successful and needs_credit_update:
#             # Export failed, so revert credit change (though it was only in memory)
#             print(f"Export action failed for user {user_id}, credits not deducted.")
#             return False
#
#         return export_successful # True if export occurred (and credit update if needed was successful)
#
#     return False # Should not be reached if logic is correct
# --- End Conceptual Export Control Logic ---
#
# --- Waiting List Endpoints ---
@app.post("/waiting-list/signup", status_code=201)
async def waiting_list_signup(payload: WaitingListSignupRequest):
    """Adds an email to the waiting list."""
    waiting_list = read_json_file(WAITING_LIST_FILE, [])

    # Check if email already exists
    for entry in waiting_list:
        if entry.get("email") == payload.email:
            # Consider if this should be an error or just a silent success / different status code
            return {"message": "Email already on the waiting list.", "email": payload.email}

    new_entry = {
        "email": payload.email,
        "requested_at": datetime.utcnow().isoformat() + "Z", # ISO 8601 format with Z for UTC
        "invited": False,
        "invite_code_issued": None
    }
    waiting_list.append(new_entry)

    if write_json_file(WAITING_LIST_FILE, waiting_list):
        return {"message": "Successfully added to the waiting list.", "email": payload.email}
    else:
        raise HTTPException(status_code=500, detail="Failed to update waiting list. Please try again later.")

# --- Admin Helper Functions for Invites (Not exposed as HTTP endpoints directly) ---
def generate_invite_code(length: int = 8) -> str:
    """Generates a cryptographically secure random string for invite codes."""
    return secrets.token_urlsafe(length)[:length].upper().replace("_", "X").replace("-","Y") # Make it more memorable

def issue_invite_code_for_email(email_to_invite: str) -> dict | None:
    """
    Issues an invite code for a given email if they are on the waiting list and not already invited.
    Updates waiting_list.json and invites.json.
    Returns the invite details or None if an error occurred or user not eligible.
    """
    waiting_list = read_json_file(WAITING_LIST_FILE, [])
    invites = read_json_file(INVITES_FILE, [])

    user_on_waiting_list = None
    user_wl_index = -1

    for i, entry in enumerate(waiting_list):
        if entry.get("email") == email_to_invite:
            user_on_waiting_list = entry
            user_wl_index = i
            break

    if not user_on_waiting_list:
        print(f"Admin: Email {email_to_invite} not found on the waiting list.")
        return None # User not found

    if user_on_waiting_list.get("invited") and user_on_waiting_list.get("invite_code_issued"):
        print(f"Admin: Email {email_to_invite} has already been issued an invite code: {user_on_waiting_list.get('invite_code_issued')}.")
        # Optionally, find and return the existing invite from invites.json
        for inv in invites:
            if inv.get("code") == user_on_waiting_list.get("invite_code_issued"):
                return inv
        return {"message": "Already invited", "code": user_on_waiting_list.get("invite_code_issued")}


    # Generate a unique invite code
    new_code = ""
    attempts = 0
    max_attempts = 10 # To prevent infinite loop if code generation is somehow always colliding
    while attempts < max_attempts:
        new_code = generate_invite_code()
        if not any(invite.get("code") == new_code for invite in invites):
            break
        attempts += 1
    if attempts == max_attempts:
        print(f"Admin: Failed to generate a unique invite code for {email_to_invite} after {max_attempts} attempts.")
        return None # Could not generate unique code

    # Create new invite entry
    invite_entry = {
        "code": new_code,
        "email": email_to_invite, # Link to the email it was generated for
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "redeemed": False,
        "redeemed_at": None,
        "redeemed_by_user_id": None # Will be filled upon signup
    }
    invites.append(invite_entry)

    # Update waiting list entry
    waiting_list[user_wl_index]["invited"] = True
    waiting_list[user_wl_index]["invite_code_issued"] = new_code
    waiting_list[user_wl_index]["invited_at"] = datetime.utcnow().isoformat() + "Z"


    if write_json_file(INVITES_FILE, invites) and write_json_file(WAITING_LIST_FILE, waiting_list):
        print(f"Admin: Successfully issued invite code {new_code} to {email_to_invite}.")
        return invite_entry
    else:
        print(f"Admin: Failed to write updates to invites or waiting list files for {email_to_invite}.")
        # Potentially try to revert one if the other failed, or handle inconsistency.
        # For simplicity now, just log error.
        return None
# --- End Admin Helper Functions ---

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