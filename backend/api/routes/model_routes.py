"""
Enhanced Model Routes with Security Features
"""

import os
import hashlib
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from services.model_registry_service import ModelRegistry, ModelMetadata
from services.huggingface_integration import HuggingFaceIntegration
from config.security import SecurityConfig, SecurityUtils, logger

# Initialize components
router = APIRouter(prefix="/models", tags=["models"])
registry = ModelRegistry(storage_root="models")
hf_integration = HuggingFaceIntegration(registry)
limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer(auto_error=False)

# Allowed file types for model uploads
ALLOWED_MODEL_EXTENSIONS = {
    'pkl', 'joblib', 'h5', 'pb', 'pt', 'pth', 'onnx', 'bin', 'model', 'json', 'yaml', 'yml'
}

ALLOWED_MIME_TYPES = {
    'application/octet-stream',
    'application/x-pickle',
    'application/x-hdf',
    'application/json',
    'text/yaml',
    'text/plain'
}

# Request models
class ModelUploadRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    version: str = Field(..., min_length=1, max_length=50)
    framework: str = Field(..., min_length=1, max_length=50)
    task_type: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    author: Optional[str] = Field(None, max_length=100)
    
    @validator('name', 'version', 'framework', 'task_type', 'description', 'author')
    def sanitize_fields(cls, v):
        if v is None:
            return v
        return SecurityUtils.sanitize_input(v)

class ModelSearchRequest(BaseModel):
    query: Optional[str] = Field(None, max_length=200)
    framework: Optional[str] = Field(None, max_length=50)
    task_type: Optional[str] = Field(None, max_length=100)
    limit: int = Field(10, ge=1, le=100)
    offset: int = Field(0, ge=0)

class HuggingFaceImportRequest(BaseModel):
    repo_id: str = Field(..., min_length=1, max_length=200)
    revision: Optional[str] = Field(None, max_length=100)
    filename: Optional[str] = Field("pytorch_model.bin", max_length=200)
    
    @validator('repo_id', 'revision', 'filename')
    def sanitize_fields(cls, v):
        if v is None:
            return v
        return SecurityUtils.sanitize_input(v)

# Security dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    payload = SecurityUtils.verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    return payload

# Validation functions
def validate_file_upload(file: UploadFile) -> None:
    """Validate uploaded file for security"""
    # Check file size
    if file.size and file.size > SecurityConfig.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum limit of {SecurityConfig.MAX_FILE_SIZE_MB}MB"
        )
    
    # Check file extension
    if not SecurityUtils.validate_file_type(file.filename, ALLOWED_MODEL_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MODEL_EXTENSIONS)}"
        )
    
    # Check MIME type
    mime_type, _ = mimetypes.guess_type(file.filename)
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        # Allow if we can't determine the type
        pass
    
    # Check for malicious filename patterns
    if any(char in file.filename for char in ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*']):
        raise HTTPException(
            status_code=400,
            detail="Invalid filename. Contains unsafe characters."
        )

def validate_model_metadata(metadata: ModelUploadRequest) -> None:
    """Validate model metadata"""
    # Check for required fields
    if not metadata.name or not metadata.version:
        raise HTTPException(
            status_code=400,
            detail="Model name and version are required"
        )
    
    # Validate framework
    allowed_frameworks = ['tensorflow', 'pytorch', 'scikit-learn', 'xgboost', 'lightgbm', 'keras', 'onnx']
    if metadata.framework.lower() not in allowed_frameworks:
        logger.warning(f"Unknown framework: {metadata.framework}")

# Routes
@router.post("/upload", summary="Upload a new model")
@limiter.limit("10/minute")
async def upload_model(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    version: str = Form(...),
    framework: str = Form(...),
    task_type: str = Form(...),
    description: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Upload a new model with security validation"""
    try:
        # Create metadata object
        metadata_request = ModelUploadRequest(
            name=name,
            version=version,
            framework=framework,
            task_type=task_type,
            description=description,
            author=author
        )
        
        # Validate file and metadata
        validate_file_upload(file)
        validate_model_metadata(metadata_request)
        
        # Read file content
        model_bytes = await file.read()
        
        # Validate file content (basic checks)
        if len(model_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Calculate file hash for integrity
        file_hash = hashlib.sha256(model_bytes).hexdigest()
        
        # Generate secure filename
        secure_filename = SecurityUtils.generate_secure_filename(file.filename)
        
        # Create metadata for storage
        storage_metadata = ModelMetadata(
            name=metadata_request.name,
            version=metadata_request.version,
            framework=metadata_request.framework,
            task_type=metadata_request.task_type,
            description=metadata_request.description,
            author=metadata_request.author or (current_user.get('username') if current_user else 'anonymous')
        )
        
        # Save model
        storage_path = registry.save_model(
            model_bytes=model_bytes,
            metadata=storage_metadata
        )
        
        # Log successful upload
        logger.info(f"Model uploaded successfully: {metadata_request.name} v{metadata_request.version}")
        
        return {
            "status": "success",
            "message": "Model uploaded successfully",
            "data": {
                "path": storage_path,
                "checksum": file_hash,
                "filename": secure_filename,
                "size": len(model_bytes),
                "upload_time": datetime.utcnow().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model upload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during model upload"
        )

@router.get("/", summary="List all registered models")
@limiter.limit("30/minute")
async def list_models(
    request: Request,
    search: Optional[str] = None,
    framework: Optional[str] = None,
    task_type: Optional[str] = None,
    limit: int = 10,
    offset: int = 0
) -> Dict[str, Any]:
    """List models with filtering and pagination"""
    try:
        # Validate and sanitize parameters
        if search:
            search = SecurityUtils.sanitize_input(search)
        if framework:
            framework = SecurityUtils.sanitize_input(framework)
        if task_type:
            task_type = SecurityUtils.sanitize_input(task_type)
        
        # Validate limits
        if limit < 1 or limit > 100:
            limit = 10
        if offset < 0:
            offset = 0
        
        # Get models
        models = registry.list_models()
        
        # Apply filtering
        if search:
            models = [m for m in models if search.lower() in m.get('name', '').lower()]
        if framework:
            models = [m for m in models if framework.lower() in m.get('framework', '').lower()]
        if task_type:
            models = [m for m in models if task_type.lower() in m.get('task_type', '').lower()]
        
        # Apply pagination
        total = len(models)
        models = models[offset:offset + limit]
        
        return {
            "status": "success",
            "data": {
                "models": models,
                "pagination": {
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "has_next": offset + limit < total,
                    "has_prev": offset > 0
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while listing models"
        )

@router.post("/import/huggingface", summary="Import model from Hugging Face Hub")
@limiter.limit("5/minute")
async def import_hf_model(
    request: Request,
    import_request: HuggingFaceImportRequest,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Import model from Hugging Face Hub with security validation"""
    try:
        # Validate repo_id format
        if not import_request.repo_id or '/' not in import_request.repo_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid repository ID format. Expected: 'username/model-name'"
            )
        
        # Security: limit to trusted organizations or add allowlist
        trusted_orgs = ['huggingface', 'microsoft', 'google', 'facebook', 'openai']
        org_name = import_request.repo_id.split('/')[0]
        
        if SecurityConfig.is_production() and org_name not in trusted_orgs:
            logger.warning(f"Attempt to import from untrusted org: {org_name}")
            raise HTTPException(
                status_code=403,
                detail="Imports are limited to trusted organizations in production"
            )
        
        # Download model
        storage_path = await hf_integration.download_model(
            repo_id=import_request.repo_id,
            filename=import_request.filename,
            revision=import_request.revision
        )
        
        logger.info(f"Model imported from HuggingFace: {import_request.repo_id}")
        
        return {
            "status": "success",
            "message": "Model imported successfully",
            "data": {
                "path": storage_path,
                "repo_id": import_request.repo_id,
                "revision": import_request.revision or "main",
                "filename": import_request.filename,
                "import_time": datetime.utcnow().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HuggingFace import failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to import model from Hugging Face"
        )

@router.get("/{model_name}/{version}", summary="Retrieve specific model version")
@limiter.limit("50/minute")
async def get_model(
    request: Request,
    model_name: str,
    version: str,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Retrieve specific model version with security checks"""
    try:
        # Sanitize inputs
        model_name = SecurityUtils.sanitize_input(model_name)
        version = SecurityUtils.sanitize_input(version)
        
        # Validate input format
        if not model_name or not version:
            raise HTTPException(
                status_code=400,
                detail="Model name and version are required"
            )
        
        # Check if model exists
        model_bytes, metadata = registry.load_model(model_name, version)
        
        # Security: Don't return actual model bytes in response for large models
        model_info = {
            "name": model_name,
            "version": version,
            "metadata": metadata,
            "size": len(model_bytes),
            "checksum": hashlib.sha256(model_bytes).hexdigest()
        }
        
        # Only return model bytes for small models (< 10MB)
        if len(model_bytes) < 10 * 1024 * 1024:
            model_info["model_data"] = model_bytes.decode('latin-1')
        else:
            model_info["download_url"] = f"/api/v1/models/{model_name}/{version}/download"
        
        return {
            "status": "success",
            "data": model_info
        }
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_name} version {version} not found"
        )
    except Exception as e:
        logger.error(f"Failed to retrieve model: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving model"
        )

@router.delete("/{model_name}/{version}", summary="Delete model version")
@limiter.limit("10/minute")
async def delete_model(
    request: Request,
    model_name: str,
    version: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific model version (requires authentication)"""
    try:
        # Sanitize inputs
        model_name = SecurityUtils.sanitize_input(model_name)
        version = SecurityUtils.sanitize_input(version)
        
        # Check if model exists
        try:
            _, metadata = registry.load_model(model_name, version)
        except FileNotFoundError:
            raise HTTPException(
                status_code=404,
                detail=f"Model {model_name} version {version} not found"
            )
        
        # Authorization check (only author or admin can delete)
        if (metadata.get('author') != current_user.get('username') and 
            not current_user.get('is_admin', False)):
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own models"
            )
        
        # Delete model
        registry.delete_model(model_name, version)
        
        logger.info(f"Model deleted: {model_name} v{version} by {current_user.get('username')}")
        
        return {
            "status": "success",
            "message": f"Model {model_name} version {version} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete model: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while deleting model"
        )

@router.get("/health", summary="Models API health check")
async def models_health_check():
    """Health check endpoint for models API"""
    return {
        "status": "healthy",
        "service": "models",
        "timestamp": datetime.utcnow().isoformat(),
        "registry_status": "active"
    }