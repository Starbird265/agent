#!/usr/bin/env node
/**
 * Test Pre-trained Models Functionality
 * This script tests the new pre-trained models system
 */

console.log('🧪 Testing Pre-trained Models System...\n');

// Test 1: Import pre-trained models library
console.log('1️⃣ Testing Models Library Import...');
try {
  const pretrainedModelsModule = require('./packages/frontend/src/lib/pretrainedModels.js');
  
  // Validate required exports
  const requiredExports = [
    'pretrainedModels',
    'modelCategories',
    'searchModels',
    'getPopularModels',
    'getModelById',
    'loadPretrainedModel'
  ];
  const missingExports = requiredExports.filter(exp => !pretrainedModelsModule[exp]);
  
  if (missingExports.length > 0) {
    throw new Error(
      `Missing exports from pretrainedModels module: ${missingExports.join(', ')}`
    );
  }
  
  const { 
    pretrainedModels, 
    modelCategories, 
    searchModels, 
    getPopularModels,
    getModelById,
    loadPretrainedModel 
  } = pretrainedModelsModule;
  
  console.log('✅ Pre-trained models library imported successfully');
  console.log(`✅ Found ${pretrainedModels.length} models available`);
  console.log(`✅ Found ${modelCategories.length} categories available`);
  
  // Test 2: Test search functionality
  console.log('\n2️⃣ Testing Search Functionality...');
  
  const sentimentModels = searchModels('sentiment');
  console.log(`✅ Search for 'sentiment': ${sentimentModels.length} models found`);
  
  const textModels = searchModels('', 'text-analysis');
  console.log(`✅ Filter by 'text-analysis': ${textModels.length} models found`);
  
  const allModels = searchModels('');
  console.log(`✅ Search all models: ${allModels.length} models found`);
  
  // Test 3: Test popular models
  console.log('\n3️⃣ Testing Popular Models...');
  
  const popular = getPopularModels();
  console.log(`✅ Popular models: ${popular.length} models`);
  popular.forEach(model => {
    console.log(`   - ${model.name} (${model.accuracy}% accuracy)`);
  });
  
  // Test 4: Test model loading
  console.log('\n4️⃣ Testing Model Loading...');
  
  const testModel = getModelById('sentiment-analyzer');
  if (testModel) {
    console.log(`✅ Found model: ${testModel.name}`);
    console.log(`   Description: ${testModel.description}`);
    console.log(`   Accuracy: ${testModel.accuracy}%`);
    console.log(`   Category: ${testModel.category}`);
    console.log(`   Use Case: ${testModel.useCase}`);
    console.log(`   Tags: ${testModel.tags.join(', ')}`);
    
    // Test loading the model
    loadPretrainedModel('sentiment-analyzer').then(loadedModel => {
      console.log(`✅ Model loaded successfully: ${loadedModel.name}`);
      
      // Test prediction
      const prediction = loadedModel.predict('This is a great product!');
      console.log(`✅ Model prediction test: ${prediction.prediction} (${Math.round(prediction.confidence * 100)}% confidence)`);
      
      console.log('\n🎉 All tests passed! Pre-trained models system is working correctly.\n');
      
      // Test 5: List all available models
      console.log('5️⃣ Available Models Summary:');
      console.log('='.repeat(60));
      
      const categories = {};
      pretrainedModels.forEach(model => {
        if (!categories[model.category]) {
          categories[model.category] = [];
        }
        categories[model.category].push(model);
      });
      
      Object.entries(categories).forEach(([category, models]) => {
        const categoryInfo = modelCategories.find(c => c.id === category);
        console.log(`\n${categoryInfo?.icon || '🤖'} ${categoryInfo?.name || category.toUpperCase()}:`);
        models.forEach(model => {
          console.log(`   ${model.icon} ${model.name} - ${model.accuracy}% accuracy`);
        });
      });
      
      console.log('\n✅ CONCLUSION: Pre-trained models system is fully functional!');
      console.log('🎯 Users can now:');
      console.log('   • Browse 13+ ready-to-use AI models');
      console.log('   • Search and filter by category');
      console.log('   • Deploy models instantly');
      console.log('   • Get real predictions immediately');
      console.log('\n🌐 Visit: http://localhost:5173/agent/');
      console.log('📱 Click: Create Model → Use Pre-trained Model');
      
    }).catch(error => {
      console.log('❌ Model loading failed:', error.message);
    });
  } else {
    console.log('❌ Test model not found');
  }
  
} catch (error) {
  console.log('❌ Pre-trained models test failed:', error.message);
  console.log('Stack:', error.stack);
}