import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RandomnessRequestForm } from '@/components/RandomnessRequestForm'
import { PendingRequests } from '@/components/PendingRequests'
import { TransactionStatus } from '@/components/TransactionStatus'
import { TestWrapper } from '../utils/TestWrapper'

// Mock console to suppress error output during tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = vi.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

// Error boundary component for testing
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error for debugging if needed
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

const TestComponent = ({ children }: { children: React.ReactNode }) => (
  <TestWrapper>
    <TestErrorBoundary>
      {children}
    </TestErrorBoundary>
  </TestWrapper>
)

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle wallet connection errors gracefully', async () => {
    const connectionError = new Error('User rejected the request')

    vi.mocked(require('@/hooks/useWallet').useWallet).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: connectionError,
      connect: vi.fn().mockRejectedValue(connectionError),
      disconnect: vi.fn(),
    })

    render(
      <TestComponent>
        <RandomnessRequestForm onSubmit={() => {}} isLoading={false} />
      </TestComponent>
    )

    expect(screen.getByText(/user rejected the request/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument()
  })

  it('should handle contract interaction errors', async () => {
    const contractError = new Error('execution reverted: insufficient fee')

    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue({
      requestRandomness: vi.fn().mockRejectedValue(contractError),
      getRequestPrice: vi.fn(),
      error: contractError,
      isLoading: false,
      clearError: vi.fn(),
      contractAddress: '0xContract',
      isContractReady: true,
    })

    render(
      <TestComponent>
        <RandomnessRequestForm onSubmit={() => {}} isLoading={false} />
      </TestComponent>
    )

    expect(screen.getByText(/insufficient fee/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear error/i })).toBeInTheDocument()
  })

  it('should handle network connectivity issues', async () => {
    const networkError = new Error('Network request failed')

    vi.mocked(require('@/hooks/useRandomnessRequests').useRandomnessRequests).mockReturnValue({
      requests: [],
      isLoading: false,
      error: networkError,
      refresh: vi.fn(),
      totalCount: 0,
      hasMore: false,
    })

    render(
      <TestComponent>
        <div data-testid="request-history-container">
          Request history would be here
        </div>
      </TestComponent>
    )

    expect(screen.getByText(/network request failed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should handle transaction failures gracefully', async () => {
    render(
      <TestComponent>
        <TransactionStatus
          hash="0x1234567890abcdef"
          status="failed"
          onStatusChange={() => {}}
        />
      </TestComponent>
    )

    expect(screen.getByText(/failed/i)).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry transaction/i })).toBeInTheDocument()
  })

  it('should handle gas estimation errors', async () => {
    const gasError = new Error('Cannot estimate gas')

    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue({
      requestRandomness: vi.fn(),
      getRequestPrice: vi.fn().mockRejectedValue(gasError),
      error: gasError,
      isLoading: false,
      clearError: vi.fn(),
      contractAddress: '0xContract',
      isContractReady: true,
    })

    render(
      <TestComponent>
        <RandomnessRequestForm onSubmit={() => {}} isLoading={false} />
      </TestComponent>
    )

    expect(screen.getByText(/cannot estimate gas/i)).toBeInTheDocument()
    expect(screen.getByText(/manual gas price/i)).toBeInTheDocument()
  })

  it('should handle insufficient balance errors', async () => {
    const balanceError = new Error('insufficient funds for gas * price + value')

    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue({
      requestRandomness: vi.fn().mockRejectedValue(balanceError),
      getRequestPrice: vi.fn(),
      error: balanceError,
      isLoading: false,
      clearError: vi.fn(),
      contractAddress: '0xContract',
      isContractReady: true,
    })

    render(
      <TestComponent>
        <RandomnessRequestForm onSubmit={() => {}} isLoading={false} />
      </TestComponent>
    )

    expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument()
    expect(screen.getByText(/add funds to your wallet/i)).toBeInTheDocument()
  })

  it('should handle fulfillment errors with recovery options', async () => {
    const fulfillmentError = new Error('Request already fulfilled')

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

    render(
      <TestComponent>
        <PendingRequests
          requests={mockPendingRequests}
          onFulfill={async () => {
            throw fulfillmentError
          }}
        />
      </TestComponent>
    )

    const fulfillButton = screen.getByRole('button', { name: /fulfill/i })
    fireEvent.click(fulfillButton)

    await waitFor(() => {
      expect(screen.getByText(/request already fulfilled/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh list/i })).toBeInTheDocument()
    })
  })

  it('should handle malformed transaction hashes', () => {
    render(
      <TestComponent>
        <TransactionStatus
          hash="invalid-hash"
          status="pending"
          onStatusChange={() => {}}
        />
      </TestComponent>
    )

    expect(screen.getByText(/invalid transaction hash/i)).toBeInTheDocument()
  })

  it('should handle unsupported chain errors', async () => {
    vi.mocked(require('@/hooks/useWallet').useWallet).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: 999999, // Unsupported chain
      isCorrectChain: false,
      supportedChains: [534352, 534351, 8453],
      switchChain: vi.fn(),
      error: new Error('Unsupported chain'),
    })

    render(
      <TestComponent>
        <RandomnessRequestForm onSubmit={() => {}} isLoading={false} />
      </TestComponent>
    )

    expect(screen.getByText(/unsupported chain/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to supported chain/i })).toBeInTheDocument()
  })

  it('should handle component render errors with error boundary', async () => {
    const ThrowingComponent = () => {
      throw new Error('Component render error')
    }

    render(
      <TestComponent>
        <ThrowingComponent />
      </TestComponent>
    )

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/component render error/i)).toBeInTheDocument()

    // Test recovery
    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(tryAgainButton)

    // Error boundary should reset (though component will error again)
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
  })

  it('should handle timeout errors during long operations', async () => {
    const timeoutError = new Error('Request timeout')

    vi.mocked(require('@/hooks/usePendingRequests').usePendingRequests).mockReturnValue({
      pendingRequests: [],
      isLoading: false,
      error: timeoutError,
      refresh: vi.fn(),
      fulfillRequest: vi.fn(),
      isFulfilling: false,
      totalPotentialEarnings: 0n,
    })

    render(
      <TestComponent>
        <PendingRequests requests={[]} onFulfill={() => {}} />
      </TestComponent>
    )

    expect(screen.getByText(/request timeout/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should provide helpful error messages for common issues', async () => {
    const userRejectedError = new Error('User denied transaction signature')

    vi.mocked(require('@/hooks/useAnyrand').useAnyrand).mockReturnValue({
      requestRandomness: vi.fn().mockRejectedValue(userRejectedError),
      getRequestPrice: vi.fn(),
      error: userRejectedError,
      isLoading: false,
      clearError: vi.fn(),
      contractAddress: '0xContract',
      isContractReady: true,
    })

    render(
      <TestComponent>
        <RandomnessRequestForm onSubmit={() => {}} isLoading={false} />
      </TestComponent>
    )

    expect(screen.getByText(/transaction was cancelled/i)).toBeInTheDocument()
    expect(screen.getByText(/please try again and confirm/i)).toBeInTheDocument()
  })

  it('should handle rate limiting errors', async () => {
    const rateLimitError = new Error('Too many requests')

    vi.mocked(require('@/hooks/useRandomnessRequests').useRandomnessRequests).mockReturnValue({
      requests: [],
      isLoading: false,
      error: rateLimitError,
      refresh: vi.fn(),
      totalCount: 0,
      hasMore: false,
    })

    render(
      <TestComponent>
        <div>Request history component</div>
      </TestComponent>
    )

    expect(screen.getByText(/too many requests/i)).toBeInTheDocument()
    expect(screen.getByText(/please wait before retrying/i)).toBeInTheDocument()
  })
})