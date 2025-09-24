# Quickstart Test Scenarios: Deploy LottoPGF Contracts

## Overview
This document defines test scenarios for validating the LottoPGF deployment integration with Anyrand quickstart scripts.

## Prerequisites
- Node.js 18+ installed
- Hardhat environment configured
- Git repository cloned
- Dependencies installed (`yarn install`)

## Test Environment Setup

### Local Development
```bash
# Terminal 1: Start Hardhat node
yarn hardhat node

# Terminal 2: Run quickstart
yarn quickstart:local
```

### Scroll Sepolia
```bash
# Ensure .env has required keys
SCROLL_SEPOLIA_RPC_URL=<your_rpc_url>
DEPLOYER_PRIVATE_KEY=<your_private_key>

# Run quickstart
yarn quickstart:scrollSepolia
```

## Test Scenarios

### Scenario 1: Fresh Local Deployment
**Given**: Clean local Hardhat environment with no existing deployments
**When**: Running `yarn quickstart:local`
**Then**:
- Anyrand contracts deploy successfully
- LottoPGF contracts deploy after Anyrand
- All contract addresses are saved to .env
- Deployment manifest is created
- Console shows both deployments with addresses

**Verification Steps**:
1. Check .env file contains all addresses
2. Verify contracts respond to calls
3. Confirm LottoPGF references correct Anyrand address

---

### Scenario 2: Incremental Deployment
**Given**: Anyrand already deployed locally
**When**: Running LottoPGF deployment separately
**Then**:
- Script detects existing Anyrand deployment
- Uses existing Anyrand address for LottoPGF
- Only deploys LottoPGF contracts
- Updates .env with new addresses

**Verification Steps**:
1. Anyrand addresses unchanged in .env
2. LottoPGF contracts reference existing Anyrand
3. No duplicate deployments

---

### Scenario 3: Scroll Sepolia Deployment
**Given**: Connected to Scroll Sepolia testnet
**When**: Running `yarn quickstart:scrollSepolia`
**Then**:
- Deploys with correct network config
- Uses Scroll Sepolia WETH address
- Handles testnet gas pricing
- Saves testnet addresses separately

**Verification Steps**:
1. Verify on Scroll Sepolia explorer
2. Check gas usage is within limits
3. Confirm contract verification (if enabled)

---

### Scenario 4: Path Resolution
**Given**: LottoPGF contracts with incorrect import paths
**When**: Deployment script runs
**Then**:
- Import paths are resolved correctly
- TypeScript compilation succeeds
- No missing module errors
- Deployment completes successfully

**Verification Steps**:
1. Check no compilation errors
2. Verify all imports resolved
3. Confirm typechain types generated

---

### Scenario 5: Failed Anyrand Deployment
**Given**: Anyrand deployment fails
**When**: Script attempts LottoPGF deployment
**Then**:
- LottoPGF deployment is skipped
- Error message clearly indicates dependency
- No partial deployment state
- Exit code indicates failure

**Verification Steps**:
1. Check error message mentions Anyrand
2. Verify no LottoPGF addresses in .env
3. Confirm clean rollback

---

### Scenario 6: Network Mismatch
**Given**: Anyrand on different network than target
**When**: Attempting LottoPGF deployment
**Then**:
- Script detects network mismatch
- Shows clear error about network
- Suggests correct network
- Exits without deployment

**Verification Steps**:
1. Error mentions both networks
2. No deployment attempted
3. Clear instructions for fix

---

### Scenario 7: Lottery Creation
**Given**: Both systems deployed successfully
**When**: Creating a new lottery instance
**Then**:
- Factory creates lottery contract
- Lottery connects to Anyrand
- Can request randomness
- Proper event emission

**Verification Steps**:
1. Create lottery via factory
2. Check lottery's anyrand address
3. Submit randomness request
4. Verify request logged

---

### Scenario 8: Gas Estimation
**Given**: Deployment on gas-sensitive network
**When**: Running deployment
**Then**:
- Script estimates gas before deployment
- Shows estimated costs
- Warns if balance insufficient
- Optimizes deployment order

**Verification Steps**:
1. Check gas estimates shown
2. Verify actual usage matches estimate
3. Confirm optimization applied

---

## Manual Testing Checklist

### Pre-Deployment
- [ ] Clean git status
- [ ] Dependencies installed
- [ ] Network accessible
- [ ] Sufficient balance

### During Deployment
- [ ] Progress indicators shown
- [ ] No unexpected errors
- [ ] Transaction confirmations
- [ ] Address logging

### Post-Deployment
- [ ] All addresses in .env
- [ ] Contracts callable
- [ ] References correct
- [ ] Manifest created

### Integration Testing
- [ ] Lottery creation works
- [ ] Randomness request works
- [ ] ETH adapter functions
- [ ] SVG renderer works

## Automated Test Commands

```bash
# Run deployment tests
yarn test:deploy

# Run integration tests
yarn test:integration

# Run specific scenario
yarn test:deploy --grep "Scenario 1"

# Run with coverage
yarn test:deploy --coverage
```

## Expected Console Output

### Successful Deployment
```
🚀 Anyrand Quickstart with LottoPGF
=====================================

STEP 1: Deploy Anyrand
-------------------------------------
✅ Anyrand deployed at: 0x...
✅ Beacon deployed at: 0x...

STEP 2: Deploy LottoPGF
-------------------------------------
Deploying TicketSVGRenderer...
✅ TicketSVGRenderer deployed at: 0x...

Deploying Lootery Implementation...
✅ LooteryImpl deployed at: 0x...

Deploying LooteryFactory...
✅ LooteryFactory deployed at: 0x...

Deploying ETH Adapter...
✅ LooteryETHAdapter deployed at: 0x...

STEP 3: Configuration
-------------------------------------
✅ Factory configured with Anyrand: 0x...
✅ Fee recipient set: 0x...

STEP 4: Verification
-------------------------------------
✅ All contracts verified and functional

🎉 DEPLOYMENT COMPLETE!
=====================================
Anyrand: 0x...
LottoPGF Factory: 0x...
ETH Adapter: 0x...

Saved to .env file
Ready for lottery creation!
```

## Troubleshooting Guide

### Common Issues

1. **Import path errors**
   - Check relative paths in contracts
   - Verify typechain generation
   - Run `yarn compile` separately

2. **Gas estimation failures**
   - Increase gas limit in config
   - Check network congestion
   - Use manual gas price

3. **Address not found**
   - Verify .env file exists
   - Check environment variables
   - Run Anyrand deployment first

4. **Network connection**
   - Verify RPC URL
   - Check network status
   - Test with curl/ping

5. **Insufficient funds**
   - Check deployer balance
   - Verify gas price
   - Use faucet for testnet