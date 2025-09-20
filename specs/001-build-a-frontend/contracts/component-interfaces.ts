/**
 * Component Prop Interfaces for Anyrand Frontend
 *
 * These interfaces define the contracts between React components,
 * ensuring type safety and consistent data flow throughout the application.
 */

import { Address } from 'viem';

// ============================================================================
// Core Data Types
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

export interface RandomnessRequest {
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
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface PendingRequest {
  requestId: bigint;
  requester: Address;
  deadline: number;
  round: bigint;
  callbackGasLimit: bigint;
  estimatedEarnings: bigint;
  timeUntilFulfillable: number;
  networkGasCost: bigint;
  profitMargin: bigint;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface WalletConnectButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onConnected?: (address: Address) => void;
  onDisconnected?: () => void;
}

export interface RandomnessRequestFormProps {
  onSubmit: (params: RequestParams) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export interface RequestParams {
  deadline: number;
  callbackGasLimit: number;
}

export interface RequestHistoryProps {
  requests: RandomnessRequest[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRequestSelect?: (request: RandomnessRequest) => void;
  className?: string;
}

export interface RequestCardProps {
  request: RandomnessRequest;
  onClick?: () => void;
  showDetails?: boolean;
  className?: string;
}

export interface PendingRequestsProps {
  requests: PendingRequest[];
  isLoading?: boolean;
  onFulfill: (requestId: bigint) => Promise<void>;
  className?: string;
}

export interface PendingRequestCardProps {
  request: PendingRequest;
  onFulfill: () => Promise<void>;
  isDisabled?: boolean;
  className?: string;
}

export interface TransactionStatusProps {
  hash: string;
  status: TransactionStatus;
  confirmations?: number;
  onStatusChange?: (status: TransactionStatus) => void;
  className?: string;
}

export interface PriceDisplayProps {
  amount: bigint;
  currency?: 'ETH' | 'USD';
  precision?: number;
  showUSD?: boolean;
  className?: string;
}

export interface NetworkStatusProps {
  chainId: number;
  isConnected: boolean;
  gasPrice?: bigint;
  blockNumber?: number;
  className?: string;
}

export interface DrandBeaconStatusProps {
  currentRound: bigint;
  nextRoundTime: number;
  isHealthy: boolean;
  className?: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// ============================================================================
// Form Interfaces
// ============================================================================

export interface RequestFormData {
  deadline: string; // ISO string for date input
  deadlineTime: string; // Time component
  callbackGasLimit: string;
  customDeadline: boolean;
}

export interface RequestFormValidation {
  deadline?: string;
  callbackGasLimit?: string;
  general?: string;
}

export interface FormState<T> {
  data: T;
  errors: Record<keyof T, string>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

// ============================================================================
// Modal and Dialog Interfaces
// ============================================================================

export interface RequestDetailsModalProps {
  request: RandomnessRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export interface TransactionModalProps {
  isOpen: boolean;
  transaction: {
    hash?: string;
    status: TransactionStatus;
    type: 'request' | 'fulfillment';
  };
  onClose: () => void;
}

// ============================================================================
// Table and List Interfaces
// ============================================================================

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export interface FilterBarProps {
  filters: FilterOption[];
  activeFilters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onClear: () => void;
  className?: string;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'range' | 'date';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
}

// ============================================================================
// Status and Indicator Interfaces
// ============================================================================

export interface StatusBadgeProps {
  status: RequestState | TransactionStatus;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'default';
  className?: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg';
  message?: string;
  className?: string;
}

export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export interface CountdownTimerProps {
  targetTime: number; // Unix timestamp
  onComplete?: () => void;
  format?: 'full' | 'compact';
  className?: string;
}

// ============================================================================
// Navigation and Layout Interfaces
// ============================================================================

export interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

// ============================================================================
// Utility Interfaces
// ============================================================================

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface CopyToClipboardProps {
  value: string;
  children: React.ReactNode;
  onCopy?: () => void;
  className?: string;
}

export interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export type RequestSubmitHandler = (params: RequestParams) => Promise<void>;
export type FulfillmentHandler = (requestId: bigint) => Promise<void>;
export type TransactionHandler = (hash: string) => void;
export type ErrorHandler = (error: Error) => void;
export type FilterChangeHandler = (filters: Record<string, any>) => void;