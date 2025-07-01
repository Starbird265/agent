import React, { useState, useEffect } from 'react';
import { db } from '../../lib/supabase';

const HuggingFaceModels = ({ onModelSelect }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.huggingfaceModels.getAll();
      
      if (error) throw error;
      
      setModels(data || []);
    } catch (err) {
      console.error('Failed to load models:', err);
      setError('Failed to load HuggingFace models');
      
      // Fallback to hardcoded popular models
      setModels([
        {
          id: 'distilbert-base-uncased',
          model_id: 'distilbert-base-uncased',
          model_name: 'DistilBERT Base Uncased',
          author: 'HuggingFace',
          downloads: 15000000,
          tags: ['text-classification', 'pytorch', 'distilbert'],
          description: 'Fast, lightweight BERT model for classification tasks',
          task: 'text-classification'
        },
        {
          id: 'bert-base-uncased',
          model_id: 'bert-base-uncased',
          model_name: 'BERT Base Uncased',
          author: 'HuggingFace',
          downloads: 25000000,
          tags: ['text-classification', 'pytorch', 'bert'],
          description: 'Standard BERT model for text classification',
          task: 'text-classification'
        },
        {
          id: 'roberta-base',
          model_id: 'roberta-base',
          model_name: 'RoBERTa Base',
          author: 'HuggingFace',
          downloads: 12000000,
          tags: ['text-classification', 'pytorch', 'roberta'],
          description: 'RoBERTa: Robustly Optimized BERT Pretraining',
          task: 'text-classification'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models.filter(model => {
    const matchesTask = selectedTask === 'all' || model.task === selectedTask;
    const matchesSearch = model.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.model_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (model.description && model.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTask && matchesSearch;
  });

  const tasks = [...new Set(models.map(model => model.task).filter(Boolean))];

  const formatDownloads = (downloads) => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    } else if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads?.toString() || '0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading HuggingFace models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🤗 HuggingFace Models</h2>
          <p className="text-gray-600">Choose from thousands of pre-trained models</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredModels.length} models available
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Tasks</option>
            {tasks.map(task => (
              <option key={task} value={task}>
                {task.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error} - Showing popular models instead</span>
          </div>
        </div>
      )}

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((model) => (
          <ModelCard
            key={model.id || model.model_id}
            model={model}
            onSelect={onModelSelect}
          />
        ))}
      </div>

      {filteredModels.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.072-2.455" />
          </svg>
          <p className="text-gray-500 text-lg">No models match your search</p>
          <p className="text-gray-400">Try different keywords or filters</p>
        </div>
      )}
    </div>
  );
};

const ModelCard = ({ model, onSelect }) => {
  const formatDownloads = (downloads) => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    } else if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads?.toString() || '0';
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect({
        id: model.model_id,
        name: model.model_name,
        author: model.author,
        task: model.task,
        description: model.description,
        downloads: model.downloads
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {model.model_name}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            by {model.author}
          </p>
        </div>
        <div className="ml-2 flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {formatDownloads(model.downloads)} downloads
          </span>
        </div>
      </div>

      {model.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {model.description}
        </p>
      )}

      {model.tags && Array.isArray(model.tags) && (
        <div className="flex flex-wrap gap-1 mb-4">
          {model.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
            >
              {tag}
            </span>
          ))}
          {model.tags.length > 3 && (
            <span className="text-xs text-gray-500 px-2 py-1">
              +{model.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {model.task && (
            <span className="capitalize">
              {model.task.replace('-', ' ')}
            </span>
          )}
        </div>
        <button
          onClick={handleSelect}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Select Model
        </button>
      </div>
    </div>
  );
};

export default HuggingFaceModels;