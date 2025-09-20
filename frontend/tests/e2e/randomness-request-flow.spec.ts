import { test, expect } from '@playwright/test'

test.describe('Randomness Request Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"]')
  })

  test('should complete full randomness request flow', async ({ page }) => {
    // Step 1: Connect wallet (mock wallet connection)
    await page.getByRole('button', { name: /connect wallet/i }).click()

    // Mock wallet connection success
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352, // Scroll
        balance: '1.5 ETH'
      })
    })

    // Verify wallet connected
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()
    await expect(page.getByText(/1.5 ETH/i)).toBeVisible()

    // Step 2: Navigate to request randomness
    await page.getByRole('button', { name: /request randomness/i }).click()

    // Step 3: Fill out randomness request form
    await page.getByLabel(/deadline/i).fill('60') // 60 minutes
    await page.getByLabel(/gas limit/i).fill('100000')

    // Wait for price estimation
    await expect(page.getByText(/estimated cost/i)).toBeVisible()
    await expect(page.getByText(/0\.001 ETH/i)).toBeVisible()

    // Step 4: Submit randomness request
    await page.getByRole('button', { name: /submit request/i }).click()

    // Confirm transaction in mock wallet
    await page.getByRole('button', { name: /confirm/i }).click()

    // Step 5: Verify transaction submitted
    await expect(page.getByText(/transaction submitted/i)).toBeVisible()
    await expect(page.getByText(/0x[a-fA-F0-9]{64}/)).toBeVisible()

    // Step 6: Wait for transaction confirmation
    await page.waitForSelector('[data-testid="transaction-confirmed"]', { timeout: 30000 })

    // Step 7: Verify request appears in history
    await page.getByRole('tab', { name: /request history/i }).click()
    await expect(page.getByText(/request #1/i)).toBeVisible()
    await expect(page.getByText(/pending/i)).toBeVisible()

    // Step 8: Check request details
    await page.getByText(/request #1/i).click()
    await expect(page.getByText(/gas limit: 100,000/i)).toBeVisible()
    await expect(page.getByText(/fee paid: 0\.001 ETH/i)).toBeVisible()
  })

  test('should handle insufficient balance error', async ({ page }) => {
    // Connect wallet with low balance
    await page.getByRole('button', { name: /connect wallet/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '0.0001 ETH' // Insufficient balance
      })
    })

    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()

    // Try to submit request
    await page.getByRole('button', { name: /request randomness/i }).click()
    await page.getByLabel(/deadline/i).fill('60')
    await page.getByLabel(/gas limit/i).fill('100000')

    await page.getByRole('button', { name: /submit request/i }).click()

    // Should show insufficient balance error
    await expect(page.getByText(/insufficient funds/i)).toBeVisible()
    await expect(page.getByText(/add funds to your wallet/i)).toBeVisible()
  })

  test('should handle wrong network error', async ({ page }) => {
    // Connect wallet on wrong network
    await page.getByRole('button', { name: /connect wallet/i }).click()

    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1, // Ethereum mainnet (unsupported)
        balance: '1.5 ETH'
      })
    })

    await expect(page.getByText(/0x1234...7890/i)).toBeVisible()

    // Should show wrong network warning
    await expect(page.getByText(/unsupported network/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /switch to scroll/i })).toBeVisible()

    // Switch network
    await page.getByRole('button', { name: /switch to scroll/i }).click()

    // Mock network switch
    await page.evaluate(() => {
      window.mockNetworkSwitch(534352) // Scroll
    })

    // Should now show correct network
    await expect(page.getByText(/scroll/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /request randomness/i })).toBeEnabled()
  })

  test('should validate form inputs', async ({ page }) => {
    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '1.5 ETH'
      })
    })

    await page.getByRole('button', { name: /request randomness/i }).click()

    // Test invalid deadline (too short)
    await page.getByLabel(/deadline/i).fill('0')
    await expect(page.getByText(/deadline must be at least 1 minute/i)).toBeVisible()

    // Test invalid gas limit (too low)
    await page.getByLabel(/gas limit/i).fill('1000')
    await expect(page.getByText(/gas limit must be at least 21,000/i)).toBeVisible()

    // Test invalid gas limit (too high)
    await page.getByLabel(/gas limit/i).fill('10000000')
    await expect(page.getByText(/gas limit too high/i)).toBeVisible()

    // Submit button should be disabled with invalid inputs
    await expect(page.getByRole('button', { name: /submit request/i })).toBeDisabled()

    // Fix inputs
    await page.getByLabel(/deadline/i).fill('60')
    await page.getByLabel(/gas limit/i).fill('100000')

    // Submit button should now be enabled
    await expect(page.getByRole('button', { name: /submit request/i })).toBeEnabled()
  })

  test('should show transaction progress', async ({ page }) => {
    // Connect wallet and submit request
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '1.5 ETH'
      })
    })

    await page.getByRole('button', { name: /request randomness/i }).click()
    await page.getByLabel(/deadline/i).fill('60')
    await page.getByLabel(/gas limit/i).fill('100000')
    await page.getByRole('button', { name: /submit request/i }).click()
    await page.getByRole('button', { name: /confirm/i }).click()

    // Should show pending transaction
    await expect(page.getByText(/transaction pending/i)).toBeVisible()
    await expect(page.getByRole('progressbar')).toBeVisible()

    // Mock transaction confirmation
    await page.evaluate(() => {
      window.mockTransactionConfirmation('0x1234567890abcdef', 'confirmed', 3)
    })

    // Should show confirmed transaction
    await expect(page.getByText(/transaction confirmed/i)).toBeVisible()
    await expect(page.getByText(/3 confirmations/i)).toBeVisible()
  })

  test('should handle transaction failure', async ({ page }) => {
    // Connect wallet and submit request
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '1.5 ETH'
      })
    })

    await page.getByRole('button', { name: /request randomness/i }).click()
    await page.getByLabel(/deadline/i).fill('60')
    await page.getByLabel(/gas limit/i).fill('100000')
    await page.getByRole('button', { name: /submit request/i }).click()
    await page.getByRole('button', { name: /confirm/i }).click()

    // Mock transaction failure
    await page.evaluate(() => {
      window.mockTransactionFailure('0x1234567890abcdef', 'Transaction reverted')
    })

    // Should show failed transaction
    await expect(page.getByText(/transaction failed/i)).toBeVisible()
    await expect(page.getByText(/transaction reverted/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('should copy transaction hash to clipboard', async ({ page }) => {
    // Connect wallet and submit request
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '1.5 ETH'
      })
    })

    await page.getByRole('button', { name: /request randomness/i }).click()
    await page.getByLabel(/deadline/i).fill('60')
    await page.getByLabel(/gas limit/i).fill('100000')
    await page.getByRole('button', { name: /submit request/i }).click()
    await page.getByRole('button', { name: /confirm/i }).click()

    // Click copy button
    await page.getByRole('button', { name: /copy hash/i }).click()

    // Should show copied confirmation
    await expect(page.getByText(/copied to clipboard/i)).toBeVisible()
  })

  test('should link to block explorer', async ({ page }) => {
    // Connect wallet and submit request
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 534352,
        balance: '1.5 ETH'
      })
    })

    await page.getByRole('button', { name: /request randomness/i }).click()
    await page.getByLabel(/deadline/i).fill('60')
    await page.getByLabel(/gas limit/i).fill('100000')
    await page.getByRole('button', { name: /submit request/i }).click()
    await page.getByRole('button', { name: /confirm/i }).click()

    // Check explorer link
    const explorerLink = page.getByRole('link', { name: /view on explorer/i })
    await expect(explorerLink).toBeVisible()
    await expect(explorerLink).toHaveAttribute('href', /scrollscan\.com/)
    await expect(explorerLink).toHaveAttribute('target', '_blank')
  })
})