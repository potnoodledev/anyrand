import { createConfig, http } from 'wagmi'
import { scroll, scrollSepolia, base } from 'wagmi/chains'
import { mock } from 'wagmi/connectors'

// Test configuration for Wagmi
export const createTestConfig = () => {
  return createConfig({
    chains: [scroll, scrollSepolia, base],
    connectors: [
      mock({
        accounts: [
          '0x1234567890123456789012345678901234567890',
          '0x9876543210987654321098765432109876543210',
          '0x5555555555555555555555555555555555555555',
        ],
      }),
    ],
    transports: {
      [scroll.id]: http('https://rpc.scroll.io'),
      [scrollSepolia.id]: http('https://sepolia-rpc.scroll.io'),
      [base.id]: http('https://mainnet.base.org'),
    },
  })
}

// Mock contract addresses for testing
export const mockContractAddresses = {
  [scroll.id]: '0x1111111111111111111111111111111111111111',
  [scrollSepolia.id]: '0x2222222222222222222222222222222222222222',
  [base.id]: '0x3333333333333333333333333333333333333333',
}

// Mock Anyrand ABI for testing
export const mockAnyrandAbi = [
  {
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint256' }
    ],
    name: 'requestRandomness',
    outputs: [
      { name: 'requestId', type: 'uint256' }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'callbackGasLimit', type: 'uint256' }
    ],
    name: 'getRequestPrice',
    outputs: [
      { name: 'totalPrice', type: 'uint256' },
      { name: 'effectiveFeePerGas', type: 'uint256' },
      { name: 'baseFee', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'gasEstimate', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'requestId', type: 'uint256' }
    ],
    name: 'getRequestState',
    outputs: [
      { name: 'state', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'requester', type: 'address' },
      { name: 'pubKeyHash', type: 'bytes32' },
      { name: 'round', type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint256' },
      { name: 'signature', type: 'uint256[2]' }
    ],
    name: 'fulfillRandomness',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

// Test data factories
export const createMockRandomnessRequest = (overrides = {}) => ({
  requestId: 1n,
  requester: '0x1234567890123456789012345678901234567890' as const,
  deadline: Date.now() + 3600000,
  callbackGasLimit: 100000n,
  feePaid: 1000000000000000n,
  effectiveFeePerGas: 20000000000n,
  pubKeyHash: '0xabcdef1234567890abcdef1234567890abcdef12',
  round: 12345n,
  status: 1,
  transactionHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
  blockNumber: 12345,
  timestamp: Date.now() - 300000,
  ...overrides,
})

export const createMockPendingRequest = (overrides = {}) => ({
  requestId: 1n,
  requester: '0x9876543210987654321098765432109876543210' as const,
  deadline: Date.now() - 300000,
  round: 12346n,
  callbackGasLimit: 150000n,
  estimatedEarnings: 500000000000000n,
  timeUntilFulfillable: 0,
  networkGasCost: 200000000000000n,
  profitMargin: 300000000000000n,
  ...overrides,
})

export const createMockTransaction = (overrides = {}) => ({
  hash: '0x1234567890abcdef1234567890abcdef12345678',
  type: 'randomness_request' as const,
  status: 'pending' as const,
  timestamp: Date.now(),
  confirmations: 0,
  ...overrides,
})

// Test utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const advanceTimers = (ms: number) => {
  vi.advanceTimersByTime(ms)
  return waitForNextTick()
}