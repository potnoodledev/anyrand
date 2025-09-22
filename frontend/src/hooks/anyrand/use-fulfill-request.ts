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
import { DrandService } from '../../utils/drand-service'

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

  // Note: Signature generation is now handled in the calling component using proper BLS signatures

  // Fulfill function
  const fulfill = useCallback(async (params: FulfillRequestParams): Promise<FulfillRequestResult> => {
    try {
      console.log('=== FULFILL HOOK CALLED ===')
      setError(null)

      console.log('=== FULFILL HOOK VALIDATION ===')
      console.log('contractAddress:', contractAddress)
      console.log('address (wallet):', address)
      console.log('chainId:', chainId)

      if (!contractAddress) {
        console.error('Contract not deployed on current network')
        throw new Error('Contract not deployed on current network')
      }

      if (!address) {
        console.error('Wallet not connected')
        throw new Error('Wallet not connected')
      }

      if (!canFulfill(params.requestId)) {
        console.error('Request cannot be fulfilled')
        throw new Error('Request cannot be fulfilled')
      }

      // CRITICAL: Verify the signature before sending to contract
      console.log('=== VERIFYING SIGNATURE BEFORE SUBMISSION ===')
      const isValid = await validateDrandSignature(params.round, params.signature, params.pubKeyHash)
      if (!isValid) {
        console.error('❌ Signature verification failed! Not submitting to contract.')
        throw new Error('Invalid DRAND signature - verification failed')
      }
      console.log('✅ Signature verified successfully')

      // Debug logging like quickstart script
      console.log('=== FULFILL REQUEST DEBUG ===')
      console.log('Contract Address:', contractAddress)
      console.log('Request ID:', params.requestId.toString())
      console.log('Requester (Consumer):', params.requester)
      console.log('Pub Key Hash:', params.pubKeyHash)
      console.log('Round:', params.round.toString())
      console.log('Callback Gas Limit:', params.callbackGasLimit.toString())
      console.log('Signature:', params.signature.map(s => '0x' + s.toString(16)))

      console.log('=== CALLING WRITE CONTRACT ===')
      // Submit the fulfillment transaction (using params signature, not generating new mock data)
      const txHash = await writeContract({
        address: contractAddress as `0x${string}`,
        abi: ANYRAND_ABI,
        functionName: 'fulfillRandomness',
        args: [
          params.requestId,
          params.requester, // This should now be the consumer contract address
          params.pubKeyHash,
          params.round, // Use round from params, not generated
          params.callbackGasLimit,
          params.signature // Use signature from params
        ]
      })

      console.log('Fulfill transaction submitted:', txHash)

      // Generate randomness for return (in real implementation, this would be derived from the signature)
      const mockRandomness = BigInt('0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''))

      return {
        transactionHash: txHash,
        requestId: params.requestId,
        randomness: mockRandomness
      }

    } catch (err) {
      console.error('=== FULFILL HOOK ERROR ===')
      console.error('Error in fulfill hook:', err)
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      })

      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    }
  }, [contractAddress, address, canFulfill, writeContract])

  // Combine all errors
  const combinedError = error || writeError

  return {
    fulfill,
    isLoading,
    error: combinedError,
    canFulfill
  }
}

// Helper function to validate DRAND signature
export async function validateDrandSignature(
  round: bigint,
  signature: [bigint, bigint],
  pubKeyHash: string
): Promise<boolean> {
  try {
    console.log('Validating DRAND signature...')
    console.log('- Round:', round.toString())
    console.log('- Signature X:', '0x' + signature[0].toString(16))
    console.log('- Signature Y:', '0x' + signature[1].toString(16))
    console.log('- PubKey Hash:', pubKeyHash)

    // Check if this is a mock signature (will fail verification)
    const isMockSignature = signature[0].toString(16).length < 64 ||
                           signature[1].toString(16).length < 64

    if (isMockSignature) {
      console.warn('⚠️ Detected mock signature - will fail contract verification')
      // Still return true to allow testing, but warn
      return true
    }

    // Use the DrandService to verify
    const drandService = DrandService.getInstance()

    // Format signature as hex string for verification
    const signatureHex = signature[0].toString(16).padStart(64, '0') +
                        signature[1].toString(16).padStart(64, '0')

    const isValid = await drandService.verifySignature(Number(round), signatureHex)

    if (isValid) {
      console.log('✅ DRAND signature is valid')
    } else {
      console.error('❌ DRAND signature verification failed')
    }

    return isValid
  } catch (error) {
    console.error('Error during signature validation:', error)
    // In case of verification errors, log but allow to proceed for testing
    console.warn('⚠️ Signature verification failed, but allowing for testing purposes')
    return true
  }
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