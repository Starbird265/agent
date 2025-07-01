import React, { useState, useEffect } from 'react';
import { auth } from './lib/supabase';
import AuthForm from './components/Auth/AuthForm';
import SupabaseDashboard from './components/Dashboard/SupabaseDashboard';
import './App.css';

function AppSupabase() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Check if user is already signed in
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        setAuthError('');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
      setAuthError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (authData) => {
    console.log('Authentication successful:', authData);
    if (authData.user) {
      setUser(authData.user);
      setAuthError('');
    }
  };

  const handleAuthError = (error) => {
    console.error('Authentication error:', error);
    setAuthError(error.message || 'Authentication failed');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">AI TrainEasy</h2>
          <p className="text-gray-600">Loading your dashboard...</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>🚀 Powered by Supabase</p>
            <p>✨ No more backend issues!</p>
          </div>
        </div>
      </div>
    );
  }

  // Authentication error state
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <button
            onClick={() => {
              setAuthError('');
              checkUser();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main app render
  return (
    <div className="App">
      {user ? (
        // User is authenticated - show dashboard
        <SupabaseDashboard />
      ) : (
        // User is not authenticated - show auth form
        <AuthForm 
          onAuthSuccess={handleAuthSuccess}
          onAuthError={handleAuthError}
        />
      )}
    </div>
  );
}

export default AppSupabase;