import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import IntentCapture from './components/Nitrix/IntentCapture';
import PipelineOrchestrator from './components/Nitrix/PipelineOrchestrator';
import ModelDashboard from './components/Nitrix/ModelDashboard';
import { localDB } from './lib/localDB';
import { realMLEngine } from './lib/realMLEngine';
import ModernButton from './components/UI/ModernButton';
import './index.css';

/**
 * NITRIX - AI Training as a Service
 * "Empower anyone to spin up custom AI models by simply describing their use-case. 
 * No IDEs. No YAMLs. Zero DevOps."
 */
function NitrixApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState({ name: 'Developer', id: 'local-user' });
  const [activeModels, setActiveModels] = useState([]);
  const [trainingQueue, setTrainingQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeNitrix();
  }, []);

  const initializeNitrix = async () => {
    try {
      await localDB.init();
      await loadUserModels();
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize Nitrix:', error);
      setLoading(false);
    }
  };

  const loadUserModels = async () => {
    try {
      const projects = await localDB.getProjects();
      const models = projects.filter(p => p.status === 'deployed' || p.status === 'training');
      setActiveModels(models);
      
      const training = projects.filter(p => p.status === 'training');
      setTrainingQueue(training);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleNewIntent = async (intentData) => {
    try {
      // Transform user intent into a training pipeline
      const pipeline = await createPipelineFromIntent(intentData);
      
      // Start the automated training process
      await startAutomatedTraining(pipeline);
      
      // Refresh the dashboard
      await loadUserModels();
      
      // Switch to orchestrator view to show progress
      setCurrentView('orchestrator');
    } catch (error) {
      console.error('Failed to process intent:', error);
    }
  };

  const createPipelineFromIntent = async (intent) => {
    // This is where the magic happens - transform natural language to ML pipeline
    const pipeline = {
      id: `pipeline_${Date.now()}`,
      userIntent: intent.description,
      useCase: intent.useCase,
      dataSource: intent.dataSource,
      targetMetrics: intent.targetMetrics,
      template: selectPipelineTemplate(intent.useCase),
      status: 'created',
      created: new Date().toISOString()
    };

    // Save pipeline configuration
    await localDB.createProject({
      ...pipeline,
      name: intent.name || `${intent.useCase} Model`,
      type: 'automated-pipeline'
    });

    return pipeline;
  };

  const selectPipelineTemplate = (useCase) => {
    const templates = {
      'text-generation': {
        model: 'gpt-style-fine-tune',
        preprocessing: ['text-cleaning', 'tokenization'],
        training: ['fine-tuning', 'evaluation'],
        deployment: ['containerization', 'api-endpoint']
      },
      'speech-to-text': {
        model: 'whisper-fine-tune',
        preprocessing: ['audio-segmentation', 'feature-extraction'],
        training: ['transfer-learning', 'validation'],
        deployment: ['real-time-inference', 'batch-processing']
      },
      'image-generation': {
        model: 'stable-diffusion-fine-tune',
        preprocessing: ['image-resize', 'augmentation'],
        training: ['diffusion-training', 'quality-check'],
        deployment: ['gpu-inference', 'cdn-delivery']
      },
      'classification': {
        model: 'transformer-classification',
        preprocessing: ['data-cleaning', 'feature-engineering'],
        training: ['supervised-learning', 'cross-validation'],
        deployment: ['lightweight-inference', 'batch-prediction']
      }
    };

    return templates[useCase] || templates['classification'];
  };

  const startAutomatedTraining = async (pipeline) => {
    // REAL ML TRAINING - No more simulation!
    console.log('🚀 Starting REAL automated training for:', pipeline.userIntent);
    
    // Update pipeline status
    await localDB.updateProject(pipeline.id, {
      status: 'training',
      startedAt: new Date().toISOString()
    });

    // Start real ML training pipeline
    await executeRealMLPipeline(pipeline);
  };

  const executeRealMLPipeline = async (pipeline) => {
    try {
      // Stage 1: Data Ingestion
      await localDB.updateProject(pipeline.id, {
        currentStage: 'Data Ingestion',
        progress: 10
      });
      await loadUserModels();

      // Get the project data
      const project = await localDB.getProject(pipeline.id);
      if (!project.files || project.files.length === 0) {
        throw new Error('No training data found');
      }

      // Stage 2: Dataset Preprocessing
      await localDB.updateProject(pipeline.id, {
        currentStage: 'Dataset Analysis',
        progress: 25
      });
      await loadUserModels();

      // Load and preprocess the dataset
      const csvText = localStorage.getItem(`csvData_${pipeline.id}`);
      if (!csvText) {
        throw new Error('No CSV data found for this project');
      }
      
      // Determine target column (for now, assume last column)
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      const targetColumn = headers[headers.length - 1];

      console.log('🔍 Preprocessing dataset with target:', targetColumn);

      // Stage 3: Real ML Analysis
      await localDB.updateProject(pipeline.id, {
        currentStage: 'Model Training',
        progress: 40
      });
      await loadUserModels();

      // Analyze dataset with real ML
      const dataInfo = await realMLEngine.preprocessDataset(csvText, targetColumn);
      console.log('📊 Dataset analysis complete:', dataInfo);

      // Stage 4: Real Model Training
      const progressCallback = async (trainingProgress) => {
        await localDB.updateProject(pipeline.id, {
          currentStage: `Training (Epoch ${trainingProgress.metrics.epoch}/${trainingProgress.metrics.totalEpochs})`,
          progress: 50 + (trainingProgress.progress * 0.4), // 50-90% for training
          trainingMetrics: trainingProgress.metrics
        });
        await loadUserModels();
      };

      console.log('🧠 Starting real neural network training...');
      const trainingResult = await realMLEngine.trainModel(dataInfo, progressCallback);

      // Stage 5: Model Evaluation
      await localDB.updateProject(pipeline.id, {
        currentStage: 'Model Evaluation',
        progress: 92
      });
      await loadUserModels();

      // Get model metrics
      const modelMetrics = realMLEngine.getModelMetrics();
      console.log('📈 Model training complete:', modelMetrics);

      // Stage 6: Model Deployment
      await localDB.updateProject(pipeline.id, {
        currentStage: 'Model Deployment',
        progress: 95
      });
      await loadUserModels();

      // Save the trained model
      const modelId = `model_${pipeline.id}`;
      const modelMetadata = {
        projectId: pipeline.id,
        name: project.name,
        type: dataInfo.problemType,
        accuracy: modelMetrics.finalValAccuracy,
        loss: modelMetrics.finalValLoss,
        features: dataInfo.features,
        target: dataInfo.target,
        dataInfo: dataInfo,
        trainingResult: trainingResult
      };

      await realMLEngine.saveModel(modelId, modelMetadata);

      // Mark as completed and deployed
      await localDB.updateProject(pipeline.id, {
        status: 'deployed',
        completedAt: new Date().toISOString(),
        progress: 100,
        modelId: modelId,
        modelMetrics: modelMetrics,
        apiEndpoint: `local://models/${modelId}`,
        realModel: true, // Flag to indicate this is a real trained model
        sdkSnippet: generateRealSDKSnippet(pipeline, modelId)
      });

      console.log('✅ Real ML training pipeline completed successfully!');
      await loadUserModels();

    } catch (error) {
      console.error('❌ Real ML training failed:', error);
      
      // Mark as failed
      await localDB.updateProject(pipeline.id, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });
      await loadUserModels();
    }
  };

  const generateSDKSnippet = (pipeline) => {
    return `
// Nitrix Auto-Generated SDK
import { NitrixClient } from '@nitrix/sdk';

const client = new NitrixClient('${pipeline.id}');

// Use your trained model
const result = await client.predict({
  input: "Your input data here"
});

console.log(result);
`;
  };

  const generateRealSDKSnippet = (pipeline, modelId) => {
    return `
// Nitrix Real ML SDK - Trained Model Ready!
import { realMLEngine } from './lib/realMLEngine';
import { localDB } from './lib/localDB';

// Load your trained model
const modelMetadata = await localDB.getModel('${modelId}');
await realMLEngine.loadModel('${modelId}');

// Make real predictions
const prediction = await realMLEngine.predict({
  // Your input features here
  feature1: 'value1',
  feature2: 'value2'
}, modelMetadata);

console.log('Real prediction:', prediction);
// Output: { type: 'classification', predictedClass: 0, confidence: 85, probabilities: [85, 15] }
`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Nitrix</h2>
          <p className="text-lg text-gray-600 mb-4 font-medium">Train Smarter AI—No Cloud, No Code, Just Power</p>
          <div className="text-sm text-gray-500">
            <p>🚀 Initializing your private ML platform...</p>
            <p>✨ Everything stays on your device. Zero technical knowledge needed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
      {/* Enhanced Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <motion.svg 
                    width="48" 
                    height="48" 
                    fill="none" 
                    viewBox="0 0 48 48" 
                    className="drop-shadow-lg"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <circle cx="24" cy="24" r="24" fill="url(#nitrixGradient)" />
                    <path d="M15 18l9 12 9-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="24" cy="24" r="4" fill="#fff" />
                    <defs>
                      <linearGradient id="nitrixGradient" x1="0" y1="0" x2="48" y2="48">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="50%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Nitrix
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">Train Smarter AI—No Cloud, No Code, Just Power</p>
                </div>
              </div>
            </motion.div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <motion.div 
                  className="w-2 h-2 rounded-full bg-green-400"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-sm font-medium text-gray-700">Service Active</span>
              </div>
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-semibold text-purple-600">{user.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                  {activeModels.length} Models
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                  {trainingQueue.length} Training
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 py-4">
            <ModernButton
              variant={currentView === 'dashboard' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('dashboard')}
              icon="📊"
            >
              Dashboard
            </ModernButton>
            <ModernButton
              variant={currentView === 'create' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('create')}
              icon="✨"
            >
              Create Model
            </ModernButton>
            <ModernButton
              variant={currentView === 'orchestrator' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('orchestrator')}
              icon="⚙️"
            >
              Training Queue ({trainingQueue.length})
            </ModernButton>
            <ModernButton
              variant={currentView === 'models' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('models')}
              icon="🤖"
            >
              Active Models ({activeModels.length})
            </ModernButton>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <ModelDashboard 
            activeModels={activeModels}
            trainingQueue={trainingQueue}
            onCreateNew={() => setCurrentView('create')}
            onRefresh={loadUserModels}
          />
        )}
        
        {currentView === 'create' && (
          <IntentCapture 
            onIntentSubmit={handleNewIntent}
            onCancel={() => setCurrentView('dashboard')}
          />
        )}
        
        {currentView === 'orchestrator' && (
          <PipelineOrchestrator 
            trainingQueue={trainingQueue}
            onRefresh={loadUserModels}
          />
        )}
        
        {currentView === 'models' && (
          <ModelDashboard 
            activeModels={activeModels}
            trainingQueue={[]}
            showOnlyActive={true}
            onCreateNew={() => setCurrentView('create')}
            onRefresh={loadUserModels}
          />
        )}
      </main>
    </div>
  );
}

export default NitrixApp;