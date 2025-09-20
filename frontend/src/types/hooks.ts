/**
 * Hook Return Value Interfaces for Anyrand Frontend
 *
 * These interfaces define the contracts for custom React hooks,
 * ensuring consistent data flow and state management patterns.
 */

import { Address, Hash } from 'viem';
import {
  RandomnessRequest,
  PendingRequest,
  Transaction,
  TransactionStatus,
  RequestState,
  ErrorInfo,
  PriceEstimate,
  FilterOptions,
  UserPreferences,
  DrandRound,
  LoadingState,
  FormState,
  UserSession,
  WalletType,
  NetworkInfo,
  BlockchainEvent,
  AppStatistics,
} from './entities';

// ============================================================================
// Wallet Hook Interfaces
// ============================================================================

export interface UseWalletReturn {
  // Connection State
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  address?: Address;
  chainId?: number;

  // Account Information
  balance?: string; // Formatted ETH balance
  balanceRaw?: bigint; // Raw balance in wei
  ensName?: string;
  ensAvatar?: string;

  // Wallet Information
  walletType?: WalletType;
  walletInfo?: {
    name: string;
    icon: string;
    rdns?: string;
  };

  // Connection Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Network Management
  switchChain: (chainId: number) => Promise<void>;
  addChain: (chain: ChainConfig) => Promise<void>;

  // Status Checks
  isCorrectChain: boolean;
  supportedChains: number[];
  unsupportedChain: boolean;

  // Session Management
  session?: UserSession;
  preferences?: UserPreferences;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;

  // Error Handling
  error?: ErrorInfo;
  lastError?: ErrorInfo;
  clearError: () => void;
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
  iconUrls?: string[];
}

// ============================================================================
// Anyrand Contract Hook Interfaces
// ============================================================================

export interface UseAnyrandReturn {
  // Contract Interaction Methods
  requestRandomness: (params: RequestRandomnessParams) => Promise<RequestResult>;
  fulfillRandomness: (params: FulfillRandomnessParams) => Promise<FulfillmentResult>;

  // Query Methods
  getRequestPrice: (callbackGasLimit: number) => Promise<PriceEstimate>;
  getRequestState: (requestId: bigint) => Promise<RequestState>;
  getRequestDetails: (requestId: bigint) => Promise<RequestDetails | null>;
  getMaxCallbackGasLimit: () => Promise<bigint>;
  getMaxDeadlineDelta: () => Promise<bigint>;
  getNextRequestId: () => Promise<bigint>;

  // Configuration
  contractAddress: Address;
  isContractReady: boolean;
  chainId?: number;

  // Loading States
  isLoading: boolean;
  isRequestingRandomness: boolean;
  isFulfillingRandomness: boolean;
  isPriceEstimating: boolean;

  // Transaction Tracking
  lastRequestTransaction?: Hash;
  lastFulfillmentTransaction?: Hash;
  pendingTransactions: Hash[];

  // Error Handling
  error?: ErrorInfo;
  lastError?: ErrorInfo;
  clearError: () => void;

  // Contract Events
  subscribeToEvents: (callback: (event: BlockchainEvent) => void) => () => void;
  recentEvents: BlockchainEvent[];

  // Cache Management
  invalidateCache: () => void;
  refreshContractData: () => Promise<void>;
}

export interface RequestRandomnessParams {
  deadline: number; // Unix timestamp
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
  transactionHash: Hash;
  round: bigint;
  estimatedFulfillmentTime: number;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

export interface FulfillmentResult {
  transactionHash: Hash;
  requestId: bigint;
  randomness?: bigint; // Available after transaction confirmation
  earnings: bigint;
  gasUsed?: bigint;
  callbackSuccess?: boolean;
}

export interface RequestDetails {
  requestId: bigint;
  requester: Address;
  deadline: number;
  callbackGasLimit: bigint;
  feePaid: bigint;
  effectiveFeePerGas: bigint;
  pubKeyHash: string;
  round: bigint;
  status: RequestState;
  randomness?: bigint;
  callbackSuccess?: boolean;
  actualGasUsed?: bigint;
  createdAt: number;
  fulfilledAt?: number;
}

// ============================================================================
// Request Management Hook Interfaces
// ============================================================================

export interface UseRandomnessRequestsReturn {
  // Data
  requests: RandomnessRequest[];
  totalRequests: number;
  recentRequests: RandomnessRequest[];

  // Filtering and Pagination
  filteredRequests: RandomnessRequest[];
  currentPage: number;
  totalPages: number;
  pageSize: number;

  // Actions
  refreshRequests: () => Promise<void>;
  getRequest: (requestId: bigint) => RandomnessRequest | undefined;
  setFilters: (filters: RequestFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Status
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated?: number;
  hasMore: boolean;

  // Search and Sort
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: RequestSortBy;
  sortOrder: 'asc' | 'desc';
  setSorting: (sortBy: RequestSortBy, order: 'asc' | 'desc') => void;

  // Statistics
  stats: {
    pending: number;
    fulfilled: number;
    failed: number;
    totalValue: bigint;
    averageWaitTime: number;
  };

  // Error Handling
  error?: ErrorInfo;
  retryFailed: () => Promise<void>;
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
  chainIds?: number[];
  tags?: string[];
}

export type RequestSortBy = 'timestamp' | 'deadline' | 'amount' | 'status' | 'gasLimit';

export interface UsePendingRequestsReturn {
  // Data
  pendingRequests: PendingRequest[];
  totalPending: number;
  fulfillableRequests: PendingRequest[];

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
  batchFulfill: (requestIds: bigint[]) => Promise<BatchFulfillmentResult>;

  // Status
  isLoading: boolean;
  isRefreshing: boolean;
  isFulfilling: boolean;
  fulfillingRequestIds: Set<bigint>;

  // Economic Data
  totalPotentialEarnings: bigint;
  averageProfitMargin: bigint;
  bestOpportunity?: PendingRequest;

  // Auto-refresh
  isAutoRefreshing: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;

  // Error Handling
  error?: ErrorInfo;
  fulfillmentErrors: Map<bigint, ErrorInfo>;
  clearErrors: () => void;
}

export type PendingSortBy = 'earnings' | 'deadline' | 'profit' | 'risk' | 'gasLimit' | 'roi';

export interface PendingFilters {
  minEarnings?: bigint;
  maxRisk?: 'low' | 'medium' | 'high';
  timeFrame?: number; // Hours until fulfillable
  minProfitMargin?: bigint;
  readyOnly?: boolean;
  profitableOnly?: boolean;
}

export interface BatchFulfillmentResult {
  successful: FulfillmentResult[];
  failed: Array<{
    requestId: bigint;
    error: ErrorInfo;
  }>;
  totalEarnings: bigint;
  totalGasUsed: bigint;
}

// ============================================================================
// Transaction Hook Interfaces
// ============================================================================

export interface UseTransactionReturn {
  // Transaction State
  hash?: Hash;
  status: TransactionStatus;
  confirmations: number;
  targetConfirmations: number;
  receipt?: TransactionReceipt;

  // Methods
  waitForConfirmation: (confirmations?: number) => Promise<TransactionReceipt>;
  retry: () => Promise<void>;
  cancel: () => Promise<void>;

  // Status Checks
  isPending: boolean;
  isConfirmed: boolean;
  isFailed: boolean;
  isReplaced: boolean;

  // Progress
  progress: number; // 0-100 based on confirmations
  estimatedTime: number; // Seconds remaining
  elapsedTime: number; // Seconds since submission

  // Error Handling
  error?: ErrorInfo;
  failureReason?: string;
}

export interface TransactionReceipt {
  transactionHash: Hash;
  blockNumber: number;
  blockHash: Hash;
  transactionIndex: number;
  from: Address;
  to: Address;
  gasUsed: bigint;
  cumulativeGasUsed: bigint;
  effectiveGasPrice: bigint;
  status: 'success' | 'reverted';
  logs: TransactionLog[];
  contractAddress?: Address;
  timestamp: number;
}

export interface TransactionLog {
  address: Address;
  topics: Hash[];
  data: Hash;
  blockNumber: number;
  transactionHash: Hash;
  transactionIndex: number;
  blockHash: Hash;
  logIndex: number;
  removed: boolean;
  decoded?: {
    eventName: string;
    args: Record<string, any>;
  };
}

export interface UseTransactionHistoryReturn {
  // Data
  transactions: Transaction[];
  totalTransactions: number;
  recentTransactions: Transaction[];

  // Filtering and Pagination
  filteredTransactions: Transaction[];
  currentPage: number;
  totalPages: number;

  // Actions
  refreshHistory: () => Promise<void>;
  getTransaction: (hash: Hash) => Transaction | undefined;
  setFilters: (filters: TransactionFilters) => void;
  setPage: (page: number) => void;
  clearHistory: () => void;
  exportHistory: (format: 'csv' | 'json') => Promise<string>;

  // Status
  isLoading: boolean;
  isRefreshing: boolean;
  isExporting: boolean;

  // Search and Sort
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: TransactionSortBy;
  sortOrder: 'asc' | 'desc';
  setSorting: (sortBy: TransactionSortBy, order: 'asc' | 'desc') => void;

  // Statistics
  stats: {
    totalValue: bigint;
    totalGasUsed: bigint;
    successRate: number;
    averageGasPrice: bigint;
    requestCount: number;
    fulfillmentCount: number;
  };

  // Error Handling
  error?: ErrorInfo;
  retryFailed: () => Promise<void>;
}

export interface TransactionFilters {
  type?: 'request' | 'fulfillment';
  status?: TransactionStatus[];
  dateRange?: {
    start: number;
    end: number;
  };
  minValue?: bigint;
  maxValue?: bigint;
  chainIds?: number[];
}

export type TransactionSortBy = 'timestamp' | 'value' | 'gasUsed' | 'gasPrice' | 'status';

// ============================================================================
// Real-time Data Hook Interfaces
// ============================================================================

export interface UseBlockchainDataReturn {
  // Network Information
  currentBlock: number;
  gasPrice: bigint;
  baseFee: bigint;
  priorityFee: bigint;
  networkInfo: NetworkInfo;

  // Update Methods
  refreshData: () => Promise<void>;
  subscribeToBlocks: (callback: (block: number) => void) => () => void;

  // Status
  isLoading: boolean;
  isConnected: boolean;
  lastUpdated: number;

  // Auto-refresh
  isAutoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;

  // Health Monitoring
  isHealthy: boolean;
  latency: number;
  consecutiveFailures: number;

  // Gas Price Tracking
  gasPriceHistory: Array<{
    timestamp: number;
    gasPrice: bigint;
    baseFee: bigint;
    priorityFee: bigint;
  }>;
  gasPriceTrend: 'up' | 'down' | 'stable';

  // Error Handling
  error?: ErrorInfo;
  connectionErrors: ErrorInfo[];
}

export interface UseDrandBeaconReturn {
  // Beacon State
  currentRound: bigint;
  roundTimestamp: number;
  nextRoundTime: number;
  beaconPeriod: number;
  genesisTime: number;

  // Status
  isHealthy: boolean;
  lastUpdated: number;
  consecutiveFailures: number;
  networkLatency: number;

  // Calculations
  getRoundForDeadline: (deadline: number) => bigint;
  getTimeUntilRound: (round: bigint) => number;
  getEstimatedDelay: () => number;

  // Actions
  refreshBeacon: () => Promise<void>;
  subscribeToRounds: (callback: (round: DrandRound) => void) => () => void;

  // Round History
  recentRounds: DrandRound[];
  getRoundData: (round: bigint) => Promise<DrandRound | null>;

  // Performance Metrics
  averageRoundTime: number;
  roundTimeVariance: number;
  uptimePercentage: number;

  // Error Handling
  error?: ErrorInfo;
  isOffline: boolean;
  lastSuccessfulUpdate: number;
}

export interface UseEventListenerReturn {
  // Event Data
  events: BlockchainEvent[];
  latestEvent?: BlockchainEvent;
  eventCount: number;

  // Filtering
  filteredEvents: BlockchainEvent[];
  eventFilters: EventFilters;
  setEventFilters: (filters: EventFilters) => void;

  // Status
  isListening: boolean;
  isConnected: boolean;
  listenerCount: number;

  // Controls
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  clearEvents: () => void;

  // Event Processing
  processEvent: (event: BlockchainEvent) => void;
  replayEvents: (fromBlock?: number) => Promise<void>;

  // Subscriptions
  subscribe: (eventName: string, callback: (event: BlockchainEvent) => void) => () => void;
  unsubscribe: (eventName: string) => void;

  // Error Handling
  error?: ErrorInfo;
  connectionLost: boolean;
  lastReconnectAttempt?: number;
}

export interface EventFilters {
  eventNames?: string[];
  contractAddresses?: Address[];
  fromBlock?: number;
  toBlock?: number;
  topics?: Hash[][];
}

// ============================================================================
// Utility Hook Interfaces
// ============================================================================

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
  isLoading: boolean;
  error?: ErrorInfo;
}

export interface UseDebounceReturn<T> {
  debouncedValue: T;
  isPending: boolean;
  cancel: () => void;
  flush: () => void;
}

export interface UsePreviousReturn<T> {
  previous: T | undefined;
  hasPrevious: boolean;
}

export interface UseAsyncReturn<T, P extends any[] = any[]> {
  data?: T;
  error?: ErrorInfo;
  isLoading: boolean;
  isIdle: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (...args: P) => Promise<T>;
  reset: () => void;
  cancel: () => void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;

  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: <K extends keyof T>(field: K, error: string) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  setTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
  setFieldTouched: (fields: Partial<Record<keyof T, boolean>>) => void;

  validateField: <K extends keyof T>(field: K) => Promise<string | undefined>;
  validateForm: () => Promise<boolean>;
  resetForm: (values?: Partial<T>) => void;
  resetField: <K extends keyof T>(field: K) => void;

  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (event?: React.FormEvent) => Promise<void>;
  getFieldProps: <K extends keyof T>(field: K) => FieldProps<T[K]>;
}

export interface FieldProps<T> {
  name: string;
  value: T;
  onChange: (value: T) => void;
  onBlur: () => void;
  error?: string;
  touched?: boolean;
}

export interface UseIntervalReturn {
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  reset: () => void;
}

export interface UseClipboardReturn {
  hasCopied: boolean;
  copy: (text: string) => Promise<boolean>;
  isSupported: boolean;
  error?: ErrorInfo;
}

// ============================================================================
// Application State Hook Interfaces
// ============================================================================

export interface UseAppStateReturn {
  // Global State
  isInitialized: boolean;
  isOnline: boolean;
  theme: 'light' | 'dark' | 'system';
  currency: 'ETH' | 'USD';

  // User State
  user?: UserSession;
  preferences?: UserPreferences;
  isAuthenticated: boolean;

  // Network State
  chainId?: number;
  isCorrectNetwork: boolean;
  networkHealth: 'healthy' | 'degraded' | 'down';

  // Application State
  notifications: Notification[];
  errors: ErrorInfo[];
  loadingStates: Record<string, boolean>;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCurrency: (currency: 'ETH' | 'USD') => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  addError: (error: ErrorInfo) => void;
  clearErrors: () => void;
  setLoading: (key: string, loading: boolean) => void;

  // Statistics
  stats?: AppStatistics;
  refreshStats: () => Promise<void>;
}

export interface Notification {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface BlockchainError extends Error {
  code?: number | string;
  data?: any;
  reason?: string;
  transaction?: {
    hash: Hash;
    from: Address;
    to: Address;
  };
  method?: string;
  args?: any[];
}

export interface ContractError extends BlockchainError {
  contractAddress?: Address;
  functionName?: string;
  errorSignature?: string;
}

export interface NetworkError extends Error {
  code: number;
  chainId?: number;
  rpcUrl?: string;
  isRetryable: boolean;
}

// ============================================================================
// Hook Configuration Types
// ============================================================================

export interface HookConfig {
  enabled?: boolean;
  retryCount?: number;
  retryDelay?: number;
  cacheTime?: number;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export interface AsyncHookConfig extends HookConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: ErrorInfo) => void;
  onSettled?: (data: any, error: ErrorInfo | null) => void;
}

export interface PollingHookConfig extends HookConfig {
  pollingInterval?: number;
  pauseOnWindowBlur?: boolean;
  pauseOnNetworkIdle?: boolean;
}