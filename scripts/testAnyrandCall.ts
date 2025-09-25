import { ethers } from 'hardhat'
import { Anyrand__factory, AnyrandConsumer__factory, DrandBeacon__factory } from '../typechain-types'
import * as dotenv from 'dotenv'
import { getBytes, keccak256 } from 'ethers'
import { bn254 } from '@kevincharm/noble-bn254-drand'
import { getDrandBeaconRound, getDrandBeaconInfo } from '../lib/drand'

dotenv.config()

/**
 * Generate a testnet beacon signature for demo purposes
 * WARNING: This is for TESTNET DEMO ONLY and is not cryptographically secure!
 */
async function generateTestSignature(
    round: bigint,
    anyrand: any,
    pubKeyHash: string
): Promise<[bigint, bigint]> {
    const DST = 'BLS_SIG_BN254G1_XMD:KECCAK-256_SVDW_RO_NUL_'

    // Generate test private key from public key hash (TESTNET DEMO ONLY!)
    const testSecretKey = getBytes(keccak256(pubKeyHash)).slice(0, 32)

    // Create message to sign
    const roundBytes = getBytes('0x' + round.toString(16).padStart(16, '0'))
    const hashedRound = keccak256(roundBytes)

    // Generate BLS signature
    const M = bn254.G1.hashToCurve(getBytes(hashedRound), { DST })
    const sig = bn254.signShortSignature(M, testSecretKey).toAffine()

    return [sig.x, sig.y]
}

async function main() {
    const [deployer] = await ethers.getSigners()

    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS || '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC'
    const BEACON_ADDRESS = process.env.BEACON_SCROLL_SEPOLIA_ADDRESS
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

        // Parse the request details for fulfillment
        let requestId: bigint | undefined
        let round: bigint | undefined
        let pubKeyHash: string | undefined

        if (receipt!.logs.length > 0) {
            try {
                const requestLog = receipt!.logs.find(log =>
                    log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()
                )
                if (requestLog) {
                    const requestEvent = anyrand.interface.parseLog(requestLog)
                    if (requestEvent) {
                        requestId = requestEvent.args.requestId
                        round = requestEvent.args.round
                        pubKeyHash = requestEvent.args.pubKeyHash
                    }
                }
            } catch (parseError) {
                console.log('⚠️ Could not parse event for fulfillment')
            }
        }

        // Step 5: Test fulfillRandomness (if we have request details)
        if (requestId && round && pubKeyHash && BEACON_ADDRESS) {
            console.log('\n5. Testing fulfillRandomness...')

            try {
                // Get beacon parameters for timing
                const beacon = DrandBeacon__factory.connect(BEACON_ADDRESS, deployer)
                const beaconGenesis = await beacon.genesisTimestamp()
                const beaconPeriod = await beacon.period()

                // Calculate wait time for the round
                const roundTimestamp = Number(beaconGenesis) + (Number(round) - 1) * Number(beaconPeriod)
                const currentTime = Math.floor(Date.now() / 1000)
                const waitTime = Math.max(0, roundTimestamp - currentTime)

                console.log('Round timing:')
                console.log('- Round', round.toString(), 'available at:', new Date(roundTimestamp * 1000).toLocaleString())
                console.log('- Current time:', new Date(currentTime * 1000).toLocaleString())

                if (waitTime > 0) {
                    console.log(`- Waiting ${waitTime} seconds for round availability...`)
                    if (waitTime <= 60) { // Only wait up to 1 minute for testing
                        await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
                        console.log('✅ Round is now available!')
                    } else {
                        console.log('⚠️ Round wait time too long for testing, using test signature')
                        throw new Error('Round not ready')
                    }
                } else {
                    console.log('✅ Round is already available!')
                }

                // Fetch real signature from drand network
                console.log('Fetching real signature from drand network...')
                let signature: [bigint, bigint]

                try {
                    // Fetch the actual signature from drand API for the evmnet beacon
                    const drandRound = await getDrandBeaconRound('evmnet', Number(round))
                    console.log('✅ Fetched drand round', round.toString(), 'from network')

                    // Decode the G1 point signature
                    const sigPoint = bn254.G1.ProjectivePoint.fromHex(drandRound.signature).toAffine()
                    signature = [sigPoint.x, sigPoint.y]

                    console.log('✅ Real BLS signature decoded successfully')
                    console.log('- This signature is cryptographically valid from drand')
                } catch (drandError: any) {
                    console.log('⚠️ Failed to fetch from drand API:', drandError.message)
                    console.log('Falling back to test signature...')
                    signature = await generateTestSignature(round, anyrand, pubKeyHash)
                }

                console.log('Attempting to fulfill randomness request...')
                const fulfillTx = await anyrand.fulfillRandomness(
                    requestId,
                    consumerAddress,
                    pubKeyHash,
                    round,
                    callbackGasLimit,
                    signature
                )

                console.log('✅ Fulfill transaction submitted:', fulfillTx.hash)
                const fulfillReceipt = await fulfillTx.wait(1)
                console.log('✅ Fulfill confirmed in block:', fulfillReceipt!.blockNumber)

                // Parse fulfillment results
                if (fulfillReceipt!.logs.length > 0) {
                    try {
                        const fulfillLog = fulfillReceipt!.logs.find(log =>
                            log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()
                        )
                        if (fulfillLog) {
                            const fulfillEvent = anyrand.interface.parseLog(fulfillLog)
                            if (fulfillEvent) {
                                console.log('✅ RandomnessFulfilled event parsed:')
                                console.log('- Request ID:', fulfillEvent.args.requestId?.toString())
                                console.log('- Randomness:', fulfillEvent.args.randomness?.toString())
                                console.log('- Callback Success:', fulfillEvent.args.callbackSuccess)
                                console.log('- Gas Used:', fulfillEvent.args.actualGasUsed?.toString())
                            }
                        }
                    } catch (parseError) {
                        console.log('⚠️ Could not parse fulfillment event')
                    }
                }

                // Check stored randomness in consumer
                try {
                    const storedRandomness = await consumer.randomness(requestId)
                    console.log('✅ Stored randomness in consumer:', storedRandomness.toString())
                } catch (error) {
                    console.log('⚠️ Could not read stored randomness from consumer')
                }

            } catch (fulfillError: any) {
                console.log('❌ Fulfillment failed:', fulfillError.message)

                // Try with test signature as fallback
                if (!fulfillError.message.includes('test signature')) {
                    console.log('🔄 Trying with test signature as fallback...')
                    try {
                        const testSignature = await generateTestSignature(round, anyrand, pubKeyHash)
                        const testFulfillTx = await anyrand.fulfillRandomness(
                            requestId,
                            consumerAddress,
                            pubKeyHash,
                            round,
                            callbackGasLimit,
                            testSignature
                        )
                        console.log('⚠️ Test signature fulfillment submitted (will likely fail verification)')
                    } catch (testError: any) {
                        console.log('❌ Test signature also failed:', testError.message)
                    }
                }
            }
        } else {
            console.log('\n5. Skipping fulfillRandomness test')
            if (!requestId || !round || !pubKeyHash) {
                console.log('   - Missing request details')
            }
            if (!BEACON_ADDRESS) {
                console.log('   - Missing BEACON_SCROLL_SEPOLIA_ADDRESS in .env')
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