import { test, expect } from '@playwright/test'

test.describe('Fulfillment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"]')

    // Connect wallet as fulfiller
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await page.evaluate(() => {
      window.mockWalletConnection({
        address: '0x9876543210987654321098765432109876543210',
        chainId: 534352, // Scroll
        balance: '5.0 ETH'
      })
    })

    // Mock pending requests
    await page.evaluate(() => {
      window.mockPendingRequests([
        {
          requestId: 1n,
          requester: '0x1234567890123456789012345678901234567890',
          deadline: Date.now() - 300000, // 5 minutes ago (fulfillable)
          round: 12346n,
          callbackGasLimit: 150000n,
          estimatedEarnings: 500000000000000n, // 0.0005 ETH
          timeUntilFulfillable: 0,
          networkGasCost: 200000000000000n, // 0.0002 ETH
          profitMargin: 300000000000000n, // 0.0003 ETH
        },
        {
          requestId: 2n,
          requester: '0x5555555555555555555555555555555555555555',
          deadline: Date.now() + 1800000, // 30 minutes from now
          round: 12347n,
          callbackGasLimit: 100000n,
          estimatedEarnings: 800000000000000n, // 0.0008 ETH
          timeUntilFulfillable: 1800,
          networkGasCost: 150000000000000n, // 0.00015 ETH
          profitMargin: 650000000000000n, // 0.00065 ETH
        }
      ])
    })
  })

  test('should display pending requests sorted by profit margin', async ({ page }) => {
    // Navigate to pending requests
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Should show both requests sorted by profit margin (highest first)
    const requestCards = page.locator('[data-testid^="request-card"]')
    await expect(requestCards).toHaveCount(2)

    // First request should be #2 (higher profit margin)
    await expect(requestCards.first()).toContainText('Request #2')
    await expect(requestCards.first()).toContainText('0.00065 ETH profit')

    // Second request should be #1 (lower profit margin)
    await expect(requestCards.last()).toContainText('Request #1')
    await expect(requestCards.last()).toContainText('0.0003 ETH profit')
  })

  test('should show fulfillable vs not-ready requests', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Request #1 should be fulfillable (deadline passed)
    const request1 = page.getByTestId('request-card-1')
    await expect(request1.getByRole('button', { name: /fulfill/i })).toBeEnabled()
    await expect(request1.getByText(/ready to fulfill/i)).toBeVisible()

    // Request #2 should not be ready (deadline not yet reached)
    const request2 = page.getByTestId('request-card-2')
    await expect(request2.getByText(/ready in/i)).toBeVisible()
    await expect(request2.getByText(/30m/i)).toBeVisible()
  })

  test('should fulfill a ready request successfully', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Click fulfill on request #1
    const fulfillButton = page.getByTestId('request-card-1').getByRole('button', { name: /fulfill/i })
    await fulfillButton.click()

    // Should show fulfillment confirmation dialog
    await expect(page.getByText(/confirm fulfillment/i)).toBeVisible()
    await expect(page.getByText(/request #1/i)).toBeVisible()
    await expect(page.getByText(/estimated earnings: 0\.0005 ETH/i)).toBeVisible()
    await expect(page.getByText(/gas cost: 0\.0002 ETH/i)).toBeVisible()
    await expect(page.getByText(/net profit: 0\.0003 ETH/i)).toBeVisible()

    // Confirm fulfillment
    await page.getByRole('button', { name: /confirm fulfillment/i }).click()

    // Should show fulfillment in progress
    await expect(page.getByText(/fulfilling request/i)).toBeVisible()
    await expect(page.getByRole('progressbar')).toBeVisible()

    // Mock successful fulfillment
    await page.evaluate(() => {
      window.mockFulfillmentSuccess({
        transactionHash: '0xfulfillment1234567890abcdef1234567890abcdef',
        requestId: 1n,
        earnings: 500000000000000n
      })
    })

    // Should show success message
    await expect(page.getByText(/fulfillment successful/i)).toBeVisible()
    await expect(page.getByText(/earned 0\.0005 ETH/i)).toBeVisible()

    // Request should be removed from pending list
    await expect(page.getByTestId('request-card-1')).not.toBeVisible()
    await expect(page.getByTestId('request-card-2')).toBeVisible()
  })

  test('should handle fulfillment errors gracefully', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Click fulfill on request #1
    await page.getByTestId('request-card-1').getByRole('button', { name: /fulfill/i }).click()
    await page.getByRole('button', { name: /confirm fulfillment/i }).click()

    // Mock fulfillment failure
    await page.evaluate(() => {
      window.mockFulfillmentError(new Error('Request already fulfilled'))
    })

    // Should show error message
    await expect(page.getByText(/fulfillment failed/i)).toBeVisible()
    await expect(page.getByText(/request already fulfilled/i)).toBeVisible()

    // Should offer retry and refresh options
    await expect(page.getByRole('button', { name: /refresh list/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /close/i })).toBeVisible()

    // Click refresh
    await page.getByRole('button', { name: /refresh list/i }).click()

    // Should reload pending requests
    await expect(page.getByText(/loading/i)).toBeVisible()
  })

  test('should show real-time countdown for not-ready requests', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Request #2 should show countdown
    const request2 = page.getByTestId('request-card-2')
    await expect(request2.getByText(/ready in/i)).toBeVisible()

    // Countdown should update (mock time progression)
    await page.evaluate(() => {
      window.mockTimeProgression(60000) // Advance 1 minute
    })

    await expect(request2.getByText(/29m/i)).toBeVisible()
  })

  test('should calculate and display profit margins correctly', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    const request1 = page.getByTestId('request-card-1')
    const request2 = page.getByTestId('request-card-2')

    // Request #1: 0.0005 ETH earnings - 0.0002 ETH gas = 0.0003 ETH profit
    await expect(request1.getByText(/earnings: 0\.0005 ETH/i)).toBeVisible()
    await expect(request1.getByText(/gas cost: 0\.0002 ETH/i)).toBeVisible()
    await expect(request1.getByText(/profit: 0\.0003 ETH/i)).toBeVisible()

    // Request #2: 0.0008 ETH earnings - 0.00015 ETH gas = 0.00065 ETH profit
    await expect(request2.getByText(/earnings: 0\.0008 ETH/i)).toBeVisible()
    await expect(request2.getByText(/gas cost: 0\.00015 ETH/i)).toBeVisible()
    await expect(request2.getByText(/profit: 0\.00065 ETH/i)).toBeVisible()
  })

  test('should show total potential earnings summary', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Should show summary at top
    await expect(page.getByText(/total pending requests: 2/i)).toBeVisible()
    await expect(page.getByText(/total potential earnings: 0\.0013 ETH/i)).toBeVisible()
    await expect(page.getByText(/ready to fulfill: 1/i)).toBeVisible()
  })

  test('should filter requests by profitability', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Apply profit filter
    await page.getByRole('button', { name: /filters/i }).click()
    await page.getByLabel(/minimum profit/i).fill('0.0005')
    await page.getByRole('button', { name: /apply filter/i }).click()

    // Should only show request #2 (higher profit)
    await expect(page.getByTestId('request-card-2')).toBeVisible()
    await expect(page.getByTestId('request-card-1')).not.toBeVisible()

    // Clear filter
    await page.getByRole('button', { name: /clear filters/i }).click()

    // Should show both requests again
    await expect(page.getByTestId('request-card-1')).toBeVisible()
    await expect(page.getByTestId('request-card-2')).toBeVisible()
  })

  test('should handle gas price changes affecting profitability', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Initial state - request should be profitable
    const request1 = page.getByTestId('request-card-1')
    await expect(request1.getByText(/profit: 0\.0003 ETH/i)).toBeVisible()
    await expect(request1.getByRole('button', { name: /fulfill/i })).toBeEnabled()

    // Mock gas price increase
    await page.evaluate(() => {
      window.mockGasPriceChange(100000000000n) // 100 gwei (5x increase)
    })

    // Profit should recalculate and potentially become negative
    await expect(request1.getByText(/loss:/i)).toBeVisible()
    await expect(request1.getByRole('button', { name: /fulfill/i })).toBeDisabled()
    await expect(request1.getByText(/not profitable/i)).toBeVisible()
  })

  test('should show fulfillment transaction in history', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Fulfill request #1
    await page.getByTestId('request-card-1').getByRole('button', { name: /fulfill/i }).click()
    await page.getByRole('button', { name: /confirm fulfillment/i }).click()

    // Mock successful fulfillment
    await page.evaluate(() => {
      window.mockFulfillmentSuccess({
        transactionHash: '0xfulfillment1234567890abcdef1234567890abcdef',
        requestId: 1n,
        earnings: 500000000000000n
      })
    })

    // Navigate to transaction history
    await page.getByRole('tab', { name: /transaction history/i }).click()

    // Should show fulfillment transaction
    await expect(page.getByText(/fulfillment transaction/i)).toBeVisible()
    await expect(page.getByText(/0xfulfillment.../i)).toBeVisible()
    await expect(page.getByText(/earned: 0\.0005 ETH/i)).toBeVisible()
  })

  test('should auto-refresh pending requests list', async ({ page }) => {
    await page.getByRole('tab', { name: /pending requests/i }).click()

    // Enable auto-refresh
    await page.getByRole('button', { name: /auto-refresh/i }).click()
    await expect(page.getByText(/auto-refresh enabled/i)).toBeVisible()

    // Mock new pending request appearing
    await page.evaluate(() => {
      window.mockNewPendingRequest({
        requestId: 3n,
        requester: '0x7777777777777777777777777777777777777777',
        deadline: Date.now() + 900000, // 15 minutes from now
        round: 12348n,
        callbackGasLimit: 120000n,
        estimatedEarnings: 600000000000000n,
        timeUntilFulfillable: 900,
        networkGasCost: 180000000000000n,
        profitMargin: 420000000000000n,
      })
    })

    // Should automatically show new request
    await expect(page.getByTestId('request-card-3')).toBeVisible()
    await expect(page.getByText(/total pending requests: 3/i)).toBeVisible()
  })
})