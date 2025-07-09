"""
ML TRAINING WORKFLOW
Temporal workflow for orchestrating machine learning training processes
"""

import asyncio
import json
from datetime import timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from temporalio import workflow, activity
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError

import logging
logger = logging.getLogger(__name__)

@dataclass
class TrainingRequest:
    """Training request data structure"""
    model_id: str
    user_id: str
    dataset_path: str
    model_type: str
    training_params: Dict[str, Any]
    validation_split: float = 0.2
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001

@dataclass
class TrainingResult:
    """Training result data structure"""
    model_id: str
    status: str
    accuracy: float
    loss: float
    training_time: float
    model_path: str
    metrics: Dict[str, Any]
    error: Optional[str] = None

# Workflow Definition
@workflow.defn
class MLTrainingWorkflow:
    """Main ML training workflow"""
    
    @workflow.run
    async def run(self, training_request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the complete ML training workflow
        
        Args:
            training_request: Training configuration and parameters
            
        Returns:
            Training results and metrics
        """
        workflow_id = workflow.info().workflow_id
        logger.info(f"Starting ML training workflow: {workflow_id}")
        
        try:
            # Parse training request
            request = TrainingRequest(**training_request)
            logger.info(f"Training request parsed for model: {request.model_id}")
            
            # Step 1: Validate training request
            validation_result = await workflow.execute_activity(
                validate_training_request,
                request,
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=RetryPolicy(maximum_attempts=3)
            )
            
            if not validation_result['valid']:
                raise ApplicationError(
                    f"Training request validation failed: {validation_result['errors']}"
                )
            
            # Step 2: Prepare training environment
            env_result = await workflow.execute_activity(
                prepare_training_environment,
                request,
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=RetryPolicy(maximum_attempts=2)
            )
            
            # Step 3: Load and preprocess data
            data_result = await workflow.execute_activity(
                load_and_preprocess_data,
                {
                    'dataset_path': request.dataset_path,
                    'validation_split': request.validation_split,
                    'model_type': request.model_type
                },
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=RetryPolicy(maximum_attempts=2)
            )
            
            # Step 4: Train the model
            training_result = await workflow.execute_activity(
                train_model,
                {
                    'request': request,
                    'preprocessed_data': data_result,
                    'environment': env_result
                },
                start_to_close_timeout=timedelta(hours=2),
                retry_policy=RetryPolicy(maximum_attempts=1)
            )
            
            # Step 5: Evaluate model performance
            evaluation_result = await workflow.execute_activity(
                evaluate_model,
                {
                    'model_path': training_result['model_path'],
                    'test_data': data_result['test_data'],
                    'model_type': request.model_type
                },
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=RetryPolicy(maximum_attempts=2)
            )
            
            # Step 6: Save model and cleanup
            save_result = await workflow.execute_activity(
                save_model_and_cleanup,
                {
                    'model_path': training_result['model_path'],
                    'model_id': request.model_id,
                    'user_id': request.user_id,
                    'metrics': evaluation_result
                },
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=RetryPolicy(maximum_attempts=3)
            )
            
            # Compile final results
            final_result = {
                'model_id': request.model_id,
                'status': 'completed',
                'accuracy': evaluation_result['accuracy'],
                'loss': evaluation_result['loss'],
                'training_time': training_result['training_time'],
                'model_path': save_result['final_model_path'],
                'metrics': evaluation_result,
                'workflow_id': workflow_id,
                'timestamp': workflow.now().isoformat()
            }
            
            logger.info(f"ML training workflow completed successfully: {workflow_id}")
            return final_result
            
        except Exception as e:
            logger.error(f"ML training workflow failed: {workflow_id} - {str(e)}")
            
            # Cleanup on failure
            await workflow.execute_activity(
                cleanup_on_failure,
                {
                    'model_id': training_request.get('model_id'),
                    'error': str(e)
                },
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=RetryPolicy(maximum_attempts=1)
            )
            
            return {
                'model_id': training_request.get('model_id'),
                'status': 'failed',
                'error': str(e),
                'workflow_id': workflow_id,
                'timestamp': workflow.now().isoformat()
            }

# Activity Definitions
@activity.defn
async def validate_training_request(request: TrainingRequest) -> Dict[str, Any]:
    """Validate training request parameters"""
    logger.info(f"Validating training request for model: {request.model_id}")
    
    errors = []
    
    # Validate model parameters
    if request.epochs <= 0 or request.epochs > 1000:
        errors.append("Epochs must be between 1 and 1000")
    
    if request.batch_size <= 0 or request.batch_size > 1000:
        errors.append("Batch size must be between 1 and 1000")
    
    if request.learning_rate <= 0 or request.learning_rate > 1:
        errors.append("Learning rate must be between 0 and 1")
    
    if request.validation_split <= 0 or request.validation_split >= 1:
        errors.append("Validation split must be between 0 and 1")
    
    # Validate file paths
    import os
    if not os.path.exists(request.dataset_path):
        errors.append(f"Dataset path does not exist: {request.dataset_path}")
    
    # Validate model type
    supported_models = ['regression', 'classification', 'neural_network']
    if request.model_type not in supported_models:
        errors.append(f"Unsupported model type: {request.model_type}")
    
    is_valid = len(errors) == 0
    
    logger.info(f"Training request validation: {'PASSED' if is_valid else 'FAILED'}")
    
    return {
        'valid': is_valid,
        'errors': errors,
        'model_id': request.model_id
    }

@activity.defn
async def prepare_training_environment(request: TrainingRequest) -> Dict[str, Any]:
    """Prepare the training environment"""
    logger.info(f"Preparing training environment for model: {request.model_id}")
    
    import os
    import tempfile
    
    # Create temporary directories for training
    temp_dir = tempfile.mkdtemp(prefix=f"training_{request.model_id}_")
    model_dir = os.path.join(temp_dir, "models")
    logs_dir = os.path.join(temp_dir, "logs")
    
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(logs_dir, exist_ok=True)
    
    environment = {
        'temp_dir': temp_dir,
        'model_dir': model_dir,
        'logs_dir': logs_dir,
        'model_id': request.model_id,
        'created_at': __import__('datetime').datetime.now().isoformat()
    }
    
    logger.info(f"Training environment prepared: {environment}")
    return environment

@activity.defn
async def load_and_preprocess_data(params: Dict[str, Any]) -> Dict[str, Any]:
    """Load and preprocess training data"""
    logger.info(f"Loading and preprocessing data from: {params['dataset_path']}")
    
    import pandas as pd
    import numpy as np
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    
    try:
        # Load data
        if params['dataset_path'].endswith('.csv'):
            data = pd.read_csv(params['dataset_path'])
        else:
            raise ValueError("Only CSV files are supported currently")
        
        # Basic data validation
        if data.empty:
            raise ValueError("Dataset is empty")
        
        if data.shape[0] < 10:
            raise ValueError("Dataset too small (minimum 10 rows required)")
        
        # Separate features and target
        # Assume last column is target for now
        X = data.iloc[:, :-1]
        y = data.iloc[:, -1]
        
        # Handle categorical variables
        categorical_columns = X.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col])
        
        # Handle target variable based on model type
        if params['model_type'] == 'classification':
            if y.dtype == 'object':
                le_target = LabelEncoder()
                y = le_target.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=params['validation_split'],
            random_state=42,
            stratify=y if params['model_type'] == 'classification' else None
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        result = {
            'train_data': {
                'X': X_train_scaled.tolist(),
                'y': y_train.tolist()
            },
            'test_data': {
                'X': X_test_scaled.tolist(),
                'y': y_test.tolist()
            },
            'feature_names': X.columns.tolist(),
            'target_name': y.name,
            'scaler_params': {
                'mean': scaler.mean_.tolist(),
                'scale': scaler.scale_.tolist()
            },
            'data_shape': {
                'train': X_train_scaled.shape,
                'test': X_test_scaled.shape
            }
        }
        
        logger.info(f"Data preprocessing completed. Train shape: {X_train_scaled.shape}, Test shape: {X_test_scaled.shape}")
        return result
        
    except Exception as e:
        logger.error(f"Data preprocessing failed: {str(e)}")
        raise ApplicationError(f"Data preprocessing failed: {str(e)}")

@activity.defn
async def train_model(params: Dict[str, Any]) -> Dict[str, Any]:
    """Train the ML model"""
    request = TrainingRequest(**params['request'])
    logger.info(f"Training model: {request.model_id} of type: {request.model_type}")
    
    import time
    import pickle
    import os
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.neural_network import MLPClassifier, MLPRegressor
    from sklearn.metrics import accuracy_score, mean_squared_error
    
    start_time = time.time()
    
    try:
        # Prepare training data
        X_train = np.array(params['preprocessed_data']['train_data']['X'])
        y_train = np.array(params['preprocessed_data']['train_data']['y'])
        
        # Select model based on type
        if request.model_type == 'classification':
            model = RandomForestClassifier(
                n_estimators=min(100, request.epochs * 10),
                random_state=42,
                max_depth=10,
                min_samples_split=5
            )
        elif request.model_type == 'regression':
            model = RandomForestRegressor(
                n_estimators=min(100, request.epochs * 10),
                random_state=42,
                max_depth=10,
                min_samples_split=5
            )
        elif request.model_type == 'neural_network':
            if len(np.unique(y_train)) < 10:  # Classification
                model = MLPClassifier(
                    hidden_layer_sizes=(100, 50),
                    max_iter=request.epochs,
                    learning_rate_init=request.learning_rate,
                    batch_size=min(request.batch_size, len(X_train)),
                    random_state=42
                )
            else:  # Regression
                model = MLPRegressor(
                    hidden_layer_sizes=(100, 50),
                    max_iter=request.epochs,
                    learning_rate_init=request.learning_rate,
                    batch_size=min(request.batch_size, len(X_train)),
                    random_state=42
                )
        else:
            raise ValueError(f"Unsupported model type: {request.model_type}")
        
        # Train the model
        logger.info(f"Starting training for {request.model_id}")
        model.fit(X_train, y_train)
        
        # Save model
        model_path = os.path.join(
            params['environment']['model_dir'],
            f"{request.model_id}_trained.pkl"
        )
        
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        training_time = time.time() - start_time
        
        # Quick validation on training data
        train_predictions = model.predict(X_train)
        
        if request.model_type == 'classification' or request.model_type == 'neural_network':
            train_score = accuracy_score(y_train, train_predictions)
        else:
            train_score = 1.0 - (mean_squared_error(y_train, train_predictions) / np.var(y_train))
        
        result = {
            'model_path': model_path,
            'training_time': training_time,
            'train_score': train_score,
            'model_type': request.model_type,
            'model_id': request.model_id
        }
        
        logger.info(f"Model training completed: {request.model_id}, Score: {train_score:.4f}, Time: {training_time:.2f}s")
        return result
        
    except Exception as e:
        logger.error(f"Model training failed: {str(e)}")
        raise ApplicationError(f"Model training failed: {str(e)}")

@activity.defn
async def evaluate_model(params: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate the trained model"""
    logger.info(f"Evaluating model: {params['model_path']}")
    
    import pickle
    import numpy as np
    from sklearn.metrics import accuracy_score, mean_squared_error, classification_report, confusion_matrix
    
    try:
        # Load model
        with open(params['model_path'], 'rb') as f:
            model = pickle.load(f)
        
        # Prepare test data
        X_test = np.array(params['test_data']['X'])
        y_test = np.array(params['test_data']['y'])
        
        # Make predictions
        predictions = model.predict(X_test)
        
        # Calculate metrics based on model type
        if params['model_type'] in ['classification', 'neural_network']:
            accuracy = accuracy_score(y_test, predictions)
            loss = 1.0 - accuracy
            
            # Additional classification metrics
            try:
                report = classification_report(y_test, predictions, output_dict=True)
                cm = confusion_matrix(y_test, predictions)
                
                additional_metrics = {
                    'classification_report': report,
                    'confusion_matrix': cm.tolist(),
                    'precision': report['weighted avg']['precision'],
                    'recall': report['weighted avg']['recall'],
                    'f1_score': report['weighted avg']['f1-score']
                }
            except:
                additional_metrics = {}
            
        else:  # regression
            mse = mean_squared_error(y_test, predictions)
            rmse = np.sqrt(mse)
            
            # R² score
            y_mean = np.mean(y_test)
            ss_tot = np.sum((y_test - y_mean) ** 2)
            ss_res = np.sum((y_test - predictions) ** 2)
            r2 = 1 - (ss_res / ss_tot)
            
            accuracy = max(0, r2)  # Use R² as accuracy measure
            loss = mse
            
            additional_metrics = {
                'mse': mse,
                'rmse': rmse,
                'r2_score': r2,
                'mae': np.mean(np.abs(y_test - predictions))
            }
        
        result = {
            'accuracy': accuracy,
            'loss': loss,
            'predictions_sample': predictions[:10].tolist(),
            'actual_sample': y_test[:10].tolist(),
            'test_size': len(y_test),
            'model_type': params['model_type'],
            **additional_metrics
        }
        
        logger.info(f"Model evaluation completed. Accuracy: {accuracy:.4f}, Loss: {loss:.4f}")
        return result
        
    except Exception as e:
        logger.error(f"Model evaluation failed: {str(e)}")
        raise ApplicationError(f"Model evaluation failed: {str(e)}")

@activity.defn
async def save_model_and_cleanup(params: Dict[str, Any]) -> Dict[str, Any]:
    """Save the final model and cleanup temporary files"""
    logger.info(f"Saving model and cleaning up: {params['model_id']}")
    
    import os
    import shutil
    import json
    
    try:
        # Create final model directory
        final_model_dir = os.path.join("models", params['user_id'])
        os.makedirs(final_model_dir, exist_ok=True)
        
        # Copy model to final location
        final_model_path = os.path.join(final_model_dir, f"{params['model_id']}.pkl")
        shutil.copy2(params['model_path'], final_model_path)
        
        # Save metadata
        metadata = {
            'model_id': params['model_id'],
            'user_id': params['user_id'],
            'created_at': __import__('datetime').datetime.now().isoformat(),
            'metrics': params['metrics'],
            'model_path': final_model_path
        }
        
        metadata_path = os.path.join(final_model_dir, f"{params['model_id']}_metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Cleanup temporary directory
        temp_dir = os.path.dirname(os.path.dirname(params['model_path']))
        if os.path.exists(temp_dir) and "training_" in temp_dir:
            shutil.rmtree(temp_dir)
        
        result = {
            'final_model_path': final_model_path,
            'metadata_path': metadata_path,
            'model_id': params['model_id'],
            'cleanup_completed': True
        }
        
        logger.info(f"Model saved and cleanup completed: {params['model_id']}")
        return result
        
    except Exception as e:
        logger.error(f"Model save and cleanup failed: {str(e)}")
        raise ApplicationError(f"Model save and cleanup failed: {str(e)}")

@activity.defn
async def cleanup_on_failure(params: Dict[str, Any]) -> Dict[str, Any]:
    """Cleanup resources on workflow failure"""
    logger.info(f"Cleaning up resources after failure: {params['model_id']}")
    
    import os
    import shutil
    import glob
    
    try:
        # Find and remove any temporary directories for this model
        temp_dirs = glob.glob(f"/tmp/training_{params['model_id']}_*")
        for temp_dir in temp_dirs:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        
        # Log the failure
        logger.error(f"Training failed for model {params['model_id']}: {params['error']}")
        
        return {
            'model_id': params['model_id'],
            'cleanup_completed': True,
            'error': params['error']
        }
        
    except Exception as e:
        logger.error(f"Cleanup on failure failed: {str(e)}")
        return {
            'model_id': params['model_id'],
            'cleanup_completed': False,
            'error': str(e)
        }

# Additional utility workflow for batch training
@workflow.defn
class BatchTrainingWorkflow:
    """Workflow for training multiple models in batch"""
    
    @workflow.run
    async def run(self, batch_request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute batch training workflow"""
        workflow_id = workflow.info().workflow_id
        logger.info(f"Starting batch training workflow: {workflow_id}")
        
        training_requests = batch_request.get('training_requests', [])
        results = []
        
        # Process each training request
        for i, request in enumerate(training_requests):
            try:
                # Start individual training workflow
                result = await workflow.execute_child_workflow(
                    MLTrainingWorkflow.run,
                    request,
                    id=f"training_{request['model_id']}_{i}",
                    task_queue="ai-traineasy-task-queue"
                )
                results.append(result)
                
            except Exception as e:
                logger.error(f"Batch training failed for request {i}: {str(e)}")
                results.append({
                    'model_id': request.get('model_id'),
                    'status': 'failed',
                    'error': str(e)
                })
        
        return {
            'batch_id': batch_request.get('batch_id'),
            'total_requests': len(training_requests),
            'results': results,
            'workflow_id': workflow_id,
            'completed_at': workflow.now().isoformat()
        }