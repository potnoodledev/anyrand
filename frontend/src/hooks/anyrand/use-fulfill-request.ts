import { useState, useCallback } from 'react'
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import {
  FulfillRequestParams,
  FulfillRequestResult,
  RequestFulfillmentHook,
  ContractError
} from '../../types/anyrand/frontend-api'
import { canFulfillRequest, RandomnessRequest } from '../../types/anyrand/randomness-request'

// Contract ABI fragment for fulfillment
const ANYRAND_ABI = [
  {
    name: 'fulfillRandomness',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'requester', type: 'address' },
      { name: 'pubKeyHash', type: 'bytes32' },
      { name: 'round', type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint256' },
      { name: 'signature', type: 'uint256[2]' }
    ],
    outputs: [
      { name: 'randomness', type: 'uint256' }
    ]
  }
] as const

// Contract addresses by chain ID
const CONTRACT_ADDRESSES: Record<number, string> = {
  534351: process.env.NEXT_PUBLIC_ANYRAND_SCROLL_SEPOLIA_ADDRESS || '', // Scroll Sepolia
  31337: 'YOUR_LOCALHOST_ADDRESS' // localhost
}

export function useFulfillRequest(): RequestFulfillmentHook {
  const { address } = useAccount()
  const chainId = useChainId()
  const [error, setError] = useState<Error | null>(null)

  const contractAddress = CONTRACT_ADDRESSES[chainId]

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

  // Check if a request can be fulfilled
  const canFulfill = useCallback((requestId: bigint): boolean => {
    // In a real implementation, this would check:
    // 1. Request exists and is pending
    // 2. Deadline has passed
    // 3. User is not the original requester
    // 4. Request hasn't been fulfilled already

    // For now, return true as a placeholder
    return true
  }, [])

  // Generate mock DRAND data for testing
  const generateMockDrandData = useCallback(() => {
    const currentRound = BigInt(Math.floor(Date.now() / 30000)) // 30s rounds
    const mockRandomness = BigInt('0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''))

    return {
      round: currentRound,
      signature: [
        BigInt('0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')),
        BigInt('0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''))
      ] as [bigint, bigint],
      randomness: mockRandomness
    }
  }, [])

  // Fulfill function
  const fulfill = useCallback(async (params: FulfillRequestParams): Promise<FulfillRequestResult> => {
    try {
      setError(null)

      if (!contractAddress) {
        throw new Error('Contract not deployed on current network')
      }

      if (!address) {
        throw new Error('Wallet not connected')
      }

      if (!canFulfill(params.requestId)) {
        throw new Error('Request cannot be fulfilled')
      }

      // Generate mock DRAND data for the fulfillment
      const drandData = generateMockDrandData()

      // Submit the fulfillment transaction
      const txHash = await writeContract({
        address: contractAddress as `0x${string}`,
        abi: ANYRAND_ABI,
        functionName: 'fulfillRandomness',
        args: [
          params.requestId,
          params.requester,
          params.pubKeyHash,
          drandData.round,
          params.callbackGasLimit,
          params.signature
        ]
      })

      return {
        transactionHash: txHash,
        requestId: params.requestId,
        randomness: drandData.randomness
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    }
  }, [contractAddress, address, canFulfill, generateMockDrandData, writeContract])

  // Combine all errors
  const combinedError = error || writeError

  return {
    fulfill,
    isLoading,
    error: combinedError,
    canFulfill
  }
}

// Helper function to validate DRAND signature (mock implementation)
export function validateDrandSignature(
  round: bigint,
  signature: [bigint, bigint],
  pubKeyHash: string
): boolean {
  // In a real implementation, this would:
  // 1. Verify the BLS signature against the DRAND public key
  // 2. Check that the round is the correct one for the current time
  // 3. Validate the public key hash matches the expected value

  // For testing, always return true
  return true
}

// Helper function to calculate operator reward
export function calculateOperatorReward(
  feePaid: bigint,
  actualGasUsed: bigint,
  gasPrice: bigint
): bigint {
  const gasCost = actualGasUsed * gasPrice
  const operatorFee = feePaid - gasCost

  // Operator gets the remaining fee after gas costs
  return operatorFee > 0n ? operatorFee : 0n
}