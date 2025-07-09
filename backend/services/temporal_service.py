"""
TEMPORAL SERVICE
Service for managing Temporal CLI workflows and activities
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import timedelta

from temporalio.client import Client, WorkflowFailureError
from temporalio.worker import Worker

from temporal_config import temporal_config
from workflows.ml_training_workflow import (
    MLTrainingWorkflow,
    BatchTrainingWorkflow,
    validate_training_request,
    prepare_training_environment,
    load_and_preprocess_data,
    train_model,
    evaluate_model,
    save_model_and_cleanup,
    cleanup_on_failure
)

from config.logging_config import LoggingConfig
logger = LoggingConfig.get_logger('temporal')

class TemporalService:
    """Service for managing Temporal workflows"""
    
    def __init__(self):
        self.client: Optional[Client] = None
        self.worker: Optional[Worker] = None
        self.config = temporal_config
        self.is_connected = False
        
    async def connect(self) -> bool:
        """Connect to Temporal server"""
        try:
            self.client = await Client.connect(
                f"{self.config.server_host}:{self.config.server_port}",
                namespace=self.config.namespace
            )
            self.is_connected = True
            logger.info(f"Connected to Temporal server: {self.config.server_host}:{self.config.server_port}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Temporal server: {str(e)}")
            self.is_connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from Temporal server"""
        if self.worker:
            await self.worker.shutdown()
        if self.client:
            # Temporal client doesn't have a close method in this version
            self.client = None
        
        self.is_connected = False
        logger.info("Disconnected from Temporal server")
    
    async def start_worker(self):
        """Start Temporal worker"""
        if not self.client:
            await self.connect()
        
        if not self.client:
            raise Exception("Cannot start worker without client connection")
        
        try:
            self.worker = Worker(
                self.client,
                task_queue=self.config.task_queue,
                workflows=[MLTrainingWorkflow, BatchTrainingWorkflow],
                activities=[
                    validate_training_request,
                    prepare_training_environment,
                    load_and_preprocess_data,
                    train_model,
                    evaluate_model,
                    save_model_and_cleanup,
                    cleanup_on_failure
                ],
                max_concurrent_workflow_tasks=5,
                max_concurrent_activities=10,
            )
            
            logger.info(f"Starting Temporal worker on task queue: {self.config.task_queue}")
            await self.worker.run()
            
        except Exception as e:
            logger.error(f"Failed to start Temporal worker: {str(e)}")
            raise
    
    async def stop_worker(self):
        """Stop Temporal worker"""
        if self.worker:
            await self.worker.shutdown()
            logger.info("Temporal worker stopped")
    
    async def start_training_workflow(self, training_request: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new ML training workflow"""
        if not self.client:
            await self.connect()
        
        if not self.client:
            raise Exception("Cannot start workflow without client connection")
        
        try:
            workflow_id = f"training_{training_request['model_id']}_{int(__import__('time').time())}"
            
            # Convert dictionary to TrainingRequest format
            normalized_request = {
                'model_id': training_request['model_id'],
                'user_id': training_request['user_id'],
                'dataset_path': training_request['dataset_path'],
                'model_type': training_request['model_type'],
                'training_params': training_request.get('hyperparameters', {}),
                'validation_split': training_request.get('validation_split', 0.2),
                'epochs': training_request.get('epochs', 10),
                'batch_size': training_request.get('batch_size', 32),
                'learning_rate': training_request.get('learning_rate', 0.001)
            }
            
            handle = await self.client.start_workflow(
                MLTrainingWorkflow.run,
                normalized_request,
                id=workflow_id,
                task_queue=self.config.task_queue,
                execution_timeout=timedelta(seconds=self.config.workflow_timeout)
            )
            
            logger.info(f"Started ML training workflow: {workflow_id}")
            
            return {
                'workflow_id': workflow_id,
                'status': 'started',
                'model_id': training_request['model_id'],
                'run_id': handle.run_id
            }
            
        except Exception as e:
            logger.error(f"Failed to start training workflow: {str(e)}")
            raise
    
    async def start_batch_training_workflow(self, batch_request: Dict[str, Any]) -> Dict[str, Any]:
        """Start a batch training workflow"""
        if not self.client:
            await self.connect()
        
        if not self.client:
            raise Exception("Cannot start workflow without client connection")
        
        try:
            workflow_id = f"batch_{batch_request['batch_id']}_{int(__import__('time').time())}"
            
            handle = await self.client.start_workflow(
                BatchTrainingWorkflow.run,
                batch_request,
                id=workflow_id,
                task_queue=self.config.task_queue,
                execution_timeout=timedelta(seconds=self.config.workflow_timeout)
            )
            
            logger.info(f"Started batch training workflow: {workflow_id}")
            
            return {
                'workflow_id': workflow_id,
                'status': 'started',
                'batch_id': batch_request['batch_id'],
                'run_id': handle.run_id
            }
            
        except Exception as e:
            logger.error(f"Failed to start batch training workflow: {str(e)}")
            raise
    
    async def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """Get the status of a workflow"""
        if not self.client:
            await self.connect()
        
        try:
            handle = self.client.get_workflow_handle(workflow_id)
            
            # Check if workflow is running
            try:
                await handle.describe()
                status = "running"
                result = None
            except:
                status = "unknown"
                result = None
            
            # Try to get result if completed
            try:
                result = await handle.result()
                status = "completed"
            except WorkflowFailureError as e:
                status = "failed"
                result = {"error": str(e)}
            except:
                pass
            
            return {
                'workflow_id': workflow_id,
                'status': status,
                'result': result,
                'run_id': handle.run_id
            }
            
        except Exception as e:
            logger.error(f"Failed to get workflow status: {str(e)}")
            return {
                'workflow_id': workflow_id,
                'status': 'error',
                'error': str(e)
            }
    
    async def cancel_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Cancel a running workflow"""
        if not self.client:
            await self.connect()
        
        try:
            handle = self.client.get_workflow_handle(workflow_id)
            await handle.cancel()
            
            logger.info(f"Cancelled workflow: {workflow_id}")
            
            return {
                'workflow_id': workflow_id,
                'status': 'cancelled'
            }
            
        except Exception as e:
            logger.error(f"Failed to cancel workflow: {str(e)}")
            return {
                'workflow_id': workflow_id,
                'status': 'error',
                'error': str(e)
            }
    
    async def list_workflows(self, limit: int = 10) -> List[Dict[str, Any]]:
        """List recent workflows"""
        if not self.client:
            await self.connect()
        
        try:
            workflows = []
            # This would require more complex implementation with Temporal's query capabilities
            # For now, return basic info
            return workflows
            
        except Exception as e:
            logger.error(f"Failed to list workflows: {str(e)}")
            return []
    
    async def get_workflow_metrics(self) -> Dict[str, Any]:
        """Get workflow execution metrics"""
        try:
            # This would integrate with Temporal's metrics system
            # For now, return basic metrics
            return {
                'total_workflows': 0,
                'running_workflows': 0,
                'completed_workflows': 0,
                'failed_workflows': 0,
                'average_execution_time': 0.0
            }
            
        except Exception as e:
            logger.error(f"Failed to get workflow metrics: {str(e)}")
            return {}
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            'service': 'temporal',
            'connected': self.is_connected,
            'server_host': self.config.server_host,
            'server_port': self.config.server_port,
            'namespace': self.config.namespace,
            'task_queue': self.config.task_queue,
            'worker_running': self.worker is not None,
            'status': 'healthy' if self.is_connected else 'unhealthy'
        }

# Global service instance
temporal_service = TemporalService()

async def start_temporal_service():
    """Start the Temporal service"""
    try:
        await temporal_service.connect()
        logger.info("Temporal service started successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to start Temporal service: {str(e)}")
        return False

async def stop_temporal_service():
    """Stop the Temporal service"""
    try:
        await temporal_service.disconnect()
        logger.info("Temporal service stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop Temporal service: {str(e)}")

# Utility functions for easier integration
async def train_model_with_temporal(training_request: Dict[str, Any]) -> Dict[str, Any]:
    """Train a model using Temporal workflow"""
    try:
        result = await temporal_service.start_training_workflow(training_request)
        return result
    except Exception as e:
        logger.error(f"Failed to train model with Temporal: {str(e)}")
        raise

async def batch_train_models_with_temporal(batch_request: Dict[str, Any]) -> Dict[str, Any]:
    """Train multiple models using Temporal batch workflow"""
    try:
        result = await temporal_service.start_batch_training_workflow(batch_request)
        return result
    except Exception as e:
        logger.error(f"Failed to batch train models with Temporal: {str(e)}")
        raise

async def get_training_status(workflow_id: str) -> Dict[str, Any]:
    """Get training status using workflow ID"""
    try:
        result = await temporal_service.get_workflow_status(workflow_id)
        return result
    except Exception as e:
        logger.error(f"Failed to get training status: {str(e)}")
        raise