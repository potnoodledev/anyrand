import { ethers } from 'hardhat'
import { LooteryFactory__factory } from '../typechain-types'
import { getDynamicConfig } from './lottopgf/config'

async function main() {
    console.log('🎲 Creating Test Lottery')
    console.log('='.repeat(50))

    const [deployer] = await ethers.getSigners()
    console.log('Deployer:', deployer.address)

    // Load addresses from env
    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS
    const FACTORY_ADDRESS = process.env.LOTTOPGF_FACTORY_SCROLLSEPOLIA_ADDRESS

    if (!ANYRAND_ADDRESS || !FACTORY_ADDRESS) {
        console.error('❌ Missing required environment variables')
        console.error('Required: ANYRAND_SCROLL_SEPOLIA_ADDRESS, LOTTOPGF_FACTORY_SCROLLSEPOLIA_ADDRESS')
        process.exit(1)
    }

    console.log('Using addresses:')
    console.log('- Anyrand:', ANYRAND_ADDRESS)
    console.log('- Factory:', FACTORY_ADDRESS)

    // Connect to factory
    const factory = LooteryFactory__factory.connect(FACTORY_ADDRESS, deployer)

    // Get network configuration
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
    const config = getDynamicConfig(chainId.toString(), ANYRAND_ADDRESS as `0x${string}`)

    // Get WETH address from ETH Adapter if localhost
    let wethAddress = config.weth
    if (chainId === 31337n) {
        const adapterABI = ['function wrappedToken() external view returns (address)']
        const adapterAddress = process.env.LOTTOPGF_ADAPTER_SCROLLSEPOLIA_ADDRESS
        if (adapterAddress) {
            const adapterContract = new ethers.Contract(adapterAddress, adapterABI, deployer)
            wethAddress = await adapterContract.wrappedToken()
            console.log('✅ Using WETH address from ETH Adapter:', wethAddress)
        }
    }

    // Create lottery configuration
    const name = 'Test Lottery'
    const symbol = 'TEST'
    const pickLength = 5 // Pick 5 numbers
    const maxBallValue = 36 // From 1 to 36
    const gamePeriod = 120 // 2 minutes
    const ticketPrice = 1n // 1 wei per ticket (minimal cost)
    const communityFeeBps = 5000 // 50% to community
    const prizeToken = wethAddress
    const seedJackpotDelay = 1 // 1 second delay (minimum)
    const seedJackpotMinValue = 1 // 1 wei minimum

    console.log('\nLottery Configuration:')
    console.log('- Name:', name)
    console.log('- Symbol:', symbol)
    console.log('- Pick Length:', pickLength)
    console.log('- Max Ball Value:', maxBallValue)
    console.log('- Game Period:', gamePeriod / 60, 'minutes')
    console.log('- Ticket Price:', ethers.formatEther(ticketPrice), 'ETH')
    console.log('- Community Fee:', communityFeeBps / 100, '%')
    console.log('- Prize Token (WETH):', prizeToken)

    console.log('\nCreating lottery...')
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
    console.log('✅ Transaction confirmed in block:', createReceipt!.blockNumber)

    // Find the lottery creation event
    const createEvent = createReceipt!.logs.find((log: any) => {
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
    const lotteryAddress = parsedEvent!.args[0] as string

    console.log('✅ Lottery created at:', lotteryAddress)

    // Register deployer as beneficiary
    const lotteryABI = [
        'function setBeneficiary(address beneficiary, string calldata displayName, bool isBeneficiary) external returns (bool)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function jackpot() external view returns (uint256)',
        'function gamePeriod() external view returns (uint256)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    console.log('\nRegistering deployer as beneficiary...')
    try {
        const setBeneficiaryTx = await lottery.setBeneficiary(
            deployer.address,
            'Test Beneficiary',
            true
        )
        await setBeneficiaryTx.wait()
        console.log('✅ Deployer registered as beneficiary')
    } catch (error: any) {
        console.log('⚠️  Beneficiary registration failed:', error.message)
    }

    // Get lottery details
    const currentGameInfo = await lottery.currentGame()
    const gameData = await lottery.gameData(currentGameInfo.id)
    const jackpot = await lottery.jackpot()
    const contractGamePeriod = await lottery.gamePeriod()

    console.log('\n📊 Lottery Details:')
    console.log('- Address:', lotteryAddress)
    console.log('- Game ID:', currentGameInfo.id.toString())
    console.log('- Game State:', currentGameInfo.state.toString())
    console.log('- Current Jackpot:', ethers.formatEther(jackpot), 'ETH')
    console.log('- Game Started At:', new Date(Number(gameData.startedAt) * 1000).toLocaleString())
    console.log('- Game Period:', Number(contractGamePeriod) / 60, 'minutes')
    console.log('- Tickets Sold:', gameData.ticketsSold.toString())

    const drawScheduledAt = Number(gameData.startedAt) + Number(contractGamePeriod)
    console.log('- Draw Scheduled At:', new Date(drawScheduledAt * 1000).toLocaleString())

    const currentTime = Math.floor(Date.now() / 1000)
    const timeToDraws = drawScheduledAt - currentTime
    if (timeToDraws > 0) {
        console.log('- Time until draw:', Math.ceil(timeToDraws), 'seconds')
    } else {
        console.log('- ✅ Draw is available now!')
    }

    console.log('\n🎯 Lottery ready for testing!')
    console.log('Next steps:')
    console.log('1. Run: ./test-lottery.sh', lotteryAddress)
    console.log('2. Or set env: TEST_LOTTERY_ADDRESS=' + lotteryAddress + ' && yarn test-lottery')
    console.log('')
    console.log('📝 Note: Game ID 0 is correct for the first game in a new lottery contract')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })