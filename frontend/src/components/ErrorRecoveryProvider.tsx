/**
 * ErrorRecoveryProvider Component
 *
 * Provides comprehensive error recovery mechanisms including automatic retries,
 * fallback strategies, and user-guided recovery actions.
 */

'use client';

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { useErrorHandler } from './GlobalErrorHandler';
import { useGlobalLoading } from './LoadingProvider';
import { ErrorInfo, ErrorCategory } from '../types/entities';
import { getRecoveryStrategy } from '../lib/errors';
import { toast } from 'sonner';
import { RefreshCw, AlertTriangle, CheckCircle, X, Clock } from 'lucide-react';
import { Button } from './ui/button';

interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  automatic?: boolean;
  priority?: number;
}

interface ErrorRecoveryState {
  errorId: string;
  error: ErrorInfo;
  attempts: number;
  maxAttempts: number;
  recoveryActions: RecoveryAction[];
  isRecovering: boolean;
  lastAttemptTime: number;
  backoffDelay: number;
}

interface ErrorRecoveryContextType {
  // Recovery management
  registerRecoveryAction: (errorCategory: ErrorCategory, action: RecoveryAction) => void;
  unregisterRecoveryAction: (errorCategory: ErrorCategory, actionId: string) => void;
  attemptRecovery: (errorId: string, actionId?: string) => Promise<boolean>;

  // Error handling
  handleErrorWithRecovery: (error: Error, context?: string, recoveryActions?: RecoveryAction[]) => Promise<void>;
  clearErrorRecovery: (errorId: string) => void;
  clearAllErrorRecoveries: () => void;

  // State queries
  getRecoveryState: (errorId: string) => ErrorRecoveryState | undefined;
  getAllRecoveryStates: () => ErrorRecoveryState[];
  isRecovering: (errorId: string) => boolean;
  hasRecoverableErrors: boolean;
}

const ErrorRecoveryContext = createContext<ErrorRecoveryContextType | null>(null);

export const useErrorRecovery = () => {
  const context = useContext(ErrorRecoveryContext);
  if (!context) {
    throw new Error('useErrorRecovery must be used within ErrorRecoveryProvider');
  }
  return context;
};

interface ErrorRecoveryProviderProps {
  children: React.ReactNode;
  enableAutoRecovery?: boolean;
  maxRetryAttempts?: number;
  baseBackoffDelay?: number;
  showRecoveryUI?: boolean;
}

export const ErrorRecoveryProvider: React.FC<ErrorRecoveryProviderProps> = ({
  children,
  enableAutoRecovery = true,
  maxRetryAttempts = 3,
  baseBackoffDelay = 1000,
  showRecoveryUI = true,
}) => {
  const { reportError } = useErrorHandler();
  const { startGlobalOperation, updateGlobalOperation, completeGlobalOperation } = useGlobalLoading();

  // Recovery state management
  const [recoveryStates, setRecoveryStates] = useState<Map<string, ErrorRecoveryState>>(new Map());
  const [registeredActions, setRegisteredActions] = useState<Map<ErrorCategory, RecoveryAction[]>>(new Map());

  // Refs for managing timeouts and intervals
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout>();

  // ============================================================================
  // Recovery Action Registration
  // ============================================================================

  const registerRecoveryAction = useCallback((category: ErrorCategory, action: RecoveryAction) => {
    setRegisteredActions(prev => {
      const actions = prev.get(category) || [];
      const filtered = actions.filter(a => a.id !== action.id);
      const updated = [...filtered, action].sort((a, b) => (b.priority || 0) - (a.priority || 0));

      const newMap = new Map(prev);
      newMap.set(category, updated);
      return newMap;
    });
  }, []);

  const unregisterRecoveryAction = useCallback((category: ErrorCategory, actionId: string) => {
    setRegisteredActions(prev => {
      const actions = prev.get(category) || [];
      const filtered = actions.filter(a => a.id !== actionId);

      const newMap = new Map(prev);
      if (filtered.length > 0) {
        newMap.set(category, filtered);
      } else {
        newMap.delete(category);
      }
      return newMap;
    });
  }, []);

  // ============================================================================
  // Error Recovery Logic
  // ============================================================================

  const createErrorId = useCallback(() => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const calculateBackoffDelay = useCallback((attempts: number) => {
    return baseBackoffDelay * Math.pow(2, attempts - 1); // Exponential backoff
  }, [baseBackoffDelay]);

  const handleErrorWithRecovery = useCallback(async (
    error: Error,
    context?: string,
    customRecoveryActions?: RecoveryAction[]
  ) => {
    const errorId = createErrorId();
    const errorInfo = classifyError(error);

    // Get registered recovery actions for this error category
    const registeredActionsForCategory = registeredActions.get(errorInfo.category) || [];

    // Combine registered actions with custom actions
    const allRecoveryActions = [
      ...(customRecoveryActions || []),
      ...registeredActionsForCategory,
    ];

    // Create recovery state
    const recoveryState: ErrorRecoveryState = {
      errorId,
      error: errorInfo,
      attempts: 0,
      maxAttempts: maxRetryAttempts,
      recoveryActions: allRecoveryActions,
      isRecovering: false,
      lastAttemptTime: Date.now(),
      backoffDelay: baseBackoffDelay,
    };

    setRecoveryStates(prev => new Map(prev).set(errorId, recoveryState));

    // Report the error to the global error handler
    reportError(error, context);

    // Attempt automatic recovery if enabled and there are automatic actions
    if (enableAutoRecovery) {
      const automaticActions = allRecoveryActions.filter(action => action.automatic);
      if (automaticActions.length > 0) {
        setTimeout(() => {
          attemptRecovery(errorId, automaticActions[0].id);
        }, calculateBackoffDelay(1));
      }
    }

    // Show recovery UI if enabled
    if (showRecoveryUI && allRecoveryActions.length > 0) {
      showRecoveryToast(errorId, errorInfo, allRecoveryActions);
    }
  }, [
    createErrorId,
    registeredActions,
    maxRetryAttempts,
    baseBackoffDelay,
    reportError,
    enableAutoRecovery,
    showRecoveryUI,
    calculateBackoffDelay,
  ]);

  const attemptRecovery = useCallback(async (errorId: string, actionId?: string): Promise<boolean> => {
    const state = recoveryStates.get(errorId);
    if (!state || state.isRecovering || state.attempts >= state.maxAttempts) {
      return false;
    }

    // Find the recovery action
    const action = actionId
      ? state.recoveryActions.find(a => a.id === actionId)
      : state.recoveryActions[0]; // Use first action if none specified

    if (!action) {
      return false;
    }

    // Update recovery state to indicate recovery in progress
    setRecoveryStates(prev => {
      const updated = {
        ...state,
        isRecovering: true,
        attempts: state.attempts + 1,
        lastAttemptTime: Date.now(),
      };
      return new Map(prev).set(errorId, updated);
    });

    // Start loading operation
    const operationId = `recovery-${errorId}`;
    startGlobalOperation(operationId, `Attempting recovery: ${action.label}`);

    try {
      // Execute the recovery action
      await action.action();

      // Recovery successful
      setRecoveryStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(errorId);
        return newMap;
      });

      completeGlobalOperation(operationId);

      toast.success('Recovery Successful', {
        description: `Successfully recovered from error using: ${action.label}`,
        icon: <CheckCircle className="w-4 h-4" />,
        duration: 5000,
      });

      return true;
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);

      // Update state to indicate recovery failed
      setRecoveryStates(prev => {
        const updated = {
          ...state,
          isRecovering: false,
          backoffDelay: calculateBackoffDelay(state.attempts + 1),
        };
        return new Map(prev).set(errorId, updated);
      });

      completeGlobalOperation(operationId);

      // Schedule next retry if within attempt limits
      if (state.attempts < state.maxAttempts - 1 && enableAutoRecovery && action.automatic) {
        const delay = calculateBackoffDelay(state.attempts + 1);
        const timeoutId = setTimeout(() => {
          attemptRecovery(errorId, actionId);
        }, delay);

        timeoutsRef.current.set(errorId, timeoutId);

        toast.warning('Recovery Failed', {
          description: `Recovery attempt failed. Retrying in ${Math.round(delay / 1000)} seconds...`,
          icon: <Clock className="w-4 h-4" />,
          duration: 4000,
        });
      } else {
        toast.error('Recovery Failed', {
          description: `Unable to recover from error after ${state.attempts + 1} attempts.`,
          icon: <X className="w-4 h-4" />,
          duration: 8000,
        });
      }

      return false;
    }
  }, [
    recoveryStates,
    startGlobalOperation,
    completeGlobalOperation,
    calculateBackoffDelay,
    enableAutoRecovery,
  ]);

  // ============================================================================
  // Recovery UI
  // ============================================================================

  const showRecoveryToast = useCallback((
    errorId: string,
    errorInfo: ErrorInfo,
    actions: RecoveryAction[]
  ) => {
    const primaryAction = actions[0];

    toast.error('Error Occurred', {
      description: errorInfo.userMessage || errorInfo.message,
      icon: <AlertTriangle className="w-4 h-4" />,
      duration: 0, // Don't auto-dismiss
      action: primaryAction ? {
        label: primaryAction.label,
        onClick: () => {
          attemptRecovery(errorId, primaryAction.id);
        },
      } : undefined,
      cancel: {
        label: 'Dismiss',
        onClick: () => {
          clearErrorRecovery(errorId);
        },
      },
    });
  }, [attemptRecovery]);

  // ============================================================================
  // State Management
  // ============================================================================

  const clearErrorRecovery = useCallback((errorId: string) => {
    // Clear any pending timeouts
    const timeoutId = timeoutsRef.current.get(errorId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(errorId);
    }

    // Remove from recovery states
    setRecoveryStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(errorId);
      return newMap;
    });

    toast.dismiss();
  }, []);

  const clearAllErrorRecoveries = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current.clear();

    // Clear all recovery states
    setRecoveryStates(new Map());
    toast.dismiss();
  }, []);

  // ============================================================================
  // State Queries
  // ============================================================================

  const getRecoveryState = useCallback((errorId: string) => {
    return recoveryStates.get(errorId);
  }, [recoveryStates]);

  const getAllRecoveryStates = useCallback(() => {
    return Array.from(recoveryStates.values());
  }, [recoveryStates]);

  const isRecovering = useCallback((errorId: string) => {
    return recoveryStates.get(errorId)?.isRecovering || false;
  }, [recoveryStates]);

  const hasRecoverableErrors = recoveryStates.size > 0;

  // ============================================================================
  // Default Recovery Actions
  // ============================================================================

  React.useEffect(() => {
    // Register default recovery actions for common error types

    // Network error recovery
    registerRecoveryAction(ErrorCategory.NETWORK, {
      id: 'retry-network',
      label: 'Retry Connection',
      description: 'Attempt to reconnect to the network',
      action: async () => {
        // Force a network retry by reloading the page
        window.location.reload();
      },
      automatic: true,
      priority: 10,
    });

    // Wallet connection error recovery
    registerRecoveryAction(ErrorCategory.WALLET, {
      id: 'reconnect-wallet',
      label: 'Reconnect Wallet',
      description: 'Attempt to reconnect your wallet',
      action: async () => {
        // This would trigger wallet reconnection
        // In a real implementation, this would call the wallet connection logic
        console.log('Attempting wallet reconnection');
      },
      automatic: false,
      priority: 10,
    });

    // Contract error recovery
    registerRecoveryAction(ErrorCategory.CONTRACT, {
      id: 'retry-transaction',
      label: 'Retry Transaction',
      description: 'Retry the failed transaction with adjusted parameters',
      action: async () => {
        // This would retry the transaction
        console.log('Retrying contract transaction');
      },
      automatic: false,
      priority: 5,
    });

    // Gas error recovery
    registerRecoveryAction(ErrorCategory.GAS, {
      id: 'increase-gas',
      label: 'Increase Gas Limit',
      description: 'Retry with higher gas limit',
      action: async () => {
        // This would retry with increased gas
        console.log('Retrying with increased gas limit');
      },
      automatic: false,
      priority: 8,
    });
  }, [registerRecoveryAction]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  React.useEffect(() => {
    return () => {
      clearAllErrorRecoveries();
    };
  }, [clearAllErrorRecoveries]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: ErrorRecoveryContextType = {
    registerRecoveryAction,
    unregisterRecoveryAction,
    attemptRecovery,
    handleErrorWithRecovery,
    clearErrorRecovery,
    clearAllErrorRecoveries,
    getRecoveryState,
    getAllRecoveryStates,
    isRecovering,
    hasRecoverableErrors,
  };

  return (
    <ErrorRecoveryContext.Provider value={contextValue}>
      {children}
    </ErrorRecoveryContext.Provider>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function classifyError(error: Error): ErrorInfo {
  // This would use the existing classifyError function from errors.ts
  // For now, return a basic classification
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message,
    category: ErrorCategory.UNKNOWN,
    severity: 'medium' as any,
    timestamp: new Date().toISOString(),
    userMessage: error.message,
    technicalDetails: error.stack || null,
    recoverable: true,
    suggestedAction: 'Please try again',
  };
}