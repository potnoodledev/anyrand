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

  const { requests } = useRequestsQuery()
  const [selectedRequest, setSelectedRequest] = useState<RandomnessRequest | null>(null)
  const [recentFulfillment, setRecentFulfillment] = useState<FulfillRequestResult | null>(null)
  const [fulfillmentError, setFulfillmentError] = useState<ContractError | null>(null)

  // Auto-select request if requestId provided in URL
  React.useEffect(() => {
    if (requestIdParam && requests.data.length > 0) {
      const request = requests.data.find(r => r.id.toString() === requestIdParam)
      if (request && canFulfillRequest(request)) {
        setSelectedRequest(request)
      }
    }
  }, [requestIdParam, requests.data])

  // Filter fulfillable requests
  const fulfillableRequests = requests.data.filter(request =>
    canFulfillRequest(request) &&
    request.deadline < BigInt(Math.floor(Date.now() / 1000))
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

  const formatTransactionHash = (hash: string) => {
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
          {/* Left Column - Fulfillable Requests */}
          <div className="space-y-6">
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
                {requests.isLoading ? (
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No fulfillable requests</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      There are currently no requests past their deadline that can be fulfilled.
                    </p>
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