/**
 * LoadingProvider Component
 *
 * Provides global loading state management and displays loading indicators
 * for operations that affect the entire application.
 */

'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useLoadingState, LoadingOperation } from '../hooks/useLoadingState';
import { LoadingIndicator, TransactionLoadingIndicator, RequestLoadingIndicator } from './LoadingIndicator';
import { Card, CardContent } from './ui/card';
import { X, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface LoadingContextType {
  // Global loading operations
  startGlobalOperation: (id: string, description: string, options?: {
    showInHeader?: boolean;
    showFullScreen?: boolean;
    type?: 'transaction' | 'request' | 'general';
  }) => void;
  updateGlobalOperation: (id: string, updates: {
    description?: string;
    progress?: number;
    stage?: string;
  }) => void;
  completeGlobalOperation: (id: string) => void;
  failGlobalOperation: (id: string, error?: Error) => void;

  // Transaction specific
  startTransactionLoading: (txHash: string, description?: string) => void;
  updateTransactionLoading: (txHash: string, stage: 'submitting' | 'pending' | 'confirming' | 'confirmed' | 'failed', data?: any) => void;
  completeTransactionLoading: (txHash: string) => void;

  // Request specific
  startRequestLoading: (requestId: string, description?: string) => void;
  updateRequestLoading: (requestId: string, stage: 'preparing' | 'submitting' | 'waiting' | 'fulfilling' | 'completed', data?: any) => void;
  completeRequestLoading: (requestId: string) => void;

  // State
  isGloballyLoading: boolean;
  globalOperationCount: number;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
  showHeaderIndicator?: boolean;
  showFloatingIndicator?: boolean;
  enableMinimize?: boolean;
}

interface ExtendedLoadingOperation extends LoadingOperation {
  type?: 'transaction' | 'request' | 'general';
  showInHeader?: boolean;
  showFullScreen?: boolean;
  txHash?: string;
  requestId?: string;
  stage?: string;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
  showHeaderIndicator = true,
  showFloatingIndicator = true,
  enableMinimize = true,
}) => {
  const [operations, setOperations] = React.useState<Map<string, ExtendedLoadingOperation>>(new Map());
  const [minimizedOperations, setMinimizedOperations] = React.useState<Set<string>>(new Set());

  const loadingState = useLoadingState({
    onComplete: (operationId) => {
      setOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      setMinimizedOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    },
    onError: (operationId, error) => {
      console.error(`Operation ${operationId} failed:`, error);
    },
  });

  // ============================================================================
  // Operation Management
  // ============================================================================

  const startGlobalOperation = useCallback((
    id: string,
    description: string,
    options: {
      showInHeader?: boolean;
      showFullScreen?: boolean;
      type?: 'transaction' | 'request' | 'general';
    } = {}
  ) => {
    const {
      showInHeader = false,
      showFullScreen = false,
      type = 'general',
    } = options;

    loadingState.startOperation(id, description);

    setOperations(prev => new Map(prev).set(id, {
      id,
      description,
      startTime: Date.now(),
      type,
      showInHeader,
      showFullScreen,
    }));
  }, [loadingState]);

  const updateGlobalOperation = useCallback((
    id: string,
    updates: {
      description?: string;
      progress?: number;
      stage?: string;
    }
  ) => {
    loadingState.updateOperation(id, updates);

    setOperations(prev => {
      const current = prev.get(id);
      if (!current) return prev;

      const updated = { ...current, ...updates };
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
  }, [loadingState]);

  const completeGlobalOperation = useCallback((id: string) => {
    loadingState.completeOperation(id);
  }, [loadingState]);

  const failGlobalOperation = useCallback((id: string, error?: Error) => {
    loadingState.failOperation(id, error);
  }, [loadingState]);

  // ============================================================================
  // Transaction Loading
  // ============================================================================

  const startTransactionLoading = useCallback((txHash: string, description?: string) => {
    const id = `tx-${txHash}`;
    startGlobalOperation(id, description || `Transaction ${txHash.slice(0, 10)}...`, {
      type: 'transaction',
      showInHeader: true,
    });

    setOperations(prev => {
      const current = prev.get(id);
      if (!current) return prev;

      const updated = { ...current, txHash, stage: 'submitting' };
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
  }, [startGlobalOperation]);

  const updateTransactionLoading = useCallback((
    txHash: string,
    stage: 'submitting' | 'pending' | 'confirming' | 'confirmed' | 'failed',
    data?: any
  ) => {
    const id = `tx-${txHash}`;

    let description = `Transaction ${txHash.slice(0, 10)}...`;
    let progress: number | undefined;

    switch (stage) {
      case 'submitting':
        description = 'Submitting transaction...';
        break;
      case 'pending':
        description = 'Transaction pending...';
        break;
      case 'confirming':
        description = `Confirming transaction (${data?.confirmations || 0}/${data?.required || 3})`;
        progress = data?.confirmations && data?.required
          ? (data.confirmations / data.required) * 100
          : undefined;
        break;
      case 'confirmed':
        description = 'Transaction confirmed!';
        progress = 100;
        break;
      case 'failed':
        description = 'Transaction failed';
        break;
    }

    updateGlobalOperation(id, { description, progress, stage });
  }, [updateGlobalOperation]);

  const completeTransactionLoading = useCallback((txHash: string) => {
    completeGlobalOperation(`tx-${txHash}`);
  }, [completeGlobalOperation]);

  // ============================================================================
  // Request Loading
  // ============================================================================

  const startRequestLoading = useCallback((requestId: string, description?: string) => {
    const id = `req-${requestId}`;
    startGlobalOperation(id, description || `Request #${requestId}`, {
      type: 'request',
      showInHeader: true,
    });

    setOperations(prev => {
      const current = prev.get(id);
      if (!current) return prev;

      const updated = { ...current, requestId, stage: 'preparing' };
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
  }, [startGlobalOperation]);

  const updateRequestLoading = useCallback((
    requestId: string,
    stage: 'preparing' | 'submitting' | 'waiting' | 'fulfilling' | 'completed',
    data?: any
  ) => {
    const id = `req-${requestId}`;

    let description = `Request #${requestId}`;
    let progress: number | undefined;

    switch (stage) {
      case 'preparing':
        description = 'Preparing randomness request...';
        break;
      case 'submitting':
        description = 'Submitting randomness request...';
        break;
      case 'waiting':
        description = 'Waiting for Drand fulfillment...';
        break;
      case 'fulfilling':
        description = 'Fulfilling randomness request...';
        progress = 75;
        break;
      case 'completed':
        description = 'Randomness request completed!';
        progress = 100;
        break;
    }

    updateGlobalOperation(id, { description, progress, stage });
  }, [updateGlobalOperation]);

  const completeRequestLoading = useCallback((requestId: string) => {
    completeGlobalOperation(`req-${requestId}`);
  }, [completeGlobalOperation]);

  // ============================================================================
  // UI Controls
  // ============================================================================

  const minimizeOperation = useCallback((operationId: string) => {
    setMinimizedOperations(prev => new Set(prev).add(operationId));
  }, []);

  const restoreOperation = useCallback((operationId: string) => {
    setMinimizedOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(operationId);
      return newSet;
    });
  }, []);

  const dismissOperation = useCallback((operationId: string) => {
    completeGlobalOperation(operationId);
  }, [completeGlobalOperation]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const visibleOperations = Array.from(operations.values()).filter(
    op => !minimizedOperations.has(op.id)
  );

  const headerOperations = visibleOperations.filter(op => op.showInHeader);
  const fullScreenOperations = visibleOperations.filter(op => op.showFullScreen);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderOperation = (operation: ExtendedLoadingOperation) => {
    if (operation.type === 'transaction' && operation.txHash && operation.stage) {
      return (
        <TransactionLoadingIndicator
          stage={operation.stage as any}
          transactionHash={operation.txHash}
          confirmations={operation.progress ? Math.floor(operation.progress / 33.33) : 0}
          requiredConfirmations={3}
        />
      );
    }

    if (operation.type === 'request' && operation.requestId && operation.stage) {
      return (
        <RequestLoadingIndicator
          stage={operation.stage as any}
          estimatedTime={operation.estimatedDuration ? operation.estimatedDuration / 1000 : undefined}
        />
      );
    }

    return (
      <LoadingIndicator
        variant="spinner"
        size="md"
        text={operation.description}
        progress={operation.progress}
      />
    );
  };

  const contextValue: LoadingContextType = {
    startGlobalOperation,
    updateGlobalOperation,
    completeGlobalOperation,
    failGlobalOperation,
    startTransactionLoading,
    updateTransactionLoading,
    completeTransactionLoading,
    startRequestLoading,
    updateRequestLoading,
    completeRequestLoading,
    isGloballyLoading: operations.size > 0,
    globalOperationCount: operations.size,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}

      {/* Full Screen Loading Overlays */}
      {fullScreenOperations.map(operation => (
        <div key={operation.id} className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6">
              {renderOperation(operation)}
              {enableMinimize && (
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => minimizeOperation(operation.id)}
                  >
                    <Minimize2 className="w-4 h-4 mr-2" />
                    Minimize
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Floating Loading Indicators */}
      {showFloatingIndicator && visibleOperations.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 space-y-2 max-w-sm">
          {visibleOperations.slice(0, 3).map(operation => (
            <Card key={operation.id} className="shadow-lg border-l-4 border-l-blue-500">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {renderOperation(operation)}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {enableMinimize && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => minimizeOperation(operation.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Minimize2 className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissOperation(operation.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {visibleOperations.length > 3 && (
            <div className="text-center text-sm text-gray-500">
              +{visibleOperations.length - 3} more operations
            </div>
          )}
        </div>
      )}

      {/* Minimized Operations Indicator */}
      {minimizedOperations.size > 0 && (
        <div className="fixed bottom-4 left-4 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMinimizedOperations(new Set())}
            className="bg-white shadow-lg"
          >
            <LoadingIndicator variant="dots" size="sm" color="primary" />
            <span className="ml-2">{minimizedOperations.size} operations</span>
          </Button>
        </div>
      )}
    </LoadingContext.Provider>
  );
};