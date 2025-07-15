import pytest
from unittest.mock import AsyncMock
from backend.worker import WorkerManager
from backend.temporal_config import temporal_config

@pytest.fixture
def worker_manager():
    return WorkerManager()

@pytest.mark.asyncio
async def test_worker_start_stop(worker_manager):
    try:
        await worker_manager.start()
        assert worker_manager.running is True
    finally:
        await worker_manager.stop()
        assert worker_manager.running is False

@pytest.mark.asyncio
async def test_health_check(worker_manager):
    health = await worker_manager.health_check()
    assert 'status' in health
    assert health['status'] in ['healthy', 'stopped', 'error']