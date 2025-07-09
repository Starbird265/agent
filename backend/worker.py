#!/usr/bin/env python3
"""
Temporal Worker for AI TrainEasy MVP
Executes ML training workflows
"""

import asyncio
import logging
import signal
import sys
from typing import Dict, Any

from temporalio import activity, workflow
from temporalio.client import Client
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

# Setup logging
logging.basicConfig(
    level=getattr(logging, temporal_config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WorkerManager:
    """Manages the Temporal worker lifecycle"""
    
    def __init__(self):
        self.client = None
        self.worker = None
        self.running = False
        
    async def start(self):
        """Start the Temporal worker"""
        try:
            # Connect to Temporal server
            logger.info(f"Connecting to Temporal server: {temporal_config.server_host}:{temporal_config.server_port}")
            self.client = await Client.connect(
                f"{temporal_config.server_host}:{temporal_config.server_port}",
                namespace=temporal_config.namespace,
            )
            
            # Create worker
            logger.info(f"Creating worker for task queue: {temporal_config.task_queue}")
            self.worker = Worker(
                self.client,
                task_queue=temporal_config.task_queue,
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
                max_concurrent_workflow_tasks=10,
                max_concurrent_activities=10,
            )
            
            logger.info("🚀 Starting Temporal worker...")
            self.running = True
            
            # Start worker
            await self.worker.run()
            
        except Exception as e:
            logger.error(f"Failed to start worker: {str(e)}")
            raise
    
    async def stop(self):
        """Stop the Temporal worker"""
        if self.worker and self.running:
            logger.info("🛑 Stopping Temporal worker...")
            await self.worker.shutdown()
            self.running = False
            logger.info("✅ Worker stopped")
    
    async def health_check(self):
        """Check worker health"""
        return {
            "status": "healthy" if self.running else "stopped",
            "client_connected": self.client is not None,
            "worker_running": self.running,
            "task_queue": temporal_config.task_queue,
            "namespace": temporal_config.namespace
        }

# Global worker manager instance
worker_manager = WorkerManager()

async def main():
    """Main worker function"""
    
    def signal_handler(signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating shutdown...")
        asyncio.create_task(worker_manager.stop())
        sys.exit(0)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start worker
        await worker_manager.start()
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
        await worker_manager.stop()
        
    except Exception as e:
        logger.error(f"Worker error: {str(e)}")
        await worker_manager.stop()
        sys.exit(1)

if __name__ == "__main__":
    # Run the worker
    asyncio.run(main())