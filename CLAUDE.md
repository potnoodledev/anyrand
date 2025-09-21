# Claude Code Context - Anyrand Frontend

## Current Focus
Building Phase 1 of Anyrand frontend application focusing on wallet authentication using Reown AppKit (formerly WalletConnect).

## Tech Stack
- **Framework**: Next.js 15.1.2 with App Router
- **Language**: TypeScript 5.7.2
- **UI Library**: React 19.0.0
- **Wallet Integration**: @reown/appkit 1.6.2, Wagmi 2.14.6, Viem 2.21.57
- **State Management**: @tanstack/react-query 5.62.10
- **Styling**: Tailwind CSS 3.4.17, Radix UI components
- **Package Manager**: pnpm 9.15.1

## Project Structure
```
frontend/
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   │   ├── ui/         # Radix UI based components
│   │   └── wallet/     # Wallet connection components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Configuration and utilities
│   │   ├── wagmi/      # Wagmi configuration
│   │   └── utils/      # Helper functions
│   └── types/          # TypeScript definitions
├── tests/              # Test files
└── public/            # Static assets
```

## Phase 1 Implementation Focus
- Wallet connection using Reown AppKit
- Session persistence with cookies
- Network validation and switching
- Account management
- Error handling

## Key Patterns from Reference Project
1. **SSR-Ready Configuration**: Cookie-based storage for session persistence
2. **Provider Hierarchy**: ThemeProvider → WagmiProvider → QueryClientProvider
3. **Chain Validation**: Strict validation with user-friendly UI
4. **Environment Variables**: NEXT_PUBLIC_WC_PROJECT_ID required

## Testing Approach
- Unit tests with Vitest
- Integration tests with React Testing Library
- E2E tests with Playwright
- TDD methodology following constitution

## Current Implementation Status
- [x] Planning and research complete
- [x] Data model defined
- [x] TypeScript contracts created
- [x] Test scenarios documented
- [ ] Implementation tasks to be generated

## Important Files
- `/specs/001-build-a-frontend/plan.md` - Implementation plan
- `/specs/001-build-a-frontend/contracts/wallet.ts` - TypeScript interfaces
- `/specs/001-build-a-frontend/quickstart.md` - Test scenarios
- `/reference-projects/lottopgf-v1-frontend/` - Reference implementation

## Commands
```bash
# Development
pnpm dev

# Testing
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Building
pnpm build
```

## Next Steps
Run `/tasks` command to generate implementation tasks for Phase 1 wallet authentication.