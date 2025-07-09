"""
Security configuration and utilities for AI TrainEasy MVP
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from cryptography.fernet import Fernet
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
import logging

# Load environment variables
load_dotenv()

# Security configuration
class SecurityConfig:
    # Environment
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    
    # Secret keys
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_urlsafe(32))
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', secrets.token_urlsafe(32))
    JWT_ALGORITHM = "HS256"
    
    # Token expiration
    API_KEY_EXPIRE_MINUTES = int(os.getenv('API_KEY_EXPIRE_MINUTES', '30'))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', '7'))
    
    # Password hashing
    BCRYPT_ROUNDS = int(os.getenv('BCRYPT_ROUNDS', '12'))
    
    # CORS settings
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'true').lower() == 'true'
    
    # Cookie settings
    SECURE_COOKIES = os.getenv('SECURE_COOKIES', 'false').lower() == 'true'
    SAMESITE_COOKIES = os.getenv('SAMESITE_COOKIES', 'lax')
    
    # Rate limiting
    RATE_LIMIT_REQUESTS = int(os.getenv('RATE_LIMIT_REQUESTS', '100'))
    RATE_LIMIT_PERIOD = int(os.getenv('RATE_LIMIT_PERIOD', '3600'))
    
    # File upload limits
    MAX_FILE_SIZE_MB = int(os.getenv('MAX_FILE_SIZE_MB', '100'))
    MAX_PROJECTS_PER_USER = int(os.getenv('MAX_PROJECTS_PER_USER', '10'))
    
    # Encryption
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', Fernet.generate_key().decode())
    
    # Security headers
    SECURITY_HEADERS_ENABLED = os.getenv('SECURITY_HEADERS_ENABLED', 'true').lower() == 'true'
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Metrics
    METRICS_ENABLED = os.getenv('METRICS_ENABLED', 'true').lower() == 'true'

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Encryption utility
cipher_suite = Fernet(SecurityConfig.ENCRYPTION_KEY.encode() 
                     if isinstance(SecurityConfig.ENCRYPTION_KEY, str) 
                     else SecurityConfig.ENCRYPTION_KEY)

class SecurityUtils:
    """Utility class for security operations"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=SecurityConfig.API_KEY_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SecurityConfig.JWT_SECRET_KEY, algorithm=SecurityConfig.JWT_ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SecurityConfig.JWT_SECRET_KEY, algorithms=[SecurityConfig.JWT_ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def encrypt_sensitive_data(data: str) -> str:
        """Encrypt sensitive data"""
        return cipher_suite.encrypt(data.encode()).decode()
    
    @staticmethod
    def decrypt_sensitive_data(encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return cipher_suite.decrypt(encrypted_data.encode()).decode()
    
    @staticmethod
    def generate_secure_filename(filename: str) -> str:
        """Generate a secure filename with timestamp and random suffix"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        random_suffix = secrets.token_hex(8)
        name, ext = os.path.splitext(filename)
        return f"{timestamp}_{random_suffix}_{name}{ext}"
    
    @staticmethod
    def validate_file_type(filename: str, allowed_types: list) -> bool:
        """Validate file type against allowed types"""
        if not filename or '.' not in filename:
            return False
        
        file_ext = filename.rsplit('.', 1)[1].lower()
        return file_ext in allowed_types
    
    @staticmethod
    def sanitize_input(input_str: str) -> str:
        """Sanitize user input"""
        if not input_str:
            return ""
        
        # Remove potential script tags and other dangerous content
        dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
        for char in dangerous_chars:
            input_str = input_str.replace(char, '')
        
        return input_str.strip()[:1000]  # Limit length
    
    @staticmethod
    def is_production() -> bool:
        """Check if running in production environment"""
        return SecurityConfig.ENVIRONMENT == 'production'
    
    @staticmethod
    async def get_current_user(token: str = Depends(HTTPBearer())):
        """Get current user from JWT token"""
        try:
            if not token:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication token required",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Extract token from credentials
            token_value = token.credentials if hasattr(token, 'credentials') else token
            
            # Verify JWT token
            payload = SecurityUtils.verify_token(token_value)
            
            if not payload:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check token expiration
            if payload.get('exp', 0) < __import__('time').time():
                raise HTTPException(
                    status_code=401,
                    detail="Token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return {
                "user_id": payload.get("user_id"),
                "username": payload.get("username"),
                "email": payload.get("email"),
                "roles": payload.get("roles", [])
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Placeholder methods for Temporal integration
    @staticmethod
    def sanitize_training_request(request):
        raise NotImplementedError("sanitize_training_request is not implemented")

    @staticmethod
    def sanitize_batch_training_request(request):
        raise NotImplementedError("sanitize_batch_training_request is not implemented")

    @staticmethod
    def is_valid_workflow_id(workflow_id):
        raise NotImplementedError("is_valid_workflow_id is not implemented")

    @staticmethod
    def can_user_access_workflow(user_id, workflow_id):
        raise NotImplementedError("can_user_access_workflow is not implemented")

    @staticmethod
    def filter_workflows_for_user(workflows, user_id):
        """Filter workflows accessible by a specific user"""
        return [
            workflow for workflow in workflows
            if TemporalSecurityUtils.can_user_access_workflow(user_id, workflow.get('workflow_id', ''))
        ]

    @staticmethod
    def get_user_workflow_metrics(user_id):
        raise NotImplementedError("get_user_workflow_metrics is not implemented")

# Security headers configuration
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}

# Logging configuration
logging.basicConfig(
    level=getattr(logging, SecurityConfig.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.info(f"Security configuration loaded for {SecurityConfig.ENVIRONMENT} environment")

# Additional security utilities for Temporal integration
class TemporalSecurityUtils:
    """Security utilities for Temporal workflow management"""
    
    @staticmethod
    def sanitize_training_request(request: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize training request data"""
        sanitized = {}
        
        # Required fields
        sanitized['model_id'] = SecurityUtils.sanitize_string(request.get('model_id', ''))
        sanitized['user_id'] = SecurityUtils.sanitize_string(request.get('user_id', ''))
        sanitized['dataset_path'] = TemporalSecurityUtils.sanitize_file_path(request.get('dataset_path', ''))
        sanitized['model_type'] = SecurityUtils.sanitize_string(request.get('model_type', ''))
        
        # Numeric parameters with validation
        sanitized['epochs'] = max(1, min(1000, int(request.get('epochs', 10))))
        sanitized['batch_size'] = max(1, min(1000, int(request.get('batch_size', 32))))
        sanitized['learning_rate'] = max(0.0001, min(1.0, float(request.get('learning_rate', 0.001))))
        sanitized['validation_split'] = max(0.1, min(0.9, float(request.get('validation_split', 0.2))))
        
        # Optional parameters
        training_params = request.get('training_params', {})
        sanitized['training_params'] = {
            k: SecurityUtils.sanitize_string(str(v))
            for k, v in training_params.items()
            if isinstance(k, str) and len(k) < 100
        }
        
        return sanitized
    
    @staticmethod
    def sanitize_batch_training_request(request: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize batch training request data"""
        sanitized = {}
        
        sanitized['batch_id'] = SecurityUtils.sanitize_string(request.get('batch_id', ''))
        
        training_requests = request.get('training_requests', [])
        sanitized['training_requests'] = [
            TemporalSecurityUtils.sanitize_training_request(req)
            for req in training_requests[:10]  # Limit to 10 requests max
        ]
        
        return sanitized
    
    @staticmethod
    def sanitize_file_path(file_path: str) -> str:
        """Sanitize file path to prevent directory traversal"""
        import os
        
        # Remove any directory traversal attempts
        clean_path = file_path.replace('..', '').replace('//', '/')
        
        # Ensure path is relative and within allowed directories
        if os.path.isabs(clean_path):
            clean_path = os.path.basename(clean_path)
        
        # Only allow specific file extensions
        allowed_extensions = ['.csv', '.json', '.txt']
        if not any(clean_path.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError(f"File type not allowed: {clean_path}")
        
        return clean_path
    
    @staticmethod
    def is_valid_workflow_id(workflow_id: str) -> bool:
        """Validate workflow ID format"""
        if not workflow_id or len(workflow_id) < 5 or len(workflow_id) > 100:
            return False
        
        # Check for valid characters (alphanumeric, hyphens, underscores)
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', workflow_id):
            return False
        
        return True
    
    @staticmethod
    def can_user_access_workflow(user_id: str, workflow_id: str) -> bool:
        """Check if user can access the workflow"""
        # Extract user ID from workflow ID (assuming it's embedded)
        # This is a simplified check - in production, you'd query a database
        if f"_{user_id}_" in workflow_id or workflow_id.startswith(f"training_{user_id}_"):
            return True
        
        return False
    
    @staticmethod
    def filter_workflows_for_user(workflows: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
        """Filter workflows for a specific user"""
        return [
            workflow for workflow in workflows
            if TemporalSecurityUtils.can_user_access_workflow(user_id, workflow.get('workflow_id', ''))
        ]
    
    @staticmethod
    def get_user_workflow_metrics(user_id: str) -> Dict[str, Any]:
        """Get workflow metrics for a specific user"""
        # This would query your database for user-specific metrics
        # For now, return mock data
        return {
            'total_workflows': 0,
            'running_workflows': 0,
            'completed_workflows': 0,
            'failed_workflows': 0,
            'user_id': user_id
        }

# Extend SecurityUtils with Temporal-specific methods
SecurityUtils.sanitize_training_request = staticmethod(TemporalSecurityUtils.sanitize_training_request)
SecurityUtils.sanitize_batch_training_request = staticmethod(TemporalSecurityUtils.sanitize_batch_training_request)
SecurityUtils.is_valid_workflow_id = staticmethod(TemporalSecurityUtils.is_valid_workflow_id)
SecurityUtils.can_user_access_workflow = staticmethod(TemporalSecurityUtils.can_user_access_workflow)
SecurityUtils.filter_workflows_for_user = staticmethod(TemporalSecurityUtils.filter_workflows_for_user)
SecurityUtils.get_user_workflow_metrics = staticmethod(TemporalSecurityUtils.get_user_workflow_metrics)