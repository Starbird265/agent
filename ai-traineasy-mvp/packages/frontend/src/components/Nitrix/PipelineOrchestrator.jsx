import React, { useState, useEffect } from 'react';

/**
 * Nitrix Pipeline Orchestrator
 * Shows real-time training progress and pipeline status
 * Completely automated - users just watch the magic happen
 */
const PipelineOrchestrator = ({ trainingQueue, onRefresh }) => {
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [expandedStages, setExpandedStages] = useState(new Set());

  useEffect(() => {
    // Auto-refresh every 5 seconds when there are active trainings
    if (trainingQueue.length > 0) {
      const interval = setInterval(onRefresh, 5000);
      return () => clearInterval(interval);
    }
  }, [trainingQueue.length, onRefresh]);

  const getPipelineStages = (template) => {
    const commonStages = [
      {
        id: 'ingestion',
        name: 'Data Ingestion',
        description: 'Collecting and validating your data',
        icon: '📥',
        estimatedTime: '2-5 minutes'
      },
      {
        id: 'preprocessing',
        name: 'Data Preprocessing',
        description: 'Cleaning and preparing data for training',
        icon: '🔧',
        estimatedTime: '5-15 minutes'
      },
      {
        id: 'model-selection',
        name: 'Model Selection',
        description: 'Choosing the best architecture for your use case',
        icon: '🧠',
        estimatedTime: '1-3 minutes'
      },
      {
        id: 'training',
        name: 'Training',
        description: 'Training your custom AI model',
        icon: '🚀',
        estimatedTime: '10-60 minutes'
      },
      {
        id: 'evaluation',
        name: 'Evaluation',
        description: 'Testing model performance and accuracy',
        icon: '📊',
        estimatedTime: '5-10 minutes'
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description: 'Creating API endpoint and SDK',
        icon: '🌐',
        estimatedTime: '3-8 minutes'
      }
    ];

    return commonStages;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'training': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'deployed': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const toggleStageExpansion = (pipelineId, stageId) => {
    const key = `${pipelineId}-${stageId}`;
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedStages(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Pipeline</h2>
          <p className="text-gray-600 mb-1">Fully automated ML training in progress</p>
          <p className="text-xs text-purple-600 font-medium">Train Smarter AI—No Cloud, No Code, Just Power</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Refresh
          </button>
          <div className="text-sm text-gray-500">
            {trainingQueue.length} active pipeline{trainingQueue.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {trainingQueue.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow border">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Training</h3>
          <p className="text-gray-600 mb-4">All your models have been trained and deployed!</p>
          <p className="text-sm text-gray-500">New training pipelines will appear here automatically</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Pipelines */}
          {trainingQueue.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              stages={getPipelineStages(pipeline.template)}
              isSelected={selectedPipeline === pipeline.id}
              onSelect={() => setSelectedPipeline(selectedPipeline === pipeline.id ? null : pipeline.id)}
              onToggleStage={(stageId) => toggleStageExpansion(pipeline.id, stageId)}
              expandedStages={expandedStages}
              getStatusColor={getStatusColor}
              formatTimeAgo={formatTimeAgo}
            />
          ))}

          {/* Global Progress Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-medium text-purple-900 mb-4">🚀 Nitrix Automation Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{trainingQueue.length}</div>
                <div className="text-sm text-purple-700">Active Pipelines</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(trainingQueue.reduce((acc, p) => acc + (p.progress || 0), 0) / trainingQueue.length || 0)}%
                </div>
                <div className="text-sm text-blue-700">Average Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-green-700">Manual Steps Required</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-purple-600 mb-1">
                ✨ Everything is automated - just sit back and watch the magic happen!
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Train Smarter AI—No Cloud, No Code, Just Power
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pipeline Card Component
const PipelineCard = ({ 
  pipeline, 
  stages, 
  isSelected, 
  onSelect, 
  onToggleStage, 
  expandedStages, 
  getStatusColor, 
  formatTimeAgo 
}) => {
  const currentStageIndex = stages.findIndex(stage => stage.name === pipeline.currentStage);
  const progress = pipeline.progress || 0;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Pipeline Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onSelect}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-medium text-gray-900">{pipeline.name}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pipeline.status)}`}>
                {pipeline.status}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-3">{pipeline.userIntent}</p>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {pipeline.currentStage || 'Initializing...'}
                </span>
                <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="ml-6 text-right">
            <div className="text-sm text-gray-500">
              Started {formatTimeAgo(pipeline.startedAt || pipeline.created)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {isSelected ? '▼ Hide Details' : '▶ Show Details'}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Details */}
      {isSelected && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-6">
            <h4 className="font-medium text-gray-900 mb-4">Pipeline Stages</h4>
            
            <div className="space-y-3">
              {stages.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isUpcoming = index > currentStageIndex;
                const isExpanded = expandedStages.has(`${pipeline.id}-${stage.id}`);

                return (
                  <div key={stage.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className={`p-4 cursor-pointer transition-colors ${
                        isCompleted ? 'bg-green-50 border-green-200' :
                        isCurrent ? 'bg-blue-50 border-blue-200' :
                        'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => onToggleStage(stage.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg">{stage.icon}</div>
                          <div>
                            <div className="font-medium text-gray-900">{stage.name}</div>
                            <div className="text-sm text-gray-600">{stage.description}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-500">{stage.estimatedTime}</div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                            'bg-gray-300 text-gray-600'
                          }`}>
                            {isCompleted ? '✓' : isCurrent ? '⟳' : index + 1}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stage Details */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="text-sm text-gray-600">
                          <p className="mb-2">
                            <strong>What's happening:</strong> {stage.description}
                          </p>
                          <p className="mb-2">
                            <strong>Estimated time:</strong> {stage.estimatedTime}
                          </p>
                          <p>
                            <strong>Status:</strong> 
                            {isCompleted && <span className="text-green-600 ml-1">✅ Completed</span>}
                            {isCurrent && <span className="text-blue-600 ml-1">⏳ In Progress</span>}
                            {isUpcoming && <span className="text-gray-500 ml-1">⏸️ Waiting</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pipeline Configuration */}
            <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">Configuration</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Use Case:</span>
                  <span className="ml-2 font-medium">{pipeline.useCase}</span>
                </div>
                <div>
                  <span className="text-gray-600">Cost Level:</span>
                  <span className="ml-2 font-medium capitalize">{pipeline.targetMetrics?.cost || 'Low'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Target Accuracy:</span>
                  <span className="ml-2 font-medium">{pipeline.targetMetrics?.accuracy || 'Auto-optimized'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Response Time:</span>
                  <span className="ml-2 font-medium">{pipeline.targetMetrics?.latency || 'Standard'}</span>
                </div>
              </div>
            </div>

            {/* Real-time Updates */}
            <div className="mt-4 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live updates - no manual intervention required
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineOrchestrator;