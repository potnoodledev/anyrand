# Data Model: Anyrand Frontend - Phase 1 Wallet Authentication

**Date**: 2025-09-20
**Phase**: Phase 1 - Design & Contracts
**Focus**: Wallet connection and session management entities

## Core Entities

### WalletSession
Represents an authenticated wallet connection session.

**Fields**:
- `address: `0x${string}` | undefined` - Connected wallet address
- `connector: Connector | undefined` - Active wallet connector instance
- `chainId: number | undefined` - Current chain ID
- `isConnected: boolean` - Connection status
- `isConnecting: boolean` - Connection in progress
- `isReconnecting: boolean` - Reconnection in progress
- `status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting'` - Session status

**State Transitions**:
- `disconnected` → `connecting` (when user initiates connection)
- `connecting` → `connected` (when wallet approves)
- `connecting` → `disconnected` (when user rejects or times out)
- `connected` → `disconnected` (when user disconnects)
- `disconnected` → `reconnecting` (when auto-reconnecting)
- `reconnecting` → `connected` (when reconnection succeeds)
- `reconnecting` → `disconnected` (when reconnection fails)

**Validation Rules**:
- `address` must be a valid Ethereum address when connected
- `chainId` must match supported networks when connected
- `connector` must be non-null when connected

### NetworkInfo
Represents blockchain network configuration and state.

**Fields**:
- `chainId: number` - Network chain ID
- `name: string` - Human-readable network name
- `currency: { name: string; symbol: string; decimals: number }` - Native currency info
- `rpcUrls: { default: { http: string[]; webSocket?: string[] } }` - RPC endpoints
- `blockExplorers: { default: { name: string; url: string } }` - Block explorer links
- `contracts?: Record<string, { address: `0x${string}` }>` - Contract addresses
- `testnet: boolean` - Whether this is a test network

**Validation Rules**:
- `chainId` must be a positive integer
- `rpcUrls` must contain at least one valid HTTP endpoint
- `currency.decimals` typically 18 for EVM chains

### ConnectionState
Represents the current state of wallet connection UI and flow.

**Fields**:
- `isOpen: boolean` - Whether connection modal is open
- `view: 'Connect' | 'Account' | 'Networks' | 'WhatIsAWallet' | 'WhatIsANetwork'` - Current modal view
- `qrCodeUri: string | undefined` - WalletConnect QR code data
- `pairingUri: string | undefined` - Deep link URI for mobile wallets
- `selectedWallet: WalletInfo | undefined` - Currently selected wallet for connection
- `error: Error | undefined` - Current connection error if any

**State Management**:
- Modal state managed by Reown AppKit
- QR codes generated on connection initiation
- Error states cleared on new connection attempts

### UserAccount
Represents the connected user's account information.

**Fields**:
- `address: `0x${string}`` - Wallet address
- `ensName: string | null` - ENS name if available
- `ensAvatar: string | null` - ENS avatar URL if available
- `balance: { value: bigint; formatted: string; symbol: string }` - Native token balance
- `isContract: boolean` - Whether address is a smart contract
- `displayName: string` - Formatted display name (ENS or truncated address)

**Derived Fields**:
- `displayName`: Returns ENS name if available, otherwise truncated address
- `truncatedAddress`: Format as `0x1234...5678`

### SessionStorage
Represents persisted session data for maintaining authentication.

**Fields**:
- `connectorId: string | null` - ID of last used connector
- `chainId: number | null` - Last connected chain
- `address: `0x${string}` | null` - Last connected address
- `timestamp: number` - Last connection timestamp
- `expiresAt: number` - Session expiration timestamp

**Persistence Rules**:
- Stored in cookies for SSR compatibility
- 7-day default expiration
- Cleared on explicit disconnect
- Validated on restore

## Supporting Types

### WalletInfo
Information about available wallet providers.

**Fields**:
- `id: string` - Unique wallet identifier
- `name: string` - Wallet display name
- `icon: string` - Wallet icon URL
- `downloadUrl?: string` - Download link if not installed
- `installed: boolean` - Whether wallet is installed
- `recent: boolean` - Whether recently used

### ConnectionError
Standardized error types for wallet operations.

**Types**:
- `UserRejectedRequestError` - User rejected the connection
- `ChainMismatchError` - Connected to wrong network
- `ConnectorNotFoundError` - Wallet not installed
- `ResourceUnavailableError` - RPC endpoint unavailable
- `TimeoutError` - Connection timed out

**Fields**:
- `code: number` - Error code
- `message: string` - Human-readable message
- `details?: unknown` - Additional error context

## Data Flow Patterns

### Connection Flow
1. User clicks connect → `ConnectionState.isOpen = true`
2. User selects wallet → `ConnectionState.selectedWallet` set
3. QR code generated → `ConnectionState.qrCodeUri` populated
4. User approves in wallet → `WalletSession.status = 'connected'`
5. Session persisted → `SessionStorage` updated

### Reconnection Flow
1. App loads → Check `SessionStorage`
2. If valid session → `WalletSession.status = 'reconnecting'`
3. Attempt connection → Use stored `connectorId`
4. Success → `WalletSession.status = 'connected'`
5. Failure → Clear storage, `status = 'disconnected'`

### Network Switch Flow
1. User changes network in wallet
2. Event detected → `NetworkInfo.chainId` updated
3. If unsupported → Show network switch dialog
4. User switches back → Resume normal operation

## State Management Strategy

### React Query Keys
```typescript
// Wallet state queries
['wallet', 'session'] // Current session
['wallet', 'balance', address] // Balance for address
['wallet', 'ens', address] // ENS data for address

// Network state queries
['network', 'info', chainId] // Network information
['network', 'supported'] // List of supported networks
```

### Local State (React)
- Modal open/close state
- Form inputs (if any)
- UI-only states (hover, focus)

### Persistent State (Cookies)
- Session data for SSR
- User preferences
- Recently used wallets

## Security Considerations

### Data Validation
- All addresses validated as checksummed
- Chain IDs validated against whitelist
- RPC responses sanitized
- User inputs escaped

### Session Security
- No private keys ever stored
- Session tokens rotated periodically
- Cookies marked HttpOnly, Secure, SameSite
- Clear session on security events

## Phase 1 Scope Limitations

This data model covers only wallet authentication for Phase 1. Future phases will add:
- Randomness request entities
- Transaction tracking
- Smart contract interactions
- Historical data management

The current model provides a solid foundation for wallet connectivity that can be extended in subsequent phases.