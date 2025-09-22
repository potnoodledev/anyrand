import { type Chain } from 'viem';

/**
 * Network configurations for supported chains
 */

export const scroll = {
  id: 534352,
  name: 'Scroll',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.scroll.io'],
      webSocket: ['wss://wss-rpc.scroll.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Scrollscan',
      url: 'https://scrollscan.com',
    },
  },
  contracts: {
    anyrand: {
      address: (process.env.NEXT_PUBLIC_ANYRAND_SCROLL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
    beacon: {
      address: (process.env.NEXT_PUBLIC_BEACON_SCROLL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
    gasStation: {
      address: (process.env.NEXT_PUBLIC_GAS_STATION_SCROLL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
  },
  testnet: false,
} as const satisfies Chain;

export const scrollSepolia = {
  id: 534351,
  name: 'Scroll Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia-rpc.scroll.io'],
      webSocket: ['wss://sepolia-rpc-ws.scroll.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Scrollscan',
      url: 'https://sepolia.scrollscan.com',
    },
  },
  contracts: {
    anyrand: {
      address: (process.env.NEXT_PUBLIC_ANYRAND_SCROLL_SEPOLIA_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
    beacon: {
      address: (process.env.NEXT_PUBLIC_BEACON_SCROLL_SEPOLIA_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
    gasStation: {
      address: (process.env.NEXT_PUBLIC_GAS_STATION_SCROLL_SEPOLIA_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
  },
  testnet: true,
} as const satisfies Chain;

export const localhost = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: 'http://localhost:8545',
    },
  },
  contracts: {
    anyrand: {
      address: (process.env.NEXT_PUBLIC_ANYRAND_LOCAL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
    beacon: {
      address: (process.env.NEXT_PUBLIC_BEACON_LOCAL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
    gasStation: {
      address: (process.env.NEXT_PUBLIC_GAS_STATION_LOCAL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    },
  },
  testnet: true,
} as const satisfies Chain;

/**
 * Supported chains for the application
 */
export const SUPPORTED_CHAINS = [scroll, scrollSepolia, localhost] as const;

/**
 * Default chain for the application (determined dynamically based on deployments)
 */
export const DEFAULT_CHAIN = scrollSepolia;

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