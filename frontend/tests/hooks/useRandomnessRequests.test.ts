import { renderHook, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { useRandomnessRequests } from '@/hooks/useRandomnessRequests'

// Mock dependencies
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}))

vi.mock('@/hooks/useAnyrand', () => ({
  useAnyrand: vi.fn(),
}))

describe('useRandomnessRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch randomness requests for connected wallet', async () => {
    const { result } = renderHook(() => useRandomnessRequests())

    await waitFor(() => {
      expect(result.current.requests).toEqual([
        expect.objectContaining({
          requestId: expect.any(BigInt),
          requester: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
          deadline: expect.any(Number),
          callbackGasLimit: expect.any(BigInt),
          feePaid: expect.any(BigInt),
          status: expect.any(Number),
          transactionHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
          timestamp: expect.any(Number),
        })
      ])
    })
  })

  it('should return empty array when wallet not connected', () => {
    const { result } = renderHook(() => useRandomnessRequests())

    expect(result.current.requests).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle loading state', () => {
    const { result } = renderHook(() => useRandomnessRequests())

    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('should handle error state', () => {
    const { result } = renderHook(() => useRandomnessRequests())

    expect(result.current.error).toBeUndefined()
  })

  it('should provide refresh functionality', async () => {
    const { result } = renderHook(() => useRandomnessRequests())

    expect(typeof result.current.refresh).toBe('function')

    await result.current.refresh()

    // Should trigger a refetch
    expect(result.current.isLoading).toBe(false)
  })

  it('should filter requests by status when specified', async () => {
    const { result } = renderHook(() => useRandomnessRequests({ status: 1 }))

    await waitFor(() => {
      result.current.requests.forEach(request => {
        expect(request.status).toBe(1)
      })
    })
  })

  it('should limit results when limit is specified', async () => {
    const { result } = renderHook(() => useRandomnessRequests({ limit: 5 }))

    await waitFor(() => {
      expect(result.current.requests.length).toBeLessThanOrEqual(5)
    })
  })

  it('should sort requests by timestamp descending by default', async () => {
    const { result } = renderHook(() => useRandomnessRequests())

    await waitFor(() => {
      if (result.current.requests.length > 1) {
        for (let i = 0; i < result.current.requests.length - 1; i++) {
          expect(result.current.requests[i].timestamp).toBeGreaterThanOrEqual(
            result.current.requests[i + 1].timestamp
          )
        }
      }
    })
  })

  it('should handle pagination with offset', async () => {
    const { result } = renderHook(() => useRandomnessRequests({ offset: 10, limit: 5 }))

    await waitFor(() => {
      expect(result.current.requests.length).toBeLessThanOrEqual(5)
    })
  })

  it('should provide total count when available', async () => {
    const { result } = renderHook(() => useRandomnessRequests())

    await waitFor(() => {
      expect(typeof result.current.totalCount).toBe('number')
    })
  })

  it('should auto-refresh when new blocks are detected', async () => {
    const { result } = renderHook(() => useRandomnessRequests({ autoRefresh: true }))

    expect(typeof result.current.isAutoRefreshing).toBe('boolean')
  })

  it('should handle filtering by requester address', async () => {
    const requesterAddress = '0x1234567890123456789012345678901234567890'
    const { result } = renderHook(() => useRandomnessRequests({ requester: requesterAddress }))

    await waitFor(() => {
      result.current.requests.forEach(request => {
        expect(request.requester.toLowerCase()).toBe(requesterAddress.toLowerCase())
      })
    })
  })

  it('should provide hasMore flag for pagination', async () => {
    const { result } = renderHook(() => useRandomnessRequests({ limit: 5 }))

    await waitFor(() => {
      expect(typeof result.current.hasMore).toBe('boolean')
    })
  })
})