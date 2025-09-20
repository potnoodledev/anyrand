import { render, screen, fireEvent } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { TransactionStatus } from '@/components/TransactionStatus'

describe('TransactionStatus', () => {
  const mockOnStatusChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render pending status correctly', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="pending"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByText(/pending/i)).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should render confirmed status with confirmations count', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="confirmed"
        confirmations={5}
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByText(/confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(/5 confirmations/i)).toBeInTheDocument()
  })

  it('should render failed status with error indication', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="failed"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByText(/failed/i)).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })

  it('should render replaced status', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="replaced"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByText(/replaced/i)).toBeInTheDocument()
  })

  it('should display transaction hash with proper formatting', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef1234567890abcdef12345678"
        status="pending"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByText(/0x1234...5678/i)).toBeInTheDocument()
  })

  it('should provide link to block explorer', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="confirmed"
        onStatusChange={mockOnStatusChange}
      />
    )

    const explorerLink = screen.getByRole('link', { name: /view on explorer/i })
    expect(explorerLink).toHaveAttribute('href', expect.stringContaining('0x1234567890abcdef'))
    expect(explorerLink).toHaveAttribute('target', '_blank')
  })

  it('should call onStatusChange when status updates', () => {
    const { rerender } = render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="pending"
        onStatusChange={mockOnStatusChange}
      />
    )

    rerender(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="confirmed"
        confirmations={1}
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(mockOnStatusChange).toHaveBeenCalledWith('confirmed')
  })

  it('should show progress bar for pending transactions', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="pending"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show estimated time for pending transactions', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="pending"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByText(/estimated time/i)).toBeInTheDocument()
  })

  it('should handle copy to clipboard functionality', () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="confirmed"
        onStatusChange={mockOnStatusChange}
      />
    )

    const copyButton = screen.getByRole('button', { name: /copy hash/i })
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0x1234567890abcdef')
  })

  it('should apply custom className', () => {
    render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="pending"
        onStatusChange={mockOnStatusChange}
        className="custom-status"
      />
    )

    const container = screen.getByTestId('transaction-status')
    expect(container).toHaveClass('custom-status')
  })

  it('should show different icons for different statuses', () => {
    const { rerender } = render(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="pending"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByTestId('pending-icon')).toBeInTheDocument()

    rerender(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="confirmed"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByTestId('success-icon')).toBeInTheDocument()

    rerender(
      <TransactionStatus
        hash="0x1234567890abcdef"
        status="failed"
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })
})