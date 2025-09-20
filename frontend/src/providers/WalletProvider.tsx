/**
 * WalletProvider Component
 *
 * Provides wallet connection functionality using Wagmi and Reown AppKit.
 * This is a wrapper around the Wagmi configuration and AppKit setup.
 */

'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId } from '../lib/wagmi';

// Create a separate query client for wallet operations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

// Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [wagmiAdapter.wagmiConfig.chains[0]],
  defaultNetwork: wagmiAdapter.wagmiConfig.chains[0],
  metadata: {
    name: 'Anyrand',
    description: 'Decentralized Randomness Platform',
    url: 'https://anyrand.app',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};