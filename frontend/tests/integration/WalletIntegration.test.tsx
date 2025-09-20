import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { WalletProvider } from '@/providers/WalletProvider'
import { WalletConnectButton } from '@/components/WalletConnectButton'

// Mock Wagmi and Reown AppKit
vi.mock('wagmi', () => ({
  WagmiProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wagmi-provider">{children}</div>,
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
  useSwitchChain: vi.fn(),
  useBalance: vi.fn(),
  useEnsName: vi.fn(),
  useConfig: vi.fn(),
  createConfig: vi.fn(),
}))

vi.mock('@reown/appkit/react', () => ({
  createAppKit: vi.fn(),
  useAppKit: vi.fn(),
  AppKitProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="appkit-provider">{children}</div>,
}))

vi.mock('@reown/appkit/networks', () => ({
  scroll: { id: 534352, name: 'Scroll' },
  scrollSepolia: { id: 534351, name: 'Scroll Sepolia' },
  base: { id: 8453, name: 'Base' },
}))

const TestComponent = () => (
  <WalletProvider>
    <WalletConnectButton onConnect={() => {}} />
  </WalletProvider>
)

describe('Wallet Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render wallet provider with children', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('wagmi-provider')).toBeInTheDocument()
    expect(screen.getByTestId('appkit-provider')).toBeInTheDocument()
  })

  it('should initialize wallet configuration correctly', () => {
    render(<TestComponent />)

    // Verify that Wagmi config is created with correct parameters
    expect(require('wagmi').createConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        chains: expect.arrayContaining([
          expect.objectContaining({ id: 534352 }), // Scroll
          expect.objectContaining({ id: 534351 }), // Scroll Sepolia
          expect.objectContaining({ id: 8453 }),   // Base
        ]),
        transports: expect.any(Object),
      })
    )
  })

  it('should create AppKit with correct project configuration', () => {
    render(<TestComponent />)

    expect(require('@reown/appkit/react').createAppKit).toHaveBeenCalledWith(
      expect.objectContaining({
        adapters: expect.any(Array),
        projectId: expect.any(String),
        networks: expect.any(Array),
        metadata: expect.objectContaining({
          name: 'Anyrand',
          description: 'Verifiable Randomness Service',
          url: expect.any(String),
          icons: expect.any(Array),
        }),
        features: expect.objectContaining({
          analytics: true,
          email: false,
          socials: [],
        }),
      })
    )
  })

  it('should handle wallet connection flow', async () => {
    const mockConnect = vi.fn()
    vi.mocked(require('wagmi').useConnect).mockReturnValue({
      connect: mockConnect,
      isPending: false,
    })

    render(<TestComponent />)

    const connectButton = screen.getByRole('button', { name: /connect wallet/i })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled()
    })
  })

  it('should handle wallet disconnection', async () => {
    const mockDisconnect = vi.fn()
    vi.mocked(require('wagmi').useDisconnect).mockReturnValue({
      disconnect: mockDisconnect,
    })

    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
    })

    render(<TestComponent />)

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    fireEvent.click(disconnectButton)

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should handle chain switching', async () => {
    const mockSwitchChain = vi.fn()
    vi.mocked(require('wagmi').useSwitchChain).mockReturnValue({
      switchChain: mockSwitchChain,
      isPending: false,
    })

    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnected: true,
      chainId: 1, // Wrong chain
    })

    render(<TestComponent />)

    // This would be triggered by a chain switch request
    fireEvent.click(screen.getByRole('button', { name: /switch to scroll/i }))

    await waitFor(() => {
      expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 534352 })
    })
  })

  it('should display correct wallet information when connected', async () => {
    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: 534352,
    })

    vi.mocked(require('wagmi').useBalance).mockReturnValue({
      data: { formatted: '1.5', symbol: 'ETH' },
    })

    vi.mocked(require('wagmi').useEnsName).mockReturnValue({
      data: 'test.eth',
    })

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByText('test.eth')).toBeInTheDocument()
      expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
    })
  })

  it('should handle connection errors gracefully', async () => {
    const mockError = new Error('Connection failed')
    vi.mocked(require('wagmi').useConnect).mockReturnValue({
      connect: vi.fn(),
      error: mockError,
      isPending: false,
    })

    render(<TestComponent />)

    expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
  })

  it('should show loading state during connection', () => {
    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnecting: true,
      isConnected: false,
    })

    render(<TestComponent />)

    expect(screen.getByText(/connecting/i)).toBeInTheDocument()
  })

  it('should provide wallet context to child components', () => {
    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: 534352,
    })

    render(<TestComponent />)

    // Verify that wallet information is accessible throughout the component tree
    expect(screen.getByText(/0x1234...7890/i)).toBeInTheDocument()
  })

  it('should handle unsupported networks', () => {
    vi.mocked(require('wagmi').useAccount).mockReturnValue({
      isConnected: true,
      chainId: 999999, // Unsupported network
    })

    render(<TestComponent />)

    expect(screen.getByText(/unsupported network/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch network/i })).toBeInTheDocument()
  })
})