"""
Comprehensive tests for Nitrix Backend API
Tests all endpoints, security, and edge cases
"""
import pytest
import asyncio
import json
import os
import tempfile
import shutil
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime
import time

# Import the FastAPI app
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from main_simple import app
from invitation_system import invitation_manager

class TestNitrixAPI:
    """Comprehensive test suite for Nitrix API"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Setup for each test"""
        self.client = TestClient(app)
        self.test_dir = tempfile.mkdtemp()
        
        # Mock projects directory
        self.projects_dir = os.path.join(self.test_dir, 'projects')
        os.makedirs(self.projects_dir, exist_ok=True)
        
        # Create test session token
        self.test_session_token = "test_session_123"
        invitation_manager.sessions[self.test_session_token] = {
            'code': 'TEST-CODE',
            'client_ip': '127.0.0.1',
            'created': datetime.now().isoformat(),
            'expires': datetime.now().isoformat(),
            'active': True
        }
        
        yield
        
        # Cleanup
        shutil.rmtree(self.test_dir, ignore_errors=True)
        if self.test_session_token in invitation_manager.sessions:
            del invitation_manager.sessions[self.test_session_token]

    def get_auth_headers(self):
        """Get authentication headers"""
        return {"X-Session-Token": self.test_session_token}

    def test_root_endpoint(self):
        """Test root endpoint"""
        response = self.client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "AI TrainEasy MVP Backend - Beta Version"
        assert "version" in data
        assert "timestamp" in data

    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["version"] == "1.0.0-beta"

    def test_debug_status(self):
        """Test debug status endpoint"""
        response = self.client.get("/debug/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "AI TrainEasy Backend - Debug Mode"
        assert data["auth_system"] == "invitation-based"
        assert "features" in data
        assert data["features"]["projects"] == True

    @patch('psutil.cpu_count')
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    @patch('GPUtil.getGPUs')
    def test_system_info(self, mock_gpus, mock_memory, mock_cpu_percent, mock_cpu_count):
        """Test system info endpoint with mocked hardware"""
        # Mock system data
        mock_cpu_count.return_value = 8
        mock_cpu_percent.return_value = 25.5
        
        mock_memory_obj = MagicMock()
        mock_memory_obj.total = 16 * 1024**3  # 16 GB
        mock_memory_obj.percent = 60.0
        mock_memory.return_value = mock_memory_obj
        
        mock_gpu = MagicMock()
        mock_gpu.id = 0
        mock_gpu.name = "NVIDIA RTX 4090"
        mock_gpu.driver = "535.98"
        mock_gpu.memoryTotal = 24576
        mock_gpu.memoryUsed = 1024
        mock_gpu.memoryFree = 23552
        mock_gpu.load = 0.15
        mock_gpu.temperature = 45
        mock_gpu.uuid = "GPU-12345678"
        mock_gpus.return_value = [mock_gpu]
        
        response = self.client.get("/system-info", headers=self.get_auth_headers())
        assert response.status_code == 200
        
        data = response.json()
        assert data["cpu_count"] == 8
        assert data["cpu_percent"] == 25.5
        assert data["total_ram_gb"] == 16.0
        assert data["ram_percent"] == 60.0
        assert data["gpu_available"] == True
        assert data["gpu_count"] == 1
        assert data["gpu_names"] == ["NVIDIA RTX 4090"]
        assert len(data["gpus"]) == 1
        assert data["gpus"][0]["name"] == "NVIDIA RTX 4090"

    def test_system_info_without_auth(self):
        """Test system info endpoint without authentication"""
        response = self.client.get("/system-info")
        assert response.status_code == 401
        assert "Session token required" in response.json()["detail"]

    def test_create_project_success(self):
        """Test successful project creation"""
        project_data = {
            "name": "Test Machine Learning Project"
        }
        
        with patch('main_simple.os.makedirs') as mock_makedirs, \
             patch('builtins.open', create=True) as mock_open:
            
            response = self.client.post(
                "/projects/create",
                json=project_data,
                headers=self.get_auth_headers()
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["project"]["name"] == "Test Machine Learning Project"
            assert "id" in data["project"]
            assert data["project"]["status"] == "initialized"

    def test_create_project_validation_error(self):
        """Test project creation with validation errors"""
        project_data = {
            "name": "A"  # Too short
        }
        
        response = self.client.post(
            "/projects/create",
            json=project_data,
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 422  # Validation error

    def test_create_project_without_auth(self):
        """Test project creation without authentication"""
        project_data = {
            "name": "Test Project"
        }
        
        response = self.client.post("/projects/create", json=project_data)
        assert response.status_code == 401

    def test_file_upload_success(self):
        """Test successful file upload"""
        # Create test CSV content
        csv_content = "feature1,feature2,label\n1,2,A\n3,4,B\n5,6,C"
        
        with patch('main_simple.os.path.exists', return_value=True), \
             patch('main_simple.os.makedirs'), \
             patch('builtins.open', create=True) as mock_open:
            
            # Mock file writing
            mock_open.return_value.__enter__.return_value.write = MagicMock()
            
            files = {"file": ("test.csv", csv_content, "text/csv")}
            
            response = self.client.post(
                "/projects/test-project-id/data",
                files=files
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["filename"] == "test.csv"
            assert data["size"] > 0

    def test_invitation_validation_success(self):
        """Test successful invitation code validation"""
        # Setup test invitation code
        test_code = "BETA-TEST-123"
        invitation_manager.active_codes[test_code] = {
            'created': datetime.now().isoformat(),
            'max_uses': 100,
            'current_uses': 0,
            'expires': datetime.now().isoformat(),
            'description': 'Test code',
            'active': True
        }
        
        invitation_data = {"code": test_code}
        
        response = self.client.post("/auth/validate-invitation", json=invitation_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "session_token" in data
        assert data["message"] == "Welcome to AI TrainEasy Beta!"

    def test_invitation_validation_invalid_code(self):
        """Test invitation validation with invalid code"""
        invitation_data = {"code": "INVALID-CODE"}
        
        response = self.client.post("/auth/validate-invitation", json=invitation_data)
        
        assert response.status_code == 401
        assert "Invalid invitation code" in response.json()["detail"]


class TestInvitationSystem:
    """Tests specifically for the invitation system"""
    
    def test_invitation_manager_initialization(self):
        """Test invitation manager initializes correctly"""
        assert len(invitation_manager.active_codes) > 0
        assert "BETA-2025-EARLY" in invitation_manager.active_codes

    def test_code_validation_logic(self):
        """Test invitation code validation logic"""
        # Test valid code
        validation = invitation_manager.validate_code("BETA-2025-EARLY")
        assert validation["valid"] == True
        
        # Test invalid code
        validation = invitation_manager.validate_code("INVALID-CODE")
        assert validation["valid"] == False
        
        # Test empty code
        validation = invitation_manager.validate_code("")
        assert validation["valid"] == False


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])