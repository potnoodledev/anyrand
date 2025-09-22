import { useReadContract, useChainId } from 'wagmi'
import { SUPPORTED_CHAINS } from '../../lib/constants'

export interface ContractConstraints {
  maxCallbackGasLimit: bigint
  maxDeadlineDelta: bigint
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useContractConstraints(): ContractConstraints {
  const chainId = useChainId()
  const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId)

  const { data: maxCallbackGasLimit, isLoading: isLoadingGasLimit, isError: isErrorGasLimit, error: errorGasLimit } = useReadContract({
    address: currentChain?.contracts?.anyrand?.address,
    abi: [
      {
        inputs: [],
        name: 'maxCallbackGasLimit',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ] as const,
    functionName: 'maxCallbackGasLimit'
  })

  const { data: maxDeadlineDelta, isLoading: isLoadingDeadline, isError: isErrorDeadline, error: errorDeadline } = useReadContract({
    address: currentChain?.contracts?.anyrand?.address,
    abi: [
      {
        inputs: [],
        name: 'maxDeadlineDelta',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ] as const,
    functionName: 'maxDeadlineDelta'
  })

  return {
    maxCallbackGasLimit: maxCallbackGasLimit || 1000000n, // Default fallback
    maxDeadlineDelta: maxDeadlineDelta || 604800n, // Default fallback (7 days)
    isLoading: isLoadingGasLimit || isLoadingDeadline,
    isError: isErrorGasLimit || isErrorDeadline,
    error: errorGasLimit || errorDeadline || null
  }
}