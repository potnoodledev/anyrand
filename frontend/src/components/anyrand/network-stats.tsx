'use client'

import React, { useState } from 'react'
import { useNetworkStats, useNetworkHealth, useStatsComparison, useRealtimeStats } from '../../hooks/anyrand/use-network-stats'
import { formatFeeAmount } from '../../types/anyrand/network-statistics'

interface NetworkStatsProps {
  refreshInterval?: number
  showDetailedBreakdown?: boolean
  compact?: boolean
  className?: string
}

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: React.ReactNode
  loading?: boolean
  className?: string
}

function StatsCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  loading,
  className = ''
}: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  }

  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon && <div className="mr-3 text-gray-400">{icon}</div>}
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {loading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center ${trendColors[trend]}`}>
            {trendIcons[trend]}
            <span className="text-sm font-medium ml-1">{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function NetworkStats({
  refreshInterval = 30000,
  showDetailedBreakdown = false,
  compact = false,
  className = ''
}: NetworkStatsProps) {
  const { networkStats, userActivity, isLoading, error, refetch } = useNetworkStats()
  const networkHealth = useNetworkHealth()
  const statsComparison = useStatsComparison('24h')
  const { lastUpdateTime, forceUpdate } = useRealtimeStats()

  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'operators'>('overview')

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Error Loading Network Statistics
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error.message}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!networkStats) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const healthStatusColors = {
    healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Network Statistics</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {lastUpdateTime.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {networkHealth && (
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${healthStatusColors[networkHealth.status]}`}>
              {networkHealth.status.charAt(0).toUpperCase() + networkHealth.status.slice(1)}
            </span>
          )}

          <button
            onClick={forceUpdate}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {!compact && (
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {(['overview', 'performance', 'operators'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      {(compact || activeTab === 'overview') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Requests"
            value={networkStats.totalRequests.toLocaleString()}
            subtitle="All time"
            trend={statsComparison?.growth.totalRequests.startsWith('-') ? 'down' : 'up'}
            trendValue={statsComparison?.growth.totalRequests}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            loading={isLoading}
          />

          <StatsCard
            title="Pending Requests"
            value={networkStats.pendingRequests.toLocaleString()}
            subtitle="Awaiting fulfillment"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            loading={isLoading}
          />

          <StatsCard
            title="Success Rate"
            value={`${networkStats.successRate.toFixed(1)}%`}
            subtitle="Fulfillment success"
            trend={statsComparison?.growth.successRate.startsWith('-') ? 'down' : 'up'}
            trendValue={statsComparison?.growth.successRate}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            loading={isLoading}
          />

          <StatsCard
            title="Active Operators"
            value={networkStats.activeOperators.toLocaleString()}
            subtitle="Currently fulfilling"
            trend={statsComparison?.growth.activeOperators.startsWith('-') ? 'down' : 'up'}
            trendValue={statsComparison?.growth.activeOperators}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            loading={isLoading}
          />
        </div>
      )}

      {/* Performance Tab */}
      {!compact && activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Avg Fulfillment Time"
            value={`${Math.floor(networkStats.averageFulfillmentTime / 60)}m ${networkStats.averageFulfillmentTime % 60}s`}
            subtitle="Time to fulfill"
            trend={statsComparison?.growth.averageFulfillmentTime.startsWith('-') ? 'up' : 'down'} // Inverted for time
            trendValue={statsComparison?.growth.averageFulfillmentTime}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            loading={isLoading}
          />

          <StatsCard
            title="Total Fees Collected"
            value={`${formatFeeAmount(networkStats.totalFeesCollected)} ETH`}
            subtitle="Protocol revenue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
            loading={isLoading}
          />

          {networkHealth && (
            <StatsCard
              title="Network Latency"
              value={`${networkHealth.networkLatency}ms`}
              subtitle="Average response time"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              }
              loading={isLoading}
            />
          )}
        </div>
      )}

      {/* Operators Tab */}
      {!compact && activeTab === 'operators' && userActivity && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Your Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Requests Submitted"
              value={userActivity.requestsSubmitted.toString()}
              subtitle="Your randomness requests"
              loading={isLoading}
            />

            <StatsCard
              title="Requests Fulfilled"
              value={userActivity.requestsFulfilled.toString()}
              subtitle="Operated as fulfiller"
              loading={isLoading}
            />

            <StatsCard
              title="Net Fees"
              value={`${formatFeeAmount(userActivity.totalFeesEarned - userActivity.totalFeesSpent)} ETH`}
              subtitle={userActivity.totalFeesEarned > userActivity.totalFeesSpent ? "Net profit" : "Net spent"}
              trend={userActivity.totalFeesEarned > userActivity.totalFeesSpent ? 'up' : 'down'}
              loading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {showDetailedBreakdown && !compact && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Request Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fulfilled</span>
                <span className="font-mono text-green-600 dark:text-green-400">
                  {networkStats.fulfilledRequests.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Pending</span>
                <span className="font-mono text-yellow-600 dark:text-yellow-400">
                  {networkStats.pendingRequests.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Failed</span>
                <span className="font-mono text-red-600 dark:text-red-400">
                  {networkStats.failedRequests.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {networkHealth && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Network Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`font-medium ${
                    networkHealth.status === 'healthy' ? 'text-green-600 dark:text-green-400' :
                    networkHealth.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {networkHealth.status.charAt(0).toUpperCase() + networkHealth.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pending Backlog</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {networkHealth.pendingRequestsBacklog}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Operator Availability</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {networkHealth.operatorAvailability}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}