import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { cookieStorage, createStorage } from '@wagmi/core';
import { SUPPORTED_CHAINS, WALLETCONNECT_PROJECT_ID } from './constants';

/**
 * Wagmi adapter configuration for Reown AppKit
 */
export const wagmiAdapter = new WagmiAdapter({
  networks: [...SUPPORTED_CHAINS],
  projectId: WALLETCONNECT_PROJECT_ID!,
  ssr: true, // Enable SSR support for Next.js
  storage: createStorage({
    storage: cookieStorage, // Use cookies for SSR compatibility
  }),
});

/**
 * Wagmi configuration
 */
export const wagmiConfig = wagmiAdapter.wagmiConfig;