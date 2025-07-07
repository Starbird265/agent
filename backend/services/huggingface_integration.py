import requests
from typing import Optional
from pathlib import Path
from model_registry_service import ModelRegistry, ModelMetadata
from huggingface_hub import hf_hub_download
import hashlib
import json

class HuggingFaceIntegration:
    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.base_url = "https://huggingface.co/api/models"

    def download_model(self, repo_id: str, filename: str = "pytorch_model.bin", revision: Optional[str] = None) -> str:
        try:
            model_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                revision=revision,
                cache_dir="./cache"
            )
            
            with open(model_path, "rb") as f:
                model_bytes = f.read()

            metadata = self._get_model_metadata(repo_id)
            model_metadata = ModelMetadata(
                name=repo_id.split('/')[-1],
                version=metadata.get('sha', 'latest'),
                framework="PyTorch",
                task_type=metadata.get('pipeline_tag', 'unknown'),
                description=metadata.get('description', ''),
                huggingface_url=f"https://huggingface.co/{repo_id}"
            )

            return self.registry.save_model(model_bytes, model_metadata)

        except Exception as e:
            raise RuntimeError(f"Failed to download model: {str(e)}")

    def _get_model_metadata(self, repo_id: str) -> dict:
        url = f"{self.base_url}/{repo_id}"
        response = requests.get(url, timeout=30, verify=True)
        response.raise_for_status()
        return response.json()

    def validate_model(self, model_name: str, version: str) -> bool:
        try:
            _, metadata = self.registry.load_model(model_name, version)
            if metadata['huggingface_url']:
                current_sha = metadata['version']
                remote_sha = self._get_model_metadata(metadata['name'])['sha']
                return current_sha == remote_sha
            return True
        except Exception:
            return False

    def list_available_models(self, search_query: Optional[str] = None) -> list:
        params = {"search": search_query} if search_query else {}
        response = requests.get(self.base_url, params=params, timeout=30, verify=True)
        response.raise_for_status()
        return response.json()