import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount, useChainId, useReadContract, useWatchContractEvent, usePublicClient } from 'wagmi'
import { Address, parseAbiItem } from 'viem'
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
    name: 'getRequestState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [{ name: 'state', type: 'uint8' }]
  },
  {
    name: 'RandomnessRequested',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'requester', type: 'address', indexed: true },
      { name: 'pubKeyHash', type: 'bytes32', indexed: true },
      { name: 'round', type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint256' },
      { name: 'feePaid', type: 'uint256' },
      { name: 'effectiveFeePerGas', type: 'uint256' }
    ]
  },
  {
    name: 'RandomnessFulfilled',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'randomness', type: 'uint256' },
      { name: 'callbackSuccess', type: 'bool' },
      { name: 'actualGasUsed', type: 'uint256' }
    ]
  },
  {
    name: 'RandomnessCallbackFailed',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'retdata', type: 'bytes32' },
      { name: 'gasLimit', type: 'uint256' },
      { name: 'actualGasUsed', type: 'uint256' }
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
  const publicClient = usePublicClient()
  const [queryParams, setQueryParams] = useState<RequestQueryParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'timestamp',
    sortDirection: 'desc'
  })
  const [blockPage, setBlockPage] = useState(0) // 0 = most recent blocks
  const [currentBlockInfo, setCurrentBlockInfo] = useState<{
    currentBlock: bigint
    fromBlock: bigint
    toBlock: bigint
    blockRange: number
  } | null>(null)

  const contractAddress = CONTRACT_ADDRESSES[chainId]

  // Fetch contract events to build requests data
  const fetchContractEvents = useCallback(async (): Promise<RandomnessRequest[]> => {
    if (!publicClient || !contractAddress) {
      console.log('Missing publicClient or contractAddress:', { publicClient: !!publicClient, contractAddress })
      return []
    }

    try {
      console.log('Fetching contract events from:', contractAddress)

      // Get current block number
      const currentBlock = await publicClient.getBlockNumber()

      // Configurable block range (2 hours worth of blocks for better performance)
      // Scroll Sepolia: ~3 second block time = 1,200 blocks per hour = 2,400 blocks per 2 hours
      const BLOCKS_PER_PAGE = 2400n // 2 hours worth of blocks

      // Calculate block range based on pagination
      const pageOffset = BigInt(blockPage) * BLOCKS_PER_PAGE
      const toBlock = currentBlock - pageOffset
      const fromBlock = toBlock - BLOCKS_PER_PAGE + 1n

      // Store current block info for UI display
      setCurrentBlockInfo({
        currentBlock,
        fromBlock,
        toBlock,
        blockRange: Number(BLOCKS_PER_PAGE)
      })

      console.log(`Searching blocks ${fromBlock.toString()} to ${toBlock.toString()} (page ${blockPage}, range: ${BLOCKS_PER_PAGE} blocks)`)

      // Get RandomnessRequested events
      const requestedEvents = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event RandomnessRequested(uint256 indexed requestId, address indexed requester, bytes32 indexed pubKeyHash, uint256 round, uint256 callbackGasLimit, uint256 feePaid, uint256 effectiveFeePerGas)'),
        fromBlock,
        toBlock: 'latest'
      })

      console.log('Found RandomnessRequested events:', requestedEvents.length)

      // Get RandomnessFulfilled events
      const fulfilledEvents = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness, bool callbackSuccess, uint256 actualGasUsed)'),
        fromBlock,
        toBlock: 'latest'
      })

      console.log('Found RandomnessFulfilled events:', fulfilledEvents.length)

      // Get RandomnessCallbackFailed events
      const failedEvents = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event RandomnessCallbackFailed(uint256 indexed requestId, bytes32 retdata, uint256 gasLimit, uint256 actualGasUsed)'),
        fromBlock,
        toBlock: 'latest'
      })

      console.log('Found RandomnessCallbackFailed events:', failedEvents.length)

      // Build requests from events
      const requestsMap = new Map<string, RandomnessRequest>()

      // Process RandomnessRequested events
      for (const event of requestedEvents) {
        const { requestId, requester, pubKeyHash, round, callbackGasLimit, feePaid, effectiveFeePerGas } = event.args
        const block = await publicClient.getBlock({ blockNumber: event.blockNumber })

        // Calculate deadline from round (estimate)
        const deadline = BigInt(Number(block.timestamp) + 120) // 2 minutes estimate

        const request: RandomnessRequest = {
          id: requestId,
          requester,
          deadline,
          callbackGasLimit,
          feePaid,
          effectiveFeePerGas,
          status: RequestStatus.Pending, // Default to pending, will update if fulfilled
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp,
          pubKeyHash
        }

        requestsMap.set(requestId.toString(), request)
      }

      // Process fulfilled events
      for (const event of fulfilledEvents) {
        const { requestId, randomness, callbackSuccess, actualGasUsed } = event.args
        const request = requestsMap.get(requestId.toString())
        if (request) {
          request.status = RequestStatus.Fulfilled
          const block = await publicClient.getBlock({ blockNumber: event.blockNumber })

          request.fulfillment = {
            requestId,
            randomness,
            operator: '0x0000000000000000000000000000000000000000' as Address, // Not available in event
            callbackSuccess,
            actualGasUsed,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            round: 0n, // Not available in event
            signature: [0n, 0n] // Not available in event
          }
        }
      }

      // Process failed events
      for (const event of failedEvents) {
        const { requestId } = event.args
        const request = requestsMap.get(requestId.toString())
        if (request) {
          request.status = RequestStatus.Failed
        }
      }

      const finalRequests = Array.from(requestsMap.values())
      console.log('Built requests from events:', finalRequests.length, finalRequests)
      return finalRequests
    } catch (error) {
      console.error('Error fetching contract events:', error)
      return []
    }
  }, [publicClient, contractAddress, blockPage])

  // Generate mock request data for testing
  const generateMockRequests = useCallback((count: number, filters?: RequestQueryFilters): RandomnessRequest[] => {
    const requests: RandomnessRequest[] = []
    const now = Math.floor(Date.now() / 1000)

    for (let i = 1; i <= count; i++) {
      const timestamp = now - (i * 3600) // Each request 1 hour apart

      // Create more realistic status distribution with some fulfillable requests
      let status: RequestStatus
      if (i <= 3) {
        // First 3 requests are fulfillable (pending with deadline passed)
        status = RequestStatus.Pending
      } else if (i <= 5) {
        // Next 2 are fulfilled
        status = RequestStatus.Fulfilled
      } else if (i <= 7) {
        // Next 2 are still pending (deadline not passed yet)
        status = RequestStatus.Pending
      } else {
        // Rest cycle through all statuses
        status = i % 4 as RequestStatus
      }

      const requester = `0x${(i * 1234567890).toString(16).padStart(40, '0')}` as Address

      // Apply filters
      if (filters?.requester && requester !== filters.requester) continue
      if (filters?.status && !filters.status.includes(status)) continue
      if (filters?.fromTimestamp && BigInt(timestamp) < filters.fromTimestamp) continue
      if (filters?.toTimestamp && BigInt(timestamp) > filters.toTimestamp) continue

      // Set deadline based on whether request should be fulfillable
      let deadline: bigint
      if (i <= 3 && status === RequestStatus.Pending) {
        // Make fulfillable: deadline in the past
        deadline = BigInt(timestamp - 1800) // 30 minutes before creation (already passed)
      } else if (i <= 7 && status === RequestStatus.Pending) {
        // Still pending: deadline in the future
        deadline = BigInt(now + 3600) // 1 hour in the future
      } else {
        // Other requests: normal deadline
        deadline = BigInt(timestamp + 7200) // 2 hours after creation
      }

      const request: RandomnessRequest = {
        id: BigInt(i),
        requester,
        deadline,
        callbackGasLimit: BigInt(100000), // Match quickstart script
        feePaid: BigInt(1000000000000000 + i * 100000000000000), // Varying fees
        effectiveFeePerGas: BigInt(20000000000), // 20 gwei
        status,
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
      const { page, pageSize, filters, sortBy, sortDirection } = queryParams

      // Fetch real contract data
      let allRequests = await fetchContractEvents()

      // No fallback to mock data - show actual blockchain state
      console.log(`Found ${allRequests.length} real contract events in block range`)

      // Apply filters
      if (filters?.requester) {
        allRequests = allRequests.filter(r =>
          r.requester.toLowerCase() === filters.requester!.toLowerCase()
        )
      }
      if (filters?.status) {
        allRequests = allRequests.filter(r =>
          filters.status!.includes(r.status)
        )
      }
      if (filters?.fromTimestamp) {
        allRequests = allRequests.filter(r =>
          r.timestamp >= filters.fromTimestamp!
        )
      }
      if (filters?.toTimestamp) {
        allRequests = allRequests.filter(r =>
          r.timestamp <= filters.toTimestamp!
        )
      }

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
    enabled: Boolean(contractAddress) && Boolean(publicClient),
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

  // Block pagination controls
  const goToNextBlockPage = useCallback(() => {
    setBlockPage(prev => prev + 1)
  }, [])

  const goToPreviousBlockPage = useCallback(() => {
    setBlockPage(prev => Math.max(0, prev - 1))
  }, [])

  const goToBlockPage = useCallback((page: number) => {
    setBlockPage(Math.max(0, page))
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
    getPendingRequests: getPendingRequestsQuery,
    // Block pagination
    blockInfo: currentBlockInfo,
    currentBlockPage: blockPage,
    goToNextBlockPage,
    goToPreviousBlockPage,
    goToBlockPage
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