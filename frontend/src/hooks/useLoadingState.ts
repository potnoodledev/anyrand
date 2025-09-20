/**
 * useLoadingState Hook
 *
 * Provides centralized loading state management with support for
 * multiple concurrent operations and progress tracking.
 */

import { useCallback, useState, useRef, useEffect } from 'react';

export interface LoadingOperation {
  id: string;
  description: string;
  progress?: number;
  stage?: string;
  startTime: number;
  estimatedDuration?: number;
}

interface UseLoadingStateOptions {
  defaultTimeout?: number; // Default timeout in ms
  onTimeout?: (operationId: string) => void;
  onComplete?: (operationId: string, duration: number) => void;
  onError?: (operationId: string, error: Error) => void;
}

interface UseLoadingStateReturn {
  // State queries
  isLoading: boolean;
  hasOperations: boolean;
  operationCount: number;

  // Operation management
  startOperation: (id: string, description: string, options?: {
    progress?: number;
    stage?: string;
    estimatedDuration?: number;
    timeout?: number;
  }) => void;
  updateOperation: (id: string, updates: {
    description?: string;
    progress?: number;
    stage?: string;
  }) => void;
  completeOperation: (id: string) => void;
  failOperation: (id: string, error?: Error) => void;
  clearOperations: () => void;

  // Operation queries
  getOperation: (id: string) => LoadingOperation | undefined;
  getAllOperations: () => LoadingOperation[];
  isOperationLoading: (id: string) => boolean;
  getOperationProgress: (id: string) => number | undefined;
  getOperationDuration: (id: string) => number | undefined;

  // Bulk operations
  startMultipleOperations: (operations: Array<{
    id: string;
    description: string;
    estimatedDuration?: number;
  }>) => void;

  // Advanced state
  overallProgress: number;
  longestRunningOperation: LoadingOperation | null;
  averageProgress: number;
}

export function useLoadingState(options: UseLoadingStateOptions = {}): UseLoadingStateReturn {
  const {
    defaultTimeout = 30000, // 30 seconds
    onTimeout,
    onComplete,
    onError,
  } = options;

  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ============================================================================
  // Operation Management
  // ============================================================================

  const startOperation = useCallback((
    id: string,
    description: string,
    operationOptions: {
      progress?: number;
      stage?: string;
      estimatedDuration?: number;
      timeout?: number;
    } = {}
  ) => {
    const {
      progress = 0,
      stage,
      estimatedDuration,
      timeout = defaultTimeout,
    } = operationOptions;

    const operation: LoadingOperation = {
      id,
      description,
      progress,
      stage,
      startTime: Date.now(),
      estimatedDuration,
    };

    setOperations(prev => new Map(prev).set(id, operation));

    // Set timeout for operation
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        if (onTimeout) {
          onTimeout(id);
        }
        completeOperation(id);
      }, timeout);

      timeoutsRef.current.set(id, timeoutId);
    }
  }, [defaultTimeout, onTimeout]);

  const updateOperation = useCallback((
    id: string,
    updates: {
      description?: string;
      progress?: number;
      stage?: string;
    }
  ) => {
    setOperations(prev => {
      const current = prev.get(id);
      if (!current) return prev;

      const updated = { ...current, ...updates };
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
  }, []);

  const completeOperation = useCallback((id: string) => {
    setOperations(prev => {
      const operation = prev.get(id);
      if (operation && onComplete) {
        const duration = Date.now() - operation.startTime;
        onComplete(id, duration);
      }

      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    // Clear timeout
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, [onComplete]);

  const failOperation = useCallback((id: string, error?: Error) => {
    if (error && onError) {
      onError(id, error);
    }

    completeOperation(id);
  }, [onError, completeOperation]);

  const clearOperations = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current.clear();

    setOperations(new Map());
  }, []);

  // ============================================================================
  // Operation Queries
  // ============================================================================

  const getOperation = useCallback((id: string): LoadingOperation | undefined => {
    return operations.get(id);
  }, [operations]);

  const getAllOperations = useCallback((): LoadingOperation[] => {
    return Array.from(operations.values());
  }, [operations]);

  const isOperationLoading = useCallback((id: string): boolean => {
    return operations.has(id);
  }, [operations]);

  const getOperationProgress = useCallback((id: string): number | undefined => {
    return operations.get(id)?.progress;
  }, [operations]);

  const getOperationDuration = useCallback((id: string): number | undefined => {
    const operation = operations.get(id);
    return operation ? Date.now() - operation.startTime : undefined;
  }, [operations]);

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  const startMultipleOperations = useCallback((
    operationList: Array<{
      id: string;
      description: string;
      estimatedDuration?: number;
    }>
  ) => {
    operationList.forEach(op => {
      startOperation(op.id, op.description, {
        estimatedDuration: op.estimatedDuration,
      });
    });
  }, [startOperation]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isLoading = operations.size > 0;
  const hasOperations = operations.size > 0;
  const operationCount = operations.size;

  const overallProgress = (() => {
    const ops = Array.from(operations.values());
    if (ops.length === 0) return 0;

    const totalProgress = ops.reduce((sum, op) => sum + (op.progress || 0), 0);
    return totalProgress / ops.length;
  })();

  const longestRunningOperation = (() => {
    const ops = Array.from(operations.values());
    if (ops.length === 0) return null;

    return ops.reduce((longest, current) => {
      const currentDuration = Date.now() - current.startTime;
      const longestDuration = Date.now() - longest.startTime;
      return currentDuration > longestDuration ? current : longest;
    });
  })();

  const averageProgress = (() => {
    const ops = Array.from(operations.values()).filter(op => op.progress !== undefined);
    if (ops.length === 0) return 0;

    const totalProgress = ops.reduce((sum, op) => sum + (op.progress || 0), 0);
    return totalProgress / ops.length;
  })();

  // ============================================================================
  // Cleanup on unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      clearOperations();
    };
  }, [clearOperations]);

  return {
    // State queries
    isLoading,
    hasOperations,
    operationCount,

    // Operation management
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    clearOperations,

    // Operation queries
    getOperation,
    getAllOperations,
    isOperationLoading,
    getOperationProgress,
    getOperationDuration,

    // Bulk operations
    startMultipleOperations,

    // Advanced state
    overallProgress,
    longestRunningOperation,
    averageProgress,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for managing async operation loading states
 */
export function useAsyncOperation<T = any>(
  operationFn: (...args: any[]) => Promise<T>,
  options: {
    operationId?: string;
    description?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    operationId = 'async-operation',
    description = 'Processing...',
    onSuccess,
    onError,
  } = options;

  const { startOperation, updateOperation, completeOperation, failOperation, isOperationLoading } = useLoadingState();

  const execute = useCallback(async (...args: any[]): Promise<T | undefined> => {
    try {
      startOperation(operationId, description);

      const result = await operationFn(...args);

      completeOperation(operationId);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      failOperation(operationId, err);

      if (onError) {
        onError(err);
      }

      return undefined;
    }
  }, [operationFn, operationId, description, startOperation, completeOperation, failOperation, onSuccess, onError]);

  const updateProgress = useCallback((progress: number, stage?: string) => {
    updateOperation(operationId, { progress, stage });
  }, [updateOperation, operationId]);

  return {
    execute,
    updateProgress,
    isLoading: isOperationLoading(operationId),
  };
}

/**
 * Hook for managing transaction loading states
 */
export function useTransactionLoading() {
  const loadingState = useLoadingState({
    defaultTimeout: 300000, // 5 minutes for transactions
  });

  const startTransaction = useCallback((
    txHash: string,
    description: string = 'Processing transaction'
  ) => {
    loadingState.startOperation(`tx-${txHash}`, description, {
      stage: 'pending',
      estimatedDuration: 60000, // 1 minute estimate
    });
  }, [loadingState]);

  const updateTransactionProgress = useCallback((
    txHash: string,
    confirmations: number,
    requiredConfirmations: number = 3
  ) => {
    const progress = Math.min((confirmations / requiredConfirmations) * 100, 100);
    const stage = confirmations >= requiredConfirmations ? 'confirmed' : 'confirming';

    loadingState.updateOperation(`tx-${txHash}`, {
      progress,
      stage,
      description: `Transaction ${stage} (${confirmations}/${requiredConfirmations} confirmations)`,
    });
  }, [loadingState]);

  const completeTransaction = useCallback((txHash: string) => {
    loadingState.completeOperation(`tx-${txHash}`);
  }, [loadingState]);

  const failTransaction = useCallback((txHash: string, error?: Error) => {
    loadingState.failOperation(`tx-${txHash}`, error);
  }, [loadingState]);

  return {
    ...loadingState,
    startTransaction,
    updateTransactionProgress,
    completeTransaction,
    failTransaction,
  };
}