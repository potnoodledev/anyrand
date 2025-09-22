'use client'

import React, { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '../../../components/ui/toast'
import { useRequestsQuery } from '../../../hooks/anyrand/use-requests-query'
import { FulfillmentForm } from '../../../components/anyrand/fulfillment-form'
import { RandomnessRequest, RequestStatus, canFulfillRequest } from '../../../types/anyrand/randomness-request'
import { FulfillRequestResult, ContractError } from '../../../types/anyrand/frontend-api'

export default function FulfillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestIdParam = searchParams.get('requestId')
  const { addToast } = useToast()

  const {
    requests,
    blockInfo,
    currentBlockPage,
    goToNextBlockPage,
    goToPreviousBlockPage,
    goToBlockPage
  } = useRequestsQuery()
  const [selectedRequest, setSelectedRequest] = useState<RandomnessRequest | null>(null)
  const [recentFulfillment, setRecentFulfillment] = useState<FulfillRequestResult | null>(null)
  const [fulfillmentError, setFulfillmentError] = useState<ContractError | null>(null)
  const [isBlockPageChanging, setIsBlockPageChanging] = useState(false)

  // Auto-select request if requestId provided in URL
  React.useEffect(() => {
    if (requestIdParam && requests.data.length > 0) {
      const request = requests.data.find(r => r.id.toString() === requestIdParam)
      if (request && canFulfillRequest(request)) {
        setSelectedRequest(request)
      }
    }
  }, [requestIdParam, requests.data])

  // Filter fulfillable requests (deadline passed)
  const fulfillableRequests = requests.data.filter(request =>
    canFulfillRequest(request) &&
    request.deadline < BigInt(Math.floor(Date.now() / 1000))
  )

  // Filter pending requests with countdown (deadline not yet passed)
  const pendingRequests = requests.data.filter(request =>
    request.status === RequestStatus.Pending &&
    request.deadline >= BigInt(Math.floor(Date.now() / 1000))
  )

  const handleRequestSelect = useCallback((request: RandomnessRequest) => {
    setSelectedRequest(request)
    setRecentFulfillment(null)
    setFulfillmentError(null)
  }, [])

  const handleFulfillSuccess = useCallback((result: FulfillRequestResult) => {
    setRecentFulfillment(result)
    setFulfillmentError(null)
    setSelectedRequest(null)

    // Show success toast
    addToast({
      type: 'success',
      title: 'Request Fulfilled Successfully!',
      message: `Request #${result.requestId.toString()} has been fulfilled and you earned the operator reward`,
      duration: 5000
    })

    // Redirect to dashboard after showing success
    setTimeout(() => {
      router.push(`/anyrand?highlight=${result.requestId}`)
    }, 3000)
  }, [router, addToast])

  const handleFulfillError = useCallback((error: ContractError) => {
    setFulfillmentError(error)
    setRecentFulfillment(null)

    // Show error toast
    addToast({
      type: 'error',
      title: 'Fulfillment Failed',
      message: error.userMessage || error.message,
      autoClose: false // Keep error toasts open until manually closed
    })
  }, [addToast])

  const handleBackToDashboard = useCallback(() => {
    router.push('/anyrand')
  }, [router])

  const handleCancelFulfillment = useCallback(() => {
    setSelectedRequest(null)
    setFulfillmentError(null)
  }, [])

  // Wrapper functions for pagination that trigger loading state
  const handleGoToNextBlockPage = useCallback(() => {
    setIsBlockPageChanging(true)
    goToNextBlockPage()
  }, [goToNextBlockPage])

  const handleGoToPreviousBlockPage = useCallback(() => {
    setIsBlockPageChanging(true)
    goToPreviousBlockPage()
  }, [goToPreviousBlockPage])

  const handleGoToBlockPage = useCallback((page: number) => {
    setIsBlockPageChanging(true)
    goToBlockPage(page)
  }, [goToBlockPage])

  // Combined loading state
  const isLoading = requests.isLoading || isBlockPageChanging

  // Reset local loading state when requests finish loading
  React.useEffect(() => {
    if (!requests.isLoading && isBlockPageChanging) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsBlockPageChanging(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [requests.isLoading, isBlockPageChanging])

  const formatTransactionHash = (hash: string | undefined) => {
    if (!hash) return 'N/A'
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={handleBackToDashboard}
              className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Fulfill Randomness Requests
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Earn rewards by providing verifiable randomness to pending requests using DRAND beacon data.
          </p>

          {/* Block Range Info & Pagination */}
          <div className={`mt-4 p-4 border rounded-lg transition-all duration-200 ${
            isLoading
              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    Blockchain Search Range
                  </h3>
                  {isLoading && (
                    <div className="flex items-center space-x-1">
                      <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Searching...
                      </span>
                    </div>
                  )}
                </div>
                {blockInfo ? (
                  <div className={`space-y-1 text-xs transition-opacity duration-200 ${
                    isLoading ? 'text-blue-700 dark:text-blue-400' : 'text-blue-800 dark:text-blue-300'
                  }`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="font-medium">Current Block:</span> #{blockInfo.currentBlock.toString()}
                      </div>
                      <div>
                        <span className="font-medium">Searching:</span> #{blockInfo.fromBlock.toString()} - #{blockInfo.toBlock.toString()}
                      </div>
                      <div>
                        <span className="font-medium">Range:</span> {blockInfo.blockRange.toLocaleString()} blocks (~2h)
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div>
                        <span className="font-medium">Page:</span> {currentBlockPage + 1}
                      </div>
                      <div className={`transition-all duration-200 ${isLoading ? 'opacity-50' : ''}`}>
                        <span className="font-medium">Requests Found:</span> {isLoading ? '...' : requests.data.length}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Status:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isLoading
                            ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                            : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                        }`}>
                          {isLoading ? 'Loading' : 'Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-blue-800 dark:text-blue-300">
                    <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading blockchain data...</span>
                  </div>
                )}
              </div>

              {/* Block Pagination Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleGoToPreviousBlockPage}
                  disabled={currentBlockPage === 0 || isLoading}
                  className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                    isLoading
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : currentBlockPage === 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-1">
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>← Newer</span>
                    </span>
                  ) : (
                    '← Newer'
                  )}
                </button>
                <span className={`text-xs px-2 transition-opacity duration-200 ${
                  isLoading ? 'text-blue-600 dark:text-blue-400' : 'text-blue-800 dark:text-blue-300'
                }`}>
                  Page {currentBlockPage + 1}
                </span>
                <button
                  onClick={handleGoToNextBlockPage}
                  disabled={isLoading}
                  className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                    isLoading
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-1">
                      <span>Older →</span>
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  ) : (
                    'Older →'
                  )}
                </button>
              </div>
            </div>

            {/* Quick Jump Controls */}
            <div className={`mt-3 pt-3 border-t transition-opacity duration-200 ${
              isLoading ? 'border-blue-300 dark:border-blue-700' : 'border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center space-x-2 text-xs">
                <span className={`transition-opacity duration-200 ${
                  isLoading ? 'text-blue-600 dark:text-blue-400' : 'text-blue-800 dark:text-blue-300'
                }`}>
                  Quick jump:
                </span>
                <button
                  onClick={() => handleGoToBlockPage(0)}
                  disabled={currentBlockPage === 0 || isLoading}
                  className={`px-2 py-1 rounded transition-all duration-200 ${
                    isLoading
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : currentBlockPage === 0
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                >
                  Latest
                </button>
                <button
                  onClick={() => handleGoToBlockPage(12)}
                  disabled={isLoading}
                  className={`px-2 py-1 rounded transition-all duration-200 ${
                    isLoading
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                >
                  1 Day Ago
                </button>
                <button
                  onClick={() => handleGoToBlockPage(84)}
                  disabled={isLoading}
                  className={`px-2 py-1 rounded transition-all duration-200 ${
                    isLoading
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                >
                  1 Week Ago
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {recentFulfillment && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
                  Request Fulfilled Successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p className="mb-2">
                    You have successfully fulfilled request #{recentFulfillment.requestId.toString()} and earned the operator reward.
                  </p>
                  <div className="space-y-1">
                    <div>
                      <strong>Transaction:</strong>
                      <button
                        onClick={() => {
                          const explorerUrl = `https://sepolia.scrollscan.com/tx/${recentFulfillment.transactionHash}`
                          window.open(explorerUrl, '_blank')
                        }}
                        className="ml-2 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 underline"
                      >
                        {formatTransactionHash(recentFulfillment.transactionHash)}
                      </button>
                    </div>
                    <div>
                      <strong>Randomness:</strong> {recentFulfillment.randomness.toString().slice(0, 20)}...
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Redirecting to dashboard in 3 seconds...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {fulfillmentError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                  Fulfillment Failed
                </h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {fulfillmentError.userMessage || fulfillmentError.message}
                </p>
                {fulfillmentError.retry && (
                  <button
                    onClick={fulfillmentError.retry}
                    className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                )}
              </div>
              <button
                onClick={() => setFulfillmentError(null)}
                className="flex-shrink-0 ml-4 text-red-400 hover:text-red-500 dark:hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Requests */}
          <div className="space-y-6">
            {/* Fulfillable Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Fulfillable Requests
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                    {fulfillableRequests.length}
                  </span>
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Requests past their deadline that can be fulfilled for rewards
                </p>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse">
                        <div className="flex justify-between items-start mb-3">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : fulfillableRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      No fulfillable requests in current range
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {requests.data.length === 0
                        ? "No requests found in the current block range. Try searching older blocks using pagination above."
                        : `Found ${requests.data.length} request(s) but none are past their deadline yet.`
                      }
                    </p>
                    {requests.data.length === 0 && (
                      <div className="mt-4">
                        <button
                          onClick={handleGoToNextBlockPage}
                          disabled={isLoading}
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                            isLoading
                              ? 'text-gray-400 bg-gray-300 cursor-not-allowed'
                              : 'text-white bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isLoading ? (
                            <span className="flex items-center space-x-2">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Searching...</span>
                            </span>
                          ) : (
                            'Search Older Blocks'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fulfillableRequests.map((request) => (
                      <div
                        key={request.id.toString()}
                        className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                          selectedRequest?.id === request.id
                            ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleRequestSelect(request)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Request #{request.id.toString()}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Fulfillable
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Fee:</span>
                            <p className="font-mono text-gray-900 dark:text-white">
                              {(Number(request.feePaid) / 1e18).toFixed(4)} ETH
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Deadline Passed:</span>
                            <p className="text-gray-900 dark:text-white">
                              {Math.floor((Date.now() / 1000 - Number(request.deadline)) / 60)}m ago
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRequestSelect(request)
                            }}
                          >
                            Select to Fulfill →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Requests (Countdown) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending Requests
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                    {pendingRequests.length}
                  </span>
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Requests waiting for their deadline to pass
                </p>
              </div>

              <div className="p-6">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      No pending requests in current range
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {requests.data.length === 0
                        ? "No requests found in the current block range."
                        : "All requests in this range have either been fulfilled or deadlines have passed."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => {
                      const now = Math.floor(Date.now() / 1000)
                      const timeUntilDeadline = Number(request.deadline) - now
                      const minutes = Math.floor(timeUntilDeadline / 60)
                      const seconds = timeUntilDeadline % 60

                      return (
                        <div
                          key={request.id.toString()}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Request #{request.id.toString()}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Countdown
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Fee:</span>
                              <p className="font-mono text-gray-900 dark:text-white">
                                {(Number(request.feePaid) / 1e18).toFixed(4)} ETH
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Time Until Fulfillable:</span>
                              <p className="text-gray-900 dark:text-white font-mono">
                                {timeUntilDeadline > 0 ? `${minutes}m ${seconds}s` : 'Ready!'}
                              </p>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                              style={{
                                width: `${Math.max(0, Math.min(100, ((120 - timeUntilDeadline) / 120) * 100))}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200 mb-3">
                How Fulfillment Works
              </h3>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Select a request that has passed its deadline</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Review the cost/benefit analysis for profitability</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Submit fulfillment using DRAND beacon data</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Earn the operator reward minus gas costs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Fulfillment Form */}
          <div>
            {selectedRequest ? (
              <FulfillmentForm
                request={selectedRequest}
                onFulfillSuccess={handleFulfillSuccess}
                onFulfillError={handleFulfillError}
                onCancel={handleCancelFulfillment}
                disabled={!!recentFulfillment}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No Request Selected
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Select a fulfillable request from the list to begin the fulfillment process.
                  </p>
                  {fulfillableRequests.length > 0 && (
                    <button
                      onClick={() => handleRequestSelect(fulfillableRequests[0])}
                      className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Select First Request
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Statistics */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Fulfillment Statistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {fulfillableRequests.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Requests Ready
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {fulfillableRequests.reduce((sum, req) => sum + Number(req.feePaid), 0) / 1e18 > 0
                  ? (fulfillableRequests.reduce((sum, req) => sum + Number(req.feePaid), 0) / 1e18).toFixed(4)
                  : '0.0000'
                }
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Fees (ETH)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {requests.data.filter(r => r.status === RequestStatus.Fulfilled).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Fulfilled
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}