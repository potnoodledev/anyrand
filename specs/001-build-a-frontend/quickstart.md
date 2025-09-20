# Quickstart Guide: Anyrand Frontend Application

**Date**: 2025-09-20
**Phase**: Phase 1 - Design & Contracts

This guide provides step-by-step instructions for testing the complete Anyrand frontend application user flows.

## Prerequisites

### Required Setup
- Node.js 18+ installed
- Modern web browser (Chrome, Firefox, Safari, Edge)
- MetaMask or compatible Web3 wallet extension
- Test ETH on supported networks (Scroll Sepolia for testing)

### Test Environment Configuration
```bash
# Environment variables for testing
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CHAIN_ID=534351
NEXT_PUBLIC_ANYRAND_CONTRACT=0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC
NEXT_PUBLIC_ENVIRONMENT=development
```

## Quick Start Steps

### 1. Application Setup (2 minutes)

```bash
# Clone and setup
cd frontend
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

**Expected Result**: Application loads with wallet connection prompt

### 2. Wallet Connection (1 minute)

**User Actions**:
1. Click "Connect Wallet" button
2. Select wallet provider (MetaMask recommended)
3. Approve connection in wallet popup
4. Confirm network switch to Scroll Sepolia if prompted

**Expected Results**:
- Wallet address displayed in header (0x1234...5678 format)
- Network indicator shows "Scroll Sepolia"
- Balance displayed in ETH
- Navigation tabs become accessible

**Validation Checklist**:
- [ ] Wallet connection status indicator shows "Connected"
- [ ] User address visible and correctly formatted
- [ ] Network matches configuration (Scroll Sepolia)
- [ ] ETH balance is accurate and properly formatted

### 3. Request Randomness Flow (3 minutes)

**Step 3.1: Configure Request**
1. Navigate to "Request Randomness" tab
2. Set deadline: Select "1 hour from now" option
3. Set callback gas limit: Enter "100000"
4. Review price estimate (should show ~0.001 ETH)

**Step 3.2: Submit Request**
1. Click "Calculate Price" to get latest estimate
2. Verify total cost is reasonable
3. Click "Request Randomness" button
4. Confirm transaction in wallet popup

**Step 3.3: Monitor Request**
1. Wait for transaction confirmation (30-60 seconds)
2. Navigate to "My Requests" tab
3. Verify new request appears with "Pending" status
4. Note request ID and estimated fulfillment time

**Expected Results**:
- Transaction submitted successfully
- Request appears in history with correct details
- Status shows "Pending"
- Countdown timer shows time until fulfillable

**Validation Checklist**:
- [ ] Price calculation works correctly
- [ ] Transaction submits without errors
- [ ] Request appears in history immediately
- [ ] All request details are accurate
- [ ] Estimated fulfillment time is reasonable (1 hour)

### 4. Monitor Request Status (5 minutes)

**User Actions**:
1. Keep "My Requests" tab open
2. Watch status updates in real-time
3. Use refresh button to manually update
4. Click request card to view detailed information

**Expected Behavior**:
- Real-time status updates (polling every 30 seconds)
- Countdown timer updates automatically
- Status transitions: Pending → Fulfillable → Fulfilled
- Transaction hash links to block explorer

**Validation Checklist**:
- [ ] Real-time updates work correctly
- [ ] Countdown timer decrements properly
- [ ] Status changes are reflected immediately
- [ ] Block explorer links function correctly

### 5. Fulfill Pending Requests (2 minutes)

**Step 5.1: Browse Available Requests**
1. Navigate to "Fulfill Requests" tab
2. Review available requests from other users
3. Check estimated earnings for each request
4. Sort by profitability or deadline

**Step 5.2: Fulfill a Request**
1. Select a fulfillable request (deadline passed)
2. Review gas costs and potential earnings
3. Click "Fulfill Request" button
4. Confirm transaction in wallet

**Expected Results**:
- List of fulfillable requests displayed
- Earnings calculations are accurate
- Fulfillment transaction succeeds
- Request status updates to "Fulfilled"

**Validation Checklist**:
- [ ] Available requests load correctly
- [ ] Earnings calculations are reasonable
- [ ] Fulfillment transaction processes successfully
- [ ] Request status updates across all views

### 6. View Transaction History (1 minute)

**User Actions**:
1. Navigate to "History" tab
2. Review all past transactions
3. Use filter options (status, date range, type)
4. Click on transactions for detailed view

**Expected Results**:
- Complete transaction history displayed
- Filtering works correctly
- Transaction details are comprehensive
- Links to block explorer function properly

**Validation Checklist**:
- [ ] All transactions appear in history
- [ ] Filtering reduces results appropriately
- [ ] Transaction details are complete and accurate
- [ ] Timestamps and amounts are correct

## User Journey Testing Scenarios

### Scenario A: New User First Request
**Duration**: 5 minutes
**Objective**: Complete first randomness request as new user

**Steps**:
1. Connect wallet (first time)
2. Understand interface and options
3. Submit first randomness request
4. Monitor request until fulfillment

**Success Criteria**:
- Wallet connects without issues
- Interface is intuitive for first-time users
- Request process is clear and successful
- User understands next steps

### Scenario B: Power User Workflow
**Duration**: 10 minutes
**Objective**: Demonstrate advanced features and bulk operations

**Steps**:
1. Submit multiple randomness requests
2. Fulfill requests from other users
3. Analyze transaction history and earnings
4. Optimize gas settings for efficiency

**Success Criteria**:
- Multiple operations work smoothly
- No performance degradation with multiple requests
- Advanced features function correctly
- Transaction batching works efficiently

### Scenario C: Error Recovery Testing
**Duration**: 5 minutes
**Objective**: Test error handling and recovery mechanisms

**Steps**:
1. Attempt transaction with insufficient funds
2. Cancel transaction during submission
3. Try to use unsupported network
4. Handle wallet disconnection during operation

**Success Criteria**:
- Error messages are clear and helpful
- Recovery actions work properly
- No application crashes or data loss
- User can resume normal operation

## Mobile Testing Checklist

### Responsive Design (2 minutes)
**Test on mobile device or browser dev tools**:
- [ ] Layout adapts to mobile screen sizes
- [ ] Touch interactions work properly
- [ ] Text remains readable at all sizes
- [ ] Navigation is thumb-friendly

### Mobile Wallet Integration (3 minutes)
**Test with mobile wallet apps**:
- [ ] WalletConnect QR code scanning works
- [ ] Mobile wallet app launches correctly
- [ ] Transaction approval flow is smooth
- [ ] Deep linking back to browser works

## Performance Testing

### Load Testing (3 minutes)
**Test with large datasets**:
- [ ] Display 100+ requests in history
- [ ] Handle multiple pending transactions
- [ ] Rapid navigation between tabs
- [ ] Real-time updates with many items

**Performance Benchmarks**:
- Initial page load: < 3 seconds
- Tab switching: < 200ms
- Real-time updates: < 500ms
- Large list rendering: < 1 second

### Memory Testing (ongoing)
**Monitor during extended use**:
- [ ] No memory leaks during long sessions
- [ ] Event listeners properly cleaned up
- [ ] Image and component optimization working

## Security Testing

### Input Validation (2 minutes)
**Test edge cases**:
- [ ] Invalid addresses rejected
- [ ] Negative amounts prevented
- [ ] XSS attempts blocked
- [ ] Network switching validation

### Wallet Security (1 minute)
**Verify security measures**:
- [ ] Private keys never exposed
- [ ] Secure communication with wallet
- [ ] Transaction data verification
- [ ] Network validation

## Integration Testing

### Smart Contract Integration (5 minutes)
**Verify contract interactions**:
- [ ] All contract methods work correctly
- [ ] Event listening functions properly
- [ ] Gas estimation is accurate
- [ ] Error handling for contract failures

### External Services (2 minutes)
**Test third-party integrations**:
- [ ] Block explorer links work
- [ ] ENS name resolution
- [ ] Price feed accuracy
- [ ] Network status updates

## Troubleshooting Guide

### Common Issues

**Wallet Connection Fails**:
- Check browser extension is installed and unlocked
- Verify network configuration
- Clear browser cache and retry

**Transaction Fails**:
- Ensure sufficient ETH balance
- Check gas price settings
- Verify network connectivity

**Real-time Updates Stop**:
- Check network connection
- Refresh page to restart polling
- Verify WebSocket connection (if used)

**Price Estimates Incorrect**:
- Refresh page to get latest gas prices
- Check network congestion
- Verify contract configuration

### Support Information
- **Documentation**: `/docs` directory
- **Issue Reporting**: GitHub Issues
- **Community**: Discord/Telegram channels
- **Developer Tools**: Browser console for debugging

## Success Metrics

### Completion Criteria
- [ ] All user flows complete successfully
- [ ] No critical errors or crashes
- [ ] Performance meets benchmarks
- [ ] Security validations pass
- [ ] Mobile experience is satisfactory

### Quality Indicators
- Transaction success rate: > 95%
- Page load time: < 3 seconds
- User error rate: < 5%
- Mobile usability score: > 80%

This quickstart guide ensures comprehensive testing of the Anyrand frontend application across all user scenarios, device types, and potential edge cases.