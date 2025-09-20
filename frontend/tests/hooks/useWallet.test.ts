import { renderHook, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { useWallet } from '@/hooks/useWallet'

// Mock Wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
  useSwitchChain: vi.fn(),
  useBalance: vi.fn(),
  useEnsName: vi.fn(),
  useConfig: vi.fn(),
}))

// Mock Reown AppKit
vi.mock('@reown/appkit/react', () => ({
  useAppKit: vi.fn(),
}))

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return disconnected state initially', () => {
    const { result } = renderHook(() => useWallet())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.isConnecting).toBe(false)
    expect(result.current.address).toBeUndefined()
    expect(result.current.chainId).toBeUndefined()
  })

  it('should return connected state when wallet is connected', async () => {
    // Mock connected state
    vi.mocked(useAccount).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chainId: 1,
      isConnected: true,
      isConnecting: false,
    })

    vi.mocked(useBalance).mockReturnValue({
      data: { formatted: '1.5', symbol: 'ETH' },
    })

    const { result } = renderHook(() => useWallet())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
      expect(result.current.address).toBe('0x1234567890123456789012345678901234567890')
      expect(result.current.chainId).toBe(1)
      expect(result.current.balance).toBe('1.5 ETH')
    })
  })

  it('should handle wallet connection', async () => {
    const mockConnect = vi.fn()
    vi.mocked(useConnect).mockReturnValue({
      connect: mockConnect,
      isPending: false,
    })

    const { result } = renderHook(() => useWallet())

    await result.current.connect()

    expect(mockConnect).toHaveBeenCalled()
  })

  it('should handle wallet disconnection', async () => {
    const mockDisconnect = vi.fn()
    vi.mocked(useDisconnect).mockReturnValue({
      disconnect: mockDisconnect,
    })

    const { result } = renderHook(() => useWallet())

    result.current.disconnect()

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should handle chain switching', async () => {
    const mockSwitchChain = vi.fn()
    vi.mocked(useSwitchChain).mockReturnValue({
      switchChain: mockSwitchChain,
      isPending: false,
    })

    const { result } = renderHook(() => useWallet())

    await result.current.switchChain(137) // Polygon

    expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 137 })
  })

  it('should detect correct chain', () => {
    vi.mocked(useAccount).mockReturnValue({
      chainId: 534352, // Scroll
      isConnected: true,
    })

    const { result } = renderHook(() => useWallet())

    expect(result.current.isCorrectChain).toBe(true)
  })

  it('should detect incorrect chain', () => {
    vi.mocked(useAccount).mockReturnValue({
      chainId: 1, // Ethereum mainnet (not supported in test config)
      isConnected: true,
    })

    const { result } = renderHook(() => useWallet())

    expect(result.current.isCorrectChain).toBe(false)
  })

  it('should return supported chains list', () => {
    const { result } = renderHook(() => useWallet())

    expect(result.current.supportedChains).toContain(534352) // Scroll
    expect(result.current.supportedChains).toContain(534351) // Scroll Sepolia
    expect(result.current.supportedChains).toContain(8453) // Base
  })

  it('should handle ENS name resolution', async () => {
    vi.mocked(useEnsName).mockReturnValue({
      data: 'test.eth',
    })

    const { result } = renderHook(() => useWallet())

    await waitFor(() => {
      expect(result.current.ensName).toBe('test.eth')
    })
  })

  it('should handle connection errors', () => {
    const mockError = new Error('Connection failed')
    vi.mocked(useConnect).mockReturnValue({
      error: mockError,
    })

    const { result } = renderHook(() => useWallet())

    expect(result.current.error).toBe(mockError)
  })

  it('should show connecting state during connection', () => {
    vi.mocked(useAccount).mockReturnValue({
      isConnecting: true,
      isConnected: false,
    })

    const { result } = renderHook(() => useWallet())

    expect(result.current.isConnecting).toBe(true)
    expect(result.current.isConnected).toBe(false)
  })

  it('should handle addChain for custom networks', async () => {
    const mockAddChain = vi.fn()
    // This would be implemented in the actual hook
    const customChain = {
      chainId: 421614,
      name: 'Arbitrum Sepolia',
      rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
      blockExplorerUrls: ['https://sepolia.arbiscan.io'],
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
    }

    const { result } = renderHook(() => useWallet())

    await result.current.addChain(customChain)

    // This test will fail until addChain is implemented
    expect(mockAddChain).toHaveBeenCalledWith(customChain)
  })
})