/**
 * Frontend API Contracts for Anyrand Contract Interactions
 *
 * These interfaces define the contract between React components and
 * blockchain interaction hooks, ensuring type safety and consistency.
 */

import { Address, Hash, Hex } from 'viem';

// ============================================================================
// Core Data Types
// ============================================================================

export enum RequestStatus {
  Nonexistent = 0,
  Pending = 1,
  Fulfilled = 2,
  Failed = 3
}

export interface RandomnessRequest {
  id: bigint;
  requester: Address;
  deadline: bigint;
  callbackGasLimit: bigint;
  feePaid: bigint;
  effectiveFeePerGas: bigint;
  status: RequestStatus;
  transactionHash: Hash;
  blockNumber: bigint;
  timestamp: bigint;
  pubKeyHash: Hex;
  fulfillment?: RandomnessFulfillment;
}

export interface RandomnessFulfillment {
  requestId: bigint;
  randomness: bigint;
  operator: Address;
  callbackSuccess: boolean;
  actualGasUsed: bigint;
  transactionHash: Hash;
  blockNumber: bigint;
  timestamp: bigint;
  round: bigint;
  signature: [bigint, bigint];
}

export interface NetworkStatistics {
  totalRequests: bigint;
  pendingRequests: bigint;
  fulfilledRequests: bigint;
  failedRequests: bigint;
  successRate: number;
  averageFulfillmentTime: number;
  totalFeesCollected: bigint;
  activeOperators: number;
  lastUpdated: bigint;
}

export interface UserActivity {
  address: Address;
  requestsSubmitted: bigint;
  requestsFulfilled: bigint;
  totalFeesSpent: bigint;
  totalFeesEarned: bigint;
  averageRequestValue: bigint;
  firstActivityTimestamp: bigint;
  lastActivityTimestamp: bigint;
}

// ============================================================================
// Request Submission API
// ============================================================================

export interface SubmitRequestParams {
  deadline: bigint;
  callbackGasLimit: bigint;
}

export interface SubmitRequestResult {
  transactionHash: Hash;
  requestId: bigint;
}

export interface RequestSubmissionHook {
  submit: (params: SubmitRequestParams) => Promise<SubmitRequestResult>;
  isLoading: boolean;
  error: Error | null;
  estimatedFee: bigint | null;
  simulate: (params: SubmitRequestParams) => Promise<SimulationResult>;
}

export interface SimulationResult {
  success: boolean;
  gasEstimate: bigint;
  revertReason?: string;
  warnings: string[];
  feeBreakdown: FeeBreakdown;
}

export interface FeeBreakdown {
  baseFee: bigint;
  gasPrice: bigint;
  callbackGasLimit: bigint;
  totalFee: bigint;
  operatorReward: bigint;
  protocolFee: bigint;
}

// ============================================================================
// Request Fulfillment API
// ============================================================================

export interface FulfillRequestParams {
  requestId: bigint;
  requester: Address;
  pubKeyHash: Hex;
  round: bigint;
  callbackGasLimit: bigint;
  signature: [bigint, bigint];
}

export interface FulfillRequestResult {
  transactionHash: Hash;
  randomness: bigint;
}

export interface RequestFulfillmentHook {
  fulfill: (params: FulfillRequestParams) => Promise<FulfillRequestResult>;
  isLoading: boolean;
  error: Error | null;
  canFulfill: (requestId: bigint) => boolean;
}

// ============================================================================
// Data Query API
// ============================================================================

export interface PaginatedQuery<T> {
  data: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface RequestQueryFilters {
  requester?: Address;
  operator?: Address;
  status?: RequestStatus[];
  fromTimestamp?: bigint;
  toTimestamp?: bigint;
  minFee?: bigint;
  maxFee?: bigint;
}

export interface RequestQueryParams {
  page: number;
  pageSize: number;
  filters?: RequestQueryFilters;
  sortBy?: 'timestamp' | 'fee' | 'deadline';
  sortDirection?: 'asc' | 'desc';
}

export interface RequestsQueryHook {
  requests: PaginatedQuery<RandomnessRequest>;
  getRequest: (id: bigint) => RandomnessRequest | undefined;
  getUserRequests: (address: Address) => PaginatedQuery<RandomnessRequest>;
  getPendingRequests: () => PaginatedQuery<RandomnessRequest>;
}

// ============================================================================
// Statistics API
// ============================================================================

export interface StatisticsQueryHook {
  networkStats: NetworkStatistics | null;
  userActivity: UserActivity | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Contract Configuration API
// ============================================================================

export interface ContractConfig {
  anyrandAddress: Address;
  beaconAddress: Address;
  gasStationAddress: Address;
  maxCallbackGasLimit: bigint;
  maxDeadlineDelta: bigint;
  minimumFee: bigint;
  isDeployed: boolean;
  chainId: number;
}

export interface ConfigurationHook {
  config: ContractConfig | null;
  isLoading: boolean;
  error: Error | null;
  isContractDeployed: boolean;
  supportedChains: number[];
}

// ============================================================================
// Transaction Tracking API
// ============================================================================

export interface TransactionStatus {
  hash: Hash;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: bigint;
  gasUsed?: bigint;
  error?: string;
}

export interface TransactionTrackingHook {
  trackTransaction: (hash: Hash) => TransactionStatus;
  isWaiting: (hash: Hash) => boolean;
  getReceipt: (hash: Hash) => any; // Transaction receipt
}

// ============================================================================
// Event Listening API
// ============================================================================

export interface ContractEvent {
  eventName: string;
  args: any;
  transactionHash: Hash;
  blockNumber: bigint;
  logIndex: number;
}

export interface EventListenerHook {
  events: ContractEvent[];
  subscribe: (eventName: string, callback: (event: ContractEvent) => void) => void;
  unsubscribe: (eventName: string) => void;
  clearEvents: () => void;
}

// ============================================================================
// Form Management API
// ============================================================================

export interface RequestFormData {
  deadline: string;
  callbackGasLimit: string;
}

export interface RequestFormState {
  data: RequestFormData;
  errors: Partial<Record<keyof RequestFormData, string>>;
  isValid: boolean;
  isSubmitting: boolean;
  estimatedFee: bigint | null;
}

export interface RequestFormHook {
  formState: RequestFormState;
  updateField: (field: keyof RequestFormData, value: string) => void;
  validateForm: () => boolean;
  submitForm: () => Promise<SubmitRequestResult>;
  resetForm: () => void;
}

// ============================================================================
// Error Handling API
// ============================================================================

export interface ContractError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
  retry?: () => void;
}

export interface ErrorHandlingHook {
  parseError: (error: unknown) => ContractError;
  isNetworkError: (error: unknown) => boolean;
  isContractError: (error: unknown) => boolean;
  isUserRejection: (error: unknown) => boolean;
}

// ============================================================================
// Component Props API
// ============================================================================

export interface RequestFormProps {
  onSubmitSuccess?: (result: SubmitRequestResult) => void;
  onSubmitError?: (error: ContractError) => void;
  defaultValues?: Partial<RequestFormData>;
  disabled?: boolean;
}

export interface RequestListProps {
  filters?: RequestQueryFilters;
  pageSize?: number;
  showUserOnly?: boolean;
  onRequestClick?: (request: RandomnessRequest) => void;
}

export interface RequestDetailsProps {
  requestId: bigint;
  showFulfillButton?: boolean;
  onFulfillSuccess?: (result: FulfillRequestResult) => void;
}

export interface NetworkStatsProps {
  refreshInterval?: number;
  showDetailedBreakdown?: boolean;
}

export interface UserActivityProps {
  address: Address;
  showPrivateData?: boolean;
  refreshInterval?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  state: LoadingState;
  error: Error | null;
}

export interface PaginationControls {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

export interface SortControls<T> {
  sortBy: keyof T;
  sortDirection: 'asc' | 'desc';
  setSortBy: (field: keyof T) => void;
  toggleSortDirection: () => void;
}

export interface FilterControls<T> {
  filters: T;
  setFilter: <K extends keyof T>(field: K, value: T[K]) => void;
  clearFilter: (field: keyof T) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}