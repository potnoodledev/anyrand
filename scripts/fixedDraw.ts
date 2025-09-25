import { ethers } from 'hardhat'

async function main() {
    const lotteryAddress = '0x58151e5288828b93C22D1beFA0b5997c20797b6e'

    console.log('🔧 Fixed Draw - Increased VRF Price')
    console.log('='.repeat(50))
    console.log('Lottery Address:', lotteryAddress)

    const [deployer] = await ethers.getSigners()
    console.log('Deployer:', deployer.address)

    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address)
    console.log('Deployer Balance:', ethers.formatEther(balance), 'ETH')

    const lotteryABI = [
        'function draw() external payable',
        'function getRequestPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function gamePeriod() external view returns (uint256)',
        'function jackpot() external view returns (uint256)',
        'function winningPick(uint256 gameId) external view returns (uint8[] memory)',
        'function picks(uint256 pickId) external view returns (uint8[] memory)',
        'function ownerOf(uint256 tokenId) external view returns (address)',
        'function purchasedTickets(uint256 tokenId) external view returns (tuple(uint256 gameId, uint256 pickId))'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    try {
        // Check current state
        const currentGameInfo = await lottery.currentGame()
        const gameData = await lottery.gameData(currentGameInfo.id)
        const baseRequestPrice = await lottery.getRequestPrice()
        const gamePeriod = await lottery.gamePeriod()
        const jackpot = await lottery.jackpot()

        const currentTime = Math.floor(Date.now() / 1000)
        const drawTime = Number(gameData.startedAt) + Number(gamePeriod)

        console.log('\n📊 Current State:')
        console.log('- Game State:', currentGameInfo.state.toString(), '(1=ACTIVE)')
        console.log('- Game ID:', currentGameInfo.id.toString())
        console.log('- Tickets Sold:', gameData.ticketsSold.toString())
        console.log('- Current Jackpot:', ethers.formatEther(jackpot), 'ETH')
        console.log('- Current Time:', currentTime)
        console.log('- Draw Time:', drawTime)
        console.log('- Can Draw?', currentTime >= drawTime ? '✅ Yes' : '❌ No')
        console.log('- Base VRF Price:', ethers.formatEther(baseRequestPrice), 'ETH')

        if (currentTime >= drawTime && currentGameInfo.state === 1n) {
            // Try multiple VRF price multipliers
            const multipliers = [5, 10, 20, 50]

            for (const multiplier of multipliers) {
                const increasedPrice = baseRequestPrice * BigInt(multiplier)

                console.log(`\n🎲 Attempting draw with ${multiplier}x VRF price...`)
                console.log('- VRF Price:', ethers.formatEther(increasedPrice), 'ETH')

                try {
                    // First try static call
                    await lottery.draw.staticCall({
                        value: increasedPrice,
                        gasLimit: 2000000
                    })

                    console.log('✅ Static call successful, proceeding with actual draw...')

                    const drawTx = await lottery.draw({
                        value: increasedPrice,
                        gasLimit: 2000000, // Higher gas limit
                        gasPrice: ethers.parseUnits('50', 'gwei') // Higher gas price
                    })

                    console.log('⏳ Transaction sent:', drawTx.hash)
                    console.log('⏳ Waiting for confirmation...')

                    const receipt = await drawTx.wait()
                    console.log('✅ Draw successful!')
                    console.log('- Gas used:', receipt!.gasUsed.toString())
                    console.log('- Block:', receipt!.blockNumber)
                    console.log('- Transaction hash:', drawTx.hash)

                    // Wait and check the results
                    console.log('\n⏳ Waiting 10 seconds for VRF callback...')
                    await new Promise(resolve => setTimeout(resolve, 10000))

                    const newGameInfo = await lottery.currentGame()
                    const newGameData = await lottery.gameData(newGameInfo.id)

                    console.log('\n🏆 Final Results:')
                    console.log('- New Game State:', newGameInfo.state.toString(), '(3=DRAWN)')
                    console.log('- Winning Pick ID:', newGameData.winningPickId.toString())

                    if (newGameData.winningPickId > 0) {
                        try {
                            const winningNumbers = await lottery.winningPick(currentGameInfo.id)
                            console.log('- Winning Numbers:', winningNumbers.map(n => n.toString()).join(', '))

                            // Check each ticket to see if there's a winner
                            console.log('\n🎟️  Checking tickets for winners:')
                            for (let ticketId = 1; ticketId <= Number(gameData.ticketsSold); ticketId++) {
                                try {
                                    const owner = await lottery.ownerOf(ticketId)
                                    const ticketInfo = await lottery.purchasedTickets(ticketId)
                                    const ticketNumbers = await lottery.picks(ticketInfo.pickId)

                                    const ticketNumbersStr = ticketNumbers.map(n => n.toString()).join(', ')
                                    const winningNumbersStr = winningNumbers.map(n => n.toString()).join(', ')

                                    const isWinner = ticketNumbersStr === winningNumbersStr

                                    console.log(`  Ticket ${ticketId}:`)
                                    console.log(`    Owner: ${owner.slice(0, 8)}...${owner.slice(-6)}`)
                                    console.log(`    Numbers: ${ticketNumbersStr}`)
                                    console.log(`    ${isWinner ? '🏆 WINNER!' : '❌ No match'}`)
                                } catch (e) {
                                    console.log(`  Ticket ${ticketId}: Error reading ticket`)
                                }
                            }
                        } catch (e) {
                            console.log('- Could not retrieve winning numbers')
                        }
                    }

                    return; // Success, exit the loop

                } catch (staticError: any) {
                    console.log('❌ Static call failed:', staticError.message)
                    if (staticError.reason) {
                        console.log('- Reason:', staticError.reason)
                    }
                    continue; // Try next multiplier
                }

            }

            console.log('❌ All draw attempts failed with different VRF prices')

        } else {
            if (currentGameInfo.state !== 1n) {
                console.log('❌ Game is not in ACTIVE state')
            } else {
                console.log(`❌ Cannot draw yet. Need to wait ${drawTime - currentTime} more seconds`)
            }
        }

    } catch (error: any) {
        console.error('❌ Script error:', error.message)
        if (error.data) {
            console.log('Error data:', error.data)
        }
    }

    console.log('\n✅ Script complete!')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Fatal error:', error)
        process.exit(1)
    })