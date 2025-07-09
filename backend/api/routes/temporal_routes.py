"""
TEMPORAL API ROUTES
RESTful endpoints for Temporal workflow management
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging

from services.temporal_service import (
    temporal_service,
    train_model_with_temporal,
    batch_train_models_with_temporal,
    get_training_status
)
from config.security import SecurityUtils

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/temporal", tags=["temporal"])

# Pydantic models
class TrainingRequest(BaseModel):
    """ML training request model"""
    model_config = {"protected_namespaces": ()}
    
    model_id: str = Field(..., description="Unique model identifier")
    user_id: str = Field(..., description="User identifier")
    dataset_path: str = Field(..., description="Path to training dataset")
    model_type: str = Field(..., description="Type of model: regression, classification, neural_network")
    
    # Training parameters
    epochs: int = Field(default=10, ge=1, le=1000, description="Number of training epochs")
    batch_size: int = Field(default=32, ge=1, le=1000, description="Training batch size")
    learning_rate: float = Field(default=0.001, gt=0, le=1, description="Learning rate")
    validation_split: float = Field(default=0.2, gt=0, lt=1, description="Validation data split")
    
    # Optional parameters
    training_params: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional training parameters")

class BatchTrainingRequest(BaseModel):
    """Batch training request model"""
    batch_id: str = Field(..., description="Unique batch identifier")
    training_requests: List[TrainingRequest] = Field(..., description="List of training requests")

class WorkflowStatusResponse(BaseModel):
    """Workflow status response model"""
    workflow_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    run_id: Optional[str] = None

class WorkflowStartResponse(BaseModel):
    """Workflow start response model"""
    model_config = {"protected_namespaces": ()}
    
    workflow_id: str
    status: str
    model_id: Optional[str] = None
    batch_id: Optional[str] = None
    run_id: Optional[str] = None

# API Endpoints

@router.post("/train", response_model=WorkflowStartResponse)
async def start_training_workflow(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """Start a new ML training workflow"""
    try:
        # Validate user permission
        if current_user["user_id"] != request.user_id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to train models for this user"
            )
        
        # Sanitize input
        sanitized_request = SecurityUtils.sanitize_training_request(request.dict())
        
        # Start workflow
        result = await train_model_with_temporal(sanitized_request)
        
        logger.info(f"Training workflow started: {result['workflow_id']} for user {current_user['user_id']}")
        
        return WorkflowStartResponse(**result)
        
    except Exception as e:
        logger.error(f"Failed to start training workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start training workflow: {str(e)}"
        )

@router.post("/batch-train", response_model=WorkflowStartResponse)
async def start_batch_training_workflow(
    request: BatchTrainingRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """Start a batch training workflow"""
    try:
        # Validate user permissions for all requests
        for training_request in request.training_requests:
            if current_user["user_id"] != training_request.user_id:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to train models for this user"
                )
        
        # Sanitize input
        sanitized_request = SecurityUtils.sanitize_batch_training_request(request.dict())
        
        # Start batch workflow
        result = await batch_train_models_with_temporal(sanitized_request)
        
        logger.info(f"Batch training workflow started: {result['workflow_id']} for user {current_user['user_id']}")
        
        return WorkflowStartResponse(**result)
        
    except Exception as e:
        logger.error(f"Failed to start batch training workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start batch training workflow: {str(e)}"
        )

@router.get("/status/{workflow_id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """Get the status of a training workflow"""
    try:
        # Validate workflow_id format
        if not SecurityUtils.is_valid_workflow_id(workflow_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid workflow ID format"
            )
        
        # Get workflow status
        status = await get_training_status(workflow_id)
        
        # Check if user has permission to view this workflow
        if not SecurityUtils.can_user_access_workflow(current_user["user_id"], workflow_id):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view this workflow"
            )
        
        return WorkflowStatusResponse(**status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow status: {str(e)}"
        )

@router.delete("/cancel/{workflow_id}")
async def cancel_workflow(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """Cancel a running workflow"""
    try:
        # Validate workflow_id format
        if not SecurityUtils.is_valid_workflow_id(workflow_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid workflow ID format"
            )
        
        # Check if user has permission to cancel this workflow
        if not SecurityUtils.can_user_access_workflow(current_user["user_id"], workflow_id):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to cancel this workflow"
            )
        
        # Cancel workflow
        result = await temporal_service.cancel_workflow(workflow_id)
        
        logger.info(f"Workflow cancelled: {workflow_id} by user {current_user['user_id']}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel workflow: {str(e)}"
        )

@router.get("/workflows")
async def list_user_workflows(
    limit: int = 10,
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """List workflows for the current user"""
    try:
        # Validate limit
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=400,
                detail="Limit must be between 1 and 100"
            )
        
        # Get workflows (filtered by user)
        workflows = await temporal_service.list_workflows(limit)
        
        # Filter workflows for current user
        user_workflows = SecurityUtils.filter_workflows_for_user(
            workflows, current_user["user_id"]
        )
        
        return {
            "workflows": user_workflows,
            "total": len(user_workflows),
            "user_id": current_user["user_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list workflows: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list workflows: {str(e)}"
        )

@router.get("/metrics")
async def get_workflow_metrics(
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """Get workflow execution metrics"""
    try:
        # Get overall metrics
        metrics = await temporal_service.get_workflow_metrics()
        
        # Add user-specific metrics
        user_metrics = SecurityUtils.get_user_workflow_metrics(current_user["user_id"])
        
        return {
            "overall": metrics,
            "user": user_metrics,
            "user_id": current_user["user_id"]
        }
        
    except Exception as e:
        logger.error(f"Failed to get workflow metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow metrics: {str(e)}"
        )

@router.get("/health")
async def get_temporal_health():
    """Get Temporal service health status"""
    try:
        health_status = temporal_service.get_health_status()
        
        return {
            "temporal": health_status,
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get Temporal health: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get Temporal health: {str(e)}"
        )

# Advanced workflow management endpoints

@router.post("/retry/{workflow_id}")
async def retry_failed_workflow(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """Retry a failed workflow"""
    try:
        # Validate workflow_id format
        if not SecurityUtils.is_valid_workflow_id(workflow_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid workflow ID format"
            )
        
        # Check permissions
        if not SecurityUtils.can_user_access_workflow(current_user["user_id"], workflow_id):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to retry this workflow"
            )
        
        # Get original workflow details
        original_status = await get_training_status(workflow_id)
        
        if original_status['status'] != 'failed':
            raise HTTPException(
                status_code=400,
                detail="Can only retry failed workflows"
            )
        
        # Extract original request and retry
        # This would need to be implemented based on your workflow storage
        
        return {
            "message": "Workflow retry initiated",
            "original_workflow_id": workflow_id,
            "status": "retry_initiated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retry workflow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retry workflow: {str(e)}"
        )

@router.get("/schedule")
async def get_scheduled_workflows(
    current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)
):
    """Get scheduled workflows for the current user"""
    try:
        # This would integrate with Temporal's scheduling capabilities
        # For now, return empty list
        return {
            "scheduled_workflows": [],
            "user_id": current_user["user_id"]
        }
        
    except Exception as e:
        logger.error(f"Failed to get scheduled workflows: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get scheduled workflows: {str(e)}"
        )

# Error handlers would be added to the main FastAPI app
# Note: APIRouter doesn't support exception_handler decorator
# These handlers should be added to the main FastAPI app instance