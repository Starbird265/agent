import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ModernCard from './UI/ModernCard';
import ModernButton from './UI/ModernButton';
import ProgressBar from './UI/ProgressBar';
import { authSystem } from '../lib/offlineAuth';
import { apiIntegration } from '../lib/apiIntegration';
import { teamCollaboration } from '../lib/teamCollaboration';
import { advancedDataProcessor } from '../lib/advancedDataProcessing';
import { mlAlgorithms } from '../lib/mlAlgorithms';

const EnhancedFeatures = () => {
  const [activeTab, setActiveTab] = useState('auth');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    fullName: '' 
  });
  const [deployedModels, setDeployedModels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await checkAuthStatus();
        await loadDeployedModels();
        await loadProjects();
        await loadNotifications();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);
  const checkAuthStatus = async () => {
    try {
      const authenticated = authSystem.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = authSystem.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await authSystem.login(loginForm);
      if (result.success) {
        setIsAuthenticated(true);
        setUser(result.user);
        setLoginForm({ username: '', password: '' });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const result = await authSystem.register(registerForm);
      if (result.success) {
        setIsAuthenticated(true);
        setUser(result.user);
        setRegisterForm({ username: '', email: '', password: '', fullName: '' });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await authSystem.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loadDeployedModels = async () => {
    try {
      const models = Array.from(apiIntegration.deployedModels.values());
      setDeployedModels(models);
    } catch (error) {
      console.error('Error loading deployed models:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const projectList = Array.from(teamCollaboration.projects.values());
      setProjects(projectList);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      if (user) {
        const result = await teamCollaboration.getNotifications(user.id);
        if (result.success) {
          setNotifications(result.notifications.slice(0, 5)); // Show only latest 5
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const createSampleProject = async () => {
    try {
      const result = await teamCollaboration.createProject({
        name: 'Sample ML Project',
        description: 'A sample project to demonstrate team collaboration',
        type: 'classification',
        tags: ['demo', 'sample']
      });
      
      if (result.success) {
        alert('Sample project created successfully!');
        loadProjects();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const deployTestModel = async () => {
    try {
      // Create a simple test model
      const testModel = {
        save: async (path) => {
          localStorage.setItem('test_model', JSON.stringify({
            type: 'test',
            weights: [0.5, 0.3, 0.2]
          }));
        }
      };

      const result = await apiIntegration.deployModel('test_model', testModel, {
        endpoint: '/api/models/test/predict',
        metadata: {
          description: 'Test model for demonstration',
          inputFeatures: ['feature1', 'feature2', 'feature3']
        }
      });

      if (result.success) {
        alert('Test model deployed successfully!');
        loadDeployedModels();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error deploying model:', error);
      alert('Failed to deploy model');
    }
  };

  const runAdvancedDataProcessing = async () => {
    try {
      // Sample CSV data
      const sampleData = `name,age,salary,department
John,25,50000,IT
Jane,30,60000,HR
Bob,35,70000,Finance
Alice,28,55000,IT`;

      const result = await advancedDataProcessor.processCSVData(sampleData);
      
      if (result.success) {
        alert(`Data processed successfully! Found ${result.analysis.totalRows} rows with ${result.analysis.columns.length} columns`);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process data');
    }
  };

  const trainAdvancedModel = async () => {
    try {
      // Sample training data
      const trainingData = {
        features: [[1, 2], [2, 3], [3, 4], [4, 5]],
        labels: [0, 1, 1, 0]
      };

      const result = await mlAlgorithms.trainRandomForest(trainingData);
      
      if (result.success) {
        alert(`Model trained successfully! Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error training model:', error);
      alert('Failed to train model');
    }
  };

  const tabs = [
    { id: 'auth', label: 'Authentication', icon: '🔐' },
    { id: 'deployment', label: 'API & Deployment', icon: '🚀' },
    { id: 'collaboration', label: 'Team Collaboration', icon: '👥' },
    { id: 'processing', label: 'Data Processing', icon: '📊' },
    { id: 'algorithms', label: 'ML Algorithms', icon: '🤖' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Enhanced Features Demo
          </h1>
          <p className="text-lg text-gray-600">
            Test all the advanced features of the Nitrix AI Platform
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <ModernButton
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? 'primary' : 'secondary'}
              className="flex items-center gap-2"
            >
              <span>{tab.icon}</span>
              {tab.label}
            </ModernButton>
          ))}
        </div>

        {/* Authentication Tab */}
        {activeTab === 'auth' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <ModernCard title="🔐 User Authentication" className="h-fit">
              {!isAuthenticated ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Login</h3>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <input
                        type="text"
                        placeholder="Username"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />
                      <ModernButton type="submit" variant="primary" className="w-full">
                        Login
                      </ModernButton>
                    </form>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Register</h3>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <input
                        type="text"
                        placeholder="Username"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={registerForm.fullName}
                        onChange={(e) => setRegisterForm({...registerForm, fullName: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />
                      <ModernButton type="submit" variant="primary" className="w-full">
                        Register
                      </ModernButton>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-6xl">✅</div>
                  <h3 className="text-xl font-semibold">Welcome, {user?.fullName}!</h3>
                  <p className="text-gray-600">Role: {user?.role}</p>
                  <p className="text-gray-600">Email: {user?.email}</p>
                  <ModernButton onClick={handleLogout} variant="secondary">
                    Logout
                  </ModernButton>
                </div>
              )}
            </ModernCard>

            <ModernCard title="📊 Authentication Stats" className="h-fit">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Authentication Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Current User</span>
                  <span className="text-sm text-gray-600">
                    {user?.username || 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Team</span>
                  <span className="text-sm text-gray-600">
                    {user?.teamName || 'No Team'}
                  </span>
                </div>
              </div>
            </ModernCard>
          </motion.div>
        )}

        {/* API & Deployment Tab */}
        {activeTab === 'deployment' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <ModernCard title="🚀 Model Deployment" className="h-fit">
              <div className="space-y-4">
                <ModernButton 
                  onClick={deployTestModel}
                  variant="primary"
                  className="w-full"
                >
                  Deploy Test Model
                </ModernButton>
                
                <div>
                  <h4 className="font-semibold mb-2">Deployed Models ({deployedModels.length})</h4>
                  <div className="space-y-2">
                    {deployedModels.length === 0 ? (
                      <p className="text-gray-500 text-sm">No models deployed yet</p>
                    ) : (
                      deployedModels.map((model, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{model.modelName}</span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {model.metadata.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{model.endpoint}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ModernCard>

            <ModernCard title="📈 API Analytics" className="h-fit">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <h3 className="text-lg font-semibold">API Integration Status</h3>
                  <p className="text-sm text-gray-600">
                    Ready for model deployment and API management
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{deployedModels.length}</div>
                    <div className="text-sm text-gray-600">Deployed Models</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-sm text-gray-600">API Calls</div>
                  </div>
                </div>
              </div>
            </ModernCard>
          </motion.div>
        )}

        {/* Team Collaboration Tab */}
        {activeTab === 'collaboration' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <ModernCard title="👥 Team Projects" className="h-fit">
              <div className="space-y-4">
                <ModernButton 
                  onClick={createSampleProject}
                  variant="primary"
                  className="w-full"
                  disabled={!isAuthenticated}
                >
                  Create Sample Project
                </ModernButton>
                
                <div>
                  <h4 className="font-semibold mb-2">Projects ({projects.length})</h4>
                  <div className="space-y-2">
                    {projects.length === 0 ? (
                      <p className="text-gray-500 text-sm">No projects created yet</p>
                    ) : (
                      projects.map((project, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {project.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{project.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ModernCard>

            <ModernCard title="🔔 Notifications" className="h-fit">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <h3 className="text-lg font-semibold">Recent Notifications</h3>
                </div>
                
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center">No notifications yet</p>
                  ) : (
                    notifications.map((notification, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{notification.title}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ModernCard>
          </motion.div>
        )}

        {/* Data Processing Tab */}
        {activeTab === 'processing' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <ModernCard title="📊 Advanced Data Processing" className="h-fit">
              <div className="space-y-4">
                <ModernButton 
                  onClick={runAdvancedDataProcessing}
                  variant="primary"
                  className="w-full"
                >
                  Process Sample Data
                </ModernButton>
                
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <h3 className="text-lg font-semibold">Data Processing Engine</h3>
                  <p className="text-sm text-gray-600">
                    Advanced CSV processing, feature engineering, and data quality assessment
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm font-semibold text-purple-600">Multi-Format</div>
                    <div className="text-xs text-gray-600">CSV, Excel, JSON</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-semibold text-green-600">Feature Engineering</div>
                    <div className="text-xs text-gray-600">Auto-generation</div>
                  </div>
                </div>
              </div>
            </ModernCard>

            <ModernCard title="🔧 Processing Features" className="h-fit">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span className="text-sm">Missing value handling</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span className="text-sm">Outlier detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span className="text-sm">Feature scaling</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span className="text-sm">Categorical encoding</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span className="text-sm">Data quality metrics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span className="text-sm">Correlation analysis</span>
                </div>
              </div>
            </ModernCard>
          </motion.div>
        )}

        {/* ML Algorithms Tab */}
        {activeTab === 'algorithms' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <ModernCard title="🤖 Advanced ML Algorithms" className="h-fit">
              <div className="space-y-4">
                <ModernButton 
                  onClick={trainAdvancedModel}
                  variant="primary"
                  className="w-full"
                >
                  Train Random Forest
                </ModernButton>
                
                <div className="text-center">
                  <div className="text-4xl mb-2">🧠</div>
                  <h3 className="text-lg font-semibold">20+ ML Algorithms</h3>
                  <p className="text-sm text-gray-600">
                    From Neural Networks to XGBoost, all available for training
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-semibold text-blue-600">Deep Learning</div>
                    <div className="text-xs text-gray-600">CNN, RNN, LSTM</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm font-semibold text-orange-600">Ensemble</div>
                    <div className="text-xs text-gray-600">XGBoost, Random Forest</div>
                  </div>
                </div>
              </div>
            </ModernCard>

            <ModernCard title="📋 Algorithm Categories" className="h-fit">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-blue-600">Neural Networks</h4>
                  <p className="text-sm text-gray-600">CNN, RNN, LSTM, Transformers</p>
                </div>
                <div>
                  <h4 className="font-semibold text-green-600">Tree-based</h4>
                  <p className="text-sm text-gray-600">Decision Trees, Random Forest</p>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-600">Ensemble Methods</h4>
                  <p className="text-sm text-gray-600">XGBoost, LightGBM, CatBoost</p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-600">Classic ML</h4>
                  <p className="text-sm text-gray-600">SVM, Naive Bayes, K-Means</p>
                </div>
              </div>
            </ModernCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EnhancedFeatures;