import { Address } from 'viem'

export interface NetworkStatistics {
  totalRequests: bigint
  pendingRequests: bigint
  fulfilledRequests: bigint
  failedRequests: bigint
  successRate: number
  averageFulfillmentTime: number
  totalFeesCollected: bigint
  activeOperators: number
  lastUpdated: bigint
}

export interface OperatorStatistics {
  address: Address
  totalFulfillments: bigint
  successfulFulfillments: bigint
  failedFulfillments: bigint
  totalRewardsEarned: bigint
  averageResponseTime: number
  lastActivity: bigint
  reputation: number
}

export interface TimeSeriesData {
  timestamp: bigint
  requests: number
  fulfillments: number
  averageFee: bigint
  activeUsers: number
}

export interface NetworkHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  pendingRequestsBacklog: number
  averageWaitTime: number
  operatorAvailability: number
  networkLatency: number
}

// Utility functions
export function calculateSuccessRate(
  fulfilled: bigint,
  failed: bigint
): number {
  const total = fulfilled + failed
  if (total === 0n) return 0
  return Number((fulfilled * 100n) / total)
}

export function calculateAverageValue(
  total: bigint,
  count: bigint
): bigint {
  if (count === 0n) return 0n
  return total / count
}

export function getNetworkHealthStatus(
  stats: NetworkStatistics
): NetworkHealth {
  const pendingRatio = Number(stats.pendingRequests * 100n / stats.totalRequests)
  const operatorCount = stats.activeOperators

  let status: NetworkHealth['status'] = 'healthy'

  if (pendingRatio > 20 || operatorCount < 3) {
    status = 'degraded'
  }

  if (pendingRatio > 50 || operatorCount < 1) {
    status = 'unhealthy'
  }

  return {
    status,
    pendingRequestsBacklog: Number(stats.pendingRequests),
    averageWaitTime: stats.averageFulfillmentTime,
    operatorAvailability: operatorCount,
    networkLatency: 0, // Would be calculated from actual measurements
  }
}

export function formatFeeAmount(
  fee: bigint,
  decimals: number = 18
): string {
  const divisor = 10n ** BigInt(decimals)
  const wholePart = fee / divisor
  const fractionalPart = fee % divisor

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  return `${wholePart}.${fractionalStr}`
}

export function calculateFeeMetrics(
  fees: bigint[],
  timestamps: bigint[]
): {
  average: bigint
  median: bigint
  min: bigint
  max: bigint
  recent24h: bigint
} {
  if (fees.length === 0) {
    return {
      average: 0n,
      median: 0n,
      min: 0n,
      max: 0n,
      recent24h: 0n
    }
  }

  const sorted = [...fees].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
  const total = fees.reduce((acc, fee) => acc + fee, 0n)

  // Recent 24h fees (if timestamps provided)
  const now = BigInt(Math.floor(Date.now() / 1000))
  const oneDayAgo = now - 86400n
  const recentFees = timestamps
    ? fees.filter((_, i) => timestamps[i] > oneDayAgo)
    : []
  const recent24h = recentFees.length > 0
    ? recentFees.reduce((acc, fee) => acc + fee, 0n) / BigInt(recentFees.length)
    : 0n

  return {
    average: total / BigInt(fees.length),
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    recent24h
  }
}