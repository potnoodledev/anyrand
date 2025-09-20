/**
 * useRequestStatusUpdates Hook
 *
 * Provides real-time status updates for pending randomness requests
 * with automatic polling and event-based updates.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Address } from 'viem';
import { useAccount, useChainId, useBlockNumber } from 'wagmi';
import { RequestState, RandomnessRequest } from '../types/entities';
import { createAnyrandContract } from '../lib/contracts';
import { queryKeys } from '../lib/queryClient';

interface RequestStatusUpdate {
  requestId: bigint;
  previousState: RequestState;
  currentState: RequestState;
  timestamp: Date;
  blockNumber?: bigint;
  transactionHash?: string;
}

interface UseRequestStatusUpdatesOptions {
  requestIds?: bigint[];
  enabled?: boolean;
  pollInterval?: number;
  onStatusUpdate?: (update: RequestStatusUpdate) => void;
}

interface UseRequestStatusUpdatesReturn {
  // Status tracking
  pendingRequestIds: bigint[];
  statusUpdates: RequestStatusUpdate[];
  latestUpdate: RequestStatusUpdate | null;

  // Loading states
  isPolling: boolean;
  isListening: boolean;

  // Controls
  startPolling: () => void;
  stopPolling: () => void;
  clearUpdates: () => void;

  // Request status queries
  getRequestStatus: (requestId: bigint) => RequestState | undefined;
  isRequestPending: (requestId: bigint) => boolean;
  isRequestFulfilled: (requestId: bigint) => boolean;
  isRequestFailed: (requestId: bigint) => boolean;
}

export function useRequestStatusUpdates(
  options: UseRequestStatusUpdatesOptions = {}
): UseRequestStatusUpdatesReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const queryClient = useQueryClient();

  const {
    requestIds = [],
    enabled = true,
    pollInterval = 10000, // 10 seconds
    onStatusUpdate,
  } = options;

  // State refs for tracking
  const statusCacheRef = useRef<Map<string, RequestState>>(new Map());
  const updatesRef = useRef<RequestStatusUpdate[]>([]);
  const isPollingRef = useRef(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout>();

  // ============================================================================
  // Status Polling Query
  // ============================================================================

  const statusQuery = useQuery({
    queryKey: ['requestStatusUpdates', chainId, requestIds],
    queryFn: async (): Promise<Map<string, RequestState>> => {
      if (!chainId || requestIds.length === 0) {
        return new Map();
      }

      const contract = createAnyrandContract(chainId);
      const statusMap = new Map<string, RequestState>();

      // Batch fetch all request states
      const statusPromises = requestIds.map(async (requestId) => {
        try {
          const state = await contract.getRequestState(requestId);
          return { requestId, state };
        } catch (error) {
          console.warn(`Failed to get status for request ${requestId}:`, error);
          return { requestId, state: RequestState.PENDING };
        }
      });

      const results = await Promise.all(statusPromises);
      results.forEach(({ requestId, state }) => {
        statusMap.set(requestId.toString(), state);
      });

      return statusMap;
    },
    enabled: enabled && !!chainId && requestIds.length > 0,
    refetchInterval: isPollingRef.current ? pollInterval : false,
    staleTime: 5000, // 5 seconds
  });

  // ============================================================================
  // Status Change Detection
  // ============================================================================

  useEffect(() => {
    if (!statusQuery.data) return;

    const currentStatusMap = statusQuery.data;
    const previousStatusMap = statusCacheRef.current;

    // Check for status changes
    const updates: RequestStatusUpdate[] = [];

    currentStatusMap.forEach((currentState, requestIdStr) => {
      const requestId = BigInt(requestIdStr);
      const previousState = previousStatusMap.get(requestIdStr);

      if (previousState && previousState !== currentState) {
        const update: RequestStatusUpdate = {
          requestId,
          previousState,
          currentState,
          timestamp: new Date(),
          blockNumber,
        };

        updates.push(update);

        // Call callback if provided
        if (onStatusUpdate) {
          onStatusUpdate(update);
        }
      }
    });

    // Update cache
    statusCacheRef.current = new Map(currentStatusMap);

    // Store updates
    if (updates.length > 0) {
      updatesRef.current = [...updatesRef.current, ...updates].slice(-100); // Keep last 100 updates

      // Invalidate related queries to update UI
      updates.forEach(update => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.request(update.requestId, chainId),
        });
      });
    }
  }, [statusQuery.data, blockNumber, onStatusUpdate, queryClient, chainId]);

  // ============================================================================
  // Real-time Event Listening
  // ============================================================================

  useEffect(() => {
    if (!address || !chainId || !enabled || requestIds.length === 0) return;

    const contract = createAnyrandContract(chainId);

    // Watch for fulfillment events on tracked requests
    const unwatchFulfilled = contract.watchRandomnessFulfilled(
      (event) => {
        const requestIdStr = event.requestId.toString();
        if (requestIds.some(id => id.toString() === requestIdStr)) {
          const previousState = statusCacheRef.current.get(requestIdStr) || RequestState.PENDING;
          const currentState = event.callbackSuccess ? RequestState.FULFILLED : RequestState.CALLBACK_FAILED;

          if (previousState !== currentState) {
            const update: RequestStatusUpdate = {
              requestId: event.requestId,
              previousState,
              currentState,
              timestamp: new Date(),
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash,
            };

            updatesRef.current = [...updatesRef.current, update].slice(-100);
            statusCacheRef.current.set(requestIdStr, currentState);

            if (onStatusUpdate) {
              onStatusUpdate(update);
            }

            // Trigger refetch of status query
            statusQuery.refetch();
          }
        }
      },
      address
    );

    return () => {
      unwatchFulfilled();
    };
  }, [address, chainId, enabled, requestIds, onStatusUpdate, statusQuery]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const pendingRequestIds = useMemo(() => {
    if (!statusQuery.data) return [];

    return requestIds.filter(requestId => {
      const state = statusQuery.data!.get(requestId.toString());
      return state === RequestState.PENDING;
    });
  }, [statusQuery.data, requestIds]);

  const statusUpdates = useMemo(() => {
    return [...updatesRef.current];
  }, [statusQuery.dataUpdatedAt]); // Trigger re-render when data updates

  const latestUpdate = useMemo(() => {
    return updatesRef.current[updatesRef.current.length - 1] || null;
  }, [statusQuery.dataUpdatedAt]);

  // ============================================================================
  // Control Functions
  // ============================================================================

  const startPolling = useCallback(() => {
    isPollingRef.current = true;
    statusQuery.refetch();
  }, [statusQuery]);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }
  }, []);

  const clearUpdates = useCallback(() => {
    updatesRef.current = [];
  }, []);

  // ============================================================================
  // Status Query Functions
  // ============================================================================

  const getRequestStatus = useCallback((requestId: bigint): RequestState | undefined => {
    return statusQuery.data?.get(requestId.toString());
  }, [statusQuery.data]);

  const isRequestPending = useCallback((requestId: bigint): boolean => {
    return getRequestStatus(requestId) === RequestState.PENDING;
  }, [getRequestStatus]);

  const isRequestFulfilled = useCallback((requestId: bigint): boolean => {
    return getRequestStatus(requestId) === RequestState.FULFILLED;
  }, [getRequestStatus]);

  const isRequestFailed = useCallback((requestId: bigint): boolean => {
    return getRequestStatus(requestId) === RequestState.CALLBACK_FAILED;
  }, [getRequestStatus]);

  // ============================================================================
  // Auto-start polling for pending requests
  // ============================================================================

  useEffect(() => {
    if (pendingRequestIds.length > 0 && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [pendingRequestIds.length, enabled, startPolling, stopPolling]);

  return {
    // Status tracking
    pendingRequestIds,
    statusUpdates,
    latestUpdate,

    // Loading states
    isPolling: isPollingRef.current && statusQuery.isFetching,
    isListening: enabled && !!address && !!chainId,

    // Controls
    startPolling,
    stopPolling,
    clearUpdates,

    // Request status queries
    getRequestStatus,
    isRequestPending,
    isRequestFulfilled,
    isRequestFailed,
  };
}