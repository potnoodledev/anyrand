import { ethers } from 'hardhat'
import { Anyrand__factory, AnyrandConsumer__factory } from '../typechain-types'
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
    const [deployer] = await ethers.getSigners()

    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS || '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC'
    const CONSUMER_ADDRESS = process.env.CONSUMER_SCROLL_SEPOLIA_ADDRESS // Optional existing consumer

    console.log('🔍 Testing Anyrand Integration like Quickstart')
    console.log('==========================================')
    console.log('Caller:', deployer.address)
    console.log('Anyrand:', ANYRAND_ADDRESS)

    // Step 1: Test Anyrand connectivity (like quickstart)
    console.log('\n1. Testing Anyrand connectivity...')
    let anyrand: any
    try {
        anyrand = Anyrand__factory.connect(ANYRAND_ADDRESS, deployer)
        const version = await anyrand.typeAndVersion()
        console.log('✅ Anyrand connected:', version)
    } catch (error: any) {
        console.log('❌ Failed to connect to Anyrand:', error.message)
        return
    }

    // Step 2: Deploy or use existing consumer (like quickstart)
    console.log('\n2. Setting up consumer contract...')
    let consumer: any
    let consumerAddress: string

    if (CONSUMER_ADDRESS) {
        console.log('Using existing consumer:', CONSUMER_ADDRESS)
        consumer = AnyrandConsumer__factory.connect(CONSUMER_ADDRESS, deployer)
        consumerAddress = CONSUMER_ADDRESS

        // Verify existing consumer
        try {
            const anyrandFromConsumer = await consumer.anyrand()
            console.log('✅ Consumer verified, points to:', anyrandFromConsumer)
        } catch (error: any) {
            console.log('❌ Consumer verification failed:', error.message)
            return
        }
    } else {
        console.log('Deploying new consumer...')
        const consumerFactory = new AnyrandConsumer__factory(deployer)
        consumer = await consumerFactory.deploy(ANYRAND_ADDRESS)
        await consumer.waitForDeployment()
        consumerAddress = await consumer.getAddress()
        console.log('✅ Consumer deployed at:', consumerAddress)
    }

    // Step 3: Test request price (like quickstart)
    console.log('\n3. Testing request pricing...')
    const callbackGasLimit = 500000
    const deadline = Math.floor(Date.now() / 1000) + 30 // 30 seconds from now

    try {
        const [requestPrice, effectiveFeePerGas] = await anyrand.getRequestPrice(callbackGasLimit)
        console.log('✅ Request Price:', ethers.formatEther(requestPrice), 'ETH')
        console.log('✅ Effective Fee Per Gas:', effectiveFeePerGas.toString())

        // Add buffer like quickstart
        const bufferAmount = requestPrice + ethers.parseEther('0.001')
        console.log('✅ Buffered amount:', ethers.formatEther(bufferAmount), 'ETH (includes 0.001 ETH buffer)')

        // Step 4: Test actual request (like quickstart)
        console.log('\n4. Testing actual randomness request...')

        const balance = await ethers.provider.getBalance(deployer.address)
        if (balance < bufferAmount) {
            console.log('❌ Insufficient balance for request')
            console.log(`Need: ${ethers.formatEther(bufferAmount)} ETH, Have: ${ethers.formatEther(balance)} ETH`)
            return
        }

        // This is the key difference - use consumer.getRandom() not anyrand.requestRandomness()
        const requestTx = await consumer.getRandom(deadline, callbackGasLimit, {
            value: bufferAmount,
            gasLimit: 500000
        })

        console.log('✅ Request transaction submitted:', requestTx.hash)
        const receipt = await requestTx.wait(1)
        console.log('✅ Request confirmed in block:', receipt!.blockNumber)

        // Parse the event
        if (receipt!.logs.length > 0) {
            console.log('✅ Events emitted:', receipt!.logs.length)
            try {
                const requestLog = receipt!.logs.find(log =>
                    log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()
                )
                if (requestLog) {
                    const requestEvent = anyrand.interface.parseLog(requestLog)
                    if (requestEvent) {
                        console.log('✅ RandomnessRequested event parsed:')
                        console.log('- Request ID:', requestEvent.args.requestId.toString())
                        console.log('- Round:', requestEvent.args.round.toString())
                        console.log('- Pub Key Hash:', requestEvent.args.pubKeyHash)
                    }
                }
            } catch (parseError) {
                console.log('⚠️ Could not parse event details')
            }
        }

        console.log('\n✅ Full flow test successful!')
        console.log('The Anyrand integration is working correctly.')

    } catch (error: any) {
        console.log('❌ Request failed:', error.message)
        console.log('Full error:', error)

        // Additional debugging
        if (error.data) {
            console.log('Error data:', error.data)
        }
        if (error.reason) {
            console.log('Error reason:', error.reason)
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error)
        process.exit(1)
    })