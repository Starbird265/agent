"""
TEMPORAL CLI CONFIGURATION
Workflow orchestration setup for AI TrainEasy MVP
"""

import os
from dataclasses import dataclass
from typing import Optional, Dict, Any
import logging

@dataclass
class TemporalConfig:
    """Configuration for Temporal CLI integration"""
    
    # Server configuration
    server_host: str = "localhost"
    server_port: int = 7233
    namespace: str = "default"
    
    # Security settings
    enable_tls: bool = False
    cert_path: Optional[str] = None
    key_path: Optional[str] = None
    
    # Workflow settings
    task_queue: str = "ai-traineasy-task-queue"
    workflow_timeout: int = 3600  # 1 hour
    activity_timeout: int = 300   # 5 minutes
    
    # Retry policies
    max_attempts: int = 3
    initial_interval: int = 1     # seconds
    max_interval: int = 100       # seconds
    backoff_coefficient: float = 2.0
    
    # Logging
    log_level: str = "INFO"
    enable_metrics: bool = True
    
    @classmethod
    def from_env(cls) -> 'TemporalConfig':
        """Create configuration from environment variables"""
        return cls(
            server_host=os.getenv('TEMPORAL_HOST', 'localhost'),
            server_port=int(os.getenv('TEMPORAL_PORT', '7233')),
            namespace=os.getenv('TEMPORAL_NAMESPACE', 'default'),
            enable_tls=os.getenv('TEMPORAL_TLS', 'false').lower() == 'true',
            cert_path=os.getenv('TEMPORAL_CERT_PATH'),
            key_path=os.getenv('TEMPORAL_KEY_PATH'),
            task_queue=os.getenv('TEMPORAL_TASK_QUEUE', 'ai-traineasy-task-queue'),
            workflow_timeout=int(os.getenv('TEMPORAL_WORKFLOW_TIMEOUT', '3600')),
            activity_timeout=int(os.getenv('TEMPORAL_ACTIVITY_TIMEOUT', '300')),
            max_attempts=int(os.getenv('TEMPORAL_MAX_ATTEMPTS', '3')),
            log_level=os.getenv('TEMPORAL_LOG_LEVEL', 'INFO'),
            enable_metrics=os.getenv('TEMPORAL_METRICS', 'true').lower() == 'true'
        )
    
    def get_server_url(self) -> str:
        """Get the complete server URL"""
        protocol = "https" if self.enable_tls else "http"
        return f"{protocol}://{self.server_host}:{self.server_port}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/debugging"""
        return {
            'server_host': self.server_host,
            'server_port': self.server_port,
            'namespace': self.namespace,
            'enable_tls': self.enable_tls,
            'task_queue': self.task_queue,
            'workflow_timeout': self.workflow_timeout,
            'activity_timeout': self.activity_timeout,
            'max_attempts': self.max_attempts,
            'log_level': self.log_level,
            'enable_metrics': self.enable_metrics
        }

# Global configuration instance
temporal_config = TemporalConfig.from_env()

# Setup logging
logging.basicConfig(
    level=getattr(logging, temporal_config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info(f"Temporal configuration loaded: {temporal_config.to_dict()}")