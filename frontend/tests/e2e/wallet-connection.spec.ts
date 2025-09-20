import { test, expect } from '@playwright/test'

test.describe('Wallet Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"]')
  })

  test('should display connect wallet button when disconnected', async ({ page }) => {
    // Should show connect wallet button
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible()

    // Should not show wallet info
    await expect(page.getByText(/0x[a-fA-F0-9]{40}/)).not.toBeVisible()
    await expect(page.getByText(/ETH/)).not.toBeVisible()
  })

  test('should connect wallet successfully', async ({ page }) => {
    // Click connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click()

    // Should show wallet selection modal
    await expect(page.getByText(/connect your wallet/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /metamask/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /walletconnect/i })).toBeVisible()

    // Select MetaMask
    await page.getByRole('button', { name: /metamask/i }).click()

    // Mock successful connection
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352, // Scroll
        balance: '2.5 ETH',
        ensName: 'test.eth'
      })
    })

    // Should show connected wallet info
    await expect(page.getByText(/test.eth/i)).toBeVisible()
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()
    await expect(page.getByText(/2.5 ETH/i)).toBeVisible()
    await expect(page.getByText(/scroll/i)).toBeVisible()

    // Connect button should change to account button
    await expect(page.getByRole('button', { name: /connect wallet/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /test.eth/i })).toBeVisible()
  })

  test('should handle wallet connection rejection', async ({ page }) => {
    // Click connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    // Mock user rejection
    await page.evaluate(() => {
      window.mockWalletConnectionError(new Error('User rejected the request'))
    })

    // Should show error message
    await expect(page.getByText(/connection failed/i)).toBeVisible()
    await expect(page.getByText(/user rejected the request/i)).toBeVisible()

    // Should still show connect button
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible()

    // Should show retry option
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  })

  test('should disconnect wallet', async ({ page }) => {
    // First connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '2.5 ETH'
      })
    })

    // Verify connected
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()

    // Click account button to open menu
    await page.getByRole('button', { name: /0x1234...7890/i }).click()

    // Click disconnect
    await page.getByRole('button', { name: /disconnect/i }).click()

    // Mock disconnection
    await page.evaluate(() => {
      window.mockWalletDisconnection()
    })

    // Should return to disconnected state
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible()
    await expect(page.getByText(/0x1234...7890/i)).not.toBeVisible()
  })

  test('should handle unsupported network', async ({ page }) => {
    // Connect on unsupported network
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1, // Ethereum mainnet (unsupported)
        balance: '2.5 ETH'
      })
    })

    // Should show unsupported network warning
    await expect(page.getByText(/unsupported network/i)).toBeVisible()
    await expect(page.getByText(/ethereum mainnet/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /switch to scroll/i })).toBeVisible()

    // App functionality should be disabled
    await expect(page.getByRole('button', { name: /request randomness/i })).toBeDisabled()
  })

  test('should switch networks successfully', async ({ page }) => {
    // Connect on wrong network
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1, // Ethereum mainnet
        balance: '2.5 ETH'
      })
    })

    // Click switch network
    await page.getByRole('button', { name: /switch to scroll/i }).click()

    // Should show network switching in progress
    await expect(page.getByText(/switching network/i)).toBeVisible()

    // Mock successful network switch
    await page.evaluate(() => {
      window.mockNetworkSwitch(534352) // Scroll
    })

    // Should show correct network
    await expect(page.getByText(/scroll/i)).toBeVisible()
    await expect(page.getByText(/unsupported network/i)).not.toBeVisible()

    // App functionality should be enabled
    await expect(page.getByRole('button', { name: /request randomness/i })).toBeEnabled()
  })

  test('should handle network switch rejection', async ({ page }) => {
    // Connect on wrong network
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        balance: '2.5 ETH'
      })
    })

    // Click switch network
    await page.getByRole('button', { name: /switch to scroll/i }).click()

    // Mock user rejection
    await page.evaluate(() => {
      window.mockNetworkSwitchError(new Error('User rejected the request'))
    })

    // Should show error
    await expect(page.getByText(/network switch failed/i)).toBeVisible()
    await expect(page.getByText(/user rejected the request/i)).toBeVisible()

    // Should still show wrong network warning
    await expect(page.getByText(/unsupported network/i)).toBeVisible()
  })

  test('should display balance and ENS name', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '15.789 ETH',
        ensName: 'alice.eth'
      })
    })

    // Should show ENS name instead of address
    await expect(page.getByText(/alice.eth/i)).toBeVisible()
    await expect(page.getByText(/0x1234...7890/i)).not.toBeVisible()

    // Should show balance
    await expect(page.getByText(/15.789 ETH/i)).toBeVisible()

    // Hover over ENS name should show full address
    await page.getByText(/alice.eth/i).hover()
    await expect(page.getByText(/0x1234567890123456789012345678901234567890/i)).toBeVisible()
  })

  test('should handle multiple wallet types', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click()

    // Should show multiple wallet options
    await expect(page.getByRole('button', { name: /metamask/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /walletconnect/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /coinbase wallet/i })).toBeVisible()

    // Test WalletConnect
    await page.getByRole('button', { name: /walletconnect/i }).click()

    // Should show QR code
    await expect(page.getByText(/scan qr code/i)).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible() // QR code canvas

    // Mock WalletConnect connection
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x9876543210987654321098765432109876543210',
        chainId: 534352,
        balance: '3.2 ETH',
        walletType: 'walletconnect'
      })
    })

    await expect(page.getByText(/0x9876...3210/i)).toBeVisible()
  })

  test('should persist wallet connection across page reloads', async ({ page }) => {
    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '2.5 ETH'
      })
    })

    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()

    // Reload page
    await page.reload()
    await page.waitForSelector('[data-testid="app-container"]')

    // Should automatically reconnect
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /connect wallet/i })).not.toBeVisible()
  })

  test('should handle account changes', async ({ page }) => {
    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '2.5 ETH'
      })
    })

    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()

    // Mock account change in wallet
    await page.evaluate(() => {
      window.mockAccountChange({
        address: '0x9876543210987654321098765432109876543210',
        balance: '1.8 ETH'
      })
    })

    // Should update to new account
    await expect(page.getByText(/0x9876...3210/i)).toBeVisible()
    await expect(page.getByText(/1.8 ETH/i)).toBeVisible()
    await expect(page.getByText(/0x1234...7890/i)).not.toBeVisible()
  })

  test('should show connecting state', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.getByRole('button', { name: /metamask/i }).click()

    // Mock connection in progress
    await page.evaluate(() => {
      window.mockWalletConnecting()
    })

    // Should show connecting state
    await expect(page.getByText(/connecting/i)).toBeVisible()
    await expect(page.getByRole('progressbar')).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    // Cancel connection
    await page.getByRole('button', { name: /cancel/i }).click()

    // Should return to disconnected state
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible()
    await expect(page.getByText(/connecting/i)).not.toBeVisible()
  })
})