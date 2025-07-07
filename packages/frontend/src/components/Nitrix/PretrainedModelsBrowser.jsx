import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModernCard from '../UI/ModernCard';
import ModernButton from '../UI/ModernButton';
import { 
  pretrainedModels, 
  modelCategories, 
  searchModels, 
  getPopularModels, 
  loadPretrainedModel 
} from '../../lib/pretrainedModels';

// Memoized ModelCard component for performance
const ModelCard = React.memo(({ model, isSelected, onSelect }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    whileHover={{ scale: 1.02 }}
    onClick={() => onSelect(model)}
    className={`cursor-pointer transition-all ${
      isSelected
        ? 'ring-2 ring-blue-500 shadow-lg'
        : 'hover:shadow-md'
    }`}
  >
    <ModernCard className="h-full">
      <div className="flex items-start gap-4">
        <div className="text-3xl">{model.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">{model.name}</h3>
          <p className="text-gray-600 text-sm mb-3">{model.description}</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-green-600 font-semibold">{model.accuracy}%</div>
              <div className="text-xs text-gray-600">Accuracy</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-blue-600 font-semibold">{model.latency}</div>
              <div className="text-xs text-gray-600">Speed</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded">
              <div className="text-purple-600 font-semibold">{model.size}</div>
              <div className="text-xs text-gray-600">Size</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {model.tags.slice(0, 3).map(tag => (
              <span 
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            <strong>Use cases:</strong> {model.examples.slice(0, 2).join(', ')}
          </div>
        </div>
      </div>
    </ModernCard>
  </motion.div>
));

const PretrainedModelsBrowser = ({ onModelSelect, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredModels, setFilteredModels] = useState(pretrainedModels);
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const filtered = searchModels(searchQuery, selectedCategory);
    setFilteredModels(filtered);
  }, [searchQuery, selectedCategory]);

  const handleModelSelect = (model) => {
    setSelectedModel(model);
  };

  const handleUseModel = async () => {
    if (!selectedModel) return;

    setLoading(true);
    try {
      const loadedModel = await loadPretrainedModel(selectedModel.id);
      
      // Pass the model data to the parent component
      onModelSelect({
        type: 'pretrained',
        model: loadedModel,
        name: selectedModel.name,
        description: selectedModel.description,
        useCase: selectedModel.useCase
      });
    } catch (error) {
      console.error('Failed to load model:', error);
      alert('Failed to load the selected model. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const PopularModels = () => {
    const popular = getPopularModels();
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🔥 Popular Models</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popular.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={selectedModel?.id === model.id}
              onSelect={handleModelSelect}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🤖 Pre-trained AI Models
            </h1>
            <p className="text-gray-600 mt-2">
              Ready-to-use AI models for instant deployment. No training required!
            </p>
          </div>
          <ModernButton onClick={onCancel} variant="ghost">
            ← Back to Create
          </ModernButton>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search models by name, description, or use case..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              🔍
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {modelCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {modelCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Popular Models Section */}
      {searchQuery === '' && selectedCategory === 'all' && <PopularModels />}

      {/* All Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          {searchQuery || selectedCategory !== 'all' ? 'Search Results' : 'All Models'} 
          <span className="text-gray-500 text-lg ml-2">({filteredModels.length})</span>
        </h2>
        
        <AnimatePresence mode="wait">
          {filteredModels.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No models found</h3>
              <p className="text-gray-600">Try adjusting your search terms or category filter</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredModels.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModel?.id === model.id}
                  onSelect={handleModelSelect}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Model Details */}
      <AnimatePresence>
        {selectedModel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-2xl p-6 z-50"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{selectedModel.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedModel.name}</h3>
                    <p className="text-gray-600">{selectedModel.description}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ModernButton
                    onClick={() => setSelectedModel(null)}
                    variant="ghost"
                  >
                    Cancel
                  </ModernButton>
                  <ModernButton
                    onClick={handleUseModel}
                    variant="primary"
                    loading={loading}
                  >
                    Use This Model
                  </ModernButton>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Examples:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedModel.examples.map((example, idx) => (
                      <li key={idx}>• {example}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedModel.tags.map(tag => (
                      <span 
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Performance:</h4>
                  <div className="space-y-1 text-sm">
                    <div>Accuracy: <span className="font-medium">{selectedModel.accuracy}%</span></div>
                    <div>Speed: <span className="font-medium">{selectedModel.latency}</span></div>
                    <div>Size: <span className="font-medium">{selectedModel.size}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PretrainedModelsBrowser;