import React, { useState, useEffect } from 'react';
import IntentCapture from './components/Nitrix/IntentCapture';
import PipelineOrchestrator from './components/Nitrix/PipelineOrchestrator';
import ModelDashboard from './components/Nitrix/ModelDashboard';
import { localDB } from './lib/localDB';
import './App.css';

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
    // Simulate the automated pipeline orchestration
    // In reality, this would trigger the backend orchestrator
    console.log('🚀 Starting automated training for:', pipeline.userIntent);
    
    // Update pipeline status
    await localDB.updateProject(pipeline.id, {
      status: 'training',
      startedAt: new Date().toISOString()
    });

    // This would typically trigger the backend pipeline
    // For demo purposes, we'll simulate the process
    simulateAutomatedPipeline(pipeline);
  };

  const simulateAutomatedPipeline = async (pipeline) => {
    // Simulate pipeline stages
    const stages = [
      { name: 'Data Ingestion', duration: 2000 },
      { name: 'Preprocessing', duration: 3000 },
      { name: 'Model Selection', duration: 1000 },
      { name: 'Training', duration: 10000 },
      { name: 'Evaluation', duration: 2000 },
      { name: 'Deployment', duration: 3000 }
    ];

    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, stage.duration));
      console.log(`✅ ${stage.name} completed`);
      
      // Update progress in real-time
      await localDB.updateProject(pipeline.id, {
        currentStage: stage.name,
        progress: ((stages.indexOf(stage) + 1) / stages.length) * 100
      });
      
      // Refresh the models list
      await loadUserModels();
    }

    // Mark as completed and deployed
    await localDB.updateProject(pipeline.id, {
      status: 'deployed',
      completedAt: new Date().toISOString(),
      apiEndpoint: `https://api.nitrix.ai/models/${pipeline.id}`,
      sdkSnippet: generateSDKSnippet(pipeline)
    });

    await loadUserModels();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Nitrix</h2>
          <p className="text-gray-600 mb-4">AI Training as a Service</p>
          <div className="text-sm text-gray-500">
            <p>🚀 Initializing automated ML platform...</p>
            <p>✨ No IDEs. No YAMLs. Zero DevOps.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg width="40" height="40" fill="none" viewBox="0 0 40 40" className="drop-shadow-sm">
                    <circle cx="20" cy="20" r="20" fill="url(#nitrixGradient)" />
                    <path d="M12 14l8 12 8-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="20" cy="20" r="3" fill="#fff" />
                    <defs>
                      <linearGradient id="nitrixGradient" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Nitrix</h1>
                  <p className="text-sm text-gray-500">AI Training as a Service</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm font-medium text-gray-700">Service Active</span>
              </div>
              <div className="text-sm text-gray-500">
                Welcome, {user.name}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'dashboard'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'create'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Model
            </button>
            <button
              onClick={() => setCurrentView('orchestrator')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'orchestrator'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Training Queue ({trainingQueue.length})
            </button>
            <button
              onClick={() => setCurrentView('models')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'models'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Models ({activeModels.length})
            </button>
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