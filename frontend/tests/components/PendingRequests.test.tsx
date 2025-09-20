import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { PendingRequests } from '@/components/PendingRequests'
import type { PendingRequest } from '@/types/entities'

// Mock data for testing
const mockPendingRequests: PendingRequest[] = [
  {
    requestId: 3n,
    requester: '0x9876543210987654321098765432109876543210' as const,
    deadline: Date.now() - 300000, // 5 minutes ago (fulfillable)
    round: 12346n,
    callbackGasLimit: 150000n,
    estimatedEarnings: 500000000000000n, // 0.0005 ETH
    timeUntilFulfillable: 0,
    networkGasCost: 200000000000000n, // 0.0002 ETH
    profitMargin: 300000000000000n, // 0.0003 ETH
  },
  {
    requestId: 4n,
    requester: '0x5555555555555555555555555555555555555555' as const,
    deadline: Date.now() + 1800000, // 30 minutes from now
    round: 12347n,
    callbackGasLimit: 100000n,
    estimatedEarnings: 800000000000000n, // 0.0008 ETH
    timeUntilFulfillable: 1800,
    networkGasCost: 150000000000000n, // 0.00015 ETH
    profitMargin: 650000000000000n, // 0.00065 ETH
  },
]

describe('PendingRequests', () => {
  const mockOnFulfill = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render list of pending requests', () => {
    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    expect(screen.getByText(/request #3/i)).toBeInTheDocument()
    expect(screen.getByText(/request #4/i)).toBeInTheDocument()
  })

  it('should show empty state when no pending requests', () => {
    render(
      <PendingRequests
        requests={[]}
        onFulfill={mockOnFulfill}
      />
    )

    expect(screen.getByText(/no pending requests/i)).toBeInTheDocument()
  })

  it('should show loading state when isLoading is true', () => {
    render(
      <PendingRequests
        requests={[]}
        isLoading
        onFulfill={mockOnFulfill}
      />
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display estimated earnings for each request', () => {
    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    expect(screen.getByText(/0\.0005 ETH/i)).toBeInTheDocument()
    expect(screen.getByText(/0\.0008 ETH/i)).toBeInTheDocument()
  })

  it('should show fulfill button for ready requests', () => {
    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    const fulfillButtons = screen.getAllByRole('button', { name: /fulfill/i })
    expect(fulfillButtons).toHaveLength(1) // Only the first request is ready
  })

  it('should show countdown for requests not yet ready', () => {
    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    expect(screen.getByText(/ready in/i)).toBeInTheDocument()
  })

  it('should call onFulfill when fulfill button is clicked', async () => {
    mockOnFulfill.mockResolvedValue({ success: true })

    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    const fulfillButton = screen.getByRole('button', { name: /fulfill request #3/i })
    fireEvent.click(fulfillButton)

    await waitFor(() => {
      expect(mockOnFulfill).toHaveBeenCalledWith(3n)
    })
  })

  it('should sort requests by profit margin by default', () => {
    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    const requestCards = screen.getAllByTestId(/request-card/)
    expect(requestCards[0]).toHaveTextContent('request #4') // Higher profit margin
    expect(requestCards[1]).toHaveTextContent('request #3') // Lower profit margin
  })

  it('should show gas cost and profit information', () => {
    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    expect(screen.getByText(/gas cost/i)).toBeInTheDocument()
    expect(screen.getByText(/profit/i)).toBeInTheDocument()
  })

  it('should disable fulfill button during fulfillment', async () => {
    mockOnFulfill.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    const fulfillButton = screen.getByRole('button', { name: /fulfill request #3/i })
    fireEvent.click(fulfillButton)

    await waitFor(() => {
      expect(fulfillButton).toBeDisabled()
      expect(screen.getByText(/fulfilling.../i)).toBeInTheDocument()
    })
  })

  it('should show error state when fulfillment fails', async () => {
    mockOnFulfill.mockRejectedValue(new Error('Fulfillment failed'))

    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
      />
    )

    const fulfillButton = screen.getByRole('button', { name: /fulfill request #3/i })
    fireEvent.click(fulfillButton)

    await waitFor(() => {
      expect(screen.getByText(/fulfillment failed/i)).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    render(
      <PendingRequests
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
        className="custom-pending"
      />
    )

    const container = screen.getByTestId('pending-requests')
    expect(container).toHaveClass('custom-pending')
  })
})