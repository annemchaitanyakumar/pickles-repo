import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI for production
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-600">Please try again later</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}