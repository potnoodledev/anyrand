/**
 * Wagmi and Reown AppKit Configuration
 *
 * Configures Web3 wallet connection, network management, and blockchain interactions
 * for the Anyrand application using Wagmi v2 and Reown AppKit.
 */

import { cookieStorage, createStorage } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { scroll, scrollSepolia, base, baseSepolia } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { ENV, getContractAddress, getRpcUrl } from './config'

// ============================================================================
// Network Configuration
// ============================================================================

export const networks = [
  scroll,
  scrollSepolia,
  base,
  baseSepolia,
];

// ============================================================================
// Wagmi Adapter Configuration
// ============================================================================

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  networks,
  projectId: ENV.REOWN_PROJECT_ID,
});

// ============================================================================
// AppKit Configuration
// ============================================================================

export const metadata = {
  name: 'Anyrand',
  description: 'Verifiable Randomness Service',
  url: ENV.APP_URL,
  icons: [
    `${ENV.APP_URL}/favicon.ico`,
    `${ENV.APP_URL}/icon-192x192.png`,
    `${ENV.APP_URL}/icon-512x512.png`,
  ],
};

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId: ENV.REOWN_PROJECT_ID,
  networks,
  defaultNetwork: scroll,
  metadata,
  features: {
    analytics: ENV.FEATURES.ANALYTICS,
    email: false,
    socials: [],
    emailShowWallets: true,
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-color-mix': '#1976d2',
    '--w3m-color-mix-strength': 40,
    '--w3m-accent': '#1976d2',
    '--w3m-border-radius-master': '8px',
  },
});

// ============================================================================
// Wagmi Config Export
// ============================================================================

export const config = wagmiAdapter.wagmiConfig;

// ============================================================================
// Network Utilities
// ============================================================================

/**
 * Gets the Anyrand contract address for the current network
 */
export function getAnyrandAddress(chainId: number): string {
  return getContractAddress(chainId, 'ANYRAND');
}

/**
 * Gets the Beacon contract address for the current network
 */
export function getBeaconAddress(chainId: number): string {
  return getContractAddress(chainId, 'BEACON');
}

/**
 * Gets the Gas Station contract address for the current network
 */
export function getGasStationAddress(chainId: number): string {
  return getContractAddress(chainId, 'GAS_STATION');
}

/**
 * Gets block explorer URL for a transaction hash
 */
export function getBlockExplorerUrl(chainId: number, txHash: string): string {
  switch (chainId) {
    case 534352: // Scroll
      return `https://scrollscan.com/tx/${txHash}`;
    case 534351: // Scroll Sepolia
      return `https://sepolia.scrollscan.com/tx/${txHash}`;
    case 8453: // Base
      return `https://basescan.org/tx/${txHash}`;
    case 84532: // Base Sepolia
      return `https://sepolia.basescan.org/tx/${txHash}`;
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
}

/**
 * Gets block explorer URL for an address
 */
export function getAddressUrl(chainId: number, address: string): string {
  switch (chainId) {
    case 534352: // Scroll
      return `https://scrollscan.com/address/${address}`;
    case 534351: // Scroll Sepolia
      return `https://sepolia.scrollscan.com/address/${address}`;
    case 8453: // Base
      return `https://basescan.org/address/${address}`;
    case 84532: // Base Sepolia
      return `https://sepolia.basescan.org/address/${address}`;
    default:
      return `https://etherscan.io/address/${address}`;
  }
}

/**
 * Checks if EIP-1559 is supported on the network
 */
export function supportsEIP1559(chainId: number): boolean {
  // All our supported networks support EIP-1559
  return [534352, 534351, 8453, 84532].includes(chainId);
}

/**
 * Gets average block time for the network (in seconds)
 */
export function getAverageBlockTime(chainId: number): number {
  switch (chainId) {
    case 534352: // Scroll
    case 534351: // Scroll Sepolia
      return 3; // ~3 seconds
    case 8453: // Base
    case 84532: // Base Sepolia
      return 2; // ~2 seconds
    default:
      return 12; // Ethereum default
  }
}

/**
 * Gets required confirmations for the network
 */
export function getRequiredConfirmations(chainId: number): number {
  switch (chainId) {
    case 534352: // Scroll
    case 8453: // Base
      return 3; // Mainnet requires more confirmations
    case 534351: // Scroll Sepolia
    case 84532: // Base Sepolia
      return 1; // Testnet can use fewer confirmations
    default:
      return 3;
  }
}

/**
 * Gets native currency symbol for the network
 */
export function getNativeCurrency(chainId: number): string {
  // All our supported networks use ETH
  return 'ETH';
}

/**
 * Formats chain ID to hex string
 */
export function formatChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

/**
 * Gets network color for UI display
 */
export function getNetworkColor(chainId: number): string {
  switch (chainId) {
    case 534352: // Scroll
    case 534351: // Scroll Sepolia
      return '#E8B931'; // Scroll brand color
    case 8453: // Base
    case 84532: // Base Sepolia
      return '#0052FF'; // Base brand color
    default:
      return '#627EEA'; // Ethereum blue
  }
}

/**
 * Checks if the network is a testnet
 */
export function isTestnet(chainId: number): boolean {
  return [534351, 84532].includes(chainId);
}

/**
 * Gets the corresponding mainnet chain ID for a testnet
 */
export function getMainnetChainId(chainId: number): number | null {
  switch (chainId) {
    case 534351: // Scroll Sepolia
      return 534352; // Scroll
    case 84532: // Base Sepolia
      return 8453; // Base
    default:
      return null;
  }
}

/**
 * Gets the corresponding testnet chain ID for a mainnet
 */
export function getTestnetChainId(chainId: number): number | null {
  switch (chainId) {
    case 534352: // Scroll
      return 534351; // Scroll Sepolia
    case 8453: // Base
      return 84532; // Base Sepolia
    default:
      return null;
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Maps wallet error codes to user-friendly messages
 */
export function getWalletErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred';

  const code = error.code || error.error?.code;
  const message = error.message || error.reason || 'Unknown error';

  switch (code) {
    case 4001:
      return 'Transaction was rejected by user';
    case 4100:
      return 'Unauthorized access to wallet';
    case 4200:
      return 'Unsupported method';
    case 4901:
      return 'Wallet is not connected to the correct network';
    case -32002:
      return 'Transaction request already pending';
    case -32603:
      return 'Internal wallet error';
    default:
      // Extract meaningful error messages
      if (message.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
      }
      if (message.includes('gas')) {
        return 'Gas estimation failed. Please try again.';
      }
      if (message.includes('nonce')) {
        return 'Transaction nonce error. Please try again.';
      }
      if (message.includes('rejected')) {
        return 'Transaction was rejected';
      }
      return message.slice(0, 100); // Truncate very long messages
  }
}

/**
 * Type definitions for better TypeScript support
 */
export type SupportedChainId = 534352 | 534351 | 8453 | 84532;
export type NetworkName = 'Scroll' | 'Scroll Sepolia' | 'Base' | 'Base Sepolia';