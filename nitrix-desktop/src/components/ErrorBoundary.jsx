import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Training Interface Error:', error, info);
    // TODO: Add error logging service integration
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border-red-200">
          <h3 className="text-red-600 font-medium">
            Training interface unavailable
          </h3>
          <p className="mt-2 text-red-500 text-sm">
            Our engineers have been notified. Please refresh the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}