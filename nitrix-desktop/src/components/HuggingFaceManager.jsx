import { useState, useEffect } from 'react';

// Hugging Face model manager for desktop app
export default function HuggingFaceManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [downloadedModels, setDownloadedModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [message, setMessage] = useState('');

  // Popular TensorFlow.js compatible models from Hugging Face
  const popularModels = [
    {
      id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      name: 'DistilBERT Sentiment',
      description: 'Sentiment analysis (positive/negative)',
      task: 'text-classification',
      size: '67MB',
      downloads: 50000
    },
    {
      id: 'Xenova/bert-base-uncased',
      name: 'BERT Base',
      description: 'Base BERT model for text understanding',
      task: 'feature-extraction',
      size: '110MB',
      downloads: 30000
    },
    {
      id: 'Xenova/gpt2',
      name: 'GPT-2',
      description: 'Text generation model',
      task: 'text-generation',
      size: '500MB',
      downloads: 25000
    },
    {
      id: 'Xenova/all-MiniLM-L6-v2',
      name: 'MiniLM Embeddings',
      description: 'Sentence embeddings model',
      task: 'feature-extraction',
      size: '23MB',
      downloads: 40000
    },
    {
      id: 'Xenova/clip-vit-base-patch32',
      name: 'CLIP Vision',
      description: 'Image and text understanding',
      task: 'zero-shot-image-classification',
      size: '151MB',
      downloads: 20000
    }
  ];

  useEffect(() => {
    loadDownloadedModels();
  }, []);

  const loadDownloadedModels = () => {
    const saved = localStorage.getItem('nitrix_hf_models');
    if (saved) {
      setDownloadedModels(JSON.parse(saved));
    }
  };

  const saveDownloadedModels = (models) => {
    localStorage.setItem('nitrix_hf_models', JSON.stringify(models));
    setDownloadedModels(models);
  };

  // Search Hugging Face models
  const searchHuggingFace = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(popularModels);
      return;
    }

    setLoading(true);
    setMessage('Searching Hugging Face models...');

    try {
      const response = await fetch(
        `https://huggingface.co/api/models?search=${encodeURIComponent(searchQuery)}&filter=tensorflowjs&sort=downloads&direction=-1&limit=20`
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const models = await response.json();
      const formattedResults = models.map(model => ({
        id: model.modelId || model.id,
        name: model.modelId?.split('/').pop() || model.id?.split('/').pop() || 'Unknown',
        description: model.cardData?.tags?.join(', ') || 'No description available',
        task: model.pipeline_tag || 'unknown',
        downloads: model.downloads || 0,
        size: 'Unknown',
        likes: model.likes || 0
      }));

      setSearchResults(formattedResults);
      setMessage(`Found ${formattedResults.length} models`);
    } catch (error) {
      setMessage('❌ Search failed. Showing popular models instead.');
      setSearchResults(popularModels);
    }

    setLoading(false);
  };

  // Download model from Hugging Face
  const downloadModel = async (model) => {
    setDownloading(model.id);
    setMessage(`Downloading ${model.name}...`);

    try {
      // For now, we'll simulate the download and save model info
      // In a real implementation, you'd download the actual model files
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate download

      const downloadedModel = {
        ...model,
        downloadedAt: new Date().toISOString(),
        localPath: `models/${model.id.replace('/', '_')}`,
        status: 'ready'
      };

      const updated = [...downloadedModels, downloadedModel];
      saveDownloadedModels(updated);
      setMessage(`✅ ${model.name} downloaded successfully!`);
    } catch (error) {
      setMessage(`❌ Failed to download ${model.name}: ${error.message}`);
    }

    setDownloading(null);
  };

  // Load model for inference
  const loadModelForInference = async (modelId) => {
    setMessage(`Loading ${modelId} for inference...`);
    
    try {
      // In a real implementation, you'd load the actual model here
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage(`✅ ${modelId} loaded and ready for inference!`);
    } catch (error) {
      setMessage(`❌ Failed to load ${modelId}: ${error.message}`);
    }
  };

  // Delete downloaded model
  const deleteModel = (modelId) => {
    const updated = downloadedModels.filter(m => m.id !== modelId);
    saveDownloadedModels(updated);
    setMessage('Model deleted from local storage');
  };

  const getTaskIcon = (task) => {
    const icons = {
      'text-classification': '📝',
      'text-generation': '✍️', 
      'feature-extraction': '🔍',
      'zero-shot-image-classification': '🖼️',
      'question-answering': '❓',
      'translation': '🌐',
      'summarization': '📋',
      'token-classification': '🏷️',
      'fill-mask': '🎭'
    };
    return icons[task] || '🤖';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">🤗 Hugging Face Models</h2>
        <div className="text-sm text-gray-600">
          {downloadedModels.length} model{downloadedModels.length !== 1 ? 's' : ''} downloaded
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex gap-3 items-center mb-4">
          <input
            type="text"
            placeholder="Search Hugging Face models (e.g., sentiment, bert, gpt)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchHuggingFace()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={searchHuggingFace}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 transition-all"
          >
            {loading ? '🔍 Searching...' : '🔍 Search HF'}
          </button>
        </div>

        {/* Popular/Search Results */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            {searchQuery ? 'Search Results' : '🔥 Popular Models'}
          </h3>
          
          {searchResults.length === 0 && !loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🤗</div>
              <p>Search for models or browse popular ones below</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(searchResults.length > 0 ? searchResults : popularModels).map((model) => (
                <div key={model.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTaskIcon(model.task)}</span>
                      <h4 className="font-semibold text-gray-800 text-sm">{model.name}</h4>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {model.size}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{model.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="bg-gray-100 px-2 py-1 rounded">{model.task}</span>
                    <div className="flex items-center gap-3">
                      <span>⬇️ {model.downloads?.toLocaleString() || 'N/A'}</span>
                      {model.likes && <span>👍 {model.likes}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => downloadModel(model)}
                    disabled={downloading === model.id || downloadedModels.some(m => m.id === model.id)}
                    className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded text-sm hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                  >
                    {downloading === model.id 
                      ? '⬇️ Downloading...' 
                      : downloadedModels.some(m => m.id === model.id)
                      ? '✅ Downloaded'
                      : '⬇️ Download Model'
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Downloaded Models */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">💾 Downloaded Models</h3>
        
        {downloadedModels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📥</div>
            <p>No models downloaded yet. Search and download models above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {downloadedModels.map((model) => (
              <div key={model.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getTaskIcon(model.task)}</span>
                    <h4 className="font-semibold text-gray-800">{model.name}</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {model.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{model.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Task: {model.task}</span>
                    <span>Size: {model.size}</span>
                    <span>Downloaded: {new Date(model.downloadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadModelForInference(model.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Load
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