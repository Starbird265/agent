import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4 text-center">
          <h1 className="text-xl font-bold text-red-600">Something went wrong.</h1>
          <p className="mt-2">Please try refreshing the page. If the problem persists, contact support.</p>
          {/* Optionally, display some error details in development
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 p-2 bg-gray-100 text-left text-sm overflow-auto">
              <summary>Error Details</summary>
              <pre>{this.state.error && this.state.error.toString()}</pre>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </details>
          )}
          */}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
