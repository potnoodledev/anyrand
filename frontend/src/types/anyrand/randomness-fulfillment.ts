import { Address, Hash } from 'viem'

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

export interface FulfillmentMetrics {
  totalFulfillments: bigint
  successfulFulfillments: bigint
  failedFulfillments: bigint
  averageGasUsed: bigint
  totalGasUsed: bigint
  operatorRewards: bigint
}

// Utility functions
export function calculateFulfillmentReward(
  feePaid: bigint,
  actualGasUsed: bigint,
  gasPrice: bigint
): bigint {
  const gasCost = actualGasUsed * gasPrice
  return feePaid > gasCost ? feePaid - gasCost : 0n
}

export function formatRandomness(randomness: bigint): {
  decimal: string
  hex: string
  binary: string
} {
  return {
    decimal: randomness.toString(),
    hex: `0x${randomness.toString(16)}`,
    binary: randomness.toString(2)
  }
}

export function isValidRandomness(randomness: bigint): boolean {
  // Randomness should be a non-zero 256-bit value
  return randomness > 0n && randomness < 2n ** 256n
}

export function getFulfillmentEfficiency(
  callbackGasLimit: bigint,
  actualGasUsed: bigint
): number {
  if (callbackGasLimit === 0n) return 0
  return Number((actualGasUsed * 100n) / callbackGasLimit)
}

export function getDrandRoundTimestamp(round: bigint): bigint {
  // DRAND genesis timestamp and round period
  const genesisTime = 1692803367n // DRAND chain genesis
  const period = 30n // 30 seconds per round

  return genesisTime + (round - 1n) * period
}