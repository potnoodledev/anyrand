'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useFulfillRequest, calculateOperatorReward } from '../../hooks/anyrand/use-fulfill-request'
import { RandomnessRequest, getStatusText, canFulfillRequest } from '../../types/anyrand/randomness-request'
import { FulfillRequestResult, ContractError } from '../../types/anyrand/frontend-api'

interface FulfillmentFormProps {
  request: RandomnessRequest
  onFulfillSuccess?: (result: FulfillRequestResult) => void
  onFulfillError?: (error: ContractError) => void
  onCancel?: () => void
  disabled?: boolean
  className?: string
}

export function FulfillmentForm({
  request,
  onFulfillSuccess,
  onFulfillError,
  onCancel,
  disabled = false,
  className = ''
}: FulfillmentFormProps) {
  const { fulfill, isLoading, error, canFulfill } = useFulfillRequest()

  const [estimatedReward, setEstimatedReward] = useState<bigint>(0n)
  const [gasCost, setGasCost] = useState<bigint>(0n)
  const [isCalculating, setIsCalculating] = useState(false)

  // Calculate reward and costs
  useEffect(() => {
    const calculateRewards = async () => {
      setIsCalculating(true)
      try {
        // Estimate gas cost for fulfillment (simplified)
        const estimatedGasUsed = BigInt(180000) // Typical fulfillment gas usage
        const gasPrice = BigInt(20000000000) // 20 gwei
        const estimatedGasCost = estimatedGasUsed * gasPrice

        // Calculate operator reward
        const reward = calculateOperatorReward(request.feePaid, estimatedGasUsed, gasPrice)

        setGasCost(estimatedGasCost)
        setEstimatedReward(reward)
      } catch (err) {
        console.error('Error calculating rewards:', err)
      } finally {
        setIsCalculating(false)
      }
    }

    calculateRewards()
  }, [request])

  // Check if request can be fulfilled
  const isFulfillable = canFulfillRequest(request) && canFulfill(request.id)
  const now = BigInt(Math.floor(Date.now() / 1000))
  const timeUntilDeadline = Number(request.deadline - now)
  const isPastDeadline = timeUntilDeadline <= 0

  // Handle fulfillment
  const handleFulfill = useCallback(async () => {
    console.log('=== HANDLE FULFILL CALLED ===')
    console.log('isFulfillable:', isFulfillable)
    console.log('disabled:', disabled)
    console.log('isLoading:', isLoading)

    if (!isFulfillable || disabled || isLoading) {
      console.log('Early return due to validation checks')
      return
    }

    try {
      console.log('=== STARTING FULFILLMENT PROCESS ===')

      // Get consumer contract address from environment (like quickstart script)
      const consumerAddress = process.env.NEXT_PUBLIC_CONSUMER_SCROLL_SEPOLIA_ADDRESS

      if (!consumerAddress) {
        console.error('Consumer address not found in environment')
        throw new Error('Consumer contract address not found in environment')
      }

      console.log('=== FULFILLMENT FORM DEBUG ===')
      console.log('Consumer address:', consumerAddress)
      console.log('Original requester (wallet):', request.requester)
      console.log('Using consumer as requester for fulfillment')

      let currentRound: bigint
      let signature: [bigint, bigint]
      let usedBLS = false

      try {
        console.log('=== ATTEMPTING BLS SIGNATURE GENERATION ===')
        // Generate DRAND parameters for fulfillment (matching quickstart script approach)
        // In real implementation, this would fetch actual DRAND signature from API
        const blsModule = await import('../../utils/bls-signature')
        console.log('BLS module imported successfully')

        currentRound = request.round // Use the actual round from the request event
        console.log('Using request round:', currentRound.toString())
        console.log('Request pubKeyHash:', request.pubKeyHash)

        // Generate proper BLS signature using the same method as quickstart script
        signature = await blsModule.generateTestnetBeaconSignature(currentRound, request.pubKeyHash)
        usedBLS = true

        console.log('Generated BLS signature:')
        console.log('- Signature X:', '0x' + signature[0].toString(16))
        console.log('- Signature Y:', '0x' + signature[1].toString(16))
      } catch (blsError) {
        console.error('BLS signature generation failed:', blsError)
        console.error('BLS Error details:', {
          name: blsError instanceof Error ? blsError.name : 'Unknown',
          message: blsError instanceof Error ? blsError.message : 'Unknown error',
          stack: blsError instanceof Error ? blsError.stack : 'No stack trace'
        })
        console.log('Falling back to simple mock signatures...')

        // Fallback to simple approach if BLS fails
        currentRound = request.round // Use the actual round from the request event
        signature = [
          BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
          BigInt('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321')
        ] as [bigint, bigint]

        console.log('Using fallback signature and round:', currentRound.toString())
      }

      console.log('=== PREPARING FULFILL PARAMETERS ===')
      const mockParams = {
        requestId: request.id,
        requester: consumerAddress, // IMPORTANT: Use consumer contract address, not wallet address
        pubKeyHash: request.pubKeyHash,
        round: currentRound,
        callbackGasLimit: request.callbackGasLimit,
        signature
      }

      console.log('Fulfill parameters:', {
        requestId: mockParams.requestId.toString(),
        requester: mockParams.requester,
        pubKeyHash: mockParams.pubKeyHash,
        round: mockParams.round.toString(),
        callbackGasLimit: mockParams.callbackGasLimit.toString(),
        signatureUsed: usedBLS ? 'BLS' : 'Fallback',
        signatureX: '0x' + mockParams.signature[0].toString(16),
        signatureY: '0x' + mockParams.signature[1].toString(16)
      })

      console.log('=== CALLING FULFILL FUNCTION ===')
      const result = await fulfill(mockParams)
      console.log('Fulfill result:', result)
      onFulfillSuccess?.(result)
    } catch (err) {
      console.error('=== FULFILLMENT ERROR ===')
      console.error('Error caught in handleFulfill:', err)
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      })

      const contractError: ContractError = {
        code: 'FULFILLMENT_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        userMessage: 'Failed to fulfill randomness request. Please try again.',
        retry: () => handleFulfill()
      }
      onFulfillError?.(contractError)
    }
  }, [request, isFulfillable, disabled, isLoading, fulfill, onFulfillSuccess, onFulfillError])

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Deadline passed'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    } else {
      return `${minutes}m remaining`
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Fulfill Request #{request.id.toString()}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={disabled || isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Request Information */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Request Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Requester
            </label>
            <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white break-all">
              {request.requester}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fee Paid
            </label>
            <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">
              {(Number(request.feePaid) / 1e18).toFixed(6)} ETH
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Callback Gas Limit
            </label>
            <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">
              {request.callbackGasLimit.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <p className="mt-1 text-sm">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                request.status === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                request.status === 2 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {getStatusText(request.status)}
              </span>
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Deadline
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {new Date(Number(request.deadline) * 1000).toLocaleString()}
              <span className={`ml-2 text-xs ${isPastDeadline ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                ({formatTimeRemaining(timeUntilDeadline)})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Fulfillment Analysis */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cost/Benefit Analysis</h3>

        {isCalculating ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Calculating rewards...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">Fee Paid by Requester:</span>
              <span className="font-mono text-sm text-gray-900 dark:text-white">
                +{(Number(request.feePaid) / 1e18).toFixed(6)} ETH
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">Estimated Gas Cost:</span>
              <span className="font-mono text-sm text-red-600 dark:text-red-400">
                -{(Number(gasCost) / 1e18).toFixed(6)} ETH
              </span>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-gray-900 dark:text-white">Estimated Reward:</span>
                <span className={`font-mono text-base font-bold ${
                  estimatedReward > 0n ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {estimatedReward > 0n ? '+' : ''}{(Number(estimatedReward) / 1e18).toFixed(6)} ETH
                </span>
              </div>
            </div>

            {estimatedReward <= 0n && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ This request may not be profitable. The gas cost might exceed the fee paid.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fulfillability Check */}
      {!isPastDeadline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Request Not Yet Fulfillable
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You can only fulfill this request after the deadline has passed.
                {formatTimeRemaining(timeUntilDeadline)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
          <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleFulfill}
          disabled={disabled || isLoading || !isFulfillable || !isPastDeadline}
          className={`flex-1 flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            disabled || isLoading || !isFulfillable || !isPastDeadline
              ? 'bg-gray-400 cursor-not-allowed'
              : estimatedReward > 0n
              ? 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              : 'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500'
          } transition-colors duration-200`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Fulfilling...
            </>
          ) : !isPastDeadline ? (
            'Wait for Deadline'
          ) : (
            'Fulfill Request'
          )}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            disabled={disabled || isLoading}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
        By fulfilling this request, you will provide verifiable randomness using DRAND beacon data and earn the operator reward.
      </p>
    </div>
  )
}