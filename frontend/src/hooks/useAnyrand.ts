/**
 * useAnyrand Hook
 *
 * Provides high-level interface for interacting with the Anyrand smart contract.
 * Handles randomness requests, fee estimation, and contract state management.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Address, Hash } from 'viem';
import { useAccount, useChainId } from 'wagmi';
import {
  UseAnyrandReturn,
  RandomnessRequestParams,
  ContractLimits,
  BeaconInfo,
  FeeEstimation,
} from '../types/hooks';
import { RequestState, ErrorInfo } from '../types/entities';
import { ContractRequest, ContractTransactionOptions } from '../types/blockchain';
import {
  createAnyrandContract,
  estimateRequestFee,
  getRequestById,
  getRequestState,
  getContractLimits,
  getCurrentBeaconInfo,
  calculateDeadline,
  isValidCallbackGasLimit,
  isValidDeadline,
  DEFAULT_CALLBACK_GAS_LIMIT,
  DEFAULT_DEADLINE_MINUTES,
} from '../lib/contracts';
import { classifyError } from '../lib/errors';
import { queryKeys } from '../lib/queryClient';

export function useAnyrand(): UseAnyrandReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  // Create contract instance
  const contract = useMemo(() => {
    if (!chainId) return null;
    return createAnyrandContract(chainId);
  }, [chainId]);

  // ============================================================================
  // Contract Limits Query
  // ============================================================================

  const {
    data: contractLimits,
    isLoading: isContractLimitsLoading,
    error: contractLimitsError,
    refetch: refetchContractLimits,
  } = useQuery({
    queryKey: queryKeys.contractLimits(chainId),
    queryFn: async (): Promise<ContractLimits> => {
      if (!chainId) throw new Error('Chain ID not available');
      return getContractLimits(chainId);
    },
    enabled: !!chainId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ============================================================================
  // Beacon Info Query
  // ============================================================================

  const {
    data: beaconInfo,
    isLoading: isBeaconInfoLoading,
    error: beaconInfoError,
    refetch: refetchBeaconInfo,
  } = useQuery({
    queryKey: queryKeys.beaconInfo(chainId),
    queryFn: async (): Promise<BeaconInfo> => {
      if (!chainId) throw new Error('Chain ID not available');
      return getCurrentBeaconInfo(chainId);
    },
    enabled: !!chainId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // ============================================================================
  // Fee Estimation Function
  // ============================================================================

  const estimateFee = useCallback(
    async (callbackGasLimit: bigint): Promise<FeeEstimation> => {
      if (!chainId) throw new Error('Chain ID not available');

      const estimation = await estimateRequestFee(chainId, callbackGasLimit);
      return {
        baseFee: estimation.baseFee,
        totalFee: estimation.totalFee,
        formattedFee: estimation.formattedFee,
        gasLimit: callbackGasLimit,
        estimatedAt: new Date(),
      };
    },
    [chainId]
  );

  // ============================================================================
  // Request Randomness Mutation
  // ============================================================================

  const requestRandomnessMutation = useMutation({
    mutationFn: async (params: RandomnessRequestParams): Promise<Hash> => {
      if (!contract) throw new Error('Contract not available');
      if (!address) throw new Error('Wallet not connected');

      // Validate parameters
      if (contractLimits) {
        if (!isValidCallbackGasLimit(params.callbackGasLimit, contractLimits.maxCallbackGasLimit)) {
          throw new Error(`Gas limit must be between 21000 and ${contractLimits.maxCallbackGasLimit}`);
        }

        if (!isValidDeadline(params.deadline, contractLimits.maxDeadlineDelta)) {
          throw new Error('Deadline is too far in the future or has already passed');
        }
      }

      // Estimate fee if not provided
      let value = params.value;
      if (!value) {
        const estimation = await estimateRequestFee(chainId!, params.callbackGasLimit);
        value = estimation.totalFee;
      }

      const options: ContractTransactionOptions = {
        value,
        gasLimit: params.gasLimit,
        maxFeePerGas: params.maxFeePerGas,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        account: address,
      };

      const response = await contract.requestRandomness(
        params.deadline,
        params.callbackGasLimit,
        options
      );

      return response.hash;
    },
    onSuccess: (hash: Hash) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.userRequests(address, chainId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingRequests(chainId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contractLimits(chainId) });
    },
    onError: (error: unknown) => {
      console.error('Request randomness failed:', error);
    },
  });

  // ============================================================================
  // Get Request Function
  // ============================================================================

  const getRequest = useCallback(
    async (requestId: bigint): Promise<ContractRequest | null> => {
      if (!chainId) throw new Error('Chain ID not available');
      return getRequestById(chainId, requestId);
    },
    [chainId]
  );

  // ============================================================================
  // Get Request State Function
  // ============================================================================

  const getRequestStateById = useCallback(
    async (requestId: bigint): Promise<RequestState> => {
      if (!chainId) throw new Error('Chain ID not available');
      return getRequestState(chainId, requestId);
    },
    [chainId]
  );

  // ============================================================================
  // Validation Functions
  // ============================================================================

  const validateRequestParams = useCallback(
    (params: Partial<RandomnessRequestParams>): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!contractLimits) {
        errors.push('Contract limits not loaded');
        return { isValid: false, errors };
      }

      // Validate callback gas limit
      if (params.callbackGasLimit !== undefined) {
        if (!isValidCallbackGasLimit(params.callbackGasLimit, contractLimits.maxCallbackGasLimit)) {
          errors.push(`Gas limit must be between 21000 and ${contractLimits.maxCallbackGasLimit.toLocaleString()}`);
        }
      }

      // Validate deadline
      if (params.deadline !== undefined) {
        if (!isValidDeadline(params.deadline, contractLimits.maxDeadlineDelta)) {
          errors.push('Deadline is invalid or too far in the future');
        }
      }

      return { isValid: errors.length === 0, errors };
    },
    [contractLimits]
  );

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const createDefaultParams = useCallback(
    (overrides: Partial<RandomnessRequestParams> = {}): RandomnessRequestParams => {
      const deadline = calculateDeadline(DEFAULT_DEADLINE_MINUTES);

      return {
        deadline,
        callbackGasLimit: DEFAULT_CALLBACK_GAS_LIMIT,
        ...overrides,
      };
    },
    []
  );

  const isReady = useMemo((): boolean => {
    return !!(contract && contractLimits && beaconInfo && address);
  }, [contract, contractLimits, beaconInfo, address]);

  // ============================================================================
  // Error Processing
  // ============================================================================

  const processedError = useMemo((): ErrorInfo | null => {
    const error = contractLimitsError || beaconInfoError || requestRandomnessMutation.error;
    if (!error) return null;
    return classifyError(error);
  }, [contractLimitsError, beaconInfoError, requestRandomnessMutation.error]);

  // ============================================================================
  // Auto-refresh data when chain or address changes
  // ============================================================================

  useEffect(() => {
    if (chainId && address) {
      refetchContractLimits();
      refetchBeaconInfo();
    }
  }, [chainId, address, refetchContractLimits, refetchBeaconInfo]);

  return {
    // Contract state
    isReady,
    contract,
    contractLimits,
    beaconInfo,

    // Actions
    requestRandomness: requestRandomnessMutation.mutateAsync,
    estimateFee,
    getRequest,
    getRequestState: getRequestStateById,
    validateRequestParams,
    createDefaultParams,

    // Loading states
    isRequestingRandomness: requestRandomnessMutation.isPending,
    isLoadingLimits: isContractLimitsLoading,
    isLoadingBeaconInfo: isBeaconInfoLoading,

    // Error state
    error: processedError,

    // Refresh functions
    refetchLimits: refetchContractLimits,
    refetchBeaconInfo,

    // Chain info
    chainId: chainId || null,
    contractAddress: contract ? (contract as any).contractAddress : null,
  };
}