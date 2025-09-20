import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { RandomnessRequestForm } from '@/components/RandomnessRequestForm'
import { PendingRequests } from '@/components/PendingRequests'
import { TestWrapper } from '../utils/TestWrapper'

// Mock Wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWriteContract: vi.fn(),
  useReadContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useGasPrice: vi.fn(),
  useEstimateGas: vi.fn(),
}))

// Mock contract ABIs
vi.mock('@/contracts/abis/anyrand', () => ({
  anyrandAbi: [],
}))

const mockContractRead = vi.fn()
const mockContractWrite = vi.fn()

const TestComponent = () => (
  <TestWrapper>
    <div>
      <RandomnessRequestForm
        onSubmit={() => {}}
        isLoading={false}
      />
      <PendingRequests
        requests={[]}
        onFulfill={() => {}}
      />
    </div>
  </TestWrapper>
)

describe('Anyrand Contract Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: 534352,
    })

    vi.mocked(require('wagmi').useReadContract).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockContractRead,
    })

    vi.mocked(require('wagmi').useWriteContract).mockReturnValue({
      writeContract: mockContractWrite,
      isPending: false,
      error: null,
    })

    vi.mocked(require('wagmi').useGasPrice).mockReturnValue({
      data: 20000000000n, // 20 gwei
    })

    vi.mocked(require('wagmi').useEstimateGas).mockReturnValue({
      data: 100000n,
    })
  })

  it('should interact with Anyrand contract for price estimation', async () => {
    // Mock getRequestPrice contract call
    vi.mocked(require('wagmi').useReadContract).mockReturnValue({
      data: {
        totalPrice: 1000000000000000n, // 0.001 ETH
        effectiveFeePerGas: 20000000000n,
        baseFee: 15000000000n,
        priorityFee: 5000000000n,
        gasEstimate: 100000n,
      },
      isLoading: false,
      error: null,
      refetch: mockContractRead,
    })

    render(<TestComponent />)

    // Fill in gas limit
    const gasLimitInput = screen.getByLabelText(/gas limit/i)
    fireEvent.change(gasLimitInput, { target: { value: '100000' } })

    await waitFor(() => {
      expect(screen.getByText(/0\.001 ETH/i)).toBeInTheDocument()
      expect(screen.getByText(/20 gwei/i)).toBeInTheDocument()
    })

    // Verify contract was called with correct parameters
    expect(mockContractRead).toHaveBeenCalled()
  })

  it('should submit randomness request to contract', async () => {
    mockContractWrite.mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef12345678',
    })

    render(<TestComponent />)

    // Fill in form
    const deadlineInput = screen.getByLabelText(/deadline/i)
    const gasLimitInput = screen.getByLabelText(/gas limit/i)

    fireEvent.change(deadlineInput, { target: { value: '60' } })
    fireEvent.change(gasLimitInput, { target: { value: '100000' } })

    // Submit form
    const submitButton = screen.getByRole('button', { name: /request randomness/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockContractWrite).toHaveBeenCalledWith({
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        abi: expect.any(Array),
        functionName: 'requestRandomness',
        args: [
          expect.any(BigInt), // deadline
          expect.any(BigInt), // callbackGasLimit
        ],
        value: expect.any(BigInt), // fee
      })
    })
  })

  it('should read pending requests from contract', async () => {
    // Mock pending requests data
    const mockPendingRequests = [
      {
        requestId: 1n,
        requester: '0x9876543210987654321098765432109876543210',
        deadline: BigInt(Date.now() + 3600000),
        round: 12345n,
        callbackGasLimit: 100000n,
      }
    ]

    vi.mocked(require('wagmi').useReadContract).mockReturnValue({
      data: mockPendingRequests,
      isLoading: false,
      error: null,
      refetch: mockContractRead,
    })

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByText(/request #1/i)).toBeInTheDocument()
    })
  })

  it('should fulfill randomness request via contract', async () => {
    const mockFulfillment = vi.fn().mockResolvedValue({
      hash: '0xfulfillment1234567890abcdef1234567890abcdef',
    })

    vi.mocked(require('wagmi').useWriteContract).mockReturnValue({
      writeContract: mockFulfillment,
      isPending: false,
      error: null,
    })

    const mockPendingRequests = [
      {
        requestId: 1n,
        requester: '0x9876543210987654321098765432109876543210' as const,
        deadline: Date.now() - 300000, // Fulfillable
        round: 12345n,
        callbackGasLimit: 100000n,
        estimatedEarnings: 500000000000000n,
        timeUntilFulfillable: 0,
        networkGasCost: 200000000000000n,
        profitMargin: 300000000000000n,
      }
    ]

    render(
      <TestWrapper>
        <PendingRequests
          requests={mockPendingRequests}
          onFulfill={async (requestId) => {
            mockFulfillment({
              address: '0xContractAddress',
              abi: [],
              functionName: 'fulfillRandomness',
              args: [
                requestId,
                '0x9876543210987654321098765432109876543210',
                '0xpubKeyHash',
                12345n,
                100000n,
                [123n, 456n],
              ],
            })
            return { transactionHash: '0xfulfillment', requestId, earnings: 500000000000000n }
          }}
        />
      </TestWrapper>
    )

    const fulfillButton = screen.getByRole('button', { name: /fulfill/i })
    fireEvent.click(fulfillButton)

    await waitFor(() => {
      expect(mockFulfillment).toHaveBeenCalledWith({
        address: '0xContractAddress',
        abi: [],
        functionName: 'fulfillRandomness',
        args: [
          1n, // requestId
          '0x9876543210987654321098765432109876543210', // requester
          '0xpubKeyHash', // pubKeyHash
          12345n, // round
          100000n, // callbackGasLimit
          [123n, 456n], // signature
        ],
      })
    })
  })

  it('should handle contract errors gracefully', async () => {
    const contractError = new Error('Contract execution reverted')
    vi.mocked(require('wagmi').useWriteContract).mockReturnValue({
      writeContract: vi.fn().mockRejectedValue(contractError),
      isPending: false,
      error: contractError,
    })

    render(<TestComponent />)

    expect(screen.getByText(/contract execution reverted/i)).toBeInTheDocument()
  })

  it('should handle insufficient balance errors', async () => {
    const insufficientFundsError = new Error('insufficient funds')
    vi.mocked(require('wagmi').useWriteContract).mockReturnValue({
      writeContract: vi.fn().mockRejectedValue(insufficientFundsError),
      isPending: false,
      error: insufficientFundsError,
    })

    render(<TestComponent />)

    expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument()
  })

  it('should validate contract address configuration', () => {
    render(<TestComponent />)

    // Verify that contract addresses are properly configured for different chains
    // This would typically check the environment variables or config
    expect(process.env.NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_SCROLL).toBeDefined()
    expect(process.env.NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_SCROLL_SEPOLIA).toBeDefined()
  })

  it('should handle chain-specific contract interactions', async () => {
    // Test Scroll network
    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: 534352, // Scroll
    })

    render(<TestComponent />)

    expect(mockContractRead).toHaveBeenCalledWith(
      expect.objectContaining({
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        chainId: 534352,
      })
    )
  })

  it('should monitor transaction confirmations', async () => {
    const mockWaitForTransaction = vi.fn().mockResolvedValue({
      status: 'success',
      blockNumber: 12345,
      gasUsed: 95000n,
    })

    vi.mocked(require('wagmi').useWaitForTransactionReceipt).mockReturnValue({
      data: {
        status: 'success',
        blockNumber: 12345,
        gasUsed: 95000n,
      },
      isLoading: false,
      error: null,
    })

    render(<TestComponent />)

    // Verify transaction monitoring is set up
    expect(require('wagmi').useWaitForTransactionReceipt).toHaveBeenCalled()
  })
})