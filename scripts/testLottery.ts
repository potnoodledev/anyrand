import { ethers } from 'hardhat'

async function main() {
    // Try to get address from command line or environment variable
    const lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS

    if (!lotteryAddress) {
        console.error('❌ Usage: Set TEST_LOTTERY_ADDRESS environment variable')
        console.error('   Example: TEST_LOTTERY_ADDRESS=0x123... yarn test-lottery')
        console.error('   Or pass as argument (may not work with hardhat): yarn test-lottery 0x123...')
        process.exit(1)
    }

    console.log('🧪 Testing Lottery:', lotteryAddress)
    console.log('='.repeat(70))

    const [deployer, player1, player2] = await ethers.getSigners()
    // Use deployer as fallback if other players not available
    const players = [
        player1 || deployer,
        player2 || deployer,
        deployer
    ]

    // Load ETH Adapter address
    const ETH_ADAPTER_ADDRESS = process.env.LOTTOPGF_ADAPTER_SCROLLSEPOLIA_ADDRESS
    if (!ETH_ADAPTER_ADDRESS) {
        console.error('❌ Missing LOTTOPGF_ADAPTER_SCROLLSEPOLIA_ADDRESS')
        process.exit(1)
    }

    console.log('Using ETH Adapter:', ETH_ADAPTER_ADDRESS)
    console.log('Players:')
    players.forEach((player, i) => console.log(`  ${i + 1}. ${player.address}`))

    // Contract ABIs
    const lotteryABI = [
        'function ticketPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function draw() external payable',
        'function purchasedTickets(uint256 tokenId) external view returns (tuple(uint256 gameId, uint256 pickId))',
        'function getRequestPrice() external view returns (uint256)',
        'function jackpot() external view returns (uint256)',
        'function gamePeriod() external view returns (uint256)',
        'function owner() external view returns (address)'
    ]

    const ethAdapterABI = [
        'function purchase(address payable looteryAddress, tuple(address whomst, uint8[] pick)[] calldata tickets, address beneficiary) external payable'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    // Get lottery state
    console.log('\n📊 Current Lottery State:')
    const currentGameInfo = await lottery.currentGame()
    const gameData = await lottery.gameData(currentGameInfo.id)
    const jackpot = await lottery.jackpot()
    const ticketPrice = await lottery.ticketPrice()
    const gamePeriod = await lottery.gamePeriod()
    const owner = await lottery.owner()

    console.log('- Game ID:', currentGameInfo.id.toString())
    console.log('- Game State:', currentGameInfo.state.toString())
    console.log('- Current Jackpot:', ethers.formatEther(jackpot), 'ETH')
    console.log('- Ticket Price:', ethers.formatEther(ticketPrice), 'ETH')
    console.log('- Game Period:', Number(gamePeriod) / 60, 'minutes')
    console.log('- Tickets Sold:', gameData.ticketsSold.toString())
    console.log('- Owner:', owner)

    const gameStartedAt = Number(gameData.startedAt)
    const drawScheduledAt = gameStartedAt + Number(gamePeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeToDraws = drawScheduledAt - currentTime

    console.log('- Game Started:', new Date(gameStartedAt * 1000).toLocaleString())
    console.log('- Draw Scheduled:', new Date(drawScheduledAt * 1000).toLocaleString())

    if (timeToDraws > 0) {
        console.log('- Time until draw:', Math.ceil(timeToDraws), 'seconds')
    } else {
        console.log('- ✅ Draw is available now!')
    }

    // Buy tickets if game is still active
    if (currentGameInfo.state === 1n && timeToDraws > 10) { // State 1 = ACTIVE, give 10s buffer
        console.log('\n🎟️  Buying tickets for', Math.min(3, players.length), 'players...')

        const playerTickets: Array<{playerIndex: number, ticketId: number, numbers: number[]}> = []

        for (let i = 0; i < Math.min(3, players.length); i++) {
            const player = players[i]
            const ethAdapter = new ethers.Contract(ETH_ADAPTER_ADDRESS, ethAdapterABI, player)

            // Generate unique numbers for each player
            const ticketNumbers = []
            for (let j = 0; j < 5; j++) {
                const baseOffset = i * 10 + j * 3
                ticketNumbers.push((baseOffset % 35) + 1)
            }
            const uniqueNumbers = Array.from(new Set(ticketNumbers)).sort((a, b) => a - b)
            while (uniqueNumbers.length < 5) {
                const newNum = Math.floor(Math.random() * 36) + 1
                if (!uniqueNumbers.includes(newNum)) {
                    uniqueNumbers.push(newNum)
                }
            }
            const finalNumbers = uniqueNumbers.slice(0, 5).sort((a, b) => a - b)

            console.log(`\nPlayer ${i + 1} (${player.address.slice(0, 8)}...):`)
            console.log('  Numbers:', finalNumbers.join(', '))

            const tickets = [{
                whomst: player.address,
                pick: finalNumbers.map(n => Math.max(1, Math.min(255, n)))
            }]

            try {
                const buyTx = await ethAdapter.purchase(
                    lotteryAddress,
                    tickets,
                    deployer.address, // Use deployer as beneficiary
                    { value: ticketPrice }
                )
                const receipt = await buyTx.wait()
                console.log('  ✅ Ticket purchased! Gas used:', receipt!.gasUsed.toString())

                // Store for later reference
                playerTickets.push({
                    playerIndex: i,
                    ticketId: Number(gameData.ticketsSold) + i + 1, // Estimate ticket ID
                    numbers: finalNumbers
                })

            } catch (error: any) {
                console.log('  ❌ Purchase failed:', error.message)
                if (error.data) console.log('     Error data:', error.data)
                break
            }
        }

        // Get updated game state
        const updatedGameInfo = await lottery.currentGame()
        const updatedGameData = await lottery.gameData(updatedGameInfo.id)
        console.log('\n📊 Updated State:')
        console.log('- Tickets Sold:', updatedGameData.ticketsSold.toString())
    }

    // Test drawing if time has passed
    const finalCurrentTime = Math.floor(Date.now() / 1000)
    const canDrawNow = finalCurrentTime >= drawScheduledAt

    if (canDrawNow) {
        console.log('\n🎲 Testing lottery drawing...')

        try {
            // Get VRF request price
            const requestPrice = await lottery.getRequestPrice()
            console.log('VRF request price:', ethers.formatEther(requestPrice), 'ETH')

            // Calculate deadline (current time + some buffer)
            const drawDeadline = finalCurrentTime + 300 // 5 minutes from now
            console.log('Draw deadline:', new Date(drawDeadline * 1000).toLocaleString())
            console.log('Current time:', new Date(finalCurrentTime * 1000).toLocaleString())

            console.log('\nTesting draw() call with staticCall first...')
            try {
                await lottery.draw.staticCall({
                    value: requestPrice,
                    gasLimit: 500000
                })
                console.log('✅ Static call successful - draw should work')
            } catch (staticError: any) {
                console.log('❌ Static call failed:', staticError.message)
                if (staticError.data) {
                    console.log('Static call error data:', staticError.data)
                }
            }

            console.log('\nCalling draw() function...')
            console.log('Parameters:')
            console.log('- Value sent:', ethers.formatEther(requestPrice), 'ETH')
            console.log('- Gas limit: 500,000')
            console.log('- Caller:', deployer.address)

            const drawTx = await lottery.draw({
                value: requestPrice,
                gasLimit: 500000
            })

            const drawReceipt = await drawTx.wait()
            console.log('✅ Draw transaction successful!')
            console.log('- Transaction hash:', drawTx.hash)
            console.log('- Gas used:', drawReceipt!.gasUsed.toString())
            console.log('- Block number:', drawReceipt!.blockNumber)

            // Check for events
            if (drawReceipt!.logs.length > 0) {
                console.log('- Events emitted:', drawReceipt!.logs.length)
                drawReceipt!.logs.forEach((log, i) => {
                    console.log(`  Event ${i + 1}:`, log.topics[0])
                })
            }

        } catch (error: any) {
            console.log('❌ Draw failed!')
            console.log('Error message:', error.message || 'Unknown error')

            if (error.data) {
                console.log('Error data:', error.data)
            }
            if (error.reason) {
                console.log('Error reason:', error.reason)
            }
            if (error.code) {
                console.log('Error code:', error.code)
            }

            // Try to decode the error
            if (error.data && error.data.startsWith('0x')) {
                console.log('\n🔍 Attempting to decode error...')
                const errorData = error.data
                const selector = errorData.slice(0, 10)
                const params = errorData.slice(10)

                console.log('- Selector:', selector)
                console.log('- Parameters:', params)

                if (params.length >= 64) {
                    // Try to decode as uint256
                    try {
                        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], '0x' + params.slice(0, 64))
                        console.log('- Decoded parameter (uint256):', decoded[0].toString())
                        console.log('- As timestamp:', new Date(Number(decoded[0]) * 1000).toLocaleString())
                    } catch (e) {
                        console.log('- Could not decode as uint256')
                    }
                }
            }

            // Additional debugging info
            console.log('\n🔧 Debug Info:')
            console.log('- Current timestamp:', finalCurrentTime)
            console.log('- Draw scheduled at:', drawScheduledAt)
            console.log('- Time difference:', finalCurrentTime - drawScheduledAt, 'seconds')
            console.log('- Game state:', currentGameInfo.state.toString())
        }
    } else {
        console.log('\n⏳ Cannot draw yet. Waiting', Math.ceil(timeToDraws), 'seconds...')
        console.log('Run this script again after the draw time to test drawing.')
    }

    console.log('\n✅ Testing complete!')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })