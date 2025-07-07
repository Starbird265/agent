from fastapi import APIRouter, UploadFile, File, HTTPException
from services.model_registry_service import ModelRegistry, ModelMetadata
from services.huggingface_integration import HuggingFaceIntegration
from pathlib import Path
from typing import List
import hashlib

router = APIRouter(prefix="/models", tags=["models"])
registry = ModelRegistry(storage_root="models")
hf_integration = HuggingFaceIntegration(registry)

@router.post("/upload", summary="Upload a new model")
async def upload_model(file: UploadFile = File(...), metadata: ModelMetadata = None):
    try:
        model_bytes = await file.read()
        
        # Validate file hash
        file_hash = hashlib.sha256(model_bytes).hexdigest()
        
        storage_path = registry.save_model(
            model_bytes=model_bytes,
            metadata=metadata
        )
        return {
            "status": "success",
            "path": storage_path,
            "checksum": file_hash
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", summary="List all registered models")
async def list_models() -> List[dict]:
    try:
        return registry.list_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/huggingface/{repo_id}", summary="Import model from Hugging Face Hub")
async def import_hf_model(repo_id: str, revision: str = None):
    try:
        storage_path = hf_integration.download_model(repo_id, revision=revision)
        return {"status": "success", "path": storage_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HF integration error: {str(e)}")

@router.get("/{model_name}/{version}", summary="Retrieve specific model version")
async def get_model(model_name: str, version: str):
    try:
        model_bytes, metadata = registry.load_model(model_name, version)
        return {
            "model": model_bytes.decode('latin-1'),
            "metadata": metadata
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Model not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))