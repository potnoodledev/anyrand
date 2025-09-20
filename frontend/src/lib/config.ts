/**
 * Environment Configuration for Anyrand Frontend
 *
 * Centralizes all environment variables and configuration constants
 * for the Anyrand application across different environments.
 */

// ============================================================================
// Environment Variables
// ============================================================================

export const ENV = {
  // Application Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',

  // Application URLs
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Wallet Connect Configuration
  REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '',

  // Default Network Configuration
  DEFAULT_CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '534352'), // Scroll

  // Contract Addresses by Network
  CONTRACTS: {
    SCROLL: {
      ANYRAND: process.env.NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_SCROLL || '0x7ED45287f817842d72753FE02617629c4c7c2FBE',
      BEACON: process.env.NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS_SCROLL || '',
      GAS_STATION: process.env.NEXT_PUBLIC_GAS_STATION_CONTRACT_ADDRESS_SCROLL || '',
    },
    SCROLL_SEPOLIA: {
      ANYRAND: process.env.NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_SCROLL_SEPOLIA || '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC',
      BEACON: process.env.NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS_SCROLL_SEPOLIA || '',
      GAS_STATION: process.env.NEXT_PUBLIC_GAS_STATION_CONTRACT_ADDRESS_SCROLL_SEPOLIA || '',
    },
    BASE: {
      ANYRAND: process.env.NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_BASE || '0xF6baf607AC2971EE6A3C47981E7176134628e36C',
      BEACON: process.env.NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS_BASE || '',
      GAS_STATION: process.env.NEXT_PUBLIC_GAS_STATION_CONTRACT_ADDRESS_BASE || '',
    },
    BASE_SEPOLIA: {
      ANYRAND: process.env.NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_BASE_SEPOLIA || '',
      BEACON: process.env.NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS_BASE_SEPOLIA || '',
      GAS_STATION: process.env.NEXT_PUBLIC_GAS_STATION_CONTRACT_ADDRESS_BASE_SEPOLIA || '',
    },
  },

  // RPC URLs
  RPC_URLS: {
    SCROLL: process.env.NEXT_PUBLIC_RPC_URL_SCROLL || 'https://rpc.scroll.io',
    SCROLL_SEPOLIA: process.env.NEXT_PUBLIC_RPC_URL_SCROLL_SEPOLIA || 'https://sepolia-rpc.scroll.io',
    BASE: process.env.NEXT_PUBLIC_RPC_URL_BASE || 'https://mainnet.base.org',
    BASE_SEPOLIA: process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org',
  },

  // Feature Flags
  FEATURES: {
    AUTO_REFRESH: process.env.NEXT_PUBLIC_FEATURE_AUTO_REFRESH !== 'false',
    ANALYTICS: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true',
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    TESTNET_MODE: process.env.NEXT_PUBLIC_TESTNET_MODE === 'true',
  },

  // API Configuration
  API: {
    TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'), // 30 seconds
    RETRY_ATTEMPTS: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
    CACHE_TTL: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '30000'), // 30 seconds
  },
} as const;

// ============================================================================
// Application Constants
// ============================================================================

export const APP_CONFIG = {
  // Application Metadata
  NAME: 'Anyrand',
  DESCRIPTION: 'Verifiable Randomness Service',
  VERSION: '1.0.0',

  // UI Configuration
  UI: {
    THEME: {
      DEFAULT: 'system' as const,
      OPTIONS: ['light', 'dark', 'system'] as const,
    },
    CURRENCY: {
      DEFAULT: 'ETH' as const,
      OPTIONS: ['ETH', 'USD'] as const,
    },
    PAGINATION: {
      DEFAULT_PAGE_SIZE: 20,
      MAX_PAGE_SIZE: 100,
    },
    REFRESH_INTERVALS: {
      BLOCKCHAIN_DATA: 30000, // 30 seconds
      PENDING_REQUESTS: 15000, // 15 seconds
      TRANSACTION_STATUS: 5000, // 5 seconds
      BALANCE: 60000, // 1 minute
    },
  },

  // Blockchain Configuration
  BLOCKCHAIN: {
    CONFIRMATION_BLOCKS: {
      SCROLL: 3,
      SCROLL_SEPOLIA: 1,
      BASE: 3,
      BASE_SEPOLIA: 1,
    },
    GAS_LIMITS: {
      REQUEST_RANDOMNESS: 100000n,
      FULFILL_RANDOMNESS: 200000n,
      DEFAULT_CALLBACK: 50000n,
      MAX_CALLBACK: 500000n,
    },
    PRICE_ESTIMATION: {
      GAS_MULTIPLIER: 1.2, // 20% buffer for gas estimation
      MAX_PRIORITY_FEE: 2000000000n, // 2 gwei
      PRICE_CACHE_TTL: 30000, // 30 seconds
    },
  },

  // Drand Configuration
  DRAND: {
    BEACON_PERIOD: 30, // 30 seconds between rounds
    GENESIS_TIME: 1692803367, // Drand genesis timestamp
    PUBLIC_KEY: '868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31', // Drand public key
    CHAIN_HASH: '8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce', // Drand chain hash
  },

  // Local Storage Keys
  STORAGE_KEYS: {
    WALLET_PREFERENCES: 'anyrand_wallet_preferences',
    USER_SETTINGS: 'anyrand_user_settings',
    TRANSACTION_HISTORY: 'anyrand_transaction_history',
    CACHED_REQUESTS: 'anyrand_cached_requests',
    LAST_CONNECTED_WALLET: 'anyrand_last_wallet',
  },

  // Error Messages
  ERRORS: {
    WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
    UNSUPPORTED_NETWORK: 'Please switch to a supported network',
    INSUFFICIENT_BALANCE: 'Insufficient ETH balance for this transaction',
    TRANSACTION_FAILED: 'Transaction failed. Please try again.',
    INVALID_DEADLINE: 'Deadline must be at least 1 minute in the future',
    INVALID_GAS_LIMIT: 'Gas limit must be between 21,000 and 500,000',
    REQUEST_NOT_FOUND: 'Randomness request not found',
    FULFILLMENT_NOT_READY: 'Request is not ready for fulfillment',
  },
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that all required environment variables are present
 */
export function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_REOWN_PROJECT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

/**
 * Gets contract address for a specific network and contract type
 */
export function getContractAddress(
  chainId: number,
  contractType: 'ANYRAND' | 'BEACON' | 'GAS_STATION'
): string {
  switch (chainId) {
    case 534352: // Scroll
      return ENV.CONTRACTS.SCROLL[contractType];
    case 534351: // Scroll Sepolia
      return ENV.CONTRACTS.SCROLL_SEPOLIA[contractType];
    case 8453: // Base
      return ENV.CONTRACTS.BASE[contractType];
    case 84532: // Base Sepolia
      return ENV.CONTRACTS.BASE_SEPOLIA[contractType];
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Gets RPC URL for a specific network
 */
export function getRpcUrl(chainId: number): string {
  switch (chainId) {
    case 534352: // Scroll
      return ENV.RPC_URLS.SCROLL;
    case 534351: // Scroll Sepolia
      return ENV.RPC_URLS.SCROLL_SEPOLIA;
    case 8453: // Base
      return ENV.RPC_URLS.BASE;
    case 84532: // Base Sepolia
      return ENV.RPC_URLS.BASE_SEPOLIA;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Checks if a chain ID is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return [534352, 534351, 8453, 84532].includes(chainId);
}

/**
 * Gets network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 534352:
      return 'Scroll';
    case 534351:
      return 'Scroll Sepolia';
    case 8453:
      return 'Base';
    case 84532:
      return 'Base Sepolia';
    default:
      return 'Unknown Network';
  }
}

/**
 * Checks if the current environment is development
 */
export function isDevelopment(): boolean {
  return ENV.NODE_ENV === 'development';
}

/**
 * Checks if the current environment is production
 */
export function isProduction(): boolean {
  return ENV.NODE_ENV === 'production';
}

/**
 * Checks if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return ENV.FEATURES.DEBUG_MODE || isDevelopment();
}

/**
 * Checks if testnet mode is enabled
 */
export function isTestnetMode(): boolean {
  return ENV.FEATURES.TESTNET_MODE;
}

// ============================================================================
// Type Exports
// ============================================================================

export type SupportedChainId = 534352 | 534351 | 8453 | 84532;
export type ContractType = 'ANYRAND' | 'BEACON' | 'GAS_STATION';
export type Theme = typeof APP_CONFIG.UI.THEME.OPTIONS[number];
export type Currency = typeof APP_CONFIG.UI.CURRENCY.OPTIONS[number];

// Validate environment on module load
if (typeof window !== 'undefined') {
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed:', error);
  }
}