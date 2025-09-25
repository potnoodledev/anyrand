import { ethers } from 'hardhat'

async function main() {
    const lotteryAddress = '0x58151e5288828b93C22D1beFA0b5997c20797b6e'

    console.log('🎯 Precise Gas Draw Attempt')
    console.log('='.repeat(40))

    const [deployer] = await ethers.getSigners()

    const lotteryABI = [
        'function draw() external payable',
        'function getRequestPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function winningPick(uint256 gameId) external view returns (uint8[] memory)',
        'function picks(uint256 pickId) external view returns (uint8[] memory)',
        'function ownerOf(uint256 tokenId) external view returns (address)',
        'function purchasedTickets(uint256 tokenId) external view returns (tuple(uint256 gameId, uint256 pickId))'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    try {
        const currentGameInfo = await lottery.currentGame()
        const requestPrice = await lottery.getRequestPrice()

        console.log('Game state:', currentGameInfo.state.toString())
        console.log('Request price:', ethers.formatEther(requestPrice), 'ETH')

        // Use the exact gas estimate from previous run
        const gasEstimate = 199819n
        const gasLimit = gasEstimate + 50000n // Add buffer

        console.log('Using gas limit:', gasLimit.toString())

        // Try with different VRF price multipliers and use precise gas
        const multipliers = [1, 2, 5]

        for (const multiplier of multipliers) {
            const vrfPrice = requestPrice * BigInt(multiplier)

            console.log(`\n🎲 Attempting draw (${multiplier}x VRF price: ${ethers.formatEther(vrfPrice)} ETH)...`)

            try {
                // Use a more conservative gas price
                const drawTx = await lottery.draw({
                    value: vrfPrice,
                    gasLimit: gasLimit,
                    gasPrice: ethers.parseUnits('20', 'gwei') // Lower gas price
                })

                console.log('✅ Transaction sent:', drawTx.hash)

                const receipt = await drawTx.wait()
                console.log('✅ Draw successful!')
                console.log('- Block:', receipt!.blockNumber)
                console.log('- Gas used:', receipt!.gasUsed.toString())
                console.log('- Status:', receipt!.status)

                // Wait longer for VRF callback
                console.log('\n⏳ Waiting 30 seconds for VRF callback...')
                await new Promise(resolve => setTimeout(resolve, 30000))

                // Check results
                const newGameInfo = await lottery.currentGame()
                const newGameData = await lottery.gameData(newGameInfo.id)

                console.log('\n🏆 Results after callback:')
                console.log('- Game State:', newGameInfo.state.toString())
                console.log('- Game ID:', newGameInfo.id.toString())
                console.log('- Winning Pick ID:', newGameData.winningPickId.toString())

                if (newGameData.winningPickId > 0) {
                    // We have a winner!
                    const winningNumbers = await lottery.winningPick(currentGameInfo.id)
                    console.log('- 🎯 Winning Numbers:', winningNumbers.map(n => n.toString()).join(', '))

                    // Check all tickets
                    const gameData = await lottery.gameData(currentGameInfo.id)
                    console.log('\n🎟️  All Tickets vs Winning Numbers:')

                    for (let ticketId = 1; ticketId <= Number(gameData.ticketsSold); ticketId++) {
                        try {
                            const owner = await lottery.ownerOf(ticketId)
                            const ticketInfo = await lottery.purchasedTickets(ticketId)
                            const ticketNumbers = await lottery.picks(ticketInfo.pickId)

                            const ticketNumStr = ticketNumbers.map(n => n.toString()).sort().join(', ')
                            const winningNumStr = winningNumbers.map(n => n.toString()).sort().join(', ')

                            const isMatch = ticketNumStr === winningNumStr

                            console.log(`  🎫 Ticket ${ticketId}:`)
                            console.log(`     Owner: ${owner.slice(0, 8)}...${owner.slice(-6)}`)
                            console.log(`     Numbers: ${ticketNumStr}`)
                            console.log(`     Result: ${isMatch ? '🏆🎉 WINNER! 🎉🏆' : '❌ No match'}`)
                        } catch (e) {
                            console.log(`  🎫 Ticket ${ticketId}: Could not read`)
                        }
                    }

                    return // Success!
                } else {
                    console.log('❓ VRF callback may still be pending...')

                    // Wait a bit more
                    console.log('⏳ Waiting additional 30 seconds...')
                    await new Promise(resolve => setTimeout(resolve, 30000))

                    const finalGameInfo = await lottery.currentGame()
                    const finalGameData = await lottery.gameData(finalGameInfo.id)

                    console.log('\n🔄 Final check:')
                    console.log('- Game State:', finalGameInfo.state.toString())
                    console.log('- Winning Pick ID:', finalGameData.winningPickId.toString())

                    if (finalGameData.winningPickId > 0) {
                        const winningNumbers = await lottery.winningPick(currentGameInfo.id)
                        console.log('- 🎯 Winning Numbers:', winningNumbers.map(n => n.toString()).join(', '))

                        // Show final results...
                        const gameData = await lottery.gameData(currentGameInfo.id)
                        console.log('\n🏆 FINAL RESULTS:')

                        for (let ticketId = 1; ticketId <= Number(gameData.ticketsSold); ticketId++) {
                            const owner = await lottery.ownerOf(ticketId)
                            const ticketInfo = await lottery.purchasedTickets(ticketId)
                            const ticketNumbers = await lottery.picks(ticketInfo.pickId)

                            const ticketNumStr = ticketNumbers.map(n => n.toString()).sort().join(', ')
                            const winningNumStr = winningNumbers.map(n => n.toString()).sort().join(', ')

                            const isMatch = ticketNumStr === winningNumStr

                            console.log(`🎫 Ticket ${ticketId}: ${ticketNumStr} -> ${isMatch ? '🏆 WINNER!' : '❌ Lost'}`)
                        }

                        return // Success!
                    }
                }

                break; // Success, exit the multiplier loop

            } catch (error: any) {
                console.log('❌ Draw failed:', error.message)
                if (error.reason) console.log('- Reason:', error.reason)
                continue; // Try next multiplier
            }
        }

        console.log('❌ All attempts failed')

    } catch (error: any) {
        console.error('❌ Script error:', error.message)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Fatal error:', error)
        process.exit(1)
    })