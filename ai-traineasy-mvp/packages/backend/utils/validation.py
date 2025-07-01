from pydantic import BaseModel, confloat, conint, validator
from fastapi import HTTPException
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class TrainingConfig(BaseModel):
    project_id: str
    cpu_percent: confloat(ge=10, le=100)
    use_gpu: bool
    max_duration: conint(ge=60) = 3600


def validate_training_request(config: TrainingConfig):
    try:
        return config.model_dump(exclude_unset=True)
    except ValueError as e:
        logger.error(f'Validation error: {str(e)}')
        raise HTTPException(
            status_code=422,
            detail={'loc': ['body'], 'msg': str(e), 'type': 'value_error'}
        ) from e