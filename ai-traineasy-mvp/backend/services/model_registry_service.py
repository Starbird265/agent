from pathlib import Path
from datetime import datetime
from typing import Dict, Optional
import hashlib
import json
from pydantic import BaseModel

class ModelMetadata(BaseModel):
    name: str
    version: str
    framework: str
    task_type: str
    description: Optional[str] = None
    author: Optional[str] = None
    huggingface_url: Optional[str] = None

class ModelRegistry:
    def __init__(self, storage_root: str = "models"):
        self.storage_path = Path(storage_root)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
    def _get_model_path(self, model_name: str, version: str) -> Path:
        return self.storage_path / f"{model_name}_v{version}"

    def save_model(self, 
                  model_bytes: bytes,
                  metadata: ModelMetadata) -> str:
        model_dir = self._get_model_path(metadata.name, metadata.version)
        model_dir.mkdir(exist_ok=True)
        
        # Save model binary
        with open(model_dir / "model.bin", "wb") as f:
            f.write(model_bytes)
        
        # Generate checksum
        checksum = hashlib.sha256(model_bytes).hexdigest()
        
        # Save metadata
        metadata_dict = metadata.dict()
        metadata_dict["created_at"] = datetime.utcnow().isoformat()
        metadata_dict["checksum"] = checksum
        
        with open(model_dir / "metadata.json", "w") as f:
            json.dump(metadata_dict, f, indent=2)
            
        return str(model_dir)

    def load_model(self, model_name: str, version: str) -> tuple[bytes, Dict]:
        model_dir = self._get_model_path(model_name, version)
        
        if not model_dir.exists():
            raise FileNotFoundError(f"Model {model_name} version {version} not found")
            
        with open(model_dir / "model.bin", "rb") as f:
            model_bytes = f.read()
            
        with open(model_dir / "metadata.json", "r") as f:
            metadata = json.load(f)
            
        # Verify checksum
        current_checksum = hashlib.sha256(model_bytes).hexdigest()
        if current_checksum != metadata["checksum"]:
            raise ValueError("Model checksum mismatch - possible corruption")
            
        return model_bytes, metadata

    def list_models(self) -> list[Dict]:
        return [
            json.loads((model_dir / "metadata.json").read_text())
            for model_dir in self.storage_path.glob("*_v*")
            if (model_dir / "metadata.json").exists()
        ]