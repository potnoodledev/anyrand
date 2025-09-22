'use client'

import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { NetworkStats } from '../../components/anyrand/network-stats'
import { RequestList } from '../../components/anyrand/request-list'
import { useRequestsQuery } from '../../hooks/anyrand/use-requests-query'
import { RequestStatus } from '../../types/anyrand/randomness-request'
import Link from 'next/link'

export default function AnyrandDashboard() {
  const { address, isConnected } = useAccount()
  const { requests } = useRequestsQuery()
  const [activeView, setActiveView] = useState<'overview' | 'my-requests' | 'pending'>('overview')

  // Get user's recent requests
  const userRequests = requests.data.filter(req =>
    address && req.requester.toLowerCase() === address.toLowerCase()
  ).slice(0, 5)

  // Get pending requests (fulfillable)
  const pendingRequests = requests.data.filter(req =>
    req.status === RequestStatus.Pending
  ).slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Anyrand Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Decentralized verifiable randomness for your applications
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/anyrand/request">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 cursor-pointer border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Request Randomness
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Submit a new randomness request
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/anyrand/fulfill">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 cursor-pointer border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Fulfill Requests
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Operate as a randomness provider
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Network Stats
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View network performance metrics
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Statistics */}
        <div className="mb-8">
          <NetworkStats compact={true} />
        </div>

        {/* Wallet Connection Check */}
        {!isConnected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Wallet Not Connected
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Connect your wallet to submit randomness requests and earn rewards as an operator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveView('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Overview
              </button>

              {isConnected && (
                <button
                  onClick={() => setActiveView('my-requests')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'my-requests'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  My Requests ({userRequests.length})
                </button>
              )}

              <button
                onClick={() => setActiveView('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'pending'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Pending Requests ({pendingRequests.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Requests
                </h2>
                <Link
                  href="/anyrand/history"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  View All
                </Link>
              </div>

              {requests.data.length > 0 ? (
                <RequestList
                  className=""
                  onRequestClick={(request) => {
                    // Navigate to request details
                    window.location.href = `/anyrand/request/${request.id}`
                  }}
                />
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No requests yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by submitting your first randomness request.
                  </p>
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                How It Works
              </h2>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-medium">
                      1
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Submit Request</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Send a randomness request with your desired parameters and fee.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                      2
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Wait for Deadline</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your request becomes fulfillable after the specified deadline.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-sm font-medium">
                      3
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Get Randomness</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Operators fulfill your request using DRAND beacon randomness.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="mb-2">
                    <strong>Powered by DRAND:</strong> Verifiable, unbiased, and publicly available randomness.
                  </p>
                  <p>
                    <strong>Decentralized:</strong> Multiple operators compete to fulfill requests for rewards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'my-requests' && isConnected && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              My Requests
            </h2>

            {userRequests.length > 0 ? (
              <RequestList
                showUserOnly={true}
                onRequestClick={(request) => {
                  window.location.href = `/anyrand/request/${request.id}`
                }}
              />
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No requests found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  You haven&apos;t submitted any randomness requests yet.
                </p>
                <div className="mt-6">
                  <Link
                    href="/anyrand/request"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Submit Your First Request
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'pending' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Pending Requests
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Fulfillable requests awaiting operators
              </div>
            </div>

            {pendingRequests.length > 0 ? (
              <RequestList
                filters={{ status: [RequestStatus.Pending] }}
                onRequestClick={(request) => {
                  window.location.href = `/anyrand/fulfill?request=${request.id}`
                }}
              />
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No pending requests</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  All current requests have been fulfilled or are not yet ready for fulfillment.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}