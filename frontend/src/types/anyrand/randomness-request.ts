import { Address, Hash, Hex } from 'viem'

export enum RequestStatus {
  Nonexistent = 0,
  Pending = 1,
  Fulfilled = 2,
  Failed = 3
}

export interface RandomnessRequest {
  id: bigint
  requester: Address
  deadline: bigint
  callbackGasLimit: bigint
  feePaid: bigint
  effectiveFeePerGas: bigint
  status: RequestStatus
  transactionHash: Hash
  blockNumber: bigint
  timestamp: bigint
  pubKeyHash: Hex
  round: bigint  // DRAND round number from the request event
  fulfillment?: RandomnessFulfillment
}

export interface RandomnessFulfillment {
  requestId: bigint
  randomness: bigint
  operator: Address
  callbackSuccess: boolean
  actualGasUsed: bigint
  transactionHash: Hash
  blockNumber: bigint
  timestamp: bigint
  round: bigint
  signature: [bigint, bigint]
}

export interface SubmitRequestParams {
  deadline: bigint
  callbackGasLimit: bigint
}

export interface SubmitRequestResult {
  transactionHash: Hash
  requestId: bigint
}

export interface FulfillRequestParams {
  requestId: bigint
  requester: Address
  pubKeyHash: Hex
  round: bigint
  callbackGasLimit: bigint
  signature: [bigint, bigint]
}

export interface FulfillRequestResult {
  transactionHash: Hash
  randomness: bigint
}

// Validation utilities
export function isValidDeadline(deadline: bigint, maxDeadlineDelta?: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const oneMinute = 60n // Minimum 1 minute in the future
  const maxDelta = maxDeadlineDelta || 604800n // Default 7 days if not provided

  return deadline > now + oneMinute && deadline < now + maxDelta
}

export function isValidCallbackGasLimit(gasLimit: bigint, maxCallbackGasLimit?: bigint): boolean {
  const minGas = 100000n
  const maxGas = maxCallbackGasLimit || 1000000n // Use contract constraint or default

  return gasLimit >= minGas && gasLimit <= maxGas
}

export function getStatusText(status: RequestStatus): string {
  switch (status) {
    case RequestStatus.Nonexistent:
      return 'Nonexistent'
    case RequestStatus.Pending:
      return 'Pending'
    case RequestStatus.Fulfilled:
      return 'Fulfilled'
    case RequestStatus.Failed:
      return 'Failed'
    default:
      return 'Unknown'
  }
}

export function canFulfillRequest(request: RandomnessRequest): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return request.status === RequestStatus.Pending && request.deadline < now
}