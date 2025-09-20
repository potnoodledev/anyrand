/**
 * Core Data Types and Entities for Anyrand Frontend
 *
 * These types define the core data structures used throughout the application,
 * based on the data model specification and smart contract interfaces.
 */

import { Address, Hash } from 'viem';

// ============================================================================
// Enums
// ============================================================================

export enum RequestState {
  Nonexistent = 0,
  Pending = 1,
  Fulfilled = 2,
  Failed = 3
}

export enum TransactionStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Failed = 'failed',
  Replaced = 'replaced'
}

export enum TransactionType {
  Request = 'request',
  Fulfillment = 'fulfillment'
}

export enum FulfillmentComplexity {
  Simple = 'simple',
  Moderate = 'moderate',
  Complex = 'complex'
}

export enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

export enum WalletType {
  MetaMask = 'metamask',
  WalletConnect = 'walletconnect',
  Coinbase = 'coinbase',
  Other = 'other'
}

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Represents a user's request for verifiable randomness from the Anyrand system
 */
export interface RandomnessRequest {
  // Core identifiers
  requestId: bigint;
  requester: Address;

  // Request parameters
  deadline: number; // Unix timestamp
  callbackGasLimit: bigint;
  feePaid: bigint;
  effectiveFeePerGas: bigint;

  // Drand beacon information
  pubKeyHash: string;
  round: bigint;

  // Request state
  status: RequestState;

  // Fulfillment data (only available if fulfilled)
  randomness?: bigint;
  callbackSuccess?: boolean;
  actualGasUsed?: bigint;

  // Transaction information
  transactionHash: Hash;
  blockNumber: number;
  timestamp: number;

  // Computed fields
  isExpired?: boolean;
  timeUntilDeadline?: number;
  estimatedFulfillmentTime?: number;
}

/**
 * Represents blockchain transactions related to randomness operations
 */
export interface Transaction {
  // Transaction identifiers
  hash: Hash;
  type: TransactionType;

  // Transaction details
  from: Address;
  to: Address;
  value: bigint;
  gasLimit: bigint;
  gasUsed?: bigint;
  gasPrice: bigint;

  // Block information
  blockNumber?: number;
  blockHash?: Hash;
  confirmations: number;
  status: TransactionStatus;

  // Metadata
  timestamp: number;
  relatedRequestId?: bigint;

  // Error information (if failed)
  error?: string;
  revertReason?: string;
}

/**
 * Represents a connected wallet session and user preferences
 */
export interface UserSession {
  // Connection state
  address: Address;
  chainId: number;
  isConnected: boolean;
  walletType: WalletType;

  // Account information
  balance: string; // Formatted ETH balance
  ensName?: string;

  // Session metadata
  lastConnected: number;
  sessionId: string;

  // User preferences
  preferences: UserPreferences;
}

/**
 * Represents randomness requests from other users available for fulfillment
 */
export interface PendingRequest {
  // Request identifiers
  requestId: bigint;
  requester: Address;

  // Request parameters
  deadline: number;
  round: bigint;
  callbackGasLimit: bigint;

  // Economic information
  estimatedEarnings: bigint;
  networkGasCost: bigint;
  profitMargin: bigint;

  // Timing information
  timeUntilFulfillable: number; // Seconds
  estimatedFulfillmentTime: number;

  // Risk assessment
  complexity: FulfillmentComplexity;
  riskLevel: RiskLevel;

  // Derived fields
  isReadyForFulfillment: boolean;
  roi: number; // Return on investment percentage
  gasEfficiency: number; // Profit per gas unit
}

/**
 * Represents the current state of the drand beacon system
 */
export interface DrandRound {
  // Current beacon state
  currentRound: bigint;
  roundTimestamp: number;
  nextRoundTime: number;

  // Beacon configuration
  beaconPeriod: number; // Seconds between rounds
  genesisTime: number;
  pubKeyHash: string;

  // Health status
  isHealthy: boolean;
  lastUpdateTime: number;
  consecutiveFailures: number;

  // Network information
  networkLatency: number;
  beaconDelay: number;
}

// ============================================================================
// Complex Types
// ============================================================================

/**
 * User preferences and settings
 */
export interface UserPreferences {
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  currency: 'ETH' | 'USD';
  language: string;

  // Notification preferences
  notifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;

  // Transaction preferences
  defaultGasLimit: number;
  autoApproveGasLimit: number;
  maxSlippage: number;

  // Display preferences
  showTestnets: boolean;
  hideSmallBalances: boolean;
  compactMode: boolean;

  // Advanced settings
  customRpcUrls: Record<number, string>;
  debugMode: boolean;
  betaFeatures: boolean;
}

/**
 * Price estimation for randomness requests
 */
export interface PriceEstimate {
  // Raw values (in wei)
  totalPrice: bigint;
  effectiveFeePerGas: bigint;
  baseFee: bigint;
  priorityFee: bigint;
  gasEstimate: bigint;

  // Formatted values for display
  formatted: {
    total: string; // e.g., "0.001 ETH"
    totalUSD?: string; // e.g., "$2.50"
    gasPrice: string; // e.g., "20 gwei"
    breakdown: {
      baseFee: string;
      priorityFee: string;
      gasEstimate: string;
    };
  };

  // Estimation metadata
  confidence: number; // 0-1, estimation accuracy
  lastUpdated: number;
  validUntil: number;
}

/**
 * Network configuration information
 */
export interface NetworkInfo {
  // Network identifiers
  chainId: number;
  name: string;
  shortName: string;
  isTestnet: boolean;

  // Network properties
  rpcUrl: string;
  blockExplorer: string;
  averageBlockTime: number;
  confirmationsRequired: number;

  // Contract addresses
  contractAddresses: {
    anyrand: Address;
    beacon: Address;
    gasStation: Address;
  };

  // Network status
  isHealthy: boolean;
  latestBlock: number;
  gasPrice: bigint;

  // Visual properties
  logoUrl?: string;
  primaryColor: string;
}

/**
 * Application statistics and metrics
 */
export interface AppStatistics {
  // Global statistics
  totalRequests: number;
  totalRandomnessGenerated: bigint;
  totalValueLocked: bigint;
  activeUsers: number;

  // Network-specific statistics
  networkStats: Record<number, {
    requestCount: number;
    averageFulfillmentTime: number;
    successRate: number;
    totalFees: bigint;
  }>;

  // User statistics
  userStats?: {
    requestCount: number;
    successRate: number;
    totalSpent: bigint;
    totalEarned: bigint;
    averageWaitTime: number;
  };

  // Time-based metrics
  last24h: {
    requests: number;
    volume: bigint;
    averageGasPrice: bigint;
  };

  // Performance metrics
  averageResponseTime: number;
  uptimePercentage: number;
  lastUpdated: number;
}

/**
 * Error information with context
 */
export interface ErrorInfo {
  // Error classification
  type: 'network' | 'contract' | 'user' | 'validation' | 'unknown';
  code?: string | number;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Error details
  message: string;
  originalError?: any;
  stack?: string;

  // Context information
  context: {
    action: string;
    timestamp: number;
    userAddress?: Address;
    chainId?: number;
    transactionHash?: Hash;
    requestId?: bigint;
  };

  // Recovery information
  isRecoverable: boolean;
  suggestedActions: string[];
  retryDelay?: number;
}

/**
 * Filter options for various data queries
 */
export interface FilterOptions {
  // Request filters
  status?: RequestState[];
  dateRange?: {
    start: number;
    end: number;
  };
  requester?: Address;
  minAmount?: bigint;
  maxAmount?: bigint;
  chainIds?: number[];

  // Transaction filters
  transactionTypes?: TransactionType[];
  transactionStatus?: TransactionStatus[];

  // Sorting options
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Pagination
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: ErrorInfo;
  pagination?: PaginationInfo;
  metadata?: {
    timestamp: number;
    version: string;
    chainId: number;
  };
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Blockchain events from smart contracts
 */
export interface BlockchainEvent {
  // Event identification
  eventName: string;
  signature: string;
  contractAddress: Address;

  // Event data
  args: Record<string, any>;
  rawData: string;

  // Block information
  blockNumber: number;
  blockHash: Hash;
  transactionHash: Hash;
  transactionIndex: number;
  logIndex: number;

  // Metadata
  timestamp: number;
  removed: boolean;
}

/**
 * Application-level events for state management
 */
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: number;
  source: 'user' | 'system' | 'blockchain' | 'external';
  metadata?: Record<string, any>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: ErrorInfo;
  lastUpdated?: number;
}

/**
 * Form state for user inputs
 */
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

/**
 * Async operation result
 */
export interface AsyncResult<T> {
  data?: T;
  error?: ErrorInfo;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a request is fulfilled
 */
export function isFulfilledRequest(request: RandomnessRequest): request is RandomnessRequest & {
  randomness: bigint;
  callbackSuccess: boolean;
  actualGasUsed: bigint;
} {
  return request.status === RequestState.Fulfilled && request.randomness !== undefined;
}

/**
 * Type guard to check if a transaction is confirmed
 */
export function isConfirmedTransaction(transaction: Transaction): transaction is Transaction & {
  blockNumber: number;
  blockHash: Hash;
  gasUsed: bigint;
} {
  return transaction.status === TransactionStatus.Confirmed && transaction.blockNumber !== undefined;
}

/**
 * Type guard to check if a pending request is ready for fulfillment
 */
export function isReadyForFulfillment(request: PendingRequest): boolean {
  return request.timeUntilFulfillable <= 0 && request.profitMargin > 0n;
}

// ============================================================================
// Constants
// ============================================================================

export const REQUEST_STATE_LABELS: Record<RequestState, string> = {
  [RequestState.Nonexistent]: 'Nonexistent',
  [RequestState.Pending]: 'Pending',
  [RequestState.Fulfilled]: 'Fulfilled',
  [RequestState.Failed]: 'Failed',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TransactionStatus.Pending]: 'Pending',
  [TransactionStatus.Confirmed]: 'Confirmed',
  [TransactionStatus.Failed]: 'Failed',
  [TransactionStatus.Replaced]: 'Replaced',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.Low]: '#10B981', // green
  [RiskLevel.Medium]: '#F59E0B', // yellow
  [RiskLevel.High]: '#EF4444', // red
};

// ============================================================================
// Type Exports
// ============================================================================

export type SupportedChainId = 534352 | 534351 | 8453 | 84532;
export type Theme = UserPreferences['theme'];
export type Currency = UserPreferences['currency'];
export type SortOrder = 'asc' | 'desc';
export type ErrorType = ErrorInfo['type'];
export type ErrorSeverity = ErrorInfo['severity'];