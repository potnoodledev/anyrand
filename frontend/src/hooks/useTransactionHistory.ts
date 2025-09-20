/**
 * useTransactionHistory Hook
 *
 * Manages transaction history for wallet interactions, providing detailed
 * transaction tracking, status monitoring, and historical analytics.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Address, Hash } from 'viem';
import { useAccount, useChainId, useBlockNumber } from 'wagmi';
import {
  UseTransactionHistoryReturn,
  TransactionHistoryOptions,
  TransactionFilter,
  PaginatedTransactions,
} from '../types/hooks';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  ErrorInfo,
} from '../types/entities';
import { ContractTransactionReceipt } from '../types/blockchain';
import { classifyError } from '../lib/errors';
import { queryKeys } from '../lib/queryClient';
import { getNetworkConfig } from '../lib/networks';

// Mock function to fetch transaction history
// In real implementation, this would query blockchain for user transactions
const fetchTransactionHistory = async (
  chainId: number,
  userAddress: Address,
  options: TransactionHistoryOptions
): Promise<PaginatedTransactions> => {
  // This is a placeholder implementation
  // Real implementation would:
  // 1. Query blockchain for all transactions by user address
  // 2. Filter for Anyrand-related transactions
  // 3. Decode transaction data and logs
  // 4. Apply pagination and sorting
  // 5. Calculate gas costs and fees

  const mockTransactions: Transaction[] = [];

  return {
    transactions: mockTransactions,
    total: 0,
    hasNextPage: false,
    nextCursor: null,
  };
};

// Mock function to get transaction receipt
const getTransactionReceipt = async (
  chainId: number,
  hash: Hash
): Promise<ContractTransactionReceipt | null> => {
  // This would use viem's getTransactionReceipt
  return null;
};

const determineTransactionType = (
  to: Address | null,
  data: string,
  contractAddresses: { anyrand: Address; beacon: Address; gasStation: Address }
): TransactionType => {
  if (!to) return TransactionType.CONTRACT_DEPLOYMENT;

  const toLower = to.toLowerCase();

  if (toLower === contractAddresses.anyrand.toLowerCase()) {
    if (data.startsWith('0x1a3a5f7f')) { // requestRandomness selector
      return TransactionType.RANDOMNESS_REQUEST;
    }
    if (data.startsWith('0x5c6c4b36')) { // fulfillRandomness selector
      return TransactionType.RANDOMNESS_FULFILLMENT;
    }
    return TransactionType.CONTRACT_INTERACTION;
  }

  if (data === '0x' || data.length <= 10) {
    return TransactionType.TRANSFER;
  }

  return TransactionType.CONTRACT_INTERACTION;
};

const calculateTransactionCost = (
  gasUsed: bigint,
  effectiveGasPrice: bigint,
  value: bigint = 0n
): bigint => {
  return (gasUsed * effectiveGasPrice) + value;
};

const transformReceiptToTransaction = (
  receipt: ContractTransactionReceipt,
  chainId: number,
  blockTimestamp?: number
): Transaction => {
  const networkConfig = getNetworkConfig(chainId);
  const contractAddresses = networkConfig?.contracts || {
    anyrand: '0x' as Address,
    beacon: '0x' as Address,
    gasStation: '0x' as Address,
  };

  const transactionType = determineTransactionType(
    receipt.to,
    '0x', // Would need original transaction data
    contractAddresses
  );

  const totalCost = calculateTransactionCost(
    receipt.gasUsed,
    receipt.effectiveGasPrice,
    0n // Would need original transaction value
  );

  return {
    id: receipt.transactionHash,
    hash: receipt.transactionHash,
    type: transactionType,
    status: receipt.status === 'success' ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED,
    from: receipt.from,
    to: receipt.to,
    value: 0n, // Would need from original transaction
    gasLimit: 0n, // Would need from original transaction
    gasUsed: receipt.gasUsed,
    gasPrice: receipt.effectiveGasPrice,
    totalCost,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    transactionIndex: receipt.transactionIndex,
    timestamp: blockTimestamp ? new Date(blockTimestamp * 1000) : new Date(),
    confirmations: 0, // Would calculate from current block
    nonce: 0, // Would need from original transaction
    data: null, // Would need from original transaction
    logs: receipt.logs,
    contractAddress: receipt.contractAddress,
    chainId,
    relatedRequestId: null, // Would parse from logs
    metadata: {
      source: 'blockchain',
      parsedLogs: [], // Would decode logs
    },
  };
};

export function useTransactionHistory(
  options: TransactionHistoryOptions = {}
): UseTransactionHistoryReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const queryClient = useQueryClient();

  const {
    pageSize = 20,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    filter = {},
    enabled = true,
  } = options;

  // ============================================================================
  // Main Transaction History Query (Paginated)
  // ============================================================================

  const transactionHistoryQuery = useInfiniteQuery({
    queryKey: queryKeys.transactionHistory(address, chainId, {
      pageSize,
      sortBy,
      sortOrder,
      filter,
    }),
    queryFn: async ({ pageParam }): Promise<PaginatedTransactions> => {
      if (!address || !chainId) {
        throw new Error('Address or chain ID not available');
      }

      return fetchTransactionHistory(chainId, address, {
        ...options,
        cursor: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!address && !!chainId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ============================================================================
  // Individual Transaction Query
  // ============================================================================

  const useTransaction = useCallback((hash: Hash) => {
    return useQuery({
      queryKey: queryKeys.transaction(hash, chainId),
      queryFn: async (): Promise<Transaction | null> => {
        if (!chainId) throw new Error('Chain ID not available');

        const receipt = await getTransactionReceipt(chainId, hash);
        if (!receipt) return null;

        return transformReceiptToTransaction(receipt, chainId);
      },
      enabled: !!chainId && !!hash,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    });
  }, [chainId]);

  // ============================================================================
  // Pending Transactions Tracking
  // ============================================================================

  const usePendingTransaction = useCallback((hash: Hash) => {
    return useQuery({
      queryKey: queryKeys.pendingTransaction(hash, chainId),
      queryFn: async (): Promise<Transaction | null> => {
        if (!chainId) throw new Error('Chain ID not available');

        const receipt = await getTransactionReceipt(chainId, hash);
        if (!receipt) return null;

        return transformReceiptToTransaction(receipt, chainId);
      },
      enabled: !!chainId && !!hash,
      staleTime: 0, // Always fresh for pending
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: (data) => {
        // Stop polling if transaction is confirmed or failed
        return !data || data.status === TransactionStatus.PENDING ? 5000 : false;
      },
    });
  }, [chainId]);

  // ============================================================================
  // Data Processing
  // ============================================================================

  const allTransactions = useMemo(() => {
    return transactionHistoryQuery.data?.pages.flatMap(page => page.transactions) || [];
  }, [transactionHistoryQuery.data]);

  const totalTransactions = useMemo(() => {
    return transactionHistoryQuery.data?.pages[0]?.total || 0;
  }, [transactionHistoryQuery.data]);

  const hasNextPage = useMemo(() => {
    return transactionHistoryQuery.hasNextPage || false;
  }, [transactionHistoryQuery.hasNextPage]);

  // ============================================================================
  // Filtering and Sorting
  // ============================================================================

  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions];

    // Apply type filter
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(tx => filter.type!.includes(tx.type));
    }

    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(tx => filter.status!.includes(tx.status));
    }

    // Apply date range filter
    if (filter.dateFrom) {
      filtered = filtered.filter(tx => tx.timestamp >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      filtered = filtered.filter(tx => tx.timestamp <= filter.dateTo!);
    }

    // Apply value range filter
    if (filter.minValue) {
      filtered = filtered.filter(tx => tx.value >= filter.minValue!);
    }

    if (filter.maxValue) {
      filtered = filtered.filter(tx => tx.value <= filter.maxValue!);
    }

    // Apply address filter
    if (filter.involvedAddress) {
      const addr = filter.involvedAddress.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.from.toLowerCase() === addr ||
        (tx.to && tx.to.toLowerCase() === addr)
      );
    }

    return filtered;
  }, [allTransactions, filter]);

  // ============================================================================
  // Analytics and Statistics
  // ============================================================================

  const transactionStats = useMemo(() => {
    const total = filteredTransactions.length;
    const confirmed = filteredTransactions.filter(tx => tx.status === TransactionStatus.CONFIRMED).length;
    const failed = filteredTransactions.filter(tx => tx.status === TransactionStatus.FAILED).length;
    const pending = filteredTransactions.filter(tx => tx.status === TransactionStatus.PENDING).length;

    const totalValue = filteredTransactions.reduce((sum, tx) => sum + tx.value, 0n);
    const totalGasCost = filteredTransactions.reduce((sum, tx) => sum + tx.totalCost, 0n);

    const byType = {
      [TransactionType.RANDOMNESS_REQUEST]: filteredTransactions.filter(tx => tx.type === TransactionType.RANDOMNESS_REQUEST).length,
      [TransactionType.RANDOMNESS_FULFILLMENT]: filteredTransactions.filter(tx => tx.type === TransactionType.RANDOMNESS_FULFILLMENT).length,
      [TransactionType.TRANSFER]: filteredTransactions.filter(tx => tx.type === TransactionType.TRANSFER).length,
      [TransactionType.CONTRACT_INTERACTION]: filteredTransactions.filter(tx => tx.type === TransactionType.CONTRACT_INTERACTION).length,
      [TransactionType.CONTRACT_DEPLOYMENT]: filteredTransactions.filter(tx => tx.type === TransactionType.CONTRACT_DEPLOYMENT).length,
    };

    const avgGasPrice = total > 0
      ? filteredTransactions.reduce((sum, tx) => sum + tx.gasPrice, 0n) / BigInt(total)
      : 0n;

    return {
      total,
      confirmed,
      failed,
      pending,
      successRate: total > 0 ? (confirmed / total) * 100 : 0,
      totalValue,
      totalGasCost,
      avgGasPrice,
      byType,
    };
  }, [filteredTransactions]);

  // ============================================================================
  // Transaction Analysis
  // ============================================================================

  const getTransactionsByType = useCallback((type: TransactionType): Transaction[] => {
    return filteredTransactions.filter(tx => tx.type === type);
  }, [filteredTransactions]);

  const getRecentTransactions = useCallback((count: number = 5): Transaction[] => {
    return filteredTransactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }, [filteredTransactions]);

  const findTransactionByHash = useCallback((hash: Hash): Transaction | undefined => {
    return allTransactions.find(tx => tx.hash.toLowerCase() === hash.toLowerCase());
  }, [allTransactions]);

  const getRelatedTransactions = useCallback((requestId: bigint): Transaction[] => {
    return filteredTransactions.filter(tx => tx.relatedRequestId === requestId);
  }, [filteredTransactions]);

  // ============================================================================
  // Actions
  // ============================================================================

  const refreshTransactions = useCallback(async () => {
    await transactionHistoryQuery.refetch();
  }, [transactionHistoryQuery]);

  const loadMoreTransactions = useCallback(async () => {
    if (hasNextPage && !transactionHistoryQuery.isFetchingNextPage) {
      await transactionHistoryQuery.fetchNextPage();
    }
  }, [hasNextPage, transactionHistoryQuery]);

  const invalidateTransactions = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactionHistory(address, chainId),
    });
  }, [queryClient, address, chainId]);

  // ============================================================================
  // Real-time Updates
  // ============================================================================

  // Refresh when new blocks are mined (for pending transactions)
  useEffect(() => {
    if (blockNumber && transactionStats.pending > 0) {
      // Throttle invalidation
      const timeoutId = setTimeout(() => {
        invalidateTransactions();
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [blockNumber, transactionStats.pending, invalidateTransactions]);

  // ============================================================================
  // Error Processing
  // ============================================================================

  const error = useMemo((): ErrorInfo | null => {
    const queryError = transactionHistoryQuery.error;
    if (!queryError) return null;
    return classifyError(queryError);
  }, [transactionHistoryQuery.error]);

  return {
    // Data
    transactions: filteredTransactions,
    allTransactions,
    totalTransactions,
    transactionStats,

    // Individual transaction hooks
    useTransaction,
    usePendingTransaction,

    // Loading states
    isLoading: transactionHistoryQuery.isLoading,
    isFetching: transactionHistoryQuery.isFetching,
    isFetchingNextPage: transactionHistoryQuery.isFetchingNextPage,
    isRefetching: transactionHistoryQuery.isRefetching,

    // Pagination
    hasNextPage,
    loadMoreTransactions,

    // Analysis
    getTransactionsByType,
    getRecentTransactions,
    findTransactionByHash,
    getRelatedTransactions,

    // Actions
    refreshTransactions,
    invalidateTransactions,

    // Error state
    error,

    // Query options
    filter,
    sortBy,
    sortOrder,
    pageSize,
  };
}