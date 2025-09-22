/**
 * Frontend API Contracts for Anyrand Contract Interactions
 *
 * These interfaces define the contract between React components and
 * blockchain interaction hooks, ensuring type safety and consistency.
 */

import { Address, Hash, Hex } from 'viem'
import {
  RandomnessRequest,
  RandomnessFulfillment,
  RequestStatus,
  SubmitRequestParams,
  SubmitRequestResult,
  FulfillRequestParams,
  FulfillRequestResult
} from './randomness-request'
import { NetworkStatistics } from './network-statistics'
import { UserActivity } from './user-activity'

// ============================================================================
// Data Query API
// ============================================================================

export interface PaginatedQuery<T> {
  data: T[]
  totalItems: number
  currentPage: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export interface RequestQueryFilters {
  requester?: Address
  operator?: Address
  status?: RequestStatus[]
  fromTimestamp?: bigint
  toTimestamp?: bigint
  minFee?: bigint
  maxFee?: bigint
}

export interface RequestQueryParams {
  page: number
  pageSize: number
  filters?: RequestQueryFilters
  sortBy?: 'timestamp' | 'fee' | 'deadline'
  sortDirection?: 'asc' | 'desc'
}

// ============================================================================
// Hook Interfaces
// ============================================================================

export interface RequestSubmissionHook {
  submit: (params: SubmitRequestParams) => Promise<SubmitRequestResult>
  isLoading: boolean
  error: Error | null
  estimatedFee: bigint | null
  simulate: (params: SubmitRequestParams) => Promise<SimulationResult>
}

export interface RequestFulfillmentHook {
  fulfill: (params: FulfillRequestParams) => Promise<FulfillRequestResult>
  isLoading: boolean
  error: Error | null
  canFulfill: (requestId: bigint) => boolean
}

export interface RequestsQueryHook {
  requests: PaginatedQuery<RandomnessRequest>
  getRequest: (id: bigint) => RandomnessRequest | undefined
  getUserRequests: (address: Address) => PaginatedQuery<RandomnessRequest>
  getPendingRequests: () => PaginatedQuery<RandomnessRequest>
}

export interface StatisticsQueryHook {
  networkStats: NetworkStatistics | null
  userActivity: UserActivity | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// ============================================================================
// Contract Configuration API
// ============================================================================

export interface ContractConfig {
  anyrandAddress: Address
  beaconAddress: Address
  gasStationAddress: Address
  maxCallbackGasLimit: bigint
  maxDeadlineDelta: bigint
  minimumFee: bigint
  isDeployed: boolean
  chainId: number
}

export interface ConfigurationHook {
  config: ContractConfig | null
  isLoading: boolean
  error: Error | null
  isContractDeployed: boolean
  supportedChains: number[]
}

// ============================================================================
// Transaction and Simulation API
// ============================================================================

export interface SimulationResult {
  success: boolean
  gasEstimate: bigint
  revertReason?: string
  warnings: string[]
  feeBreakdown: FeeBreakdown
}

export interface FeeBreakdown {
  baseFee: bigint
  gasPrice: bigint
  callbackGasLimit: bigint
  totalFee: bigint
  operatorReward: bigint
  protocolFee: bigint
}

export interface TransactionStatus {
  hash: Hash
  status: 'pending' | 'confirmed' | 'failed'
  confirmations: number
  blockNumber?: bigint
  gasUsed?: bigint
  error?: string
}

export interface TransactionTrackingHook {
  trackTransaction: (hash: Hash) => TransactionStatus
  isWaiting: (hash: Hash) => boolean
  getReceipt: (hash: Hash) => any // Transaction receipt
}

// ============================================================================
// Error Handling API
// ============================================================================

export interface ContractError {
  code: string
  message: string
  details?: any
  userMessage: string
  retry?: () => void
}

export interface ErrorHandlingHook {
  parseError: (error: unknown) => ContractError
  isNetworkError: (error: unknown) => boolean
  isContractError: (error: unknown) => boolean
  isUserRejection: (error: unknown) => boolean
}

// ============================================================================
// Form Management API
// ============================================================================

export interface RequestFormData {
  deadline: string
  callbackGasLimit: string
}

export interface RequestFormState {
  data: RequestFormData
  errors: Partial<Record<keyof RequestFormData, string>>
  isValid: boolean
  isSubmitting: boolean
  estimatedFee: bigint | null
}

export interface RequestFormHook {
  formState: RequestFormState
  updateField: (field: keyof RequestFormData, value: string) => void
  validateForm: () => boolean
  submitForm: () => Promise<SubmitRequestResult>
  resetForm: () => void
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  state: LoadingState
  error: Error | null
}

export interface PaginationControls {
  currentPage: number
  totalPages: number
  pageSize: number
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  setPageSize: (size: number) => void
}

export interface SortControls<T> {
  sortBy: keyof T
  sortDirection: 'asc' | 'desc'
  setSortBy: (field: keyof T) => void
  toggleSortDirection: () => void
}

export interface FilterControls<T> {
  filters: T
  setFilter: <K extends keyof T>(field: K, value: T[K]) => void
  clearFilter: (field: keyof T) => void
  clearAllFilters: () => void
  hasActiveFilters: boolean
}