/**
 * Wallet Connection Contracts
 * Phase 1: Authentication interfaces for wallet integration
 */

import type { Address, Chain, Connector } from 'wagmi';

/**
 * Core wallet session state
 */
export interface WalletSession {
  /** Connected wallet address */
  address?: Address;
  /** Active connector instance */
  connector?: Connector;
  /** Current chain ID */
  chainId?: number;
  /** Connection status flag */
  isConnected: boolean;
  /** Connection in progress flag */
  isConnecting: boolean;
  /** Reconnection in progress flag */
  isReconnecting: boolean;
  /** Session status */
  status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
}

/**
 * Network information and configuration
 */
export interface NetworkInfo {
  /** Network chain ID */
  chainId: number;
  /** Human-readable network name */
  name: string;
  /** Native currency information */
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  /** RPC endpoints */
  rpcUrls: {
    default: {
      http: readonly string[];
      webSocket?: readonly string[];
    };
  };
  /** Block explorer configuration */
  blockExplorers: {
    default: {
      name: string;
      url: string;
    };
  };
  /** Deployed contract addresses */
  contracts?: Record<string, { address: Address }>;
  /** Test network flag */
  testnet: boolean;
}

/**
 * Connection UI state
 */
export interface ConnectionState {
  /** Modal open state */
  isOpen: boolean;
  /** Current modal view */
  view: 'Connect' | 'Account' | 'Networks' | 'WhatIsAWallet' | 'WhatIsANetwork';
  /** WalletConnect QR code data */
  qrCodeUri?: string;
  /** Deep link URI for mobile wallets */
  pairingUri?: string;
  /** Currently selected wallet */
  selectedWallet?: WalletInfo;
  /** Current connection error */
  error?: ConnectionError;
}

/**
 * User account information
 */
export interface UserAccount {
  /** Wallet address */
  address: Address;
  /** ENS name if available */
  ensName: string | null;
  /** ENS avatar URL if available */
  ensAvatar: string | null;
  /** Native token balance */
  balance: {
    value: bigint;
    formatted: string;
    symbol: string;
  };
  /** Smart contract account flag */
  isContract: boolean;
  /** Display name (ENS or truncated address) */
  displayName: string;
}

/**
 * Wallet provider information
 */
export interface WalletInfo {
  /** Unique wallet identifier */
  id: string;
  /** Wallet display name */
  name: string;
  /** Wallet icon URL */
  icon: string;
  /** Download URL if not installed */
  downloadUrl?: string;
  /** Installation status */
  installed: boolean;
  /** Recently used flag */
  recent: boolean;
}

/**
 * Session persistence data
 */
export interface SessionStorage {
  /** Last used connector ID */
  connectorId: string | null;
  /** Last connected chain */
  chainId: number | null;
  /** Last connected address */
  address: Address | null;
  /** Connection timestamp */
  timestamp: number;
  /** Session expiration timestamp */
  expiresAt: number;
}

/**
 * Standardized connection error
 */
export interface ConnectionError {
  /** Error code */
  code: ConnectionErrorCode;
  /** Human-readable message */
  message: string;
  /** Additional error details */
  details?: unknown;
}

/**
 * Connection error codes
 */
export enum ConnectionErrorCode {
  /** User rejected the connection request */
  USER_REJECTED = 4001,
  /** Chain mismatch error */
  CHAIN_MISMATCH = 4902,
  /** Connector not found */
  CONNECTOR_NOT_FOUND = 4900,
  /** Resource unavailable */
  RESOURCE_UNAVAILABLE = 4901,
  /** Connection timeout */
  TIMEOUT = 408,
}

/**
 * Wallet connection hook return type
 */
export interface UseWalletConnection {
  /** Current session state */
  session: WalletSession;
  /** Open connection modal */
  connect: () => void;
  /** Disconnect wallet */
  disconnect: () => Promise<void>;
  /** Switch to different chain */
  switchChain: (chainId: number) => Promise<void>;
  /** Connection error if any */
  error?: ConnectionError;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Account information hook return type
 */
export interface UseAccountInfo {
  /** Account data */
  account?: UserAccount;
  /** Loading account info */
  isLoading: boolean;
  /** Account fetch error */
  error?: Error;
  /** Refetch account data */
  refetch: () => void;
}

/**
 * Network state hook return type
 */
export interface UseNetworkState {
  /** Current network info */
  network?: NetworkInfo;
  /** Supported networks list */
  supportedNetworks: NetworkInfo[];
  /** Check if current network is supported */
  isSupported: boolean;
  /** Switch network function */
  switchNetwork: (chainId: number) => Promise<void>;
}

/**
 * Session persistence hook return type
 */
export interface UseSessionPersistence {
  /** Restore session from storage */
  restoreSession: () => Promise<void>;
  /** Clear stored session */
  clearSession: () => void;
  /** Check if session exists */
  hasStoredSession: boolean;
  /** Session restoration in progress */
  isRestoring: boolean;
}

/**
 * Component prop interfaces
 */

/**
 * Connect button component props
 */
export interface ConnectButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
  /** Click handler override */
  onClick?: () => void;
  /** Custom connected state label */
  connectedLabel?: (address: string) => string;
}

/**
 * Account display component props
 */
export interface AccountDisplayProps {
  /** Show balance */
  showBalance?: boolean;
  /** Show ENS avatar */
  showAvatar?: boolean;
  /** Custom class name */
  className?: string;
  /** Truncate address length */
  truncateLength?: number;
}

/**
 * Network selector component props
 */
export interface NetworkSelectorProps {
  /** Available networks */
  networks?: NetworkInfo[];
  /** Custom class name */
  className?: string;
  /** Network change handler */
  onNetworkChange?: (chainId: number) => void;
  /** Show test networks */
  showTestnets?: boolean;
}

/**
 * Chain validation dialog props
 */
export interface ChainValidationDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Current wrong chain */
  currentChain?: number;
  /** Required chain */
  requiredChain: number;
  /** Switch chain handler */
  onSwitch: () => void;
  /** Disconnect handler */
  onDisconnect: () => void;
}

/**
 * Service interfaces
 */

/**
 * Wallet service for connection management
 */
export interface IWalletService {
  /** Initialize service */
  initialize(): Promise<void>;
  /** Connect wallet */
  connect(connectorId?: string): Promise<Address>;
  /** Disconnect wallet */
  disconnect(): Promise<void>;
  /** Get current session */
  getSession(): WalletSession | null;
  /** Switch chain */
  switchChain(chainId: number): Promise<void>;
  /** Subscribe to session changes */
  onSessionChange(callback: (session: WalletSession) => void): () => void;
}

/**
 * Storage service for session persistence
 */
export interface IStorageService {
  /** Get stored session */
  getSession(): SessionStorage | null;
  /** Store session */
  setSession(session: SessionStorage): void;
  /** Clear session */
  clearSession(): void;
  /** Check session validity */
  isSessionValid(session: SessionStorage): boolean;
}

/**
 * Event types for wallet operations
 */
export interface WalletEvents {
  /** Connection established */
  'wallet:connected': { address: Address; chainId: number };
  /** Wallet disconnected */
  'wallet:disconnected': { address: Address };
  /** Chain switched */
  'wallet:chainChanged': { chainId: number; previousChainId: number };
  /** Account changed */
  'wallet:accountChanged': { address: Address; previousAddress: Address };
  /** Connection error */
  'wallet:error': { error: ConnectionError };
}

/**
 * Configuration types
 */

/**
 * Reown AppKit configuration
 */
export interface AppKitConfig {
  /** WalletConnect project ID */
  projectId: string;
  /** Application metadata */
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  /** Supported chains */
  chains: Chain[];
  /** Allow unsupported chain connection */
  allowUnsupportedChain?: boolean;
  /** Enable analytics */
  enableAnalytics?: boolean;
  /** Custom theme configuration */
  themeMode?: 'light' | 'dark' | 'auto';
}

/**
 * Wagmi configuration
 */
export interface WagmiConfig {
  /** Enable SSR */
  ssr: boolean;
  /** Storage configuration */
  storage: 'cookie' | 'localStorage' | 'none';
  /** Auto-connect on mount */
  autoConnect: boolean;
  /** Public RPC URLs */
  publicClient: {
    http: string;
    webSocket?: string;
  };
}