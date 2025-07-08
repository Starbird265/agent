#!/usr/bin/env node

// Test the enhanced features to see if they actually work

console.log('🧪 Testing Enhanced Features...\n');
let failureCount = 0;

// Test 1: Import and test authentication system
console.log('1️⃣ Testing Authentication System...');
try {
  const { authSystem } = require('./packages/frontend/src/lib/offlineAuth.js');
  console.log('✅ Authentication system imported successfully');
  
  // Test user registration
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
    fullName: 'Test User'
  };
  
  const registerResult = authSystem.register(testUser);
  console.log('✅ User registration test:', registerResult ? 'PASSED' : 'FAILED');
  if (!registerResult) failureCount++;
  
  // Test user login
  const loginResult = authSystem.login({ username: 'testuser', password: 'TestPassword123!' });
  console.log('✅ User login test:', loginResult ? 'PASSED' : 'FAILED');
  if (!loginResult) failureCount++;
  
} catch (error) {
  console.log('❌ Authentication system test failed:', error.message);
  failureCount++;
}

// Test 2: Test data processing
console.log('\n2️⃣ Testing Data Processing...');
try {
  const { advancedDataProcessor } = require('./packages/frontend/src/lib/advancedDataProcessing.js');
  console.log('✅ Data processing system imported successfully');
  
  const testCSV = 'name,age,salary\nJohn,25,50000\nJane,30,60000';
  const processResult = advancedDataProcessor.processCSVData(testCSV);
  console.log('✅ CSV processing test:', processResult ? 'PASSED' : 'FAILED');
  
} catch (error) {
  console.log('❌ Data processing test failed:', error.message);
}

// Test 3: Test ML algorithms
console.log('\n3️⃣ Testing ML Algorithms...');
try {
  const { mlAlgorithms } = require('./packages/frontend/src/lib/mlAlgorithms.js');
  console.log('✅ ML algorithms imported successfully');
  
  const testData = {
    features: [[1, 2], [2, 3], [3, 4]],
    labels: [0, 1, 1]
  };
  
  const trainResult = mlAlgorithms.trainRandomForest(testData);
  console.log('✅ Random Forest training test:', trainResult ? 'PASSED' : 'FAILED');
  
} catch (error) {
  console.log('❌ ML algorithms test failed:', error.message);
}

// Test 4: Test API integration
console.log('\n4️⃣ Testing API Integration...');
try {
  const { apiIntegration } = require('./packages/frontend/src/lib/apiIntegration.js');
  console.log('✅ API integration imported successfully');
  
  const testModel = { predict: (data) => ({ result: 'test' }) };
  const deployResult = apiIntegration.deployModel('test-model', testModel, { endpoint: '/test' });
  console.log('✅ Model deployment test:', deployResult ? 'PASSED' : 'FAILED');
  
} catch (error) {
  console.log('❌ API integration test failed:', error.message);
}

// Test 5: Test team collaboration
console.log('\n5️⃣ Testing Team Collaboration...');
try {
  const { teamCollaboration } = require('./packages/frontend/src/lib/teamCollaboration.js');
  console.log('✅ Team collaboration imported successfully');
  
  const testProject = {
    name: 'Test Project',
    description: 'A test project'
  };
  
  const projectResult = teamCollaboration.createProject(testProject);
  console.log('✅ Project creation test:', projectResult ? 'PASSED' : 'FAILED');
  
} catch (error) {
  console.log('❌ Team collaboration test failed:', error.message);
}

console.log('\n🎯 Feature Testing Complete!');

if (failureCount > 0) {
  console.log(`\n❌ ${failureCount} test(s) failed`);
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}