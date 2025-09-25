import { ethers } from 'hardhat'
import * as bn254 from '@noble/curves/bn254'
import { getDrandBeaconRound } from '../lib/drand'

async function main() {
    const lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS
    if (!lotteryAddress) {
        console.error('❌ Please provide lottery address')
        process.exit(1)
    }

    console.log('🔄 Force Redraw and Fulfill for:', lotteryAddress)
    const [deployer] = await ethers.getSigners()

    // Lottery ABI
    const lotteryABI = [
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function forceRedraw() external payable',
        'function getRequestPrice() external view returns (uint256)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    // Check current state
    const gameInfo = await lottery.currentGame()
    console.log('Current state:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][gameInfo.state])

    if (gameInfo.state !== 2n) {
        console.log('❌ Game is not in DrawPending state')
        process.exit(1)
    }

    // Get VRF price
    const requestPrice = await lottery.getRequestPrice()
    console.log('VRF request price:', ethers.formatEther(requestPrice), 'ETH')

    // Force redraw with 2x the price for safety
    console.log('\n📝 Forcing redraw...')
    try {
        // First try to estimate gas to check if the function exists and can be called
        await lottery.forceRedraw.estimateGas({
            value: requestPrice * 2n
        })
    } catch (error: any) {
        console.log('❌ Cannot call forceRedraw:', error.message)
        console.log('The request might be too recent (< 1 hour old)')
        process.exit(1)
    }

    const forceRedrawTx = await lottery.forceRedraw({
        value: requestPrice * 2n,
        gasLimit: 1000000
    })

    console.log('Transaction:', forceRedrawTx.hash)
    const receipt = await forceRedrawTx.wait()
    console.log('✅ Force redraw successful at block:', receipt!.blockNumber)

    // Set Anyrand address
    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS || '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC'

    // Get the RandomnessRequested event from the receipt
    const randomnessRequestedTopic = ethers.id('RandomnessRequested(uint208)')
    let requestEvent = receipt!.logs.find(log => log.topics[0] === randomnessRequestedTopic)

    let requestId: bigint
    if (requestEvent && requestEvent.topics[1]) {
        requestId = BigInt(requestEvent.topics[1])
    } else {
        // Try to find it in the Anyrand logs
        const anyrandRequestedTopic = ethers.id('RandomnessRequested(uint256,address,uint256,bytes32,uint256)')
        const anyrandEvent = receipt!.logs.find(log =>
            log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase() &&
            log.topics[0] === anyrandRequestedTopic
        )

        if (anyrandEvent && anyrandEvent.topics[1]) {
            requestId = BigInt(anyrandEvent.topics[1])
        } else {
            console.log('❌ No RandomnessRequested event found in transaction')
            console.log('Receipt logs:', receipt!.logs)
            process.exit(1)
        }
    }
    console.log('New request ID:', requestId.toString())

    // Now fulfill the request
    console.log('\n🎲 Fulfilling VRF request...')

    const anyrandABI = [
        'function fulfillRandomness(uint256 requestId, address requester, bytes32 pubKeyHash, uint256 round, uint256 callbackGasLimit, uint256[2] signature) external',
        'function beacon() external view returns (address)',
        'event RandomnessRequested(uint256 indexed requestId, address indexed requester, uint256 round, bytes32 indexed pubKeyHash, uint256 callbackGasLimit)'
    ]

    const anyrand = new ethers.Contract(ANYRAND_ADDRESS, anyrandABI, deployer)

    // Get the Anyrand event for details
    const anyrandRequestedTopic = ethers.id('RandomnessRequested(uint256,address,uint256,bytes32,uint256)')
    const anyrandEvent = receipt!.logs.find(log =>
        log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase() &&
        log.topics[0] === anyrandRequestedTopic
    )

    if (!anyrandEvent) {
        console.log('❌ Anyrand event not found')
        process.exit(1)
    }

    const parsedLog = anyrand.interface.parseLog(anyrandEvent)
    if (!parsedLog) {
        console.log('❌ Failed to parse Anyrand event')
        process.exit(1)
    }

    const round = parsedLog.args[2]
    const pubKeyHash = parsedLog.args[3]
    const callbackGasLimit = parsedLog.args[4]

    console.log('Request details:')
    console.log('- Round:', round.toString())
    console.log('- PubKeyHash:', pubKeyHash)
    console.log('- Callback gas limit:', callbackGasLimit.toString())

    // Get beacon timing
    const beaconABI = ['function genesisTimestamp() external view returns (uint256)', 'function period() external view returns (uint256)']
    const beaconAddress = await anyrand.beacon()
    const beacon = new ethers.Contract(beaconAddress, beaconABI, deployer)

    const beaconGenesis = await beacon.genesisTimestamp()
    const beaconPeriod = await beacon.period()

    const roundTimestamp = Number(beaconGenesis) + (Number(round) - 1) * Number(beaconPeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const waitTime = Math.max(0, roundTimestamp - currentTime)

    if (waitTime > 0) {
        console.log(`⏳ Waiting ${waitTime} seconds for round...`)
        if (waitTime <= 60) {
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
        } else {
            console.log('Round won\'t be available for a while. Please run again later.')
            process.exit(0)
        }
    }

    // Fetch signature from drand
    console.log('\n📡 Fetching signature from drand...')
    const drandRound = await getDrandBeaconRound('evmnet', Number(round))
    const sigPoint = bn254.G1.ProjectivePoint.fromHex(drandRound.signature).toAffine()
    const signature: [bigint, bigint] = [sigPoint.x, sigPoint.y]

    console.log('✅ Signature fetched')

    // Fulfill the request
    console.log('\n🚀 Submitting fulfillment...')
    const fulfillTx = await anyrand.fulfillRandomness(
        requestId,
        lotteryAddress,
        pubKeyHash,
        round,
        callbackGasLimit,
        signature
    )

    console.log('Transaction:', fulfillTx.hash)
    const fulfillReceipt = await fulfillTx.wait()
    console.log('✅ Fulfillment confirmed!')

    // Check lottery state
    const newGameInfo = await lottery.currentGame()
    console.log('\n📊 Final lottery state:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][newGameInfo.state])

    if (newGameInfo.state === 1n) {
        console.log('✅ Lottery draw completed! A new game has started.')
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error)
        process.exit(1)
    })