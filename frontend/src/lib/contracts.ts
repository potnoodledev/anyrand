/**
 * Anyrand Contract Interaction Utilities
 *
 * This module provides high-level utilities for interacting with Anyrand smart contracts.
 * It abstracts the complex blockchain interactions behind simple, type-safe functions.
 */

import { Address, Hash, Hex, formatEther, parseEther, Log, createPublicClient, http } from 'viem';
import { readContract, writeContract, waitForTransactionReceipt, watchContractEvent, getContractEvents } from '@wagmi/core';
import { wagmiConfig } from './wagmi';
import { anyrandAbi } from '../abi/anyrand';
import { getContractAddress } from './config';
import {
  IAnyrandContract,
  ContractRequest,
  ContractTransactionOptions,
  ContractTransactionResponse,
  RandomnessRequestedEvent,
  RandomnessFulfilledEvent,
  ContractError,
  NetworkError,
  TransactionError,
} from '../types/blockchain';
import { RequestState, TransactionStatus } from '../types/entities';

// ============================================================================
// Core Contract Functions
// ============================================================================

export class AnyrandContract implements IAnyrandContract {
  private chainId: number;
  private contractAddress: Address;

  constructor(chainId: number) {
    this.chainId = chainId;
    this.contractAddress = getContractAddress('anyrand', chainId);
  }

  // ============================================================================
  // Core Functions
  // ============================================================================

  async requestRandomness(
    deadline: bigint,
    callbackGasLimit: bigint,
    options: ContractTransactionOptions = {}
  ): Promise<ContractTransactionResponse> {
    try {
      // Get the required fee first
      const [baseFee, totalFee] = await this.getRequestPrice(callbackGasLimit);

      const hash = await writeContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'requestRandomness',
        args: [deadline, callbackGasLimit],
        value: options.value || totalFee,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        nonce: options.nonce,
        account: options.account,
        chainId: this.chainId,
      });

      return {
        hash,
        wait: async (confirmations = 1) => {
          const receipt = await waitForTransactionReceipt(wagmiConfig, {
            hash,
            confirmations,
            chainId: this.chainId,
          });
          return receipt;
        },
        from: options.account || '0x',
        to: this.contractAddress,
        value: options.value || totalFee,
        gasLimit: options.gasLimit || 0n,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        nonce: options.nonce || 0,
        data: '0x',
        chainId: this.chainId,
        type: 2,
      };
    } catch (error) {
      throw this.handleContractError(error, 'requestRandomness');
    }
  }

  async fulfillRandomness(
    requestId: bigint,
    requester: Address,
    pubKeyHash: Hex,
    round: bigint,
    callbackGasLimit: bigint,
    signature: [bigint, bigint],
    options: ContractTransactionOptions = {}
  ): Promise<ContractTransactionResponse> {
    try {
      const hash = await writeContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'fulfillRandomness',
        args: [requestId, requester, pubKeyHash, round, callbackGasLimit, signature],
        value: options.value,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        nonce: options.nonce,
        account: options.account,
        chainId: this.chainId,
      });

      return {
        hash,
        wait: async (confirmations = 1) => {
          const receipt = await waitForTransactionReceipt(wagmiConfig, {
            hash,
            confirmations,
            chainId: this.chainId,
          });
          return receipt;
        },
        from: options.account || '0x',
        to: this.contractAddress,
        value: options.value || 0n,
        gasLimit: options.gasLimit || 0n,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        nonce: options.nonce || 0,
        data: '0x',
        chainId: this.chainId,
        type: 2,
      };
    } catch (error) {
      throw this.handleContractError(error, 'fulfillRandomness');
    }
  }

  // ============================================================================
  // View Functions
  // ============================================================================

  async getRequestPrice(callbackGasLimit: bigint): Promise<[bigint, bigint]> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'getRequestPrice',
        args: [callbackGasLimit],
        chainId: this.chainId,
      });
      return result as [bigint, bigint];
    } catch (error) {
      throw this.handleContractError(error, 'getRequestPrice');
    }
  }

  async getRequestState(requestId: bigint): Promise<RequestState> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'getRequestState',
        args: [requestId],
        chainId: this.chainId,
      });
      return result as RequestState;
    } catch (error) {
      throw this.handleContractError(error, 'getRequestState');
    }
  }

  async getRequest(requestId: bigint): Promise<ContractRequest | null> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'getRequest',
        args: [requestId],
        chainId: this.chainId,
      });

      if (!result) return null;

      const [
        id,
        requester,
        deadline,
        callbackGasLimit,
        feePaid,
        effectiveFeePerGas,
        pubKeyHash,
        round,
        randomness,
        callbackSuccess,
        actualGasUsed
      ] = result as [bigint, Address, bigint, bigint, bigint, bigint, Hex, bigint, bigint, boolean, bigint];

      return {
        requestId: id,
        requester,
        deadline,
        callbackGasLimit,
        feePaid,
        effectiveFeePerGas,
        pubKeyHash,
        round,
        randomness,
        callbackSuccess,
        actualGasUsed,
      };
    } catch (error) {
      throw this.handleContractError(error, 'getRequest');
    }
  }

  async maxCallbackGasLimit(): Promise<bigint> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'maxCallbackGasLimit',
        chainId: this.chainId,
      });
      return result as bigint;
    } catch (error) {
      throw this.handleContractError(error, 'maxCallbackGasLimit');
    }
  }

  async maxDeadlineDelta(): Promise<bigint> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'maxDeadlineDelta',
        chainId: this.chainId,
      });
      return result as bigint;
    } catch (error) {
      throw this.handleContractError(error, 'maxDeadlineDelta');
    }
  }

  async nextRequestId(): Promise<bigint> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'nextRequestId',
        chainId: this.chainId,
      });
      return result as bigint;
    } catch (error) {
      throw this.handleContractError(error, 'nextRequestId');
    }
  }

  async currentBeaconPubKeyHash(): Promise<Hex> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'currentBeaconPubKeyHash',
        chainId: this.chainId,
      });
      return result as Hex;
    } catch (error) {
      throw this.handleContractError(error, 'currentBeaconPubKeyHash');
    }
  }

  async gasStation(): Promise<Address> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'gasStation',
        chainId: this.chainId,
      });
      return result as Address;
    } catch (error) {
      throw this.handleContractError(error, 'gasStation');
    }
  }

  async beacon(): Promise<Address> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'beacon',
        chainId: this.chainId,
      });
      return result as Address;
    } catch (error) {
      throw this.handleContractError(error, 'beacon');
    }
  }

  async owner(): Promise<Address> {
    try {
      const result = await readContract(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        functionName: 'owner',
        chainId: this.chainId,
      });
      return result as Address;
    } catch (error) {
      throw this.handleContractError(error, 'owner');
    }
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  watchRandomnessRequested(
    onEvent: (event: RandomnessRequestedEvent) => void,
    userAddress?: Address
  ): () => void {
    const unwatch = watchContractEvent(wagmiConfig, {
      address: this.contractAddress,
      abi: anyrandAbi,
      eventName: 'RandomnessRequested',
      args: userAddress ? { requester: userAddress } : undefined,
      onLogs: (logs) => {
        logs.forEach((log) => {
          const event: RandomnessRequestedEvent = {
            requestId: log.args.requestId!,
            requester: log.args.requester!,
            deadline: log.args.deadline!,
            callbackGasLimit: log.args.callbackGasLimit!,
            feePaid: log.args.feePaid!,
            pubKeyHash: log.args.pubKeyHash!,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!,
            logIndex: log.logIndex!,
          };
          onEvent(event);
        });
      },
    });

    return unwatch;
  }

  watchRandomnessFulfilled(
    onEvent: (event: RandomnessFulfilledEvent) => void,
    userAddress?: Address
  ): () => void {
    const unwatch = watchContractEvent(wagmiConfig, {
      address: this.contractAddress,
      abi: anyrandAbi,
      eventName: 'RandomnessFulfilled',
      args: userAddress ? { requester: userAddress } : undefined,
      onLogs: (logs) => {
        logs.forEach((log) => {
          const event: RandomnessFulfilledEvent = {
            requestId: log.args.requestId!,
            requester: log.args.requester!,
            randomness: log.args.randomness!,
            callbackSuccess: log.args.callbackSuccess!,
            actualGasUsed: log.args.actualGasUsed!,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!,
            logIndex: log.logIndex!,
          };
          onEvent(event);
        });
      },
    });

    return unwatch;
  }

  watchRandomnessCallbackFailed(
    onEvent: (event: RandomnessFulfilledEvent) => void,
    userAddress?: Address
  ): () => void {
    const unwatch = watchContractEvent(wagmiConfig, {
      address: this.contractAddress,
      abi: anyrandAbi,
      eventName: 'RandomnessFulfilled',
      args: userAddress ? { requester: userAddress } : undefined,
      onLogs: (logs) => {
        logs.forEach((log) => {
          if (!log.args.callbackSuccess) {
            const event: RandomnessFulfilledEvent = {
              requestId: log.args.requestId!,
              requester: log.args.requester!,
              randomness: log.args.randomness!,
              callbackSuccess: log.args.callbackSuccess!,
              actualGasUsed: log.args.actualGasUsed!,
              blockNumber: log.blockNumber!,
              transactionHash: log.transactionHash!,
              logIndex: log.logIndex!,
            };
            onEvent(event);
          }
        });
      },
    });

    return unwatch;
  }

  async getRandomnessRequestedEvents(
    fromBlock?: bigint,
    toBlock?: bigint,
    userAddress?: Address
  ): Promise<RandomnessRequestedEvent[]> {
    try {
      const logs = await getContractEvents(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        eventName: 'RandomnessRequested',
        args: userAddress ? { requester: userAddress } : undefined,
        fromBlock: fromBlock || 'earliest',
        toBlock: toBlock || 'latest',
      });

      return logs.map((log): RandomnessRequestedEvent => ({
        requestId: log.args.requestId!,
        requester: log.args.requester!,
        deadline: log.args.deadline!,
        callbackGasLimit: log.args.callbackGasLimit!,
        feePaid: log.args.feePaid!,
        pubKeyHash: log.args.pubKeyHash!,
        blockNumber: log.blockNumber!,
        transactionHash: log.transactionHash!,
        logIndex: log.logIndex!,
      }));
    } catch (error) {
      throw this.handleContractError(error, 'getRandomnessRequestedEvents');
    }
  }

  async getRandomnessFulfilledEvents(
    fromBlock?: bigint,
    toBlock?: bigint,
    userAddress?: Address
  ): Promise<RandomnessFulfilledEvent[]> {
    try {
      const logs = await getContractEvents(wagmiConfig, {
        address: this.contractAddress,
        abi: anyrandAbi,
        eventName: 'RandomnessFulfilled',
        args: userAddress ? { requester: userAddress } : undefined,
        fromBlock: fromBlock || 'earliest',
        toBlock: toBlock || 'latest',
      });

      return logs.map((log): RandomnessFulfilledEvent => ({
        requestId: log.args.requestId!,
        requester: log.args.requester!,
        randomness: log.args.randomness!,
        callbackSuccess: log.args.callbackSuccess!,
        actualGasUsed: log.args.actualGasUsed!,
        blockNumber: log.blockNumber!,
        transactionHash: log.transactionHash!,
        logIndex: log.logIndex!,
      }));
    } catch (error) {
      throw this.handleContractError(error, 'getRandomnessFulfilledEvents');
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleContractError(error: unknown, method: string): ContractError {
    const contractError = new Error(`Contract ${method} failed`) as ContractError;
    contractError.method = method;
    contractError.contractAddress = this.contractAddress;

    if (error instanceof Error) {
      contractError.message = error.message;
      contractError.stack = error.stack;
      contractError.cause = error;
    }

    return contractError;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createAnyrandContract(chainId: number): AnyrandContract {
  return new AnyrandContract(chainId);
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function estimateRequestFee(
  chainId: number,
  callbackGasLimit: bigint
): Promise<{ baseFee: bigint; totalFee: bigint; formattedFee: string }> {
  const contract = createAnyrandContract(chainId);
  const [baseFee, totalFee] = await contract.getRequestPrice(callbackGasLimit);

  return {
    baseFee,
    totalFee,
    formattedFee: formatEther(totalFee),
  };
}

export async function getRequestById(
  chainId: number,
  requestId: bigint
): Promise<ContractRequest | null> {
  const contract = createAnyrandContract(chainId);
  return contract.getRequest(requestId);
}

export async function getRequestState(
  chainId: number,
  requestId: bigint
): Promise<RequestState> {
  const contract = createAnyrandContract(chainId);
  return contract.getRequestState(requestId);
}

export async function getContractLimits(chainId: number): Promise<{
  maxCallbackGasLimit: bigint;
  maxDeadlineDelta: bigint;
  nextRequestId: bigint;
}> {
  const contract = createAnyrandContract(chainId);

  const [maxCallbackGasLimit, maxDeadlineDelta, nextRequestId] = await Promise.all([
    contract.maxCallbackGasLimit(),
    contract.maxDeadlineDelta(),
    contract.nextRequestId(),
  ]);

  return {
    maxCallbackGasLimit,
    maxDeadlineDelta,
    nextRequestId,
  };
}

export async function getCurrentBeaconInfo(chainId: number): Promise<{
  pubKeyHash: Hex;
  beaconAddress: Address;
  gasStationAddress: Address;
}> {
  const contract = createAnyrandContract(chainId);

  const [pubKeyHash, beaconAddress, gasStationAddress] = await Promise.all([
    contract.currentBeaconPubKeyHash(),
    contract.beacon(),
    contract.gasStation(),
  ]);

  return {
    pubKeyHash,
    beaconAddress,
    gasStationAddress,
  };
}

// ============================================================================
// Request Utilities
// ============================================================================

export function calculateDeadline(minutesFromNow: number): bigint {
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + (minutesFromNow * 60);
  return BigInt(deadline);
}

export function isValidCallbackGasLimit(gasLimit: bigint, maxLimit: bigint): boolean {
  return gasLimit > 0n && gasLimit <= maxLimit;
}

export function isValidDeadline(deadline: bigint, maxDelta: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const delta = deadline - now;
  return delta > 0n && delta <= maxDelta;
}

export function formatRequestId(requestId: bigint): string {
  return `#${requestId.toString()}`;
}

export function formatGasLimit(gasLimit: bigint): string {
  return gasLimit.toLocaleString();
}

export function formatDeadline(deadline: bigint): string {
  const deadlineMs = Number(deadline) * 1000;
  return new Date(deadlineMs).toLocaleString();
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_CALLBACK_GAS_LIMIT = 100000n;
export const DEFAULT_DEADLINE_MINUTES = 60;
export const MIN_CALLBACK_GAS_LIMIT = 21000n;
export const RECOMMENDED_GAS_MULTIPLIER = 1.2;

// ============================================================================
// Type Exports
// ============================================================================

export type { AnyrandContract };