# Data Model: Anyrand Contract Interaction Components

**Date**: 2025-09-22
**Feature**: Contract interaction frontend components

## Core Entities

### RandomnessRequest
Represents a user's request for verifiable randomness from the smart contract.

**Fields**:
- `id: bigint` - Unique request identifier from contract
- `requester: Address` - Wallet address that submitted the request
- `deadline: bigint` - Unix timestamp deadline for fulfillment
- `callbackGasLimit: bigint` - Gas limit for callback execution
- `feePaid: bigint` - Amount paid in native token for the request
- `effectiveFeePerGas: bigint` - Gas price used for fee calculation
- `status: RequestStatus` - Current state of the request
- `transactionHash: Hash` - Hash of the request transaction
- `blockNumber: bigint` - Block number when request was submitted
- `timestamp: bigint` - Unix timestamp when request was created
- `pubKeyHash: Hex` - Hash of the beacon public key used

**Relationships**:
- One-to-zero-or-one with RandomnessFulfillment
- Many-to-one with UserActivity (requester)

**State Transitions**:
- `Nonexistent` → `Pending` (when request submitted)
- `Pending` → `Fulfilled` (when operator fulfills)
- `Pending` → `Failed` (when fulfillment fails)

**Validation Rules**:
- `deadline` must be in the future when submitted
- `callbackGasLimit` must be within contract limits
- `feePaid` must meet minimum fee requirements
- `requester` must be valid Ethereum address

### RandomnessFulfillment
Represents the completion of a randomness request by an operator.

**Fields**:
- `requestId: bigint` - Reference to fulfilled request
- `randomness: bigint` - Generated randomness value (256-bit)
- `operator: Address` - Address that fulfilled the request
- `callbackSuccess: boolean` - Whether callback execution succeeded
- `actualGasUsed: bigint` - Actual gas consumed during fulfillment
- `transactionHash: Hash` - Hash of fulfillment transaction
- `blockNumber: bigint` - Block number when fulfilled
- `timestamp: bigint` - Unix timestamp of fulfillment
- `round: bigint` - DRAND beacon round used for randomness
- `signature: [bigint, bigint]` - BLS signature from beacon

**Relationships**:
- One-to-one with RandomnessRequest

**Validation Rules**:
- `requestId` must reference existing request
- `randomness` must be non-zero 256-bit value
- `operator` must be valid Ethereum address
- `actualGasUsed` must be positive

### RequestStatus
Enumeration representing the current state of a randomness request.

**Values**:
- `Nonexistent = 0` - Request ID not found
- `Pending = 1` - Request submitted, awaiting fulfillment
- `Fulfilled = 2` - Request completed successfully
- `Failed = 3` - Request fulfillment failed

**Usage**:
- Used for filtering and display logic
- Determines available user actions
- Controls UI state representation

### NetworkStatistics
Aggregated data about randomness activity on the current network.

**Fields**:
- `totalRequests: bigint` - Total number of requests ever made
- `pendingRequests: bigint` - Current number of pending requests
- `fulfilledRequests: bigint` - Total number of fulfilled requests
- `failedRequests: bigint` - Total number of failed requests
- `successRate: number` - Percentage of successful fulfillments
- `averageFulfillmentTime: number` - Average time to fulfillment in seconds
- `totalFeesCollected: bigint` - Total fees paid for requests
- `activeOperators: number` - Number of unique operators fulfilling requests
- `lastUpdated: bigint` - Timestamp of last statistics update

**Derivation**:
- Calculated from historical request and fulfillment data
- Updated periodically via background queries
- Cached for performance with configurable TTL

### TransactionData
Represents blockchain transaction information for contract interactions.

**Fields**:
- `hash: Hash` - Transaction hash
- `from: Address` - Sender address
- `to: Address` - Recipient address (contract)
- `value: bigint` - ETH value sent
- `gasLimit: bigint` - Gas limit set
- `gasUsed?: bigint` - Actual gas used (after confirmation)
- `gasPrice?: bigint` - Gas price used
- `maxFeePerGas?: bigint` - EIP-1559 max fee per gas
- `maxPriorityFeePerGas?: bigint` - EIP-1559 priority fee
- `blockNumber?: bigint` - Block number (after confirmation)
- `blockHash?: Hash` - Block hash (after confirmation)
- `transactionIndex?: number` - Index in block
- `status: 'pending' | 'confirmed' | 'failed'` - Transaction status
- `confirmations: number` - Number of confirmations
- `timestamp?: bigint` - Block timestamp

**Usage**:
- Tracking transaction progress
- Displaying transaction details to users
- Linking to block explorers

### UserActivity
Represents a user's interaction history with the randomness service.

**Fields**:
- `address: Address` - User's wallet address
- `requestsSubmitted: bigint` - Total requests made by user
- `requestsFulfilled: bigint` - Total requests user has fulfilled
- `totalFeesSpent: bigint` - Total fees paid for requests
- `totalFeesEarned: bigint` - Total fees earned from fulfillments
- `averageRequestValue: bigint` - Average fee per request
- `firstActivityTimestamp: bigint` - When user first interacted
- `lastActivityTimestamp: bigint` - Most recent interaction
- `activeRequests: RandomnessRequest[]` - Currently pending requests
- `recentRequests: RandomnessRequest[]` - Last 10 requests made
- `recentFulfillments: RandomnessFulfillment[]` - Last 10 fulfillments done

**Relationships**:
- One-to-many with RandomnessRequest (as requester)
- One-to-many with RandomnessFulfillment (as operator)

## Supporting Types

### ContractConfig
Configuration data for interacting with Anyrand contracts.

**Fields**:
- `anyrandAddress: Address` - Main contract address
- `beaconAddress: Address` - Beacon contract address
- `gasStationAddress: Address` - Gas station contract address
- `maxCallbackGasLimit: bigint` - Maximum allowed callback gas
- `maxDeadlineDelta: bigint` - Maximum deadline offset
- `minimumFee: bigint` - Minimum fee required
- `isDeployed: boolean` - Whether contracts are deployed on current chain

**Usage**:
- Form validation and defaults
- Transaction parameter validation
- Network compatibility checking

### PaginationState
State for paginated data display.

**Fields**:
- `currentPage: number` - Current page number (0-indexed)
- `pageSize: number` - Items per page
- `totalItems: number` - Total available items
- `hasNextPage: boolean` - Whether more pages available
- `hasPreviousPage: boolean` - Whether previous pages exist
- `cursor?: string` - Cursor for cursor-based pagination
- `filters: FilterCriteria` - Applied filters

### FilterCriteria
Criteria for filtering randomness requests and fulfillments.

**Fields**:
- `requester?: Address` - Filter by requester address
- `operator?: Address` - Filter by fulfillment operator
- `status?: RequestStatus[]` - Filter by request status
- `fromTimestamp?: bigint` - Start time filter
- `toTimestamp?: bigint` - End time filter
- `minFee?: bigint` - Minimum fee filter
- `maxFee?: bigint` - Maximum fee filter

### FormState
State management for request submission forms.

**Fields**:
- `deadline: string` - User input for deadline
- `callbackGasLimit: string` - User input for gas limit
- `estimatedFee: bigint` - Calculated fee for current inputs
- `isValid: boolean` - Whether form passes validation
- `errors: Record<string, string>` - Field-specific error messages
- `isSubmitting: boolean` - Whether submission in progress
- `simulationResult?: SimulationResult` - Pre-submission simulation

### SimulationResult
Result of transaction simulation before submission.

**Fields**:
- `success: boolean` - Whether simulation succeeded
- `gasEstimate: bigint` - Estimated gas consumption
- `revertReason?: string` - Reason if simulation failed
- `warnings: string[]` - Non-fatal warnings for user
- `feeBreakdown: FeeBreakdown` - Detailed fee calculation

### FeeBreakdown
Detailed breakdown of request fees.

**Fields**:
- `baseFee: bigint` - Base randomness service fee
- `gasPrice: bigint` - Current gas price
- `callbackGasLimit: bigint` - Gas for callback execution
- `totalFee: bigint` - Total cost to user
- `operatorReward: bigint` - Portion paid to operator
- `protocolFee: bigint` - Portion retained by protocol

## Data Flow Patterns

### Request Submission Flow
1. User inputs deadline and gas limit in form
2. Form validates inputs against contract constraints
3. Real-time fee estimation updates on input changes
4. Transaction simulation runs on form submission
5. If simulation succeeds, transaction submitted to contract
6. Request appears in pending list with `Pending` status
7. Background polling updates status when fulfilled

### Fulfillment Flow
1. Operator views pending requests list
2. Selects request to fulfill based on profitability
3. System validates operator eligibility
4. Fulfillment transaction submitted with DRAND proof
5. Request status updates to `Fulfilled` or `Failed`
6. Statistics and user activity data updated

### Historical Data Flow
1. Component requests paginated historical data
2. System queries contract events with block range
3. Data enriched with transaction details
4. Results cached with TTL for performance
5. Real-time events update cache as needed
6. Pagination state manages data display

## State Management Strategy

### React Query Keys
```typescript
// Request data queries
['randomness', 'requests', { status, requester, page }]
['randomness', 'request', requestId]
['randomness', 'fulfillment', requestId]

// Statistics queries
['randomness', 'stats', chainId]
['randomness', 'user-activity', address]

// Contract configuration
['randomness', 'config', chainId]
['randomness', 'contract-state', { address, method, args }]

// Transaction tracking
['transaction', hash]
['transaction', 'simulation', { to, data, value }]
```

### Local State (React)
- Form inputs and validation
- UI state (modals, expanded items)
- Pagination and filtering preferences
- Transaction submission progress

### Persistent State (Local Storage)
- User interface preferences
- Filter and sort preferences
- Recently viewed requests
- Form defaults

## Validation Rules

### Input Validation
- Deadline must be at least 1 hour in future, max 7 days
- Callback gas limit between 100,000 and contract maximum
- Fee must cover minimum + gas costs
- All addresses must be valid checksummed format

### Business Rules
- Users can only fulfill requests they didn't create
- Requests cannot be fulfilled after deadline
- Fulfillment requires valid DRAND signature
- Failed callbacks still count as fulfilled for operator payment

### Performance Constraints
- Pagination limited to 100 items per page
- Historical queries limited to 6 months by default
- Real-time updates throttled to prevent excessive RPC calls
- Cache TTL of 30 seconds for contract reads, 5 minutes for statistics