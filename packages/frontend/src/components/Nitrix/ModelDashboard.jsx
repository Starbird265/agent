import React, { useState } from 'react';
import { motion } from 'framer-motion';
import RealModelPredictor from './RealModelPredictor';
import { localDB } from '../../lib/localDB';
import ModernCard from '../UI/ModernCard';
import ModernButton from '../UI/ModernButton';
import ProgressBar from '../UI/ProgressBar';

/**
 * Nitrix Model Dashboard
 * Shows deployed models, usage statistics, and management options
 * Focus on the end result - working AI models with API endpoints
 */
const ModelDashboard = ({ activeModels, trainingQueue, showOnlyActive = false, onCreateNew, onRefresh }) => {
  const [selectedModel, setSelectedModel] = useState(null);
  const [showSDK, setShowSDK] = useState(false);
  const [showPredictor, setShowPredictor] = useState(false);
  const [predictorModel, setPredictorModel] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'deployed': return 'bg-green-100 text-green-800 border-green-200';
      case 'training': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUseCaseIcon = (useCase) => {
    const icons = {
      'text-generation': '📝',
      'speech-to-text': '🎤',
      'image-generation': '🎨',
      'classification': '🏷️',
      'recommendation': '🎯',
      'forecasting': '📈'
    };
    return icons[useCase] || '🤖';
  };

  const generateCURLExample = (model) => {
    return `curl -X POST "${model.apiEndpoint || `https://api.nitrix.ai/models/${model.id}`}/predict" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "input": "Your input data here"
  }'`;
  };

  const generatePythonExample = (model) => {
    return `import requests

url = "${model.apiEndpoint || `https://api.nitrix.ai/models/${model.id}`}/predict"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
}
data = {
    "input": "Your input data here"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`;
  };

  const generateJavaScriptExample = (model) => {
    return `// Using the Nitrix SDK
import { NitrixClient } from '@nitrix/sdk';

const client = new NitrixClient('YOUR_API_KEY');

const result = await client.predict('${model.id}', {
  input: "Your input data here"
});

console.log(result);`;
  };

  const handleTestModel = async (model) => {
    if (model.realModel && model.modelId) {
      try {
        // Load real model metadata
        const modelMetadata = await localDB.getModel(model.modelId);
        if (!modelMetadata) {
          alert('Model metadata not found. Please ensure the model is properly trained.');
          return;
        }
        setPredictorModel({ ...model, metadata: modelMetadata });
        setShowPredictor(true);
      } catch (error) {
        console.error('Error loading model metadata:', error);
        alert('Failed to load model data. Please try again.');
      }
    } else {
      // For non-real models, show a message
      alert('This model was trained with simulation. Real prediction is only available for models trained with the Real ML Engine.');
    }
  };

  const displayModels = showOnlyActive ? activeModels.filter(m => m.status === 'deployed') : activeModels;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {showOnlyActive ? 'Active Models' : 'Model Dashboard'}
          </h2>
          <div>
            <p className="text-gray-600 mb-1">
              Your trained AI models ready for production use
            </p>
            <p className="text-xs text-purple-600 font-medium">Train Smarter AI—No Cloud, No Code, Just Power</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={onCreateNew}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            + Create New Model
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Models</p>
              <p className="text-2xl font-semibold text-gray-900">
                {activeModels.filter(m => m.status === 'deployed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Training</p>
              <p className="text-2xl font-semibold text-gray-900">{trainingQueue.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">API Calls</p>
              <p className="text-2xl font-semibold text-gray-900">1.2K</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
              <p className="text-2xl font-semibold text-gray-900">$24</p>
            </div>
          </div>
        </div>
      </div>

      {/* Models Grid */}
      {displayModels.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow border">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showOnlyActive ? 'No Active Models' : 'No Models Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {showOnlyActive 
                ? 'Your models are still training or haven\'t been deployed yet.'
                : 'Get started by creating your first AI model with natural language.'
              }
            </p>
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              🚀 Create Your First Model
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onSelect={() => setSelectedModel(model)}
              onTestModel={() => handleTestModel(model)}
              getStatusColor={getStatusColor}
              getUseCaseIcon={getUseCaseIcon}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Model Details Modal */}
      {selectedModel && (
        <ModelDetailsModal
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onShowSDK={() => setShowSDK(true)}
          generateCURLExample={generateCURLExample}
          generatePythonExample={generatePythonExample}
          generateJavaScriptExample={generateJavaScriptExample}
          formatDate={formatDate}
        />
      )}

      {/* SDK Modal */}
      {showSDK && selectedModel && (
        <SDKModal
          model={selectedModel}
          onClose={() => setShowSDK(false)}
          generateCURLExample={generateCURLExample}
          generatePythonExample={generatePythonExample}
          generateJavaScriptExample={generateJavaScriptExample}
        />
      )}

      {/* Real Model Predictor */}
      {showPredictor && predictorModel && (
        <RealModelPredictor
          modelId={predictorModel.modelId}
          modelMetadata={predictorModel.metadata}
          onClose={() => {
            setShowPredictor(false);
            setPredictorModel(null);
          }}
        />
      )}
    </div>
  );
};

// Model Card Component
const ModelCard = ({ model, onSelect, onTestModel, getStatusColor, getUseCaseIcon, formatDate }) => {
  return (
    <ModernCard 
      className="p-6 cursor-pointer" 
      hover={true}
      glow={model.realModel}
      onClick={() => onSelect()}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <motion.div 
            className="text-3xl bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-xl"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {getUseCaseIcon(model.useCase)}
          </motion.div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">{model.name}</h3>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-600 capitalize">{model.useCase?.replace('-', ' ')}</p>
              {model.realModel && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Real AI
                </span>
              )}
            </div>
          </div>
        </div>
        <motion.span 
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(model.status)}`}
          whileHover={{ scale: 1.05 }}
        >
          {model.status}
        </motion.span>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {model.userIntent || model.description || 'Custom AI model'}
      </p>

      {model.status === 'deployed' && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Accuracy:</span>
            <span className="font-medium text-green-600">
              {model.metrics?.accuracy ? `${Math.round(model.metrics.accuracy * 100)}%` : '95%'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Response Time:</span>
            <span className="font-medium text-blue-600">
              {model.metrics?.latency || '< 100ms'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">API Calls:</span>
            <span className="font-medium text-purple-600">247</span>
          </div>
        </div>
      )}

      {model.status === 'training' && (
        <div className="mb-4">
          <ProgressBar 
            progress={model.progress || 0}
            label={model.currentStage || 'Training'}
            color="purple"
            animated={true}
          />
          {model.trainingMetrics && (
            <div className="mt-2 text-xs text-gray-600">
              <span>Epoch {model.trainingMetrics.epoch}/{model.trainingMetrics.totalEpochs}</span>
              {model.trainingMetrics.loss && (
                <span className="ml-3">Loss: {model.trainingMetrics.loss.toFixed(4)}</span>
              )}
              {model.trainingMetrics.accuracy && (
                <span className="ml-3">Acc: {(model.trainingMetrics.accuracy * 100).toFixed(1)}%</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {model.status === 'deployed' ? 'Deployed' : 'Created'} {formatDate(model.completedAt || model.created)}
        </div>
        <div className="flex space-x-2">
          {model.status === 'deployed' && model.realModel && (
            <ModernButton
              variant="success"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTestModel();
              }}
              icon="🎯"
            >
              Test
            </ModernButton>
          )}
          <ModernButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {model.status === 'deployed' ? 'Use Model →' : 'View →'}
          </ModernButton>
        </div>
      </div>
    </ModernCard>
  );
};

// Model Details Modal
const ModelDetailsModal = ({ 
  model, 
  onClose, 
  onShowSDK, 
  generateCURLExample, 
  generatePythonExample, 
  generateJavaScriptExample, 
  formatDate 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{model.name}</h2>
              <p className="text-sm text-gray-500">Model ID: {model.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'usage', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{model.userIntent || 'Custom AI model created with Nitrix'}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Model Information</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Use Case:</dt>
                      <dd className="font-medium capitalize">{model.useCase?.replace('-', ' ')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Status:</dt>
                      <dd className="font-medium">{model.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Created:</dt>
                      <dd className="font-medium">{formatDate(model.created)}</dd>
                    </div>
                    {model.completedAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Deployed:</dt>
                        <dd className="font-medium">{formatDate(model.completedAt)}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Performance Metrics</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Accuracy:</dt>
                      <dd className="font-medium text-green-600">
                        {model.metrics?.accuracy ? `${Math.round(model.metrics.accuracy * 100)}%` : '95%'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Latency:</dt>
                      <dd className="font-medium text-blue-600">{model.metrics?.latency || '< 100ms'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Throughput:</dt>
                      <dd className="font-medium text-purple-600">500 req/min</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {model.status === 'deployed' && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">API Endpoint</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <code className="text-sm text-gray-800">
                      {model.apiEndpoint || `https://api.nitrix.ai/models/${model.id}`}
                    </code>
                  </div>
                  <button
                    onClick={onShowSDK}
                    className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    View Integration Examples
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Usage Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">247</div>
                    <div className="text-sm text-gray-600">API Calls Today</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">1.2K</div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">99.9%</div>
                    <div className="text-sm text-gray-600">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Model Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Auto-scaling</div>
                      <div className="text-sm text-gray-600">Automatically scale based on demand</div>
                    </div>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Monitoring</div>
                      <div className="text-sm text-gray-600">Real-time performance monitoring</div>
                    </div>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// SDK Modal
const SDKModal = ({ 
  model, 
  onClose, 
  generateCURLExample, 
  generatePythonExample, 
  generateJavaScriptExample 
}) => {
  const [activeExample, setActiveExample] = useState('curl');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Integration Examples</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'curl', name: 'cURL' },
              { id: 'python', name: 'Python' },
              { id: 'javascript', name: 'JavaScript' }
            ].map((example) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(example.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeExample === example.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {example.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm whitespace-pre-wrap">
              {activeExample === 'curl' && generateCURLExample(model)}
              {activeExample === 'python' && generatePythonExample(model)}
              {activeExample === 'javascript' && generateJavaScriptExample(model)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelDashboard;