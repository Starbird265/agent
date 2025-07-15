import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from backend.worker import WorkerManager
import temporal_config

@pytest.mark.asyncio
async def test_worker_lifecycle():
    """Test full worker startup and shutdown sequence"""
    manager = WorkerManager()
    
    with patch('backend.worker.Client.connect', AsyncMock()) as mock_connect:
        mock_connect.return_value = MagicMock()
        await manager.start()
        
        assert manager.client is not None
        assert manager.running is True
        
        await manager.stop()
        assert manager.running is False

@pytest.mark.asyncio
async def test_health_check():
    """Test health check returns valid status"""
    manager = WorkerManager()
    health = await manager.health_check()
    
    assert 'status' in health
    assert 'timestamp' in health
    assert health['task_queue'] == temporal_config.task_queue

@pytest.mark.asyncio
async def test_error_handling():
    """Test proper error handling during worker startup"""
    manager = WorkerManager()
    
    with patch('backend.worker.Client.connect', AsyncMock(side_effect=ConnectionError)):
        with pytest.raises(SystemExit):
            await manager.start()
    
    assert manager.running is False

@pytest.mark.asyncio
async def test_signal_handling(mocker):
    """Test signal handlers properly initiate shutdown"""
    manager = WorkerManager()
    mocker.patch.object(manager, 'stop', AsyncMock())
    
    # Simulate SIGTERM signal
    manager.signal_handler(signal.SIGTERM, None)
    await asyncio.sleep(0.1)
    
    manager.stop.assert_awaited_once()