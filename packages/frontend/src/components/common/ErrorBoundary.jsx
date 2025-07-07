/**
 * Enhanced Error Boundary Component
 * Provides comprehensive error handling with recovery options
 */

import React from 'react';
import { errorHandler } from '../../lib/errorHandler';

/**
 * Error Boundary Component with enhanced recovery capabilities
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @param {React.ComponentType} [props.fallback] - Custom fallback component
 * @param {function} [props.onError] - Custom error handler
 * @param {boolean} [props.isolate=false] - Whether to isolate errors to this boundary
 * @param {string} [props.context] - Context information for error tracking
 * 
 * @example
 * <ErrorBoundary context="ModelTraining" onError={handleError}>
 *   <TrainingComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    };
    
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error handling service
    const errorId = errorHandler.handleError(error, {
      component: 'ErrorBoundary',
      context: this.props.context,
      errorInfo,
      retryCount: this.state.retryCount,
      additionalData: {
        props: this.props,
        timestamp: new Date().toISOString()
      }
    }, 'high');

    this.setState({
      errorInfo,
      errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Attempt automatic recovery for certain error types
    this.attemptRecovery(error);
  }

  attemptRecovery = async (error) => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    // Check if error is recoverable
    if (this.isRecoverableError(error)) {
      this.setState({ isRecovering: true });
      
      await new Promise(resolve => 
        setTimeout(resolve, this.retryDelay * (this.state.retryCount + 1))
      );

      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false
      }));
    }
  };

  isRecoverableError = (error) => {
    const recoverablePatterns = [
      /network/i,
      /timeout/i,
      /loading/i,
      /chunk/i, // Chunk loading errors
      /dynamic import/i
    ];

    return recoverablePatterns.some(pattern => 
      pattern.test(error.message || error.toString())
    );
  };

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  renderErrorDetails = () => {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <details className="mt-4 p-4 bg-gray-100 rounded-lg">
        <summary className="cursor-pointer font-medium text-gray-700 mb-2">
          Technical Details (Development Mode)
        </summary>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Error ID:</strong> {this.state.errorId}
          </div>
          <div>
            <strong>Message:</strong> {this.state.error?.message}
          </div>
          <div>
            <strong>Stack:</strong>
            <pre className="mt-1 p-2 bg-gray-200 rounded overflow-x-auto text-xs">
              {this.state.error?.stack}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div>
              <strong>Component Stack:</strong>
              <pre className="mt-1 p-2 bg-gray-200 rounded overflow-x-auto text-xs">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  };

  render() {
    if (this.state.isRecovering) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-900">Recovering...</p>
            <p className="text-sm text-gray-600">
              Attempting to recover from error (Attempt {this.state.retryCount + 1}/{this.maxRetries})
            </p>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      // Use custom fallback component if provided
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoBack={this.handleGoBack}
          context={this.props.context}
          renderErrorDetails={this.renderErrorDetails}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component with comprehensive recovery options
 */
const DefaultErrorFallback = ({
  error,
  errorId,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
  onReload,
  onGoBack,
  context,
  renderErrorDetails
}) => {
  const canRetry = retryCount < maxRetries;
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-50 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
          <svg 
            className="w-8 h-8 text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Error Content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h2>
          
          {context && (
            <p className="text-sm text-gray-500 mb-2">
              Error occurred in: <span className="font-medium">{context}</span>
            </p>
          )}
          
          <p className="text-gray-600 mb-4">
            We're sorry, but something unexpected happened. Our team has been notified.
          </p>
          
          {retryCount > 0 && (
            <p className="text-sm text-amber-600">
              Failed attempts: {retryCount}/{maxRetries}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {canRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-label={`Retry operation (${maxRetries - retryCount} attempts remaining)`}
            >
              Try Again ({maxRetries - retryCount} attempts left)
            </button>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Reset to initial state"
            >
              Reset
            </button>
            
            <button
              onClick={onGoBack}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Go back to previous page"
            >
              Go Back
            </button>
          </div>
          
          <button
            onClick={onReload}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
            aria-label="Reload the entire page"
          >
            Reload Page
          </button>
        </div>

        {/* Error Details */}
        {renderErrorDetails && renderErrorDetails()}

        {/* Error ID for Support */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Please include this ID when reporting the issue
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Higher-order component for wrapping components with error boundary
 * 
 * @param {React.ComponentType} Component - Component to wrap
 * @param {Object} boundaryProps - Props to pass to ErrorBoundary
 * @returns {React.ComponentType} Wrapped component
 * 
 * @example
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   context: 'MyComponent',
 *   onError: (error) => console.error('Component error:', error)
 * });
 */
export const withErrorBoundary = (Component, boundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook for manually triggering error boundary from child components
 * 
 * @returns {function} Function to trigger error boundary
 * 
 * @example
 * const MyComponent = () => {
 *   const triggerError = useErrorBoundary();
 *   
 *   const handleError = () => {
 *     triggerError(new Error('Manual error'));
 *   };
 *   
 *   return <button onClick={handleError}>Trigger Error</button>;
 * };
 */
export const useErrorBoundary = () => {
  return (error) => {
    throw error;
  };
};

export { ErrorBoundary };
export default ErrorBoundary;