import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

export default function LocalTrainer() {
  const [trainingData, setTrainingData] = useState(null);
  const [modelType, setModelType] = useState('classification');
  const [trainingStatus, setTrainingStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [trainedModel, setTrainedModel] = useState(null);
  const [logs, setLogs] = useState([]);
  const [predictions, setPredictions] = useState([]);

  // Model configurations
  const modelConfigs = {
    classification: {
      name: 'Text Classification',
      description: 'Train a model to classify text into categories',
      example: 'Sentiment analysis, spam detection, topic classification'
    },
    regression: {
      name: 'Numerical Prediction',
      description: 'Train a model to predict numerical values',
      example: 'Price prediction, rating prediction, quantity estimation'
    },
    clustering: {
      name: 'Data Clustering',
      description: 'Group similar data points together',
      example: 'Customer segmentation, topic discovery, anomaly detection'
    }
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Handle data upload
  const handleDataUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    addLog('📁 Processing uploaded data...');
    
    try {
      const text = await file.text();
      let data;

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else {
        // Treat as plain text
        data = text.split('\n').filter(line => line.trim()).map(line => ({ text: line }));
      }

      setTrainingData(data);
      addLog(`✅ Loaded ${data.length} data points`);
    } catch (error) {
      addLog(`❌ Error loading data: ${error.message}`);
    }
  };

  // Parse CSV data
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index]?.trim() || '';
      });
      return obj;
    });
  };

  // Create a simple classification model
  const createClassificationModel = (inputShape, numClasses) => {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [inputShape], units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: numClasses, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  };

  // Create a simple regression model
  const createRegressionModel = (inputShape) => {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [inputShape], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1 })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['meanAbsoluteError']
    });

    return model;
  };

  // Simple text preprocessing
  const preprocessText = (texts) => {
    // Create a simple bag-of-words representation
    const allWords = new Set();
    texts.forEach(text => {
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      words.forEach(word => allWords.add(word));
    });

    const vocabulary = Array.from(allWords).slice(0, 1000); // Limit vocabulary
    
    return texts.map(text => {
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const vector = new Array(vocabulary.length).fill(0);
      words.forEach(word => {
        const index = vocabulary.indexOf(word);
        if (index !== -1) vector[index] = 1;
      });
      return vector;
    });
  };

  // Train the model
  const startTraining = async () => {
    if (!trainingData || trainingData.length === 0) {
      addLog('❌ No training data available');
      return;
    }

    setTrainingStatus('preparing');
    addLog('🚀 Starting training...');

    try {
      let model, xTrain, yTrain;

      if (modelType === 'classification') {
        // Prepare classification data
        const texts = trainingData.map(item => item.text || item.input || Object.values(item)[0]);
        const labels = trainingData.map(item => item.label || item.target || item.category || 'unknown');
        
        const uniqueLabels = [...new Set(labels)];
        addLog(`📊 Found ${uniqueLabels.length} classes: ${uniqueLabels.join(', ')}`);

        // Convert text to vectors
        const textVectors = preprocessText(texts);
        xTrain = tf.tensor2d(textVectors);

        // Convert labels to one-hot encoding
        const labelIndices = labels.map(label => uniqueLabels.indexOf(label));
        yTrain = tf.oneHot(labelIndices, uniqueLabels.length);

        model = createClassificationModel(textVectors[0].length, uniqueLabels.length);
        addLog(`🧠 Created classification model with ${textVectors[0].length} features`);

      } else if (modelType === 'regression') {
        // Prepare regression data
        const features = trainingData.map(item => {
          const values = Object.values(item).slice(0, -1); // All but last column as features
          return values.map(v => parseFloat(v) || 0);
        });
        const targets = trainingData.map(item => {
          const values = Object.values(item);
          return parseFloat(values[values.length - 1]) || 0; // Last column as target
        });

        xTrain = tf.tensor2d(features);
        yTrain = tf.tensor2d(targets, [targets.length, 1]);

        model = createRegressionModel(features[0].length);
        addLog(`🧠 Created regression model with ${features[0].length} features`);
      }

      setTrainingStatus('training');

      // Train the model
      const history = await model.fit(xTrain, yTrain, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progressPercent = ((epoch + 1) / 50) * 100;
            setProgress(progressPercent);
            
            if (epoch % 5 === 0) {
              addLog(`📈 Epoch ${epoch + 1}/50 - Loss: ${logs.loss.toFixed(4)}, Accuracy: ${(logs.acc || logs.meanAbsoluteError || 0).toFixed(4)}`);
            }
          }
        }
      });

      setTrainedModel(model);
      setTrainingStatus('completed');
      addLog('✅ Training completed successfully!');
      addLog(`📊 Final loss: ${history.history.loss[history.history.loss.length - 1].toFixed(4)}`);

      // Cleanup tensors
      xTrain.dispose();
      yTrain.dispose();

    } catch (error) {
      setTrainingStatus('error');
      addLog(`❌ Training failed: ${error.message}`);
    }
  };

  // Save trained model
  const saveModel = async () => {
    if (!trainedModel) return;

    try {
      const modelName = `nitrix_model_${Date.now()}`;
      await trainedModel.save(`localstorage://${modelName}`);
      
      // Also save model metadata
      const metadata = {
        name: modelName,
        type: modelType,
        createdAt: new Date().toISOString(),
        dataPoints: trainingData?.length || 0
      };
      
      const savedModels = JSON.parse(localStorage.getItem('nitrix_trained_models') || '[]');
      savedModels.push(metadata);
      localStorage.setItem('nitrix_trained_models', JSON.stringify(savedModels));

      addLog(`💾 Model saved as ${modelName}`);
    } catch (error) {
      addLog(`❌ Failed to save model: ${error.message}`);
    }
  };

  // Make predictions
  const makePrediction = async (inputText) => {
    if (!trainedModel || !inputText.trim()) return;

    try {
      if (modelType === 'classification') {
        const textVector = preprocessText([inputText]);
        const prediction = trainedModel.predict(tf.tensor2d(textVector));
        const probabilities = await prediction.data();
        
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const confidence = probabilities[maxIndex];
        
        setPredictions(prev => [...prev, {
          input: inputText,
          prediction: `Class ${maxIndex}`,
          confidence: (confidence * 100).toFixed(1) + '%',
          timestamp: new Date().toLocaleTimeString()
        }]);

        prediction.dispose();
      }
    } catch (error) {
      addLog(`❌ Prediction failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">🧠 Local AI Trainer</h2>
        <div className="text-sm text-gray-600">
          TensorFlow.js • Local Training
        </div>
      </div>

      {/* Model Type Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Model Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(modelConfigs).map(([type, config]) => (
            <div
              key={type}
              onClick={() => setModelType(type)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                modelType === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold text-gray-800 mb-2">{config.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{config.description}</p>
              <p className="text-xs text-gray-500">{config.example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Upload */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">📤 Upload Training Data</h3>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleDataUpload}
              className="hidden"
              id="data-upload"
            />
            <label htmlFor="data-upload" className="cursor-pointer">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-gray-600 mb-2">Click to upload training data</div>
              <div className="text-sm text-gray-500">Supports: CSV, JSON, TXT</div>
            </label>
          </div>
          
          {trainingData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <span>✅</span>
                <span>Data loaded: {trainingData.length} samples</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Training Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">🚀 Training</h3>
        
        <div className="space-y-4">
          <button
            onClick={startTraining}
            disabled={!trainingData || trainingStatus === 'training'}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {trainingStatus === 'training' ? '🔄 Training...' : '🚀 Start Training'}
          </button>

          {trainingStatus === 'training' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {trainedModel && (
            <div className="flex gap-2">
              <button
                onClick={saveModel}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                💾 Save Model
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Training Logs */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">📋 Training Logs</h3>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500">Training logs will appear here...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Test Predictions (for classification) */}
      {trainedModel && modelType === 'classification' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">🔮 Test Predictions</h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter text to classify..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    makePrediction(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.target.previousElementSibling;
                  makePrediction(input.value);
                  input.value = '';
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Predict
              </button>
            </div>

            {predictions.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {predictions.map((pred, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-semibold">{pred.input}</div>
                    <div className="text-gray-600">
                      Prediction: {pred.prediction} ({pred.confidence}) - {pred.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}