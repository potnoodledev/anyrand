import { ethers } from 'hardhat'

async function main() {
    const lotteryAddress = '0x58151e5288828b93C22D1beFA0b5997c20797b6e'

    console.log('🔍 Checking Final Lottery Results')
    console.log('='.repeat(50))
    console.log('Lottery Address:', lotteryAddress)

    const [deployer] = await ethers.getSigners()

    // Extended ABI for more detailed information
    const lotteryABI = [
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function jackpot() external view returns (uint256)',
        'function ticketPrice() external view returns (uint256)',
        'function gamePeriod() external view returns (uint256)',
        'function owner() external view returns (address)',
        'function picks(uint256 pickId) external view returns (uint8[] memory)',
        'function winningPick(uint256 gameId) external view returns (uint8[] memory)',
        'function totalSupply() external view returns (uint256)',
        'function tokenURI(uint256 tokenId) external view returns (string memory)',
        'function ownerOf(uint256 tokenId) external view returns (address)',
        'function purchasedTickets(uint256 tokenId) external view returns (tuple(uint256 gameId, uint256 pickId))'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    try {
        // Get current game info
        const currentGameInfo = await lottery.currentGame()
        const gameData = await lottery.gameData(currentGameInfo.id)
        const jackpot = await lottery.jackpot()
        const ticketPrice = await lottery.ticketPrice()

        console.log('\n📊 Final Game State:')
        console.log('- Game ID:', currentGameInfo.id.toString())
        console.log('- Game State:', currentGameInfo.state.toString(), '(0=INACTIVE, 1=ACTIVE, 2=DRAWING, 3=DRAWN)')
        console.log('- Tickets Sold:', gameData.ticketsSold.toString())
        console.log('- Jackpot:', ethers.formatEther(jackpot), 'ETH')
        console.log('- Ticket Price:', ethers.formatEther(ticketPrice), 'ETH')

        // Get total supply of tickets (NFTs)
        try {
            const totalSupply = await lottery.totalSupply()
            console.log('- Total Ticket NFTs:', totalSupply.toString())
        } catch (e) {
            console.log('- Total Ticket NFTs: Unable to retrieve')
        }

        // Check if there's a winning pick
        if (gameData.winningPickId > 0) {
            console.log('- Winning Pick ID:', gameData.winningPickId.toString())

            try {
                const winningNumbers = await lottery.winningPick(currentGameInfo.id)
                console.log('- Winning Numbers:', winningNumbers.map(n => n.toString()).join(', '))
            } catch (e) {
                console.log('- Winning Numbers: Unable to retrieve')
            }
        } else {
            console.log('- Winning Pick: Not yet determined')
        }

        // Show all player tickets
        if (gameData.ticketsSold > 0) {
            console.log('\n🎟️  Player Tickets:')
            for (let i = 1; i <= Number(gameData.ticketsSold); i++) {
                try {
                    const ticketOwner = await lottery.ownerOf(i)
                    const ticketInfo = await lottery.purchasedTickets(i)
                    const pickNumbers = await lottery.picks(ticketInfo.pickId)

                    console.log(`  Ticket ${i}:`)
                    console.log(`    Owner: ${ticketOwner.slice(0, 8)}...`)
                    console.log(`    Numbers: ${pickNumbers.map(n => n.toString()).join(', ')}`)
                    console.log(`    Pick ID: ${ticketInfo.pickId.toString()}`)
                } catch (e) {
                    console.log(`  Ticket ${i}: Unable to retrieve details`)
                }
            }
        }

        // Game timing info
        const gameStartedAt = Number(gameData.startedAt)
        const gamePeriod = await lottery.gamePeriod()
        const drawScheduledAt = gameStartedAt + Number(gamePeriod)
        const currentTime = Math.floor(Date.now() / 1000)

        console.log('\n⏰ Timing Info:')
        console.log('- Game Started:', new Date(gameStartedAt * 1000).toLocaleString())
        console.log('- Draw Scheduled:', new Date(drawScheduledAt * 1000).toLocaleString())
        console.log('- Current Time:', new Date(currentTime * 1000).toLocaleString())
        console.log('- Time Past Draw:', Math.max(0, currentTime - drawScheduledAt), 'seconds')

    } catch (error: any) {
        console.error('❌ Error retrieving lottery data:', error.message)
    }

    console.log('\n✅ Lottery check complete!')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })