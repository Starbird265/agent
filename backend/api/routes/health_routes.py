"""
Health check API routes for AI TrainEasy MVP
"""

from fastapi import APIRouter
from typing import Dict, Any
import asyncio
import time
from datetime import datetime

from config.production_config import HealthCheckConfig
from config.logging_config import LoggingConfig

logger = LoggingConfig.get_logger('health')
router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "ai-traineasy-mvp"
    }

@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with all services"""
    start_time = time.time()
    
    try:
        # Run all health checks concurrently
        checks = await asyncio.gather(
            HealthCheckConfig.check_database(),
            HealthCheckConfig.check_redis(),
            HealthCheckConfig.check_temporal(),
            HealthCheckConfig.check_disk_space(),
            return_exceptions=True
        )
        
        # Process results
        results = {}
        overall_status = "healthy"
        
        check_names = ["database", "redis", "temporal", "disk"]
        for i, check in enumerate(checks):
            if isinstance(check, Exception):
                results[check_names[i]] = {
                    "status": "unhealthy",
                    "error": str(check)
                }
                overall_status = "unhealthy"
            else:
                results[check_names[i]] = check
                if check.get("status") != "healthy":
                    overall_status = "unhealthy"
        
        duration = round((time.time() - start_time) * 1000, 2)
        
        response = {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "duration_ms": duration,
            "checks": results
        }
        
        logger.info(f"Health check completed: {overall_status} in {duration}ms")
        return response
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@router.get("/readiness")
async def readiness_check():
    """Kubernetes readiness probe"""
    try:
        # Check critical services
        temporal_check = await HealthCheckConfig.check_temporal()
        
        if temporal_check["status"] == "healthy":
            return {"status": "ready"}
        else:
            return {"status": "not_ready", "reason": "temporal_unhealthy"}
            
    except Exception as e:
        return {"status": "not_ready", "reason": str(e)}

@router.get("/liveness")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.now().isoformat()}

@router.get("/metrics")
async def health_metrics():
    """Health metrics endpoint"""
    try:
        # Get basic system metrics
        import psutil
        
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_percent": (disk.used / disk.total) * 100,
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Metrics collection failed: {str(e)}")
        return {"error": str(e)}