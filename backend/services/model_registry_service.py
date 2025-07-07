from pathlib import Path
import os
import requests
from datetime import datetime
from typing import Dict, Optional
import hashlib
import json
from pydantic import BaseModel
from huggingface_hub import HfApi, Repository

class ModelMetadata(BaseModel):
    name: str
    version: str
    framework: str
    task_type: str
    description: Optional[str] = None
    author: Optional[str] = None
    remote_repo: Optional[str] = None
    huggingface_url: Optional[str] = None

class ModelRegistry:
    def __init__(self, storage_root: str = "models"):
        from dotenv import load_dotenv
        load_dotenv()
        self.hf_api_key = os.getenv('HUGGINGFACEHUB_API_KEY')
        from huggingface_hub import HfApi
        self.hf_api = HfApi()
        self.hf_api.token = self.hf_api_key
        if not self.hf_api_key:
            raise ValueError("HUGGINGFACEHUB_API_KEY not found in environment variables")
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

    def push_to_hub(self, model_name: str, version: str, repo_name: str, private: bool = True):
        model_dir = self._get_model_path(model_name, version)
        if not model_dir.exists():
            raise FileNotFoundError(f"Model {model_name} version {version} not found locally")

        try:
            repo_url = self.hf_api.create_repo(
                repo_id=repo_name,
                private=private,
                exist_ok=True
            )
            repo = Repository(local_dir=str(model_dir), clone_from=repo_url)
            repo.push_to_hub()

            # Update metadata with remote repo info
            metadata_path = model_dir / "metadata.json"
            metadata = json.loads(metadata_path.read_text())
            metadata["remote_repo"] = repo_name
            metadata_path.write_text(json.dumps(metadata, indent=2))

            return repo_url

        except requests.HTTPError as e:
            raise RuntimeError(f"Failed to push model to Hub: {str(e)}") from e

    def pull_from_hub(self, repo_name: str, version: str):
        try:
            model_dir = self.storage_path / repo_name.split('/')[-1]
            Repository(local_dir=str(model_dir), clone_from=f"{repo_name}")
            
            # Verify and update local registry
            metadata_path = model_dir / "metadata.json"
            if not metadata_path.exists():
                raise ValueError("Invalid Hugging Face repository - missing metadata")
                
            return str(model_dir)

        except ValueError as e:
            raise RuntimeError(f"Failed to pull model from Hub: {str(e)}") from e