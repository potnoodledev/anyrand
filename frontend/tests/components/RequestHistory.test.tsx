import { render, screen, fireEvent } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { RequestHistory } from '@/components/RequestHistory'
import type { RandomnessRequest } from '@/types/entities'

// Mock data for testing
const mockRequests: RandomnessRequest[] = [
  {
    requestId: 1n,
    requester: '0x1234567890123456789012345678901234567890' as const,
    deadline: Date.now() + 3600000,
    callbackGasLimit: 100000n,
    feePaid: 1000000000000000n,
    effectiveFeePerGas: 20000000000n,
    pubKeyHash: '0xabcdef',
    round: 12345n,
    status: 1, // Pending
    transactionHash: '0xtxhash1',
    blockNumber: 12345,
    timestamp: Date.now() - 300000,
  },
  {
    requestId: 2n,
    requester: '0x1234567890123456789012345678901234567890' as const,
    deadline: Date.now() - 3600000,
    callbackGasLimit: 200000n,
    feePaid: 2000000000000000n,
    effectiveFeePerGas: 25000000000n,
    pubKeyHash: '0xabcdef',
    round: 12344n,
    status: 2, // Fulfilled
    randomness: 98765432109876543210n,
    callbackSuccess: true,
    actualGasUsed: 180000n,
    transactionHash: '0xtxhash2',
    blockNumber: 12340,
    timestamp: Date.now() - 7200000,
  },
]

describe('RequestHistory', () => {
  const mockOnRefresh = vi.fn()
  const mockOnRequestSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render list of randomness requests', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
        onRequestSelect={mockOnRequestSelect}
      />
    )

    expect(screen.getByText(/request #1/i)).toBeInTheDocument()
    expect(screen.getByText(/request #2/i)).toBeInTheDocument()
  })

  it('should show empty state when no requests', () => {
    render(
      <RequestHistory
        requests={[]}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/no requests found/i)).toBeInTheDocument()
  })

  it('should show loading state when isLoading is true', () => {
    render(
      <RequestHistory
        requests={[]}
        isLoading
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should call onRequestSelect when request is clicked', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
        onRequestSelect={mockOnRequestSelect}
      />
    )

    const firstRequest = screen.getByTestId('request-1')
    fireEvent.click(firstRequest)

    expect(mockOnRequestSelect).toHaveBeenCalledWith(mockRequests[0])
  })

  it('should call onRefresh when refresh button is clicked', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
      />
    )

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    expect(mockOnRefresh).toHaveBeenCalled()
  })

  it('should display request status correctly', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/pending/i)).toBeInTheDocument()
    expect(screen.getByText(/fulfilled/i)).toBeInTheDocument()
  })

  it('should show randomness value for fulfilled requests', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/98765432109876543210/)).toBeInTheDocument()
  })

  it('should format fees and gas information', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/0\.001 ETH/i)).toBeInTheDocument()
    expect(screen.getByText(/100,000/)).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
        className="custom-history"
      />
    )

    const container = screen.getByTestId('request-history')
    expect(container).toHaveClass('custom-history')
  })

  it('should show block explorer links for transactions', () => {
    render(
      <RequestHistory
        requests={mockRequests}
        onRefresh={mockOnRefresh}
      />
    )

    const explorerLinks = screen.getAllByRole('link', { name: /view on explorer/i })
    expect(explorerLinks).toHaveLength(2)
  })
})