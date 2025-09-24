# Research: Deploy LottoPGF Contracts

## Overview
This document contains research findings for deploying LottoPGF contracts alongside Anyrand, resolving all NEEDS CLARIFICATION items from the specification.

## Key Findings

### 1. LottoPGF Contract Structure
**Decision**: Use existing LottoPGF contracts from `/contracts/lottopgf/` directory
**Rationale**: Contracts are already present and include necessary interfaces for Anyrand integration
**Alternatives considered**: Creating new contracts from scratch (rejected due to existing implementation)

### 2. Anyrand Integration Points
**Decision**: LottoPGF contracts depend on IAnyrand interface for randomness
**Rationale**: The contracts already have IAnyrand interface defined at `/contracts/lottopgf/interfaces/IAnyrand.sol`
**Key Integration Points**:
- `Lootery.sol` - Main lottery contract requiring randomness
- `LooteryFactory.sol` - Factory contract for deploying Lootery instances
- `LooteryETHAdapter.sol` - Adapter for ETH-based lottery operations

### 3. Deployment Dependencies
**Decision**: Use Hardhat Ignition modules for deployment
**Rationale**: Project already uses Ignition modules for Anyrand deployment
**Dependencies Identified**:
- Anyrand must be deployed first (provides randomness service)
- LottoPGF contracts reference Anyrand address during deployment
- WETH address needed for LooteryETHAdapter

### 4. Configuration Parameters
**Decision**: Use dynamic configuration based on network
**Rationale**: Following existing pattern in `/scripts/lottopgf/config.ts`
**Configuration Structure**:
```typescript
{
  anyrand: address      // Dynamically obtained from deployed Anyrand
  weth: address        // Network-specific WETH address
  owner?: address      // Optional owner address
  feeRecipient?: address // Optional fee recipient
}
```

### 5. Path Resolution Issues
**Decision**: Update import paths to use relative paths from project root
**Rationale**: Contracts copied from another project may have incorrect import paths
**Files Requiring Path Updates**:
- Deployment scripts in `/scripts/lottopgf/`
- Ignition modules referencing contracts
- TypeScript imports for typechain types

### 6. Deployment Script Architecture
**Decision**: Create modular deployment functions that can be called from quickstart scripts
**Rationale**: Maintains single responsibility and allows reusability
**Approach**:
- Extract LottoPGF deployment logic into reusable function
- Accept Anyrand address as parameter
- Return deployed contract addresses

### 7. Quickstart Script Integration
**Decision**: Extend existing quickstart scripts with LottoPGF deployment
**Rationale**: Preserves existing functionality while adding new features
**Implementation**:
- Deploy Anyrand first (existing logic)
- Deploy LottoPGF using Anyrand address
- Save all contract addresses to .env file

### 8. Network-Specific Configurations

#### Local Network (Hardhat)
**WETH Address**: Deploy mock WETH or use 0x0 for testing
**Owner/FeeRecipient**: Use deployer address
**Gas Settings**: Default Hardhat settings

#### Scroll Sepolia
**WETH Address**: `0x5300000000000000000000000000000000000004` (from config)
**Owner/FeeRecipient**: Configurable via environment variables
**Gas Settings**: Follow Scroll Sepolia recommendations

### 9. Error Handling Strategy
**Decision**: Implement comprehensive error handling with rollback capabilities
**Rationale**: Deployment failures should not leave system in inconsistent state
**Approach**:
- Check Anyrand deployment status before LottoPGF
- Validate contract addresses after deployment
- Provide clear error messages for troubleshooting

### 10. Testing Approach
**Decision**: Follow Test-First Development principle from constitution
**Rationale**: Constitutional requirement for all functionality
**Test Categories**:
- Unit tests for deployment functions
- Integration tests for Anyrand-LottoPGF interaction
- E2E tests via quickstart script execution

## Resolved Clarifications

### FR-010: LottoPGF Configuration Parameters
**Resolution**: Configuration will be environment-specific with defaults:
- **Lottery Duration**: 1 week for production, 1 hour for testing
- **Ticket Price**: 0.01 ETH default, configurable via environment
- **Beneficiary Settings**: Deployer address for testing, multisig for production

These parameters will be passed during Lootery instance creation, not during factory deployment.

## Technical Stack Confirmation
- **Language**: TypeScript/Solidity
- **Build Tool**: Hardhat with Ignition
- **Testing**: Hardhat test framework
- **Dependencies**: Already defined in package.json
- **No new frameworks needed**: All required tools present

## Next Steps
With all clarifications resolved, proceed to Phase 1 to define:
1. Data model for deployment tracking
2. TypeScript contracts for deployment functions
3. Test scenarios for quickstart validation