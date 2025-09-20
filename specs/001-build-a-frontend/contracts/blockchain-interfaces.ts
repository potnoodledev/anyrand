/**
 * Blockchain Integration Interfaces for Anyrand Frontend
 *
 * These interfaces define the contracts for interacting with Anyrand smart contracts,
 * ensuring type safety and consistent blockchain integration patterns.
 */

import { Address, Hash, Hex } from 'viem';

// ============================================================================
// Smart Contract Interfaces
// ============================================================================

export interface IAnyrandContract {
  // Core Functions
  requestRandomness(
    deadline: bigint,
    callbackGasLimit: bigint,
    options?: TransactionOptions
  ): Promise<TransactionResponse>;

  fulfillRandomness(
    requestId: bigint,
    requester: Address,
    pubKeyHash: Hex,
    round: bigint,
    callbackGasLimit: bigint,
    signature: [bigint, bigint],
    options?: TransactionOptions
  ): Promise<TransactionResponse>;

  // View Functions
  getRequestPrice(callbackGasLimit: bigint): Promise<[bigint, bigint]>;
  getRequestState(requestId: bigint): Promise<number>;
  maxCallbackGasLimit(): Promise<bigint>;
  maxDeadlineDelta(): Promise<bigint>;
  nextRequestId(): Promise<bigint>;
  currentBeaconPubKeyHash(): Promise<Hex>;

  // Configuration
  gasStation(): Promise<Address>;
  beacon(): Promise<Address>;
  owner(): Promise<Address>;

  // Events
  on(event: 'RandomnessRequested', listener: RandomnessRequestedListener): void;
  on(event: 'RandomnessFulfilled', listener: RandomnessFulfilledListener): void;
  on(event: 'RandomnessCallbackFailed', listener: RandomnessCallbackFailedListener): void;
  off(event: string, listener: Function): void;

  // Event Filters
  filters: {
    RandomnessRequested(
      requestId?: bigint,
      requester?: Address,
      pubKeyHash?: Hex
    ): EventFilter;
    RandomnessFulfilled(requestId?: bigint): EventFilter;
    RandomnessCallbackFailed(requestId?: bigint): EventFilter;
  };
}

export interface IDrandBeaconContract {
  // View Functions
  publicKey(): Promise<[bigint, bigint, bigint, bigint]>;
  genesisTimestamp(): Promise<bigint>;
  period(): Promise<bigint>;

  // Verification
  verify(
    round: bigint,
    signature: [bigint, bigint]
  ): Promise<boolean>;
}

export interface IGasStationContract {
  // Gas Price Calculation
  getEffectiveFeePerGas(callbackGasLimit: bigint): Promise<bigint>;
  baseFeeMultiplier(): Promise<bigint>;
  priorityFeeMultiplier(): Promise<bigint>;
}

// ============================================================================
// Event Interfaces
// ============================================================================

export interface RandomnessRequestedEvent {
  requestId: bigint;
  requester: Address;
  pubKeyHash: Hex;
  round: bigint;
  callbackGasLimit: bigint;
  feePaid: bigint;
  effectiveFeePerGas: bigint;
}

export interface RandomnessFulfilledEvent {
  requestId: bigint;
  randomness: bigint;
  callbackSuccess: boolean;
  actualGasUsed: bigint;
}

export interface RandomnessCallbackFailedEvent {
  requestId: bigint;
  retdata: Hex;
  gasLimit: bigint;
  actualGasUsed: bigint;
}

export type RandomnessRequestedListener = (
  requestId: bigint,
  requester: Address,
  pubKeyHash: Hex,
  round: bigint,
  callbackGasLimit: bigint,
  feePaid: bigint,
  effectiveFeePerGas: bigint,
  event: ContractEventLog
) => void;

export type RandomnessFulfilledListener = (
  requestId: bigint,
  randomness: bigint,
  callbackSuccess: boolean,
  actualGasUsed: bigint,
  event: ContractEventLog
) => void;

export type RandomnessCallbackFailedListener = (
  requestId: bigint,
  retdata: Hex,
  gasLimit: bigint,
  actualGasUsed: bigint,
  event: ContractEventLog
) => void;

// ============================================================================
// Transaction Interfaces
// ============================================================================

export interface TransactionOptions {
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

export interface TransactionResponse {
  hash: Hash;
  wait(confirmations?: number): Promise<TransactionReceipt>;
  from: Address;
  to: Address;
  value: bigint;
  gasLimit: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce: number;
  data: Hex;
  chainId: number;
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
  logs: ContractEventLog[];
  contractAddress?: Address;
}

export interface ContractEventLog {
  address: Address;
  topics: Hex[];
  data: Hex;
  blockNumber: number;
  transactionHash: Hash;
  transactionIndex: number;
  blockHash: Hash;
  logIndex: number;
  removed: boolean;
}

export interface EventFilter {
  address: Address;
  topics: (Hex | Hex[] | null)[];
  fromBlock?: number | 'latest';
  toBlock?: number | 'latest';
}

// ============================================================================
// Network Configuration Interfaces
// ============================================================================

export interface NetworkConfig {
  chainId: number;
  name: string;
  shortName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: ContractAddresses;
  features: NetworkFeatures;
}

export interface ContractAddresses {
  anyrand: Address;
  beacon: Address;
  gasStation: Address;
}

export interface NetworkFeatures {
  supportsEIP1559: boolean;
  averageBlockTime: number; // in seconds
  confirmationsRequired: number;
  gasMultiplier: number;
}

// ============================================================================
// ABI Interfaces
// ============================================================================

export interface ContractABI {
  anyrand: any[]; // Full Anyrand contract ABI
  beacon: any[]; // DrandBeacon contract ABI
  gasStation: any[]; // GasStation contract ABI
  erc20: any[]; // Standard ERC20 ABI
}

// ============================================================================
// Provider Interfaces
// ============================================================================

export interface BlockchainProvider {
  // Network Information
  getNetwork(): Promise<NetworkInfo>;
  getBlockNumber(): Promise<number>;
  getBlock(blockNumber: number): Promise<BlockInfo>;

  // Account Information
  getBalance(address: Address): Promise<bigint>;
  getTransactionCount(address: Address): Promise<number>;

  // Gas Information
  getGasPrice(): Promise<bigint>;
  getFeeData(): Promise<FeeData>;
  estimateGas(transaction: TransactionRequest): Promise<bigint>;

  // Transaction Methods
  sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
  waitForTransaction(hash: Hash, confirmations?: number): Promise<TransactionReceipt>;

  // Event Methods
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  once(event: string, listener: Function): void;

  // Contract Methods
  call(transaction: TransactionRequest): Promise<Hex>;
  getLogs(filter: EventFilter): Promise<ContractEventLog[]>;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  ensAddress?: Address;
}

export interface BlockInfo {
  number: number;
  hash: Hash;
  parentHash: Hash;
  timestamp: number;
  gasLimit: bigint;
  gasUsed: bigint;
  baseFeePerGas?: bigint;
  transactions: Hash[];
}

export interface FeeData {
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export interface TransactionRequest {
  to?: Address;
  from?: Address;
  value?: bigint;
  data?: Hex;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  type?: number;
  chainId?: number;
}

// ============================================================================
// Utility Interfaces
// ============================================================================

export interface ContractCallOptions {
  blockTag?: number | 'latest' | 'pending';
  from?: Address;
  gasLimit?: bigint;
  gasPrice?: bigint;
  value?: bigint;
}

export interface EventQueryOptions {
  fromBlock?: number | 'latest';
  toBlock?: number | 'latest';
  address?: Address | Address[];
  topics?: (Hex | Hex[] | null)[];
  limit?: number;
}

export interface BatchCallRequest {
  target: Address;
  allowFailure: boolean;
  callData: Hex;
}

export interface BatchCallResult {
  success: boolean;
  returnData: Hex;
}

// ============================================================================
// Error Interfaces
// ============================================================================

export interface ContractError extends Error {
  code: string;
  data?: Hex;
  reason?: string;
  method?: string;
  errorArgs?: any[];
  transaction?: TransactionRequest;
}

export interface NetworkError extends Error {
  code: number;
  data?: any;
  network?: string;
}

export interface TransactionError extends Error {
  code: string;
  hash?: Hash;
  receipt?: TransactionReceipt;
  reason?: string;
}

// ============================================================================
// Constants and Enums
// ============================================================================

export enum RequestState {
  Nonexistent = 0,
  Pending = 1,
  Fulfilled = 2,
  Failed = 3
}

export enum TransactionType {
  Legacy = 0,
  AccessList = 1,
  DynamicFee = 2
}

export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  SCROLL: 534352,
  SCROLL_SEPOLIA: 534351,
  BASE: 8453,
  BASE_SEPOLIA: 84532
} as const;

export const ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901
} as const;