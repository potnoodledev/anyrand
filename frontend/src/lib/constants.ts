import { type Chain } from 'viem';

/**
 * Network configurations for supported chains
 */

export const base = {
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.base.org'],
      webSocket: ['wss://mainnet.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
  contracts: {
    anyrand: {
      address: '0x' as `0x${string}`, // TODO: Add actual contract address
    },
  },
  testnet: false,
} as const satisfies Chain;

export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
      webSocket: ['wss://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  contracts: {
    anyrand: {
      address: '0x' as `0x${string}`, // TODO: Add actual contract address
    },
  },
  testnet: true,
} as const satisfies Chain;

/**
 * Supported chains for the application
 */
export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

/**
 * Default chain for the application
 */
export const DEFAULT_CHAIN = baseSepolia;

/**
 * Application metadata for wallet connections
 */
export const APP_METADATA = {
  name: 'Anyrand',
  description: 'Verifiable randomness service',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  icons: ['/favicon.ico'],
};

/**
 * WalletConnect Project ID
 */
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!WALLETCONNECT_PROJECT_ID) {
  console.warn(
    'NEXT_PUBLIC_WC_PROJECT_ID is not set. Get one from https://cloud.walletconnect.com'
  );
}

/**
 * Session storage keys
 */
export const STORAGE_KEYS = {
  WALLET_SESSION: 'anyrand.wallet.session',
  USER_PREFERENCES: 'anyrand.user.preferences',
} as const;