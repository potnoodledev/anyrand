/**
 * GlobalErrorHandler Component
 *
 * Provides comprehensive global error handling with toast notifications,
 * error logging, and recovery mechanisms for the entire application.
 */

'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, X, Wifi, WifiOff, Bug } from 'lucide-react';
import { Button } from './ui/button';
import { ErrorInfo } from '../types/entities';
import { classifyError } from '../lib/errors';

interface GlobalErrorContextType {
  // Error reporting
  reportError: (error: Error, context?: string) => void;
  reportUserError: (message: string, details?: string) => void;
  reportNetworkError: (error: Error) => void;
  reportContractError: (error: Error, method?: string) => void;

  // Recovery actions
  retryLastAction: () => void;
  clearErrors: () => void;

  // State
  isOnline: boolean;
  hasErrors: boolean;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null);

export const useErrorHandler = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within GlobalErrorHandler');
  }
  return context;
};

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
  enableErrorReporting?: boolean;
  enableAutoRetry?: boolean;
}

let lastAction: (() => void) | null = null;
let errorCount = 0;

export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({
  children,
  enableErrorReporting = true,
  enableAutoRetry = false,
}) => {
  const [isOnline, setIsOnline] = React.useState(true);
  const [hasErrors, setHasErrors] = React.useState(false);

  // ============================================================================
  // Network Status Monitoring
  // ============================================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection Restored', {
        description: 'Your internet connection has been restored.',
        icon: <Wifi className="w-4 h-4" />,
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection Lost', {
        description: 'Please check your internet connection.',
        icon: <WifiOff className="w-4 h-4" />,
        duration: 0, // Don't auto-dismiss
        action: {
          label: 'Retry',
          onClick: () => {
            window.location.reload();
          },
        },
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================================================
  // Error Classification and Handling
  // ============================================================================

  const handleError = useCallback((error: Error, context?: string, type?: string) => {
    errorCount++;
    setHasErrors(true);

    if (enableErrorReporting) {
      console.error(`[${type || 'Error'}] ${context || 'Unknown context'}:`, error);
    }

    const errorInfo = classifyError(error);
    const contextLabel = context ? ` in ${context}` : '';

    // Show appropriate toast based on error type
    switch (errorInfo.type) {
      case 'network':
        toast.error('Network Error', {
          description: `Connection failed${contextLabel}. Please check your internet connection.`,
          icon: <WifiOff className="w-4 h-4" />,
          duration: 8000,
          action: {
            label: 'Retry',
            onClick: () => {
              if (lastAction) {
                lastAction();
              } else {
                window.location.reload();
              }
            },
          },
        });
        break;

      case 'validation':
        toast.error('Validation Error', {
          description: errorInfo.userMessage || 'Please check your input and try again.',
          icon: <AlertTriangle className="w-4 h-4" />,
          duration: 6000,
        });
        break;

      case 'permission':
        toast.error('Permission Denied', {
          description: errorInfo.userMessage || 'You do not have permission to perform this action.',
          icon: <X className="w-4 h-4" />,
          duration: 8000,
        });
        break;

      case 'contract':
        toast.error('Blockchain Error', {
          description: errorInfo.userMessage || `Transaction failed${contextLabel}. Please try again.`,
          icon: <AlertTriangle className="w-4 h-4" />,
          duration: 10000,
          action: {
            label: 'Details',
            onClick: () => {
              // Show detailed error modal or navigate to help
              console.log('Show contract error details:', error);
            },
          },
        });
        break;

      case 'timeout':
        toast.error('Request Timeout', {
          description: `The request timed out${contextLabel}. Please try again.`,
          icon: <AlertTriangle className="w-4 h-4" />,
          duration: 8000,
          action: {
            label: 'Retry',
            onClick: () => {
              if (lastAction) {
                lastAction();
              }
            },
          },
        });
        break;

      default:
        toast.error('Unexpected Error', {
          description: errorInfo.userMessage || `Something went wrong${contextLabel}. Please try again.`,
          icon: <Bug className="w-4 h-4" />,
          duration: 8000,
          action: {
            label: 'Report',
            onClick: () => {
              // Report error to monitoring service
              reportErrorToService(error, context);
            },
          },
        });
        break;
    }

    // Auto-retry for specific error types
    if (enableAutoRetry && errorInfo.retryable && errorCount < 3) {
      setTimeout(() => {
        if (lastAction) {
          toast.info('Retrying automatically...', {
            duration: 2000,
            icon: <RefreshCw className="w-4 h-4" />,
          });
          lastAction();
        }
      }, 2000 * errorCount); // Exponential backoff
    }
  }, [enableErrorReporting, enableAutoRetry]);

  // ============================================================================
  // Specific Error Handlers
  // ============================================================================

  const reportError = useCallback((error: Error, context?: string) => {
    handleError(error, context, 'General');
  }, [handleError]);

  const reportUserError = useCallback((message: string, details?: string) => {
    const error = new Error(message);
    if (details) {
      error.stack = details;
    }
    handleError(error, 'User Action', 'User');
  }, [handleError]);

  const reportNetworkError = useCallback((error: Error) => {
    handleError(error, 'Network Request', 'Network');
  }, [handleError]);

  const reportContractError = useCallback((error: Error, method?: string) => {
    const context = method ? `Contract method: ${method}` : 'Contract interaction';
    handleError(error, context, 'Contract');
  }, [handleError]);

  // ============================================================================
  // Recovery Actions
  // ============================================================================

  const retryLastAction = useCallback(() => {
    if (lastAction) {
      toast.info('Retrying last action...', {
        duration: 2000,
        icon: <RefreshCw className="w-4 h-4" />,
      });
      lastAction();
    } else {
      toast.warning('No action to retry', {
        duration: 3000,
      });
    }
  }, []);

  const clearErrors = useCallback(() => {
    errorCount = 0;
    setHasErrors(false);
    toast.dismiss();
    toast.success('Errors cleared', {
      duration: 2000,
    });
  }, []);

  // ============================================================================
  // Error Boundary Fallback
  // ============================================================================

  const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
        </p>
        <div className="space-y-3">
          <Button onClick={resetErrorBoundary} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Refresh page
          </Button>
        </div>
        {enableErrorReporting && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">Error details</summary>
            <pre className="mt-2 text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // Error Reporting Service
  // ============================================================================

  const reportErrorToService = useCallback((error: Error, context?: string) => {
    // In a real application, this would send to an error monitoring service
    // like Sentry, LogRocket, or Bugsnag
    if (enableErrorReporting) {
      console.group('🐛 Error Report');
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Timestamp:', new Date().toISOString());
      console.log('User Agent:', navigator.userAgent);
      console.log('URL:', window.location.href);
      console.groupEnd();
    }
  }, [enableErrorReporting]);

  // ============================================================================
  // Global Error Event Handlers
  // ============================================================================

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const error = new Error(event.reason || 'Unhandled promise rejection');
      handleError(error, 'Promise rejection', 'Unhandled');
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      reportError(event.error || new Error(event.message), 'Global error handler');
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleError, reportError]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: GlobalErrorContextType = {
    // Error reporting
    reportError,
    reportUserError,
    reportNetworkError,
    reportContractError,

    // Recovery actions
    retryLastAction,
    clearErrors,

    // State
    isOnline,
    hasErrors,
  };

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error, errorInfo) => {
          reportErrorToService(error, 'React Error Boundary');
        }}
        onReset={() => {
          clearErrors();
        }}
      >
        {children}
      </ErrorBoundary>
    </GlobalErrorContext.Provider>
  );
};