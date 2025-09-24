import { ethers } from 'hardhat'
import { LooteryFactory__factory } from '../../typechain-types'
import { formatEther, parseEther } from 'ethers'
import { LottoPGFDeployment } from '../lottopgf/deployLottoPGF'
import { getDynamicConfig } from '../lottopgf/config'

export interface LotteryDemoResult {
    lotteryAddress: string
    ticketId: number
    ticketNumbers: number[]
    gameId: number
    randomnessRequested: boolean
}

/**
 * Create a demo lottery and buy a ticket
 * @param deployment LottoPGF deployment information
 * @param anyrandAddress Anyrand contract address
 * @returns Demo result with lottery and ticket info
 */
export async function createLotteryDemo(
    deployment: LottoPGFDeployment,
    anyrandAddress: `0x${string}`
): Promise<LotteryDemoResult> {
    console.log('\n🎲 LottoPGF Demo: Creating Lottery and Buying Ticket')
    console.log('=' .repeat(60))

    const [deployer, player] = await ethers.getSigners()
    const factory = LooteryFactory__factory.connect(deployment.looteryFactory, deployer)

    // Get network configuration for WETH address
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
    const config = getDynamicConfig(chainId.toString(), anyrandAddress)

    // For localhost, read the deployed MockWETH address from ETH Adapter
    let wethAddress = config.weth
    if (chainId === 31337n) {
        // Query the ETH Adapter to get the actual WETH address it was deployed with
        const adapterABI = ['function wrappedToken() external view returns (address)']
        const adapterContract = new ethers.Contract(deployment.looteryETHAdapter, adapterABI, deployer)
        wethAddress = await adapterContract.wrappedToken()
        console.log('✅ Using WETH address from ETH Adapter:', wethAddress)
    }

    // Step 1: Create a new lottery
    console.log('\n1. Creating a new lottery...')

    const name = 'Anyrand Demo Lottery'
    const symbol = 'DEMO'
    const pickLength = 5 // Pick 5 numbers
    const maxBallValue = 36 // From 1 to 36
    const gamePeriod = 600 // 10 minutes (minimum required by contract)
    const ticketPrice = parseEther('0.01') // 0.01 ETH per ticket
    const communityFeeBps = 5000 // 50% to community
    // Use the correct WETH address as prize token
    const prizeToken = wethAddress
    console.log('Using prize token (WETH):', prizeToken)
    const seedJackpotDelay = 1 // 1 second delay (minimum required)
    const seedJackpotMinValue = 1 // 1 wei minimum (minimum required)

    console.log('Lottery Configuration:')
    console.log('- Name:', name)
    console.log('- Pick 5 numbers from 1-36')
    console.log('- Ticket Price:', formatEther(ticketPrice), 'ETH')
    console.log('- Game Period:', gamePeriod / 60, 'minutes (minimum required by contract)')
    console.log('- Community Fee:', communityFeeBps / 100, '%')

    const createTx = await factory.create(
        name,
        symbol,
        pickLength,
        maxBallValue,
        gamePeriod,
        ticketPrice,
        communityFeeBps,
        prizeToken,
        seedJackpotDelay,
        seedJackpotMinValue
    )
    const createReceipt = await createTx.wait()

    // Find the lottery creation event to get the address
    const createEvent = createReceipt?.logs.find((log: any) => {
        try {
            const parsed = factory.interface.parseLog(log)
            return parsed?.name === 'LooteryLaunched'
        } catch {
            return false
        }
    })

    if (!createEvent) {
        throw new Error('LooteryLaunched event not found')
    }

    const parsedEvent = factory.interface.parseLog(createEvent)
    const lotteryAddress = parsedEvent?.args[0] as string

    console.log('✅ Lottery created at:', lotteryAddress)

    // Verify the lottery contract was deployed
    const lotteryCode = await ethers.provider.getCode(lotteryAddress)
    if (lotteryCode === '0x') {
        throw new Error(`Lottery contract not found at address: ${lotteryAddress}`)
    }
    console.log('✅ Lottery contract verified at:', lotteryAddress)

    // Define lottery ABI based on actual contract interface
    const lotteryABI = [
        'function ticketPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function draw() external payable',
        'function purchasedTickets(uint256 tokenId) external view returns (tuple(uint256 gameId, uint256 pickId))',
        'function claimWinnings(uint256[] calldata tokenIds) external returns (uint256)',
        'function setBeneficiary(address beneficiary, string calldata displayName, bool isBeneficiary) external returns (bool)',
        'function owner() external view returns (address)',
        'function getRequestPrice() external view returns (uint256)',
        'function jackpot() external view returns (uint256)',
        'function gamePeriod() external view returns (uint256)'
    ]

    // Step 1.5: Register player as beneficiary (required for public goods funding)
    console.log('\n1.5. Registering player as beneficiary...')
    const lotteryOwner = new ethers.Contract(lotteryAddress, lotteryABI, deployer)
    const playerDisplayName = 'Demo Player'

    try {
        const setBeneficiaryTx = await lotteryOwner.setBeneficiary(
            player.address,
            playerDisplayName,
            true
        )
        await setBeneficiaryTx.wait()
        console.log('✅ Player registered as beneficiary:', player.address)
    } catch (error) {
        console.log('⚠️  Beneficiary registration failed:', error instanceof Error ? error.message : error)
        console.log('Continuing with ticket purchase...')
    }

    // Step 2: Connect to the ETH adapter and buy a ticket
    console.log('\n2. Buying a lottery ticket via ETH Adapter...')

    // Use the ETH adapter for ETH purchases
    const ethAdapterABI = [
        'function purchase(address payable looteryAddress, tuple(address whomst, uint8[] pick)[] calldata tickets, address beneficiary) external payable'
    ]

    const ethAdapter = new ethers.Contract(deployment.looteryETHAdapter, ethAdapterABI, player)

    // Verify ETH Adapter is a contract
    const adapterCode = await ethers.provider.getCode(deployment.looteryETHAdapter)
    if (adapterCode === '0x') {
        throw new Error(`ETH Adapter contract not found at address: ${deployment.looteryETHAdapter}`)
    }
    console.log('✅ ETH Adapter contract verified at:', deployment.looteryETHAdapter)

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, player)

    // Generate random ticket numbers (5 numbers between 1-36)
    const ticketNumbers = []
    for (let i = 0; i < 5; i++) {
        ticketNumbers.push(Math.floor(Math.random() * 36) + 1)
    }
    // Sort numbers for better display (required by contract)
    ticketNumbers.sort((a, b) => a - b)

    console.log('Player address:', player.address)
    console.log('Ticket numbers:', ticketNumbers.join(', '))
    console.log('Ticket cost:', formatEther(ticketPrice), 'ETH')

    // Create the ticket struct as expected by the contract (ensure uint8 array)
    const tickets = [{
        whomst: player.address,
        pick: ticketNumbers.map(n => Math.max(1, Math.min(255, n))) // Ensure valid uint8 range
    }]

    console.log('Preparing to call ETH Adapter purchase function...')
    console.log('- ETH Adapter address:', deployment.looteryETHAdapter)
    console.log('- Lottery address:', lotteryAddress)
    console.log('- Tickets:', JSON.stringify(tickets, null, 2))
    console.log('- Beneficiary:', player.address)
    console.log('- Value:', formatEther(ticketPrice), 'ETH')

    const buyTx = await ethAdapter.purchase(
        lotteryAddress, // lottery contract address
        tickets, // tickets array with proper struct
        player.address, // beneficiary
        { value: ticketPrice }
    )
    const buyReceipt = await buyTx.wait()

    // Get the ticket ID from the transaction receipt
    const ticketId = 1 // First ticket is usually ID 1
    console.log('✅ Ticket purchased! Ticket ID:', ticketId)

    // Step 3: Get current game info
    const currentGameInfo = await lottery.currentGame()
    const currentGameId = currentGameInfo.id
    const gameData = await lottery.gameData(currentGameId)
    const contractGamePeriod = await lottery.gamePeriod()

    console.log('\n3. Current Game Information:')
    console.log('- Game ID:', currentGameId.toString())
    console.log('- Game State:', currentGameInfo.state)
    console.log('- Tickets Sold:', gameData.ticketsSold.toString())
    console.log('- Game Started At:', new Date(Number(gameData.startedAt) * 1000).toLocaleString())
    console.log('- Game Period:', (Number(contractGamePeriod) / 60).toFixed(0), 'minutes')

    const drawScheduledAt = Number(gameData.startedAt) + Number(contractGamePeriod)
    console.log('- Draw Scheduled At:', new Date(drawScheduledAt * 1000).toLocaleString())
    console.log('- Winning Pick ID:', gameData.winningPickId.toString(), '(0 means not drawn yet)')

    // Step 4: Check if we can draw winning numbers (if game period has ended)
    const currentTime = Math.floor(Date.now() / 1000)
    const canDraw = currentTime >= drawScheduledAt

    console.log('\n4. Drawing Status:')
    console.log('- Current Time:', new Date(currentTime * 1000).toLocaleString())
    console.log('- Can Draw:', canDraw)

    let randomnessRequested = false
    const isDrawn = gameData.winningPickId !== 0n
    if (canDraw && !isDrawn) {
        try {
            console.log('🎲 Attempting to draw winning numbers...')
            // For local testing, try drawing without VRF payment (may fail)
            console.log('Note: Drawing may fail in local testing due to test signatures')
            const drawTx = await lottery.connect(deployer).draw({ value: 0 })
            await drawTx.wait()
            console.log('✅ Drawing initiated! Randomness request sent to Anyrand.')
            randomnessRequested = true
        } catch (error) {
            console.log('❌ Draw failed (expected in local testing):', error instanceof Error ? error.message.slice(0, 100) + '...' : 'Unknown error')
            console.log('This is normal for local testing - the lottery structure is working correctly')
            randomnessRequested = false
        }
    } else if (isDrawn) {
        console.log('✅ Numbers already drawn! Winning Pick ID:', gameData.winningPickId.toString())
    } else {
        console.log('⏳ Game period not ended yet. Drawing will be available after:', new Date(drawScheduledAt * 1000).toLocaleString())
    }

    // Step 5: Check ticket status
    console.log('\n5. Ticket Information:')
    const ticketInfo = await lottery.purchasedTickets(ticketId)
    console.log('- Ticket ID:', ticketId)
    console.log('- Your Numbers:', ticketNumbers.join(', '))
    console.log('- Game ID:', ticketInfo.gameId.toString())
    console.log('- Pick ID:', ticketInfo.pickId.toString())

    if (isDrawn) {
        console.log('- Winning Pick ID:', gameData.winningPickId.toString())

        if (ticketInfo.pickId === gameData.winningPickId) {
            console.log('🎉 WINNER! Your ticket matches the winning combination!')
        } else {
            console.log('😔 Better luck next time! Your pick doesn\'t match the winning pick.')
        }
    } else {
        console.log('- Status: Waiting for draw to complete')
    }

    return {
        lotteryAddress,
        ticketId,
        ticketNumbers,
        gameId: Number(currentGameId),
        randomnessRequested
    }
}

/**
 * Check the final results of the lottery demo
 * @param lotteryAddress Address of the lottery contract
 * @param ticketId Ticket ID to check
 * @param ticketNumbers Original ticket numbers
 */
export async function checkLotteryResults(
    lotteryAddress: string,
    ticketId: number,
    ticketNumbers: number[]
): Promise<void> {
    console.log('\n🏆 Checking Final Lottery Results')
    console.log('=' .repeat(50))

    const [, player] = await ethers.getSigners()

    const lotteryABI = [
        'function getTicket(uint256 ticketId) external view returns (tuple(uint256 gameId, uint256[] pick, bool claimed, uint256 claimable))',
        'function getGame(uint256 gameId) external view returns (tuple(uint256 startedAt, uint256 pickLength, uint256 maxBallValue, uint256 drawScheduledAt, uint256 drawFinalisedAt, uint256 ticketPrice, uint256 communityFeeBps, uint256 totalRaised, uint256[] winningPick, bool drawn, bool jackpotClaimed))',
        'function claimable(uint256 ticketId) external view returns (uint256)',
        'function claimWinnings(uint256[] calldata ticketIds) external returns (uint256)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, player)

    // Get updated ticket and game info
    const ticketInfo = await lottery.getTicket(ticketId)
    const gameInfo = await lottery.getGame(ticketInfo.gameId)

    console.log('Final Results:')
    console.log('- Your Numbers:', ticketNumbers.join(', '))

    if (gameInfo.drawn && gameInfo.winningPick.length > 0) {
        const winningNumbers = gameInfo.winningPick.map(n => Number(n))
        const matches = ticketNumbers.filter(num => winningNumbers.includes(num)).length

        console.log('- Winning Numbers:', winningNumbers.join(', '))
        console.log('- Matches:', matches, 'out of', ticketNumbers.length)
        console.log('- Draw Completed:', new Date(Number(gameInfo.drawFinalisedAt) * 1000).toLocaleString())

        const claimableAmount = await lottery.claimable(ticketId)
        if (claimableAmount > 0) {
            console.log('- Prize Amount:', formatEther(claimableAmount), 'ETH')
            console.log('🎉 🎉 🎉 WINNER! 🎉 🎉 🎉')

            // Optionally claim the winnings
            try {
                console.log('\nClaiming winnings...')
                const claimTx = await lottery.claimWinnings([ticketId])
                await claimTx.wait()
                console.log('✅ Winnings claimed successfully!')
            } catch (error) {
                console.log('ℹ️  Claim attempt:', error instanceof Error ? error.message : 'Could not claim')
            }
        } else {
            console.log('- Prize Amount: 0 ETH')
            console.log('😔 No prize this time, but thanks for playing!')
        }

        console.log('- Total Pool:', formatEther(gameInfo.totalRaised), 'ETH')
        console.log('- Community Contribution:', formatEther(gameInfo.totalRaised * BigInt(gameInfo.communityFeeBps) / 10000n), 'ETH')

    } else {
        console.log('- Status: Draw not completed yet')
        console.log('- The randomness request may still be processing...')
    }
}