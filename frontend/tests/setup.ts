import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_SCROLL: '0x1111111111111111111111111111111111111111',
    NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_SCROLL_SEPOLIA: '0x2222222222222222222222222222222222222222',
    NEXT_PUBLIC_ANYRAND_CONTRACT_ADDRESS_BASE: '0x3333333333333333333333333333333333333333',
    NEXT_PUBLIC_REOWN_PROJECT_ID: 'test-project-id',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('sessionStorage', sessionStorageMock)

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})

// Mock console methods in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
})

// Global test utilities
global.mockWalletConnection = (wallet: any) => {
  // Mock implementation for wallet connection
  window.dispatchEvent(new CustomEvent('wallet-connected', { detail: wallet }))
}

global.mockWalletDisconnection = () => {
  // Mock implementation for wallet disconnection
  window.dispatchEvent(new CustomEvent('wallet-disconnected'))
}

global.mockNetworkSwitch = (chainId: number) => {
  // Mock implementation for network switch
  window.dispatchEvent(new CustomEvent('network-switched', { detail: { chainId } }))
}

global.mockTransactionConfirmation = (hash: string, status: string, confirmations: number) => {
  // Mock implementation for transaction confirmation
  window.dispatchEvent(new CustomEvent('transaction-confirmed', {
    detail: { hash, status, confirmations }
  }))
}

// Type declarations for global mocks
declare global {
  var mockWalletConnection: (wallet: any) => void
  var mockWalletDisconnection: () => void
  var mockNetworkSwitch: (chainId: number) => void
  var mockTransactionConfirmation: (hash: string, status: string, confirmations: number) => void
}