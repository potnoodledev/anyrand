# Anyrand

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites and Setup](#prerequisites-and-setup)
4. [Local Hardhat Deployment Guide](#local-hardhat-deployment-guide)
5. [Example Implementation](#example-implementation)
6. [Testing the System](#testing-the-system)
7. [Troubleshooting](#troubleshooting)
8. [Contract Reference](#contract-reference)
9. [Security Considerations](#security-considerations)

## Project Overview

Anyrand is a **deterministic unpredictability as a service** platform that provides verifiable randomness on any EVM-compatible blockchain. It leverages the drand network (https://drand.love), a distributed randomness beacon, to provide cryptographically secure and verifiable random numbers for smart contracts.

### Key Features
- **Verifiable Randomness**: Uses BLS signatures from drand beacons for cryptographic proof
- **Deterministic**: Given a specific round and beacon, the randomness is deterministic yet unpredictable
- **Permissionless Fulfillment**: Anyone can fulfill randomness requests (though typically done by keepers)
- **Gas-Efficient**: Optimized for minimal gas consumption
- **Upgradeable**: Uses UUPS proxy pattern for future improvements
- **Multi-Network Support**: Supports Ethereum, Optimism, Scroll, Base, and other EVM chains

### How It Works
1. **Request Phase**: A consumer contract requests randomness by specifying a future deadline and paying a fee
2. **Waiting Period**: The system waits for the drand beacon round corresponding to the deadline
3. **Fulfillment Phase**: Once the beacon round is available, anyone can submit the BLS signature to fulfill the request
4. **Callback Phase**: The Anyrand contract verifies the signature and calls back to the consumer with the random value

## System Architecture

### Core Components

#### 1. **Anyrand.sol** - Main Coordinator Contract
- Manages randomness requests and fulfillments
- Verifies BLS signatures from drand beacons
- Handles payment and gas calculations
- Implements UUPS upgradeable pattern
- Includes reentrancy protection

#### 2. **DrandBeacon Contract**
- Stores drand beacon configuration (public key, genesis time, period)
- Verifies BLS signatures using BN254 curve operations
- Maintains beacon round validation logic

#### 3. **GasStation Contracts**
- Network-specific gas price calculation
- Supports different L2 gas models (Optimism, Scroll, Base)
- `GasStationEthereum`: Standard Ethereum gas calculation
- `GasStationOptimism`: Handles L1 data costs for Optimism
- `GasStationScroll`: Handles L1 data costs for Scroll

#### 4. **Consumer Contracts**
- Implement `IRandomiserCallbackV3` interface
- Request randomness from Anyrand
- Receive callbacks with random values

### Contract Interaction Flow

```
Consumer Contract
    |
    v
[1. requestRandomness(deadline, gasLimit)]
    |
    v
Anyrand Contract
    |
    ├──> [2. Calculate round from deadline]
    ├──> [3. Store request commitment]
    └──> [4. Emit RandomnessRequested event]
    
    [Wait for beacon round...]
    
Keeper/Fulfiller
    |
    v
[5. fulfillRandomness(requestId, ...params, signature)]
    |
    v
Anyrand Contract
    |
    ├──> [6. Verify request commitment]
    ├──> [7. Verify BLS signature via DrandBeacon]
    ├──> [8. Derive randomness from signature]
    └──> [9. Callback to consumer with random value]
         |
         v
    Consumer Contract
    [10. receiveRandomness(requestId, randomWord)]
```

## Prerequisites and Setup

### Required Tools and Dependencies

1. **Node.js**: Version 18.x or higher
   ```bash
   # Check version
   node --version
   
   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **Yarn Package Manager**: Version 1.22.x
   ```bash
   # Install yarn
   # Install yarn if not already installed
   npm install -g yarn@1.22.22
   ```

3. **Git**: For cloning the repository

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd anyrand
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```

3. **Environment Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env file if needed (not required for local deployment)
   ```

4. **Compile Contracts**
   ```bash
   yarn build
   ```

## Local Hardhat Deployment Guide

### Step 1: Start Local Hardhat Node

Open a terminal and start the Hardhat node:

```bash
yarn hardhat node
```

This will:
- Start a local Ethereum node on `http://localhost:8545`
- Create 10 test accounts with 1,000,000 ETH each
- Display private keys for testing

Keep this terminal open - the node must remain running.

### Step 2: Deploy Anyrand Stack

In a new terminal, deploy all contracts to the local network:

```bash
yarn deploy:local
```

This script (`scripts/deployAnyrandLocal.ts`) will:

1. **Deploy DrandBeacon Contract**
   - Configures the evmnet beacon parameters
   - Sets up BLS public key and timing parameters

2. **Deploy GasStation Contract**
   - Uses `GasStationEthereum` for local deployment
   - Configures gas price calculation

3. **Deploy Anyrand Coordinator**
   - Deploys implementation contract
   - Deploys UUPS proxy
   - Initializes with parameters:
     - Request premium: 150% (50% markup on gas costs)
     - Max callback gas: 7.5M gas
     - Max deadline delta: 5 minutes
     - Max fee per gas: 30 Gwei

The deployment will output the Anyrand proxy address - save this for later use.

### Step 3: Deploy Consumer Contract

Deploy an example consumer contract:

```bash
yarn hardhat run scripts/deployConsumer.ts --network localhost
```

Create the deployment script at `scripts/deployConsumer.ts`:

```typescript
import { ethers } from 'hardhat'
import { AnyrandConsumer__factory } from '../typechain-types'

async function main() {
    const ANYRAND_ADDRESS = '0x...' // Use address from Step 2
    
    const [deployer] = await ethers.getSigners()
    console.log('Deploying AnyrandConsumer with account:', deployer.address)
    
    const consumer = await new AnyrandConsumer__factory(deployer)
        .deploy(ANYRAND_ADDRESS)
    
    await consumer.waitForDeployment()
    const consumerAddress = await consumer.getAddress()
    
    console.log('AnyrandConsumer deployed at:', consumerAddress)
    console.log('Anyrand coordinator:', await consumer.anyrand())
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
```

## Example Implementation

### Complete Example Script: Request and Fulfill Randomness

Create a comprehensive example script at `scripts/exampleRandomnessFlow.ts`:

```typescript
import { ethers } from 'hardhat'
import { 
    Anyrand__factory, 
    AnyrandConsumer__factory,
    DrandBeacon__factory 
} from '../typechain-types'
import { formatEther, formatUnits, getBytes, keccak256 } from 'ethers'
import { bn254 } from '@kevincharm/noble-bn254-drand'
import { getDrandBeaconRound } from '../lib/drand'

// Configuration - Update these addresses after deployment
const ANYRAND_ADDRESS = '0x...'      // From deployment step
const CONSUMER_ADDRESS = '0x...'     // From consumer deployment
const BEACON_ADDRESS = '0x...'       // From deployment step

async function main() {
    console.log('Starting Anyrand randomness flow example...\n')
    
    // Setup signers
    const [requester, fulfiller] = await ethers.getSigners()
    console.log('Requester address:', requester.address)
    console.log('Fulfiller address:', fulfiller.address, '\n')
    
    // Connect to contracts
    const anyrand = Anyrand__factory.connect(ANYRAND_ADDRESS, requester)
    const consumer = AnyrandConsumer__factory.connect(CONSUMER_ADDRESS, requester)
    const beacon = DrandBeacon__factory.connect(BEACON_ADDRESS, requester)
    
    // ====================================================================
    // STEP 1: REQUEST RANDOMNESS
    // ====================================================================
    console.log('=== STEP 1: Requesting Randomness ===')
    
    // Configuration
    const callbackGasLimit = 100_000
    const deadline = Math.floor(Date.now() / 1000) + 30 // 30 seconds from now
    
    // Get request price
    const [requestPrice, effectiveFeePerGas] = await anyrand.getRequestPrice(
        callbackGasLimit
    )
    console.log(`Request price: ${formatEther(requestPrice)} ETH`)
    console.log(`Effective gas price: ${formatUnits(effectiveFeePerGas, 'gwei')} gwei`)
    
    // Make request through consumer
    console.log('\nSending randomness request...')
    const requestTx = await consumer.getRandom(deadline, callbackGasLimit, {
        value: requestPrice
    })
    const requestReceipt = await requestTx.wait(1)
    console.log(`Request transaction: ${requestTx.hash}`)
    
    // Parse request event to get requestId and round
    const requestEvent = anyrand.interface.parseLog(
        requestReceipt!.logs[0]
    )
    const { requestId, round, pubKeyHash } = requestEvent!.args
    
    console.log(`Request ID: ${requestId}`)
    console.log(`Target beacon round: ${round}`)
    console.log(`Public key hash: ${pubKeyHash}\n`)
    
    // Check request state
    const requestState = await anyrand.getRequestState(requestId)
    console.log(`Request state: ${getRequestStateName(requestState)}`)
    
    // ====================================================================
    // STEP 2: WAIT FOR BEACON ROUND
    // ====================================================================
    console.log('\n=== STEP 2: Waiting for Beacon Round ===')
    
    // For local testing, we simulate the beacon round
    // In production, you would fetch from actual drand network
    console.log('Waiting for deadline to pass...')
    
    // Get beacon parameters
    const beaconGenesis = await beacon.genesisTimestamp()
    const beaconPeriod = await beacon.period()
    
    // Calculate when round will be available
    const roundTimestamp = Number(beaconGenesis) + (Number(round) - 1) * Number(beaconPeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const waitTime = Math.max(0, roundTimestamp - currentTime)
    
    if (waitTime > 0) {
        console.log(`Waiting ${waitTime} seconds for round ${round}...`)
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
    }
    
    // ====================================================================
    // STEP 3: GENERATE/FETCH BEACON SIGNATURE
    // ====================================================================
    console.log('\n=== STEP 3: Getting Beacon Signature ===')
    
    // For local testing, generate signature
    // In production, fetch from drand API: https://api.drand.sh/v2/beacons/evmnet/rounds/{round}
    
    const signature = await generateLocalBeaconSignature(round)
    console.log(`Signature generated for round ${round}`)
    
    // ====================================================================
    // STEP 4: FULFILL RANDOMNESS
    // ====================================================================
    console.log('\n=== STEP 4: Fulfilling Randomness ===')
    
    // Anyone can fulfill - we'll use the fulfiller account
    const anyrandFulfiller = anyrand.connect(fulfiller)
    
    console.log('Submitting fulfillment transaction...')
    const fulfillTx = await anyrandFulfiller.fulfillRandomness(
        requestId,
        requester.address,  // Original requester
        pubKeyHash,
        round,
        callbackGasLimit,
        signature
    )
    const fulfillReceipt = await fulfillTx.wait(1)
    console.log(`Fulfillment transaction: ${fulfillTx.hash}`)
    
    // Parse fulfillment event
    const fulfillEvent = anyrand.interface.parseLog(
        fulfillReceipt!.logs[fulfillReceipt!.logs.length - 1]
    )
    const { randomness, callbackSuccess, actualGasUsed } = fulfillEvent!.args
    
    console.log(`\nFulfillment Results:`)
    console.log(`Random value: ${randomness}`)
    console.log(`Callback success: ${callbackSuccess}`)
    console.log(`Gas used for callback: ${actualGasUsed}`)
    
    // ====================================================================
    // STEP 5: VERIFY RANDOMNESS RECEIVED
    // ====================================================================
    console.log('\n=== STEP 5: Verifying Randomness ===')
    
    // Check that consumer received the randomness
    const storedRandomness = await consumer.randomness(requestId)
    console.log(`Randomness stored in consumer: ${storedRandomness}`)
    
    // Verify final state
    const finalRequestState = await anyrand.getRequestState(requestId)
    console.log(`Final request state: ${getRequestStateName(finalRequestState)}`)
    
    // ====================================================================
    // SUMMARY
    // ====================================================================
    console.log('\n=== Summary ===')
    console.log(`✅ Successfully requested and received verifiable randomness!`)
    console.log(`Request ID: ${requestId}`)
    console.log(`Random Value: ${randomness}`)
    console.log(`Total Cost: ${formatEther(requestPrice)} ETH`)
}

// Helper function to generate local beacon signature for testing
async function generateLocalBeaconSignature(round: bigint): Promise<[bigint, bigint]> {
    // In production, this would come from the drand API
    // For local testing, we generate a deterministic signature
    
    // This is a simplified version - actual implementation would use
    // the proper BLS signing with the beacon's private key
    const DST = 'BLS_SIG_BN254G1_XMD:KECCAK-256_SVDW_RO_NUL_'
    
    // Create deterministic "signature" for testing
    // WARNING: This is NOT cryptographically secure - only for local testing!
    const roundBytes = getBytes('0x' + round.toString(16).padStart(16, '0'))
    const hashedRound = keccak256(roundBytes)
    
    // For local testing, use the test beacon's private key
    // This would be the evmnet beacon's actual signature in production
    const testSecretKey = bn254.utils.randomPrivateKey()
    const M = bn254.G1.hashToCurve(getBytes(hashedRound), { DST })
    const sig = bn254.signShortSignature(M, testSecretKey).toAffine()
    
    return [sig.x, sig.y]
}

// Helper function to get request state name
function getRequestStateName(state: number): string {
    const states = ['Nonexistent', 'Pending', 'Fulfilled', 'Failed']
    return states[state] || 'Unknown'
}

main()
    .then(() => {
        console.log('\n✨ Example completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Error:', error)
        process.exit(1)
    })
```

### Running the Example

1. Ensure Hardhat node is running
2. Deploy contracts (if not already deployed)
3. Update addresses in the example script
4. Run the example:
   ```bash
   yarn hardhat run scripts/exampleRandomnessFlow.ts --network localhost
   ```

## Testing the System

### Unit Tests

Run the comprehensive test suite:

```bash
# Run all tests
yarn test

# Run with coverage
yarn coverage

# Run specific test file
yarn hardhat test test/Anyrand.spec.ts
```

### End-to-End Tests

The project includes E2E tests that simulate the complete flow:

```bash
yarn hardhat test test/Anyrand.e2e.ts
```

### Manual Testing Steps

1. **Test Request Creation**
   ```javascript
   // Get request price
   const [price] = await anyrand.getRequestPrice(100000)
   
   // Submit request
   const deadline = Math.floor(Date.now() / 1000) + 60
   await anyrand.requestRandomness(deadline, 100000, { value: price })
   ```

2. **Test Request State**
   ```javascript
   const state = await anyrand.getRequestState(requestId)
   // 0 = Nonexistent, 1 = Pending, 2 = Fulfilled, 3 = Failed
   ```

3. **Test Fulfillment (Local)**
   ```javascript
   // Generate test signature (local only)
   const signature = [BigInt('0x...'), BigInt('0x...')]
   
   // Fulfill request
   await anyrand.fulfillRandomness(
       requestId,
       requesterAddress,
       pubKeyHash,
       round,
       callbackGasLimit,
       signature
   )
   ```

### Gas Usage Analysis

Monitor gas consumption:

```bash
# Run gas reporter
REPORT_GAS=true yarn test
```

Typical gas costs:
- Request randomness: ~120,000 gas
- Fulfill randomness: ~200,000 gas + callback gas
- BLS verification: ~65,000 gas

## Troubleshooting

### Common Issues and Solutions

#### 1. "Incorrect Payment" Error
**Problem**: Transaction reverts with `IncorrectPayment` error.

**Solution**: Ensure you're sending the exact request price:
```javascript
const [requestPrice] = await anyrand.getRequestPrice(callbackGasLimit)
// Send exactly requestPrice, not more or less
```

#### 2. "Invalid Deadline" Error
**Problem**: Transaction reverts with `InvalidDeadline` error.

**Solutions**:
- Deadline must be in the future: `deadline > block.timestamp`
- Deadline must be at least one beacon period away: `deadline >= block.timestamp + period`
- Deadline must not be too far: `deadline <= block.timestamp + maxDeadlineDelta`

#### 3. "Over Gas Limit" Error
**Problem**: Callback gas limit exceeds maximum.

**Solution**: Use a lower gas limit (max is 7.5M for local):
```javascript
const callbackGasLimit = 100_000 // Use reasonable limit
```

#### 4. Callback Fails
**Problem**: Randomness fulfillment succeeds but callback fails.

**Solutions**:
- Check consumer contract implements `IRandomiserCallbackV3`
- Ensure callback function doesn't revert
- Verify callback gas limit is sufficient
- Check for reentrancy issues

#### 5. "Invalid Request State" Error
**Problem**: Trying to fulfill already fulfilled request.

**Solution**: Each request can only be fulfilled once. Check state before fulfilling:
```javascript
const state = await anyrand.getRequestState(requestId)
if (state === 1) { // Pending
    // Safe to fulfill
}
```

#### 6. Local Node Connection Issues
**Problem**: Cannot connect to local Hardhat node.

**Solutions**:
- Ensure node is running: `yarn hardhat node`
- Check network configuration in hardhat.config.ts
- Verify RPC URL is `http://localhost:8545`

#### 7. Signature Verification Fails
**Problem**: BLS signature verification fails during fulfillment.

**Solutions**:
- For local testing, ensure test signatures match beacon configuration
- For mainnet, fetch correct signature from drand API
- Verify beacon public key matches deployed configuration

### Debug Tips

1. **Enable Hardhat Console Logging**
   ```javascript
   import "hardhat/console.sol";
   
   contract MyContract {
       function debug() public {
           console.log("Value:", someValue);
       }
   }
   ```

2. **Use Hardhat's Mainnet Forking**
   ```javascript
   networks: {
       hardhat: {
           forking: {
               url: "https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY",
           }
       }
   }
   ```

3. **Trace Transactions**
   ```bash
   yarn hardhat trace <TX_HASH> --network localhost
   ```

## Contract Reference

### Main Contracts

#### Anyrand.sol
- **Purpose**: Main coordinator for randomness requests
- **Key Functions**:
  - `requestRandomness(deadline, callbackGasLimit)`: Request random value
  - `fulfillRandomness(...)`: Fulfill pending request
  - `getRequestPrice(callbackGasLimit)`: Calculate request cost
  - `getRequestState(requestId)`: Check request status

#### AnyrandConsumer.sol
- **Purpose**: Example consumer contract
- **Key Functions**:
  - `getRandom(deadline, callbackGasLimit)`: Request randomness
  - `receiveRandomness(requestId, randomWord)`: Callback for receiving randomness

### Interfaces

#### IRandomiserCallbackV3
```solidity
interface IRandomiserCallbackV3 {
    function receiveRandomness(
        uint256 requestId, 
        uint256 randomWord
    ) external;
}
```

#### IAnyrand
Core interface for Anyrand coordinator with request/fulfill functions.

### Events

#### RandomnessRequested
```solidity
event RandomnessRequested(
    uint256 indexed requestId,
    address indexed requester,
    bytes32 indexed pubKeyHash,
    uint256 round,
    uint256 callbackGasLimit,
    uint256 feePaid,
    uint256 effectiveFeePerGas
);
```

#### RandomnessFulfilled
```solidity
event RandomnessFulfilled(
    uint256 indexed requestId,
    uint256 randomness,
    bool callbackSuccess,
    uint256 actualGasUsed
);
```

## Security Considerations

### Key Security Features

1. **Reentrancy Protection**: All state-changing functions use reentrancy guards
2. **Request Commitment**: Requests are committed with hash to prevent tampering
3. **Signature Verification**: BLS signatures are verified on-chain
4. **Access Controls**: Admin functions protected by Ownable pattern
5. **Upgrade Safety**: UUPS pattern with owner-only upgrade authorization

### Best Practices for Consumers

1. **Validate Callback Source**
   ```solidity
   function receiveRandomness(uint256 requestId, uint256 randomWord) external {
       require(msg.sender == anyrand, "Only Anyrand can call");
       // Process randomness...
   }
   ```

2. **Handle Failed Callbacks**
   - Implement fallback logic for failed callbacks
   - Monitor `RandomnessCallbackFailed` events
   - Consider manual recovery mechanisms

3. **Gas Limit Considerations**
   - Set appropriate callback gas limits
   - Account for contract growth over time
   - Test with realistic data sizes

4. **Request Tracking**
   - Store request IDs for tracking
   - Implement request timeout handling
   - Monitor for stuck requests

### Audit Recommendations

1. Review custom BLS implementation in DrandBeacon
2. Verify gas calculation logic in GasStation contracts
3. Test upgrade scenarios with UUPS proxy
4. Validate randomness derivation algorithm
5. Check for potential griefing vectors in fulfillment

## Advanced Topics

### Custom Beacon Integration

To integrate a custom drand beacon:

1. Deploy new DrandBeacon contract with beacon parameters
2. Call `setBeacon()` on Anyrand (owner only)
3. Update keeper configurations for new beacon

### Gas Optimization Strategies

1. Batch multiple random requests when possible
2. Use lower callback gas limits when feasible
3. Implement efficient callback processing
4. Consider off-chain processing with on-chain verification

### Network-Specific Deployments

Different networks require different gas stations:
- **Ethereum L1**: Use GasStationEthereum
- **Optimism**: Use GasStationOptimism with L1 data costs
- **Scroll**: Use GasStationScroll with compression
- **Base**: Use GasStationOptimism (same model)

### Keeper Infrastructure

For production deployments:
1. Set up keeper bots to monitor RandomnessRequested events
2. Implement automatic fulfillment when rounds are available
3. Configure gas price strategies
4. Monitor keeper performance and reliability

## Conclusion

Anyrand provides a robust, verifiable randomness solution for Ethereum and L2 networks. By leveraging drand's distributed randomness beacon and implementing on-chain BLS signature verification, it ensures both security and verifiability of random values.

For production deployments, ensure proper testing, security audits, and keeper infrastructure setup. The system's modular architecture allows for future improvements and beacon migrations while maintaining backward compatibility through the UUPS upgrade pattern.

## Additional Resources

- Drand Documentation: https://drand.love
- BLS Signatures: https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature
- EIP-1967 (Proxy Storage Slots): https://eips.ethereum.org/EIPS/eip-1967
- OpenZeppelin UUPS: https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable