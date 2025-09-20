import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { RandomnessRequestForm } from '@/components/RandomnessRequestForm'

// This test will fail until RandomnessRequestForm is implemented
describe('RandomnessRequestForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields for deadline and gas limit', () => {
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gas limit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /request randomness/i })).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /request randomness/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/deadline is required/i)).toBeInTheDocument()
      expect(screen.getByText(/gas limit is required/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate deadline is in the future', async () => {
    const user = userEvent.setup()
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} />)

    const deadlineInput = screen.getByLabelText(/deadline/i)
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

    await user.type(deadlineInput, pastDate)
    fireEvent.click(screen.getByRole('button', { name: /request randomness/i }))

    await waitFor(() => {
      expect(screen.getByText(/deadline must be in the future/i)).toBeInTheDocument()
    })
  })

  it('should validate gas limit within acceptable range', async () => {
    const user = userEvent.setup()
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} />)

    const gasLimitInput = screen.getByLabelText(/gas limit/i)

    // Test too low
    await user.type(gasLimitInput, '1000')
    fireEvent.click(screen.getByRole('button', { name: /request randomness/i }))

    await waitFor(() => {
      expect(screen.getByText(/gas limit too low/i)).toBeInTheDocument()
    })

    // Test too high
    await user.clear(gasLimitInput)
    await user.type(gasLimitInput, '10000000')
    fireEvent.click(screen.getByRole('button', { name: /request randomness/i }))

    await waitFor(() => {
      expect(screen.getByText(/gas limit too high/i)).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} />)

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

    await user.type(screen.getByLabelText(/deadline/i), futureDate)
    await user.type(screen.getByLabelText(/gas limit/i), '100000')

    fireEvent.click(screen.getByRole('button', { name: /request randomness/i }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        deadline: expect.any(Number),
        callbackGasLimit: 100000,
      })
    })
  })

  it('should show loading state when isLoading prop is true', () => {
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} isLoading />)

    const submitButton = screen.getByRole('button', { name: /requesting.../i })
    expect(submitButton).toBeDisabled()
  })

  it('should display price estimation when form is valid', async () => {
    const user = userEvent.setup()
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} />)

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

    await user.type(screen.getByLabelText(/deadline/i), futureDate)
    await user.type(screen.getByLabelText(/gas limit/i), '100000')

    await waitFor(() => {
      expect(screen.getByText(/estimated cost/i)).toBeInTheDocument()
      expect(screen.getByText(/ETH/i)).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    render(<RandomnessRequestForm onSubmit={mockOnSubmit} className="custom-form" />)

    const form = screen.getByRole('form') || screen.getByTestId('randomness-form')
    expect(form).toHaveClass('custom-form')
  })
})