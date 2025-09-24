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
    anyrandAddress: `0x${string}`,
    waitForDraw: boolean = false
): Promise<LotteryDemoResult> {
    console.log('\n🎲 LottoPGF Demo: Multi-Player Lottery with Live Drawing')
    console.log('=' .repeat(70))

    const [deployer, player1, player2, player3] = await ethers.getSigners()
    // Use deployer as fallback for all players if others are undefined (testnet with single account)
    const players = [
        player1 || deployer,
        player2 || deployer,
        player3 || deployer
    ]
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
    // Use 2 minutes for all networks with updated contract
    const gamePeriod = 120 // 2 minutes for all networks
    const ticketPrice = 1n // 1 wei per ticket (minimal cost for testing)
    const communityFeeBps = 5000 // 50% to community
    // Use the correct WETH address as prize token
    const prizeToken = wethAddress
    console.log('Using prize token (WETH):', prizeToken)
    const seedJackpotDelay = 1 // 1 second delay (minimum required)
    const seedJackpotMinValue = 1 // 1 wei minimum (minimum required)

    console.log('Lottery Configuration:')
    console.log('- Name:', name)
    console.log('- Pick 5 numbers from 1-36')
    console.log('- Ticket Price:', formatEther(ticketPrice), 'ETH (1 wei - minimal cost)')
    console.log('- Game Period:', gamePeriod / 60, 'minutes (updated contract minimum)')
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

    // Get detailed lottery information
    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)
    const currentGameInfo = await lottery.currentGame()
    const gameData = await lottery.gameData(currentGameInfo.id)
    const jackpot = await lottery.jackpot()

    console.log('\n📊 Detailed Lottery Information:')
    console.log('- Lottery ID:', currentGameInfo.id.toString())
    console.log('- Current Jackpot:', formatEther(jackpot), 'ETH')
    console.log('- Game State:', currentGameInfo.state.toString())
    console.log('- Game Started At:', new Date(Number(gameData.startedAt) * 1000).toLocaleString())
    console.log('- Game Duration:', gamePeriod / 60, 'minutes')
    console.log('- Tickets Sold So Far:', gameData.ticketsSold.toString())
    console.log('- Prize Token:', prizeToken)
    console.log('- Community Fee:', communityFeeBps / 100, '%')

    // Step 1.5: Register deployer as beneficiary (deployer is lottery owner)
    console.log('\n1.5. Registering deployer as beneficiary...')

    try {
        const setBeneficiaryTx = await lottery.setBeneficiary(
            deployer.address,
            'Demo Beneficiary',
            true
        )
        await setBeneficiaryTx.wait()
        console.log('✅ Deployer registered as beneficiary:', deployer.address)
    } catch (error: any) {
        console.log('⚠️  Beneficiary registration failed:', error.message)
        console.log('   This may be expected if beneficiary is already registered')
    }

    // Step 2: Multiple players buy lottery tickets
    console.log('\n2. Multiple players buying lottery tickets...')

    // Use the ETH adapter for ETH purchases
    const ethAdapterABI = [
        'function purchase(address payable looteryAddress, tuple(address whomst, uint8[] pick)[] calldata tickets, address beneficiary) external payable'
    ]

    // Verify ETH Adapter is a contract
    const adapterCode = await ethers.provider.getCode(deployment.looteryETHAdapter)
    if (adapterCode === '0x') {
        throw new Error(`ETH Adapter contract not found at address: ${deployment.looteryETHAdapter}`)
    }
    console.log('✅ ETH Adapter contract verified at:', deployment.looteryETHAdapter)

    const playerTickets: Array<{playerIndex: number, ticketId: number, numbers: number[]}> = []

    // Each player buys a ticket with different numbers
    for (let i = 0; i < players.length; i++) {
        const player = players[i]
        const ethAdapter = new ethers.Contract(deployment.looteryETHAdapter, ethAdapterABI, player)

        console.log(`\n2.${i + 1}. Player ${i + 1} buying ticket...`)
        console.log('Player address:', player.address)

        // Generate different ticket numbers for each player
        const ticketNumbers = []
        for (let j = 0; j < 5; j++) {
            // Use different ranges for each player to increase chances of different picks
            const baseOffset = i * 10
            ticketNumbers.push((baseOffset + Math.floor(Math.random() * 10) + 1) % 36 + 1)
        }
        // Sort numbers and ensure no duplicates
        const uniqueNumbers = Array.from(new Set(ticketNumbers)).sort((a, b) => a - b)
        while (uniqueNumbers.length < 5) {
            const newNum = Math.floor(Math.random() * 36) + 1
            if (!uniqueNumbers.includes(newNum)) {
                uniqueNumbers.push(newNum)
            }
        }
        const finalNumbers = uniqueNumbers.slice(0, 5).sort((a, b) => a - b)

        console.log('Ticket numbers:', finalNumbers.join(', '))
        console.log('Ticket cost:', formatEther(ticketPrice), 'ETH (1 wei)')

        // Create the ticket struct as expected by the contract
        const tickets = [{
            whomst: player.address,
            pick: finalNumbers.map(n => Math.max(1, Math.min(255, n)))
        }]

        try {
            // Use deployer as beneficiary since we can't register other beneficiaries
            const buyTx = await ethAdapter.purchase(
                lotteryAddress,
                tickets,
                deployer.address, // Use deployer as beneficiary for demo
                { value: ticketPrice }
            )
            await buyTx.wait()

            const ticketId = i + 1
            playerTickets.push({
                playerIndex: i,
                ticketId: ticketId,
                numbers: finalNumbers
            })

            console.log(`✅ Player ${i + 1} ticket purchased! Ticket ID: ${ticketId}`)
        } catch (error: any) {
            console.log(`❌ Player ${i + 1} ticket purchase failed!`)
            console.log('Error:', error.message || error)
            if (error.data) {
                console.log('Error data:', error.data)
            }
            if (error.reason) {
                console.log('Error reason:', error.reason)
            }
            if (error.code) {
                console.log('Error code:', error.code)
            }
            throw error; // Re-throw to stop execution
        }
    }

    console.log(`\n✅ All ${players.length} players have purchased tickets!`)

    // Step 3: Get updated game info
    const updatedGameInfo = await lottery.currentGame()
    const currentGameId = updatedGameInfo.id
    const updatedGameData = await lottery.gameData(currentGameId)
    const contractGamePeriod = await lottery.gamePeriod()

    console.log('\n3. Current Game Information:')
    console.log('- Game ID:', currentGameId.toString())
    console.log('- Game State:', updatedGameInfo.state)
    console.log('- Tickets Sold:', updatedGameData.ticketsSold.toString())
    console.log('- Game Started At:', new Date(Number(updatedGameData.startedAt) * 1000).toLocaleString())
    console.log('- Game Period:', (Number(contractGamePeriod) / 60).toFixed(0), 'minutes')

    const drawScheduledAt = Number(updatedGameData.startedAt) + Number(contractGamePeriod)
    console.log('- Draw Scheduled At:', new Date(drawScheduledAt * 1000).toLocaleString())
    console.log('- Winning Pick ID:', updatedGameData.winningPickId.toString(), '(0 means not drawn yet)')

    // Step 4: Check if we can draw winning numbers (if game period has ended)
    const currentTime = Math.floor(Date.now() / 1000)
    const canDraw = currentTime >= drawScheduledAt

    console.log('\n4. Drawing Status:')
    console.log('- Current Time:', new Date(currentTime * 1000).toLocaleString())
    console.log('- Can Draw:', canDraw)

    let randomnessRequested = false
    let isDrawn = gameData.winningPickId !== 0n

    if (!canDraw) {
        const waitTime = drawScheduledAt - currentTime
        console.log(`⏳ Game period not ended yet. Waiting ${waitTime} seconds...`)
        console.log('⏰ Draw will be available after:', new Date(drawScheduledAt * 1000).toLocaleString())

        if (waitForDraw) {
            console.log('\n🕐 Waiting for game period to end...')
            console.log('(This demo will wait in real-time to show the complete flow)')

            // Wait for the game period to end
            while (Math.floor(Date.now() / 1000) < drawScheduledAt) {
                const remainingTime = drawScheduledAt - Math.floor(Date.now() / 1000)
                if (remainingTime > 0) {
                    process.stdout.write(`\r⏳ Time remaining: ${remainingTime}s...`)
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            }
            console.log('\n✅ Game period ended! Now eligible for drawing.')
        } else {
            console.log('\n⏩ Skipping wait for demo purposes (use waitForDraw=true for full experience)')
            console.log('📋 In a real scenario, you would wait for the game period to complete')
        }
    }

    // Refresh game data and check if we can draw now
    const refreshedGameData = await lottery.gameData(currentGameId)
    isDrawn = refreshedGameData.winningPickId !== 0n
    const nowCanDraw = Math.floor(Date.now() / 1000) >= drawScheduledAt

    if (waitForDraw && nowCanDraw && !isDrawn) {
        try {
            console.log('\n🎲 Initiating lottery drawing...')
            console.log('⚠️  Note: Drawing will fail in local testing due to test signatures, but structure will be demonstrated')

            const requestPrice = await lottery.getRequestPrice()
            console.log('VRF request price:', formatEther(requestPrice), 'ETH')

            const drawTx = await lottery.connect(deployer).draw({ value: requestPrice })
            await drawTx.wait()
            console.log('✅ Drawing initiated! Randomness request sent to Anyrand.')
            randomnessRequested = true
        } catch (error: any) {
            console.log('❌ Draw failed:', error instanceof Error ? error.message : 'Unknown error')
            if (error.data) {
                console.log('Error data:', error.data)
            }
            if (error.reason) {
                console.log('Error reason:', error.reason)
            }
            if (error.code) {
                console.log('Error code:', error.code)
            }
            if (chainId !== 31337n) {
                console.log('⚠️  This should work on testnet - investigating the issue...')
            } else {
                console.log('📝 This is expected for local testing with test signatures')
            }
            randomnessRequested = false
        }
    } else if (isDrawn) {
        console.log('✅ Numbers already drawn! Winning Pick ID:', refreshedGameData.winningPickId.toString())
    }

    // Step 5: Check all players' ticket status
    console.log('\n5. All Players\' Ticket Information:')

    const finalGameData = await lottery.gameData(currentGameId)
    const finalIsDrawn = finalGameData.winningPickId !== 0n

    console.log(`📊 Game Summary:`)
    console.log(`- Total Tickets Sold: ${finalGameData.ticketsSold}`)
    console.log(`- Game ID: ${currentGameId}`)

    if (finalIsDrawn) {
        console.log(`- 🎯 Winning Pick ID: ${finalGameData.winningPickId.toString()}`)
    } else {
        console.log(`- Status: Draw not completed (expected in local testing)`)
    }

    console.log('\n👥 Player Results:')
    let winners = []

    for (const playerTicket of playerTickets) {
        const player = players[playerTicket.playerIndex]
        const ticketInfo = await lottery.purchasedTickets(playerTicket.ticketId)

        console.log(`\n🎟️  Player ${playerTicket.playerIndex + 1} (${player.address.slice(0, 8)}...):`)
        console.log(`   - Ticket ID: ${playerTicket.ticketId}`)
        console.log(`   - Numbers: ${playerTicket.numbers.join(', ')}`)
        console.log(`   - Pick ID: ${ticketInfo.pickId.toString()}`)

        if (finalIsDrawn) {
            if (ticketInfo.pickId === finalGameData.winningPickId) {
                console.log(`   - 🎉 WINNER! This ticket matches the winning combination!`)
                winners.push({
                    playerIndex: playerTicket.playerIndex + 1,
                    address: player.address,
                    numbers: playerTicket.numbers,
                    ticketId: playerTicket.ticketId
                })
            } else {
                console.log(`   - ❌ No match`)
            }
        } else {
            console.log(`   - ⏳ Waiting for draw completion`)
        }
    }

    if (finalIsDrawn) {
        if (winners.length > 0) {
            console.log('\n🏆 LOTTERY WINNERS:')
            winners.forEach(winner => {
                console.log(`🎊 Player ${winner.playerIndex} (${winner.address}) won with numbers: ${winner.numbers.join(', ')}`)
            })
        } else {
            console.log('\n😔 No winners this round - jackpot rolls over!')
        }
    }

    return {
        lotteryAddress,
        ticketId: playerTickets[0]?.ticketId || 1,
        ticketNumbers: playerTickets[0]?.numbers || [],
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