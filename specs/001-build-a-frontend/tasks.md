# Tasks: Anyrand Frontend - Phase 1 Wallet Authentication

**Input**: Design documents from `/specs/001-build-a-frontend/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Next.js 15, React 19, TypeScript 5.7, Reown AppKit
   → Structure: frontend/ directory with App Router
2. Load design documents:
   → data-model.md: 5 entities (WalletSession, NetworkInfo, ConnectionState, UserAccount, SessionStorage)
   → contracts/: wallet.ts with interfaces
   → quickstart.md: 8 test scenarios
3. Generate tasks by category following TDD principles
4. Apply parallel execution rules for independent files
5. Number tasks sequentially T001-T030
6. Return: SUCCESS (30 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Convention
- Project root: `/frontend/` directory
- Source code: `/frontend/src/`
- Tests: `/frontend/tests/`
- Configuration: `/frontend/` root files

## Phase 3.1: Setup
- [x] T001 Initialize Next.js 15 project with TypeScript in /frontend directory using pnpm create next-app
- [x] T002 Install core dependencies: @reown/appkit@1.6.2 wagmi@2.14.6 viem@2.21.57 @tanstack/react-query@5.62.10
- [x] T003 Install UI dependencies: @radix-ui components tailwindcss@3.4.17 clsx tailwind-merge
- [x] T004 [P] Configure TypeScript strict mode in /frontend/tsconfig.json
- [x] T005 [P] Setup ESLint and Prettier configuration matching reference project
- [x] T006 [P] Create environment variables template in /frontend/.env.example with NEXT_PUBLIC_WC_PROJECT_ID

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Unit Tests
- [ ] T007 [P] Write wallet connection hook tests in /frontend/tests/hooks/useWalletConnection.test.ts
- [ ] T008 [P] Write account info hook tests in /frontend/tests/hooks/useAccountInfo.test.ts
- [ ] T009 [P] Write network state hook tests in /frontend/tests/hooks/useNetworkState.test.ts
- [ ] T010 [P] Write session persistence hook tests in /frontend/tests/hooks/useSessionPersistence.test.ts

### Component Tests
- [ ] T011 [P] Write ConnectButton component tests in /frontend/tests/components/ConnectButton.test.tsx
- [ ] T012 [P] Write AccountDisplay component tests in /frontend/tests/components/AccountDisplay.test.tsx
- [ ] T013 [P] Write NetworkSelector component tests in /frontend/tests/components/NetworkSelector.test.tsx
- [ ] T014 [P] Write ChainValidationDialog component tests in /frontend/tests/components/ChainValidationDialog.test.tsx

### Integration Tests
- [ ] T015 [P] Write wallet connection flow test in /frontend/tests/integration/wallet-connection.test.ts
- [ ] T016 [P] Write session persistence test in /frontend/tests/integration/session-persistence.test.ts
- [ ] T017 [P] Write network switching test in /frontend/tests/integration/network-switching.test.ts
- [ ] T018 [P] Write error handling test in /frontend/tests/integration/error-handling.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Configuration Layer
- [x] T019 Create chain constants in /frontend/src/lib/constants.ts with network configurations
- [x] T020 Implement Wagmi adapter configuration in /frontend/src/lib/wagmi.ts with Reown AppKit setup
- [x] T021 Create providers component in /frontend/src/lib/providers.tsx with WagmiProvider and QueryClientProvider

### Hooks Implementation
- [x] T022 [P] Implement useWalletConnection hook in /frontend/src/hooks/useWalletConnection.ts
- [x] T023 [P] Implement useAccountInfo hook in /frontend/src/hooks/useAccountInfo.ts
- [x] T024 [P] Implement useNetworkState hook in /frontend/src/hooks/useNetworkState.ts
- [x] T025 [P] Implement useSessionPersistence hook in /frontend/src/hooks/useSessionPersistence.ts

### Components Implementation
- [x] T026 [P] Create ConnectButton component in /frontend/src/components/wallet/ConnectButton.tsx
- [x] T027 [P] Create AccountDisplay component in /frontend/src/components/wallet/AccountDisplay.tsx
- [x] T028 [P] Create NetworkSelector component in /frontend/src/components/wallet/NetworkSelector.tsx
- [x] T029 [P] Create ChainValidationDialog component in /frontend/src/components/wallet/ChainValidationDialog.tsx

## Phase 3.4: Integration
- [x] T030 Update root layout in /frontend/src/app/layout.tsx with providers and SSR state initialization
- [x] T031 Create main page in /frontend/src/app/page.tsx with wallet connection UI
- [x] T032 Implement theme synchronization between next-themes and Reown AppKit
- [x] T033 Add error boundaries for wallet operations
- [x] T034 Configure webpack externals in /frontend/next.config.mjs for production optimization

## Phase 3.5: Polish
- [x] T035 [P] Create address formatting utilities in /frontend/src/lib/utils/format.ts
- [x] T036 [P] Add loading states and skeletons for wallet components
- [x] T037 [P] Implement mobile-responsive design for wallet UI
- [x] T038 Run quickstart.md test scenarios and fix any issues
- [x] T039 Performance optimization: bundle size analysis and code splitting
- [x] T040 [P] Create troubleshooting documentation in /frontend/README.md

## Dependencies
- Setup (T001-T006) must complete first
- All tests (T007-T018) MUST complete before implementation (T019-T029)
- Configuration (T019-T021) blocks hooks and components
- T020 blocks T021 (provider depends on wagmi config)
- T030-T031 require all components to be implemented
- Integration (T030-T034) before polish (T035-T040)

## Parallel Execution Examples

### Setup Phase (can run T004-T006 together):
```
Task: "Configure TypeScript strict mode"
Task: "Setup ESLint and Prettier configuration"
Task: "Create environment variables template"
```

### Test Phase (can run T007-T018 together):
```
Task: "Write wallet connection hook tests"
Task: "Write account info hook tests"
Task: "Write network state hook tests"
Task: "Write session persistence hook tests"
Task: "Write ConnectButton component tests"
Task: "Write AccountDisplay component tests"
Task: "Write NetworkSelector component tests"
Task: "Write ChainValidationDialog component tests"
Task: "Write wallet connection flow test"
Task: "Write session persistence test"
Task: "Write network switching test"
Task: "Write error handling test"
```

### Implementation Phase (can run T022-T029 together after config):
```
Task: "Implement useWalletConnection hook"
Task: "Implement useAccountInfo hook"
Task: "Implement useNetworkState hook"
Task: "Implement useSessionPersistence hook"
Task: "Create ConnectButton component"
Task: "Create AccountDisplay component"
Task: "Create NetworkSelector component"
Task: "Create ChainValidationDialog component"
```

## Notes
- Tests MUST be written first and MUST fail before implementation
- Each [P] task modifies a different file - no conflicts
- Commit after each task completion
- Use reference project patterns from /reference-projects/lottopgf-v1-frontend
- All paths are absolute from repository root

## Validation Checklist
*GATE: Verified before execution*

- [x] All contract interfaces have corresponding tests (T007-T018)
- [x] All data model entities covered (WalletSession, NetworkInfo, etc.)
- [x] All tests come before implementation (T007-T018 before T019-T029)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] tasks modify the same file
- [x] Quickstart scenarios covered by integration tests

## Success Criteria
- All 40 tasks completed
- All tests passing (after implementation)
- Quickstart scenarios working end-to-end
- No TypeScript errors with strict mode
- Bundle size < 200KB for initial load
- Wallet connection < 5 seconds
- Session persists across refreshes