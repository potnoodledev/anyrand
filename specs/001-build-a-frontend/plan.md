# Implementation Plan: Anyrand Frontend Application

**Branch**: `001-build-a-frontend` | **Date**: 2025-09-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-build-a-frontend/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Build a comprehensive frontend application for Anyrand's verifiable randomness service, enabling users to connect wallets, request randomness, fulfill pending requests, and view transaction history with real-time status updates. The application will provide a complete Web3 interface for interacting with Anyrand smart contracts across multiple networks.

## Technical Context
**Language/Version**: TypeScript 5.7, React 19, Node.js 18+
**Primary Dependencies**: Next.js 15, Wagmi 2.14, Viem 2.21, Reown AppKit 1.6, TanStack Query 5.62, Radix UI, Tailwind CSS
**Storage**: React Query cache, localStorage for preferences, no persistent backend
**Testing**: Vitest, React Testing Library, Playwright for E2E, blockchain-specific mocking
**Target Platform**: Web application with responsive design for desktop and mobile browsers
**Project Type**: web - frontend application connecting to existing smart contracts
**Performance Goals**: <3s initial load, <200ms interactions, optimized for mobile networks
**Constraints**: Must work with existing Anyrand contracts, secure wallet integration, responsive design mandatory
**Scale/Scope**: Single-page application, 5-8 main views, crypto users and developers target audience

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-First Development**: ✅ PASS - Comprehensive testing strategy with unit, integration, and E2E tests
**Code Quality Standards**: ✅ PASS - TypeScript strict mode, ESLint, Prettier, established React patterns
**Security-First Architecture**: ✅ PASS - Secure wallet integration, input validation, no private key exposure
**Performance Optimization**: ✅ PASS - Next.js optimizations, React patterns, blockchain-specific caching
**User Experience Consistency**: ✅ PASS - Responsive design, consistent error handling, clear workflows

## Project Structure

### Documentation (this feature)
```
specs/001-build-a-frontend/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (when "frontend" + "backend" detected)
frontend/
├── src/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and config
│   ├── abi/            # Smart contract ABIs
│   └── types/          # TypeScript definitions
├── public/             # Static assets
├── tests/              # Test files
└── package.json        # Dependencies
```

**Structure Decision**: Option 2 - Web application with dedicated frontend/ directory

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Reference project analysis → best practices extraction from lottopgf-v1-frontend
   - Anyrand contract integration → ABI patterns and interaction methods
   - Wallet connection patterns → Reown AppKit integration best practices
   - Testing strategy → blockchain-specific testing approaches

2. **Generate and dispatch research agents**:
   ```
   For reference project analysis:
     Task: "Analyze lottopgf-v1-frontend architecture and extract reusable patterns"
   For contract integration:
     Task: "Document Anyrand smart contract integration patterns and interfaces"
   For wallet integration:
     Task: "Research Reown AppKit and Wagmi best practices for Web3 applications"
   For testing strategy:
     Task: "Define comprehensive testing approach for React blockchain applications"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technology decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - RandomnessRequest: request ID, requester, deadline, gas limit, status, random value
   - Transaction: hash, block number, gas used, confirmation status
   - UserSession: wallet address, network, connection status
   - PendingRequest: request details + fulfillment earnings
   - DrandRound: round number, timestamp, availability

2. **Generate API contracts** from functional requirements:
   - Frontend-to-Contract interfaces (smart contract calls)
   - Component prop interfaces and state management contracts
   - Hook return value contracts for consistent data flow
   - Output TypeScript interfaces to `/contracts/`

3. **Generate contract tests** from contracts:
   - Component unit tests for UI interactions
   - Hook tests for blockchain state management
   - Integration tests for wallet connection flows
   - E2E tests for complete user journeys
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Wallet connection and disconnection flows
   - Randomness request submission and monitoring
   - Request fulfillment and fee earning scenarios
   - Transaction history viewing and filtering
   - Error handling and edge case coverage

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add Next.js 15, React 19, Wagmi v2 stack information
   - Include Anyrand smart contract integration context
   - Update with frontend-specific patterns and conventions

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each component interface → component test task [P]
- Each hook interface → hook test task [P]
- Each user story → E2E test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Core utilities → Hooks → Components → Pages
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations identified. All requirements align with established principles.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none identified)

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*