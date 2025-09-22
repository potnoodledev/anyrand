# Tasks: Anyrand Contract Interaction Components

**Input**: Design documents from `/Users/paulgadi/Desktop/_cosmic_apps/anyrand/specs/002-add-frontend-components/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Execution Flow
Based on the implementation plan, this feature extends the existing Next.js 15 + TypeScript + Wagmi framework in the `frontend/` directory to add contract interaction components for the Anyrand randomness service.

**Project Structure**: Web application - extending existing `frontend/` directory structure
**Tech Stack**: Next.js 15.1.2, TypeScript 5.7.2, Wagmi 2.14.6, Viem 2.21.57, Reown AppKit 1.6.2

## Phase 3.1: Setup
- [x] T001 Create directory structure in `frontend/src/components/anyrand/` and `frontend/src/hooks/anyrand/`
- [x] T002 Install additional dependencies for contract interactions (if needed beyond existing Wagmi stack)
- [x] T003 [P] Configure Vitest and React Testing Library for component testing in `frontend/vitest.config.ts`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T004 [P] Contract test for frontend-api.ts interfaces in `frontend/tests/contracts/test_frontend_api.test.ts`
- [x] T005 [P] Contract test for component-interfaces.ts props in `frontend/tests/contracts/test_component_interfaces.test.ts`
- [x] T006 [P] Integration test for request submission flow from quickstart scenario 1 in `frontend/tests/integration/test_request_submission.test.ts`
- [x] T007 [P] Integration test for fulfillment flow from quickstart scenario 3 in `frontend/tests/integration/test_fulfillment_flow.test.ts`
- [x] T008 [P] Integration test for historical data viewing from quickstart scenario 2 in `frontend/tests/integration/test_historical_data.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T009 [P] RandomnessRequest entity model in `frontend/src/types/anyrand/randomness-request.ts`
- [x] T010 [P] RandomnessFulfillment entity model in `frontend/src/types/anyrand/randomness-fulfillment.ts`
- [x] T011 [P] NetworkStatistics entity model in `frontend/src/types/anyrand/network-statistics.ts`
- [x] T012 [P] UserActivity entity model in `frontend/src/types/anyrand/user-activity.ts`
- [x] T013 [P] useSubmitRequest hook in `frontend/src/hooks/anyrand/use-submit-request.ts`
- [x] T014 [P] useFulfillRequest hook in `frontend/src/hooks/anyrand/use-fulfill-request.ts`
- [x] T015 [P] useRequestsQuery hook in `frontend/src/hooks/anyrand/use-requests-query.ts`
- [x] T016 [P] useNetworkStats hook in `frontend/src/hooks/anyrand/use-network-stats.ts`
- [x] T017 RequestSubmissionForm component in `frontend/src/components/anyrand/request-submission-form.tsx`
- [x] T018 FulfillmentForm component in `frontend/src/components/anyrand/fulfillment-form.tsx`
- [x] T019 RequestList component in `frontend/src/components/anyrand/request-list.tsx`
- [x] T020 NetworkStats component in `frontend/src/components/anyrand/network-stats.tsx`

## Phase 3.4: Integration
- [ ] T021 Create main dashboard page in `frontend/src/app/anyrand/page.tsx`
- [ ] T022 Create request submission page in `frontend/src/app/anyrand/request/page.tsx`
- [ ] T023 Create fulfillment page in `frontend/src/app/anyrand/fulfill/page.tsx`
- [ ] T024 Add navigation to anyrand sections in main layout
- [ ] T025 Connect form validation to contract constraints
- [ ] T026 Implement error handling and user feedback

## Phase 3.5: Polish
- [ ] T027 [P] Unit tests for hook validation in `frontend/tests/unit/test_hook_validation.test.ts`
- [ ] T028 [P] Unit tests for form utilities in `frontend/tests/unit/test_form_utilities.test.ts`
- [ ] T029 Performance tests (<2s transaction submission, <1s data refresh)
- [ ] T030 [P] Add responsive design and mobile optimization
- [ ] T031 Execute quickstart testing scenarios from `/Users/paulgadi/Desktop/_cosmic_apps/anyrand/specs/002-add-frontend-components/quickstart.md`
- [ ] T032 Remove development scaffolding and optimize for production

## Dependencies
- Setup (T001-T003) before tests (T004-T008)
- Tests (T004-T008) before implementation (T009-T020)
- Entity models (T009-T012) before hooks (T013-T016)
- Hooks (T013-T016) before components (T017-T020)
- Components (T017-T020) before pages (T021-T023)
- Implementation before polish (T027-T032)

**Blocking**: T017-T020 share hook dependencies, T021-T023 share component dependencies

## Parallel Execution Examples

### Phase 3.2 - Test Creation (After T003 complete)
```bash
# Launch T004-T008 together (different test files):
Task: "Contract test for frontend-api.ts interfaces in frontend/tests/contracts/test_frontend_api.test.ts"
Task: "Contract test for component-interfaces.ts props in frontend/tests/contracts/test_component_interfaces.test.ts"
Task: "Integration test for request submission flow from quickstart scenario 1"
Task: "Integration test for fulfillment flow from quickstart scenario 3"
Task: "Integration test for historical data viewing from quickstart scenario 2"
```

### Phase 3.3 - Entity Models (After tests failing)
```bash
# Launch T009-T012 together (different entity files):
Task: "RandomnessRequest entity model in frontend/src/types/anyrand/randomness-request.ts"
Task: "RandomnessFulfillment entity model in frontend/src/types/anyrand/randomness-fulfillment.ts"
Task: "NetworkStatistics entity model in frontend/src/types/anyrand/network-statistics.ts"
Task: "UserActivity entity model in frontend/src/types/anyrand/user-activity.ts"
```

### Phase 3.3 - Contract Hooks (After T012 complete)
```bash
# Launch T013-T016 together (different hook files):
Task: "useSubmitRequest hook in frontend/src/hooks/anyrand/use-submit-request.ts"
Task: "useFulfillRequest hook in frontend/src/hooks/anyrand/use-fulfill-request.ts"
Task: "useRequestsQuery hook in frontend/src/hooks/anyrand/use-requests-query.ts"
Task: "useNetworkStats hook in frontend/src/hooks/anyrand/use-network-stats.ts"
```

## Validation Checklist
*GATE: Must pass before considering tasks complete*

- [x] All contracts from `/contracts/` have corresponding tests (T004-T005)
- [x] All entities from data-model.md have implementation tasks (T009-T012)
- [x] All quickstart scenarios have integration tests (T006-T008)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Use existing Next.js 15 + Wagmi 2.14.6 + TypeScript 5.7.2 stack
- Follow TDD: tests → models → hooks → components → pages → polish
- Implement all constitutional requirements: security, performance, UX consistency