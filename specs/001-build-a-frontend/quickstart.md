# Quickstart: Anyrand Frontend - Phase 1 Wallet Authentication

**Date**: 2025-09-20
**Phase**: Phase 1 Testing
**Focus**: Wallet connection and session management testing

## Prerequisites

### Environment Setup
```bash
# Clone repository and checkout branch
git checkout 001-build-a-frontend

# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Add WalletConnect Project ID
echo "NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here" >> .env.local
```

### Required Tools
- Node.js 18+ installed
- pnpm 9.15.1 installed
- A Web3 wallet (MetaMask, Rainbow, Coinbase Wallet, etc.)
- WalletConnect Project ID from https://cloud.walletconnect.com

## Quick Test Scenarios

### Scenario 1: First-Time Connection
```bash
# Start development server
pnpm dev

# Open browser to http://localhost:3000
```

**Test Steps**:
1. Click "Connect Wallet" button
2. Select your wallet from the modal
3. Scan QR code (mobile) or click connect (browser extension)
4. Approve connection in wallet
5. ✅ Verify: Wallet address displayed in header
6. ✅ Verify: Network name shown correctly
7. ✅ Verify: Session persists on page refresh

### Scenario 2: Session Persistence
```bash
# With wallet connected from Scenario 1
```

**Test Steps**:
1. Refresh the page (F5)
2. ✅ Verify: Still connected without re-authentication
3. Close browser completely
4. Reopen browser and navigate to app
5. ✅ Verify: Wallet remains connected
6. Check developer tools > Application > Cookies
7. ✅ Verify: Session cookie exists with correct domain

### Scenario 3: Wallet Disconnection
```bash
# With wallet connected
```

**Test Steps**:
1. Click on wallet address button
2. Select "Disconnect" from dropdown
3. ✅ Verify: Returns to "Connect Wallet" state
4. ✅ Verify: Session cookie cleared
5. Refresh page
6. ✅ Verify: Still disconnected (no auto-reconnect)

### Scenario 4: Network Switching
```bash
# Connect wallet on supported network
```

**Test Steps**:
1. Connect wallet to supported network
2. In wallet, switch to unsupported network
3. ✅ Verify: Alert dialog appears
4. ✅ Verify: Shows current and required network
5. Click "Switch Network" in dialog
6. Approve network switch in wallet
7. ✅ Verify: App updates to show new network
8. ✅ Verify: No errors or disconnection

### Scenario 5: Account Switching
```bash
# With wallet connected
```

**Test Steps**:
1. Note current wallet address
2. In wallet, switch to different account
3. ✅ Verify: App detects account change
4. ✅ Verify: New address displayed
5. ✅ Verify: No modal or re-authentication needed
6. ✅ Verify: Previous session cleared

### Scenario 6: Mobile Wallet Connection
```bash
# On mobile device with wallet app installed
```

**Test Steps**:
1. Open app in mobile browser
2. Tap "Connect Wallet"
3. Select wallet app from list
4. ✅ Verify: Deep link opens wallet app
5. Approve connection in wallet
6. ✅ Verify: Returns to browser, shows connected
7. ✅ Verify: Address displayed correctly

### Scenario 7: QR Code Connection
```bash
# Desktop browser + mobile wallet
```

**Test Steps**:
1. Click "Connect Wallet" on desktop
2. Select "WalletConnect" option
3. ✅ Verify: QR code displayed
4. Open wallet app on mobile
5. Scan QR code with wallet
6. Approve connection on mobile
7. ✅ Verify: Desktop shows connected state
8. ✅ Verify: Can interact from desktop

### Scenario 8: Error Handling
```bash
# Various error conditions
```

**Test Connection Rejection**:
1. Click "Connect Wallet"
2. Reject connection in wallet
3. ✅ Verify: Error message displayed
4. ✅ Verify: Can retry connection

**Test Timeout**:
1. Click "Connect Wallet"
2. Wait without approving (2+ minutes)
3. ✅ Verify: Timeout message appears
4. ✅ Verify: Modal can be closed and reopened

**Test Network Unavailable**:
1. Disconnect internet
2. Try to connect wallet
3. ✅ Verify: Network error message
4. ✅ Verify: Graceful error handling

## Automated Test Commands

### Unit Tests
```bash
# Run component tests
pnpm test:unit

# Run with coverage
pnpm test:unit --coverage

# Watch mode for development
pnpm test:unit --watch
```

### Integration Tests
```bash
# Run integration tests
pnpm test:integration

# Test specific flow
pnpm test:integration --grep "wallet connection"
```

### E2E Tests
```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run all E2E tests
pnpm test:e2e

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test file
pnpm test:e2e tests/wallet-connection.spec.ts
```

## Performance Benchmarks

### Expected Metrics
- **Initial Load**: < 3 seconds
- **Connect Modal Open**: < 200ms
- **Wallet Connection**: < 5 seconds (depends on wallet)
- **Session Restore**: < 500ms
- **Network Switch**: < 2 seconds

### Testing Performance
```bash
# Run performance tests
pnpm test:performance

# Generate lighthouse report
pnpm lighthouse
```

## Debugging Common Issues

### Issue: "Project ID not set"
```bash
# Check environment variable
echo $NEXT_PUBLIC_WC_PROJECT_ID

# Ensure .env.local exists and is loaded
cat .env.local
```

### Issue: "Cannot connect wallet"
```bash
# Check browser console for errors
# Enable debug mode
localStorage.setItem('DEBUG', 'wagmi:*,appkit:*')

# Restart dev server
pnpm dev
```

### Issue: "Session not persisting"
```bash
# Check cookie settings
# In browser DevTools > Application > Cookies
# Verify cookie name: "wagmi.store"
# Check SameSite and Secure flags
```

### Issue: "Wrong network"
```bash
# Check supported chains in config
cat src/lib/constants.ts

# Verify RPC endpoints
cat .env.local | grep RPC
```

## Success Criteria

### Phase 1 Completion Checklist
- [ ] Wallet connection works with 3+ wallet types
- [ ] Session persists across refreshes
- [ ] Network switching handled gracefully
- [ ] Account switching detected properly
- [ ] Mobile wallet connection functional
- [ ] QR code scanning operational
- [ ] Error states handled appropriately
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] No console errors in production build

### Test Coverage Requirements
- Unit tests: > 80% coverage
- Integration tests: All critical paths
- E2E tests: All user scenarios
- Performance: All metrics within targets

## Next Steps

After Phase 1 validation:
1. Deploy to staging environment
2. Conduct user acceptance testing
3. Fix any identified issues
4. Document any new patterns discovered
5. Proceed to Phase 2 (smart contract integration)

## Support

### Troubleshooting Resources
- Check `docs/TROUBLESHOOTING.md` for common issues
- Review test outputs in `test-results/` directory
- Enable debug logging with `DEBUG=*` environment variable
- Check browser console for detailed error messages

### Getting Help
- Review existing tests in `tests/` directory
- Check reference implementation in `reference-projects/`
- Consult team documentation in `docs/`
- Review constitution principles in `.specify/memory/constitution.md`