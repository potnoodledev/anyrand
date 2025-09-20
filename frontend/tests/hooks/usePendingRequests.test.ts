import { renderHook, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { usePendingRequests } from '@/hooks/usePendingRequests'

// Mock dependencies
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}))

vi.mock('@/hooks/useAnyrand', () => ({
  useAnyrand: vi.fn(),
}))

describe('usePendingRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch pending requests for fulfillment', async () => {
    const { result } = renderHook(() => usePendingRequests())

    await waitFor(() => {
      expect(result.current.pendingRequests).toEqual([
        expect.objectContaining({
          requestId: expect.any(BigInt),
          requester: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
          deadline: expect.any(Number),
          round: expect.any(BigInt),
          callbackGasLimit: expect.any(BigInt),
          estimatedEarnings: expect.any(BigInt),
          timeUntilFulfillable: expect.any(Number),
          networkGasCost: expect.any(BigInt),
          profitMargin: expect.any(BigInt),
        })
      ])
    })
  })

  it('should return empty array when no pending requests', () => {
    const { result } = renderHook(() => usePendingRequests())

    expect(result.current.pendingRequests).toEqual([])
  })

  it('should handle loading state', () => {
    const { result } = renderHook(() => usePendingRequests())

    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('should handle error state', () => {
    const { result } = renderHook(() => usePendingRequests())

    expect(result.current.error).toBeUndefined()
  })

  it('should provide refresh functionality', async () => {
    const { result } = renderHook(() => usePendingRequests())

    expect(typeof result.current.refresh).toBe('function')

    await result.current.refresh()

    expect(result.current.isLoading).toBe(false)
  })

  it('should sort by profit margin descending by default', async () => {
    const { result } = renderHook(() => usePendingRequests())

    await waitFor(() => {
      if (result.current.pendingRequests.length > 1) {
        for (let i = 0; i < result.current.pendingRequests.length - 1; i++) {
          expect(result.current.pendingRequests[i].profitMargin).toBeGreaterThanOrEqual(
            result.current.pendingRequests[i + 1].profitMargin
          )
        }
      }
    })
  })

  it('should filter by minimum profit margin', async () => {
    const minProfit = 100000000000000n // 0.0001 ETH
    const { result } = renderHook(() => usePendingRequests({ minProfitMargin: minProfit }))

    await waitFor(() => {
      result.current.pendingRequests.forEach(request => {
        expect(request.profitMargin).toBeGreaterThanOrEqual(minProfit)
      })
    })
  })

  it('should filter by fulfillability status', async () => {
    const { result } = renderHook(() => usePendingRequests({ onlyFulfillable: true }))

    await waitFor(() => {
      result.current.pendingRequests.forEach(request => {
        expect(request.timeUntilFulfillable).toBeLessThanOrEqual(0)
      })
    })
  })

  it('should provide fulfillment functionality', async () => {
    const { result } = renderHook(() => usePendingRequests())

    expect(typeof result.current.fulfillRequest).toBe('function')

    const mockRequest = {
      requestId: 1n,
      requester: '0x1234567890123456789012345678901234567890' as const,
      pubKeyHash: '0xabcdef',
      round: 12345n,
      callbackGasLimit: 100000n,
      signature: [123n, 456n] as [bigint, bigint],
    }

    const fulfillmentResult = await result.current.fulfillRequest(mockRequest)

    expect(fulfillmentResult).toEqual({
      transactionHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
      requestId: 1n,
      earnings: expect.any(BigInt),
    })
  })

  it('should handle fulfillment loading state', async () => {
    const { result } = renderHook(() => usePendingRequests())

    expect(typeof result.current.isFulfilling).toBe('boolean')
  })

  it('should track fulfillment progress', async () => {
    const { result } = renderHook(() => usePendingRequests())

    expect(result.current.fulfillingRequestId).toBeUndefined()

    const mockRequest = {
      requestId: 1n,
      requester: '0x1234567890123456789012345678901234567890' as const,
      pubKeyHash: '0xabcdef',
      round: 12345n,
      callbackGasLimit: 100000n,
      signature: [123n, 456n] as [bigint, bigint],
    }

    // Start fulfillment
    result.current.fulfillRequest(mockRequest)

    await waitFor(() => {
      expect(result.current.fulfillingRequestId).toBe(1n)
    })
  })

  it('should calculate total potential earnings', async () => {
    const { result } = renderHook(() => usePendingRequests())

    await waitFor(() => {
      expect(typeof result.current.totalPotentialEarnings).toBe('bigint')
    })
  })

  it('should provide auto-refresh functionality', async () => {
    const { result } = renderHook(() => usePendingRequests({ autoRefresh: true, refreshInterval: 5000 }))

    expect(typeof result.current.isAutoRefreshing).toBe('boolean')
  })

  it('should limit results when specified', async () => {
    const { result } = renderHook(() => usePendingRequests({ limit: 10 }))

    await waitFor(() => {
      expect(result.current.pendingRequests.length).toBeLessThanOrEqual(10)
    })
  })

  it('should filter by gas limit range', async () => {
    const { result } = renderHook(() => usePendingRequests({
      minGasLimit: 50000n,
      maxGasLimit: 200000n
    }))

    await waitFor(() => {
      result.current.pendingRequests.forEach(request => {
        expect(request.callbackGasLimit).toBeGreaterThanOrEqual(50000n)
        expect(request.callbackGasLimit).toBeLessThanOrEqual(200000n)
      })
    })
  })

  it('should provide estimated total fulfillment time', async () => {
    const { result } = renderHook(() => usePendingRequests())

    await waitFor(() => {
      expect(typeof result.current.estimatedFulfillmentTime).toBe('number')
    })
  })
})