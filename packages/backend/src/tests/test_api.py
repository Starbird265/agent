import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch('services.project.create_project')
def test_create_project_validation(mock_create):
    # Test missing name field
    response = client.post("/projects/create", json={})
    assert response.status_code == 422
    assert "name" in response.text

    # Test invalid name length
    response = client.post("/projects/create", json={"name": "ab"})
    assert response.status_code == 400
    assert "Minimum 3 characters" in response.text

@patch('services.training.start_training')
def test_training_endpoint_errors(mock_train):
    # Test invalid CPU percentage
    response = client.post("/projects/123/train", json={"cpu_percent": 150})
    assert response.status_code == 422

    # Test server error handling
    mock_train.side_effect = Exception("Training failed")
    response = client.post("/projects/123/train", json={"cpu_percent": 80})
    assert response.status_code == 500
    assert "Internal server error" in response.json()["detail"]

@patch('services.prediction.predict')
def test_prediction_validation(mock_predict):
    # Test empty inputs array
    response = client.post("/projects/123/predict", json={"inputs": []})
    assert response.status_code == 400
    assert "empty" in response.text.lower()

    # Test invalid input structure
    response = client.post("/projects/123/predict", json={"inputs": [{"invalid": 1}]})
    assert response.status_code == 422

def test_authentication_errors():
    # Test protected routes without auth
    response = client.post("/projects/123/schema", json={})
    assert response.status_code == 401

    response = client.get("/projects/123/logs")
    assert response.status_code == 401

@patch('services.data.validate_schema')
def test_schema_validation_failure(mock_validate):
    mock_validate.return_value = {"valid": False, "errors": ["Invalid field type"]}
    response = client.post("/projects/123/schema", json={})
    assert response.status_code == 400
    assert "Invalid field type" in response.text