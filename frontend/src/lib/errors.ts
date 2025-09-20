/**
 * Blockchain Error Handling Utilities
 *
 * This module provides comprehensive error handling for blockchain interactions,
 * contract calls, and wallet operations. It includes error classification,
 * user-friendly error messages, and recovery strategies.
 */

import { Address, Hash, Hex } from 'viem';
import {
  ContractError,
  NetworkError,
  TransactionError,
  ProviderError,
  ERROR_CODES,
} from '../types/blockchain';
import { ErrorInfo, ErrorSeverity, ErrorCategory } from '../types/entities';

// ============================================================================
// Error Classification
// ============================================================================

export function classifyError(error: unknown): ErrorInfo {
  const timestamp = new Date().toISOString();

  // Convert error to object with type property for better classification
  const errorObj = {
    message: error instanceof Error ? error.message : String(error),
    type: 'unknown' as 'network' | 'validation' | 'permission' | 'contract' | 'timeout' | 'unknown',
    retryable: true,
    userMessage: '',
  };

  // Determine error type based on patterns
  if (isNetworkError(error)) {
    errorObj.type = 'network';
    errorObj.retryable = true;
  } else if (isUserRejectionError(error) || isInsufficientFundsError(error)) {
    errorObj.type = 'validation';
    errorObj.retryable = false;
  } else if (isContractExecutionError(error)) {
    errorObj.type = 'contract';
    errorObj.retryable = true;
  } else if (isGasEstimationError(error)) {
    errorObj.type = 'timeout';
    errorObj.retryable = true;
  }

  // Handle contract execution errors
  if (isContractExecutionError(error)) {
    return {
      code: 'CONTRACT_EXECUTION_ERROR',
      message: extractContractErrorMessage(error),
      category: ErrorCategory.CONTRACT,
      severity: ErrorSeverity.HIGH,
      timestamp,
      userMessage: 'Transaction failed. Please check your inputs and try again.',
      technicalDetails: extractTechnicalDetails(error),
      recoverable: true,
      suggestedAction: 'Verify transaction parameters and gas settings',
    };
  }

  // Handle user rejection errors
  if (isUserRejectionError(error)) {
    return {
      code: 'USER_REJECTED',
      message: 'User rejected the transaction',
      category: ErrorCategory.USER,
      severity: ErrorSeverity.LOW,
      timestamp,
      userMessage: 'Transaction was cancelled by user.',
      technicalDetails: null,
      recoverable: true,
      suggestedAction: 'Try again and approve the transaction in your wallet',
    };
  }

  // Handle insufficient funds errors
  if (isInsufficientFundsError(error)) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds for transaction',
      category: ErrorCategory.WALLET,
      severity: ErrorSeverity.HIGH,
      timestamp,
      userMessage: 'You don\'t have enough funds to complete this transaction.',
      technicalDetails: extractBalanceInfo(error),
      recoverable: true,
      suggestedAction: 'Add more funds to your wallet or reduce the transaction amount',
    };
  }

  // Handle network connection errors
  if (isNetworkError(error)) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      timestamp,
      userMessage: 'Unable to connect to the blockchain network.',
      technicalDetails: extractNetworkInfo(error),
      recoverable: true,
      suggestedAction: 'Check your internet connection and try again',
    };
  }

  // Handle gas estimation errors
  if (isGasEstimationError(error)) {
    return {
      code: 'GAS_ESTIMATION_ERROR',
      message: 'Failed to estimate gas for transaction',
      category: ErrorCategory.GAS,
      severity: ErrorSeverity.MEDIUM,
      timestamp,
      userMessage: 'Unable to estimate transaction cost.',
      technicalDetails: extractGasInfo(error),
      recoverable: true,
      suggestedAction: 'Try setting a custom gas limit or check transaction parameters',
    };
  }

  // Handle contract not found errors
  if (isContractNotFoundError(error)) {
    return {
      code: 'CONTRACT_NOT_FOUND',
      message: 'Smart contract not found',
      category: ErrorCategory.CONTRACT,
      severity: ErrorSeverity.HIGH,
      timestamp,
      userMessage: 'The smart contract could not be found on this network.',
      technicalDetails: extractContractInfo(error),
      recoverable: false,
      suggestedAction: 'Verify you are connected to the correct network',
    };
  }

  // Handle wallet connection errors
  if (isWalletConnectionError(error)) {
    return {
      code: 'WALLET_CONNECTION_ERROR',
      message: 'Wallet connection failed',
      category: ErrorCategory.WALLET,
      severity: ErrorSeverity.HIGH,
      timestamp,
      userMessage: 'Unable to connect to your wallet.',
      technicalDetails: extractWalletInfo(error),
      recoverable: true,
      suggestedAction: 'Check that your wallet is unlocked and try reconnecting',
    };
  }

  // Handle chain mismatch errors
  if (isChainMismatchError(error)) {
    return {
      code: 'CHAIN_MISMATCH',
      message: 'Connected to wrong network',
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      timestamp,
      userMessage: 'You are connected to the wrong network.',
      technicalDetails: extractChainInfo(error),
      recoverable: true,
      suggestedAction: 'Switch to the correct network in your wallet',
    };
  }

  // Handle deadline exceeded errors
  if (isDeadlineExceededError(error)) {
    return {
      code: 'DEADLINE_EXCEEDED',
      message: 'Request deadline has been exceeded',
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      timestamp,
      userMessage: 'The request deadline has passed.',
      technicalDetails: extractDeadlineInfo(error),
      recoverable: true,
      suggestedAction: 'Create a new request with a future deadline',
    };
  }

  // Handle rate limiting errors
  if (isRateLimitError(error)) {
    return {
      code: 'RATE_LIMITED',
      message: 'Request rate limit exceeded',
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      timestamp,
      userMessage: 'Too many requests. Please wait before trying again.',
      technicalDetails: extractRateLimitInfo(error),
      recoverable: true,
      suggestedAction: 'Wait a few moments and try again',
    };
  }

  // Default to generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    timestamp,
    userMessage: 'An unexpected error occurred.',
    technicalDetails: error instanceof Error ? error.stack || null : null,
    recoverable: true,
    suggestedAction: 'Please try again or contact support if the problem persists',
  };
}

// ============================================================================
// Error Type Guards
// ============================================================================

function isContractExecutionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('execution reverted') ||
    message.includes('revert') ||
    message.includes('invalid opcode') ||
    message.includes('out of gas') ||
    message.includes('stack underflow') ||
    message.includes('invalid jump')
  );
}

function isUserRejectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('cancelled by user') ||
    message.includes('user cancelled') ||
    message.includes('transaction rejected')
  );
}

function isInsufficientFundsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance') ||
    message.includes('not enough funds') ||
    message.includes('insufficient ether')
  );
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('network error') ||
    message.includes('connection error') ||
    message.includes('timeout') ||
    message.includes('network request failed') ||
    message.includes('fetch failed')
  );
}

function isGasEstimationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('gas estimation') ||
    message.includes('gas limit') ||
    message.includes('gas price') ||
    message.includes('intrinsic gas too low')
  );
}

function isContractNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('contract not deployed') ||
    message.includes('no code at address') ||
    message.includes('contract does not exist') ||
    message.includes('invalid contract address')
  );
}

function isWalletConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('wallet not connected') ||
    message.includes('no provider') ||
    message.includes('provider not found') ||
    message.includes('wallet connection failed')
  );
}

function isChainMismatchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('wrong network') ||
    message.includes('chain mismatch') ||
    message.includes('unsupported chain') ||
    message.includes('incorrect chain')
  );
}

function isDeadlineExceededError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('deadline exceeded') ||
    message.includes('request expired') ||
    message.includes('deadline passed')
  );
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('request limit exceeded')
  );
}

// ============================================================================
// Error Message Extraction
// ============================================================================

function extractContractErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown contract error';

  // Try to extract revert reason
  const message = error.message;
  const revertMatch = message.match(/revert (.+?)(?:\n|$)/i);
  if (revertMatch) {
    return revertMatch[1].trim();
  }

  // Try to extract error signature
  const errorMatch = message.match(/Error\((.+?)\)/);
  if (errorMatch) {
    return errorMatch[1].trim();
  }

  return message;
}

function extractTechnicalDetails(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  return error.stack || error.message;
}

function extractBalanceInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const message = error.message;
  const balanceMatch = message.match(/balance:\s*(\d+)/i);
  if (balanceMatch) {
    return `Current balance: ${balanceMatch[1]}`;
  }

  return null;
}

function extractNetworkInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  return `Network error: ${error.message}`;
}

function extractGasInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const message = error.message;
  const gasMatch = message.match(/gas:\s*(\d+)/i);
  if (gasMatch) {
    return `Gas estimation: ${gasMatch[1]}`;
  }

  return null;
}

function extractContractInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const message = error.message;
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
  if (addressMatch) {
    return `Contract address: ${addressMatch[0]}`;
  }

  return null;
}

function extractWalletInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  return `Wallet error: ${error.message}`;
}

function extractChainInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const message = error.message;
  const chainMatch = message.match(/chain(?:\s+id)?:\s*(\d+)/i);
  if (chainMatch) {
    return `Chain ID: ${chainMatch[1]}`;
  }

  return null;
}

function extractDeadlineInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const message = error.message;
  const deadlineMatch = message.match(/deadline:\s*(\d+)/i);
  if (deadlineMatch) {
    const deadline = new Date(parseInt(deadlineMatch[1]) * 1000);
    return `Deadline: ${deadline.toISOString()}`;
  }

  return null;
}

function extractRateLimitInfo(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const message = error.message;
  const retryMatch = message.match(/retry(?:\s+after)?:\s*(\d+)/i);
  if (retryMatch) {
    return `Retry after: ${retryMatch[1]} seconds`;
  }

  return null;
}

// ============================================================================
// Error Recovery Strategies
// ============================================================================

export interface RecoveryStrategy {
  canRecover: boolean;
  action: string;
  automaticRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export function getRecoveryStrategy(errorInfo: ErrorInfo): RecoveryStrategy {
  switch (errorInfo.code) {
    case 'USER_REJECTED':
      return {
        canRecover: true,
        action: 'Retry transaction',
        automaticRetry: false,
      };

    case 'INSUFFICIENT_FUNDS':
      return {
        canRecover: true,
        action: 'Add funds or reduce amount',
        automaticRetry: false,
      };

    case 'NETWORK_ERROR':
      return {
        canRecover: true,
        action: 'Retry connection',
        automaticRetry: true,
        retryDelay: 2000,
        maxRetries: 3,
      };

    case 'GAS_ESTIMATION_ERROR':
      return {
        canRecover: true,
        action: 'Adjust gas settings',
        automaticRetry: false,
      };

    case 'CONTRACT_NOT_FOUND':
      return {
        canRecover: false,
        action: 'Verify network and contract address',
        automaticRetry: false,
      };

    case 'WALLET_CONNECTION_ERROR':
      return {
        canRecover: true,
        action: 'Reconnect wallet',
        automaticRetry: false,
      };

    case 'CHAIN_MISMATCH':
      return {
        canRecover: true,
        action: 'Switch network',
        automaticRetry: false,
      };

    case 'DEADLINE_EXCEEDED':
      return {
        canRecover: true,
        action: 'Create new request',
        automaticRetry: false,
      };

    case 'RATE_LIMITED':
      return {
        canRecover: true,
        action: 'Wait and retry',
        automaticRetry: true,
        retryDelay: 5000,
        maxRetries: 2,
      };

    default:
      return {
        canRecover: true,
        action: 'Retry operation',
        automaticRetry: false,
      };
  }
}

// ============================================================================
// Error Logging and Reporting
// ============================================================================

export interface ErrorReport {
  errorId: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  walletAddress?: Address;
  chainId?: number;
  transactionHash?: Hash;
  errorInfo: ErrorInfo;
  context?: Record<string, any>;
}

export function createErrorReport(
  errorInfo: ErrorInfo,
  context?: {
    userId?: string;
    walletAddress?: Address;
    chainId?: number;
    transactionHash?: Hash;
    additionalContext?: Record<string, any>;
  }
): ErrorReport {
  return {
    errorId: generateErrorId(),
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    userId: context?.userId,
    walletAddress: context?.walletAddress,
    chainId: context?.chainId,
    transactionHash: context?.transactionHash,
    errorInfo,
    context: context?.additionalContext,
  };
}

function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Error Utilities
// ============================================================================

export function isRetryableError(errorInfo: ErrorInfo): boolean {
  const nonRetryableCodes = [
    'USER_REJECTED',
    'INSUFFICIENT_FUNDS',
    'CONTRACT_NOT_FOUND',
    'DEADLINE_EXCEEDED',
  ];

  return !nonRetryableCodes.includes(errorInfo.code);
}

export function shouldShowToUser(errorInfo: ErrorInfo): boolean {
  return errorInfo.severity !== ErrorSeverity.LOW;
}

export function formatErrorForDisplay(errorInfo: ErrorInfo): string {
  if (errorInfo.userMessage) {
    return errorInfo.userMessage;
  }

  return errorInfo.message;
}

export function createContractError(
  message: string,
  contractAddress: Address,
  method?: string,
  data?: Hex
): ContractError {
  const error = new Error(message) as ContractError;
  error.contractAddress = contractAddress;
  error.method = method;
  error.data = data;
  return error;
}

export function createNetworkError(
  message: string,
  chainId: number,
  code: number
): NetworkError {
  const error = new Error(message) as NetworkError;
  error.chainId = chainId;
  error.code = code;
  return error;
}

export function createTransactionError(
  message: string,
  hash?: Hash,
  code?: string | number
): TransactionError {
  const error = new Error(message) as TransactionError;
  error.hash = hash;
  error.code = code || 'TRANSACTION_ERROR';
  return error;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_RETRY_DELAY = 1000;
export const DEFAULT_MAX_RETRIES = 3;
export const ERROR_DISPLAY_DURATION = 5000;

// ============================================================================
// Type Exports
// ============================================================================

export type { ErrorReport, RecoveryStrategy };