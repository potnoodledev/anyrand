/**
 * TanStack Query Client Configuration
 *
 * Configures React Query for optimal blockchain data caching, error handling,
 * and real-time updates in the Anyrand application.
 */

import { QueryClient, DefaultOptions, QueryKey } from '@tanstack/react-query';
import { APP_CONFIG, ENV, isDebugMode } from './config';

// ============================================================================
// Query Configuration
// ============================================================================

const defaultOptions: DefaultOptions = {
  queries: {
    // Blockchain data staleness configuration
    staleTime: APP_CONFIG.UI.REFRESH_INTERVALS.BLOCKCHAIN_DATA, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection

    // Retry configuration for blockchain operations
    retry: (failureCount, error: any) => {
      // Don't retry user rejections or auth errors
      if (error?.code === 4001 || error?.code === 4100) {
        return false;
      }

      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }

      // Retry up to 3 times for network errors
      return failureCount < 3;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch configuration
    refetchOnWindowFocus: false, // Blockchain data doesn't change on focus
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true, // Always fetch fresh data on mount

    // Network mode
    networkMode: 'online', // Only run queries when online
  },

  mutations: {
    // Retry configuration for mutations (transactions)
    retry: (failureCount, error: any) => {
      // Never retry user rejections
      if (error?.code === 4001) {
        return false;
      }

      // Never retry failed transactions
      if (error?.reason?.includes('reverted')) {
        return false;
      }

      // Retry network errors up to 2 times
      return failureCount < 2;
    },

    // Network mode for mutations
    networkMode: 'online',
  },
};

// ============================================================================
// Logger Configuration
// ============================================================================

const queryLogger = {
  log: (...args: any[]) => {
    if (isDebugMode()) {
      console.log('[Query]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('[Query Warning]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[Query Error]', ...args);
  },
};

// ============================================================================
// Query Client Creation
// ============================================================================

export const queryClient = new QueryClient({
  defaultOptions,
  logger: queryLogger,
});

// ============================================================================
// Query Key Factories
// ============================================================================

/**
 * Centralized query key factory for consistent cache management
 */
export const queryKeys = {
  // Wallet queries
  wallet: ['wallet'] as const,
  walletBalance: (address: string, chainId: number) =>
    [...queryKeys.wallet, 'balance', address, chainId] as const,
  walletEnsName: (address: string) =>
    [...queryKeys.wallet, 'ensName', address] as const,

  // Anyrand contract queries
  anyrand: ['anyrand'] as const,
  anyrandPrice: (chainId: number, gasLimit: number) =>
    [...queryKeys.anyrand, 'price', chainId, gasLimit] as const,
  anyrandState: (chainId: number, requestId: string) =>
    [...queryKeys.anyrand, 'state', chainId, requestId] as const,
  anyrandConfig: (chainId: number) =>
    [...queryKeys.anyrand, 'config', chainId] as const,

  // Request queries
  requests: ['requests'] as const,
  requestsUser: (address: string, chainId: number) =>
    [...queryKeys.requests, 'user', address, chainId] as const,
  requestsPending: (chainId: number) =>
    [...queryKeys.requests, 'pending', chainId] as const,
  requestsHistory: (address: string, chainId: number, filters: any) =>
    [...queryKeys.requests, 'history', address, chainId, filters] as const,

  // Transaction queries
  transactions: ['transactions'] as const,
  transactionReceipt: (chainId: number, hash: string) =>
    [...queryKeys.transactions, 'receipt', chainId, hash] as const,
  transactionHistory: (address: string, chainId: number) =>
    [...queryKeys.transactions, 'history', address, chainId] as const,

  // Blockchain data queries
  blockchain: ['blockchain'] as const,
  blockchainGasPrice: (chainId: number) =>
    [...queryKeys.blockchain, 'gasPrice', chainId] as const,
  blockchainBlock: (chainId: number, blockNumber?: number) =>
    [...queryKeys.blockchain, 'block', chainId, blockNumber] as const,
  blockchainEvents: (chainId: number, contractAddress: string, fromBlock: number) =>
    [...queryKeys.blockchain, 'events', chainId, contractAddress, fromBlock] as const,

  // Drand beacon queries
  drand: ['drand'] as const,
  drandBeacon: () => [...queryKeys.drand, 'beacon'] as const,
  drandRound: (round: number) => [...queryKeys.drand, 'round', round] as const,
} as const;

// ============================================================================
// Cache Management Utilities
// ============================================================================

/**
 * Invalidates all queries for a specific wallet address
 */
export function invalidateWalletQueries(address: string): void {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as string[];
      return queryKey.includes(address.toLowerCase());
    },
  });
}

/**
 * Invalidates all queries for a specific chain
 */
export function invalidateChainQueries(chainId: number): void {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as (string | number)[];
      return queryKey.includes(chainId);
    },
  });
}

/**
 * Invalidates request-related queries
 */
export function invalidateRequestQueries(address?: string, chainId?: number): void {
  queryClient.invalidateQueries({
    queryKey: queryKeys.requests,
  });

  if (address && chainId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.requestsUser(address, chainId),
    });
  }

  if (chainId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.requestsPending(chainId),
    });
  }
}

/**
 * Invalidates transaction-related queries
 */
export function invalidateTransactionQueries(address?: string, chainId?: number): void {
  queryClient.invalidateQueries({
    queryKey: queryKeys.transactions,
  });

  if (address && chainId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactionHistory(address, chainId),
    });
  }
}

/**
 * Prefetches commonly used queries
 */
export function prefetchCommonQueries(address: string, chainId: number): void {
  // Prefetch wallet balance
  queryClient.prefetchQuery({
    queryKey: queryKeys.walletBalance(address, chainId),
    staleTime: APP_CONFIG.UI.REFRESH_INTERVALS.BALANCE,
  });

  // Prefetch user requests
  queryClient.prefetchQuery({
    queryKey: queryKeys.requestsUser(address, chainId),
    staleTime: APP_CONFIG.UI.REFRESH_INTERVALS.BLOCKCHAIN_DATA,
  });

  // Prefetch pending requests
  queryClient.prefetchQuery({
    queryKey: queryKeys.requestsPending(chainId),
    staleTime: APP_CONFIG.UI.REFRESH_INTERVALS.PENDING_REQUESTS,
  });

  // Prefetch gas price
  queryClient.prefetchQuery({
    queryKey: queryKeys.blockchainGasPrice(chainId),
    staleTime: APP_CONFIG.UI.REFRESH_INTERVALS.BLOCKCHAIN_DATA,
  });
}

/**
 * Clears all cached data (useful for logout)
 */
export function clearAllQueries(): void {
  queryClient.clear();
}

/**
 * Gets cache statistics for debugging
 */
export function getCacheStats() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  return {
    totalQueries: queries.length,
    staleCounts: queries.filter(q => q.isStale()).length,
    invalidCounts: queries.filter(q => q.isInvalidated()).length,
    fetchingCounts: queries.filter(q => q.isFetching()).length,
    errorCounts: queries.filter(q => q.isError()).length,
  };
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Extracts user-friendly error message from query errors
 */
export function getQueryErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred';

  // Handle network errors
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    return 'Network connection error. Please check your internet connection.';
  }

  // Handle timeout errors
  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    return 'Request timed out. Please try again.';
  }

  // Handle RPC errors
  if (error.code && typeof error.code === 'number') {
    switch (error.code) {
      case -32602:
        return 'Invalid request parameters';
      case -32603:
        return 'Internal RPC error';
      case -32000:
        return 'Transaction failed';
      default:
        return error.message || 'RPC error occurred';
    }
  }

  // Handle contract errors
  if (error.reason) {
    return error.reason;
  }

  // Default error message
  return error.message || 'An unexpected error occurred';
}

/**
 * Custom error boundary handler for React Query errors
 */
export function handleQueryError(error: Error, errorInfo: any): void {
  console.error('Query Error:', error, errorInfo);

  // Log to external service in production
  if (ENV.NODE_ENV === 'production' && ENV.FEATURES.ANALYTICS) {
    // TODO: Integrate with error tracking service
    // analytics.track('query_error', { error: error.message, stack: error.stack });
  }
}

// ============================================================================
// Development Utilities
// ============================================================================

/**
 * Development helper to inspect query cache
 */
export function debugQueryCache(): void {
  if (isDebugMode()) {
    console.log('Query Cache:', queryClient.getQueryCache().getAll());
    console.log('Cache Stats:', getCacheStats());
  }
}

/**
 * Development helper to monitor query changes
 */
export function monitorQueries(): void {
  if (isDebugMode()) {
    queryClient.getQueryCache().subscribe((event) => {
      console.log('Query Event:', event);
    });
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type QueryKeyFactory = typeof queryKeys;
export type CacheStats = ReturnType<typeof getCacheStats>;

// Initialize monitoring in development
if (typeof window !== 'undefined' && isDebugMode()) {
  monitorQueries();
}