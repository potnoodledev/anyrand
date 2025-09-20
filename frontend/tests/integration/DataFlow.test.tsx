import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider } from '@/providers/WalletProvider'
import { RandomnessRequestForm } from '@/components/RandomnessRequestForm'
import { RequestHistory } from '@/components/RequestHistory'
import { PendingRequests } from '@/components/PendingRequests'
import { TransactionStatus } from '@/components/TransactionStatus'

// Mock all hooks and providers
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}))

vi.mock('@/hooks/useAnyrand', () => ({
  useAnyrand: vi.fn(),
}))

vi.mock('@/hooks/useRandomnessRequests', () => ({
  useRandomnessRequests: vi.fn(),
}))

vi.mock('@/hooks/usePendingRequests', () => ({
  usePendingRequests: vi.fn(),
}))

vi.mock('@/hooks/useTransactionHistory', () => ({
  useTransactionHistory: vi.fn(),
}))

const mockWallet = {
  isConnected: true,
  address: '0x1234567890123456789012345678901234567890',
  chainId: 534352,
  balance: '1.5 ETH',
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchChain: vi.fn(),
}

const mockAnyrand = {
  requestRandomness: vi.fn(),
  getRequestPrice: vi.fn(),
  getRequestState: vi.fn(),
  fulfillRandomness: vi.fn(),
  contractAddress: '0xContractAddress',
  isContractReady: true,
  isLoading: false,
  error: undefined,
  clearError: vi.fn(),
}

const mockTransactionHistory = {
  transactions: [],
  addTransaction: vi.fn(),
  updateTransactionStatus: vi.fn(),
  watchTransaction: vi.fn(),
  getTransaction: vi.fn(),
  pendingCount: 0,
  totalCount: 0,
}

const TestApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <div data-testid="test-app">
          <RandomnessRequestForm
            onSubmit={() => {}}
            isLoading={false}
          />
          <RequestHistory
            requests={[]}
            onRefresh={() => {}}
          />
          <PendingRequests
            requests={[]}
            onFulfill={() => {}}
          />
          <TransactionStatus
            hash="0x1234567890abcdef"
            status="pending"
            onStatusChange={() => {}}
          />
        </div>
      </WalletProvider>
    </QueryClientProvider>
  )
}

describe('Data Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    vi.mocked(require('@/hooks/useWallet').useWallet).mockReturnValue(mockWallet)
    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue(mockAnyrand)
    vi.mocked(require('@/hooks/useTransactionHistory').useTransactionHistory).mockReturnValue(mockTransactionHistory)
  })

  it('should handle complete randomness request flow', async () => {
    const mockRequestRandomness = vi.fn().mockResolvedValue({
      requestId: 1n,
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      round: 12345n,
      estimatedFulfillmentTime: Date.now() + 300000,
    })

    const mockGetRequestPrice = vi.fn().mockResolvedValue({
      totalPrice: 1000000000000000n,
      effectiveFeePerGas: 20000000000n,
      baseFee: 15000000000n,
      priorityFee: 5000000000n,
      gasEstimate: 100000n,
      formatted: {
        total: '0.001 ETH',
        totalUSD: '$2.50',
        gasPrice: '20 gwei',
      },
    })

    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue({
      ...mockAnyrand,
      requestRandomness: mockRequestRandomness,
      getRequestPrice: mockGetRequestPrice,
    })

    render(<TestApp />)

    // Step 1: Get price estimate
    const gasLimitInput = screen.getByLabelText(/gas limit/i)
    fireEvent.change(gasLimitInput, { target: { value: '100000' } })

    await waitFor(() => {
      expect(mockGetRequestPrice).toHaveBeenCalledWith(100000)
      expect(screen.getByText(/0\.001 ETH/i)).toBeInTheDocument()
    })

    // Step 2: Submit request
    const deadlineInput = screen.getByLabelText(/deadline/i)
    fireEvent.change(deadlineInput, { target: { value: '60' } })

    const submitButton = screen.getByRole('button', { name: /request randomness/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockRequestRandomness).toHaveBeenCalledWith({
        deadline: expect.any(Number),
        callbackGasLimit: 100000,
      })
    })

    // Step 3: Verify transaction is tracked
    expect(mockTransactionHistory.addTransaction).toHaveBeenCalledWith(
      '0x1234567890abcdef1234567890abcdef12345678',
      'randomness_request'
    )
  })

  it('should handle pending request fulfillment flow', async () => {
    const mockPendingRequests = [
      {
        requestId: 1n,
        requester: '0x9876543210987654321098765432109876543210' as const,
        deadline: Date.now() - 300000,
        round: 12345n,
        callbackGasLimit: 100000n,
        estimatedEarnings: 500000000000000n,
        timeUntilFulfillable: 0,
        networkGasCost: 200000000000000n,
        profitMargin: 300000000000000n,
      }
    ]

    const mockFulfillRandomness = vi.fn().mockResolvedValue({
      transactionHash: '0xfulfillment1234567890abcdef1234567890abcdef',
      requestId: 1n,
      earnings: 500000000000000n,
    })

    vi.mocked(require('@/hooks/usePendingRequests').usePendingRequests).mockReturnValue({
      pendingRequests: mockPendingRequests,
      isLoading: false,
      error: undefined,
      refresh: vi.fn(),
      fulfillRequest: mockFulfillRandomness,
      isFulfilling: false,
      fulfillingRequestId: undefined,
      totalPotentialEarnings: 500000000000000n,
    })

    render(<TestApp />)

    const fulfillButton = screen.getByRole('button', { name: /fulfill/i })
    fireEvent.click(fulfillButton)

    await waitFor(() => {
      expect(mockFulfillRandomness).toHaveBeenCalledWith({
        requestId: 1n,
        requester: '0x9876543210987654321098765432109876543210',
        pubKeyHash: expect.any(String),
        round: 12345n,
        callbackGasLimit: 100000n,
        signature: expect.any(Array),
      })
    })

    // Verify fulfillment transaction is tracked
    expect(mockTransactionHistory.addTransaction).toHaveBeenCalledWith(
      '0xfulfillment1234567890abcdef1234567890abcdef',
      'fulfillment'
    )
  })

  it('should synchronize data across components', async () => {
    const mockRequests = [
      {
        requestId: 1n,
        requester: '0x1234567890123456789012345678901234567890' as const,
        deadline: Date.now() + 3600000,
        callbackGasLimit: 100000n,
        feePaid: 1000000000000000n,
        effectiveFeePerGas: 20000000000n,
        pubKeyHash: '0xabcdef',
        round: 12345n,
        status: 1,
        transactionHash: '0xtxhash1',
        blockNumber: 12345,
        timestamp: Date.now() - 300000,
      }
    ]

    vi.mocked(require('@/hooks/useRandomnessRequests').useRandomnessRequests).mockReturnValue({
      requests: mockRequests,
      isLoading: false,
      error: undefined,
      refresh: vi.fn(),
      totalCount: 1,
      hasMore: false,
    })

    render(<TestApp />)

    // Verify request history shows the data
    expect(screen.getByText(/request #1/i)).toBeInTheDocument()
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('should handle error propagation and recovery', async () => {
    const networkError = new Error('Network error')

    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue({
      ...mockAnyrand,
      error: networkError,
      isLoading: false,
    })

    render(<TestApp />)

    expect(screen.getByText(/network error/i)).toBeInTheDocument()

    // Test error clearance
    const clearErrorButton = screen.getByRole('button', { name: /clear error/i })
    fireEvent.click(clearErrorButton)

    expect(mockAnyrand.clearError).toHaveBeenCalled()
  })

  it('should handle loading states across components', () => {
    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue({
      ...mockAnyrand,
      isLoading: true,
      isRequestingRandomness: true,
    })

    vi.mocked(require('@/hooks/useRandomnessRequests').useRandomnessRequests).mockReturnValue({
      requests: [],
      isLoading: true,
      error: undefined,
      refresh: vi.fn(),
      totalCount: 0,
      hasMore: false,
    })

    render(<TestApp />)

    expect(screen.getAllByText(/loading/i)).toHaveLength(2)
  })

  it('should handle wallet disconnection gracefully', async () => {
    const { rerender } = render(<TestApp />)

    // Initially connected
    expect(screen.getByText(/0x1234...7890/i)).toBeInTheDocument()

    // Simulate disconnection
    vi.mocked(require('@/hooks/useWallet').useWallet).mockReturnValue({
      ...mockWallet,
      isConnected: false,
      address: undefined,
    })

    rerender(<TestApp />)

    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('should handle chain switching with data refresh', async () => {
    const mockRefresh = vi.fn()

    vi.mocked(require('@/hooks/useRandomnessRequests').useRandomnessRequests).mockReturnValue({
      requests: [],
      isLoading: false,
      error: undefined,
      refresh: mockRefresh,
      totalCount: 0,
      hasMore: false,
    })

    const { rerender } = render(<TestApp />)

    // Switch chain
    vi.mocked(require('@/hooks/useWallet').useWallet).mockReturnValue({
      ...mockWallet,
      chainId: 534351, // Scroll Sepolia
    })

    rerender(<TestApp />)

    // Should trigger data refresh for new chain
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('should maintain transaction status updates in real-time', async () => {
    const mockUpdateStatus = vi.fn()

    vi.mocked(require('@/hooks/useTransactionHistory').useTransactionHistory).mockReturnValue({
      ...mockTransactionHistory,
      updateTransactionStatus: mockUpdateStatus,
    })

    render(<TestApp />)

    // Simulate status change from pending to confirmed
    const onStatusChange = screen.getByTestId('transaction-status').getAttribute('data-on-status-change')

    // This would be triggered by the TransactionStatus component
    fireEvent.click(screen.getByTestId('transaction-status'))

    // In a real scenario, this would be triggered by block confirmations
    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'confirmed',
        expect.any(Number)
      )
    })
  })
})