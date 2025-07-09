"""
Comprehensive logging configuration for AI TrainEasy MVP
"""

import logging
import logging.handlers
import os
import sys
from typing import Dict, Any
from datetime import datetime
from pathlib import Path

class LoggingConfig:
    """Logging configuration management"""
    
    # Log levels
    LOG_LEVELS = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    # Log format
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
    
    # Log file locations
    LOG_DIR = Path(os.getenv('LOG_DIR', 'logs'))
    LOG_FILES = {
        'app': LOG_DIR / 'app.log',
        'temporal': LOG_DIR / 'temporal.log',
        'auth': LOG_DIR / 'auth.log',
        'security': LOG_DIR / 'security.log',
        'error': LOG_DIR / 'error.log'
    }
    
    @classmethod
    def setup_logging(cls, level: str = 'INFO'):
        """Setup comprehensive logging"""
        
        # Create log directory
        cls.LOG_DIR.mkdir(exist_ok=True)
        
        # Clear existing handlers
        logging.getLogger().handlers = []
        
        # Set root logger level
        root_logger = logging.getLogger()
        root_logger.setLevel(cls.LOG_LEVELS.get(level.upper(), logging.INFO))
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(cls.LOG_LEVELS.get(level.upper(), logging.INFO))
        console_formatter = logging.Formatter(cls.LOG_FORMAT, cls.DATE_FORMAT)
        console_handler.setFormatter(console_formatter)
        root_logger.addHandler(console_handler)
        
        # File handlers
        cls._setup_file_handlers(root_logger)
        
        # Logger-specific configurations
        cls._setup_logger_configs()
        
        logging.info(f"Logging system initialized with level: {level}")
    
    @classmethod
    def _setup_file_handlers(cls, root_logger):
        """Setup file handlers with rotation"""
        
        # Main application log with rotation
        app_handler = logging.handlers.RotatingFileHandler(
            cls.LOG_FILES['app'],
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        app_handler.setLevel(logging.INFO)
        app_formatter = logging.Formatter(cls.LOG_FORMAT, cls.DATE_FORMAT)
        app_handler.setFormatter(app_formatter)
        root_logger.addHandler(app_handler)
        
        # Error log - only errors and above
        error_handler = logging.handlers.RotatingFileHandler(
            cls.LOG_FILES['error'],
            maxBytes=5*1024*1024,  # 5MB
            backupCount=3
        )
        error_handler.setLevel(logging.ERROR)
        error_formatter = logging.Formatter(cls.LOG_FORMAT, cls.DATE_FORMAT)
        error_handler.setFormatter(error_formatter)
        root_logger.addHandler(error_handler)
    
    @classmethod
    def _setup_logger_configs(cls):
        """Setup specific logger configurations"""
        
        # Temporal logger
        temporal_logger = logging.getLogger('temporal')
        temporal_handler = logging.handlers.RotatingFileHandler(
            cls.LOG_FILES['temporal'],
            maxBytes=10*1024*1024,
            backupCount=5
        )
        temporal_handler.setFormatter(logging.Formatter(cls.LOG_FORMAT, cls.DATE_FORMAT))
        temporal_logger.addHandler(temporal_handler)
        
        # Auth logger
        auth_logger = logging.getLogger('auth')
        auth_handler = logging.handlers.RotatingFileHandler(
            cls.LOG_FILES['auth'],
            maxBytes=5*1024*1024,
            backupCount=3
        )
        auth_handler.setFormatter(logging.Formatter(cls.LOG_FORMAT, cls.DATE_FORMAT))
        auth_logger.addHandler(auth_handler)
        
        # Security logger
        security_logger = logging.getLogger('security')
        security_handler = logging.handlers.RotatingFileHandler(
            cls.LOG_FILES['security'],
            maxBytes=5*1024*1024,
            backupCount=3
        )
        security_handler.setFormatter(logging.Formatter(cls.LOG_FORMAT, cls.DATE_FORMAT))
        security_logger.addHandler(security_handler)
        
        # Suppress some noisy external loggers
        logging.getLogger('passlib').setLevel(logging.WARNING)
        logging.getLogger('pydantic').setLevel(logging.WARNING)
        logging.getLogger('temporalio').setLevel(logging.INFO)
    
    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """Get a logger instance"""
        return logging.getLogger(name)
    
    @classmethod
    def log_request(cls, method: str, path: str, user_id: str = None, status_code: int = None):
        """Log HTTP requests"""
        logger = cls.get_logger('api')
        message = f"{method} {path}"
        if user_id:
            message += f" - User: {user_id}"
        if status_code:
            message += f" - Status: {status_code}"
        logger.info(message)
    
    @classmethod
    def log_workflow_event(cls, event_type: str, workflow_id: str, user_id: str = None, details: Dict[str, Any] = None):
        """Log workflow events"""
        logger = cls.get_logger('temporal')
        message = f"Workflow {event_type}: {workflow_id}"
        if user_id:
            message += f" - User: {user_id}"
        if details:
            message += f" - Details: {details}"
        logger.info(message)
    
    @classmethod
    def log_security_event(cls, event_type: str, user_id: str = None, details: Dict[str, Any] = None):
        """Log security events"""
        logger = cls.get_logger('security')
        message = f"Security event: {event_type}"
        if user_id:
            message += f" - User: {user_id}"
        if details:
            message += f" - Details: {details}"
        logger.warning(message)
    
    @classmethod
    def log_auth_event(cls, event_type: str, username: str = None, success: bool = True, details: Dict[str, Any] = None):
        """Log authentication events"""
        logger = cls.get_logger('auth')
        status = "SUCCESS" if success else "FAILED"
        message = f"Auth {event_type}: {status}"
        if username:
            message += f" - User: {username}"
        if details:
            message += f" - Details: {details}"
        
        if success:
            logger.info(message)
        else:
            logger.warning(message)

# Request logging middleware
class RequestLoggingMiddleware:
    """FastAPI middleware for request logging"""
    
    def __init__(self, app):
        self.app = app
        self.logger = LoggingConfig.get_logger('api')
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = datetime.now()
            
            # Log request start
            method = scope["method"]
            path = scope["path"]
            self.logger.info(f"Request started: {method} {path}")
            
            # Process request
            await self.app(scope, receive, send)
            
            # Log request completion
            duration = (datetime.now() - start_time).total_seconds()
            self.logger.info(f"Request completed: {method} {path} - Duration: {duration:.3f}s")
        else:
            await self.app(scope, receive, send)

# Initialize logging on import
LoggingConfig.setup_logging(os.getenv('LOG_LEVEL', 'INFO'))