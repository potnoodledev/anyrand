'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { appKit } from '@/lib/providers';
import { useCallback } from 'react';
import type { Connector } from 'wagmi';

export interface UseWalletConnectionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  address?: `0x${string}`;
  connector?: Connector;
  connect: () => void;
  disconnect: () => Promise<void>;
  error?: Error;
}

/**
 * Hook for managing wallet connection state and actions
 */
export function useWalletConnection(): UseWalletConnectionReturn {
  const {
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    connector
  } = useAccount();

  const { error: connectError } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const connect = useCallback(() => {
    appKit.open();
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }, [disconnectAsync]);

  return {
    isConnected,
    isConnecting,
    isReconnecting,
    address,
    connector,
    connect,
    disconnect,
    error: connectError || undefined
  };
}