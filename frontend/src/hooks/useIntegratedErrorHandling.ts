/**
 * useIntegratedErrorHandling Hook
 *
 * Provides integrated error handling that combines error classification,
 * recovery mechanisms, loading states, and user notifications.
 */

import { useCallback } from 'react';
import { Hash } from 'viem';
import { useErrorHandler } from '../components/GlobalErrorHandler';
import { useErrorRecovery } from '../components/ErrorRecoveryProvider';
import { useGlobalLoading } from '../components/LoadingProvider';
import { useTransactionMonitoring } from '../components/TransactionMonitorProvider';
import { ErrorCategory } from '../types/entities';

interface ErrorHandlingOptions {
  context?: string;
  showNotification?: boolean;
  enableAutoRecovery?: boolean;
  enableLoading?: boolean;
  transactionHash?: Hash;
  operationId?: string;
}

interface TransactionErrorHandlingOptions extends ErrorHandlingOptions {
  transactionHash: Hash;
  retryAction?: () => Promise<void>;
}

interface RequestErrorHandlingOptions extends ErrorHandlingOptions {
  requestId: string;
  retryAction?: () => Promise<void>;
}

export function useIntegratedErrorHandling() {
  const { reportError, reportContractError, reportNetworkError } = useErrorHandler();
  const { handleErrorWithRecovery, registerRecoveryAction } = useErrorRecovery();
  const { startGlobalOperation, completeGlobalOperation, failGlobalOperation } = useGlobalLoading();
  const { addTransaction } = useTransactionMonitoring();

  // ============================================================================
  // General Error Handling
  // ============================================================================

  const handleError = useCallback(async (
    error: Error,
    options: ErrorHandlingOptions = {}
  ) => {
    const {
      context = 'Unknown operation',
      showNotification = true,
      enableAutoRecovery = true,
      enableLoading = true,
      operationId,
    } = options;

    // Complete any ongoing operation
    if (operationId && enableLoading) {
      failGlobalOperation(operationId, error);
    }

    // Report error to global handler if notifications are enabled
    if (showNotification) {
      reportError(error, context);
    }

    // Attempt recovery if enabled
    if (enableAutoRecovery) {
      await handleErrorWithRecovery(error, context);
    }
  }, [reportError, handleErrorWithRecovery, failGlobalOperation]);

  // ============================================================================
  // Transaction Error Handling
  // ============================================================================

  const handleTransactionError = useCallback(async (
    error: Error,
    options: TransactionErrorHandlingOptions
  ) => {
    const {
      transactionHash,
      retryAction,
      context = `Transaction ${transactionHash.slice(0, 10)}...`,
      showNotification = true,
      enableAutoRecovery = true,
    } = options;

    // Mark transaction as failed in monitoring
    addTransaction(transactionHash, 'Failed transaction');

    // Create recovery actions specific to transactions
    const recoveryActions = [];

    if (retryAction) {
      recoveryActions.push({
        id: 'retry-transaction',
        label: 'Retry Transaction',
        description: 'Retry the failed transaction',
        action: retryAction,
        automatic: false,
        priority: 10,
      });
    }

    // Add gas increase recovery for gas-related errors
    if (error.message.toLowerCase().includes('gas')) {
      recoveryActions.push({
        id: 'increase-gas',
        label: 'Increase Gas',
        description: 'Retry with higher gas limit',
        action: async () => {
          if (retryAction) {
            // In a real implementation, this would modify gas settings
            console.log('Retrying with increased gas');
            await retryAction();
          }
        },
        automatic: false,
        priority: 8,
      });
    }

    // Report as contract error
    if (showNotification) {
      reportContractError(error, 'transaction');
    }

    // Attempt recovery if enabled
    if (enableAutoRecovery) {
      await handleErrorWithRecovery(error, context, recoveryActions);
    }
  }, [addTransaction, reportContractError, handleErrorWithRecovery]);

  // ============================================================================
  // Request Error Handling
  // ============================================================================

  const handleRequestError = useCallback(async (
    error: Error,
    options: RequestErrorHandlingOptions
  ) => {
    const {
      requestId,
      retryAction,
      context = `Randomness request #${requestId}`,
      showNotification = true,
      enableAutoRecovery = true,
    } = options;

    // Create recovery actions specific to requests
    const recoveryActions = [];

    if (retryAction) {
      recoveryActions.push({
        id: 'retry-request',
        label: 'Retry Request',
        description: 'Retry the randomness request',
        action: retryAction,
        automatic: false,
        priority: 10,
      });
    }

    // Add deadline adjustment recovery for deadline errors
    if (error.message.toLowerCase().includes('deadline')) {
      recoveryActions.push({
        id: 'adjust-deadline',
        label: 'Adjust Deadline',
        description: 'Create a new request with extended deadline',
        action: async () => {
          if (retryAction) {
            console.log('Retrying with extended deadline');
            await retryAction();
          }
        },
        automatic: false,
        priority: 8,
      });
    }

    // Report error
    if (showNotification) {
      reportError(error, context);
    }

    // Attempt recovery if enabled
    if (enableAutoRecovery) {
      await handleErrorWithRecovery(error, context, recoveryActions);
    }
  }, [reportError, handleErrorWithRecovery]);

  // ============================================================================
  // Network Error Handling
  // ============================================================================

  const handleNetworkError = useCallback(async (
    error: Error,
    options: ErrorHandlingOptions = {}
  ) => {
    const {
      context = 'Network operation',
      showNotification = true,
      enableAutoRecovery = true,
      operationId,
    } = options;

    // Complete any ongoing operation
    if (operationId) {
      failGlobalOperation(operationId, error);
    }

    // Report as network error
    if (showNotification) {
      reportNetworkError(error);
    }

    // Create network-specific recovery actions
    const recoveryActions = [
      {
        id: 'retry-connection',
        label: 'Retry Connection',
        description: 'Attempt to reconnect to the network',
        action: async () => {
          console.log('Retrying network connection');
          // In a real implementation, this would trigger network retry logic
        },
        automatic: true,
        priority: 10,
      },
      {
        id: 'check-connection',
        label: 'Check Connection',
        description: 'Verify your internet connection',
        action: async () => {
          console.log('Checking internet connection');
          // Could open network diagnostics or check connectivity
        },
        automatic: false,
        priority: 5,
      },
    ];

    // Attempt recovery if enabled
    if (enableAutoRecovery) {
      await handleErrorWithRecovery(error, context, recoveryActions);
    }
  }, [reportNetworkError, handleErrorWithRecovery, failGlobalOperation]);

  // ============================================================================
  // Wrapped Operation Execution
  // ============================================================================

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions & {
      operationName?: string;
      successMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const {
      operationName = 'Operation',
      successMessage,
      context,
      enableLoading = true,
      operationId = `operation-${Date.now()}`,
    } = options;

    if (enableLoading) {
      startGlobalOperation(operationId, operationName);
    }

    try {
      const result = await operation();

      if (enableLoading) {
        completeGlobalOperation(operationId);
      }

      if (successMessage) {
        // Could show success toast here
        console.log(successMessage);
      }

      return result;
    } catch (error) {
      console.error(`${operationName} failed:`, error);

      await handleError(
        error instanceof Error ? error : new Error(String(error)),
        { ...options, operationId, context: context || operationName }
      );

      return null;
    }
  }, [startGlobalOperation, completeGlobalOperation, handleError]);

  // ============================================================================
  // Recovery Action Registration
  // ============================================================================

  const registerCustomRecoveryAction = useCallback((
    category: ErrorCategory,
    actionId: string,
    label: string,
    description: string,
    action: () => Promise<void> | void,
    options: {
      automatic?: boolean;
      priority?: number;
    } = {}
  ) => {
    registerRecoveryAction(category, {
      id: actionId,
      label,
      description,
      action,
      automatic: options.automatic || false,
      priority: options.priority || 5,
    });
  }, [registerRecoveryAction]);

  return {
    // General error handling
    handleError,
    executeWithErrorHandling,

    // Specific error handlers
    handleTransactionError,
    handleRequestError,
    handleNetworkError,

    // Recovery customization
    registerCustomRecoveryAction,
  };
}