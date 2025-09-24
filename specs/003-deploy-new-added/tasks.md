# Implementation Tasks: Deploy LottoPGF Contracts

**Feature**: Deploy LottoPGF Contracts
**Branch**: `003-deploy-new-added`
**Priority**: Start with documentation, then path fixes, then implementation

## Task Execution Order

Tasks are numbered and ordered by dependencies. Tasks marked with [P] can be executed in parallel within their group.

## Phase 1: Documentation and Analysis

### T001: Document LottoPGF Contract Architecture [P]
**File**: `docs/lottopgf-architecture.md`
**Description**: Use solidity-docs-writer agent to analyze and document the LottoPGF smart contract system
**Command**:
```bash
# Use Task tool with solidity-docs-writer agent to analyze contracts
# Input: contracts/lottopgf/*.sol
# Output: Comprehensive documentation explaining:
#   - Contract purposes and relationships
#   - How LottoPGF uses Anyrand for randomness
#   - Key functions and state variables
#   - Event flows and interactions
```
**Dependencies**: None
**Acceptance**: Clear documentation exists explaining what LottoPGF does

### T002: Analyze Import Path Issues [P]
**File**: Report in `docs/lottopgf-path-analysis.md`
**Description**: Scan all LottoPGF files for incorrect import paths
**Command**:
```bash
grep -r "import.*from" contracts/lottopgf/ > path-issues.txt
grep -r "import.*from" scripts/lottopgf/ >> path-issues.txt
```
**Dependencies**: None
**Acceptance**: Complete list of files needing path updates

### T003: Analyze Contract Dependencies [P]
**File**: `docs/lottopgf-dependencies.md`
**Description**: Document which Anyrand interfaces LottoPGF depends on
**Command**:
```bash
# Analyze contracts/lottopgf/interfaces/IAnyrand.sol
# Compare with actual Anyrand contract interface
# Document any mismatches
```
**Dependencies**: T001
**Acceptance**: Clear mapping of LottoPGF → Anyrand dependencies

## Phase 2: Path Resolution and Configuration

### T004: Fix Solidity Import Paths
**File**: `contracts/lottopgf/**/*.sol`
**Description**: Update all import paths in LottoPGF Solidity contracts
**Changes**:
- Update relative imports to use correct paths
- Fix references to OpenZeppelin contracts
- Ensure all internal imports resolve correctly
**Dependencies**: T002
**Acceptance**: `yarn compile` succeeds without import errors

### T005: Fix TypeScript Import Paths
**File**: `scripts/lottopgf/*.ts`
**Description**: Update import paths in deployment scripts
**Changes**:
- Fix typechain imports (e.g., `../typechain-types` → `../../typechain-types`)
- Update ignition module imports
- Fix config file imports
**Dependencies**: T002
**Acceptance**: TypeScript compilation succeeds

### T006: Update LottoPGF Config for Dynamic Anyrand
**File**: `scripts/lottopgf/config.ts`
**Description**: Modify config to accept dynamic Anyrand addresses
**Changes**:
```typescript
// Add support for reading from environment
export const getDynamicConfig = (chainId: string, anyrandAddress?: string) => {
  const base = config[chainId];
  return {
    ...base,
    anyrand: anyrandAddress || base.anyrand
  };
}
```
**Dependencies**: T003
**Acceptance**: Config can use runtime Anyrand addresses

## Phase 3: Deployment Helpers

### T007: Create LottoPGF Deployment Function
**File**: `scripts/lottopgf/deployLottoPGF.ts`
**Description**: Create reusable deployment function
**Implementation**:
```typescript
export async function deployLottoPGF(
  anyrandAddress: string,
  network: 'localhost' | 'scrollSepolia'
): Promise<LottoPGFDeployment> {
  // 1. Get network config with dynamic Anyrand
  // 2. Deploy TicketSVGRenderer
  // 3. Deploy LooteryImpl
  // 4. Deploy LooteryFactory with initialization
  // 5. Deploy LooteryETHAdapter
  // 6. Return all addresses
}
```
**Dependencies**: T004, T005, T006
**Acceptance**: Function deploys all contracts and returns addresses

### T008: Create Environment Variable Handler
**File**: `scripts/utils/envHandler.ts`
**Description**: Utility to read/write deployment addresses to .env
**Implementation**:
```typescript
export function saveLottoPGFAddresses(
  deployment: LottoPGFDeployment,
  network: string
): void {
  // Append to .env file
  // Use consistent naming: LOTTOPGF_*_NETWORK_ADDRESS
}

export function readAnyrandAddress(network: string): string | null {
  // Read from process.env
  // Return ANYRAND_NETWORK_ADDRESS
}
```
**Dependencies**: None
**Acceptance**: Can read/write addresses from .env

### T009: Test Deployment Function Locally [P]
**File**: `test/deploy/lottopgf.test.ts`
**Description**: Unit test for deployment function
**Test Cases**:
- Deploys all contracts successfully
- Uses provided Anyrand address
- Returns valid addresses
- Handles deployment failures
**Dependencies**: T007
**Acceptance**: Tests pass with mock network

## Phase 4: Quickstart Integration

### T010: Integrate LottoPGF into quickstartLocal
**File**: `scripts/quickstartLocal.ts`
**Description**: Add LottoPGF deployment after Anyrand
**Changes**:
```typescript
// After Anyrand deployment section:
console.log('\nSTEP X: Deploy LottoPGF Contracts')
console.log('-------------------------------------\n')

const lottoPGF = await deployLottoPGF(ANYRAND_ADDRESS, 'localhost')
saveLottoPGFAddresses(lottoPGF, 'local')

console.log('✅ LottoPGF deployed:')
console.log('- Factory:', lottoPGF.looteryFactory)
console.log('- ETH Adapter:', lottoPGF.looteryETHAdapter)
```
**Dependencies**: T007, T008
**Acceptance**: quickstartLocal deploys both systems

### T011: Integrate LottoPGF into quickstartScrollSepolia
**File**: `scripts/quickstartScrollSepolia.ts`
**Description**: Add LottoPGF deployment for Scroll Sepolia
**Changes**: Similar to T010 but for Scroll Sepolia network
**Dependencies**: T007, T008
**Acceptance**: quickstartScrollSepolia deploys both systems

### T012: Add Deployment Verification
**File**: `scripts/utils/verification.ts`
**Description**: Verify deployed contracts are functional
**Implementation**:
```typescript
export async function verifyLottoPGFDeployment(
  deployment: LottoPGFDeployment,
  anyrandAddress: string
): Promise<boolean> {
  // 1. Check factory's anyrand address matches
  // 2. Verify renderer is set
  // 3. Test factory can create lottery
  // 4. Return true if all checks pass
}
```
**Dependencies**: T007
**Acceptance**: Can verify deployment integrity

## Phase 5: Integration Testing

### T013: Test Local Quickstart End-to-End
**File**: Manual test
**Description**: Full test of local deployment
**Steps**:
1. Start fresh Hardhat node
2. Run `yarn quickstart:local`
3. Verify both Anyrand and LottoPGF deploy
4. Check .env has all addresses
5. Verify contracts are callable
**Dependencies**: T010
**Acceptance**: Complete deployment works locally

### T014: Test Lottery Creation
**File**: `scripts/test/createLottery.ts`
**Description**: Test script to create a lottery instance
**Implementation**:
```typescript
// 1. Read factory address from .env
// 2. Create lottery with test parameters
// 3. Verify lottery uses correct Anyrand
// 4. Test randomness request
```
**Dependencies**: T013
**Acceptance**: Can create and use lottery

### T015: Test Scroll Sepolia Deployment
**File**: Manual test
**Description**: Test deployment on testnet
**Steps**:
1. Ensure testnet account funded
2. Run `yarn quickstart:scrollSepolia`
3. Verify on block explorer
4. Check gas usage reasonable
**Dependencies**: T011
**Acceptance**: Deploys to testnet successfully

## Phase 6: Documentation and Cleanup

### T016: Update Main README [P]
**File**: `README.md`
**Description**: Add LottoPGF deployment instructions
**Sections to add**:
- LottoPGF overview
- Deployment commands
- Contract addresses section
- Lottery creation example
**Dependencies**: T013, T015
**Acceptance**: Clear user documentation

### T017: Create LottoPGF Usage Guide [P]
**File**: `docs/lottopgf-usage.md`
**Description**: Guide for using deployed LottoPGF
**Content**:
- How to create lotteries
- How to buy tickets
- How randomness works
- ETH adapter usage
**Dependencies**: T001, T014
**Acceptance**: Complete usage documentation

### T018: Add Deployment Tests [P]
**File**: `test/integration/deployment.test.ts`
**Description**: Automated tests for deployment flow
**Test Cases**:
- Fresh deployment succeeds
- Incremental deployment works
- Failed Anyrand blocks LottoPGF
- Network mismatch detected
**Dependencies**: T013
**Acceptance**: Integration tests pass

### T019: Add Error Handling
**File**: Various deployment scripts
**Description**: Improve error messages and recovery
**Changes**:
- Clear error when Anyrand missing
- Rollback on partial failure
- Helpful troubleshooting messages
**Dependencies**: T010, T011
**Acceptance**: Graceful error handling

### T020: Final Verification
**File**: Manual verification
**Description**: Complete system check
**Checklist**:
- [ ] Local deployment works
- [ ] Testnet deployment works
- [ ] Documentation complete
- [ ] Tests passing
- [ ] Error handling robust
**Dependencies**: All previous tasks
**Acceptance**: Feature complete and tested

## Parallel Execution Examples

### Documentation Phase (T001-T003)
These can run simultaneously:
```bash
# Terminal 1
Task T001 - Document architecture

# Terminal 2
Task T002 - Analyze paths

# Terminal 3
Task T003 - Document dependencies
```

### Testing Phase (T016-T018)
After implementation complete:
```bash
# Can run in parallel
Task T016 - Update README
Task T017 - Create usage guide
Task T018 - Add deployment tests
```

## Success Criteria
- [x] LottoPGF contracts documented thoroughly
- [ ] All import paths corrected
- [ ] Deployment functions created
- [ ] Local quickstart includes LottoPGF
- [ ] Scroll Sepolia quickstart includes LottoPGF
- [ ] Lottery creation tested
- [ ] Documentation complete
- [ ] All tests passing

## Notes
- Priority on documentation first per user request
- No new frameworks - use existing Hardhat/Ignition
- Focus on localhost first, then Scroll Sepolia
- Path fixes critical before any compilation
- Keep deployment modular for reusability