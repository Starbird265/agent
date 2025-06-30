# ok, so fix them 
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, mock_open
from backend.backend.main import app, ProcessManager

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_dependencies():
    with patch('subprocess.Popen') as mock_popen, \
         patch('GPUtil.getGPUs') as mock_gpus, \
         patch('psutil.cpu_percent'), \
         patch('psutil.virtual_memory') as mock_mem, \
         patch('os.path.exists') as mock_exists, \
         patch('os.listdir') as mock_listdir, \
         patch('os.makedirs') as mock_makedirs, \
         patch('builtins.open', mock_open(read_data='{"mock": "data"}')):
        
        mock_popen.return_value = Mock(pid=1234)
        mock_gpus.return_value = [Mock(id=0, name='Test GPU')]
        mock_mem.return_value = Mock(total=8589934592, percent=30)
        mock_exists.side_effect = lambda path: 'schema.json' in path
        mock_listdir.return_value = ['test-project.json']
        mock_makedirs.return_value = None
        yield

@pytest.mark.parametrize('gpu_count,expected', [(1, True), (0, False)])
def test_system_info(gpu_count, expected, client, mock_dependencies):
    mock_dependencies['mock_gpus'].return_value = [Mock()]*gpu_count
    response = client.get("/system-info")
    assert response.status_code == 200
    assert response.json()['gpu_available'] == expected
    assert isinstance(response.json()['cpu_usage'], float)
    assert isinstance(response.json()['memory_usage'], float)


def test_gpu_required_validation(client, mock_dependencies):
    # Test config requiring GPU when none available
    mock_dependencies['mock_gpus'].return_value = []
    response = client.post("/train/start", json={
        "config": {
            "gpu_required": True,
            "epochs": 10
        }
    })
    assert response.status_code == 422
    assert "GPU required but not available" in response.json()['detail']

    # Test invalid GPU index
    mock_dependencies['mock_gpus'].return_value = [Mock(id=0)]
    response = client.post("/train/start", json={
        "config": {
            "gpu_id": 1,
            "epochs": 10
        }
    })
    assert response.status_code == 422
    assert "Invalid GPU index" in response.json()['detail']

@patch.object(ProcessManager, 'start_training')
def test_start_training(mock_start, client):
    mock_start.return_value = 'test-project'
    response = client.post("/train/start", json={"config": {}})
    assert response.status_code == 200
    assert response.json()['project_id'] == 'test-project'

@patch.object(ProcessManager, 'pause_training')
def test_pause_training(mock_pause, client):
    response = client.post("/train/test-project", json={"action": "pause"})
    assert response.status_code == 200
    mock_pause.assert_called_with('test-project')

@patch.object(ProcessManager, 'resume_training')
def test_resume_training(mock_resume, client):
    response = client.put("/train/test-project", json={"action": "resume"})
    assert response.status_code == 200
    mock_resume.assert_called_with('test-project')


def test_resume_non_paused_process(client):
    response = client.post("/train/non-existent-project/resume")
    assert response.status_code == 404
    assert 'not found' in response.json()['detail']

    # Test resume on running (non-paused) project
    response = client.post("/train/test-project/resume")
    assert response.status_code == 409
    assert 'not paused' in response.json()['detail']


def test_invalid_state_transitions(client):
    # Test pause on non-existent project
    response = client.post("/train/missing-project", json={"action": "pause"})
    assert response.status_code == 404

    # Test invalid action type
    response = client.post("/train/test-project", json={"action": "invalid"})
    assert response.status_code == 422

    # Test duplicate resume request
    with patch.object(ProcessManager, 'resume_training', side_effect=ConflictError('Already running')):
        response = client.put("/train/test-project", json={"action": "resume"})
        assert response.status_code == 409

    # Test invalid HTTP method
    response = client.get("/train/test-project")
    assert response.status_code == 405

@patch.object(ProcessManager, 'start_training', side_effect=RuntimeError('Concurrent training forbidden'))
def test_concurrent_training_sessions(mock_start, client):
    response = client.post("/train/start", json={"config": {}})
    assert response.status_code == 200
    
    # Second attempt should conflict
    response = client.post("/train/start", json={"config": {}})
    assert response.status_code == 409
    assert 'already running' in response.json()['detail']

def test_invalid_cpu_limit(client):
    response = client.post("/train/start", json={"config": {"cpu_percent": 150}})
    assert response.status_code == 422
    detail = response.json()['detail'][0]
    assert detail['loc'] == ['body', 'config', 'cpu_percent']
    assert 'less than or equal to 100' in detail['msg']

@patch('os.path.exists')
def test_duplicate_training_process(mock_exists, client):
    mock_exists.return_value = True
    response = client.post("/train/start", json={"config": {"cpu_percent": 50}})
    assert response.status_code == 409
    assert 'already exists' in response.json()['detail']

@patch.object(ProcessManager, 'start_training', side_effect=ValueError('Conflict'))
def test_training_conflict_error(mock_start, client):
    response = client.post("/train/start", json={"config": {}})
    assert response.status_code == 409
    assert 'Conflict' in response.json()['detail']

@patch('os.listdir')
def test_missing_project(mock_listdir, client):
    mock_listdir.return_value = []
    # Test all state change endpoints
    response = client.post("/train/missing-project", json={"action": "pause"})
    assert response.status_code == 404
    response = client.put("/train/missing-project", json={"action": "resume"})
    assert response.status_code == 404
    
    # Test various endpoints with invalid project
    response = client.get("/train/missing-project/logs")
    assert response.status_code == 404
    
    response = client.post("/train/missing-project/pause")
    assert response.status_code == 404
    
    response = client.put("/train/missing-project", json={"action": "resume"})
    assert response.status_code == 404
    
    assert 'does not exist' in response.text.lower()


@patch.object(ProcessManager, 'validate_config')
def test_training_config_validation(mock_validate, client):
    mock_validate.return_value = True
    response = client.post("/train/start", json={"config": {"epochs": 10}})
    assert response.status_code == 200
    assert mock_validate.called