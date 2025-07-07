import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ModernCard from '../UI/ModernCard';
import ModernButton from '../UI/ModernButton';
import PretrainedModelsBrowser from './PretrainedModelsBrowser';

/**
 * Nitrix Intent Capture Component
 * Natural-language interface for users to describe their AI training needs
 * No technical knowledge required - just describe what you want
 * 
 * @component
 * @param {Object} props - Component props
 * @param {function} props.onIntentSubmit - Callback when user submits their intent
 * @param {function} props.onCancel - Callback when user cancels the process
 * @param {Object} [props.initialData] - Optional initial form data
 * @param {boolean} [props.disabled=false] - Whether the component is disabled
 * 
 * @example
 * <IntentCapture 
 *   onIntentSubmit={handleIntent}
 *   onCancel={() => setView('dashboard')}
 *   initialData={{ description: 'Previous attempt' }}
 * />
 * 
 * @returns {JSX.Element} The IntentCapture component
 */
const IntentCapture = ({ onIntentSubmit, onCancel, initialData = {}, disabled = false }) => {
  const [intent, setIntent] = useState(initialData.description || '');
  const [selectedUseCase, setSelectedUseCase] = useState(initialData.selectedUseCase || '');
  const [dataSource, setDataSource] = useState(initialData.dataSource || '');
  const [targetMetrics, setTargetMetrics] = useState({
    accuracy: initialData.targetMetrics?.accuracy || '',
    latency: initialData.targetMetrics?.latency || '',
    cost: initialData.targetMetrics?.cost || 'low'
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('create'); // 'create' or 'pretrained'

  const useCases = [
    {
      id: 'text-generation',
      name: 'Text Generation',
      description: 'Generate text based on prompts (chatbots, content creation, code generation)',
      icon: '📝',
      examples: [
        'Customer support chatbot for our SaaS product',
        'Generate product descriptions from features',
        'Code completion for our specific framework'
      ]
    },
    {
      id: 'speech-to-text',
      name: 'Speech to Text',
      description: 'Convert audio to text (transcription, voice commands, call analysis)',
      icon: '🎤',
      examples: [
        'Transcribe customer support calls',
        'Voice commands for mobile app',
        'Meeting notes from audio recordings'
      ]
    },
    {
      id: 'image-generation',
      name: 'Image Generation',
      description: 'Create images from text descriptions (marketing, design, art)',
      icon: '🎨',
      examples: [
        'Product mockups from descriptions',
        'Marketing visuals for campaigns',
        'Custom artwork for our brand'
      ]
    },
    {
      id: 'classification',
      name: 'Classification',
      description: 'Categorize data (spam detection, sentiment analysis, content moderation)',
      icon: '🏷️',
      examples: [
        'Classify customer feedback sentiment',
        'Detect spam in user messages',
        'Categorize support tickets automatically'
      ]
    },
    {
      id: 'recommendation',
      name: 'Recommendation',
      description: 'Suggest relevant items (product recommendations, content suggestions)',
      icon: '🎯',
      examples: [
        'Recommend products to customers',
        'Suggest relevant articles to users',
        'Match candidates to job postings'
      ]
    },
    {
      id: 'forecasting',
      name: 'Forecasting',
      description: 'Predict future trends (sales forecasting, demand planning, risk analysis)',
      icon: '📈',
      examples: [
        'Predict monthly sales revenue',
        'Forecast inventory demand',
        'Estimate project completion times'
      ]
    }
  ];

  const handleSubmit = async () => {
    if (!intent.trim() || !selectedUseCase) {
      alert('Please describe your intent and select a use case');
      return;
    }

    setLoading(true);

    const intentData = {
      description: intent,
      useCase: selectedUseCase,
      dataSource: dataSource,
      targetMetrics: targetMetrics,
      name: generateModelName(intent, selectedUseCase)
    };

    try {
      await onIntentSubmit(intentData);
    } catch (error) {
      console.error('Failed to submit intent:', error);
      alert('Failed to start training. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePretrainedModelSelect = async (modelData) => {
    setLoading(true);
    
    const intentData = {
      type: 'pretrained',
      name: modelData.name,
      description: modelData.description,
      useCase: modelData.useCase,
      pretrainedModel: modelData.model,
      skipTraining: true
    };

    try {
      await onIntentSubmit(intentData);
    } catch (error) {
      console.error('Failed to load pretrained model:', error);
      alert('Failed to load the pretrained model. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateModelName = (intent, useCase) => {
    const words = intent.split(' ').filter(word => word.length > 3);
    const mainWords = words.slice(0, 3).join(' ');
    return `${mainWords} ${useCase.replace('-', ' ')} Model`.trim();
  };

  const parseIntent = (text) => {
    // Simple intent parsing - in production, this would use NLP
    const suggestions = [];
    
    if (text.toLowerCase().includes('customer') || text.toLowerCase().includes('support')) {
      suggestions.push('Customer Support Enhancement');
    }
    if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('create')) {
      suggestions.push('Content Generation');
    }
    if (text.toLowerCase().includes('classify') || text.toLowerCase().includes('categorize')) {
      suggestions.push('Data Classification');
    }
    
    return suggestions;
  };

  // Show pretrained models browser
  if (viewMode === 'pretrained') {
    return (
      <PretrainedModelsBrowser
        onModelSelect={handlePretrainedModelSelect}
        onCancel={() => setViewMode('create')}
      />
    );
  }

  return (
    <motion.div 
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Model Type Selection */}
      <ModernCard className="mb-8 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Your Approach</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
              viewMode === 'create' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setViewMode('create')}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎯</div>
              <div>
                <h3 className="font-semibold">Train Custom Model</h3>
                <p className="text-sm text-gray-600">Build your own AI from scratch</p>
              </div>
            </div>
          </div>
          <div 
            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
              viewMode === 'pretrained' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setViewMode('pretrained')}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🤖</div>
              <div>
                <h3 className="font-semibold">Use Pre-trained Model</h3>
                <p className="text-sm text-gray-600">Ready-to-use AI models</p>
              </div>
            </div>
          </div>
        </div>
      </ModernCard>

      {/* Enhanced Progress Bar */}
      <ModernCard className="mb-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-purple-600">Step {step} of 3</span>
          <span className="text-sm text-gray-500 font-medium">Describe → Configure → Launch</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </ModernCard>

      {/* Enhanced Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Create Your AI Model
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
          Simply describe what you want your AI to do. No technical knowledge required - 
          just explain your use case in plain English.
        </p>
        <p className="text-sm text-purple-600 font-semibold">
          ✨ Train Smarter AI—No Cloud, No Code, Just Power
        </p>
      </motion.div>

      {/* Step 1: Intent Description */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ModernCard className="p-8" glow={intent.length > 20}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="text-3xl mr-3">🎯</span>
              What do you want your AI to do?
            </h2>
            
            <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Describe your use case in plain English
              </label>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-700 placeholder-gray-400"
                placeholder="For example: I want to analyze customer reviews and classify them as positive, negative, or neutral. The AI should understand context and sentiment to help us improve our products."
              />
            </div>

            {intent.length > 50 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Intent Analysis</h3>
                <div className="text-sm text-blue-700">
                  <p className="mb-2">Based on your description, here's what we detected:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {parseIntent(intent).map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <ModernButton
                variant="secondary"
                onClick={onCancel}
                icon="❌"
              >
                Cancel
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={() => setStep(2)}
                disabled={intent.length < 10}
                icon="➡️"
              >
                Next: Choose Use Case
              </ModernButton>
            </div>
            </div>
          </ModernCard>
        </motion.div>
      )}

      {/* Step 2: Use Case Selection */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Select the best match for your use case
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {useCases.map((useCase) => (
              <div
                key={useCase.id}
                onClick={() => setSelectedUseCase(useCase.id)}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  selectedUseCase === useCase.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{useCase.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">{useCase.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{useCase.description}</p>
                    <div className="text-xs text-gray-500">
                      <p className="font-medium mb-1">Examples:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {useCase.examples.slice(0, 2).map((example, index) => (
                          <li key={index}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedUseCase}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Configure Training
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configuration */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Configure Your Training
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Data Source (Optional)
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">I'll upload data later</option>
                <option value="upload">Upload files now</option>
                <option value="google-drive">Connect Google Drive</option>
                <option value="s3">Connect AWS S3</option>
                <option value="database">Connect Database</option>
                <option value="api">Connect API</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Target Accuracy (Optional)
                </label>
                <input
                  type="text"
                  value={targetMetrics.accuracy}
                  onChange={(e) => setTargetMetrics({...targetMetrics, accuracy: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., 90%, very high, good enough"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Response Time (Optional)
                </label>
                <input
                  type="text"
                  value={targetMetrics.latency}
                  onChange={(e) => setTargetMetrics({...targetMetrics, latency: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., < 100ms, fast, real-time"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cost Preference
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['low', 'medium', 'high'].map((cost) => (
                  <button
                    key={cost}
                    onClick={() => setTargetMetrics({...targetMetrics, cost})}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      targetMetrics.cost === cost
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium capitalize">{cost} Cost</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cost === 'low' && 'Basic models, longer training'}
                      {cost === 'medium' && 'Balanced performance'}
                      {cost === 'high' && 'Premium models, fast training'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Training Summary</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Intent:</span> {intent}</p>
                <p><span className="font-medium">Use Case:</span> {useCases.find(u => u.id === selectedUseCase)?.name}</p>
                <p><span className="font-medium">Data Source:</span> {dataSource || 'Will be configured later'}</p>
                <p><span className="font-medium">Target Accuracy:</span> {targetMetrics.accuracy || 'Auto-optimized'}</p>
                <p><span className="font-medium">Response Time:</span> {targetMetrics.latency || 'Standard'}</p>
                <p><span className="font-medium">Cost Preference:</span> {targetMetrics.cost} cost</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting Training...
                  </div>
                ) : (
                  '🚀 Start Automated Training'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default IntentCapture;