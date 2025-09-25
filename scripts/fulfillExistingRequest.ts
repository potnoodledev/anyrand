import { ethers } from 'hardhat'
import { getDrandBeaconRound, decodeG1 } from '../lib/drand'

async function main() {
    const lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS
    if (!lotteryAddress) {
        console.error('❌ Please provide lottery address')
        process.exit(1)
    }

    console.log('🎲 Fulfilling existing VRF request for:', lotteryAddress)
    const [deployer] = await ethers.getSigners()

    // Hardcode the known request from the smart-contract-debugger
    // Based on the debug agent's successful draw at block 12519577
    const requestId = 1n // Request IDs start from 1
    const round = 224092n // This is from the successful draw
    const pubKeyHash = '0xf83ada85de740dd123163aef4df20a378211f9c6f82268151f268a5750040cf4'
    const callbackGasLimit = 500000

    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS || '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC'

    const anyrandABI = [
        'function fulfillRandomness(uint256 requestId, address requester, bytes32 pubKeyHash, uint256 round, uint256 callbackGasLimit, uint256[2] signature) external',
        'function getRequestState(uint256 requestId) external view returns (uint8)',
        'function beacon() external view returns (address)',
        'event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness, bool callbackSuccess, uint256 actualGasUsed)'
    ]

    const anyrand = new ethers.Contract(ANYRAND_ADDRESS, anyrandABI, deployer)

    // Check request state
    console.log('\n📋 Checking request state...')
    try {
        const requestState = await anyrand.getRequestState(requestId)
        console.log('Raw request state value:', requestState)
        console.log('Request state:', ['Nonexistent', 'Pending', 'Fulfilled', 'Expired'][Number(requestState)])

        if (requestState === 1n) { // Pending
            console.log('✅ Request is pending and can be fulfilled')
        } else if (requestState === 2n) {
            console.log('✅ Request has already been fulfilled')
            process.exit(0)
        } else if (requestState === 3n) {
            console.log('❌ Request has expired')
            process.exit(1)
        } else {
            console.log('❌ Request does not exist, searching for other pending requests...')

            // Try other request IDs
            for (let id = 0n; id <= 10n; id++) {
                try {
                    const state = await anyrand.getRequestState(id)
                    console.log(`Request ID ${id}: ${['Nonexistent', 'Pending', 'Fulfilled', 'Expired'][state]}`)
                    if (state === 1) {
                        console.log(`✅ Found pending request ID: ${id}`)
                        // You would need to get the round and other params for this request
                        // This would require parsing historical events
                    }
                } catch {}
            }
            process.exit(1)
        }
    } catch (error) {
        console.log('Warning: Could not check request state')
    }

    console.log('\n📋 Request details:')
    console.log('- Request ID:', requestId.toString())
    console.log('- Lottery address:', lotteryAddress)
    console.log('- Round:', round.toString())
    console.log('- PubKeyHash:', pubKeyHash)
    console.log('- Callback gas limit:', callbackGasLimit)

    // Hardcode evmnet beacon timing values
    const beaconGenesis = 1713244728n // evmnet genesis timestamp
    const beaconPeriod = 3n // 3 seconds per round

    const roundTimestamp = Number(beaconGenesis) + (Number(round) - 1) * Number(beaconPeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const waitTime = Math.max(0, roundTimestamp - currentTime)

    console.log('\n⏰ Round timing:')
    console.log('- Round available at:', new Date(roundTimestamp * 1000).toLocaleString())
    console.log('- Current time:', new Date(currentTime * 1000).toLocaleString())

    if (waitTime > 0) {
        console.log(`\n⏳ Waiting ${waitTime} seconds for round...`)
        if (waitTime <= 60) {
            for (let i = waitTime; i > 0; i--) {
                process.stdout.write(`\r⏳ Time remaining: ${i} seconds...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
            console.log('\n✅ Round is now available!')
        } else {
            console.log('Round won\'t be available for a while. Please run again later.')
            process.exit(0)
        }
    } else {
        console.log('✅ Round is already available!')
    }

    // Fetch signature from drand
    console.log('\n📡 Fetching signature from drand...')
    try {
        const drandRound = await getDrandBeaconRound('evmnet', Number(round))
        console.log('✅ Fetched drand round', round.toString())

        const signature = decodeG1(drandRound.signature)

        console.log('- Signature X:', '0x' + signature[0].toString(16))
        console.log('- Signature Y:', '0x' + signature[1].toString(16))

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
        console.log('Waiting for confirmation...')

        const fulfillReceipt = await fulfillTx.wait()
        console.log('✅ Fulfillment confirmed in block:', fulfillReceipt!.blockNumber)

        // Parse fulfillment event
        const fulfillLog = fulfillReceipt!.logs[fulfillReceipt!.logs.length - 1]
        const fulfillEvent = anyrand.interface.parseLog(fulfillLog)

        if (fulfillEvent) {
            const randomness = fulfillEvent.args.randomness
            const callbackSuccess = fulfillEvent.args.callbackSuccess
            const actualGasUsed = fulfillEvent.args.actualGasUsed

            console.log('\n📊 Fulfillment results:')
            console.log('- Random value:', randomness.toString())
            console.log('- Random value (hex):', '0x' + randomness.toString(16))
            console.log('- Callback success:', callbackSuccess ? '✅ Yes' : '❌ No')
            console.log('- Gas used for callback:', actualGasUsed.toString())

            if (callbackSuccess) {
                console.log('\n✅ Lottery draw completed successfully!')
            }
        }

    } catch (error: any) {
        console.log('\n❌ Fulfillment failed!')
        console.log('Error:', error.message || error)

        if (error.data) {
            console.log('\nError data:', error.data)

            // Common error selectors
            const errorSelectors: { [key: string]: string } = {
                '0x637f4a7e': 'InvalidSignature - Signature verification failed',
                '0xf4755eb3': 'InvalidRequestHash - Request parameters don\'t match',
                '0xe4e8e735': 'InvalidRequestState - Request not in pending state',
                '0x7a09dc80': 'RoundNotAvailable - Round not yet available'
            }

            const selector = error.data.slice(0, 10)
            if (errorSelectors[selector]) {
                console.log('Decoded error:', errorSelectors[selector])
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error)
        process.exit(1)
    })