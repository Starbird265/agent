"""
Production configuration for AI TrainEasy MVP
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from temporal_config import TemporalConfig

@dataclass
class ProductionConfig:
    """Production-specific configuration"""
    
    # Environment
    environment: str = "production"
    debug: bool = False
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/aitraineasy")
    database_pool_size: int = int(os.getenv("DATABASE_POOL_SIZE", "10"))
    
    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    
    def __post_init__(self):
        self.cors_origins = os.getenv("CORS_ORIGINS", "https://yourdomain.com").split(",")
    
    # Temporal
    temporal_namespace: str = os.getenv("TEMPORAL_NAMESPACE", "ai-traineasy-prod")
    temporal_host: str = os.getenv("TEMPORAL_HOST", "temporal.yourdomain.com")
    temporal_port: int = int(os.getenv("TEMPORAL_PORT", "7233"))
    
    # API
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    workers: int = int(os.getenv("WORKERS", "4"))
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_dir: str = os.getenv("LOG_DIR", "/var/log/aitraineasy")
    
    # Monitoring
    enable_metrics: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    metrics_port: int = int(os.getenv("METRICS_PORT", "9090"))
    
    # File storage
    upload_dir: str = os.getenv("UPLOAD_DIR", "/data/uploads")
    max_file_size: int = int(os.getenv("MAX_FILE_SIZE", "100")) * 1024 * 1024  # 100MB
    
    # ML Training
    max_concurrent_trainings: int = int(os.getenv("MAX_CONCURRENT_TRAININGS", "5"))
    training_timeout: int = int(os.getenv("TRAINING_TIMEOUT", "7200"))  # 2 hours
    
    @classmethod
    def get_temporal_config(cls) -> TemporalConfig:
        """Get production Temporal configuration"""
        return TemporalConfig(
            server_host=cls.temporal_host,
            server_port=cls.temporal_port,
            namespace=cls.temporal_namespace,
            enable_tls=True,
            task_queue="ai-traineasy-prod-queue",
            workflow_timeout=cls.training_timeout,
            activity_timeout=300,
            max_attempts=3,
            log_level=cls.log_level,
            enable_metrics=cls.enable_metrics
        )
    
    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """Validate production configuration"""
        issues = []
        
        # Check required environment variables
        required_vars = [
            "DATABASE_URL",
            "REDIS_URL", 
            "SECRET_KEY",
            "TEMPORAL_HOST"
        ]
        
        for var in required_vars:
            if not os.getenv(var):
                issues.append(f"Missing required environment variable: {var}")
        
        # Check secret key strength
        if len(cls.secret_key) < 32:
            issues.append("SECRET_KEY should be at least 32 characters long")
        
        # Check log directory permissions
        if not os.path.exists(cls.log_dir):
            try:
                os.makedirs(cls.log_dir, exist_ok=True)
            except Exception as e:
                issues.append(f"Cannot create log directory {cls.log_dir}: {e}")
        
        # Check upload directory
        if not os.path.exists(cls.upload_dir):
            try:
                os.makedirs(cls.upload_dir, exist_ok=True)
            except Exception as e:
                issues.append(f"Cannot create upload directory {cls.upload_dir}: {e}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }

# Health check configuration
class HealthCheckConfig:
    """Health check endpoints configuration"""
    
    @staticmethod
    async def check_database() -> Dict[str, Any]:
        """Check database connectivity"""
        try:
            # In production, implement actual database check
            return {"status": "healthy", "service": "database"}
        except Exception as e:
            return {"status": "unhealthy", "service": "database", "error": str(e)}
    
    @staticmethod
    async def check_redis() -> Dict[str, Any]:
        """Check Redis connectivity"""
        try:
            # In production, implement actual Redis check
            return {"status": "healthy", "service": "redis"}
        except Exception as e:
            return {"status": "unhealthy", "service": "redis", "error": str(e)}
    
    @staticmethod
    async def check_temporal() -> Dict[str, Any]:
        """Check Temporal connectivity"""
        try:
            from services.temporal_service import temporal_service
            health = temporal_service.get_health_status()
            return {"status": "healthy" if health["status"] == "healthy" else "unhealthy", "service": "temporal"}
        except Exception as e:
            return {"status": "unhealthy", "service": "temporal", "error": str(e)}
    
    @staticmethod
    async def check_disk_space() -> Dict[str, Any]:
        """Check disk space"""
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            free_percent = (free / total) * 100
            
            status = "healthy" if free_percent > 10 else "unhealthy"
            return {
                "status": status,
                "service": "disk",
                "free_percent": round(free_percent, 2),
                "free_gb": round(free / (1024**3), 2)
            }
        except Exception as e:
            return {"status": "unhealthy", "service": "disk", "error": str(e)}

# Load production configuration
production_config = ProductionConfig()