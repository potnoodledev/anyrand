/**
 * Component Prop Interfaces for Anyrand Frontend
 *
 * These interfaces define the contracts between React components,
 * ensuring type safety and consistent data flow throughout the application.
 */

import { ReactNode, ComponentProps } from 'react';
import { Address } from 'viem';
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
} from './entities';

// ============================================================================
// Base Component Props
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

export interface LoadingComponentProps extends BaseComponentProps {
  isLoading?: boolean;
  loadingText?: string;
  error?: ErrorInfo;
  onRetry?: () => void;
}

// ============================================================================
// Wallet Component Props
// ============================================================================

export interface WalletConnectButtonProps extends BaseComponentProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg';
  onConnected?: (address: Address) => void;
  onDisconnected?: () => void;
  onError?: (error: ErrorInfo) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export interface WalletInfoProps extends BaseComponentProps {
  address: Address;
  balance?: string;
  ensName?: string;
  chainId: number;
  isConnected: boolean;
  showBalance?: boolean;
  showEnsName?: boolean;
  showChainId?: boolean;
  onDisconnect?: () => void;
  compact?: boolean;
}

export interface NetworkSwitchProps extends BaseComponentProps {
  currentChainId: number;
  supportedChainIds: number[];
  onSwitchNetwork?: (chainId: number) => Promise<void>;
  showTestnets?: boolean;
  disabled?: boolean;
}

// ============================================================================
// Form Component Props
// ============================================================================

export interface RandomnessRequestFormProps extends BaseComponentProps {
  onSubmit?: (data: RequestFormData, hash: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  initialValues?: Partial<RequestFormData>;
  showAdvanced?: boolean;
  maxGasLimit?: number;
  minDeadline?: number;
  onPriceUpdate?: (price: PriceEstimate) => void;
}

export interface RequestFormData {
  deadline: number; // Unix timestamp
  callbackGasLimit: number;
  customGasPrice?: number;
  priorityFee?: number;
}

export interface FormFieldProps extends BaseComponentProps {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
}

export interface NumericInputProps extends FormFieldProps {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

export interface DateTimeInputProps extends FormFieldProps {
  value: number; // Unix timestamp
  onChange: (value: number) => void;
  minDate?: number;
  maxDate?: number;
  showTime?: boolean;
}

// ============================================================================
// Request Display Components
// ============================================================================

export interface RequestHistoryProps extends BaseComponentProps {
  requests: RandomnessRequest[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onRequestSelect?: (request: RandomnessRequest) => void;
  filters?: FilterOptions;
  onFiltersChange?: (filters: FilterOptions) => void;
  showFilters?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
}

export interface RequestCardProps extends BaseComponentProps {
  request: RandomnessRequest;
  onClick?: () => void;
  showDetails?: boolean;
  isSelected?: boolean;
  actions?: RequestCardAction[];
  compact?: boolean;
}

export interface RequestCardAction {
  label: string;
  onClick: (request: RandomnessRequest) => void;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export interface RequestDetailsModalProps extends BaseComponentProps {
  request: RandomnessRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, request: RandomnessRequest) => void;
  showRawData?: boolean;
}

// ============================================================================
// Pending Requests Components
// ============================================================================

export interface PendingRequestsProps extends BaseComponentProps {
  requests: PendingRequest[];
  isLoading?: boolean;
  onFulfill: (requestId: bigint) => Promise<FulfillmentResult>;
  onRefresh?: () => Promise<void>;
  sortBy?: 'earnings' | 'deadline' | 'profit' | 'risk';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, order: 'asc' | 'desc') => void;
  filters?: PendingRequestFilters;
  onFiltersChange?: (filters: PendingRequestFilters) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface PendingRequestCardProps extends BaseComponentProps {
  request: PendingRequest;
  onFulfill: (requestId: bigint) => Promise<FulfillmentResult>;
  isDisabled?: boolean;
  isFulfilling?: boolean;
  showRiskIndicator?: boolean;
  showProfitability?: boolean;
  onError?: (error: ErrorInfo) => void;
}

export interface PendingRequestFilters {
  minEarnings?: bigint;
  maxRisk?: 'low' | 'medium' | 'high';
  timeFrame?: number; // Hours until fulfillable
  minProfitMargin?: bigint;
  readyOnly?: boolean;
}

export interface FulfillmentResult {
  transactionHash: string;
  requestId: bigint;
  earnings: bigint;
  gasUsed?: bigint;
}

// ============================================================================
// Transaction Components
// ============================================================================

export interface TransactionStatusProps extends BaseComponentProps {
  hash: string;
  status: TransactionStatus;
  confirmations?: number;
  targetConfirmations?: number;
  onStatusChange?: (status: TransactionStatus) => void;
  showProgress?: boolean;
  showDetails?: boolean;
  autoUpdate?: boolean;
}

export interface TransactionHistoryProps extends BaseComponentProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onTransactionSelect?: (transaction: Transaction) => void;
  filters?: TransactionFilters;
  onFiltersChange?: (filters: TransactionFilters) => void;
  groupByDate?: boolean;
  showValue?: boolean;
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
}

export interface TransactionModalProps extends BaseComponentProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (transaction: Transaction) => void;
  showRawData?: boolean;
}

// ============================================================================
// Display Components
// ============================================================================

export interface PriceDisplayProps extends BaseComponentProps {
  amount: bigint;
  currency?: 'ETH' | 'USD';
  precision?: number;
  showUSD?: boolean;
  showSymbol?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  loading?: boolean;
}

export interface StatusBadgeProps extends BaseComponentProps {
  status: RequestState | TransactionStatus | string;
  variant?: 'default' | 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
}

export interface CountdownTimerProps extends BaseComponentProps {
  targetTime: number; // Unix timestamp
  onComplete?: () => void;
  format?: 'full' | 'compact' | 'relative';
  showIcon?: boolean;
  showSeconds?: boolean;
  precision?: 'seconds' | 'minutes' | 'hours';
}

export interface ProgressBarProps extends BaseComponentProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  overlay?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
}

// ============================================================================
// Layout Components
// ============================================================================

export interface PageHeaderProps extends BaseComponentProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showBack?: boolean;
  onBack?: () => void;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

export interface NavigationProps extends BaseComponentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: NavigationTab[];
  variant?: 'tabs' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export interface NavigationTab {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: string | number;
  href?: string;
}

export interface SidebarProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  overlay?: boolean;
  persistent?: boolean;
  width?: string;
  title?: string;
}

// ============================================================================
// Data Display Components
// ============================================================================

export interface DataTableProps<T> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectedRows?: T[];
  onSelectionChange?: (selected: T[]) => void;
  sortable?: boolean;
  searchable?: boolean;
  pagination?: boolean;
  pageSize?: number;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

export interface FilterBarProps extends BaseComponentProps {
  filters: FilterOption[];
  activeFilters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onClear: () => void;
  showClearAll?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'range' | 'date' | 'toggle' | 'search';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  placeholder?: string;
  multiple?: boolean;
}

export interface PaginationProps extends BaseComponentProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showInfo?: boolean;
  showSizeSelector?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

// ============================================================================
// Modal and Dialog Components
// ============================================================================

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
}

export interface ConfirmationDialogProps extends BaseComponentProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
}

export interface AlertDialogProps extends BaseComponentProps {
  isOpen: boolean;
  title: string;
  description: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
  onClose: () => void;
  actions?: AlertAction[];
  autoClose?: number; // Auto close after X milliseconds
}

export interface AlertAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'destructive';
  disabled?: boolean;
}

// ============================================================================
// Utility Components
// ============================================================================

export interface CopyToClipboardProps extends BaseComponentProps {
  value: string;
  children?: ReactNode;
  onCopy?: () => void;
  showIcon?: boolean;
  successMessage?: string;
  timeout?: number;
}

export interface ExternalLinkProps extends ComponentProps<'a'> {
  href: string;
  children: ReactNode;
  showIcon?: boolean;
  iconPosition?: 'left' | 'right';
  openInNewTab?: boolean;
}

export interface TooltipProps extends BaseComponentProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  arrow?: boolean;
}

export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  hasError: boolean;
}

// ============================================================================
// Network and Blockchain Components
// ============================================================================

export interface NetworkStatusProps extends BaseComponentProps {
  chainId: number;
  isConnected: boolean;
  gasPrice?: bigint;
  blockNumber?: number;
  isHealthy?: boolean;
  onNetworkSwitch?: (chainId: number) => void;
  showDetails?: boolean;
  compact?: boolean;
}

export interface DrandBeaconStatusProps extends BaseComponentProps {
  beacon: DrandRound;
  showDetails?: boolean;
  onRefresh?: () => void;
  autoRefresh?: boolean;
}

export interface GasPriceIndicatorProps extends BaseComponentProps {
  gasPrice: bigint;
  chainId: number;
  showTrend?: boolean;
  showRecommendation?: boolean;
  onGasPriceSelect?: (gasPrice: bigint) => void;
  recommendations?: GasPriceRecommendation[];
}

export interface GasPriceRecommendation {
  label: string;
  gasPrice: bigint;
  estimatedTime: number; // seconds
  probability: number; // 0-1
}

// ============================================================================
// Settings and Preferences Components
// ============================================================================

export interface SettingsFormProps extends BaseComponentProps {
  preferences: UserPreferences;
  onSave: (preferences: UserPreferences) => Promise<void>;
  onReset: () => void;
  isLoading?: boolean;
  isDirty?: boolean;
  showAdvanced?: boolean;
}

export interface ThemeSwitcherProps extends BaseComponentProps {
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  showIcon?: boolean;
  showLabel?: boolean;
  variant?: 'button' | 'select' | 'toggle';
}

// ============================================================================
// Event Handler Types
// ============================================================================

export type RequestSubmitHandler = (params: RequestFormData) => Promise<void>;
export type FulfillmentHandler = (requestId: bigint) => Promise<FulfillmentResult>;
export type TransactionHandler = (hash: string) => void;
export type ErrorHandler = (error: ErrorInfo) => void;
export type FilterChangeHandler = (filters: Record<string, any>) => void;
export type SortChangeHandler = (sortBy: string, order: 'asc' | 'desc') => void;
export type PaginationHandler = (page: number, pageSize?: number) => void;
export type SelectionHandler<T> = (selected: T[]) => void;

// ============================================================================
// Compound Component Types
// ============================================================================

export interface ComponentType<P = {}> {
  (props: P): ReactNode;
  displayName?: string;
}