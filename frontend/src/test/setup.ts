import { beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

// Mock window.ethereum
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  selectedAddress: null,
  chainId: '0x1',
  isMetaMask: true,
}

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
})

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
  }),
  useBalance: () => ({
    data: { formatted: '1.0', symbol: 'ETH' },
    isLoading: false,
  }),
  useConnect: () => ({
    connect: vi.fn(),
    connectors: [],
    isLoading: false,
  }),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
  useSwitchChain: () => ({
    switchChain: vi.fn(),
    error: null,
    isPending: false,
  }),
  useEnsName: () => ({
    data: null,
    isLoading: false,
  }),
  useEnsAvatar: () => ({
    data: null,
    isLoading: false,
  }),
  useChainId: () => 1,
  useChains: () => [],
  useConfig: () => ({}),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
  createConfig: vi.fn(),
  createStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
  cookieStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

// Mock Reown AppKit
vi.mock('@reown/appkit/react', () => ({
  createAppKit: vi.fn(),
  useAppKit: () => ({
    open: vi.fn(),
    close: vi.fn(),
  }),
  useAppKitAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
  useAppKitProvider: () => ({
    walletProvider: mockEthereum,
  }),
}))

// Mock Reown AppKit Adapter
vi.mock('@reown/appkit-adapter-wagmi', () => ({
  WagmiAdapter: vi.fn().mockImplementation(() => ({
    wagmiConfig: {},
    createConfig: vi.fn(),
  })),
}))

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    isLoading: false,
    error: null,
  }),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}))

// Mock the useWallet hook directly
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    isConnected: false,
    isConnecting: false,
    address: null,
    formattedAddress: null,
    displayName: null,
    balance: null,
    formattedBalance: null,
    currentNetwork: null,
    isNetworkSupported: false,
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
    error: null,
  }),
}))

// Mock the useAnyrand hook
vi.mock('../hooks/useAnyrand', () => ({
  useAnyrand: () => ({
    isReady: true,
    contractLimits: {
      maxCallbackGasLimit: BigInt(1000000),
      minCallbackGasLimit: BigInt(21000),
      baseFeePerGas: BigInt(1000000000),
    },
    requestRandomness: vi.fn().mockResolvedValue('0x123'),
    estimateFee: vi.fn().mockResolvedValue({
      baseFee: BigInt(1000000000),
      totalFee: BigInt(1000000000),
      formattedFee: '0.001',
    }),
    validateRequestParams: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    createDefaultParams: vi.fn().mockReturnValue({}),
    isRequestingRandomness: false,
    error: null,
  }),
}))

// Mock config
vi.mock('../lib/config', () => ({
  config: {
    reownProjectId: 'test-project-id',
    anyrandContractAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    beaconContractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    networkUrl: 'http://localhost:8545',
    chainId: 31337,
    isDevelopment: true,
    isProduction: false,
    deployments: {
      anyrand: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      beacon: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    },
  },
  validateEnvironment: vi.fn(),
  getRpcUrl: vi.fn().mockReturnValue('http://localhost:8545'),
  getContractAddress: vi.fn().mockReturnValue('0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'),
  isSupportedChain: vi.fn().mockReturnValue(true),
  getNetworkName: vi.fn().mockReturnValue('Test Network'),
  isDevelopment: vi.fn().mockReturnValue(true),
  isProduction: vi.fn().mockReturnValue(false),
  isDebugMode: vi.fn().mockReturnValue(false),
  isTestnetMode: vi.fn().mockReturnValue(true),
  ENV: {
    NODE_ENV: 'test',
    ENVIRONMENT: 'test',
    APP_URL: 'http://localhost:3000',
    REOWN_PROJECT_ID: 'test-project-id',
    FEATURES: {
      ANALYTICS: false,
      EMAIL: false,
      SOCIALS: false,
    },
    RPC_URLS: {
      SCROLL: 'http://localhost:8545',
      SCROLL_SEPOLIA: 'http://localhost:8545',
      BASE: 'http://localhost:8545',
      LOCAL: 'http://localhost:8545',
    },
  },
}))

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})