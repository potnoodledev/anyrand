/**
 * Network Configuration and Contract Addresses
 *
 * Centralizes network-specific configuration, contract addresses,
 * and blockchain constants for the Anyrand application.
 */

import { type Chain } from 'viem';
import {
  scroll,
  scrollSepolia,
  base,
  baseSepolia
} from 'viem/chains';
import { ENV, getContractAddress, getRpcUrl } from './config';

// ============================================================================
// Network Configuration
// ============================================================================

export interface NetworkConfig {
  chainId: number;
  name: string;
  shortName: string;
  chain: Chain;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    anyrand: `0x${string}`;
    beacon: `0x${string}`;
    gasStation: `0x${string}`;
  };
  features: {
    supportsEIP1559: boolean;
    averageBlockTime: number; // seconds
    confirmationsRequired: number;
    gasMultiplier: number;
    isTestnet: boolean;
  };
  theme: {
    primaryColor: string;
    logoUrl?: string;
  };
}

// ============================================================================
// Supported Networks
// ============================================================================

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  // Scroll Mainnet
  534352: {
    chainId: 534352,
    name: 'Scroll',
    shortName: 'scroll',
    chain: scroll,
    rpcUrls: [
      getRpcUrl(534352),
      'https://rpc.scroll.io',
      'https://scroll-mainnet.public.blastapi.io',
    ],
    blockExplorerUrls: [
      'https://scrollscan.com',
    ],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      anyrand: getContractAddress(534352, 'ANYRAND') as `0x${string}`,
      beacon: getContractAddress(534352, 'BEACON') as `0x${string}`,
      gasStation: getContractAddress(534352, 'GAS_STATION') as `0x${string}`,
    },
    features: {
      supportsEIP1559: true,
      averageBlockTime: 3,
      confirmationsRequired: 3,
      gasMultiplier: 1.2,
      isTestnet: false,
    },
    theme: {
      primaryColor: '#E8B931',
      logoUrl: '/networks/scroll.svg',
    },
  },

  // Scroll Sepolia Testnet
  534351: {
    chainId: 534351,
    name: 'Scroll Sepolia',
    shortName: 'scroll-sepolia',
    chain: scrollSepolia,
    rpcUrls: [
      getRpcUrl(534351),
      'https://sepolia-rpc.scroll.io',
      'https://scroll-sepolia.public.blastapi.io',
    ],
    blockExplorerUrls: [
      'https://sepolia.scrollscan.com',
    ],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      anyrand: getContractAddress(534351, 'ANYRAND') as `0x${string}`,
      beacon: getContractAddress(534351, 'BEACON') as `0x${string}`,
      gasStation: getContractAddress(534351, 'GAS_STATION') as `0x${string}`,
    },
    features: {
      supportsEIP1559: true,
      averageBlockTime: 3,
      confirmationsRequired: 1,
      gasMultiplier: 1.1,
      isTestnet: true,
    },
    theme: {
      primaryColor: '#E8B931',
      logoUrl: '/networks/scroll.svg',
    },
  },

  // Base Mainnet
  8453: {
    chainId: 8453,
    name: 'Base',
    shortName: 'base',
    chain: base,
    rpcUrls: [
      getRpcUrl(8453),
      'https://mainnet.base.org',
      'https://base.public.blastapi.io',
    ],
    blockExplorerUrls: [
      'https://basescan.org',
    ],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      anyrand: getContractAddress(8453, 'ANYRAND') as `0x${string}`,
      beacon: getContractAddress(8453, 'BEACON') as `0x${string}`,
      gasStation: getContractAddress(8453, 'GAS_STATION') as `0x${string}`,
    },
    features: {
      supportsEIP1559: true,
      averageBlockTime: 2,
      confirmationsRequired: 3,
      gasMultiplier: 1.2,
      isTestnet: false,
    },
    theme: {
      primaryColor: '#0052FF',
      logoUrl: '/networks/base.svg',
    },
  },

  // Base Sepolia Testnet
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    shortName: 'base-sepolia',
    chain: baseSepolia,
    rpcUrls: [
      getRpcUrl(84532),
      'https://sepolia.base.org',
    ],
    blockExplorerUrls: [
      'https://sepolia.basescan.org',
    ],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      anyrand: getContractAddress(84532, 'ANYRAND') as `0x${string}`,
      beacon: getContractAddress(84532, 'BEACON') as `0x${string}`,
      gasStation: getContractAddress(84532, 'GAS_STATION') as `0x${string}`,
    },
    features: {
      supportsEIP1559: true,
      averageBlockTime: 2,
      confirmationsRequired: 1,
      gasMultiplier: 1.1,
      isTestnet: true,
    },
    theme: {
      primaryColor: '#0052FF',
      logoUrl: '/networks/base.svg',
    },
  },
};

// ============================================================================
// Network Utilities
// ============================================================================

/**
 * Gets network configuration by chain ID
 */
export function getNetworkConfig(chainId: number): NetworkConfig | null {
  return SUPPORTED_NETWORKS[chainId] || null;
}

/**
 * Checks if a chain ID is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return chainId in SUPPORTED_NETWORKS;
}

/**
 * Gets all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(SUPPORTED_NETWORKS).map(Number);
}

/**
 * Gets all supported networks
 */
export function getSupportedNetworks(): NetworkConfig[] {
  return Object.values(SUPPORTED_NETWORKS);
}

/**
 * Gets mainnet networks only
 */
export function getMainnetNetworks(): NetworkConfig[] {
  return Object.values(SUPPORTED_NETWORKS).filter(network => !network.features.isTestnet);
}

/**
 * Gets testnet networks only
 */
export function getTestnetNetworks(): NetworkConfig[] {
  return Object.values(SUPPORTED_NETWORKS).filter(network => network.features.isTestnet);
}

/**
 * Gets the default network based on environment
 */
export function getDefaultNetwork(): NetworkConfig {
  const defaultChainId = ENV.FEATURES.TESTNET_MODE ? 534351 : ENV.DEFAULT_CHAIN_ID;
  return getNetworkConfig(defaultChainId) || SUPPORTED_NETWORKS[534352];
}

/**
 * Gets contract address for a specific network and contract type
 */
export function getContractAddressForNetwork(
  chainId: number,
  contractType: keyof NetworkConfig['contracts']
): `0x${string}` | null {
  const network = getNetworkConfig(chainId);
  return network?.contracts[contractType] || null;
}

/**
 * Gets block explorer URL for a transaction
 */
export function getTransactionUrl(chainId: number, txHash: string): string {
  const network = getNetworkConfig(chainId);
  if (!network) return '';
  return `${network.blockExplorerUrls[0]}/tx/${txHash}`;
}

/**
 * Gets block explorer URL for an address
 */
export function getAddressUrl(chainId: number, address: string): string {
  const network = getNetworkConfig(chainId);
  if (!network) return '';
  return `${network.blockExplorerUrls[0]}/address/${address}`;
}

/**
 * Gets block explorer URL for a block
 */
export function getBlockUrl(chainId: number, blockNumber: number): string {
  const network = getNetworkConfig(chainId);
  if (!network) return '';
  return `${network.blockExplorerUrls[0]}/block/${blockNumber}`;
}

/**
 * Formats chain ID as hex string
 */
export function formatChainIdHex(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}` as `0x${string}`;
}

/**
 * Gets network display name with testnet indicator
 */
export function getNetworkDisplayName(chainId: number): string {
  const network = getNetworkConfig(chainId);
  if (!network) return 'Unknown Network';

  return network.features.isTestnet
    ? `${network.name} (Testnet)`
    : network.name;
}

/**
 * Gets network theme color
 */
export function getNetworkColor(chainId: number): string {
  const network = getNetworkConfig(chainId);
  return network?.theme.primaryColor || '#627EEA';
}

/**
 * Gets estimated transaction time in seconds
 */
export function getEstimatedTransactionTime(chainId: number, confirmations?: number): number {
  const network = getNetworkConfig(chainId);
  if (!network) return 60; // Default 1 minute

  const requiredConfirmations = confirmations || network.features.confirmationsRequired;
  return network.features.averageBlockTime * requiredConfirmations;
}

/**
 * Gets gas multiplier for the network
 */
export function getGasMultiplier(chainId: number): number {
  const network = getNetworkConfig(chainId);
  return network?.features.gasMultiplier || 1.2;
}

/**
 * Checks if network supports EIP-1559
 */
export function supportsEIP1559(chainId: number): boolean {
  const network = getNetworkConfig(chainId);
  return network?.features.supportsEIP1559 || false;
}

/**
 * Gets the corresponding mainnet for a testnet (or vice versa)
 */
export function getCorrespondingNetwork(chainId: number): NetworkConfig | null {
  const network = getNetworkConfig(chainId);
  if (!network) return null;

  if (network.features.isTestnet) {
    // Find corresponding mainnet
    switch (chainId) {
      case 534351: // Scroll Sepolia
        return getNetworkConfig(534352); // Scroll
      case 84532: // Base Sepolia
        return getNetworkConfig(8453); // Base
      default:
        return null;
    }
  } else {
    // Find corresponding testnet
    switch (chainId) {
      case 534352: // Scroll
        return getNetworkConfig(534351); // Scroll Sepolia
      case 8453: // Base
        return getNetworkConfig(84532); // Base Sepolia
      default:
        return null;
    }
  }
}

/**
 * Validates if an address is a valid contract address for the network
 */
export function isValidContractAddress(chainId: number, address: string): boolean {
  const network = getNetworkConfig(chainId);
  if (!network) return false;

  const normalizedAddress = address.toLowerCase();
  const contracts = Object.values(network.contracts);

  return contracts.some(contractAddress =>
    contractAddress.toLowerCase() === normalizedAddress
  );
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_CHAIN_ID = ENV.DEFAULT_CHAIN_ID;
export const SUPPORTED_CHAIN_IDS = getSupportedChainIds();

// Export commonly used networks for convenience
export const SCROLL_MAINNET = SUPPORTED_NETWORKS[534352];
export const SCROLL_SEPOLIA = SUPPORTED_NETWORKS[534351];
export const BASE_MAINNET = SUPPORTED_NETWORKS[8453];
export const BASE_SEPOLIA = SUPPORTED_NETWORKS[84532];

// ============================================================================
// Type Exports
// ============================================================================

export type SupportedChainId = keyof typeof SUPPORTED_NETWORKS;
export type NetworkName = NetworkConfig['name'];
export type ContractType = keyof NetworkConfig['contracts'];