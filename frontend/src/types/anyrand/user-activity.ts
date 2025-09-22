import { Address } from 'viem'
import { RandomnessRequest, RandomnessFulfillment } from './randomness-request'

export interface UserActivity {
  address: Address
  requestsSubmitted: bigint
  requestsFulfilled: bigint
  totalFeesSpent: bigint
  totalFeesEarned: bigint
  averageRequestValue: bigint
  firstActivityTimestamp: bigint
  lastActivityTimestamp: bigint
  activeRequests: RandomnessRequest[]
  recentRequests: RandomnessRequest[]
  recentFulfillments: RandomnessFulfillment[]
}

export interface UserProfile {
  address: Address
  displayName?: string
  avatar?: string
  joinedAt: bigint
  totalTransactions: bigint
  reputation: number
  isOperator: boolean
  isVerified: boolean
}

export interface ActivitySummary {
  period: '24h' | '7d' | '30d' | 'all'
  requests: number
  fulfillments: number
  feesSpent: bigint
  feesEarned: bigint
  netProfit: bigint
  averageResponseTime: number
}

export interface UserPreferences {
  address: Address
  defaultGasLimit: bigint
  defaultDeadlineHours: number
  notifications: {
    requestFulfilled: boolean
    lowBalance: boolean
    operatorOpportunities: boolean
  }
  theme: 'light' | 'dark' | 'auto'
  currency: 'ETH' | 'USD'
}

// Utility functions
export function calculateUserReputation(activity: UserActivity): number {
  const totalTransactions = activity.requestsSubmitted + activity.requestsFulfilled

  if (totalTransactions === 0n) return 0

  // Base score from transaction volume
  const volumeScore = Math.min(Number(totalTransactions) * 10, 500)

  // Bonus for being an active operator
  const operatorBonus = activity.requestsFulfilled > 0n ? 200 : 0

  // Recent activity bonus
  const now = BigInt(Math.floor(Date.now() / 1000))
  const daysSinceLastActivity = Number((now - activity.lastActivityTimestamp) / 86400n)
  const activityBonus = Math.max(0, 100 - daysSinceLastActivity * 5)

  return Math.min(volumeScore + operatorBonus + activityBonus, 1000)
}

export function getUserRole(activity: UserActivity): 'requester' | 'operator' | 'hybrid' {
  if (activity.requestsFulfilled > 0n && activity.requestsSubmitted > 0n) {
    return 'hybrid'
  } else if (activity.requestsFulfilled > 0n) {
    return 'operator'
  } else {
    return 'requester'
  }
}

export function calculateProfitability(activity: UserActivity): {
  totalSpent: bigint
  totalEarned: bigint
  netProfit: bigint
  profitMargin: number
} {
  const netProfit = activity.totalFeesEarned - activity.totalFeesSpent
  const profitMargin = activity.totalFeesSpent > 0n
    ? Number((netProfit * 100n) / activity.totalFeesSpent)
    : 0

  return {
    totalSpent: activity.totalFeesSpent,
    totalEarned: activity.totalFeesEarned,
    netProfit,
    profitMargin
  }
}

export function getActivitySummary(
  activity: UserActivity,
  period: ActivitySummary['period']
): ActivitySummary {
  const now = BigInt(Math.floor(Date.now() / 1000))
  let periodStart: bigint

  switch (period) {
    case '24h':
      periodStart = now - 86400n
      break
    case '7d':
      periodStart = now - 604800n
      break
    case '30d':
      periodStart = now - 2592000n
      break
    case 'all':
      periodStart = 0n
      break
  }

  // Filter recent activities (simplified - in real implementation would need timestamps)
  const recentRequests = activity.recentRequests.filter(
    req => req.timestamp >= periodStart
  )

  const recentFulfillments = activity.recentFulfillments.filter(
    fulfillment => fulfillment.timestamp >= periodStart
  )

  const feesSpent = recentRequests.reduce((acc, req) => acc + req.feePaid, 0n)
  const feesEarned = recentFulfillments.reduce((acc, fulfillment) => {
    // Estimate operator reward (simplified)
    const request = activity.recentRequests.find(r => r.id === fulfillment.requestId)
    return acc + (request ? request.feePaid / 10n : 0n) // ~10% operator fee
  }, 0n)

  return {
    period,
    requests: recentRequests.length,
    fulfillments: recentFulfillments.length,
    feesSpent,
    feesEarned,
    netProfit: feesEarned - feesSpent,
    averageResponseTime: 0 // Would be calculated from actual data
  }
}

export function isActiveUser(activity: UserActivity): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const sevenDaysAgo = now - 604800n

  return activity.lastActivityTimestamp >= sevenDaysAgo
}

export function formatUserStats(activity: UserActivity): {
  totalTransactions: string
  joinDate: string
  averageFee: string
  successRate: string
} {
  const totalTransactions = activity.requestsSubmitted + activity.requestsFulfilled
  const joinDate = new Date(Number(activity.firstActivityTimestamp) * 1000).toLocaleDateString()
  const averageFee = activity.requestsSubmitted > 0n
    ? (Number(activity.totalFeesSpent) / Number(activity.requestsSubmitted) / 1e18).toFixed(6)
    : '0.000000'

  // Success rate for operators (fulfillments vs attempts)
  const successRate = activity.requestsFulfilled > 0n ? '100.0' : '0.0' // Simplified

  return {
    totalTransactions: totalTransactions.toString(),
    joinDate,
    averageFee: `${averageFee} ETH`,
    successRate: `${successRate}%`
  }
}