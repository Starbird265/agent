"""
AI TrainEasy MVP - Enhanced Secure Backend
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from prometheus_client import Counter, Histogram, generate_latest
import secure

# Import our security configuration
from config.security import SecurityConfig, SecurityUtils, SECURITY_HEADERS, logger
from api.routes.model_routes import router as model_routes
from api.routes.temporal_routes import router as temporal_routes

# Import Temporal service
from services.temporal_service import temporal_service, start_temporal_service, stop_temporal_service

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Security instance
security = secure.Secure()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 AI TrainEasy MVP starting up...")
    logger.info(f"Environment: {SecurityConfig.ENVIRONMENT}")
    logger.info(f"Security headers enabled: {SecurityConfig.SECURITY_HEADERS_ENABLED}")
    logger.info(f"Rate limiting: {SecurityConfig.RATE_LIMIT_REQUESTS} requests per {SecurityConfig.RATE_LIMIT_PERIOD} seconds")
    
    # Start Temporal service
    try:
        temporal_started = await start_temporal_service()
        if temporal_started:
            logger.info("✅ Temporal service started successfully")
        else:
            logger.warning("⚠️ Temporal service failed to start - workflows disabled")
    except Exception as e:
        logger.error(f"❌ Failed to start Temporal service: {str(e)}")
    
    yield
    
    # Stop Temporal service
    try:
        await stop_temporal_service()
        logger.info("✅ Temporal service stopped")
    except Exception as e:
        logger.error(f"❌ Failed to stop Temporal service: {str(e)}")
    
    logger.info("🛑 AI TrainEasy MVP shutting down...")

# FastAPI application
app = FastAPI(
    title="AI TrainEasy MVP",
    description="Secure Automated Machine Learning Backend",
    version="2.0.0",
    docs_url="/docs" if SecurityConfig.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if SecurityConfig.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=SecurityConfig.ALLOWED_ORIGINS,
    allow_credentials=SecurityConfig.CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Trusted host middleware (production only)
if SecurityConfig.is_production():
    trusted_hosts = []
    for origin in SecurityConfig.ALLOWED_ORIGINS:
        if origin.startswith(('http://', 'https://')):
            host = origin.split('://')[1]
            trusted_hosts.append(host)
    
    if trusted_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    start_time = time.time()
    
    response = await call_next(request)
    
    # Add security headers
    if SecurityConfig.SECURITY_HEADERS_ENABLED:
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
    
    # Add custom headers
    response.headers["X-API-Version"] = "2.0.0"
    response.headers["X-Request-ID"] = str(time.time())
    
    # Record metrics
    if SecurityConfig.METRICS_ENABLED:
        duration = time.time() - start_time
        REQUEST_DURATION.observe(duration)
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
    
    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests for security monitoring"""
    start_time = time.time()
    client_ip = get_remote_address(request)
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path} from {client_ip}")
    
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Log response
        logger.info(f"Response: {response.status_code} in {duration:.4f}s")
        
        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Request failed: {str(e)} in {duration:.4f}s")
        raise

# Authentication dependency
security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    payload = SecurityUtils.verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    return payload

# Health check endpoint
@app.get("/health")
@limiter.limit(f"{SecurityConfig.RATE_LIMIT_REQUESTS * 2}/minute")
async def health_check(request: Request):
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "environment": SecurityConfig.ENVIRONMENT,
        "version": "2.0.0"
    }

# Security info endpoint (development only)
@app.get("/security-info")
@limiter.limit("10/minute")
async def security_info(request: Request):
    """Security configuration info (development only)"""
    if SecurityConfig.is_production():
        raise HTTPException(status_code=404, detail="Not found")
    
    return {
        "environment": SecurityConfig.ENVIRONMENT,
        "security_headers_enabled": SecurityConfig.SECURITY_HEADERS_ENABLED,
        "rate_limit": f"{SecurityConfig.RATE_LIMIT_REQUESTS} requests per {SecurityConfig.RATE_LIMIT_PERIOD} seconds",
        "max_file_size": f"{SecurityConfig.MAX_FILE_SIZE_MB}MB",
        "cors_origins": SecurityConfig.ALLOWED_ORIGINS,
        "secure_cookies": SecurityConfig.SECURE_COOKIES
    }

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    if not SecurityConfig.METRICS_ENABLED:
        raise HTTPException(status_code=404, detail="Metrics disabled")
    
    return Response(generate_latest(), media_type="text/plain")

# Custom error handlers
@app.exception_handler(400)
async def bad_request_handler(request: Request, exc: HTTPException):
    """Handle bad request errors"""
    logger.warning(f"Bad request: {request.url.path} - {exc.detail}")
    return JSONResponse(
        status_code=400,
        content={"error": "Bad request", "message": "Invalid request format"}
    )

@app.exception_handler(401)
async def unauthorized_handler(request: Request, exc: HTTPException):
    """Handle unauthorized errors"""
    logger.warning(f"Unauthorized access attempt: {request.url.path}")
    return JSONResponse(
        status_code=401,
        content={"error": "Unauthorized", "message": "Authentication required"}
    )

@app.exception_handler(403)
async def forbidden_handler(request: Request, exc: HTTPException):
    """Handle forbidden errors"""
    logger.warning(f"Forbidden access attempt: {request.url.path}")
    return JSONResponse(
        status_code=403,
        content={"error": "Forbidden", "message": "Access denied"}
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Handle not found errors"""
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "message": "Resource not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    """Handle internal server errors"""
    logger.error(f"Internal server error: {request.url.path} - {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": "Something went wrong"}
    )

# Include routes
app.include_router(model_routes, prefix="/api/v1")
app.include_router(temporal_routes, prefix="/api/v1")

# Include new routes
try:
    from api.routes.auth_routes import router as auth_routes
    app.include_router(auth_routes, prefix="/api/v1")
except ImportError:
    logger.warning("Auth routes not available")

try:
    from api.routes.health_routes import router as health_routes
    app.include_router(health_routes, prefix="/api/v1")
except ImportError:
    logger.warning("Health routes not available")

# Main entry point
if __name__ == "__main__":
    import uvicorn
    
    # Configure SSL for production
    ssl_keyfile = None
    ssl_certfile = None
    
    if SecurityConfig.is_production():
        ssl_keyfile = os.getenv("SSL_KEYFILE")
        ssl_certfile = os.getenv("SSL_CERTFILE")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=not SecurityConfig.is_production(),
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
        access_log=True,
        log_level=SecurityConfig.LOG_LEVEL.lower()
    )