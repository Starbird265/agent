"""
Authentication API routes for AI TrainEasy MVP
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any
import logging

from config.security import SecurityUtils
from config.logging_config import LoggingConfig

logger = LoggingConfig.get_logger('auth')

router = APIRouter(prefix="/auth", tags=["authentication"])

class LoginRequest(BaseModel):
    """Login request model"""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")

class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    email: str

class RegisterRequest(BaseModel):
    """User registration request"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password")
    full_name: str = Field(..., description="Full name")

class RegisterResponse(BaseModel):
    """Registration response model"""
    user_id: str
    username: str
    email: str
    message: str

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """User login endpoint"""
    try:
        # Validate credentials
        # This is a simplified implementation - in production, check against database
        
        # For demo purposes, accept any user with password "password"
        if request.password != "password":
            # Log failed login
            LoggingConfig.log_auth_event("LOGIN", request.username, False, {"reason": "Invalid password"})
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create user payload
        user_payload = {
            "user_id": f"user_{hash(request.username) % 10000}",
            "username": request.username,
            "email": f"{request.username}@example.com",
            "roles": ["user"]
        }
        
        # Generate JWT token
        access_token = SecurityUtils.create_access_token(user_payload)
        
        # Log successful login
        LoggingConfig.log_auth_event("LOGIN", request.username, True)
        
        return LoginResponse(
            access_token=access_token,
            user_id=user_payload["user_id"],
            username=user_payload["username"],
            email=user_payload["email"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.post("/register", response_model=RegisterResponse)
async def register(request: RegisterRequest):
    """User registration endpoint"""
    try:
        # Validate input
        if len(request.password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters long"
            )
        
        # Check if user already exists (simplified - in production, check database)
        # For demo purposes, allow any registration
        
        # Create user
        user_id = f"user_{hash(request.username) % 10000}"
        
        # Hash password
        password_hash = SecurityUtils.hash_password(request.password)
        
        logger.info(f"User registered: {request.username}")
        
        return RegisterResponse(
            user_id=user_id,
            username=request.username,
            email=request.email,
            message="User registered successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/me")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)):
    """Get current user information"""
    return {
        "user_id": current_user["user_id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "roles": current_user.get("roles", [])
    }

@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)):
    """User logout endpoint"""
    logger.info(f"User logged out: {current_user['username']}")
    return {"message": "Successfully logged out"}

@router.post("/refresh")
async def refresh_token(current_user: Dict[str, Any] = Depends(SecurityUtils.get_current_user)):
    """Refresh JWT token"""
    try:
        # Generate new token
        new_token = SecurityUtils.create_access_token({
            "user_id": current_user["user_id"],
            "username": current_user["username"],
            "email": current_user["email"],
            "roles": current_user.get("roles", [])
        })
        
        return {
            "access_token": new_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to refresh token"
        )