# Data Model: Anyrand Frontend Application

**Date**: 2025-09-20
**Phase**: Phase 1 - Design & Contracts

## Core Entities

### RandomnessRequest
Represents a user's request for verifiable randomness from the Anyrand system.

**Fields**:
- `requestId: bigint` - Unique identifier for the request
- `requester: Address` - Address of the user/contract that requested randomness
- `deadline: number` - Unix timestamp when randomness should be available
- `callbackGasLimit: bigint` - Gas limit allocated for the callback function
- `feePaid: bigint` - Amount of ETH paid for the request (in wei)
- `effectiveFeePerGas: bigint` - Gas price used for fee calculation
- `pubKeyHash: string` - Hash of the drand beacon public key
- `round: bigint` - Target drand beacon round for randomness generation
- `status: RequestState` - Current state of the request
- `randomness?: bigint` - The generated random value (if fulfilled)
- `callbackSuccess?: boolean` - Whether the callback succeeded (if fulfilled)
- `actualGasUsed?: bigint` - Gas actually consumed during fulfillment
- `transactionHash: string` - Hash of the request transaction
- `blockNumber: number` - Block number where request was mined
- `timestamp: number` - Unix timestamp when request was submitted

**State Transitions**:
- `Nonexistent` → `Pending` (when request is submitted)
- `Pending` → `Fulfilled` (when randomness is provided)
- `Pending` → `Failed` (when fulfillment fails)

**Validation Rules**:
- `deadline` must be in the future when submitted
- `callbackGasLimit` must not exceed contract maximum
- `feePaid` must match calculated request price
- `requester` must be a valid Ethereum address

### Transaction
Represents blockchain transactions related to randomness operations.

**Fields**:
- `hash: string` - Transaction hash
- `type: TransactionType` - Type of transaction (request, fulfillment)
- `from: Address` - Sender address
- `to: Address` - Recipient address (Anyrand contract)
- `value: bigint` - ETH value transferred (in wei)
- `gasLimit: bigint` - Gas limit set for transaction
- `gasUsed?: bigint` - Actual gas consumed
- `gasPrice: bigint` - Gas price used
- `blockNumber?: number` - Block number (when confirmed)
- `blockHash?: string` - Block hash (when confirmed)
- `confirmations: number` - Number of confirmations
- `status: TransactionStatus` - Current status
- `timestamp: number` - Unix timestamp when submitted
- `relatedRequestId?: bigint` - Associated request ID (if applicable)

**State Transitions**:
- `Pending` → `Confirmed` (when mined)
- `Pending` → `Failed` (if reverted)
- `Confirmed` → `Replaced` (if reorganized)

### UserSession
Represents a connected wallet session and user preferences.

**Fields**:
- `address: Address` - Connected wallet address
- `chainId: number` - Current network chain ID
- `isConnected: boolean` - Connection status
- `walletType: string` - Type of wallet (MetaMask, WalletConnect, etc.)
- `balance: string` - ETH balance (formatted)
- `ensName?: string` - ENS name if available
- `lastConnected: number` - Unix timestamp of last connection
- `preferences: UserPreferences` - User-specific settings

**Relationships**:
- One session can have many `RandomnessRequest` entities
- Session tracks all transactions for the connected address

### PendingRequest
Represents randomness requests from other users available for fulfillment.

**Fields**:
- `requestId: bigint` - Request identifier
- `requester: Address` - Original requester address
- `deadline: number` - Request deadline
- `round: bigint` - Target drand round
- `callbackGasLimit: bigint` - Callback gas allocation
- `estimatedEarnings: bigint` - Potential earnings from fulfillment
- `timeUntilFulfillable: number` - Seconds until fulfillment possible
- `complexity: FulfillmentComplexity` - Difficulty/risk level
- `networkGasCost: bigint` - Estimated gas cost for fulfillment

**Derived Fields**:
- `profitMargin: bigint` - `estimatedEarnings - networkGasCost`
- `isReadyForFulfillment: boolean` - Whether deadline has passed
- `riskLevel: RiskLevel` - Based on gas costs and potential earnings

### DrandRound
Represents the current state of the drand beacon system.

**Fields**:
- `currentRound: bigint` - Latest available drand round
- `roundTimestamp: number` - Timestamp of current round
- `nextRoundTime: number` - Expected time of next round
- `beaconPeriod: number` - Time between rounds (seconds)
- `genesisTime: number` - Beacon genesis timestamp
- `pubKeyHash: string` - Current beacon public key hash
- `isHealthy: boolean` - Whether beacon is operating normally

**Calculations**:
- `roundForDeadline(deadline: number): bigint` - Calculate target round for deadline
- `timeUntilRound(round: bigint): number` - Time until specific round available

## Type Definitions

### Enums

```typescript
enum RequestState {
  Nonexistent = 0,
  Pending = 1,
  Fulfilled = 2,
  Failed = 3
}

enum TransactionStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Failed = 'failed',
  Replaced = 'replaced'
}

enum TransactionType {
  Request = 'request',
  Fulfillment = 'fulfillment'
}

enum FulfillmentComplexity {
  Simple = 'simple',
  Moderate = 'moderate',
  Complex = 'complex'
}

enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}
```

### Complex Types

```typescript
interface UserPreferences {
  defaultGasLimit: number;
  autoRefresh: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  currency: 'ETH' | 'USD';
}

interface PriceEstimate {
  totalPrice: bigint;
  effectiveFeePerGas: bigint;
  baseFee: bigint;
  priorityFee: bigint;
  estimatedGas: bigint;
}

interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contractAddresses: {
    anyrand: Address;
    beacon: Address;
    gasStation: Address;
  };
}
```

## Data Relationships

### Primary Relationships
- `UserSession` → Many `RandomnessRequest` (one user can have multiple requests)
- `RandomnessRequest` → One `Transaction` (request transaction)
- `RandomnessRequest` → Zero or One `Transaction` (fulfillment transaction)
- `PendingRequest` → One `RandomnessRequest` (represents same entity from different perspective)

### Aggregated Data
- **User Statistics**: Total requests, success rate, total fees paid
- **Network Statistics**: Total requests, average fulfillment time, current gas prices
- **Fulfillment Opportunities**: Available earnings, optimal timing

## Data Flow Patterns

### Request Submission Flow
1. User configures request parameters
2. System calculates price estimate
3. User confirms and submits transaction
4. `RandomnessRequest` created with `Pending` status
5. Transaction confirmed, request becomes trackable

### Fulfillment Monitoring Flow
1. System monitors drand beacon for round availability
2. Eligible requests moved to fulfillment pool
3. Users can browse and select fulfillment opportunities
4. Fulfillment transaction submitted and tracked
5. Request status updated to `Fulfilled` or `Failed`

### Real-time Updates
- Event listeners update request status in real-time
- Transaction confirmations trigger state updates
- Drand round updates refresh fulfillment availability
- Balance changes trigger price recalculations

## Storage Strategy

### Local Storage
- User preferences and session data
- Recent transaction history (last 50 transactions)
- Cached price estimates (5-minute TTL)

### Memory/State Management
- Active requests and their current status
- Real-time drand beacon information
- Network configuration and contract addresses
- Transaction pending status

### No Persistent Backend
- All data derived from blockchain state
- Event logs provide historical data
- Real-time queries for current information
- Local caching for performance optimization

This data model provides the foundation for a comprehensive frontend application that handles all aspects of the Anyrand randomness system while maintaining real-time accuracy and optimal user experience.