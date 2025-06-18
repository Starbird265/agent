from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os, json, uuid
from datetime import datetime
from pydantic import BaseModel

app = FastAPI()

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