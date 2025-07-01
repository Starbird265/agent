import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

// Local model management for desktop app
export default function LocalModelManager() {
  const [models, setModels] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');

  // Pre-trained models available for download
  const availableModels = [
    {
      id: 'mobilenet',
      name: 'MobileNet v2',
      description: 'Image classification model (224x224)',
      size: '14MB',
      type: 'image-classification',
      url: 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_140_224/classification/3/default/1'
    },
    {
      id: 'toxicity',
      name: 'Toxicity Detection',
      description: 'Text toxicity classification',
      size: '5MB',
      type: 'text-classification',
      url: 'https://tfhub.dev/tensorflow/tfjs-model/toxicity/1/default/1'
    },
    {
      id: 'universal-sentence-encoder',
      name: 'Universal Sentence Encoder',
      description: 'Text embeddings and similarity',
      size: '25MB',
      type: 'text-embedding',
      url: 'https://tfhub.dev/google/universal-sentence-encoder/4/default/1'
    },
    {
      id: 'blazeface',
      name: 'BlazeFace',
      description: 'Face detection in images',
      size: '350KB',
      type: 'object-detection',
      url: 'https://tfhub.dev/mediapipe/tfjs-model/blazeface/1/default/1'
    },
    {
      id: 'coco-ssd',
      name: 'COCO-SSD',
      description: 'Object detection (80 classes)',
      size: '27MB',
      type: 'object-detection',
      url: 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1'
    }
  ];

  useEffect(() => {
    loadLocalModels();
  }, []);

  // Load models from local storage
  const loadLocalModels = () => {
    const saved = localStorage.getItem('nitrix_local_models');
    if (saved) {
      setModels(JSON.parse(saved));
    }
  };

  // Save models to local storage
  const saveModels = (newModels) => {
    localStorage.setItem('nitrix_local_models', JSON.stringify(newModels));
    setModels(newModels);
  };

  // Upload custom model
  const handleModelUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setMessage('');

    try {
      // Handle different upload scenarios
      if (files.length === 1 && files[0].name.endsWith('.json')) {
        // Single JSON file - assume model.json with weights nearby
        const modelFile = files[0];
        const modelJson = JSON.parse(await modelFile.text());
        
        const newModel = {
          id: Date.now().toString(),
          name: modelFile.name.replace('.json', ''),
          description: 'Custom uploaded model',
          type: 'custom',
          size: formatBytes(modelFile.size),
          uploadedAt: new Date().toISOString(),
          modelData: modelJson
        };

        saveModels([...models, newModel]);
        setMessage('✅ Model uploaded successfully!');
      } else {
        // Multiple files or zip - handle as model package
        const newModel = {
          id: Date.now().toString(),
          name: `Custom Model ${models.length + 1}`,
          description: `Uploaded model package (${files.length} files)`,
          type: 'custom',
          size: formatBytes(files.reduce((sum, f) => sum + f.size, 0)),
          uploadedAt: new Date().toISOString(),
          files: files.map(f => ({ name: f.name, size: f.size }))
        };

        saveModels([...models, newModel]);
        setMessage('✅ Model package uploaded successfully!');
      }
    } catch (error) {
      setMessage('❌ Error uploading model: ' + error.message);
    }

    setUploading(false);
  };

  // Download pre-trained model
  const downloadModel = async (modelInfo) => {
    setDownloading(true);
    setMessage(`Downloading ${modelInfo.name}...`);

    try {
      // For TensorFlow.js models, we can load them directly
      const model = await tf.loadLayersModel(modelInfo.url);
      
      const newModel = {
        id: modelInfo.id,
        name: modelInfo.name,
        description: modelInfo.description,
        type: modelInfo.type,
        size: modelInfo.size,
        downloadedAt: new Date().toISOString(),
        url: modelInfo.url,
        tfModel: model // Store reference for later use
      };

      saveModels([...models, newModel]);
      setMessage(`✅ ${modelInfo.name} downloaded successfully!`);
    } catch (error) {
      setMessage(`❌ Error downloading ${modelInfo.name}: ${error.message}`);
    }

    setDownloading(false);
  };

  // Delete model
  const deleteModel = (modelId) => {
    const updatedModels = models.filter(m => m.id !== modelId);
    saveModels(updatedModels);
    setMessage('Model deleted');
  };

  // Export trained model
  const exportModel = (modelId) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    const dataStr = JSON.stringify(model, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${model.name.replace(/\s+/g, '_')}_model.json`;
    link.click();
    
    setMessage(`✅ Model ${model.name} exported!`);
  };

  // Search available models
  const searchModels = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results = availableModels.filter(model =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSearchResults(results);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">AI Model Manager</h2>
        <div className="text-sm text-gray-600">
          {models.length} model{models.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">📤 Upload Custom Model</h3>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept=".json,.bin,.h5,.pb,.onnx"
              onChange={handleModelUpload}
              disabled={uploading}
              className="hidden"
              id="model-upload"
            />
            <label
              htmlFor="model-upload"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <div className="text-4xl">🧠</div>
              <div className="text-gray-600">
                {uploading ? 'Uploading...' : 'Click to upload model files'}
              </div>
              <div className="text-sm text-gray-500">
                Supports: .json, .bin, .h5, .pb, .onnx
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Pre-trained Models */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">🏪 Download Pre-trained Models</h3>
        
        {/* Search */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={searchModels}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {/* Available Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(searchResults.length > 0 ? searchResults : availableModels).map((model) => (
            <div key={model.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{model.name}</h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {model.size}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{model.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {model.type}
                </span>
                <button
                  onClick={() => downloadModel(model)}
                  disabled={downloading || models.some(m => m.id === model.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {models.some(m => m.id === model.id) ? '✅ Downloaded' : 'Download'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Local Models */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">💾 Your Models</h3>
        
        {models.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🤖</div>
            <p>No models yet. Upload or download models to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {models.map((model) => (
              <div key={model.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-800">{model.name}</h4>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {model.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{model.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Size: {model.size}</span>
                    {model.uploadedAt && <span>Uploaded: {new Date(model.uploadedAt).toLocaleDateString()}</span>}
                    {model.downloadedAt && <span>Downloaded: {new Date(model.downloadedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportModel(model.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => deleteModel(model.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.startsWith('✅') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : message.startsWith('❌')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}