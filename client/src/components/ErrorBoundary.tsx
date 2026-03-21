import { Component, type ErrorInfo,type ReactNode } from 'react';
import toast from 'react-hot-toast';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    toast.error('An unexpected error occurred. Please try refreshing the page.');
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 px-4">
          <div className="max-w-md w-full">
            <div className="bg-slate-800 rounded-lg shadow-2xl p-8 border border-red-500/20">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white text-center mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-slate-300 text-center mb-6">
                We're sorry for the inconvenience. An unexpected error has occurred.
              </p>

              {import.meta.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-950/30 rounded-lg border border-red-500/20">
                  <p className="text-xs text-red-300 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Refresh Page
                </button>
                <a
                  href="/"
                  className="block w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                >
                  Go Home
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
