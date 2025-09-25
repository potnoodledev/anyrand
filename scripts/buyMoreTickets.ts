import { ethers } from 'hardhat'

async function main() {
    const lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS
    if (!lotteryAddress) {
        console.error('❌ Please provide lottery address')
        process.exit(1)
    }

    console.log('🎫 Buying more lottery tickets for:', lotteryAddress)
    const [deployer] = await ethers.getSigners()

    // Lottery ABI
    const lotteryABI = [
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function ticketPrice() external view returns (uint256)',
        'function purchaseTickets(uint256 amount) external payable'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    // Check current state
    const gameInfo = await lottery.currentGame()
    const gameData = await lottery.gameData(gameInfo.id)
    const ticketPrice = await lottery.ticketPrice()

    console.log('Current state:')
    console.log('- Game state:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][gameInfo.state])
    console.log('- Tickets sold:', gameData.ticketsSold.toString())
    console.log('- Ticket price:', ethers.formatEther(ticketPrice), 'ETH')

    if (gameInfo.state !== 1n) {
        console.log('❌ Game is not in Purchase state')
        process.exit(1)
    }

    // Buy 7 more tickets to get to 10 total
    const ticketsToBuy = 7
    const totalCost = ticketPrice * BigInt(ticketsToBuy)

    console.log(`\n🛒 Buying ${ticketsToBuy} tickets...`)
    console.log('- Total cost:', ethers.formatEther(totalCost), 'ETH')

    try {
        const tx = await lottery.purchaseTickets(ticketsToBuy, {
            value: totalCost,
            gasLimit: 500000
        })

        console.log('Transaction:', tx.hash)
        const receipt = await tx.wait()
        console.log('✅ Tickets purchased successfully!')

        // Check new ticket count
        const newGameData = await lottery.gameData(gameInfo.id)
        console.log('- New total tickets:', newGameData.ticketsSold.toString())

    } catch (error: any) {
        console.log('❌ Failed to buy tickets:', error.message)
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error)
        process.exit(1)
    })