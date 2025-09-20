import { renderHook, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { useTransactionHistory } from '@/hooks/useTransactionHistory'

// Mock dependencies
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useWaitForTransactionReceipt: vi.fn(),
  useBlockNumber: vi.fn(),
}))

describe('useTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should track transaction status', async () => {
    const transactionHash = '0x1234567890abcdef1234567890abcdef12345678'
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction(transactionHash, 'randomness_request')

    await waitFor(() => {
      const transaction = result.current.getTransaction(transactionHash)
      expect(transaction).toEqual({
        hash: transactionHash,
        type: 'randomness_request',
        status: 'pending',
        timestamp: expect.any(Number),
        confirmations: 0,
      })
    })
  })

  it('should return all transactions', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    result.current.addTransaction('0x2222', 'fulfillment')

    expect(result.current.transactions).toHaveLength(2)
    expect(result.current.transactions).toEqual([
      expect.objectContaining({ hash: '0x1111', type: 'randomness_request' }),
      expect.objectContaining({ hash: '0x2222', type: 'fulfillment' }),
    ])
  })

  it('should filter transactions by type', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    result.current.addTransaction('0x2222', 'fulfillment')

    const requestTransactions = result.current.getTransactionsByType('randomness_request')
    expect(requestTransactions).toHaveLength(1)
    expect(requestTransactions[0].type).toBe('randomness_request')
  })

  it('should filter transactions by status', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')

    const pendingTransactions = result.current.getTransactionsByStatus('pending')
    expect(pendingTransactions).toHaveLength(1)
    expect(pendingTransactions[0].status).toBe('pending')
  })

  it('should update transaction status', async () => {
    const transactionHash = '0x1234567890abcdef'
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction(transactionHash, 'randomness_request')
    result.current.updateTransactionStatus(transactionHash, 'confirmed', 5)

    const transaction = result.current.getTransaction(transactionHash)
    expect(transaction?.status).toBe('confirmed')
    expect(transaction?.confirmations).toBe(5)
  })

  it('should remove transaction', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    expect(result.current.transactions).toHaveLength(1)

    result.current.removeTransaction('0x1111')
    expect(result.current.transactions).toHaveLength(0)
  })

  it('should clear all transactions', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    result.current.addTransaction('0x2222', 'fulfillment')
    expect(result.current.transactions).toHaveLength(2)

    result.current.clearTransactions()
    expect(result.current.transactions).toHaveLength(0)
  })

  it('should provide pending transactions count', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    result.current.addTransaction('0x2222', 'fulfillment')
    result.current.updateTransactionStatus('0x1111', 'confirmed')

    expect(result.current.pendingCount).toBe(1)
  })

  it('should provide total transactions count', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    result.current.addTransaction('0x2222', 'fulfillment')

    expect(result.current.totalCount).toBe(2)
  })

  it('should handle transaction watching', async () => {
    const transactionHash = '0x1234567890abcdef'
    const { result } = renderHook(() => useTransactionHistory())

    result.current.watchTransaction(transactionHash, 'randomness_request')

    await waitFor(() => {
      const transaction = result.current.getTransaction(transactionHash)
      expect(transaction).toBeDefined()
      expect(transaction?.type).toBe('randomness_request')
    })
  })

  it('should provide recent transactions', () => {
    const { result } = renderHook(() => useTransactionHistory())

    // Add transactions with different timestamps
    result.current.addTransaction('0x1111', 'randomness_request')

    // Simulate time passing
    vi.useFakeTimers()
    vi.advanceTimersByTime(1000)

    result.current.addTransaction('0x2222', 'fulfillment')

    const recent = result.current.getRecentTransactions(1)
    expect(recent).toHaveLength(1)
    expect(recent[0].hash).toBe('0x2222')

    vi.useRealTimers()
  })

  it('should handle transaction errors', () => {
    const transactionHash = '0x1234567890abcdef'
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction(transactionHash, 'randomness_request')
    result.current.updateTransactionStatus(transactionHash, 'failed')

    const transaction = result.current.getTransaction(transactionHash)
    expect(transaction?.status).toBe('failed')
  })

  it('should persist transactions across re-renders', () => {
    const { result, rerender } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    expect(result.current.transactions).toHaveLength(1)

    rerender()
    expect(result.current.transactions).toHaveLength(1)
  })

  it('should handle transaction replacement', () => {
    const originalHash = '0x1111'
    const replacementHash = '0x2222'
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction(originalHash, 'randomness_request')
    result.current.updateTransactionStatus(originalHash, 'replaced', 0, replacementHash)

    const originalTx = result.current.getTransaction(originalHash)
    expect(originalTx?.status).toBe('replaced')
    expect(originalTx?.replacedBy).toBe(replacementHash)
  })

  it('should provide transaction statistics', () => {
    const { result } = renderHook(() => useTransactionHistory())

    result.current.addTransaction('0x1111', 'randomness_request')
    result.current.addTransaction('0x2222', 'fulfillment')
    result.current.updateTransactionStatus('0x1111', 'confirmed')

    const stats = result.current.getTransactionStats()
    expect(stats).toEqual({
      total: 2,
      pending: 1,
      confirmed: 1,
      failed: 0,
      replaced: 0,
    })
  })
})