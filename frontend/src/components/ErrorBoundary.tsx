/**
 * ErrorBoundary Component
 *
 * Catches and handles React errors with user-friendly error messages
 * and recovery options. Includes error reporting functionality.
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { createErrorReport } from '../lib/errors';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  errorId: string;
  resetError: () => void;
  showErrorDetails?: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Generate error report
    const errorReport = createErrorReport(
      {
        code: 'REACT_ERROR',
        message: error.message,
        category: 'application' as any,
        severity: 'high' as any,
        timestamp: new Date().toISOString(),
        userMessage: 'An unexpected error occurred in the application.',
        technicalDetails: error.stack || null,
        recoverable: true,
        suggestedAction: 'Try refreshing the page or contact support if the problem persists.',
      },
      {
        additionalContext: {
          componentStack: errorInfo.componentStack,
          errorBoundary: this.constructor.name,
        },
      }
    );

    this.setState({
      error,
      errorInfo,
      errorId: errorReport.errorId,
    });

    // Call the onError callback
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.report(errorReport);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId!}
          resetError={this.resetError}
          showErrorDetails={this.props.showErrorDetails}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  resetError,
  showErrorDetails = false,
}) => {
  const [showDetails, setShowDetails] = React.useState(showErrorDetails);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const copyErrorDetails = async () => {
    const errorDetails = `
Error ID: ${errorId}
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo.componentStack}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `;

    try {
      await navigator.clipboard.writeText(errorDetails);
      alert('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-6 h-6" />
            <span>Something went wrong</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-muted-foreground">
            We're sorry, but an unexpected error occurred. This has been logged and our team
            has been notified. Please try one of the options below.
          </div>

          {/* Error ID */}
          <div className="p-3 rounded-md bg-muted/50 border">
            <div className="text-sm font-medium">Error ID</div>
            <div className="text-sm font-mono text-muted-foreground">{errorId}</div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={resetError}
              variant="default"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </Button>

            <Button
              onClick={handleReload}
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Reload Page
            </Button>

            <Button
              onClick={handleGoHome}
              variant="outline"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Go Home
            </Button>
          </div>

          {/* Error Details Toggle */}
          <div className="border-t pt-4">
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              size="sm"
              leftIcon={<Bug className="w-4 h-4" />}
            >
              {showDetails ? 'Hide' : 'Show'} Error Details
            </Button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Error Message</div>
                  <div className="text-sm p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 font-mono">
                    {error.message}
                  </div>
                </div>

                {error.stack && (
                  <div>
                    <div className="text-sm font-medium mb-1">Stack Trace</div>
                    <div className="text-xs p-3 rounded-md bg-muted/50 border font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                      {error.stack}
                    </div>
                  </div>
                )}

                {errorInfo.componentStack && (
                  <div>
                    <div className="text-sm font-medium mb-1">Component Stack</div>
                    <div className="text-xs p-3 rounded-md bg-muted/50 border font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                      {errorInfo.componentStack}
                    </div>
                  </div>
                )}

                <Button
                  onClick={copyErrorDetails}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Copy Error Details
                </Button>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
              Need Help?
            </div>
            <div className="text-blue-700 dark:text-blue-300">
              If this problem persists, please contact support and include the Error ID above.
              You can also copy the error details to help with troubleshooting.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for error reporting in functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: any) => {
    const errorReport = createErrorReport(
      {
        code: 'MANUAL_ERROR',
        message: error.message,
        category: 'application' as any,
        severity: 'medium' as any,
        timestamp: new Date().toISOString(),
        userMessage: 'An error was manually reported.',
        technicalDetails: error.stack || null,
        recoverable: true,
        suggestedAction: 'Check the error details and try again.',
      },
      {
        additionalContext: errorInfo,
      }
    );

    console.error('Manual error report:', errorReport);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // errorReportingService.report(errorReport);
    }

    return errorReport.errorId;
  }, []);
}

export default ErrorBoundary;