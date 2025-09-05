import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
}

// Error categorization for better user experience
const categorizeError = (error: Error): { category: string; userMessage: string; severity: 'low' | 'medium' | 'high' } => {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      category: 'network',
      userMessage: 'Unable to connect to our servers. Please check your internet connection.',
      severity: 'medium'
    };
  }
  
  if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
    return {
      category: 'loading',
      userMessage: 'Failed to load application resources. This might be due to a slow connection.',
      severity: 'low'
    };
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
    return {
      category: 'permission',
      userMessage: 'You don\'t have permission to access this feature.',
      severity: 'medium'
    };
  }
  
  return {
    category: 'unknown',
    userMessage: 'An unexpected error occurred. Our team has been notified.',
    severity: 'high'
  };
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const { errorId } = this.state;
    
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    this.setState({
      error,
      errorInfo
    });

    // Report error to external service in production
    if (window.location.hostname !== 'localhost') {
      this.reportError(error, errorInfo, errorId);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private reportError = async (error: Error, errorInfo: any, errorId: string) => {
    try {
      // In a real app, this would send to an error reporting service like Sentry
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          category: categorizeError(error).category
        })
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    // Limit retry attempts
    if (newRetryCount > 3) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: newRetryCount
    });

    // Add a small delay before retrying to avoid immediate re-error
    this.retryTimeout = setTimeout(() => {
      // Force a re-render by updating a key or state
      window.location.reload();
    }, 100);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorId } = this.state;
    const subject = encodeURIComponent(`Bug Report - Error ${errorId}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
Browser: ${navigator.userAgent}

Error Details:
${error?.message || 'Unknown error'}

Steps to reproduce:
1. 
2. 
3. 

Additional context:

    `);
    
    window.open(`mailto:support@vectorbeats.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, retryCount } = this.state;
      const errorCategory = error ? categorizeError(error) : null;
      const isRetryDisabled = retryCount >= 3;

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white/90 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-8 shadow-2xl">
            {/* Error Icon and Status */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                errorCategory?.severity === 'high' 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : errorCategory?.severity === 'medium'
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
              }`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Oops! Something went wrong
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300">
                {errorCategory?.userMessage || 'We encountered an unexpected error.'}
              </p>
            </div>

            {/* Error ID for support */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Error ID:</span>
                <code className="text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {errorId}
                </code>
              </div>
            </div>

            {/* Development Error Details */}
            {window.location.hostname === 'localhost' && error && (
              <details className="mb-6">
                <summary className="text-red-600 dark:text-red-400 cursor-pointer hover:text-red-500 dark:hover:text-red-300 text-sm font-medium mb-2 flex items-center">
                  <Bug className="w-4 h-4 mr-2" />
                  Error Details (Development Mode)
                </summary>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4 mt-2">
                  <div className="text-xs font-mono">
                    <div className="text-red-800 dark:text-red-300 mb-2">
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <pre className="text-red-700 dark:text-red-400 whitespace-pre-wrap break-words text-xs overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="text-red-600 dark:text-red-400 cursor-pointer">Component Stack</summary>
                        <pre className="text-red-700 dark:text-red-400 whitespace-pre-wrap break-words text-xs mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                disabled={isRetryDisabled}
                className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                  isRetryDisabled
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transform hover:scale-105'
                }`}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isRetryDisabled ? `Max retries reached (${retryCount}/3)` : `Try Again ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 font-medium rounded-lg transition-all duration-300"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reload
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 font-medium rounded-lg transition-all duration-300"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </button>
              </div>
            </div>

            {/* Support Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Need help? Our support team is here for you.
              </p>
              
              <button
                onClick={this.handleReportBug}
                className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 text-sm font-medium transition-colors"
              >
                <Mail className="w-4 h-4 mr-1" />
                Report Bug
              </button>
            </div>

            {/* Performance Hint */}
            {errorCategory?.category === 'loading' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                <p className="text-blue-800 dark:text-blue-300 text-sm">
                  💡 <strong>Tip:</strong> If you're on a slow connection, try refreshing the page or switching to a faster network.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
