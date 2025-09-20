/**
 * useBlockchainData Hook
 *
 * Provides real-time blockchain data including block information, gas prices,
 * network status, and general blockchain metrics for the Anyrand application.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Address, Hash } from 'viem';
import {
  useChainId,
  useBlockNumber,
  useGasPrice,
  useBlock,
  useFeeData,
} from 'wagmi';
import {
  UseBlockchainDataReturn,
  BlockchainMetrics,
  GasPriceData,
  NetworkStatus,
} from '../types/hooks';
import {
  BlockInfo,
  FeeHistory,
  NetworkConfig,
} from '../types/blockchain';
import { ErrorInfo } from '../types/entities';
import { getNetworkConfig } from '../lib/networks';
import { classifyError } from '../lib/errors';
import { queryKeys } from '../lib/queryClient';

// Mock function to get historical gas data
const getGasPriceHistory = async (chainId: number): Promise<FeeHistory> => {
  // This would use eth_feeHistory RPC method
  return {
    oldestBlock: 0n,
    baseFeePerGas: [],
    gasUsedRatio: [],
    reward: [],
  };
};

// Mock function to get network statistics
const getNetworkStats = async (chainId: number): Promise<BlockchainMetrics> => {
  // This would aggregate data from various sources
  return {
    averageBlockTime: 12, // seconds
    networkHashrate: 0n,
    difficulty: 0n,
    totalSupply: 0n,
    activeValidators: 0,
    pendingTransactions: 0,
    networkCongestion: 'low',
    averageGasPrice: 0n,
    medianGasPrice: 0n,
    gasPricePercentiles: {
      p10: 0n,
      p25: 0n,
      p50: 0n,
      p75: 0n,
      p90: 0n,
    },
  };
};

const calculateNetworkCongestion = (
  gasUsedRatio: number[],
  currentGasPrice: bigint,
  historicalAverage: bigint
): 'low' | 'medium' | 'high' => {
  const avgUtilization = gasUsedRatio.reduce((sum, ratio) => sum + ratio, 0) / gasUsedRatio.length;
  const gasPriceRatio = Number(currentGasPrice) / Number(historicalAverage);

  if (avgUtilization > 0.8 || gasPriceRatio > 2) return 'high';
  if (avgUtilization > 0.5 || gasPriceRatio > 1.5) return 'medium';
  return 'low';
};

const transformBlockData = (block: any): BlockInfo => {
  return {
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    gasLimit: block.gasLimit,
    gasUsed: block.gasUsed,
    baseFeePerGas: block.baseFeePerGas,
    difficulty: block.difficulty || 0n,
    totalDifficulty: block.totalDifficulty || 0n,
    miner: block.miner,
    extraData: block.extraData,
    transactions: block.transactions,
    size: block.size || 0n,
  };
};

export function useBlockchainData(): UseBlockchainDataReturn {
  const chainId = useChainId();
  const queryClient = useQueryClient();

  // ============================================================================
  // Wagmi Hooks for Real-time Data
  // ============================================================================

  const { data: currentBlockNumber, isLoading: isBlockNumberLoading } = useBlockNumber({
    watch: true,
    cacheTime: 2000, // 2 seconds
  });

  const { data: currentBlock, isLoading: isCurrentBlockLoading } = useBlock({
    blockNumber: currentBlockNumber,
    includeTransactions: false,
    query: {
      enabled: !!currentBlockNumber,
      staleTime: 10 * 1000, // 10 seconds
    },
  });

  const { data: gasPrice, isLoading: isGasPriceLoading } = useGasPrice({
    query: {
      refetchInterval: 15 * 1000, // 15 seconds
      staleTime: 10 * 1000, // 10 seconds
    },
  });

  const { data: feeData, isLoading: isFeeDataLoading } = useFeeData({
    query: {
      refetchInterval: 15 * 1000, // 15 seconds
      staleTime: 10 * 1000, // 10 seconds
    },
  });

  // ============================================================================
  // Network Configuration
  // ============================================================================

  const networkConfig = useMemo((): NetworkConfig | null => {
    if (!chainId) return null;
    return getNetworkConfig(chainId);
  }, [chainId]);

  // ============================================================================
  // Gas Price History Query
  // ============================================================================

  const gasPriceHistoryQuery = useQuery({
    queryKey: queryKeys.gasPriceHistory(chainId),
    queryFn: async (): Promise<FeeHistory> => {
      if (!chainId) throw new Error('Chain ID not available');
      return getGasPriceHistory(chainId);
    },
    enabled: !!chainId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ============================================================================
  // Network Statistics Query
  // ============================================================================

  const networkStatsQuery = useQuery({
    queryKey: queryKeys.networkStats(chainId),
    queryFn: async (): Promise<BlockchainMetrics> => {
      if (!chainId) throw new Error('Chain ID not available');
      return getNetworkStats(chainId);
    },
    enabled: !!chainId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // ============================================================================
  // Processed Data
  // ============================================================================

  const blockInfo = useMemo((): BlockInfo | null => {
    if (!currentBlock) return null;
    return transformBlockData(currentBlock);
  }, [currentBlock]);

  const gasPriceData = useMemo((): GasPriceData | null => {
    if (!gasPrice || !feeData) return null;

    return {
      current: gasPrice,
      fast: feeData.maxFeePerGas || gasPrice * 2n,
      standard: gasPrice,
      safe: gasPrice / 2n,
      baseFee: feeData.gasPrice || gasPrice,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      lastUpdated: new Date(),
    };
  }, [gasPrice, feeData]);

  const networkStatus = useMemo((): NetworkStatus => {
    const isLoading = isBlockNumberLoading || isCurrentBlockLoading || isGasPriceLoading;

    let status: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
    if (isLoading) {
      status = 'connecting';
    } else if (currentBlockNumber && gasPrice) {
      status = 'connected';
    }

    const congestion = gasPriceHistoryQuery.data && networkStatsQuery.data && gasPrice
      ? calculateNetworkCongestion(
          gasPriceHistoryQuery.data.gasUsedRatio,
          gasPrice,
          networkStatsQuery.data.averageGasPrice
        )
      : 'low';

    return {
      isConnected: status === 'connected',
      isLoading,
      blockNumber: currentBlockNumber || 0n,
      gasPrice: gasPrice || 0n,
      congestion,
      lastUpdate: new Date(),
    };
  }, [
    isBlockNumberLoading,
    isCurrentBlockLoading,
    isGasPriceLoading,
    currentBlockNumber,
    gasPrice,
    gasPriceHistoryQuery.data,
    networkStatsQuery.data,
  ]);

  // ============================================================================
  // Block Analysis Functions
  // ============================================================================

  const getBlockUtilization = useCallback((): number => {
    if (!blockInfo) return 0;
    return Number(blockInfo.gasUsed) / Number(blockInfo.gasLimit);
  }, [blockInfo]);

  const estimateNextBlockTime = useCallback((): Date | null => {
    if (!networkConfig || !blockInfo) return null;

    const avgBlockTime = networkConfig.features.averageBlockTime;
    const nextBlockTime = Number(blockInfo.timestamp) + avgBlockTime;
    return new Date(nextBlockTime * 1000);
  }, [networkConfig, blockInfo]);

  const getBlockAge = useCallback((): number => {
    if (!blockInfo) return 0;
    const now = Math.floor(Date.now() / 1000);
    return now - Number(blockInfo.timestamp);
  }, [blockInfo]);

  // ============================================================================
  // Gas Price Analysis
  // ============================================================================

  const recommendGasPrice = useCallback((priority: 'slow' | 'standard' | 'fast' = 'standard'): bigint => {
    if (!gasPriceData) return 0n;

    switch (priority) {
      case 'slow':
        return gasPriceData.safe;
      case 'fast':
        return gasPriceData.fast;
      default:
        return gasPriceData.standard;
    }
  }, [gasPriceData]);

  const estimateTransactionCost = useCallback((
    gasLimit: bigint,
    priority: 'slow' | 'standard' | 'fast' = 'standard'
  ): bigint => {
    const gasPrice = recommendGasPrice(priority);
    return gasLimit * gasPrice;
  }, [recommendGasPrice]);

  const getGasPriceTrend = useCallback((): 'up' | 'down' | 'stable' => {
    if (!gasPriceHistoryQuery.data || !gasPrice) return 'stable';

    const history = gasPriceHistoryQuery.data.baseFeePerGas;
    if (history.length < 2) return 'stable';

    const recent = history.slice(-5); // Last 5 blocks
    const avg = recent.reduce((sum, fee) => sum + fee, 0n) / BigInt(recent.length);
    const threshold = avg / 10n; // 10% threshold

    if (gasPrice > avg + threshold) return 'up';
    if (gasPrice < avg - threshold) return 'down';
    return 'stable';
  }, [gasPriceHistoryQuery.data, gasPrice]);

  // ============================================================================
  // Network Health Metrics
  // ============================================================================

  const getNetworkHealth = useCallback((): 'healthy' | 'degraded' | 'unhealthy' => {
    if (!networkStatus.isConnected) return 'unhealthy';

    const blockAge = getBlockAge();
    const maxBlockAge = networkConfig?.features.averageBlockTime * 3 || 36; // 3x expected block time

    if (blockAge > maxBlockAge) return 'unhealthy';
    if (networkStatus.congestion === 'high') return 'degraded';

    return 'healthy';
  }, [networkStatus, getBlockAge, networkConfig]);

  const isNetworkCongested = useCallback((): boolean => {
    return networkStatus.congestion === 'high';
  }, [networkStatus.congestion]);

  // ============================================================================
  // Data Refresh Functions
  // ============================================================================

  const refreshBlockchainData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gasPriceHistory(chainId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.networkStats(chainId) }),
    ]);
  }, [queryClient, chainId]);

  // ============================================================================
  // Real-time Updates
  // ============================================================================

  useEffect(() => {
    if (currentBlockNumber) {
      // Invalidate gas price history every 10 blocks
      if (Number(currentBlockNumber) % 10 === 0) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.gasPriceHistory(chainId)
        });
      }
    }
  }, [currentBlockNumber, queryClient, chainId]);

  // ============================================================================
  // Error Processing
  // ============================================================================

  const error = useMemo((): ErrorInfo | null => {
    const queryError = gasPriceHistoryQuery.error || networkStatsQuery.error;
    if (!queryError) return null;
    return classifyError(queryError);
  }, [gasPriceHistoryQuery.error, networkStatsQuery.error]);

  return {
    // Network information
    chainId: chainId || null,
    networkConfig,
    networkStatus,

    // Block data
    currentBlockNumber: currentBlockNumber || null,
    blockInfo,
    blockAge: getBlockAge(),
    blockUtilization: getBlockUtilization(),
    estimatedNextBlockTime: estimateNextBlockTime(),

    // Gas data
    gasPriceData,
    gasPriceHistory: gasPriceHistoryQuery.data || null,
    gasPriceTrend: getGasPriceTrend(),

    // Network metrics
    networkMetrics: networkStatsQuery.data || null,
    networkHealth: getNetworkHealth(),
    isNetworkCongested: isNetworkCongested(),

    // Gas utilities
    recommendGasPrice,
    estimateTransactionCost,

    // Loading states
    isLoading: isBlockNumberLoading || isCurrentBlockLoading || isGasPriceLoading,
    isLoadingHistory: gasPriceHistoryQuery.isLoading,
    isLoadingStats: networkStatsQuery.isLoading,

    // Actions
    refreshBlockchainData,

    // Error state
    error,
  };
}