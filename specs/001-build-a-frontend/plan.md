# Implementation Plan: Anyrand Frontend Application - Phase 1: Wallet Authentication

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
Build a comprehensive frontend application for Anyrand's verifiable randomness service. Phase 1 focuses on implementing wallet authentication using Reown AppKit (formerly WalletConnect) with the exact same tech stack as the reference project (lottopgf-v1-frontend). This establishes the foundation for future smart contract interactions using Next.js 15, React 19, TypeScript 5.7, and Wagmi v2.

## Technical Context
**Language/Version**: TypeScript 5.7.2, Node.js 18+, pnpm 9.15.1
**Primary Dependencies**: Next.js 15.1.2, React 19.0.0, Wagmi 2.14.6, Viem 2.21.57, @reown/appkit 1.6.2, @tanstack/react-query 5.62.10
**Storage**: React Query for caching, localStorage for user preferences
**Testing**: Vitest for unit testing, Playwright for E2E testing, React Testing Library for component testing
**Target Platform**: Web application (responsive design for desktop and mobile browsers)
**Project Type**: Web application (frontend only, connects to existing smart contracts)
**Performance Goals**: <3s initial load time, <200ms interaction response, optimized for mobile networks
**Constraints**: Must work with existing Anyrand smart contracts, responsive design required, secure wallet integration mandatory
**Scale/Scope**: Single-page application focusing on wallet authentication in Phase 1

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-First Development**: ✅ PASS - Will implement comprehensive testing with Vitest and Playwright following TDD principles
**Code Quality Standards**: ✅ PASS - Using TypeScript strict mode, ESLint, Prettier (matching reference project configuration)
**Security-First Architecture**: ✅ PASS - Secure wallet integration via Reown AppKit, input validation, no private key exposure
**Performance Optimization**: ✅ PASS - Next.js 15 with Turbopack, code splitting, React Query for efficient data management
**User Experience Consistency**: ✅ PASS - Using Radix UI components and Tailwind CSS for consistent design patterns

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
# Option 2: Web application (frontend detected) - matching reference project structure
frontend/
├── src/
│   ├── app/             # Next.js 15 App Router pages
│   ├── components/      # React components (UI + feature components)
│   │   ├── ui/         # Radix UI based components
│   │   └── wallet/     # Wallet connection components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and configuration
│   │   ├── wagmi/      # Wagmi configuration
│   │   └── utils/      # Helper functions
│   ├── types/          # TypeScript type definitions
│   └── styles/         # Global styles and Tailwind config
├── public/             # Static assets
├── tests/              # Test files (unit, integration, E2E)
└── package.json        # Dependencies matching reference project
```

**Structure Decision**: Option 2 - Web application structure with dedicated frontend/ directory matching reference project

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Reown AppKit integration patterns → Best practices for v1.6.2
   - Wagmi v2 configuration → Setup with Reown adapter
   - React Query v5 patterns → Integration with wallet state
   - Next.js 15 App Router → Structure and patterns from reference

2. **Generate and dispatch research agents**:
   ```
   For Reown AppKit setup:
     Task: "Research Reown AppKit v1.6.2 integration with Next.js 15 and document setup patterns"
   For Wagmi configuration:
     Task: "Analyze wagmi v2.14.6 setup with @reown/appkit-adapter-wagmi"
   For component patterns:
     Task: "Extract Radix UI component patterns from reference project"
   For state management:
     Task: "Document React Query v5 patterns for wallet state management"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technology decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - WalletSession: address, provider, connection status, session expiration
   - NetworkInfo: chain ID, network name, RPC endpoints
   - ConnectionState: pairing status, QR code data, deep links
   - UserAccount: address, balance (optional), ENS name
   - SessionStorage: persistent session data

2. **Generate API contracts** from functional requirements:
   - Wallet connection interfaces (connect, disconnect, switch)
   - Session management contracts (persist, restore, expire)
   - Network switching interfaces
   - Component prop interfaces for wallet UI
   - Hook return value contracts
   - Output TypeScript interfaces to `/contracts/`

3. **Generate contract tests** from contracts:
   - Wallet connection flow tests
   - Session persistence tests
   - Network switching tests
   - Account switching tests
   - Error handling tests
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - First-time wallet connection flow
   - Returning user with persisted session
   - Network and account switching
   - Disconnection and reconnection
   - Error recovery scenarios

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add Reown AppKit, Wagmi v2, React Query v5 context
   - Include Next.js 15 App Router patterns
   - Update with Radix UI component patterns

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each wallet interface → connection test task [P]
- Each UI component → component test task [P]
- Each hook → hook test task [P]
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Config → Hooks → Components → Pages
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 15-20 numbered, ordered tasks for Phase 1 wallet authentication

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations identified. All requirements align with established principles. Using proven patterns from reference project.

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