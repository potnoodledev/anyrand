
# Implementation Plan: Deploy LottoPGF Contracts

**Branch**: `003-deploy-new-added` | **Date**: 2025-01-23 | **Spec**: `/specs/003-deploy-new-added/spec.md`
**Input**: Feature specification from `/specs/003-deploy-new-added/spec.md`

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
Deploy LottoPGF lottery contracts that depend on Anyrand for verifiable randomness. The deployment will be integrated into existing quickstart scripts for both local and Scroll Sepolia networks, ensuring proper contract address resolution and dependency ordering.

## Technical Context
**Language/Version**: TypeScript (Node.js 18+), Solidity 0.8.x
**Primary Dependencies**: Hardhat, Hardhat Ignition, ethers.js v6
**Storage**: Contract addresses in .env file
**Testing**: Hardhat test framework, Vitest for TypeScript
**Target Platform**: EVM-compatible blockchains (local, Scroll Sepolia)
**Project Type**: single - Smart contract deployment scripts
**Performance Goals**: Successful deployment within network gas limits
**Constraints**: Must deploy after Anyrand, maintain backwards compatibility
**Scale/Scope**: 5 main contracts (Lootery, LooteryFactory, ETHAdapter, SVGRenderer, Implementation)
**User Context**: start with deploying the contracts on localhost and then on sepolia, afterwards integrate with the quickstart scripts. initial tasks will most probably be dealing with path issues and using correct contract addresses. don't introduce new frameworks or libraries and use the ones that are already in the project, unless absolutely necessary

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Test-First Development: Will create deployment tests before implementation
- [x] Code Quality: Following existing Hardhat/TypeScript patterns
- [x] Security-First: Validating contract deployments and addresses
- [x] Performance: Optimizing gas usage for deployments
- [x] User Experience: Clear deployment logs and error messages

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project) - Deployment scripts in existing structure

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved ✅ COMPLETE

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md ✅, /contracts/* ✅, quickstart.md ✅, CLAUDE.md ✅ COMPLETE

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Priority on localhost deployment first, then Scroll Sepolia
- Focus on path resolution and contract address updates
- Each deployment step → implementation task
- Each integration point → test task

**Task Categories**:
1. **Path Resolution** (Priority 1)
   - Fix import paths in LottoPGF contracts
   - Update references to typechain types
   - Resolve Ignition module paths

2. **Configuration Updates** (Priority 2)
   - Update LottoPGF config for dynamic Anyrand address
   - Create deployment helper functions
   - Setup environment variable handling

3. **Deployment Implementation** (Priority 3)
   - Create LottoPGF deployment function
   - Integrate with quickstartLocal.ts
   - Integrate with quickstartScrollSepolia.ts

4. **Testing & Verification** (Priority 4)
   - Test complete deployment flow
   - Verify contract interactions
   - Validate address persistence

**Ordering Strategy**:
- Fix paths first (blocks compilation)
- Then configuration (needed for deployment)
- Then implementation (core functionality)
- Finally testing (validation)
- Mark [P] for parallel tasks within same priority

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


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
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
