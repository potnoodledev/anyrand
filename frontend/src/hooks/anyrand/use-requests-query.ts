import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount, useChainId, useContractRead, useWatchContractEvent } from 'wagmi'
import { Address } from 'viem'
import {
  PaginatedQuery,
  RequestQueryFilters,
  RequestQueryParams,
  RequestsQueryHook
} from '../../types/anyrand/frontend-api'
import { RandomnessRequest, RequestStatus } from '../../types/anyrand/randomness-request'

// Contract ABI fragments for reading
const ANYRAND_ABI = [
  {
    name: 'getRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'requester', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'callbackGasLimit', type: 'uint256' },
          { name: 'feePaid', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'transactionHash', type: 'bytes32' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' }
        ]
      }
    ]
  },
  {
    name: 'getRequestCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint256' }]
  },
  {
    name: 'RandomnessRequested',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'requester', type: 'address', indexed: true },
      { name: 'deadline', type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint256' },
      { name: 'feePaid', type: 'uint256' }
    ]
  }
] as const

// Contract addresses by chain ID
const CONTRACT_ADDRESSES: Record<number, string> = {
  534351: process.env.NEXT_PUBLIC_ANYRAND_SCROLL_SEPOLIA_ADDRESS || '', // Scroll Sepolia
  31337: 'YOUR_LOCALHOST_ADDRESS' // localhost
}

export function useRequestsQuery(): RequestsQueryHook {
  const { address } = useAccount()
  const chainId = useChainId()
  const [queryParams, setQueryParams] = useState<RequestQueryParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'timestamp',
    sortDirection: 'desc'
  })

  const contractAddress = CONTRACT_ADDRESSES[chainId]

  // Get total request count
  const { data: totalRequests } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: ANYRAND_ABI,
    functionName: 'getRequestCount',
    enabled: Boolean(contractAddress),
    watch: true
  })

  // Generate mock request data for testing
  const generateMockRequests = useCallback((count: number, filters?: RequestQueryFilters): RandomnessRequest[] => {
    const requests: RandomnessRequest[] = []
    const now = Math.floor(Date.now() / 1000)

    for (let i = 1; i <= count; i++) {
      const timestamp = now - (i * 3600) // Each request 1 hour apart
      const status = i % 4 // Cycle through status values
      const requester = `0x${(i * 1234567890).toString(16).padStart(40, '0')}` as Address

      // Apply filters
      if (filters?.requester && requester !== filters.requester) continue
      if (filters?.status && !filters.status.includes(status)) continue
      if (filters?.fromTimestamp && BigInt(timestamp) < filters.fromTimestamp) continue
      if (filters?.toTimestamp && BigInt(timestamp) > filters.toTimestamp) continue

      const request: RandomnessRequest = {
        id: BigInt(i),
        requester,
        deadline: BigInt(timestamp + 7200), // 2 hours after creation
        callbackGasLimit: BigInt(200000),
        feePaid: BigInt(1000000000000000 + i * 100000000000000), // Varying fees
        effectiveFeePerGas: BigInt(20000000000), // 20 gwei
        status: status as RequestStatus,
        transactionHash: `0x${(i * 987654321).toString(16).padStart(64, '0')}` as any,
        blockNumber: BigInt(18000000 + i),
        timestamp: BigInt(timestamp),
        pubKeyHash: `0x${i.toString(16).padStart(64, '0')}` as any
      }

      // Add fulfillment data for fulfilled requests
      if (status === RequestStatus.Fulfilled) {
        request.fulfillment = {
          requestId: BigInt(i),
          randomness: BigInt('0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')),
          operator: `0x${((i + 1000) * 1234567890).toString(16).padStart(40, '0')}` as Address,
          callbackSuccess: true,
          actualGasUsed: BigInt(180000),
          transactionHash: `0x${((i + 1000) * 987654321).toString(16).padStart(64, '0')}` as any,
          blockNumber: BigInt(18000000 + i + 1),
          timestamp: BigInt(timestamp + 1800), // 30 min after request
          round: BigInt(Math.floor(timestamp / 30)), // DRAND round
          signature: [BigInt(i * 1111), BigInt(i * 2222)]
        }
      }

      requests.push(request)
    }

    return requests
  }, [])

  // Main requests query
  const requestsQuery = useQuery({
    queryKey: ['anyrand', 'requests', chainId, queryParams],
    queryFn: async (): Promise<PaginatedQuery<RandomnessRequest>> => {
      const totalCount = Number(totalRequests || 0n)
      const { page, pageSize, filters, sortBy, sortDirection } = queryParams

      // Generate mock data (in real implementation, this would call contract/indexer)
      let allRequests = generateMockRequests(totalCount, filters)

      // Apply sorting
      allRequests.sort((a, b) => {
        let aVal: any, bVal: any

        switch (sortBy) {
          case 'timestamp':
            aVal = a.timestamp
            bVal = b.timestamp
            break
          case 'fee':
            aVal = a.feePaid
            bVal = b.feePaid
            break
          case 'deadline':
            aVal = a.deadline
            bVal = b.deadline
            break
          default:
            aVal = a.timestamp
            bVal = b.timestamp
        }

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortDirection === 'desc' ? -comparison : comparison
      })

      // Apply pagination
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedRequests = allRequests.slice(startIndex, endIndex)

      const totalPages = Math.ceil(allRequests.length / pageSize)

      return {
        data: paginatedRequests,
        totalItems: allRequests.length,
        currentPage: page,
        pageSize,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        isLoading: false,
        error: null,
        refetch: () => requestsQuery.refetch()
      }
    },
    enabled: Boolean(contractAddress),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // 1 minute
  })

  // Single request getter
  const getRequest = useCallback((id: bigint): RandomnessRequest | undefined => {
    const currentData = requestsQuery.data?.data
    return currentData?.find(request => request.id === id)
  }, [requestsQuery.data])

  // User-specific requests
  const getUserRequestsQuery = useCallback((userAddress: Address): PaginatedQuery<RandomnessRequest> => {
    if (!requestsQuery.data) {
      return {
        data: [],
        totalItems: 0,
        currentPage: 1,
        pageSize: 10,
        hasNextPage: false,
        hasPreviousPage: false,
        isLoading: requestsQuery.isLoading,
        error: requestsQuery.error,
        refetch: requestsQuery.refetch
      }
    }

    const userRequests = requestsQuery.data.data.filter(
      request => request.requester.toLowerCase() === userAddress.toLowerCase()
    )

    return {
      ...requestsQuery.data,
      data: userRequests,
      totalItems: userRequests.length
    }
  }, [requestsQuery])

  // Pending requests
  const getPendingRequestsQuery = useCallback((): PaginatedQuery<RandomnessRequest> => {
    if (!requestsQuery.data) {
      return {
        data: [],
        totalItems: 0,
        currentPage: 1,
        pageSize: 10,
        hasNextPage: false,
        hasPreviousPage: false,
        isLoading: requestsQuery.isLoading,
        error: requestsQuery.error,
        refetch: requestsQuery.refetch
      }
    }

    const pendingRequests = requestsQuery.data.data.filter(
      request => request.status === RequestStatus.Pending
    )

    return {
      ...requestsQuery.data,
      data: pendingRequests,
      totalItems: pendingRequests.length
    }
  }, [requestsQuery])

  // Listen for new request events
  useWatchContractEvent({
    address: contractAddress as `0x${string}`,
    abi: ANYRAND_ABI,
    eventName: 'RandomnessRequested',
    onLogs: (logs) => {
      // Invalidate and refetch requests when new events come in
      requestsQuery.refetch()
    },
    enabled: Boolean(contractAddress)
  })

  // Update query parameters
  const updateQueryParams = useCallback((newParams: Partial<RequestQueryParams>) => {
    setQueryParams(prev => ({ ...prev, ...newParams }))
  }, [])

  return {
    requests: requestsQuery.data || {
      data: [],
      totalItems: 0,
      currentPage: 1,
      pageSize: 10,
      hasNextPage: false,
      hasPreviousPage: false,
      isLoading: requestsQuery.isLoading,
      error: requestsQuery.error,
      refetch: requestsQuery.refetch
    },
    getRequest,
    getUserRequests: getUserRequestsQuery,
    getPendingRequests: getPendingRequestsQuery
  }
}

// Helper hook for updating query parameters
export function useRequestsQueryParams() {
  const [params, setParams] = useState<RequestQueryParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'timestamp',
    sortDirection: 'desc'
  })

  const updateFilters = useCallback((filters: RequestQueryFilters) => {
    setParams(prev => ({
      ...prev,
      filters,
      page: 1 // Reset to first page when filters change
    }))
  }, [])

  const updatePagination = useCallback((page: number, pageSize?: number) => {
    setParams(prev => ({
      ...prev,
      page,
      ...(pageSize && { pageSize })
    }))
  }, [])

  const updateSorting = useCallback((
    sortBy: 'timestamp' | 'fee' | 'deadline',
    sortDirection: 'asc' | 'desc'
  ) => {
    setParams(prev => ({
      ...prev,
      sortBy,
      sortDirection,
      page: 1 // Reset to first page when sorting changes
    }))
  }, [])

  return {
    params,
    updateFilters,
    updatePagination,
    updateSorting
  }
}