 import { useEffect, useState } from 'react';
import { pingServer, createProject, fetchProjects, saveSchema, fetchSystemInfo } from './api';
import InvitationGate from './components/InvitationGate';
import DatasetBuilder from './components/DatasetBuilder';
import LabelingTool from './components/LabelingTool';
import TrainingWizard from './components/TrainingWizard';
import PredictionUI from './components/PredictionUI';
import TrainingFeedback from './components/TrainingFeedback';
import HuggingFaceModelDownloader from './components/HuggingFaceModelDownloader';

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [dataset, setDataset] = useState([]);
  const [sysInfo, setSysInfo] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [schema, setSchema] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const [statusResult, projectsResult, sysInfoResult] = await Promise.all([
        pingServer(),
        fetchProjects(),
        fetchSystemInfo()
      ]);
      
      setStatus(statusResult);
      setAllProjects(projectsResult);
      setSysInfo(sysInfoResult);
      
      addNotification('System connected successfully!', 'success');
    } catch (error) {
      console.error('Initialization failed:', error);
      setStatus('Connection Error');
      addNotification('Failed to connect to backend', 'error');
    }
  };

  const loadProjects = async () => {
    try {
      const list = await fetchProjects();
      setAllProjects(list);
    } catch (error) {
      addNotification('Failed to load projects', 'error');
    }
  };

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      addNotification('Please enter a project name', 'warning');
      return;
    }

    try {
      const result = await createProject(projectName.trim());
      if (result?.success) {
        setProject(result.project);
        setProjectName('');
        loadProjects();
        setCurrentTab('project');
        addNotification(`Project "${result.project.name}" created successfully!`, 'success');
      } else {
        addNotification('Failed to create project', 'error');
      }
    } catch (error) {
      addNotification('Error creating project', 'error');
    }
  };

  const selectProject = (selectedProject) => {
    setProject(selectedProject);
    setCurrentTab('project');
    setDataset([]);
    setSchema(null);
    addNotification(`Switched to project: ${selectedProject.name}`, 'info');
  };

  return (
    <InvitationGate>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 max-w-sm ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-400 text-green-800' 
                : notification.type === 'error'
                ? 'bg-red-50 border-red-400 text-red-800'
                : notification.type === 'warning'
                ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                : 'bg-blue-50 border-blue-400 text-blue-800'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {notification.type === 'success' && (
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'warning' && (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg width="40" height="40" fill="none" viewBox="0 0 40 40" className="drop-shadow-sm">
                    <circle cx="20" cy="20" r="20" fill="url(#gradient)" />
                    <path d="M12 28l8-16 8 16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI TrainEasy</h1>
                  <p className="text-sm text-gray-500">Automated Machine Learning Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${status === 'Connection Error' ? 'bg-red-400' : 'bg-green-400'}`}></div>
                <span className="text-sm font-medium text-gray-700">{status}</span>
              </div>
              <div className="text-sm text-gray-500">
                Beta v1.0.0
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('projects')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Projects ({allProjects.length})
            </button>
            {project && (
              <button
                onClick={() => setCurrentTab('project')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === 'project'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {project.name} →
              </button>
            )}
            <button
              onClick={() => setCurrentTab('system')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              System
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to AI TrainEasy
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Train machine learning models in minutes, not hours. Upload your data, configure your model, and let AI do the heavy lifting.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Project</h3>
                <p className="text-gray-600 text-sm mb-4">Start a new machine learning project with your data</p>
                <button
                  onClick={() => setCurrentTab('projects')}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Get Started →
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Projects</h3>
                <p className="text-gray-600 text-sm mb-4">Manage your ongoing machine learning projects</p>
                <div className="text-2xl font-bold text-green-600">{allProjects.length}</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">System Status</h3>
                <p className="text-gray-600 text-sm mb-4">Monitor your system performance</p>
                <button
                  onClick={() => setCurrentTab('system')}
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                >
                  View Details →
                </button>
              </div>
            </div>

            {/* Recent Projects */}
            {allProjects.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
                <div className="space-y-3">
                  {allProjects.slice(0, 3).map((proj) => (
                    <div key={proj.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{proj.name}</p>
                          <p className="text-sm text-gray-500">Created {new Date(proj.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => selectProject(proj)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
                {allProjects.length > 3 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setCurrentTab('projects')}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View All Projects →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentTab === 'projects' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
              <div className="text-sm text-gray-500">
                {allProjects.length} project{allProjects.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Create New Project */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name (e.g., 'Customer Churn Prediction')"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <button
                  onClick={handleCreateProject}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
                >
                  Create Project
                </button>
              </div>
            </div>

            {/* Projects List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProjects.map((proj) => (
                <div key={proj.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{proj.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      proj.status === 'completed' ? 'bg-green-100 text-green-800' :
                      proj.status === 'training' ? 'bg-yellow-100 text-yellow-800' :
                      proj.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {proj.status || 'New'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Created {new Date(proj.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => selectProject(proj)}
                    className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                  >
                    Open Project
                  </button>
                </div>
              ))}
            </div>

            {allProjects.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500 mb-4">Create your first machine learning project to get started.</p>
              </div>
            )}
          </div>
        )}

        {currentTab === 'project' && project && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
                <p className="text-sm text-gray-500">Project ID: {project.id}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'training' ? 'bg-yellow-100 text-yellow-800' :
                  project.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status || 'New'}
                </span>
                <button
                  onClick={() => setCurrentTab('projects')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Project Workflow */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Workflow</h3>
              
              {/* Step 1: Upload Dataset */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Upload Dataset</h4>
                </div>
                <div className="ml-11">
                  <DatasetBuilder project={project} onDataLoaded={(data, csvText) => {
                    setDataset(data);
                    // Store CSV data for real ML training
                    if (csvText) {
                      try {
                        // Optionally compress CSV data here (e.g., using LZ-string or similar)
                        // const compressed = compress(csvText);
                        // localStorage.setItem(`csvData_${project.id}`, compressed);
                        localStorage.setItem(`csvData_${project.id}`, csvText);
                      } catch (e) {
                        addNotification('Failed to save dataset to local storage. Storage may be full or unavailable.', 'error');
                      }
                    }
                  }} />
                </div>
              </div>

              {/* Step 2: Configure Schema */}
              {dataset.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 font-semibold">2</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Configure Schema</h4>
                  </div>
                  <div className="ml-11">
                    <LabelingTool 
                      data={dataset} 
                      onSchemaSave={(newSchema) => {
                        saveSchema(project.id, newSchema).then(response => {
                          if (response?.success) {
                            setSchema(newSchema);
                            addNotification('Schema saved successfully!', 'success');
                          } else {
                            addNotification('Failed to save schema', 'error');
                          }
                        });
                      }} 
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Train Model */}
              {dataset.length > 0 && schema && (
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-purple-600 font-semibold">3</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Train Model</h4>
                  </div>
                  <div className="ml-11">
                    <TrainingWizard projectId={project.id} schema={schema} />
                  </div>
                </div>
              )}

              {/* Step 4: Make Predictions */}
              {dataset.length > 0 && schema && (
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-orange-600 font-semibold">4</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Make Predictions</h4>
                  </div>
                  <div className="ml-11">
                    <PredictionUI projectId={project.id} schema={schema} />
                  </div>
                </div>
              )}

              {/* Additional Tools */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Tools</h4>
                <div className="space-y-4">
                  <HuggingFaceModelDownloader projectId={project.id} />
                  <TrainingFeedback projectId={project.id} />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'system' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">System Information</h2>
            
            {sysInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">CPU</h3>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{sysInfo.cpu_count} cores</div>
                  <div className="text-sm text-gray-500">Usage: {sysInfo.cpu_percent}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${sysInfo.cpu_percent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Memory</h3>
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{sysInfo.total_ram_gb} GB</div>
                  <div className="text-sm text-gray-500">Usage: {sysInfo.ram_percent}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${sysInfo.ram_percent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">GPU</h3>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {sysInfo.gpu_available ? sysInfo.gpu_count : '0'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {sysInfo.gpu_available ? sysInfo.gpu_names.join(', ') : 'No GPU detected'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading system information...</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} AI TrainEasy MVP &mdash; Beta Version
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Crafted with <span className="text-red-400">♥</span> for the ML community
            </p>
          </div>
        </div>
      </footer>
    </div>
    </InvitationGate>
  );
}