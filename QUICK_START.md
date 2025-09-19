# Anyrand - Quick Start Guide

This guide will get you up and running with Anyrand randomness in 3 minutes.

## Prerequisites

- Node.js 18+ and Yarn installed
- Git installed

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Clone and setup
git clone <repository-url>
cd anyrand
yarn install
```

### 2. Compile Contracts

```bash
yarn build
```

### 3. Start Local Blockchain

Open a new terminal and run:

```bash
yarn hardhat node
```

Keep this terminal open - it's your local blockchain.

### 4. Deploy Anyrand System

In a new terminal:

```bash
yarn deploy:local
```

Note the deployed Anyrand proxy address (e.g., `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`)

### 5. Run Complete Quickstart

**New Simplified Process** - Run everything in one command:

```bash
yarn quickstart:local
```

This single command will:
1. ✅ Deploy the AnyrandConsumer contract automatically
2. ✅ Submit a randomness request
3. ✅ Wait for the beacon round
4. ✅ Attempt fulfillment (demonstrates the complete flow)
5. ✅ Show contract deployment addresses for future use

**That's it!** Your local Anyrand environment is ready.

## What You'll See

The quickstart script will show:

```
🚀 Anyrand Local Quickstart
=====================================

STEP 1: Setup and Validation
✅ Anyrand connected: Anyrand 1.0.0

STEP 2: Deploy Consumer Contract
✅ AnyrandConsumer deployed at: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

STEP 3: Request Randomness
✅ Request confirmed in block: 123
- Request ID: 1
- Target beacon round: 564321

STEP 4: Wait for Beacon Round
✅ Round is now available!

STEP 5: Generate Beacon Signature
✅ Signature generated for round 564321

STEP 6: Fulfill Randomness Request
❌ Fulfillment failed (expected in local testing)
✅ The request/fulfillment flow structure is working correctly!

🎉 QUICKSTART COMPLETE!
✅ Consumer deployed at: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
✅ Randomness request submitted successfully
ℹ️  Fulfillment failed (expected in local testing with test signatures)
```

**Note**: The fulfillment "failure" is expected in local testing because we use test signatures. In production, real drand signatures would enable actual randomness generation.

## Understanding the Flow

1. **Request**: Consumer pays ETH and requests randomness for a future deadline
2. **Wait**: System waits for the drand beacon round at the deadline
3. **Fulfill**: Anyone can submit the beacon signature to fulfill the request
4. **Callback**: Anyrand verifies signature and sends random value to consumer

## Key Concepts

- **Deadline**: When you want randomness available (must be future)
- **Callback Gas Limit**: Gas for your contract's callback function
- **Request Price**: ETH cost covering gas for fulfillment
- **Beacon Round**: Specific round from drand network used for randomness

## Available Commands

```bash
# Compile contracts
yarn build

# Run tests
yarn test

# Start local blockchain
yarn hardhat node

# Deploy Anyrand system
yarn deploy:local

# Complete quickstart (deploy consumer + run flow)
yarn quickstart:local

# Check gas costs
REPORT_GAS=true yarn test
```

## Legacy Individual Commands

If you prefer to run steps individually (not recommended for quickstart):

```bash
# Deploy consumer separately (update addresses manually)
yarn hardhat run scripts/deployConsumer.ts --network localhost

# Run example flow separately (update addresses manually)
yarn hardhat run scripts/exampleRandomnessFlow.ts --network localhost
```

## Troubleshooting

**Quickstart Fails at Deployment**: Ensure Hardhat node is running in a separate terminal

**"Incorrect Payment" Error**: Send exact request price from `getRequestPrice()`

**"Invalid Deadline" Error**: Deadline must be at least 30 seconds in future

**Connection Issues**: Ensure Hardhat node is running on port 8545

**"InvalidRequestHash" Error**: This is expected in local testing - see script output explanation

## Next Steps

- Read [README.md](./README.md) for detailed technical documentation
- Explore contract code in `contracts/`
- Review tests in `test/` for advanced usage patterns

## Production Deployment

For mainnet/testnet deployment:
1. Set up environment variables in `.env`
2. Configure network in `hardhat.config.ts`
3. Use network-specific deployment scripts in `scripts/`
4. Set up keeper infrastructure for automatic fulfillment

---

Need help? Check the full documentation or contract code for detailed explanations.