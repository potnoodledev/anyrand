import { ethers } from 'hardhat'

async function main() {
    const lotteryAddress = '0x58151e5288828b93C22D1beFA0b5997c20797b6e'

    console.log('🎲 Manual Draw Attempt')
    console.log('='.repeat(40))
    console.log('Lottery Address:', lotteryAddress)

    const [deployer] = await ethers.getSigners()
    console.log('Deployer:', deployer.address)

    const lotteryABI = [
        'function draw() external payable',
        'function getRequestPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function gamePeriod() external view returns (uint256)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    try {
        // Check current state
        const currentGameInfo = await lottery.currentGame()
        const gameData = await lottery.gameData(currentGameInfo.id)
        const requestPrice = await lottery.getRequestPrice()
        const gamePeriod = await lottery.gamePeriod()

        const currentTime = Math.floor(Date.now() / 1000)
        const drawTime = Number(gameData.startedAt) + Number(gamePeriod)

        console.log('Current game state:', currentGameInfo.state.toString())
        console.log('Current time:', currentTime)
        console.log('Draw time:', drawTime)
        console.log('Can draw?', currentTime >= drawTime)
        console.log('VRF price:', ethers.formatEther(requestPrice), 'ETH')

        if (currentTime >= drawTime && currentGameInfo.state === 1n) {
            console.log('\nAttempting draw...')

            const drawTx = await lottery.draw({
                value: requestPrice,
                gasLimit: 1000000 // Increased gas limit
            })

            const receipt = await drawTx.wait()
            console.log('✅ Draw successful!')
            console.log('- Transaction hash:', drawTx.hash)
            console.log('- Gas used:', receipt!.gasUsed.toString())
            console.log('- Block:', receipt!.blockNumber)

            // Wait a moment and check the new state
            console.log('\nWaiting 5 seconds then checking new state...')
            await new Promise(resolve => setTimeout(resolve, 5000))

            const newGameInfo = await lottery.currentGame()
            const newGameData = await lottery.gameData(newGameInfo.id)

            console.log('New game state:', newGameInfo.state.toString())
            console.log('Winning pick ID:', newGameData.winningPickId.toString())

        } else {
            console.log('❌ Cannot draw yet or game not active')
        }

    } catch (error: any) {
        console.error('❌ Draw failed:', error.message)
        if (error.data) {
            console.log('Error data:', error.data)
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })