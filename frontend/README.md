# Anyrand Frontend - Phase 1: Wallet Authentication

This is the frontend application for Anyrand, a verifiable randomness service. Phase 1 focuses on secure wallet authentication using Reown AppKit (formerly WalletConnect).

## Features Implemented

✅ **Wallet Connection**
- Connect securely using WalletConnect/Reown protocol
- Support for major wallets (MetaMask, Rainbow, Coinbase Wallet, etc.)
- QR code scanning for mobile wallets
- Deep links for wallet apps

✅ **Session Persistence**
- Sessions persist across browser refreshes
- Cookie-based storage for SSR compatibility
- Automatic reconnection on app load

✅ **Network Support**
- Base Mainnet and Base Sepolia testnet
- Automatic network validation
- Network switching prompts

✅ **User Experience**
- Dark/light theme support
- Responsive design (desktop and mobile)
- Loading states and error handling
- Clean, accessible UI with Radix components

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Web3 wallet (MetaMask, Rainbow, Coinbase Wallet, etc.)
- WalletConnect Project ID (get one from https://cloud.walletconnect.com)

### Installation

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Add your WalletConnect Project ID to `.env.local`:**
   ```
   NEXT_PUBLIC_WC_PROJECT_ID=your_actual_project_id_here
   ```

### Development

```bash
# Start development server
yarn dev

# Build for production
yarn build

# Run tests
yarn test

# Lint code
yarn lint
```

The application will be available at http://localhost:3000 (or the next available port).

## Testing the Application

### Basic Wallet Connection

1. **Open the application** in your browser
2. **Click "Connect Wallet"** - this opens the Reown AppKit modal
3. **Select your wallet** from the list
4. **For mobile wallets:** Scan the QR code with your wallet app
5. **For browser extensions:** Click the wallet and approve the connection
6. **Verify:** Your wallet address should appear in the interface

### Session Persistence

1. **Connect your wallet** (see above)
2. **Refresh the page** - you should remain connected
3. **Close and reopen the browser** - session should persist
4. **Click on your address** to open account management
5. **Click "Disconnect"** to end the session

### Network Switching

1. **Connect to Base Sepolia** (default testnet)
2. **Switch to Base Mainnet** in your wallet
3. **Verify:** The app should detect and display the network change
4. **Switch to an unsupported network** (e.g., Ethereum mainnet)
5. **Verify:** You should see a prompt to switch back

### Mobile Testing

1. **Open on mobile device** with a wallet app installed
2. **Tap "Connect Wallet"**
3. **Select your wallet** - should open the wallet app via deep link
4. **Approve connection** in the wallet app
5. **Return to browser** - should show connected state

## Troubleshooting

### "Project ID not set" Error
- Ensure `NEXT_PUBLIC_WC_PROJECT_ID` is set in `.env.local`
- Get a project ID from https://cloud.walletconnect.com
- Restart the development server after changing environment variables

### Wallet Connection Fails
- Try refreshing the page and connecting again
- Ensure your wallet app is updated to the latest version
- Check browser console for detailed error messages
- Try a different wallet or connection method

### Session Not Persisting
- Check that cookies are enabled in your browser
- Ensure you're not in incognito/private browsing mode
- Clear browser cache and try again

### Network Issues
- Ensure you're connected to the internet
- Try switching to a different network in your wallet
- Check that the wallet supports the Base network

## Technical Details

### Tech Stack
- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript 5.7 (strict mode)
- **Wallet Integration:** Reown AppKit 1.6.2 + Wagmi 2.14.6
- **UI Components:** Radix UI + Tailwind CSS
- **State Management:** TanStack Query 5.62.10
- **Testing:** Vitest + Playwright

### Architecture
- SSR-ready configuration with cookie storage
- Error boundaries for graceful error handling
- Theme synchronization between app and wallet modal
- Optimized bundle size with webpack externals

### Security
- No private keys stored or transmitted
- Secure wallet communication through encrypted channels
- Input validation and XSS protection
- HTTPS enforcement in production

## Next Steps (Future Phases)

Phase 1 establishes the foundation for wallet authentication. Future phases will add:

- **Phase 2:** Smart contract interactions for randomness requests
- **Phase 3:** Transaction history and status monitoring
- **Phase 4:** Request fulfillment and fee earning
- **Phase 5:** Advanced features and optimizations

## Contributing

This project follows the constitutional principles defined in `.specify/memory/constitution.md`:

- Test-first development (TDD)
- TypeScript strict mode
- Security-first architecture
- Performance optimization
- Consistent user experience

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the quickstart scenarios in `/specs/001-build-a-frontend/quickstart.md`
- Check the browser console for error messages
- Ensure all prerequisites are met