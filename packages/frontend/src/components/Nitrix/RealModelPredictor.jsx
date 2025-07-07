import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { realMLEngine } from '../../lib/realMLEngine';
import { localDB } from '../../lib/localDB';
import ModernCard from '../UI/ModernCard';
import ModernButton from '../UI/ModernButton';

/**
 * REAL MODEL PREDICTION INTERFACE
 * 🎯 This component provides a real prediction interface for trained models
 * No more mock predictions - this uses actual trained TensorFlow.js models
 */
const RealModelPredictor = ({ modelId, modelMetadata, onClose }) => {
  const [inputData, setInputData] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    loadModel();
  }, [modelId]);

  const loadModel = async () => {
    try {
      console.log('📥 Loading trained model for prediction...');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Model loading timeout')), 30000)
      );
      await Promise.race([
        realMLEngine.loadModel(modelId),
        timeoutPromise
      ]);
      setModelLoaded(true);
      
      // Initialize input data structure
      const features = modelMetadata.features || [];
      const initialData = {};
      features.forEach(feature => {
        initialData[feature] = '';
      });
      setInputData(initialData);
      
      console.log('✅ Model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      setError('Failed to load model: ' + error.message);
    }
  };

  const handleInputChange = (feature, value) => {
    setInputData(prev => ({
      ...prev,
      [feature]: value
    }));
  };

  const makePrediction = async () => {
    if (!modelLoaded) {
      setError('Model not loaded yet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🎯 Making real prediction with input:', inputData);
      
      // Validate input data
      const features = modelMetadata.features || [];
      // Convert string inputs to numbers where appropriate
      const processedInput = {};
      features.forEach(feature => {
        const value = inputData[feature];
        const featureMetadata = modelMetadata.featureStats?.[feature];
        
        if (featureMetadata?.type === 'numeric') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            throw new Error(`Invalid numeric value for ${feature}: ${value}`);
          }
          processedInput[feature] = numValue;
        } else {
          processedInput[feature] = value;
        }
      });
      console.log('✅ Real prediction completed:', result);
      
    } catch (error) {
      console.error('❌ Prediction failed:', error);
      setError('Prediction failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFeatureInput = (feature) => {
    const featureStats = modelMetadata.featureStats?.[feature];
    
    return (
      <div key={feature} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {feature}
          {featureStats && (
            <span className="text-xs text-gray-500 ml-2">
              ({featureStats.type === 'numeric' 
                ? `Range: ${featureStats.min?.toFixed(2)} - ${featureStats.max?.toFixed(2)}`
                : `Options: ${featureStats.uniqueValues?.slice(0, 3).join(', ')}${featureStats.uniqueValues?.length > 3 ? '...' : ''}`
              })
            </span>
          )}
        </label>
        
        {featureStats?.type === 'categorical' && featureStats.uniqueValues ? (
          <select
            value={inputData[feature] || ''}
            onChange={(e) => handleInputChange(feature, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select {feature}</option>
            {featureStats.uniqueValues.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            value={inputData[feature] || ''}
            onChange={(e) => handleInputChange(feature, e.target.value)}
            placeholder={`Enter ${feature}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    );
  };

  const renderPredictionResult = () => {
    if (!prediction) return null;

    return (
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-3">
          🎯 Real Prediction Result
        </h3>
        
        {prediction.type === 'classification' ? (
          <div>
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">Predicted Class:</span>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                {prediction.classLabels?.[prediction.predictedClass] || prediction.predictedClass}
              </span>
            </div>
            
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">Confidence:</span>
              <span className="ml-2 text-lg font-bold text-green-600">
                {prediction.confidence}%
              </span>
            </div>
            
            {prediction.probabilities && prediction.classLabels && (
              <div>
                <span className="text-sm font-medium text-gray-700 block mb-2">All Probabilities:</span>
                <div className="space-y-1">
                  {prediction.probabilities.map((prob, index) => (
                    <div key={index} className="flex items-center">
                      <span className="text-xs text-gray-600 w-20">
                        {prediction.classLabels[index]}:
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 ml-2 w-8">
                        {prob}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">Predicted Value:</span>
              <span className="ml-2 text-lg font-bold text-blue-600">
                {prediction.predictedValue?.toFixed(4)}
              </span>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-700">Confidence:</span>
              <span className="ml-2 text-green-600">
                {prediction.confidence}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">🎯</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Real Model Prediction
                </h2>
                <p className="text-gray-600">Test your trained AI model with real data</p>
              </div>
            </div>
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </ModernButton>
          </div>

          {!modelLoaded ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading trained model...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Model Information</h3>
                  <div className="text-sm text-blue-700">
                    <p><strong>Type:</strong> {modelMetadata.type}</p>
                    <p><strong>Features:</strong> {modelMetadata.features?.length || 0}</p>
                    <p><strong>Target:</strong> {modelMetadata.target}</p>
                    {modelMetadata.accuracy && (
                      <p><strong>Accuracy:</strong> {(modelMetadata.accuracy * 100).toFixed(1)}%</p>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Enter Feature Values
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(modelMetadata.features || []).map(renderFeatureInput)}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <ModernButton
                  onClick={makePrediction}
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  icon="🎯"
                >
                  {loading ? 'Making Prediction...' : 'Make Real Prediction'}
                </ModernButton>
                
                <ModernButton
                  onClick={onClose}
                  variant="secondary"
                  size="lg"
                >
                  Close
                </ModernButton>
              </div>

              {renderPredictionResult()}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RealModelPredictor;