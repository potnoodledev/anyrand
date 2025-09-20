/**
 * Hook Return Value Interfaces for Anyrand Frontend
 *
 * These interfaces define the contracts for custom React hooks,
 * ensuring consistent data flow and state management patterns.
 */

import { Address } from 'viem';
import { RandomnessRequest, PendingRequest, RequestState, TransactionStatus } from './component-interfaces';

// ============================================================================
// Wallet Hook Interfaces
// ============================================================================

export interface UseWalletReturn {
  // Connection State
  isConnected: boolean;
  isConnecting: boolean;
  address?: Address;
  chainId?: number;

  // Account Information
  balance?: string; // Formatted ETH balance
  ensName?: string;

  // Connection Methods
  connect: () => Promise<void>;
  disconnect: () => void;

  // Network Management
  switchChain: (chainId: number) => Promise<void>;
  addChain: (chain: ChainConfig) => Promise<void>;

  // Status
  isCorrectChain: boolean;
  supportedChains: number[];

  // Error Handling
  error?: Error;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// ============================================================================
// Anyrand Contract Hook Interfaces
// ============================================================================

export interface UseAnyrandReturn {
  // Contract Interaction Methods
  requestRandomness: (params: RequestRandomnessParams) => Promise<RequestResult>;
  fulfillRandomness: (params: FulfillRandomnessParams) => Promise<FulfillmentResult>;

  // Query Methods
  getRequestPrice: (callbackGasLimit: number) => Promise<PriceInfo>;
  getRequestState: (requestId: bigint) => Promise<RequestState>;
  getMaxCallbackGasLimit: () => Promise<bigint>;
  getMaxDeadlineDelta: () => Promise<bigint>;

  // Configuration
  contractAddress: Address;
  isContractReady: boolean;

  // Loading States
  isLoading: boolean;
  isRequestingRandomness: boolean;
  isFulfillingRandomness: boolean;

  // Error Handling
  error?: Error;
  lastError?: Error;
  clearError: () => void;
}

export interface RequestRandomnessParams {
  deadline: number;
  callbackGasLimit: number;
  value?: bigint; // Optional override for payment amount
}

export interface FulfillRandomnessParams {
  requestId: bigint;
  requester: Address;
  pubKeyHash: string;
  round: bigint;
  callbackGasLimit: bigint;
  signature: [bigint, bigint]; // BLS signature
}

export interface RequestResult {
  requestId: bigint;
  transactionHash: string;
  round: bigint;
  estimatedFulfillmentTime: number;
}

export interface FulfillmentResult {
  transactionHash: string;
  requestId: bigint;
  randomness?: bigint; // Available after transaction confirmation
  earnings: bigint;
}

export interface PriceInfo {
  totalPrice: bigint;
  effectiveFeePerGas: bigint;
  baseFee: bigint;
  priorityFee: bigint;
  gasEstimate: bigint;
  formatted: {
    total: string;
    totalUSD?: string;
    gasPrice: string;
  };
}

// ============================================================================
// Request Management Hook Interfaces
// ============================================================================

export interface UseRandomnessRequestsReturn {
  // Data
  requests: RandomnessRequest[];
  totalRequests: number;

  // Filtering and Pagination
  filteredRequests: RandomnessRequest[];
  currentPage: number;
  totalPages: number;

  // Actions
  refreshRequests: () => Promise<void>;
  getRequest: (requestId: bigint) => RandomnessRequest | undefined;
  setFilters: (filters: RequestFilters) => void;
  setPage: (page: number) => void;

  // Status
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated?: number;

  // Error Handling
  error?: Error;
}

export interface RequestFilters {
  status?: RequestState[];
  dateRange?: {
    start: number;
    end: number;
  };
  requester?: Address;
  minAmount?: bigint;
  maxAmount?: bigint;
}

export interface UsePendingRequestsReturn {
  // Data
  pendingRequests: PendingRequest[];
  totalPending: number;

  // Filtering and Sorting
  filteredRequests: PendingRequest[];
  sortBy: PendingSortBy;
  sortOrder: 'asc' | 'desc';

  // Actions
  refreshPending: () => Promise<void>;
  setSortBy: (sortBy: PendingSortBy) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilters: (filters: PendingFilters) => void;

  // Fulfillment
  fulfillRequest: (requestId: bigint) => Promise<FulfillmentResult>;

  // Status
  isLoading: boolean;
  isRefreshing: boolean;

  // Error Handling
  error?: Error;
}

export type PendingSortBy = 'earnings' | 'deadline' | 'profit' | 'risk';

export interface PendingFilters {
  minEarnings?: bigint;
  maxRisk?: 'low' | 'medium' | 'high';
  timeFrame?: number; // Hours until fulfillable
}

// ============================================================================
// Transaction Hook Interfaces
// ============================================================================

export interface UseTransactionReturn {
  // Transaction State
  hash?: string;
  status: TransactionStatus;
  confirmations: number;
  receipt?: TransactionReceipt;

  // Methods
  waitForConfirmation: (confirmations?: number) => Promise<TransactionReceipt>;
  retry: () => Promise<void>;

  // Status Checks
  isPending: boolean;
  isConfirmed: boolean;
  isFailed: boolean;

  // Error Handling
  error?: Error;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: 'success' | 'reverted';
  logs: TransactionLog[];
}

export interface TransactionLog {
  address: Address;
  topics: string[];
  data: string;
  decoded?: {
    eventName: string;
    args: Record<string, any>;
  };
}

export interface UseTransactionHistoryReturn {
  // Data
  transactions: TransactionRecord[];
  totalTransactions: number;

  // Filtering and Pagination
  filteredTransactions: TransactionRecord[];
  currentPage: number;
  totalPages: number;

  // Actions
  refreshHistory: () => Promise<void>;
  setFilters: (filters: TransactionFilters) => void;
  setPage: (page: number) => void;

  // Status
  isLoading: boolean;
  isRefreshing: boolean;

  // Error Handling
  error?: Error;
}

export interface TransactionRecord {
  hash: string;
  type: 'request' | 'fulfillment';
  status: TransactionStatus;
  timestamp: number;
  value: bigint;
  gasUsed?: bigint;
  relatedRequestId?: bigint;
}

export interface TransactionFilters {
  type?: 'request' | 'fulfillment';
  status?: TransactionStatus[];
  dateRange?: {
    start: number;
    end: number;
  };
}

// ============================================================================
// Real-time Data Hook Interfaces
// ============================================================================

export interface UseBlockchainDataReturn {
  // Network Information
  currentBlock: number;
  gasPrice: bigint;
  baseFee: bigint;

  // Update Methods
  refreshData: () => Promise<void>;

  // Status
  isLoading: boolean;
  lastUpdated: number;

  // Auto-refresh
  isAutoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;

  // Error Handling
  error?: Error;
}

export interface UseDrandBeaconReturn {
  // Beacon State
  currentRound: bigint;
  roundTimestamp: number;
  nextRoundTime: number;
  beaconPeriod: number;

  // Status
  isHealthy: boolean;
  lastUpdated: number;

  // Calculations
  getRoundForDeadline: (deadline: number) => bigint;
  getTimeUntilRound: (round: bigint) => number;

  // Actions
  refreshBeacon: () => Promise<void>;

  // Error Handling
  error?: Error;
}

export interface UseEventListenerReturn {
  // Event Data
  events: BlockchainEvent[];
  latestEvent?: BlockchainEvent;

  // Status
  isListening: boolean;
  eventsCount: number;

  // Controls
  startListening: () => void;
  stopListening: () => void;
  clearEvents: () => void;

  // Error Handling
  error?: Error;
}

export interface BlockchainEvent {
  eventName: string;
  args: Record<string, any>;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

// ============================================================================
// Utility Hook Interfaces
// ============================================================================

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
  isLoading: boolean;
}

export interface UseDebounceReturn<T> {
  debouncedValue: T;
  isPending: boolean;
}

export interface UsePreviousReturn<T> {
  previous: T | undefined;
}

export interface UseAsyncReturn<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;

  setValue: (field: keyof T, value: T[keyof T]) => void;
  setError: (field: keyof T, error: string) => void;
  resetForm: () => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void>) => (event: React.FormEvent) => Promise<void>;
}

// ============================================================================
// Error Types
// ============================================================================

export interface BlockchainError extends Error {
  code?: number;
  data?: any;
  reason?: string;
  transaction?: {
    hash: string;
    from: Address;
    to: Address;
  };
}

export interface ContractError extends BlockchainError {
  method?: string;
  args?: any[];
  contractAddress?: Address;
}