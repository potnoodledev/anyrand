/**
 * useRandomnessRequests Hook
 *
 * Manages user's randomness requests including historical data, filtering,
 * pagination, and real-time updates from blockchain events.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Address, Hash } from 'viem';
import { useAccount, useChainId, useBlockNumber } from 'wagmi';
import {
  UseRandomnessRequestsReturn,
  RequestsQueryOptions,
  RequestsFilter,
  PaginatedRequests,
} from '../types/hooks';
import {
  RandomnessRequest,
  RequestState,
  TransactionStatus,
  ErrorInfo,
} from '../types/entities';
import { ContractRequest, RandomnessRequestedEvent, RandomnessFulfilledEvent } from '../types/blockchain';
import { getRequestById, getRequestState, createAnyrandContract } from '../lib/contracts';
import { wagmiConfig } from '../lib/wagmi';
import { classifyError } from '../lib/errors';
import { queryKeys } from '../lib/queryClient';

// Real event fetching using blockchain data
const fetchRequestEvents = async (
  chainId: number,
  userAddress: Address,
  options: RequestsQueryOptions
): Promise<PaginatedRequests> => {
  try {
    const contract = createAnyrandContract(chainId);

    // Get recent events (limit blocks to avoid performance issues)
    const currentBlock = await wagmiConfig.getPublicClient({ chainId })?.getBlockNumber();
    const fromBlock = currentBlock ? currentBlock - 10000n : 'earliest'; // Last ~10k blocks

    // Fetch RandomnessRequested events for user
    const requestedEvents = await contract.getRandomnessRequestedEvents(
      fromBlock,
      'latest',
      userAddress
    );

    // Fetch RandomnessFulfilled events to get fulfillment data
    const fulfilledEvents = await contract.getRandomnessFulfilledEvents(
      fromBlock,
      'latest',
      userAddress
    );

    // Create lookup map for fulfilled events
    const fulfilledMap = new Map<string, RandomnessFulfilledEvent>();
    fulfilledEvents.forEach(event => {
      fulfilledMap.set(event.requestId.toString(), event);
    });

    // Transform events to requests
    const requests: RandomnessRequest[] = await Promise.all(
      requestedEvents.map(async (event): Promise<RandomnessRequest> => {
        const contractRequest = await contract.getRequest(event.requestId);
        const fulfilledEvent = fulfilledMap.get(event.requestId.toString());

        const request: RandomnessRequest = {
          id: event.requestId.toString(),
          requestId: event.requestId,
          requester: event.requester,
          state: contractRequest ? getRequestStateFromContract(contractRequest) : RequestState.PENDING,
          deadline: event.deadline,
          callbackGasLimit: event.callbackGasLimit,
          feePaid: event.feePaid,
          effectiveFeePerGas: contractRequest?.effectiveFeePerGas || 0n,
          pubKeyHash: event.pubKeyHash,
          round: contractRequest?.round || 0n,
          randomness: contractRequest?.randomness || 0n,
          callbackSuccess: contractRequest?.callbackSuccess || false,
          actualGasUsed: contractRequest?.actualGasUsed || 0n,
          createdAt: new Date(), // Would get from block timestamp
          updatedAt: new Date(),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          fulfillmentTxHash: fulfilledEvent?.transactionHash || null,
          fulfillmentBlockNumber: fulfilledEvent?.blockNumber || null,
          estimatedFulfillmentTime: null, // Calculate based on Drand timing
          metadata: {
            requestType: 'standard',
            source: 'frontend',
          },
        };

        return request;
      })
    );

    // Apply sorting
    const sortedRequests = requests.sort((a, b) => {
      const { sortBy = 'createdAt', sortOrder = 'desc' } = options;

      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'requestId':
          comparison = Number(a.requestId - b.requestId);
          break;
        case 'feePaid':
          comparison = Number(a.feePaid - b.feePaid);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const { pageSize = 20, cursor } = options;
    const startIndex = cursor ? parseInt(cursor) : 0;
    const endIndex = startIndex + pageSize;
    const paginatedRequests = sortedRequests.slice(startIndex, endIndex);
    const hasNextPage = endIndex < sortedRequests.length;
    const nextCursor = hasNextPage ? endIndex.toString() : null;

    return {
      requests: paginatedRequests,
      total: sortedRequests.length,
      hasNextPage,
      nextCursor,
    };
  } catch (error) {
    console.error('Failed to fetch request events:', error);
    // Return empty result on error to prevent hook failure
    return {
      requests: [],
      total: 0,
      hasNextPage: false,
      nextCursor: null,
    };
  }
};

const transformContractRequest = (
  contractRequest: ContractRequest,
  blockTimestamp?: number
): RandomnessRequest => {
  return {
    id: contractRequest.requestId.toString(),
    requestId: contractRequest.requestId,
    requester: contractRequest.requester,
    state: getRequestStateFromContract(contractRequest),
    deadline: contractRequest.deadline,
    callbackGasLimit: contractRequest.callbackGasLimit,
    feePaid: contractRequest.feePaid,
    effectiveFeePerGas: contractRequest.effectiveFeePerGas,
    pubKeyHash: contractRequest.pubKeyHash,
    round: contractRequest.round,
    randomness: contractRequest.randomness,
    callbackSuccess: contractRequest.callbackSuccess,
    actualGasUsed: contractRequest.actualGasUsed,
    createdAt: blockTimestamp ? new Date(blockTimestamp * 1000) : new Date(),
    updatedAt: new Date(),
    transactionHash: null, // Would be populated from event data
    blockNumber: null, // Would be populated from event data
    fulfillmentTxHash: null, // Would be populated from fulfillment event
    fulfillmentBlockNumber: null,
    estimatedFulfillmentTime: null,
    metadata: {
      requestType: 'standard',
      source: 'frontend',
    },
  };
};

const getRequestStateFromContract = (contractRequest: ContractRequest): RequestState => {
  if (contractRequest.randomness === 0n) {
    return RequestState.PENDING;
  }
  return contractRequest.callbackSuccess ? RequestState.FULFILLED : RequestState.CALLBACK_FAILED;
};

export function useRandomnessRequests(
  options: RequestsQueryOptions = {}
): UseRandomnessRequestsReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const queryClient = useQueryClient();

  const {
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    filter = {},
    enabled = true,
  } = options;

  // ============================================================================
  // Main Requests Query (Paginated)
  // ============================================================================

  const requestsQuery = useInfiniteQuery({
    queryKey: queryKeys.userRequests(address, chainId, {
      pageSize,
      sortBy,
      sortOrder,
      filter,
    }),
    queryFn: async ({ pageParam }): Promise<PaginatedRequests> => {
      if (!address || !chainId) {
        throw new Error('Address or chain ID not available');
      }

      return fetchRequestEvents(chainId, address, {
        ...options,
        cursor: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!address && !!chainId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // ============================================================================
  // Individual Request Query
  // ============================================================================

  const useRequest = useCallback((requestId: bigint) => {
    return useQuery({
      queryKey: queryKeys.request(requestId, chainId),
      queryFn: async (): Promise<RandomnessRequest | null> => {
        if (!chainId) throw new Error('Chain ID not available');

        const contractRequest = await getRequestById(chainId, requestId);
        if (!contractRequest) return null;

        return transformContractRequest(contractRequest);
      },
      enabled: !!chainId && requestId > 0n,
      staleTime: 10 * 1000, // 10 seconds
      gcTime: 2 * 60 * 1000, // 2 minutes
    });
  }, [chainId]);

  // ============================================================================
  // Request State Query
  // ============================================================================

  const useRequestState = useCallback((requestId: bigint) => {
    return useQuery({
      queryKey: queryKeys.requestState(requestId, chainId),
      queryFn: async (): Promise<RequestState> => {
        if (!chainId) throw new Error('Chain ID not available');
        return getRequestState(chainId, requestId);
      },
      enabled: !!chainId && requestId > 0n,
      staleTime: 5 * 1000, // 5 seconds
      gcTime: 1 * 60 * 1000, // 1 minute
      refetchInterval: (data) => {
        // Stop polling if request is no longer pending
        return data === RequestState.PENDING ? 10000 : false; // 10 seconds
      },
    });
  }, [chainId]);

  // ============================================================================
  // Data Processing
  // ============================================================================

  const allRequests = useMemo(() => {
    return requestsQuery.data?.pages.flatMap(page => page.requests) || [];
  }, [requestsQuery.data]);

  const totalRequests = useMemo(() => {
    return requestsQuery.data?.pages[0]?.total || 0;
  }, [requestsQuery.data]);

  const hasNextPage = useMemo(() => {
    return requestsQuery.hasNextPage || false;
  }, [requestsQuery.hasNextPage]);

  // ============================================================================
  // Filtering and Sorting
  // ============================================================================

  const filteredRequests = useMemo(() => {
    let filtered = [...allRequests];

    // Apply state filter
    if (filter.state && filter.state.length > 0) {
      filtered = filtered.filter(request => filter.state!.includes(request.state));
    }

    // Apply date range filter
    if (filter.dateFrom) {
      filtered = filtered.filter(request => request.createdAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      filtered = filtered.filter(request => request.createdAt <= filter.dateTo!);
    }

    // Apply gas limit filter
    if (filter.minGasLimit) {
      filtered = filtered.filter(request => request.callbackGasLimit >= filter.minGasLimit!);
    }

    if (filter.maxGasLimit) {
      filtered = filtered.filter(request => request.callbackGasLimit <= filter.maxGasLimit!);
    }

    return filtered;
  }, [allRequests, filter]);

  // ============================================================================
  // Statistics
  // ============================================================================

  const requestStats = useMemo(() => {
    const total = filteredRequests.length;
    const pending = filteredRequests.filter(r => r.state === RequestState.PENDING).length;
    const fulfilled = filteredRequests.filter(r => r.state === RequestState.FULFILLED).length;
    const failed = filteredRequests.filter(r => r.state === RequestState.CALLBACK_FAILED).length;

    const totalFeePaid = filteredRequests.reduce((sum, r) => sum + r.feePaid, 0n);
    const avgGasLimit = total > 0
      ? filteredRequests.reduce((sum, r) => sum + r.callbackGasLimit, 0n) / BigInt(total)
      : 0n;

    return {
      total,
      pending,
      fulfilled,
      failed,
      successRate: total > 0 ? (fulfilled / total) * 100 : 0,
      totalFeePaid,
      avgGasLimit,
    };
  }, [filteredRequests]);

  // ============================================================================
  // Actions
  // ============================================================================

  const refreshRequests = useCallback(async () => {
    await requestsQuery.refetch();
  }, [requestsQuery]);

  const loadMoreRequests = useCallback(async () => {
    if (hasNextPage && !requestsQuery.isFetchingNextPage) {
      await requestsQuery.fetchNextPage();
    }
  }, [hasNextPage, requestsQuery]);

  const invalidateRequests = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.userRequests(address, chainId),
    });
  }, [queryClient, address, chainId]);

  const findRequestById = useCallback((requestId: bigint): RandomnessRequest | undefined => {
    return allRequests.find(r => r.requestId === requestId);
  }, [allRequests]);

  // ============================================================================
  // Real-time Updates
  // ============================================================================

  // Setup event listeners for real-time updates
  useEffect(() => {
    if (!address || !chainId || !enabled) return;

    const contract = createAnyrandContract(chainId);

    // Listen for new RandomnessRequested events
    const unwatchRequested = contract.watchRandomnessRequested(
      (event) => {
        console.log('New randomness request:', event);
        // Invalidate queries to refetch data
        invalidateRequests();
      },
      address
    );

    // Listen for RandomnessFulfilled events
    const unwatchFulfilled = contract.watchRandomnessFulfilled(
      (event) => {
        console.log('Randomness fulfilled:', event);
        // Invalidate queries to refetch data
        invalidateRequests();

        // Update specific request in cache if it exists
        const existingRequest = findRequestById(event.requestId);
        if (existingRequest) {
          queryClient.setQueryData(
            queryKeys.request(event.requestId, chainId),
            {
              ...existingRequest,
              state: event.callbackSuccess ? RequestState.FULFILLED : RequestState.CALLBACK_FAILED,
              randomness: event.randomness,
              callbackSuccess: event.callbackSuccess,
              actualGasUsed: event.actualGasUsed,
              fulfillmentTxHash: event.transactionHash,
              fulfillmentBlockNumber: event.blockNumber,
              updatedAt: new Date(),
            }
          );
        }
      },
      address
    );

    // Listen for callback failures specifically
    const unwatchCallbackFailed = contract.watchRandomnessCallbackFailed(
      (event) => {
        console.log('Randomness callback failed:', event);
        invalidateRequests();
      },
      address
    );

    return () => {
      unwatchRequested();
      unwatchFulfilled();
      unwatchCallbackFailed();
    };
  }, [address, chainId, enabled, invalidateRequests, queryClient, findRequestById]);

  // Invalidate queries when new blocks are mined (for pending requests)
  useEffect(() => {
    if (blockNumber && requestStats.pending > 0) {
      // Throttle invalidation to avoid too frequent updates
      const timeoutId = setTimeout(() => {
        invalidateRequests();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [blockNumber, requestStats.pending, invalidateRequests]);

  // ============================================================================
  // Error Processing
  // ============================================================================

  const error = useMemo((): ErrorInfo | null => {
    const queryError = requestsQuery.error;
    if (!queryError) return null;
    return classifyError(queryError);
  }, [requestsQuery.error]);

  return {
    // Data
    requests: filteredRequests,
    allRequests,
    totalRequests,
    requestStats,

    // Individual request hooks
    useRequest,
    useRequestState,

    // Loading states
    isLoading: requestsQuery.isLoading,
    isFetching: requestsQuery.isFetching,
    isFetchingNextPage: requestsQuery.isFetchingNextPage,
    isRefetching: requestsQuery.isRefetching,

    // Pagination
    hasNextPage,
    loadMoreRequests,

    // Actions
    refreshRequests,
    invalidateRequests,
    findRequestById,

    // Error state
    error,

    // Query options
    filter,
    sortBy,
    sortOrder,
    pageSize,
  };
}