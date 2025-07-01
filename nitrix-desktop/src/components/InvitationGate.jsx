import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function InvitationGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [invitationCode, setInvitationCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);

  // Check existing session on component mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const sessionToken = localStorage.getItem('session_token');
    
    if (!sessionToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/session-info`, {
        headers: {
          'X-Session-Token': sessionToken
        }
      });

      if (response.ok) {
        const sessionData = await response.json();
        if (sessionData.valid) {
          setIsAuthenticated(true);
          setSessionInfo(sessionData);
        } else {
          localStorage.removeItem('session_token');
        }
      } else {
        localStorage.removeItem('session_token');
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      localStorage.removeItem('session_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationSubmit = async (e) => {
    e.preventDefault();
    
    if (!invitationCode.trim()) {
      setError('Please enter your invitation code');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth/validate-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: invitationCode.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('session_token', data.session_token);
        setIsAuthenticated(true);
        setSessionInfo({ 
          expires_in: data.expires_in,
          message: data.message 
        });
      } else {
        setError(data.detail || 'Invalid invitation code');
      }
    } catch (error) {
      setError('Failed to validate invitation code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    setIsAuthenticated(false);
    setSessionInfo(null);
    setInvitationCode('');
    setError('');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your session...</p>
        </div>
      </div>
    );
  }

  // Authenticated - show the main app
  if (isAuthenticated) {
    return (
      <div>
        {/* Session indicator */}
        <div className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-700 font-medium">Beta Access</span>
            <button
              onClick={handleLogout}
              className="ml-2 text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-100"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // Not authenticated - show invitation form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6">
            <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="16" fill="white" fillOpacity="0.2" />
              <path d="M10 22l6-12 6 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI TrainEasy</h1>
          <p className="text-gray-600">Automated Machine Learning Platform</p>
          <div className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full mt-4">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Beta Access Required
          </div>
        </div>

        {/* Invitation Form */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Invitation Code</h2>
            <p className="text-gray-600 text-sm">
              This is a private beta. Please enter your invitation code to access the platform.
            </p>
          </div>
          
          <form onSubmit={handleInvitationSubmit} className="space-y-4">
            <div>
              <label htmlFor="invitation-code" className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Code
              </label>
              <input
                id="invitation-code"
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center uppercase tracking-wider"
                placeholder="BETA-XXXX-XXXXXX"
                disabled={isValidating}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isValidating}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isValidating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Validating...
                </div>
              ) : (
                'Access Platform'
              )}
            </button>
          </form>
          
          {/* Beta Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p className="mb-2">🔐 Private Beta Features:</p>
              <ul className="text-xs space-y-1">
                <li>✨ Advanced AutoML capabilities</li>
                <li>🚀 Real-time model training</li>
                <li>📊 System monitoring dashboard</li>
                <li>🤖 Hugging Face integration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sample Codes Info */}
        <div className="mt-6 text-center">
          <details className="bg-white/60 backdrop-blur-sm rounded-lg p-4 text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
              Don't have an invitation code? 
            </summary>
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
              <p className="mb-2">Try one of these demo codes:</p>
              <div className="space-y-1 font-mono">
                <div className="cursor-pointer hover:text-blue-600" onClick={() => setInvitationCode('BETA-2024-EARLY')}>BETA-2024-EARLY</div>
                <div className="cursor-pointer hover:text-blue-600" onClick={() => setInvitationCode('AUTOML-PREVIEW')}>AUTOML-PREVIEW</div>
                <div className="cursor-pointer hover:text-blue-600" onClick={() => setInvitationCode('AI-TRAIN-DEMO')}>AI-TRAIN-DEMO</div>
              </div>
              <p className="mt-2 italic">
                * Demo codes are limited and may expire
              </p>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          AI TrainEasy MVP v1.0.0-beta
        </div>
      </div>
    </div>
  );
}