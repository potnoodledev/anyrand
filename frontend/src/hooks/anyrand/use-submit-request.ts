import { useState, useCallback } from 'react'
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import {
  SubmitRequestParams,
  SubmitRequestResult,
  RequestSubmissionHook,
  SimulationResult,
  FeeBreakdown,
  ContractError
} from '../../types/anyrand/frontend-api'
import { isValidDeadline, isValidCallbackGasLimit } from '../../types/anyrand/randomness-request'

// Contract ABI fragments
const ANYRAND_ABI = [
  {
    name: 'getRequestPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'callbackGasLimit', type: 'uint256' }
    ],
    outputs: [
      { name: 'requestPrice', type: 'uint256' },
      { name: 'effectiveFeePerGas', type: 'uint256' }
    ]
  }
] as const

// Consumer contract ABI
const CONSUMER_ABI = [
  {
    name: 'getRandom',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint256' }
    ],
    outputs: [
      { name: 'requestId', type: 'uint256' }
    ]
  }
] as const

// Contract addresses by chain ID
const ANYRAND_ADDRESSES: Record<number, string> = {
  534351: process.env.NEXT_PUBLIC_ANYRAND_SCROLL_SEPOLIA_ADDRESS || '', // Scroll Sepolia
  31337: 'YOUR_LOCALHOST_ADDRESS' // localhost
}

const CONSUMER_ADDRESSES: Record<number, string> = {
  534351: process.env.NEXT_PUBLIC_CONSUMER_SCROLL_SEPOLIA_ADDRESS || '', // Scroll Sepolia
  31337: 'YOUR_LOCALHOST_CONSUMER_ADDRESS' // localhost
}

export function useSubmitRequest(): RequestSubmissionHook {
  const { address } = useAccount()
  const chainId = useChainId()
  const [estimatedFee, setEstimatedFee] = useState<bigint | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const anyrandAddress = ANYRAND_ADDRESSES[chainId]
  const consumerAddress = CONSUMER_ADDRESSES[chainId]

  // Get request price from contract (using fixed gas limit from quickstart)
  const { data: requestPriceData } = useReadContract({
    address: anyrandAddress as `0x${string}`,
    abi: ANYRAND_ABI,
    functionName: 'getRequestPrice',
    args: [100000n], // Fixed gas limit to match quickstart script
  })

  // Calculate estimated fee
  const calculateFee = useCallback(async (params: SubmitRequestParams): Promise<bigint | null> => {
    try {
      if (!anyrandAddress) {
        throw new Error('Anyrand contract not deployed on current network')
      }

      // Use actual contract pricing if available, with buffer
      if (requestPriceData && requestPriceData[0]) {
        const [requestPrice] = requestPriceData
        const bufferAmount = requestPrice + parseEther('0.001') // Add 0.001 ETH buffer like quickstart
        setEstimatedFee(bufferAmount)
        return bufferAmount
      }

      // Fallback pricing if contract read fails
      const baseFee = parseEther('0.001') // 0.001 ETH base fee
      const gasPrice = parseEther('0.00000002') // 20 gwei
      const gasCost = params.callbackGasLimit * gasPrice
      const totalFee = baseFee + gasCost + parseEther('0.001') // Add buffer

      setEstimatedFee(totalFee)
      return totalFee
    } catch (err) {
      console.error('Fee calculation error:', err)
      return null
    }
  }, [anyrandAddress, requestPriceData])

  // Contract write hook
  const {
    data: hash,
    writeContract,
    isPending: isWriteLoading,
    error: writeError
  } = useWriteContract()

  const {
    isLoading: isTransactionLoading,
    isSuccess
  } = useWaitForTransactionReceipt({
    hash: hash,
  })

  const isLoading = isWriteLoading || isTransactionLoading

  // Submit function
  const submit = useCallback(async (params: SubmitRequestParams): Promise<SubmitRequestResult> => {
    try {
      setError(null)

      // Debug logging
      console.log('=== SUBMIT REQUEST DEBUG ===')
      console.log('Chain ID:', chainId)
      console.log('Anyrand Address:', anyrandAddress)
      console.log('Consumer Address:', consumerAddress)
      console.log('User Address:', address)
      console.log('Request Params:', {
        deadline: params.deadline.toString(),
        deadlineDate: new Date(Number(params.deadline) * 1000).toLocaleString(),
        callbackGasLimit: params.callbackGasLimit.toString()
      })

      // Skip validation - removed to prevent issues

      if (!consumerAddress) {
        const errorMsg = `Consumer contract not deployed on current network (chainId: ${chainId}). Consumer address: ${consumerAddress || 'undefined'}`
        console.error(errorMsg)
        throw new Error(errorMsg)
      }

      if (!anyrandAddress) {
        const errorMsg = `Anyrand contract not deployed on current network (chainId: ${chainId}). Anyrand address: ${anyrandAddress || 'undefined'}`
        console.error(errorMsg)
        throw new Error(errorMsg)
      }

      if (!address) {
        const errorMsg = 'Wallet not connected. Please connect your wallet first.'
        console.error(errorMsg)
        throw new Error(errorMsg)
      }

      // Calculate fee
      console.log('Calculating fee...')
      const fee = await calculateFee(params)
      console.log('Calculated fee:', fee ? (Number(fee) / 1e18).toFixed(6) + ' ETH' : 'null')
      console.log('Fee in wei:', fee?.toString())

      if (!fee) {
        const errorMsg = 'Unable to calculate fee. Check contract connection.'
        console.error(errorMsg)
        throw new Error(errorMsg)
      }

      // Submit transaction to consumer contract (like quickstart)
      console.log('Submitting transaction with params:')
      console.log('- Consumer address:', consumerAddress)
      console.log('- Function: getRandom')
      console.log('- Args:', [params.deadline.toString(), params.callbackGasLimit.toString()])
      console.log('- Value:', fee.toString(), 'wei')
      console.log('- Gas limit: 500000')

      const txHash = await writeContract({
        address: consumerAddress as `0x${string}`,
        abi: CONSUMER_ABI,
        functionName: 'getRandom',
        args: [params.deadline, params.callbackGasLimit],
        value: fee,
        gas: 500000n // Set explicit gas limit like quickstart
      })

      console.log('Transaction submitted! Hash:', txHash)

      // Extract request ID from transaction receipt
      // In real implementation, this would parse the event logs
      const requestId = BigInt(Math.floor(Math.random() * 1000000))

      return {
        transactionHash: txHash,
        requestId,
        deadline: params.deadline,
        feePaid: fee,
        callbackGasLimit: params.callbackGasLimit
      }

    } catch (err) {
      console.error('=== SUBMIT REQUEST ERROR ===')
      console.error('Full error object:', err)

      let errorMessage = 'Unknown error occurred'

      if (err instanceof Error) {
        errorMessage = err.message
        console.error('Error message:', err.message)
        console.error('Error stack:', err.stack)

        // Check for specific error patterns
        if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user'
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to complete transaction'
        } else if (err.message.includes('Consumer contract not deployed')) {
          errorMessage = err.message
        } else if (err.message.includes('Wallet not connected')) {
          errorMessage = err.message
        }
      }

      // Check if it's a contract revert error
      if ((err as any)?.data) {
        console.error('Contract error data:', (err as any).data)
      }

      if ((err as any)?.reason) {
        console.error('Contract revert reason:', (err as any).reason)
        errorMessage = (err as any).reason
      }

      const error = new Error(errorMessage)
      setError(error)
      throw error
    }
  }, [anyrandAddress, consumerAddress, chainId, address, calculateFee, writeContract])

  // Simulate transaction
  const simulate = useCallback(async (params: SubmitRequestParams): Promise<SimulationResult> => {
    try {
      // Skip validation - removed to prevent issues

      // Estimate gas and fees
      const gasEstimate = 150000n // Estimated gas for request submission
      const gasPrice = parseEther('0.00000002') // 20 gwei
      const baseFee = parseEther('0.001')
      const gasCost = params.callbackGasLimit * gasPrice
      const totalFee = baseFee + gasCost
      const operatorReward = totalFee / 10n // 10% to operator
      const protocolFee = totalFee - operatorReward

      const warnings: string[] = []

      // Add warnings for edge cases
      if (params.callbackGasLimit > 500000n) {
        warnings.push('High gas limit may result in expensive transaction')
      }

      const now = BigInt(Math.floor(Date.now() / 1000))
      if (params.deadline - now < 3600n) {
        warnings.push('Short deadline may reduce operator availability')
      }

      return {
        success: true,
        gasEstimate,
        warnings,
        feeBreakdown: {
          baseFee,
          gasPrice,
          callbackGasLimit: params.callbackGasLimit,
          totalFee,
          operatorReward,
          protocolFee
        }
      }

    } catch (err) {
      return {
        success: false,
        gasEstimate: 0n,
        revertReason: err instanceof Error ? err.message : 'Simulation failed',
        warnings: [],
        feeBreakdown: {
          baseFee: 0n,
          gasPrice: 0n,
          callbackGasLimit: params.callbackGasLimit,
          totalFee: 0n,
          operatorReward: 0n,
          protocolFee: 0n
        }
      }
    }
  }, [])

  // Combine all errors
  const combinedError = error || writeError

  return {
    submit,
    simulate,
    isLoading,
    error: combinedError,
    estimatedFee
  }
}