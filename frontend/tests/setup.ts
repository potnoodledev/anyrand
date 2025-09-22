import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock wagmi hooks for testing
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
  useChainId: vi.fn(() => 534351), // Scroll Sepolia
  useContractRead: vi.fn(),
  useContractWrite: vi.fn(),
  useWaitForTransaction: vi.fn(),
  usePrepareContractWrite: vi.fn(),
  useWatchContractEvent: vi.fn(),
}))

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_ANYRAND_SCROLL_SEPOLIA_ADDRESS = '0x86d8C50E04DDd04cdaafaC9672cf1D00b6057AF5'
process.env.NEXT_PUBLIC_BEACON_SCROLL_SEPOLIA_ADDRESS = '0x3b41d0A5E90d46c26361885D4562D6aB71E67380'
process.env.NEXT_PUBLIC_GAS_STATION_SCROLL_SEPOLIA_ADDRESS = '0x83de6642650Cdf1BC350A5a636269B8e1CA0469F'