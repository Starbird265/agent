import logging
from threading import Lock
from typing import Dict, Optional
from .validation import TrainingConfig
from train_model import run_training

logger = logging.getLogger(__name__)

class ProcessManager:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance.active_processes: Dict[str, dict] = {}
                cls._instance.process_lock = Lock()
            return cls._instance

    def start_training(self, config: TrainingConfig) -> str:
        with self.process_lock:
            if config.project_id in self.active_processes:
                raise ValueError('Training already running for project')

            try:
                process = run_training(
                    project_id=config.project_id,
                    cpu_percent=config.cpu_percent,
                    use_gpu=config.use_gpu
                )
                self.active_processes[config.project_id] = {
                    'process': process,
                    'paused': False
                }
                return config.project_id
            except Exception as e:
                logger.error(f'Failed to start training: {str(e)}')
                raise

    def pause_training(self, project_id: str) -> None:
        with self.process_lock:
            if process_info := self.active_processes.get(project_id):
                process_info['process'].pause()
                process_info['paused'] = True

    def resume_training(self, project_id: str) -> None:
        with self.process_lock:
            if project_id not in self.active_processes:
                raise KeyError('No active training session')
            
            process_info = self.active_processes[project_id]
            if not process_info['paused']:
                raise ValueError('Training session not in paused state')
            
            process_info['process'].resume()
            process_info['paused'] = False

    def cleanup(self, project_id: str) -> None:
        with self.process_lock:
            if process_info := self.active_processes.pop(project_id, None):
                try:
                    process_info['process'].terminate()
                except Exception as e:
                    logger.warning(f'Cleanup failed for {project_id}: {str(e)}')

    def __del__(self):
        with self.process_lock:
            for pid, process_info in self.active_processes.items():
                try:
                    process_info['process'].terminate()
                except Exception as e:
                    logger.warning(f'Shutdown cleanup failed for {pid}: {str(e)}')