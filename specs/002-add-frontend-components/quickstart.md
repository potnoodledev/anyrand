# Quickstart Testing: Anyrand Contract Interaction Components

**Date**: 2025-09-22
**Feature**: Contract interaction frontend components
**Prerequisites**: Wallet connected, contracts deployed on test network

## Test Environment Setup

### Required Configuration
1. **Wallet Setup**: MetaMask or compatible wallet with test ETH
2. **Network**: Scroll Sepolia (534351) with deployed contracts
3. **Contract Addresses**: Environment variables configured in `.env.local`
4. **Test Data**: At least 0.1 ETH for transaction fees

### Environment Variables
```bash
NEXT_PUBLIC_ANYRAND_SCROLL_SEPOLIA_ADDRESS=0x86d8C50E04DDd04cdaafaC9672cf1D00b6057AF5
NEXT_PUBLIC_BEACON_SCROLL_SEPOLIA_ADDRESS=0x3b41d0A5E90d46c26361885D4562D6aB71E67380
NEXT_PUBLIC_GAS_STATION_SCROLL_SEPOLIA_ADDRESS=0x83de6642650Cdf1BC350A5a636269B8e1CA0469F
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
```

## Scenario 1: Request Randomness Flow

### Prerequisites
- [ ] Wallet connected to Scroll Sepolia
- [ ] Balance > 0.01 ETH for fees
- [ ] Contracts deployed and accessible

### Test Steps
1. **Navigate to Request Form**
   - Visit application homepage
   - Click "Request Randomness" or navigate to request section
   - Verify form loads without errors

2. **Fill Request Parameters**
   - Set deadline: 2 hours from now (default)
   - Set callback gas limit: 200,000 (default)
   - Verify real-time fee estimation updates
   - Expected: Fee displays in ETH with USD equivalent

3. **Validate Form Inputs**
   - Try deadline in past → Should show error
   - Try gas limit < 100,000 → Should show error
   - Try gas limit > contract maximum → Should show error
   - Expected: Clear validation messages

4. **Submit Transaction**
   - Click "Submit Request" button
   - Verify transaction simulation runs
   - Confirm transaction in wallet
   - Expected: Transaction hash returned

5. **Track Request Status**
   - Verify request appears in "My Requests" section
   - Status should show "Pending"
   - Transaction link should open block explorer
   - Expected: Request ID and details displayed

### Success Criteria
- [ ] Form validation works correctly
- [ ] Fee estimation is accurate
- [ ] Transaction submits successfully
- [ ] Request appears in user's list
- [ ] Block explorer link works

### Expected Errors to Handle
- Insufficient balance: Clear error message
- Network congestion: Retry suggestion
- Contract not deployed: Network switch prompt

## Scenario 2: View Historical Requests

### Prerequisites
- [ ] At least one randomness request exists on network
- [ ] Application connected to correct network

### Test Steps
1. **Navigate to History Section**
   - Click "History" or "All Requests" navigation
   - Verify page loads with request list
   - Expected: Paginated list of requests

2. **Browse Request List**
   - Verify requests show: ID, requester, status, timestamp
   - Click on request → Should show detailed view
   - Expected: Detailed information modal/page

3. **Test Pagination**
   - If >10 requests, verify pagination controls
   - Navigate between pages
   - Expected: Smooth page transitions

4. **Apply Filters**
   - Filter by status: "Pending", "Fulfilled", "Failed"
   - Filter by time range: Last 24 hours, Last week
   - Filter by requester address
   - Expected: Results update based on filters

5. **View Request Details**
   - Click on any request
   - Verify all request data displays correctly
   - If fulfilled, check randomness value shows
   - Expected: Complete request information

### Success Criteria
- [ ] Historical data loads correctly
- [ ] Pagination works smoothly
- [ ] Filters apply correctly
- [ ] Request details are complete
- [ ] Performance acceptable (<2s load)

### Expected Data Validation
- All timestamps in local timezone
- Addresses properly formatted and checksummed
- Fee amounts in readable ETH format
- Status badges color-coded correctly

## Scenario 3: Fulfill Pending Requests (Operator Flow)

### Prerequisites
- [ ] Operator account with sufficient ETH
- [ ] At least one pending request exists
- [ ] Access to DRAND beacon data (mocked for testing)

### Test Steps
1. **Navigate to Fulfillment Section**
   - Click "Fulfill Requests" or operator dashboard
   - Verify pending requests list loads
   - Expected: List of fulfillable requests

2. **Select Request to Fulfill**
   - Choose request past deadline (if any)
   - Verify estimated reward calculation
   - Click "Fulfill Request" button
   - Expected: Fulfillment form opens

3. **Review Fulfillment Parameters**
   - Verify request details are correct
   - Check gas estimation for fulfillment
   - Review operator reward amount
   - Expected: Clear cost/benefit breakdown

4. **Submit Fulfillment Transaction**
   - Click "Confirm Fulfillment"
   - Sign transaction in wallet
   - Monitor transaction progress
   - Expected: Transaction confirmation

5. **Verify Fulfillment Success**
   - Request status updates to "Fulfilled"
   - Randomness value appears in request details
   - Operator reward reflected in balance
   - Expected: Complete fulfillment data

### Success Criteria
- [ ] Pending requests load correctly
- [ ] Reward calculation accurate
- [ ] Fulfillment transaction succeeds
- [ ] Status updates properly
- [ ] Randomness value generated

### Edge Cases to Test
- Request already fulfilled by another operator
- Insufficient gas for callback execution
- Invalid DRAND signature (should not occur in production)

## Scenario 4: Real-time Updates

### Prerequisites
- [ ] Application open in browser
- [ ] Active network connection
- [ ] Some pending requests exist

### Test Steps
1. **Monitor Live Updates**
   - Keep application open on requests page
   - Submit new request from another browser/wallet
   - Expected: New request appears without refresh

2. **Test Event Listening**
   - Submit fulfillment from external wallet
   - Monitor request status changes
   - Expected: Status updates in real-time

3. **Network Statistics Updates**
   - Monitor statistics dashboard
   - Perform transactions and verify counters update
   - Expected: Stats reflect new activity

4. **Connection Handling**
   - Disconnect network temporarily
   - Reconnect and verify data refreshes
   - Expected: Graceful reconnection

### Success Criteria
- [ ] Real-time updates work without refresh
- [ ] Event listeners capture all relevant events
- [ ] Statistics update correctly
- [ ] Network interruptions handled gracefully

## Scenario 5: Error Handling and Edge Cases

### Prerequisites
- [ ] Application running with connected wallet
- [ ] Ability to switch networks

### Test Steps
1. **Network Compatibility**
   - Switch to unsupported network
   - Expected: Clear message about unsupported network
   - Switch back to supported network
   - Expected: Application functions normally

2. **Contract Deployment Detection**
   - Switch to network without contracts
   - Expected: Message about missing contracts
   - Option to switch to supported network

3. **Transaction Failures**
   - Submit request with insufficient balance
   - Expected: Clear error message before submission
   - Submit with very low gas
   - Expected: Transaction simulation catches failure

4. **RPC Errors**
   - Simulate network congestion (if possible)
   - Expected: Retry mechanisms and user feedback
   - Fallback to alternative RPC if configured

5. **Wallet Disconnection**
   - Disconnect wallet mid-transaction
   - Expected: Clear error message and reconnection prompt
   - Reconnect and resume functionality

### Success Criteria
- [ ] All error states have clear messages
- [ ] Users can recover from error conditions
- [ ] No application crashes or broken states
- [ ] Helpful guidance for resolution

## Scenario 6: Performance and Responsiveness

### Prerequisites
- [ ] Application deployed and accessible
- [ ] Network with substantial transaction history

### Test Steps
1. **Page Load Performance**
   - Measure initial page load time
   - Expected: <3 seconds for initial load
   - Monitor bundle size and optimize if needed

2. **Data Loading Performance**
   - Load request history with 100+ items
   - Expected: <2 seconds for data display
   - Pagination should be responsive

3. **Transaction Response Time**
   - Submit randomness request
   - Measure time from click to wallet prompt
   - Expected: <1 second for transaction preparation

4. **Real-time Update Latency**
   - Measure time from blockchain event to UI update
   - Expected: <10 seconds for status changes
   - Consider block time and confirmation requirements

5. **Memory Usage**
   - Monitor browser memory with prolonged use
   - Expected: No significant memory leaks
   - Efficient cleanup of event listeners

### Success Criteria
- [ ] All interactions feel responsive
- [ ] No performance degradation over time
- [ ] Memory usage remains stable
- [ ] Network requests optimized

## Scenario 7: Mobile and Responsive Design

### Prerequisites
- [ ] Mobile device or browser developer tools
- [ ] Mobile wallet app (MetaMask mobile, etc.)

### Test Steps
1. **Mobile Layout**
   - Access application on mobile device
   - Expected: Responsive design adapts correctly
   - All functionality accessible on small screens

2. **Mobile Wallet Integration**
   - Connect wallet using mobile WalletConnect
   - Expected: Seamless connection process
   - Transaction signing works correctly

3. **Touch Interactions**
   - Test all buttons and form controls
   - Expected: Appropriate touch targets
   - No layout issues with virtual keyboard

4. **Performance on Mobile**
   - Monitor loading times on mobile network
   - Expected: Acceptable performance on 3G/4G
   - Efficient data usage

### Success Criteria
- [ ] Fully functional on mobile devices
- [ ] Responsive design works correctly
- [ ] Mobile wallet integration seamless
- [ ] Performance acceptable on mobile

## Test Data Validation

### Request Data Accuracy
- [ ] Request IDs are unique and sequential
- [ ] Timestamps are accurate and properly formatted
- [ ] Fee calculations match contract expectations
- [ ] Status transitions follow correct state machine

### Display Formatting
- [ ] Addresses are checksummed and truncated appropriately
- [ ] Large numbers (wei values) formatted as ETH with proper decimals
- [ ] Timestamps show in user's local timezone
- [ ] Gas values formatted with appropriate units

### Transaction Linking
- [ ] All transaction hashes link to correct block explorer
- [ ] Block explorer URLs use correct network
- [ ] Links open in new tab/window as expected

## Security Verification

### Input Validation
- [ ] All user inputs properly validated before blockchain calls
- [ ] No injection vulnerabilities in address/hex inputs
- [ ] Form data sanitized before display

### Wallet Security
- [ ] No private keys or sensitive data in localStorage
- [ ] Wallet connections use secure protocols
- [ ] Transaction data matches user inputs exactly

### Network Security
- [ ] HTTPS enforced for all external requests
- [ ] No sensitive data in URL parameters
- [ ] Proper CORS configuration

## Troubleshooting Guide

### Common Issues
1. **"Contract not deployed" error**
   - Verify network configuration
   - Check environment variables
   - Confirm contract addresses are correct

2. **Transaction fails with "insufficient funds"**
   - Check ETH balance covers gas + fees
   - Consider current network congestion
   - Verify gas estimation is accurate

3. **Real-time updates not working**
   - Check WebSocket connection
   - Verify event listener subscriptions
   - Consider RPC provider limitations

4. **Slow performance**
   - Check network connection
   - Monitor browser developer tools
   - Consider RPC provider response times

### Debug Information
When reporting issues, include:
- Network and contract addresses
- Transaction hashes (if applicable)
- Browser console errors
- Wallet type and version
- Network connection type

## Acceptance Criteria Summary

### Functional Requirements Met
- [ ] Users can submit randomness requests ✓
- [ ] Operators can fulfill pending requests ✓
- [ ] Historical data browsing works ✓
- [ ] Real-time updates function ✓
- [ ] Error handling is comprehensive ✓

### Performance Requirements Met
- [ ] Page loads < 3 seconds ✓
- [ ] Transaction prep < 1 second ✓
- [ ] Data queries < 2 seconds ✓
- [ ] Real-time updates < 10 seconds ✓

### User Experience Requirements Met
- [ ] Intuitive navigation ✓
- [ ] Clear error messages ✓
- [ ] Responsive design ✓
- [ ] Accessible interfaces ✓
- [ ] Consistent visual design ✓

### Security Requirements Met
- [ ] Input validation ✓
- [ ] Secure wallet integration ✓
- [ ] No sensitive data exposure ✓
- [ ] HTTPS enforcement ✓