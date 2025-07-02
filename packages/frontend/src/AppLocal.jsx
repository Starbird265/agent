import React, { useState, useEffect } from 'react';
import LocalDashboard from './components/LocalFirst/LocalDashboard';
import { localDB } from './lib/localDB';
import './App.css';

function AppLocal() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await localDB.init();
      setInitialized(true);
      
      // Set up service worker for offline functionality
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          console.log('Service worker registration failed');
        });
      }
      
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError('Failed to initialize local storage. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">AI TrainEasy</h2>
          <p className="text-gray-600 mb-6">Initializing your privacy-first ML platform...</p>
          
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Setting up local storage...
            </div>
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Loading ML training engine...
            </div>
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Everything stays on your device
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Initialization Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
            
            <div className="text-sm text-gray-500">
              <p className="mb-2">Troubleshooting:</p>
              <ul className="text-left space-y-1">
                <li>• Make sure you're using a modern browser</li>
                <li>• Check if JavaScript is enabled</li>
                <li>• Try clearing browser cache</li>
                <li>• Ensure local storage is enabled</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Initializing...</h2>
          <p className="text-gray-600">Please wait while we set up your local ML environment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <LocalDashboard />
    </div>
  );
}

export default AppLocal;