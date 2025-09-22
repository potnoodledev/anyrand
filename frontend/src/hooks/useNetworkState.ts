'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { useMemo } from 'react';
import type { Chain } from 'viem';

export interface UseNetworkStateReturn {
  chainId?: number;
  currentNetwork?: Chain;
  supportedNetworks: readonly Chain[];
  isSupported: boolean;
  isConnected: boolean;
  switchNetwork: (chainId: number) => Promise<void>;
  isSwitching: boolean;
  switchError?: Error;
}

/**
 * Hook for managing network state and switching
 */
export function useNetworkState(): UseNetworkStateReturn {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const {
    switchChainAsync,
    isPending: isSwitching,
    error: switchError
  } = useSwitchChain();

  const currentNetwork = useMemo(() => {
    return SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  }, [chainId]);

  const isSupported = useMemo(() => {
    return SUPPORTED_CHAINS.some(chain => chain.id === chainId);
  }, [chainId]);

  const switchNetwork = async (targetChainId: number) => {
    if (!switchChainAsync) {
      throw new Error('Chain switching not available');
    }

    const targetChain = SUPPORTED_CHAINS.find(chain => chain.id === targetChainId);
    if (!targetChain) {
      throw new Error(`Unsupported chain ID: ${targetChainId}`);
    }

    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  };

  return {
    chainId,
    currentNetwork,
    supportedNetworks: SUPPORTED_CHAINS,
    isSupported,
    isConnected,
    switchNetwork,
    isSwitching,
    switchError: switchError || undefined
  };
}