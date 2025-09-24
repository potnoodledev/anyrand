# LottoPGF Path Analysis Report

## Overview
This document analyzes import path issues in LottoPGF contracts and scripts that need to be fixed for successful deployment.

## TypeScript Import Path Issues

### Scripts in `/scripts/lottopgf/`
All TypeScript files in the lottopgf scripts directory have incorrect relative paths that need to be updated:

#### Files Affected:
1. **deployAndUpgradeLootery.ts**
   - Line 2: `import { LooteryFactory__factory } from '../typechain-types'` → Should be `'../../typechain-types'`
   - Line 3: `import LooteryImplV1_8_0 from '../ignition/modules/LooteryImplV1_8_0'` → Should be `'../../ignition/modules/LooteryImplV1_8_0'`
   - Line 14: Path construction needs update for ignition deployments

2. **deploy.ts**
   - Line 2: `import { LooteryFactory__factory } from '../typechain-types'` → Should be `'../../typechain-types'`
   - Lines 4-7: All ignition module imports need `../../` prefix

3. **deployAndUpgradeLooteryFactory.ts**
   - Line 2: `import { LooteryFactory__factory } from '../typechain-types'` → Should be `'../../typechain-types'`
   - Line 3: Ignition module import needs update
   - Line 13: Path construction for deployed addresses

4. **deployLooteryETHAdapter.ts**
   - Line 3: Ignition module import needs update to `'../../ignition/modules/...'`

## Solidity Import Path Issues

### Contracts in `/contracts/lottopgf/`
The Solidity contracts appear to have correct relative imports for their location:

#### External Dependencies (Correct):
- OpenZeppelin imports use package names: `@openzeppelin/contracts/...`
- Solshuffle import: `solshuffle/contracts/FeistelShuffleOptimised.sol`

#### Internal References (Correct):
- Relative imports within lottopgf: `../interfaces/...`, `../lib/...`, `../periphery/...`
- These are correctly structured for the contract locations

## Ignition Module Verification

Need to verify that the following ignition modules exist:
- `/ignition/modules/LooteryImplV1_8_0.ts`
- `/ignition/modules/LooteryImplV1_9_0.ts`
- `/ignition/modules/LooteryFactory.ts`
- `/ignition/modules/LooteryETHAdapter.ts`
- `/ignition/modules/TicketSVGRenderer.ts`
- `/ignition/modules/LooteryFactoryImplV1_6_0.ts`
- `/ignition/modules/LooteryETHAdapterV1_5_0.ts`

## Summary of Required Fixes

### Priority 1: TypeScript Path Updates
All `.ts` files in `/scripts/lottopgf/` need their import paths updated by adding one more `../` level to reach the project root correctly.

### Priority 2: Verify Ignition Modules
Check if referenced ignition modules exist, and create them if missing.

### Priority 3: Compilation Test
After path fixes, run `yarn compile` to ensure all imports resolve correctly.

## Path Fix Pattern
```typescript
// Before (incorrect)
import { Something } from '../typechain-types'
import Module from '../ignition/modules/Module'

// After (correct)
import { Something } from '../../typechain-types'
import Module from '../../ignition/modules/Module'
```

This is because scripts are at depth `/scripts/lottopgf/` and need to go up two levels to reach project root where `/typechain-types/` and `/ignition/` directories are located.