/**
 * useWallet Hook
 *
 * Provides wallet connection, account management, and network switching functionality.
 * Integrates with Wagmi and Reown AppKit for seamless wallet interactions.
 */

import { useCallback, useEffect, useMemo } from 'react';
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useBalance,
  useEnsName,
  useEnsAvatar,
} from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Address } from 'viem';
import { UseWalletReturn, WalletConnectionState, WalletError } from '../types/hooks';
import { NetworkConfig } from '../types/blockchain';
import { getNetworkConfig, isNetworkSupported } from '../lib/networks';
import { classifyError } from '../lib/errors';

export function useWallet(): UseWalletReturn {
  const { open, close } = useAppKit();
  const { address, isConnecting, isConnected, isDisconnected, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, error: connectError, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isPending: isSwitchPending } = useSwitchChain();

  // Get balance for connected account
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({
    address,
    query: {
      enabled: !!address,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Get ENS data for connected account
  const { data: ensName, isLoading: isEnsNameLoading } = useEnsName({
    address,
    chainId: 1, // ENS is on mainnet
    query: {
      enabled: !!address,
    },
  });

  const { data: ensAvatar, isLoading: isEnsAvatarLoading } = useEnsAvatar({
    name: ensName,
    chainId: 1,
    query: {
      enabled: !!ensName,
    },
  });

  // Determine connection state
  const connectionState = useMemo((): WalletConnectionState => {
    if (isConnecting || isReconnecting || isConnectPending) {
      return WalletConnectionState.CONNECTING;
    }
    if (isConnected && address) {
      return WalletConnectionState.CONNECTED;
    }
    if (isDisconnected) {
      return WalletConnectionState.DISCONNECTED;
    }
    return WalletConnectionState.DISCONNECTED;
  }, [isConnecting, isReconnecting, isConnectPending, isConnected, address, isDisconnected]);

  // Get current network configuration
  const currentNetwork = useMemo((): NetworkConfig | null => {
    if (!chainId) return null;
    return getNetworkConfig(chainId);
  }, [chainId]);

  // Check if current network is supported
  const isNetworkSupported = useMemo((): boolean => {
    return chainId ? isNetworkSupported(chainId) : false;
  }, [chainId]);

  // Process wallet errors
  const walletError = useMemo((): WalletError | null => {
    const error = connectError || switchError;
    if (!error) return null;

    const errorInfo = classifyError(error);
    return {
      code: errorInfo.code,
      message: errorInfo.userMessage || errorInfo.message,
      originalError: error,
    };
  }, [connectError, switchError]);

  // Connect to wallet
  const connectWallet = useCallback(async (): Promise<void> => {
    try {
      open();
    } catch (error) {
      console.error('Failed to open wallet connection:', error);
      throw error;
    }
  }, [open]);

  // Disconnect from wallet
  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      await disconnect();
      close();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }, [disconnect, close]);

  // Switch to a specific network
  const switchNetwork = useCallback(async (targetChainId: number): Promise<void> => {
    if (!switchChain) {
      throw new Error('Network switching not supported');
    }

    if (!isNetworkSupported(targetChainId)) {
      throw new Error(`Network ${targetChainId} is not supported`);
    }

    try {
      await switchChain({ chainId: targetChainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, [switchChain]);

  // Get formatted address
  const formattedAddress = useMemo((): string | null => {
    if (!address) return null;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  // Get display name (ENS name or formatted address)
  const displayName = useMemo((): string | null => {
    if (ensName) return ensName;
    if (formattedAddress) return formattedAddress;
    return null;
  }, [ensName, formattedAddress]);

  // Get formatted balance
  const formattedBalance = useMemo((): string | null => {
    if (!balance) return null;
    const rounded = Math.round(Number(balance.formatted) * 10000) / 10000;
    return `${rounded} ${balance.symbol}`;
  }, [balance]);

  // Check if operations are pending
  const isPending = useMemo((): boolean => {
    return isConnecting || isReconnecting || isConnectPending || isSwitchPending;
  }, [isConnecting, isReconnecting, isConnectPending, isSwitchPending]);

  // Auto-refresh balance when chain changes
  useEffect(() => {
    if (isConnected && address) {
      refetchBalance();
    }
  }, [chainId, isConnected, address, refetchBalance]);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState === WalletConnectionState.CONNECTED,
    isConnecting: connectionState === WalletConnectionState.CONNECTING,
    isDisconnected: connectionState === WalletConnectionState.DISCONNECTED,
    isPending,

    // Account information
    address: address || null,
    formattedAddress,
    displayName,
    ensName: ensName || null,
    ensAvatar: ensAvatar || null,

    // Balance information
    balance: balance || null,
    formattedBalance,
    isBalanceLoading,

    // Network information
    chainId: chainId || null,
    currentNetwork,
    isNetworkSupported,

    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refetchBalance,

    // Error state
    error: walletError,

    // Loading states
    isEnsLoading: isEnsNameLoading || isEnsAvatarLoading,

    // Available connectors
    connectors: connectors || [],
  };
}