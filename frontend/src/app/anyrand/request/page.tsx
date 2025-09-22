'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../components/ui/toast'
import { RequestSubmissionForm } from '../../../components/anyrand/request-submission-form'
import { SubmitRequestResult, ContractError } from '../../../types/anyrand/frontend-api'

export default function RequestPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [recentSubmission, setRecentSubmission] = useState<SubmitRequestResult | null>(null)
  const [submissionError, setSubmissionError] = useState<ContractError | null>(null)

  const handleSubmitSuccess = useCallback((result: SubmitRequestResult) => {
    setRecentSubmission(result)
    setSubmissionError(null)

    // Show success toast
    addToast({
      type: 'success',
      title: 'Request Submitted Successfully!',
      message: `Request #${result.requestId.toString()} has been submitted to the blockchain`,
      duration: 5000
    })

    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
      router.push(`/anyrand?highlight=${result.requestId}`)
    }, 3000)
  }, [router, addToast])

  const handleSubmitError = useCallback((error: ContractError) => {
    setSubmissionError(error)
    setRecentSubmission(null)

    // Show error toast
    addToast({
      type: 'error',
      title: 'Submission Failed',
      message: error.userMessage || error.message,
      autoClose: false // Keep error toasts open until manually closed
    })
  }, [addToast])

  const handleBackToDashboard = useCallback(() => {
    router.push('/anyrand')
  }, [router])

  const formatTransactionHash = (hash: string | undefined) => {
    if (!hash) return 'N/A'
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Request Verifiable Randomness
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Submit a request for cryptographically secure randomness using the DRAND beacon network.
          </p>
        </div>

        {/* Success Banner */}
        {recentSubmission && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
                  Request Submitted Successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p className="mb-2">
                    Your randomness request has been submitted to the blockchain.
                  </p>
                  <div className="space-y-1">
                    <div>
                      <strong>Request ID:</strong> #{recentSubmission.requestId.toString()}
                    </div>
                    <div>
                      <strong>Transaction:</strong>
                      <button
                        onClick={() => {
                          const explorerUrl = `https://sepolia.scrollscan.com/tx/${recentSubmission.transactionHash}`
                          window.open(explorerUrl, '_blank')
                        }}
                        className="ml-2 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 underline"
                      >
                        {formatTransactionHash(recentSubmission.transactionHash)}
                      </button>
                    </div>
                    <div>
                      <strong>Fee Paid:</strong> {(Number(recentSubmission.feePaid) / 1e18).toFixed(6)} ETH
                    </div>
                    <div>
                      <strong>Deadline:</strong> {new Date(Number(recentSubmission.deadline) * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Redirecting to dashboard in 5 seconds to view your request...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {submissionError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                  Submission Failed
                </h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {submissionError.userMessage || submissionError.message}
                </p>
                {submissionError.retry && (
                  <button
                    onClick={submissionError.retry}
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
                onClick={() => setSubmissionError(null)}
                className="flex-shrink-0 ml-4 text-red-400 hover:text-red-500 dark:hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* How it Works */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold">
                  1
                </div>
                <p>Submit your randomness request with a fee and deadline</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <p>Your request waits in the queue until the deadline passes</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <p>Operators fulfill your request using DRAND beacon data</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold">
                  4
                </div>
                <p>Verifiable randomness is delivered to your callback function</p>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Requirements
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Connected wallet with sufficient ETH</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Contract address to receive randomness</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Callback function with proper gas limit</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Deadline at least 1 minute in the future</span>
              </div>
            </div>
          </div>
        </div>

        {/* Request Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <RequestSubmissionForm
            onSubmitSuccess={handleSubmitSuccess}
            onSubmitError={handleSubmitError}
            disabled={!!recentSubmission}
            className="max-w-2xl"
          />
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                About DRAND Randomness
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                DRAND is a distributed randomness beacon providing publicly verifiable, unbiased, and unpredictable random values.
                The randomness generated is cryptographically secure and cannot be manipulated by any single party.
              </p>
              <a
                href="https://drand.love"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 mt-2"
              >
                Learn more about DRAND
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}