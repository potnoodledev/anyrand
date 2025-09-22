'use client';

import { useAccount, useBalance, useEnsName, useEnsAvatar } from 'wagmi';
import { formatDisplayName } from '@/lib/utils/format';
import { useMemo } from 'react';

export interface UseAccountInfoReturn {
  address?: `0x${string}`;
  ensName?: string | null;
  ensAvatar?: string | null;
  balance?: {
    value: bigint;
    formatted: string;
    symbol: string;
  };
  displayName: string;
  isLoading: boolean;
  error?: Error;
}

/**
 * Hook for getting detailed account information
 */
export function useAccountInfo(): UseAccountInfoReturn {
  const { address, isConnected } = useAccount();

  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError
  } = useBalance({
    address,
    query: {
      enabled: !!address && isConnected,
    }
  });

  const {
    data: ensName,
    isLoading: ensNameLoading,
    error: ensNameError
  } = useEnsName({
    address,
    query: {
      enabled: !!address && isConnected,
    }
  });

  const {
    data: ensAvatar,
    isLoading: ensAvatarLoading,
    error: ensAvatarError
  } = useEnsAvatar({
    name: ensName || undefined,
    query: {
      enabled: !!ensName,
    }
  });

  const displayName = useMemo(() => {
    if (!address) return '';
    return formatDisplayName(address, ensName);
  }, [address, ensName]);

  const isLoading = balanceLoading || ensNameLoading || ensAvatarLoading;
  const error = balanceError || ensNameError || ensAvatarError;

  return {
    address,
    ensName,
    ensAvatar,
    balance: balance ? {
      value: balance.value,
      formatted: balance.formatted,
      symbol: balance.symbol
    } : undefined,
    displayName,
    isLoading,
    error: error || undefined
  };
}