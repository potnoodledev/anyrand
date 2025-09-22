/**
 * Component Interface Contracts for Anyrand Frontend
 *
 * These interfaces define the expected props, events, and behaviors
 * for React components in the Anyrand contract interaction system.
 */

import { ReactNode } from 'react';
import { Address, Hash } from 'viem';
import {
  RandomnessRequest,
  RandomnessFulfillment,
  NetworkStatistics,
  UserActivity,
  SubmitRequestResult,
  FulfillRequestResult,
  ContractError,
  RequestQueryFilters,
  RequestFormData
} from './frontend-api';

// ============================================================================
// Layout Components
// ============================================================================

export interface DashboardLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  activeSection?: 'requests' | 'fulfill' | 'history' | 'stats';
  onSectionChange?: (section: string) => void;
}

export interface NavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  pendingRequestsCount?: number;
  userRequestsCount?: number;
}

// ============================================================================
// Request Submission Components
// ============================================================================

export interface RequestSubmissionFormProps {
  onSubmitSuccess?: (result: SubmitRequestResult) => void;
  onSubmitError?: (error: ContractError) => void;
  defaultValues?: Partial<RequestFormData>;
  disabled?: boolean;
  className?: string;
}

export interface RequestSubmissionFormState {
  deadline: string;
  callbackGasLimit: string;
  estimatedFee: bigint | null;
  isValid: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface FeeEstimatorProps {
  deadline: string;
  callbackGasLimit: string;
  onFeeUpdate: (fee: bigint | null) => void;
  onError: (error: ContractError | null) => void;
  className?: string;
}

export interface TransactionSimulatorProps {
  params: {
    deadline: bigint;
    callbackGasLimit: bigint;
  };
  onSimulationResult: (result: any) => void;
  trigger: boolean;
  disabled?: boolean;
}

// ============================================================================
// Request Display Components
// ============================================================================

export interface RequestListProps {
  filters?: RequestQueryFilters;
  pageSize?: number;
  showUserOnly?: boolean;
  onRequestClick?: (request: RandomnessRequest) => void;
  onRequestSelect?: (request: RandomnessRequest) => void;
  selectable?: boolean;
  className?: string;
}

export interface RequestListState {
  requests: RandomnessRequest[];
  loading: boolean;
  error: ContractError | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface RequestCardProps {
  request: RandomnessRequest;
  onClick?: (request: RandomnessRequest) => void;
  onSelect?: (request: RandomnessRequest) => void;
  selected?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export interface RequestDetailsProps {
  requestId: bigint;
  request?: RandomnessRequest;
  showFulfillButton?: boolean;
  onFulfillSuccess?: (result: FulfillRequestResult) => void;
  onFulfillError?: (error: ContractError) => void;
  className?: string;
}

export interface RequestStatusBadgeProps {
  status: number; // RequestStatus enum value
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// ============================================================================
// Request Fulfillment Components
// ============================================================================

export interface PendingRequestsListProps {
  onRequestSelect?: (request: RandomnessRequest) => void;
  onFulfillRequest?: (request: RandomnessRequest) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export interface FulfillmentFormProps {
  request: RandomnessRequest;
  onFulfillSuccess?: (result: FulfillRequestResult) => void;
  onFulfillError?: (error: ContractError) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface FulfillmentFormState {
  isSubmitting: boolean;
  error: ContractError | null;
  canFulfill: boolean;
  estimatedReward: bigint | null;
}

export interface OperatorDashboardProps {
  address: Address;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onFulfillRequest?: (request: RandomnessRequest) => void;
  className?: string;
}

// ============================================================================
// Historical Data Components
// ============================================================================

export interface RequestHistoryProps {
  filters?: RequestQueryFilters;
  showFilters?: boolean;
  pageSize?: number;
  onRequestClick?: (request: RandomnessRequest) => void;
  className?: string;
}

export interface RequestHistoryState {
  requests: RandomnessRequest[];
  loading: boolean;
  error: ContractError | null;
  filters: RequestQueryFilters;
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
  };
}

export interface HistoryFiltersProps {
  filters: RequestQueryFilters;
  onFiltersChange: (filters: RequestQueryFilters) => void;
  onClearFilters: () => void;
  disabled?: boolean;
  className?: string;
}

export interface FulfillmentHistoryProps {
  operatorAddress?: Address;
  pageSize?: number;
  onFulfillmentClick?: (fulfillment: RandomnessFulfillment) => void;
  className?: string;
}

// ============================================================================
// Statistics Components
// ============================================================================

export interface NetworkStatsProps {
  refreshInterval?: number;
  showDetailedBreakdown?: boolean;
  compact?: boolean;
  className?: string;
}

export interface NetworkStatsState {
  stats: NetworkStatistics | null;
  loading: boolean;
  error: ContractError | null;
  lastUpdated: Date | null;
}

export interface StatsCardProps {
  title: string;
  value: string | number | bigint;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
}

export interface UserActivityStatsProps {
  address: Address;
  showPrivateData?: boolean;
  refreshInterval?: number;
  compact?: boolean;
  className?: string;
}

export interface ActivityChartProps {
  data: UserActivity;
  timeRange?: '24h' | '7d' | '30d' | '90d';
  chartType?: 'requests' | 'fees' | 'fulfillments';
  className?: string;
}

// ============================================================================
// Transaction Components
// ============================================================================

export interface TransactionProgressProps {
  transactionHash: Hash;
  onConfirmed?: () => void;
  onFailed?: (error: string) => void;
  autoClose?: boolean;
  closeDelay?: number;
  className?: string;
}

export interface TransactionProgressState {
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  requiredConfirmations: number;
  error?: string;
  receipt?: any;
}

export interface TransactionListProps {
  address?: Address;
  transactionType?: 'all' | 'requests' | 'fulfillments';
  pageSize?: number;
  onTransactionClick?: (hash: Hash) => void;
  className?: string;
}

export interface TransactionLinkProps {
  hash: Hash;
  chainId: number;
  type?: 'hash' | 'block';
  truncate?: boolean;
  external?: boolean;
  className?: string;
}

// ============================================================================
// Utility Components
// ============================================================================

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
  disabled?: boolean;
  className?: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  overlay?: boolean;
  className?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  resetTrigger?: any;
}

export interface ErrorDisplayProps {
  error: ContractError;
  showRetry?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

// ============================================================================
// Form Components
// ============================================================================

export interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: 'text' | 'number' | 'date' | 'datetime-local';
  className?: string;
}

export interface FormButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Modal Components
// ============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  preventClose?: boolean;
  className?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  dangerous?: boolean;
  loading?: boolean;
}

export interface RequestDetailsModalProps {
  requestId: bigint | null;
  isOpen: boolean;
  onClose: () => void;
  onFulfill?: (request: RandomnessRequest) => void;
}

// ============================================================================
// Theme and Styling
// ============================================================================

export interface ThemeProps {
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export interface ResponsiveProps {
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  mobileOrder?: number;
  tabletOrder?: number;
  desktopOrder?: number;
}

// ============================================================================
// Accessibility Props
// ============================================================================

export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  role?: string;
  tabIndex?: number;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export type RequestEventHandler = (request: RandomnessRequest) => void;
export type FulfillmentEventHandler = (fulfillment: RandomnessFulfillment) => void;
export type TransactionEventHandler = (hash: Hash) => void;
export type ErrorEventHandler = (error: ContractError) => void;
export type SuccessEventHandler<T = any> = (result: T) => void;

// ============================================================================
// Component State Types
// ============================================================================

export interface ComponentLoadingState {
  loading: boolean;
  error: ContractError | null;
  lastUpdated: Date | null;
}

export interface ComponentPaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ComponentSortState<T = any> {
  sortBy: keyof T;
  sortDirection: 'asc' | 'desc';
}

export interface ComponentFilterState<T = any> {
  filters: T;
  hasActiveFilters: boolean;
}

// ============================================================================
// Testing Props
// ============================================================================

export interface TestProps {
  'data-testid'?: string;
  'data-test-loading'?: boolean;
  'data-test-error'?: boolean;
  'data-test-empty'?: boolean;
}