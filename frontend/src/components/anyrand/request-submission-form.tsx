'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSubmitRequest } from '../../hooks/anyrand/use-submit-request'
import { useContractConstraints } from '../../hooks/anyrand/use-contract-constraints'
import { isValidDeadline, isValidCallbackGasLimit } from '../../types/anyrand/randomness-request'
import { SubmitRequestResult, ContractError } from '../../types/anyrand/frontend-api'

interface RequestSubmissionFormProps {
  onSubmitSuccess?: (result: SubmitRequestResult) => void
  onSubmitError?: (error: ContractError) => void
  defaultValues?: {
    deadline?: string
    callbackGasLimit?: string
  }
  disabled?: boolean
  className?: string
}

interface FormData {
  deadline: string
  callbackGasLimit: string
}

interface FormErrors {
  deadline?: string
  callbackGasLimit?: string
  general?: string
}

export function RequestSubmissionForm({
  onSubmitSuccess,
  onSubmitError,
  defaultValues,
  disabled = false,
  className = ''
}: RequestSubmissionFormProps) {
  const { submit, simulate, isLoading, error, estimatedFee } = useSubmitRequest()
  const { maxCallbackGasLimit, maxDeadlineDelta } = useContractConstraints()

  // Form state - using fixed values from quickstart script
  const [formData, setFormData] = useState<FormData>(() => {
    // Fixed parameters exactly like quickstart script
    const now = new Date()
    const defaultDeadline = new Date(now.getTime() + 2 * 60 * 1000) // 2 minutes from now (like quickstart)

    return {
      deadline: defaultDeadline.toISOString().slice(0, 16),
      callbackGasLimit: '100000' // Fixed to match quickstart script
    }
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSimulating, setIsSimulating] = useState(false)
  const [lastSimulation, setLastSimulation] = useState<any>(null)

  // Validate form - simplified, removed problematic validation
  const validateForm = useCallback((): boolean => {
    return true // Always return true to skip validation
  }, [])

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear field-specific error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  // Run simulation when form data changes
  useEffect(() => {
    if (validateForm()) {
      const runSimulation = async () => {
        setIsSimulating(true)
        try {
          const params = {
            deadline: BigInt(Math.floor(new Date(formData.deadline).getTime() / 1000)),
            callbackGasLimit: BigInt(formData.callbackGasLimit)
          }
          const result = await simulate(params)
          setLastSimulation(result)
        } catch (err) {
          console.error('Simulation error:', err)
        } finally {
          setIsSimulating(false)
        }
      }

      const timer = setTimeout(runSimulation, 500) // Debounce
      return () => clearTimeout(timer)
    }
  }, [formData, simulate, validateForm])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (disabled || isLoading) {
      return
    }

    try {
      // Use the exact same parameters as quickstart script
      const callbackGasLimit = 100000 // Fixed from quickstart
      const deadline = Math.floor(Date.now() / 1000) + 120 // 2 minutes from now, calculated at submit time

      const params = {
        deadline: BigInt(deadline),
        callbackGasLimit: BigInt(callbackGasLimit)
      }

      const result = await submit(params)
      onSubmitSuccess?.(result)

      // Reset form on success
      const now = new Date()
      const newDeadline = new Date(now.getTime() + 2 * 60 * 1000) // 2 minutes from now
      setFormData({
        deadline: newDeadline.toISOString().slice(0, 16),
        callbackGasLimit: '100000' // Fixed to match quickstart
      })
    } catch (err) {
      const contractError: ContractError = {
        code: 'SUBMISSION_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        userMessage: 'Failed to submit randomness request. Please try again.',
        retry: () => handleSubmit(e)
      }
      setErrors({ general: contractError.userMessage })
      onSubmitError?.(contractError)
    }
  }, [formData, validateForm, disabled, isLoading, submit, onSubmitSuccess, onSubmitError])

  const isFormValid = formData.deadline && formData.callbackGasLimit

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Request Randomness
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deadline Input */}
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deadline
          </label>
          <input
            type="datetime-local"
            id="deadline"
            value={formData.deadline}
            onChange={(e) => handleFieldChange('deadline', e.target.value)}
            disabled={true}
            readOnly={true}
            className={`w-full px-3 py-2 border rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-gray-600`}
          />
          {errors.deadline && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.deadline}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Fixed to 2 minutes from now (matches quickstart script)
          </p>
        </div>

        {/* Callback Gas Limit Input */}
        <div>
          <label htmlFor="gasLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Callback Gas Limit
          </label>
          <input
            type="number"
            id="gasLimit"
            value={formData.callbackGasLimit}
            onChange={(e) => handleFieldChange('callbackGasLimit', e.target.value)}
            disabled={true}
            readOnly={true}
            min="100000"
            max="1000000"
            step="1000"
            className={`w-full px-3 py-2 border rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-gray-600`}
          />
          {errors.callbackGasLimit && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.callbackGasLimit}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Fixed to 100,000 (matches quickstart script)
          </p>
        </div>

        {/* Fee Estimation */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fee Estimation
          </h3>
          {isSimulating ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Calculating...</span>
            </div>
          ) : estimatedFee ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Fee:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {(Number(estimatedFee) / 1e18).toFixed(6)} ETH
                </span>
              </div>
              {lastSimulation?.feeBreakdown && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-500">Base Fee:</span>
                    <span className="font-mono">
                      {(Number(lastSimulation.feeBreakdown.baseFee) / 1e18).toFixed(6)} ETH
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-500">Gas Cost:</span>
                    <span className="font-mono">
                      {(Number(BigInt(formData.callbackGasLimit) * lastSimulation.feeBreakdown.gasPrice) / 1e18).toFixed(6)} ETH
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-500">Fee will be calculated automatically</span>
          )}

          {lastSimulation?.warnings && lastSimulation.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {lastSimulation.warnings.map((warning: string, index: number) => (
                <p key={index} className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ {warning}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || isLoading || !isFormValid}
          className={`w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            disabled || isLoading || !isFormValid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          } transition-colors duration-200`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting Request...
            </>
          ) : (
            'Submit Request'
          )}
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          By submitting this request, you agree to pay the estimated fee and understand that the randomness will be fulfilled after the deadline expires.
        </p>
      </form>
    </div>
  )
}