/**
 * Blockchain Integration Types for Anyrand Frontend
 *
 * These types define the interfaces for interacting with Anyrand smart contracts,
 * blockchain providers, and related Web3 infrastructure.
 */

import { Address, Hash, Hex, PublicClient, WalletClient } from 'viem';
import { RequestState, TransactionStatus, ErrorInfo } from './entities';

// ============================================================================
// Smart Contract Interfaces
// ============================================================================

export interface IAnyrandContract {
  // Core Functions
  requestRandomness(
    deadline: bigint,
    callbackGasLimit: bigint,
    options?: ContractTransactionOptions
  ): Promise<ContractTransactionResponse>;

  fulfillRandomness(
    requestId: bigint,
    requester: Address,
    pubKeyHash: Hex,
    round: bigint,
    callbackGasLimit: bigint,
    signature: [bigint, bigint],
    options?: ContractTransactionOptions
  ): Promise<ContractTransactionResponse>;

  // View Functions
  getRequestPrice(callbackGasLimit: bigint): Promise<[bigint, bigint]>;
  getRequestState(requestId: bigint): Promise<RequestState>;
  getRequest(requestId: bigint): Promise<ContractRequest | null>;
  maxCallbackGasLimit(): Promise<bigint>;
  maxDeadlineDelta(): Promise<bigint>;
  nextRequestId(): Promise<bigint>;
  currentBeaconPubKeyHash(): Promise<Hex>;

  // Configuration
  gasStation(): Promise<Address>;
  beacon(): Promise<Address>;
  owner(): Promise<Address>;

  // Event Listening
  watchRandomnessRequested(
    args?: Partial<RandomnessRequestedEventArgs>,
    options?: WatchEventOptions
  ): WatchEventUnsubscribeFn;

  watchRandomnessFulfilled(
    args?: Partial<RandomnessFulfilledEventArgs>,
    options?: WatchEventOptions
  ): WatchEventUnsubscribeFn;

  watchRandomnessCallbackFailed(
    args?: Partial<RandomnessCallbackFailedEventArgs>,
    options?: WatchEventOptions
  ): WatchEventUnsubscribeFn;

  // Event Queries
  getRandomnessRequestedEvents(
    fromBlock?: bigint | 'latest',
    toBlock?: bigint | 'latest',
    args?: Partial<RandomnessRequestedEventArgs>
  ): Promise<RandomnessRequestedEvent[]>;

  getRandomnessFulfilledEvents(
    fromBlock?: bigint | 'latest',
    toBlock?: bigint | 'latest',
    args?: Partial<RandomnessFulfilledEventArgs>
  ): Promise<RandomnessFulfilledEvent[]>;
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

  // Round Information
  getRound(round: bigint): Promise<DrandBeaconRound | null>;
  getCurrentRound(): Promise<DrandBeaconRound>;
  getLatestRound(): Promise<bigint>;
}

export interface IGasStationContract {
  // Gas Price Calculation
  getEffectiveFeePerGas(callbackGasLimit: bigint): Promise<bigint>;
  baseFeeMultiplier(): Promise<bigint>;
  priorityFeeMultiplier(): Promise<bigint>;
  gasOracle(): Promise<Address>;

  // Fee Estimation
  estimateRequestFee(callbackGasLimit: bigint): Promise<bigint>;
  estimateFulfillmentFee(callbackGasLimit: bigint): Promise<bigint>;
}

// ============================================================================
// Contract Data Types
// ============================================================================

export interface ContractRequest {
  requestId: bigint;
  requester: Address;
  deadline: bigint;
  callbackGasLimit: bigint;
  feePaid: bigint;
  effectiveFeePerGas: bigint;
  pubKeyHash: Hex;
  round: bigint;
  randomness: bigint;
  callbackSuccess: boolean;
  actualGasUsed: bigint;
}

export interface DrandBeaconRound {
  round: bigint;
  timestamp: bigint;
  randomness: Hex;
  signature: [bigint, bigint];
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
  blockNumber: bigint;
  blockHash: Hash;
  transactionHash: Hash;
  logIndex: number;
  timestamp: number;
}

export interface RandomnessRequestedEventArgs {
  requestId?: bigint;
  requester?: Address;
  pubKeyHash?: Hex;
}

export interface RandomnessFulfilledEvent {
  requestId: bigint;
  randomness: bigint;
  callbackSuccess: boolean;
  actualGasUsed: bigint;
  blockNumber: bigint;
  blockHash: Hash;
  transactionHash: Hash;
  logIndex: number;
  timestamp: number;
}

export interface RandomnessFulfilledEventArgs {
  requestId?: bigint;
}

export interface RandomnessCallbackFailedEvent {
  requestId: bigint;
  retdata: Hex;
  gasLimit: bigint;
  actualGasUsed: bigint;
  blockNumber: bigint;
  blockHash: Hash;
  transactionHash: Hash;
  logIndex: number;
  timestamp: number;
}

export interface RandomnessCallbackFailedEventArgs {
  requestId?: bigint;
}

// ============================================================================
// Transaction Interfaces
// ============================================================================

export interface ContractTransactionOptions {
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  account?: Address;
}

export interface ContractTransactionResponse {
  hash: Hash;
  wait(confirmations?: number): Promise<ContractTransactionReceipt>;
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
  type: number;
}

export interface ContractTransactionReceipt {
  transactionHash: Hash;
  blockNumber: bigint;
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
  root?: Hash;
  logsBloom: Hex;
  timestamp: number;
}

export interface ContractEventLog {
  address: Address;
  topics: Hex[];
  data: Hex;
  blockNumber: bigint;
  blockHash: Hash;
  transactionHash: Hash;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
  decoded?: {
    eventName: string;
    args: Record<string, any>;
  };
}

// ============================================================================
// Provider Interfaces
// ============================================================================

export interface BlockchainProvider {
  // Network Information
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  getBlock(blockHashOrBlockTag?: Hash | bigint | 'latest' | 'pending'): Promise<BlockInfo>;
  getNetwork(): Promise<NetworkInfo>;

  // Account Information
  getBalance(address: Address, blockTag?: bigint | 'latest' | 'pending'): Promise<bigint>;
  getTransactionCount(address: Address, blockTag?: bigint | 'latest' | 'pending'): Promise<number>;
  getCode(address: Address, blockTag?: bigint | 'latest' | 'pending'): Promise<Hex>;

  // Gas Information
  getGasPrice(): Promise<bigint>;
  getFeeHistory(
    blockCount: number,
    newestBlock: bigint | 'latest' | 'pending',
    rewardPercentiles?: number[]
  ): Promise<FeeHistory>;
  estimateGas(transaction: TransactionRequest): Promise<bigint>;

  // Transaction Methods
  sendTransaction(transaction: TransactionRequest): Promise<Hash>;
  getTransaction(hash: Hash): Promise<TransactionInfo | null>;
  getTransactionReceipt(hash: Hash): Promise<ContractTransactionReceipt | null>;
  waitForTransactionReceipt(hash: Hash, confirmations?: number): Promise<ContractTransactionReceipt>;

  // Event Methods
  getLogs(filter: LogFilter): Promise<ContractEventLog[]>;
  watchLogs(filter: LogFilter, callback: (logs: ContractEventLog[]) => void): () => void;
  watchBlocks(callback: (blockNumber: bigint) => void): () => void;

  // Contract Methods
  call(transaction: TransactionRequest, blockTag?: bigint | 'latest' | 'pending'): Promise<Hex>;
  simulate(transaction: TransactionRequest, blockTag?: bigint | 'latest' | 'pending'): Promise<SimulationResult>;

  // Batch Operations
  batch(requests: BatchRequest[]): Promise<BatchResponse[]>;
}

export interface WalletProvider extends BlockchainProvider {
  // Account Management
  requestAccounts(): Promise<Address[]>;
  getAccounts(): Promise<Address[]>;
  switchChain(chainId: number): Promise<void>;
  addChain(chain: ChainConfig): Promise<void>;

  // Signing
  signMessage(message: string | Hex): Promise<Hex>;
  signTypedData(domain: any, types: any, value: any): Promise<Hex>;
  signTransaction(transaction: TransactionRequest): Promise<Hex>;

  // Events
  on(event: 'accountsChanged', listener: (accounts: Address[]) => void): void;
  on(event: 'chainChanged', listener: (chainId: number) => void): void;
  on(event: 'disconnect', listener: (error: any) => void): void;
  off(event: string, listener: Function): void;

  // Provider Information
  isConnected(): boolean;
  getProviderInfo(): ProviderInfo;
}

// ============================================================================
// Network Configuration
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
  icons?: string[];
}

export interface ContractAddresses {
  anyrand: Address;
  beacon: Address;
  gasStation: Address;
  multicall?: Address;
}

export interface NetworkFeatures {
  supportsEIP1559: boolean;
  averageBlockTime: number; // in seconds
  confirmationsRequired: number;
  gasMultiplier: number;
  maxGasLimit: bigint;
  isTestnet: boolean;
}

export interface ChainConfig {
  chainId: number;
  chainName: string;
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
// Data Types
// ============================================================================

export interface BlockInfo {
  number: bigint;
  hash: Hash;
  parentHash: Hash;
  timestamp: bigint;
  gasLimit: bigint;
  gasUsed: bigint;
  baseFeePerGas?: bigint;
  difficulty: bigint;
  totalDifficulty: bigint;
  miner: Address;
  extraData: Hex;
  transactions: Hash[];
  size: bigint;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  ensAddress?: Address;
}

export interface FeeHistory {
  oldestBlock: bigint;
  baseFeePerGas: bigint[];
  gasUsedRatio: number[];
  reward?: bigint[][];
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
  accessList?: AccessListEntry[];
}

export interface AccessListEntry {
  address: Address;
  storageKeys: Hash[];
}

export interface TransactionInfo {
  hash: Hash;
  blockHash?: Hash;
  blockNumber?: bigint;
  transactionIndex?: number;
  from: Address;
  to?: Address;
  value: bigint;
  gasLimit: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce: number;
  data: Hex;
  chainId: number;
  type: number;
  accessList?: AccessListEntry[];
  status?: 'pending' | 'success' | 'reverted';
}

export interface SimulationResult {
  success: boolean;
  returnData: Hex;
  gasUsed: bigint;
  error?: string;
}

export interface LogFilter {
  address?: Address | Address[];
  topics?: (Hex | Hex[] | null)[];
  fromBlock?: bigint | 'latest' | 'pending';
  toBlock?: bigint | 'latest' | 'pending';
}

export interface BatchRequest {
  method: string;
  params: any[];
  id: string | number;
}

export interface BatchResponse {
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ProviderInfo {
  uuid?: string;
  name: string;
  icon: string;
  rdns?: string;
}

// ============================================================================
// Event Management
// ============================================================================

export interface WatchEventOptions {
  fromBlock?: bigint | 'latest' | 'pending';
  toBlock?: bigint | 'latest' | 'pending';
  pollingInterval?: number;
  strict?: boolean;
  onLogs?: (logs: ContractEventLog[]) => void;
  onError?: (error: Error) => void;
}

export type WatchEventUnsubscribeFn = () => void;

export interface EventSubscription {
  unsubscribe: () => void;
  isActive: boolean;
  eventName: string;
  contractAddress: Address;
  filter?: any;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ContractError extends Error {
  code?: string | number;
  data?: Hex;
  reason?: string;
  method?: string;
  errorArgs?: any[];
  transaction?: TransactionRequest;
  contractAddress?: Address;
  abi?: any[];
}

export interface NetworkError extends Error {
  code: number;
  data?: any;
  network?: string;
  chainId?: number;
  rpcUrl?: string;
}

export interface TransactionError extends Error {
  code: string | number;
  hash?: Hash;
  receipt?: ContractTransactionReceipt;
  reason?: string;
  transaction?: TransactionRequest;
}

export interface ProviderError extends Error {
  code: number;
  data?: any;
  stack?: string;
}

// ============================================================================
// Utility Interfaces
// ============================================================================

export interface ContractCallOptions {
  blockTag?: bigint | 'latest' | 'pending';
  from?: Address;
  gasLimit?: bigint;
  gasPrice?: bigint;
  value?: bigint;
}

export interface EventQueryOptions {
  fromBlock?: bigint | 'latest' | 'pending';
  toBlock?: bigint | 'latest' | 'pending';
  address?: Address | Address[];
  topics?: (Hex | Hex[] | null)[];
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface MulticallRequest {
  target: Address;
  allowFailure: boolean;
  callData: Hex;
}

export interface MulticallResult {
  success: boolean;
  returnData: Hex;
}

// ============================================================================
// Constants and Enums
// ============================================================================

export const SUPPORTED_CHAINS = {
  SCROLL: 534352,
  SCROLL_SEPOLIA: 534351,
  BASE: 8453,
  BASE_SEPOLIA: 84532,
} as const;

export const ERROR_CODES = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // Ethereum provider errors
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,

  // Contract execution errors
  EXECUTION_REVERTED: -32000,
  INSUFFICIENT_FUNDS: -32003,
  NONCE_TOO_LOW: -32004,
  NONCE_TOO_HIGH: -32005,
  GAS_LIMIT_EXCEEDED: -32006,
  GAS_PRICE_TOO_LOW: -32007,
} as const;

export enum TransactionType {
  Legacy = 0,
  AccessList = 1,
  DynamicFee = 2,
}

// ============================================================================
// Type Guards
// ============================================================================

export function isContractError(error: unknown): error is ContractError {
  return error instanceof Error && 'contractAddress' in error;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof Error && 'chainId' in error;
}

export function isTransactionError(error: unknown): error is TransactionError {
  return error instanceof Error && 'hash' in error;
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof Error && 'code' in error && typeof (error as any).code === 'number';
}

// ============================================================================
// Type Exports
// ============================================================================

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type BlockTag = bigint | 'latest' | 'pending';
export type EventCallback<T = any> = (event: T) => void;
export type UnsubscribeFunction = () => void;