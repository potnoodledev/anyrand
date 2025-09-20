/**
 * useDrandBeacon Hook
 *
 * Integrates with the Drand beacon network to provide real-time randomness
 * data, pulse monitoring, and beacon verification functionality.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hex } from 'viem';
import { useChainId } from 'wagmi';
import {
  UseDrandBeaconReturn,
  DrandPulse,
  BeaconNetworkInfo,
  RandomnessVerification,
} from '../types/hooks';
import { DrandBeaconRound } from '../types/blockchain';
import { DrandRound, ErrorInfo } from '../types/entities';
import { classifyError } from '../lib/errors';
import { queryKeys } from '../lib/queryClient';

// Drand API endpoints
const DRAND_QUICKNET_API = 'https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';
const DRAND_MAINNET_API = 'https://api.drand.sh/8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce';

// Configuration for different Drand networks
const DRAND_NETWORKS = {
  quicknet: {
    api: DRAND_QUICKNET_API,
    period: 3, // 3 seconds
    genesis: 1692803367, // Unix timestamp
    publicKey: '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4c9be25a83ff2a4e',
  },
  mainnet: {
    api: DRAND_MAINNET_API,
    period: 30, // 30 seconds
    genesis: 1595431050, // Unix timestamp
    publicKey: '868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31',
  },
};

// Fetch current Drand pulse
const fetchCurrentPulse = async (network: 'quicknet' | 'mainnet' = 'quicknet'): Promise<DrandPulse> => {
  const config = DRAND_NETWORKS[network];
  const response = await fetch(`${config.api}/public/latest`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Drand pulse: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    round: BigInt(data.round),
    randomness: data.randomness as Hex,
    signature: data.signature as Hex,
    timestamp: new Date(data.timestamp || Date.now()),
    network,
    verified: false, // Will be verified separately
  };
};

// Fetch specific round
const fetchRound = async (
  round: bigint,
  network: 'quicknet' | 'mainnet' = 'quicknet'
): Promise<DrandPulse> => {
  const config = DRAND_NETWORKS[network];
  const response = await fetch(`${config.api}/public/${round}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Drand round ${round}: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    round: BigInt(data.round),
    randomness: data.randomness as Hex,
    signature: data.signature as Hex,
    timestamp: new Date(data.timestamp || Date.now()),
    network,
    verified: false,
  };
};

// Fetch beacon network information
const fetchBeaconInfo = async (network: 'quicknet' | 'mainnet' = 'quicknet'): Promise<BeaconNetworkInfo> => {
  const config = DRAND_NETWORKS[network];
  const response = await fetch(`${config.api}/info`);

  if (!response.ok) {
    throw new Error(`Failed to fetch beacon info: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    publicKey: data.public_key as Hex,
    period: data.period,
    genesis: data.genesis_time,
    hash: data.hash as Hex,
    groupHash: data.groupHash as Hex,
    schemeID: data.schemeID || 'bls-unchained-on-g1',
    metadata: data.metadata || {},
  };
};

// Calculate expected round for a given time
const calculateExpectedRound = (
  timestamp: number,
  genesisTime: number,
  period: number
): bigint => {
  if (timestamp < genesisTime) return 0n;
  return BigInt(Math.floor((timestamp - genesisTime) / period) + 1);
};

// Verify randomness signature (simplified - real implementation would use cryptographic verification)
const verifyRandomness = async (
  pulse: DrandPulse,
  beaconInfo: BeaconNetworkInfo
): Promise<RandomnessVerification> => {
  // This is a simplified verification
  // Real implementation would use BLS signature verification
  const isValid = pulse.signature.length === 194; // Basic format check

  return {
    isValid,
    round: pulse.round,
    signature: pulse.signature,
    publicKey: beaconInfo.publicKey,
    timestamp: pulse.timestamp,
    verificationMethod: 'simplified',
    error: isValid ? null : 'Invalid signature format',
  };
};

// Transform Drand pulse to application DrandRound
const transformPulseToRound = (pulse: DrandPulse): DrandRound => ({
  id: pulse.round.toString(),
  round: pulse.round,
  randomness: pulse.randomness,
  signature: pulse.signature,
  timestamp: pulse.timestamp,
  network: pulse.network,
  verified: pulse.verified,
  metadata: {
    source: 'drand-api',
    fetchedAt: new Date(),
  },
});

export function useDrandBeacon(
  network: 'quicknet' | 'mainnet' = 'quicknet'
): UseDrandBeaconReturn {
  const chainId = useChainId();
  const queryClient = useQueryClient();

  const networkConfig = DRAND_NETWORKS[network];

  // ============================================================================
  // Beacon Network Information Query
  // ============================================================================

  const beaconInfoQuery = useQuery({
    queryKey: queryKeys.drandBeaconInfo(network),
    queryFn: () => fetchBeaconInfo(network),
    staleTime: 60 * 60 * 1000, // 1 hour (beacon info rarely changes)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // ============================================================================
  // Current Pulse Query
  // ============================================================================

  const currentPulseQuery = useQuery({
    queryKey: queryKeys.drandCurrentPulse(network),
    queryFn: () => fetchCurrentPulse(network),
    staleTime: 1000, // 1 second
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: networkConfig.period * 1000, // Refetch every period
  });

  // ============================================================================
  // Round Fetching Function
  // ============================================================================

  const useRound = useCallback((round: bigint) => {
    return useQuery({
      queryKey: queryKeys.drandRound(round, network),
      queryFn: () => fetchRound(round, network),
      enabled: round > 0n,
      staleTime: 60 * 60 * 1000, // 1 hour (historical rounds don't change)
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
    });
  }, [network]);

  // ============================================================================
  // Data Processing
  // ============================================================================

  const currentRound = useMemo((): DrandRound | null => {
    if (!currentPulseQuery.data) return null;
    return transformPulseToRound(currentPulseQuery.data);
  }, [currentPulseQuery.data]);

  const beaconInfo = useMemo(() => {
    return beaconInfoQuery.data || null;
  }, [beaconInfoQuery.data]);

  // ============================================================================
  // Round Calculations
  // ============================================================================

  const getCurrentRoundNumber = useCallback((): bigint => {
    const now = Math.floor(Date.now() / 1000);
    return calculateExpectedRound(now, networkConfig.genesis, networkConfig.period);
  }, [networkConfig]);

  const getExpectedRoundAt = useCallback((timestamp: Date): bigint => {
    const unixTime = Math.floor(timestamp.getTime() / 1000);
    return calculateExpectedRound(unixTime, networkConfig.genesis, networkConfig.period);
  }, [networkConfig]);

  const getNextRoundTime = useCallback((): Date => {
    const currentRoundNum = getCurrentRoundNumber();
    const nextRoundTimestamp = networkConfig.genesis + (Number(currentRoundNum) * networkConfig.period);
    return new Date(nextRoundTimestamp * 1000);
  }, [getCurrentRoundNumber, networkConfig]);

  const getTimeToNextRound = useCallback((): number => {
    const nextRoundTime = getNextRoundTime();
    const now = new Date();
    return Math.max(0, nextRoundTime.getTime() - now.getTime());
  }, [getNextRoundTime]);

  // ============================================================================
  // Verification Functions
  // ============================================================================

  const verifyPulse = useCallback(async (pulse: DrandPulse): Promise<RandomnessVerification> => {
    if (!beaconInfo) {
      return {
        isValid: false,
        round: pulse.round,
        signature: pulse.signature,
        publicKey: '0x' as Hex,
        timestamp: pulse.timestamp,
        verificationMethod: 'none',
        error: 'Beacon info not available',
      };
    }

    return verifyRandomness(pulse, beaconInfo);
  }, [beaconInfo]);

  const verifyCurrentPulse = useCallback(async (): Promise<RandomnessVerification | null> => {
    if (!currentPulseQuery.data) return null;
    return verifyPulse(currentPulseQuery.data);
  }, [currentPulseQuery.data, verifyPulse]);

  // ============================================================================
  // Beacon Status
  // ============================================================================

  const beaconStatus = useMemo(() => {
    const isConnected = !!currentPulseQuery.data && !currentPulseQuery.error;
    const isLoading = currentPulseQuery.isLoading;

    let status: 'active' | 'delayed' | 'offline' = 'offline';
    let latency = 0;

    if (isConnected && currentRound) {
      const expectedRound = getCurrentRoundNumber();
      const roundDiff = Number(expectedRound - currentRound.round);

      if (roundDiff <= 1) {
        status = 'active';
      } else if (roundDiff <= 3) {
        status = 'delayed';
      } else {
        status = 'offline';
      }

      // Calculate latency based on time since expected round
      const expectedTime = networkConfig.genesis + (Number(expectedRound) * networkConfig.period);
      const now = Math.floor(Date.now() / 1000);
      latency = Math.max(0, now - expectedTime);
    }

    return {
      isConnected,
      isLoading,
      status,
      latency,
      currentRound: currentRound?.round || 0n,
      expectedRound: getCurrentRoundNumber(),
      lastUpdate: currentRound?.timestamp || new Date(),
    };
  }, [currentPulseQuery, currentRound, getCurrentRoundNumber, networkConfig]);

  // ============================================================================
  // Actions
  // ============================================================================

  const refreshCurrentPulse = useCallback(async () => {
    await currentPulseQuery.refetch();
  }, [currentPulseQuery]);

  const refreshBeaconInfo = useCallback(async () => {
    await beaconInfoQuery.refetch();
  }, [beaconInfoQuery]);

  const invalidateBeaconData = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.drandCurrentPulse(network),
    });
  }, [queryClient, network]);

  // ============================================================================
  // Real-time Monitoring
  // ============================================================================

  useEffect(() => {
    if (beaconStatus.status === 'active') {
      // Set up interval to refresh just before next expected round
      const timeToNext = getTimeToNextRound();
      const refreshTime = Math.max(1000, timeToNext - 1000); // 1 second before

      const timeoutId = setTimeout(() => {
        refreshCurrentPulse();
      }, refreshTime);

      return () => clearTimeout(timeoutId);
    }
  }, [beaconStatus.status, getTimeToNextRound, refreshCurrentPulse]);

  // ============================================================================
  // Error Processing
  // ============================================================================

  const error = useMemo((): ErrorInfo | null => {
    const queryError = currentPulseQuery.error || beaconInfoQuery.error;
    if (!queryError) return null;
    return classifyError(queryError);
  }, [currentPulseQuery.error, beaconInfoQuery.error]);

  return {
    // Current data
    currentRound,
    currentPulse: currentPulseQuery.data || null,
    beaconInfo,
    beaconStatus,

    // Round utilities
    useRound,
    getCurrentRoundNumber,
    getExpectedRoundAt,
    getNextRoundTime,
    getTimeToNextRound,

    // Verification
    verifyPulse,
    verifyCurrentPulse,

    // Loading states
    isLoading: currentPulseQuery.isLoading || beaconInfoQuery.isLoading,
    isRefetching: currentPulseQuery.isRefetching,

    // Actions
    refreshCurrentPulse,
    refreshBeaconInfo,
    invalidateBeaconData,

    // Configuration
    network,
    networkConfig,

    // Error state
    error,
  };
}