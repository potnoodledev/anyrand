/**
 * usePendingRequests Hook
 *
 * Manages pending randomness requests across all users, providing real-time
 * updates on fulfillment queue, estimated wait times, and batch fulfillment status.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Address, Hash } from 'viem';
import { useChainId, useBlockNumber } from 'wagmi';
import {
  UsePendingRequestsReturn,
  PendingRequestsFilter,
  FulfillmentEstimate,
} from '../types/hooks';
import {
  PendingRequest,
  RequestPriority,
  FulfillmentStatus,
  ErrorInfo,
} from '../types/entities';
import { ContractRequest } from '../types/blockchain';
import { getRequestById } from '../lib/contracts';
import { classifyError } from '../lib/errors';
import { queryKeys } from '../lib/queryClient';

// Mock function to fetch pending requests
// In real implementation, this would query RandomnessRequested events
// and filter for requests that haven't been fulfilled
const fetchPendingRequests = async (
  chainId: number,
  filter: PendingRequestsFilter = {}
): Promise<PendingRequest[]> => {
  // This is a placeholder implementation
  // Real implementation would:
  // 1. Query all RandomnessRequested events
  // 2. Query all RandomnessFulfilled events
  // 3. Find requests that exist in the first but not the second
  // 4. Fetch current state from contract
  // 5. Calculate priority and estimated fulfillment time

  const mockPendingRequests: PendingRequest[] = [];

  return mockPendingRequests;
};

const calculateRequestPriority = (
  feePaid: bigint,
  effectiveFeePerGas: bigint,
  deadline: bigint,
  currentTime: bigint
): RequestPriority => {
  const timeToDeadline = deadline - currentTime;
  const feePerGasNumber = Number(effectiveFeePerGas);

  // High priority: High fee and/or close to deadline
  if (feePerGasNumber > 50_000_000_000 || timeToDeadline < 300n) { // 50 gwei or < 5 minutes
    return RequestPriority.HIGH;
  }

  // Low priority: Low fee and far from deadline
  if (feePerGasNumber < 10_000_000_000 && timeToDeadline > 3600n) { // < 10 gwei and > 1 hour
    return RequestPriority.LOW;
  }

  return RequestPriority.MEDIUM;
};

const estimateFulfillmentTime = (
  priority: RequestPriority,
  queuePosition: number,
  averageBlockTime: number = 12 // seconds
): Date => {
  const now = new Date();
  let estimatedMinutes = 0;

  switch (priority) {
    case RequestPriority.HIGH:
      estimatedMinutes = Math.max(1, queuePosition * 0.5); // 30 seconds per request
      break;
    case RequestPriority.MEDIUM:
      estimatedMinutes = Math.max(2, queuePosition * 1); // 1 minute per request
      break;
    case RequestPriority.LOW:
      estimatedMinutes = Math.max(5, queuePosition * 2); // 2 minutes per request
      break;
  }

  return new Date(now.getTime() + estimatedMinutes * 60 * 1000);
};

const transformContractToPendingRequest = (
  contractRequest: ContractRequest,
  queuePosition: number,
  blockTimestamp: number
): PendingRequest => {
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const priority = calculateRequestPriority(
    contractRequest.feePaid,
    contractRequest.effectiveFeePerGas,
    contractRequest.deadline,
    currentTime
  );

  const estimatedFulfillmentTime = estimateFulfillmentTime(priority, queuePosition);

  return {
    id: contractRequest.requestId.toString(),
    requestId: contractRequest.requestId,
    requester: contractRequest.requester,
    priority,
    queuePosition,
    deadline: contractRequest.deadline,
    callbackGasLimit: contractRequest.callbackGasLimit,
    feePaid: contractRequest.feePaid,
    effectiveFeePerGas: contractRequest.effectiveFeePerGas,
    pubKeyHash: contractRequest.pubKeyHash,
    round: contractRequest.round,
    estimatedFulfillmentTime,
    createdAt: new Date(blockTimestamp * 1000),
    status: FulfillmentStatus.QUEUED,
    fulfillmentAttempts: 0,
    lastAttemptAt: null,
    metadata: {
      requestType: 'standard',
      source: 'unknown',
    },
  };
};

export function usePendingRequests(
  filter: PendingRequestsFilter = {}
): UsePendingRequestsReturn {
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const queryClient = useQueryClient();

  // ============================================================================
  // Main Pending Requests Query
  // ============================================================================

  const pendingRequestsQuery = useQuery({
    queryKey: queryKeys.pendingRequests(chainId, filter),
    queryFn: async (): Promise<PendingRequest[]> => {
      if (!chainId) throw new Error('Chain ID not available');
      return fetchPendingRequests(chainId, filter);
    },
    enabled: !!chainId,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  });

  // ============================================================================
  // Data Processing
  // ============================================================================

  const pendingRequests = useMemo(() => {
    return pendingRequestsQuery.data || [];
  }, [pendingRequestsQuery.data]);

  // Apply client-side filtering
  const filteredRequests = useMemo(() => {
    let filtered = [...pendingRequests];

    // Filter by priority
    if (filter.priority && filter.priority.length > 0) {
      filtered = filtered.filter(request => filter.priority!.includes(request.priority));
    }

    // Filter by requester
    if (filter.requester) {
      filtered = filtered.filter(request =>
        request.requester.toLowerCase() === filter.requester!.toLowerCase()
      );
    }

    // Filter by minimum fee
    if (filter.minFee) {
      filtered = filtered.filter(request => request.feePaid >= filter.minFee!);
    }

    // Filter by maximum wait time
    if (filter.maxWaitTime) {
      const maxWaitMs = filter.maxWaitTime * 60 * 1000; // convert minutes to ms
      const now = new Date();
      filtered = filtered.filter(request =>
        request.estimatedFulfillmentTime.getTime() - now.getTime() <= maxWaitMs
      );
    }

    // Sort by queue position (ascending)
    return filtered.sort((a, b) => a.queuePosition - b.queuePosition);
  }, [pendingRequests, filter]);

  // ============================================================================
  // Statistics
  // ============================================================================

  const queueStats = useMemo(() => {
    const total = filteredRequests.length;
    const high = filteredRequests.filter(r => r.priority === RequestPriority.HIGH).length;
    const medium = filteredRequests.filter(r => r.priority === RequestPriority.MEDIUM).length;
    const low = filteredRequests.filter(r => r.priority === RequestPriority.LOW).length;

    const totalFees = filteredRequests.reduce((sum, r) => sum + r.feePaid, 0n);
    const avgFee = total > 0 ? totalFees / BigInt(total) : 0n;

    const now = new Date();
    const avgWaitTime = total > 0
      ? filteredRequests.reduce((sum, r) => {
          const waitMs = Math.max(0, r.estimatedFulfillmentTime.getTime() - now.getTime());
          return sum + waitMs;
        }, 0) / total / 1000 / 60 // convert to minutes
      : 0;

    return {
      total,
      byPriority: { high, medium, low },
      totalFees,
      avgFee,
      avgWaitTime: Math.round(avgWaitTime),
    };
  }, [filteredRequests]);

  // ============================================================================
  // Fulfillment Estimation
  // ============================================================================

  const estimateFulfillment = useCallback((
    callbackGasLimit: bigint,
    feePaid: bigint,
    deadline: bigint
  ): FulfillmentEstimate => {
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const priority = calculateRequestPriority(feePaid, feePaid / callbackGasLimit, deadline, currentTime);

    // Estimate queue position based on priority and fee
    const higherPriorityRequests = filteredRequests.filter(r => {
      if (priority === RequestPriority.HIGH) return false;
      if (priority === RequestPriority.MEDIUM && r.priority === RequestPriority.HIGH) return true;
      if (priority === RequestPriority.LOW && r.priority !== RequestPriority.LOW) return true;
      return r.effectiveFeePerGas > (feePaid / callbackGasLimit);
    });

    const estimatedPosition = higherPriorityRequests.length + 1;
    const estimatedTime = estimateFulfillmentTime(priority, estimatedPosition);

    return {
      priority,
      estimatedPosition,
      estimatedFulfillmentTime: estimatedTime,
      confidence: queueStats.total > 10 ? 'high' : queueStats.total > 5 ? 'medium' : 'low',
    };
  }, [filteredRequests, queueStats.total]);

  // ============================================================================
  // Queue Analysis
  // ============================================================================

  const getQueuePosition = useCallback((requestId: bigint): number | null => {
    const request = filteredRequests.find(r => r.requestId === requestId);
    return request ? request.queuePosition : null;
  }, [filteredRequests]);

  const getNextInQueue = useCallback((count: number = 1): PendingRequest[] => {
    return filteredRequests
      .sort((a, b) => {
        // Sort by priority first, then by queue position
        if (a.priority !== b.priority) {
          const priorityOrder = { [RequestPriority.HIGH]: 0, [RequestPriority.MEDIUM]: 1, [RequestPriority.LOW]: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.queuePosition - b.queuePosition;
      })
      .slice(0, count);
  }, [filteredRequests]);

  const getUserRequests = useCallback((address: Address): PendingRequest[] => {
    return filteredRequests.filter(r =>
      r.requester.toLowerCase() === address.toLowerCase()
    );
  }, [filteredRequests]);

  // ============================================================================
  // Actions
  // ============================================================================

  const refreshPendingRequests = useCallback(async () => {
    await pendingRequestsQuery.refetch();
  }, [pendingRequestsQuery]);

  const invalidatePendingRequests = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.pendingRequests(chainId),
    });
  }, [queryClient, chainId]);

  // ============================================================================
  // Real-time Updates
  // ============================================================================

  // Refresh when new blocks are mined
  useEffect(() => {
    if (blockNumber && queueStats.total > 0) {
      // Throttle updates to avoid excessive API calls
      const timeoutId = setTimeout(() => {
        refreshPendingRequests();
      }, 5000); // 5 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [blockNumber, queueStats.total, refreshPendingRequests]);

  // ============================================================================
  // Error Processing
  // ============================================================================

  const error = useMemo((): ErrorInfo | null => {
    if (!pendingRequestsQuery.error) return null;
    return classifyError(pendingRequestsQuery.error);
  }, [pendingRequestsQuery.error]);

  return {
    // Data
    pendingRequests: filteredRequests,
    queueStats,

    // Analysis
    estimateFulfillment,
    getQueuePosition,
    getNextInQueue,
    getUserRequests,

    // Loading states
    isLoading: pendingRequestsQuery.isLoading,
    isFetching: pendingRequestsQuery.isFetching,
    isRefetching: pendingRequestsQuery.isRefetching,

    // Actions
    refreshPendingRequests,
    invalidatePendingRequests,

    // Error state
    error,

    // Filter
    filter,

    // Chain info
    chainId: chainId || null,
  };
}