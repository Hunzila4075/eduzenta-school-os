import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary Caught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="p-8 max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-purple-400">View Rendering Handled</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected state property was accessed. The error has been captured safely to prevent system crashes.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              Reset Session View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
