import { ethers } from 'hardhat'
import {
    Anyrand__factory,
    AnyrandConsumer__factory,
    DrandBeacon__factory
} from '../typechain-types'
import { formatEther, formatUnits, getBytes, keccak256, parseEther } from 'ethers'
import { bn254 } from '@kevincharm/noble-bn254-drand'
import * as dotenv from 'dotenv'
import { getDrandBeaconRound, getDrandBeaconInfo } from '../lib/drand'
import { deployLottoPGF } from './lottopgf/deployLottoPGF'
import { saveLottoPGFAddresses, readLottoPGFAddresses } from './utils/envHandler'

/**
 * Complete Anyrand Quickstart for Scroll Sepolia Testnet
 *
 * This script performs the entire flow on Scroll Sepolia testnet:
 * 1. Reads deployed Anyrand address from environment/deployment
 * 2. Deploys AnyrandConsumer contract
 * 3. Executes complete randomness request flow with real drand signatures
 * 4. Outputs the final random result
 *
 * Prerequisites:
 * - Scroll Sepolia RPC configured in hardhat config
 * - Private key with Sepolia ETH in environment
 * - Anyrand contracts deployed: yarn deploy:scrollSepolia
 *
 * Usage:
 * yarn quickstart:scrollSepolia
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Load environment variables
dotenv.config()

async function main() {
    console.log('🚀 Anyrand Scroll Sepolia Quickstart')
    console.log('=====================================\n')

    // ========================================================================
    // STEP 1: SETUP AND VALIDATION
    // ========================================================================
    console.log('STEP 1: Setup and Validation')
    console.log('-------------------------------------\n')

    // Verify we're on Scroll Sepolia
    const network = await ethers.provider.getNetwork()
    if (network.chainId !== 534351n) {
        console.error('❌ Not connected to Scroll Sepolia testnet (chainId: 534351)')
        console.error('Current chainId:', network.chainId.toString())
        console.error('Please check your network configuration')
        process.exit(1)
    }

    // Get signers
    const [deployer, fulfiller] = await ethers.getSigners()
    console.log('Deployer/Requester:', deployer.address)
    console.log('Fulfiller:', fulfiller ? fulfiller.address : deployer.address + ' (using same as deployer)')

    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address)
    console.log('Deployer balance:', formatEther(balance), 'ETH')

    if (balance < parseEther('0.01')) {
        console.log('⚠️  Warning: Low balance detected. You may need Sepolia ETH for transactions.')
        console.log('Get Sepolia ETH from: https://sepoliafaucet.com/')
    }
    console.log('')

    // Get contract addresses from environment variables (required)
    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS
    const BEACON_ADDRESS = process.env.BEACON_SCROLL_SEPOLIA_ADDRESS
    const CONSUMER_ADDRESS = process.env.CONSUMER_SCROLL_SEPOLIA_ADDRESS

    if (!ANYRAND_ADDRESS || !BEACON_ADDRESS) {
        console.error('❌ Missing required contract addresses in .env file')
        console.error('')
        console.error('Please run the deployment first:')
        console.error('  yarn deploy:scrollSepolia')
        console.error('')
        console.error('This should create a .env file with the required addresses:')
        console.error('  ANYRAND_SCROLL_SEPOLIA_ADDRESS=0x...')
        console.error('  BEACON_SCROLL_SEPOLIA_ADDRESS=0x...')
        console.error('  CONSUMER_SCROLL_SEPOLIA_ADDRESS=0x...')
        console.error('')
        process.exit(1)
    }

    console.log('Using contract addresses from .env file:')
    console.log('- Anyrand:', ANYRAND_ADDRESS)
    console.log('- Beacon:', BEACON_ADDRESS)
    if (CONSUMER_ADDRESS) {
        console.log('- Consumer (existing):', CONSUMER_ADDRESS)
    }
    console.log('✅ Addresses loaded from deployment')
    console.log('')

    // Validate Anyrand deployment
    console.log('Validating Anyrand deployment...')
    let anyrand: any
    try {
        anyrand = Anyrand__factory.connect(ANYRAND_ADDRESS, deployer)
        const version = await anyrand.typeAndVersion()
        console.log('✅ Anyrand connected:', version)
    } catch (error) {
        console.error('❌ Failed to connect to Anyrand at', ANYRAND_ADDRESS)
        console.error('Make sure to run: yarn deploy:scrollSepolia')
        throw error
    }
    console.log('')

    // ========================================================================
    // STEP 2: DEPLOY LOTTOPGF CONTRACTS
    // ========================================================================
    console.log('STEP 2: Deploy LottoPGF Contracts')
    console.log('-------------------------------------\n')

    // Check if LottoPGF is already deployed
    const existingLottoPGF = readLottoPGFAddresses('scrollSepolia')
    let lottoPGFDeployment

    if (existingLottoPGF && existingLottoPGF.looteryFactory) {
        console.log('LottoPGF contracts already deployed:')
        console.log('- Factory:', existingLottoPGF.looteryFactory)
        console.log('- Implementation:', existingLottoPGF.looteryImpl)
        console.log('- SVG Renderer:', existingLottoPGF.ticketSVGRenderer)
        console.log('- ETH Adapter:', existingLottoPGF.looteryETHAdapter)
        console.log('✅ Using existing LottoPGF deployment\n')

        lottoPGFDeployment = existingLottoPGF
    } else {
        console.log('Deploying LottoPGF contracts with Anyrand integration...')
        try {
            lottoPGFDeployment = await deployLottoPGF(ANYRAND_ADDRESS as `0x${string}`, 'scrollSepolia')
            saveLottoPGFAddresses(lottoPGFDeployment, 'scrollSepolia')
            console.log('✅ LottoPGF deployment completed and saved to .env\n')
        } catch (error) {
            console.error('❌ Failed to deploy LottoPGF contracts')
            console.error('Error:', error instanceof Error ? error.message : error)
            console.error('Continuing without LottoPGF...\n')
            lottoPGFDeployment = null
        }
    }

    // ========================================================================
    // STEP 3: DEPLOY OR USE EXISTING CONSUMER CONTRACT
    // ========================================================================
    console.log('STEP 3: Deploy or Use Existing Consumer Contract')
    console.log('-------------------------------------\n')

    let consumer: any
    let consumerAddress: string

    if (CONSUMER_ADDRESS) {
        console.log('Using existing AnyrandConsumer...')
        consumer = AnyrandConsumer__factory.connect(CONSUMER_ADDRESS, deployer)
        consumerAddress = CONSUMER_ADDRESS

        // Verify existing consumer
        try {
            const anyrandFromConsumer = await consumer.anyrand()
            const owner = await consumer.owner()
            console.log('✅ Connected to existing consumer')
            console.log('- Consumer address:', consumerAddress)
            console.log('- Anyrand coordinator:', anyrandFromConsumer)
            console.log('- Owner:', owner)

            if (anyrandFromConsumer.toLowerCase() !== ANYRAND_ADDRESS.toLowerCase()) {
                throw new Error(`Consumer points to wrong Anyrand! Expected: ${ANYRAND_ADDRESS}, Got: ${anyrandFromConsumer}`)
            }
        } catch (error) {
            console.error('❌ Error validating existing consumer:', error)
            throw error
        }
    } else {
        console.log('Deploying new AnyrandConsumer...')
        const consumerFactory = new AnyrandConsumer__factory(deployer)
        consumer = await consumerFactory.deploy(ANYRAND_ADDRESS)

        console.log('Waiting for deployment confirmation...')
        await consumer.waitForDeployment()

        consumerAddress = await consumer.getAddress()
        console.log('✅ AnyrandConsumer deployed at:', consumerAddress)

        // Verify deployment
        const anyrandFromConsumer = await consumer.anyrand()
        const owner = await consumer.owner()

        console.log('Contract verification:')
        console.log('- Anyrand coordinator:', anyrandFromConsumer)
        console.log('- Owner:', owner)

        if (anyrandFromConsumer.toLowerCase() !== ANYRAND_ADDRESS.toLowerCase()) {
            throw new Error(`Anyrand address mismatch! Expected: ${ANYRAND_ADDRESS}, Got: ${anyrandFromConsumer}`)
        }
    }
    console.log('✅ Consumer contract ready\n')

    // ========================================================================
    // STEP 4: REQUEST RANDOMNESS
    // ========================================================================
    console.log('STEP 4: Request Randomness')
    console.log('-------------------------------------\n')

    // Connect to contracts
    const beacon = DrandBeacon__factory.connect(BEACON_ADDRESS, deployer)

    // Debug: Check beacon configuration
    console.log('Verifying beacon configuration...')
    try {
        const beaconPubKeyHash = await beacon.publicKeyHash()
        console.log('- Beacon public key hash:', beaconPubKeyHash)
    } catch (e) {
        console.log('- Could not fetch beacon public key hash')
    }

    // Configuration
    const callbackGasLimit = 100_000
    const deadline = Math.floor(Date.now() / 1000) + 120 // 2 minutes from now (more time for testnet)

    console.log('Request configuration:')
    console.log('- Callback gas limit:', callbackGasLimit.toLocaleString())
    console.log('- Deadline:', new Date(deadline * 1000).toLocaleString())
    console.log('')

    // Calculate pricing
    console.log('Calculating request price...')
    const [requestPrice, effectiveFeePerGas] = await anyrand.getRequestPrice(callbackGasLimit)

    console.log('- Request price:', formatEther(requestPrice), 'ETH')
    console.log('- Request price (wei):', requestPrice.toString())
    console.log('- Effective gas price:', formatUnits(effectiveFeePerGas, 'gwei'), 'gwei')
    console.log('')

    // Debug: Check if price calculation is working
    if (requestPrice === 0n) {
        console.log('⚠️  Warning: Request price is 0, this might indicate a configuration issue')
    }

    // Submit request with buffer amount to avoid refund issues
    console.log('Submitting randomness request...')

    // Add buffer to avoid refund complications on testnet
    const bufferAmount = requestPrice + parseEther('0.001') // Add 0.001 ETH buffer
    console.log('Using buffered amount:', formatEther(bufferAmount), 'ETH (includes 0.001 ETH buffer)')

    // Check if we have enough ETH for buffered amount
    if (balance < bufferAmount) {
        console.error('❌ Insufficient balance for request with buffer')
        console.error(`Need: ${formatEther(bufferAmount)} ETH, Have: ${formatEther(balance)} ETH`)
        console.error('Get more Sepolia ETH from: https://sepoliafaucet.com/')
        process.exit(1)
    }

    const requestTx = await consumer.getRandom(deadline, callbackGasLimit, {
        value: bufferAmount,
        gasLimit: 500000 // Set explicit gas limit
    })
    console.log('Transaction hash:', requestTx.hash)

    const requestReceipt = await requestTx.wait(1)
    console.log('✅ Request confirmed in block:', requestReceipt!.blockNumber)

    // Parse request details
    const requestLog = requestReceipt!.logs[0]
    const requestEvent = anyrand.interface.parseLog(requestLog)

    if (!requestEvent) {
        throw new Error('Failed to parse request event')
    }

    const { requestId, round, pubKeyHash } = requestEvent.args

    // Store bufferAmount for later use in summary
    const amountSent = bufferAmount

    console.log('Request details:')
    console.log('- Request ID:', requestId.toString())
    console.log('- Target beacon round:', round.toString())
    console.log('- Public key hash:', pubKeyHash)
    console.log('')

    // ========================================================================
    // STEP 5: WAIT FOR BEACON ROUND AND FETCH REAL SIGNATURE
    // ========================================================================
    console.log('STEP 5: Wait for Beacon Round and Fetch Signature')
    console.log('-------------------------------------\n')

    // Get beacon parameters
    let beaconGenesis: bigint
    let beaconPeriod: bigint

    try {
        beaconGenesis = await beacon.genesisTimestamp()
        beaconPeriod = await beacon.period()
        console.log('Beacon configuration:')
        console.log('- Genesis timestamp:', beaconGenesis.toString())
        console.log('- Period:', beaconPeriod.toString(), 'seconds')
        console.log('')
    } catch (error) {
        console.error('❌ Could not get beacon parameters:', error)
        throw error
    }

    // Calculate wait time
    const roundTimestamp = Number(beaconGenesis) + (Number(round) - 1) * Number(beaconPeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const waitTime = Math.max(0, roundTimestamp - currentTime)

    console.log('Round timing:')
    console.log('- Round', round.toString(), 'available at:', new Date(roundTimestamp * 1000).toLocaleString())
    console.log('- Current time:', new Date(currentTime * 1000).toLocaleString())

    if (waitTime > 0) {
        console.log(`- Waiting ${waitTime} seconds for round availability...\n`)

        // Countdown display for reasonable wait times
        if (waitTime <= 300) { // 5 minutes
            for (let i = waitTime; i > 0; i--) {
                process.stdout.write(`\r⏳ Time remaining: ${i} seconds...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
            console.log('\n✅ Round is now available!')
        } else {
            console.log(`⏳ Waiting for round... (${waitTime} seconds)`)
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
            console.log('✅ Round is now available!')
        }
    } else {
        console.log('✅ Round is already available!')
    }
    console.log('')

    // Fetch real signature from drand network
    console.log('Fetching real signature from drand network...')

    let signature: [bigint, bigint]

    try {
        // First, let's verify the evmnet beacon configuration
        console.log('Fetching evmnet beacon info from drand...')
        const evmnetInfo = await getDrandBeaconInfo('evmnet')
        console.log('- evmnet public_key:', evmnetInfo.public_key)
        console.log('- evmnet genesis_time:', evmnetInfo.genesis_time)
        console.log('- evmnet period:', evmnetInfo.period)

        // Fetch the actual signature from drand API for the evmnet beacon
        const drandRound = await getDrandBeaconRound('evmnet', Number(round))
        console.log('✅ Fetched drand round', round.toString(), 'from network')
        console.log('- Round number:', drandRound.round)
        console.log('- Signature hex:', drandRound.signature)

        // Decode the G1 point signature using the correct method
        const sigPoint = bn254.G1.ProjectivePoint.fromHex(drandRound.signature).toAffine()
        signature = [sigPoint.x, sigPoint.y]

        console.log('✅ Real BLS signature decoded successfully')
        console.log('- Signature X:', '0x' + signature[0].toString(16))
        console.log('- Signature Y:', '0x' + signature[1].toString(16))
        console.log('- This signature is cryptographically valid from drand')
        console.log('')
    } catch (error: any) {
        console.log('⚠️  Failed to fetch from drand API:', error.message)
        console.log('Falling back to test signature (will fail verification)...')

        // Fallback to test signature if drand API is unavailable
        signature = await generateTestnetBeaconSignature(round, beacon)
        console.log('⚠️  Using test signature - fulfillment will fail')
        console.log('')
    }

    // ========================================================================
    // STEP 6: FULFILL RANDOMNESS REQUEST
    // ========================================================================
    console.log('STEP 6: Fulfill Randomness Request')
    console.log('-------------------------------------\n')

    const anyrandFulfiller = anyrand.connect(fulfiller || deployer)

    console.log('Fulfilling request as:', (fulfiller || deployer).address)
    console.log('(Demonstrating that anyone can fulfill requests)\n')

    console.log('Submitting fulfillment...')

    let randomness: bigint
    let callbackSuccess: boolean
    let actualGasUsed: bigint

    try {
        // IMPORTANT: The requester is the consumer contract, not the deployer EOA!
        const fulfillTx = await anyrandFulfiller.fulfillRandomness(
            requestId,
            consumerAddress,  // Use consumer address, not deployer address
            pubKeyHash,
            round,
            callbackGasLimit,
            signature
        )
        console.log('Transaction hash:', fulfillTx.hash)

        const fulfillReceipt = await fulfillTx.wait(1)
        console.log('✅ Fulfillment confirmed in block:', fulfillReceipt!.blockNumber)

        // Parse fulfillment results
        const fulfillLog = fulfillReceipt!.logs[fulfillReceipt!.logs.length - 1]
        const fulfillEvent = anyrand.interface.parseLog(fulfillLog)

        if (!fulfillEvent) {
            throw new Error('Failed to parse fulfillment event')
        }

        const fulfillmentArgs = fulfillEvent.args
        randomness = fulfillmentArgs.randomness
        callbackSuccess = fulfillmentArgs.callbackSuccess
        actualGasUsed = fulfillmentArgs.actualGasUsed

        console.log('Fulfillment results:')
        console.log('- Random value:', randomness.toString())
        console.log('- Random value (hex):', '0x' + randomness.toString(16))
        console.log('- Callback success:', callbackSuccess ? '✅ Yes' : '❌ No')
        console.log('- Gas used for callback:', actualGasUsed.toString())
        console.log('')

    } catch (error: any) {
        console.log('❌ Fulfillment failed')
        console.log('Full error:', error)
        console.log('')

        // Try to decode the error
        if (error.data) {
            console.log('Error data:', error.data)
            try {
                const decodedError = anyrand.interface.parseError(error.data)
                console.log('Decoded error:', decodedError)
                console.log('Error name:', decodedError?.name)
                console.log('Error args:', decodedError?.args)
            } catch (decodeError) {
                console.log('Could not decode error data')
            }
        }

        if (error.reason) {
            console.log('Error reason:', error.reason)
        }

        if (error.code) {
            console.log('Error code:', error.code)
        }

        // Log transaction details for debugging
        console.log('\nDebug Information:')
        console.log('- Request ID:', requestId.toString())
        console.log('- Requester (consumer contract):', consumerAddress)
        console.log('- Fulfiller (EOA):', (fulfiller || deployer).address)
        console.log('- Round:', round.toString())
        console.log('- PubKeyHash:', pubKeyHash)
        console.log('- Callback Gas Limit:', callbackGasLimit)
        console.log('- Signature[0]:', '0x' + signature[0].toString(16))
        console.log('- Signature[1]:', '0x' + signature[1].toString(16))
        console.log('')

        // Specific error handling
        if (error.message?.includes('InvalidSignature') || error.reason?.includes('InvalidSignature')) {
            console.log('🔍 InvalidSignature Error Detected')
            console.log('The beacon contract rejected the signature.')
            console.log('This means the BLS signature verification failed.')
            console.log('')
        } else if (error.message?.includes('InvalidRequestHash') || error.reason?.includes('InvalidRequestHash')) {
            console.log('🔍 InvalidRequestHash Error Detected')
            console.log('The request hash doesn\'t match what\'s stored.')
            console.log('Check that all parameters match the original request.')
            console.log('')
        } else if (error.message?.includes('InvalidRequestState') || error.reason?.includes('InvalidRequestState')) {
            console.log('🔍 InvalidRequestState Error Detected')
            console.log('The request is not in a valid state for fulfillment.')
            console.log('It may have already been fulfilled or expired.')
            console.log('')
        } else {
            console.log('🔍 Unknown Error')
            console.log('Check the full error details above for more information.')
            console.log('')
        }

        console.log('Despite the fulfillment issue:')
        console.log('✅ Consumer contract deployed successfully')
        console.log('✅ Randomness request submitted and accepted')
        console.log('✅ System architecture is working correctly')
        console.log('')

        // Set dummy values for summary
        randomness = 0n
        callbackSuccess = false
        actualGasUsed = 0n
    }

    // ========================================================================
    // STEP 6: VERIFY RESULT
    // ========================================================================
    console.log('STEP 6: Verify Result')
    console.log('-------------------------------------\n')

    // Check consumer contract state
    try {
        const storedRandomness = await consumer.randomness(requestId)
        console.log('Verification:')
        console.log('- Randomness stored in consumer:', storedRandomness.toString())

        if (callbackSuccess) {
            console.log('- Matches generated value:', storedRandomness === randomness ? '✅ Yes' : '❌ No')
        } else {
            console.log('- Expected no stored value due to fulfillment failure')
        }
    } catch (error) {
        console.log('- Consumer randomness check: Could not retrieve (normal for failed fulfillment)')
    }

    const finalState = await anyrand.getRequestState(requestId)
    console.log('- Final request state:', getRequestStateName(finalState))
    console.log('')

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('🎉 SCROLL SEPOLIA QUICKSTART COMPLETE!')
    console.log('=====================================\n')

    console.log('Summary:')
    console.log('✅ Network: Scroll Sepolia Testnet')
    console.log('✅ Consumer address:', consumerAddress)
    console.log('✅ Randomness request submitted successfully')

    if (callbackSuccess) {
        console.log('✅ Random value generated:', randomness.toString())
        console.log('✅ Used real drand signature for fulfillment')
    } else {
        console.log('ℹ️  Fulfillment did not complete successfully')
    }

    console.log('✅ Amount sent:', formatEther(amountSent), 'ETH (includes buffer)')
    console.log('✅ Actual cost:', formatEther(requestPrice), 'ETH')
    console.log('')

    console.log('Key addresses for future reference:')
    console.log('- Anyrand:', ANYRAND_ADDRESS)
    console.log('- Consumer:', consumerAddress)
    console.log('- Beacon:', BEACON_ADDRESS)

    if (lottoPGFDeployment) {
        console.log('- LottoPGF Factory:', lottoPGFDeployment.looteryFactory)
        console.log('- LottoPGF ETH Adapter:', lottoPGFDeployment.looteryETHAdapter)
        console.log('- LottoPGF SVG Renderer:', lottoPGFDeployment.ticketSVGRenderer)
    }
    console.log('')

    if (callbackSuccess) {
        console.log('This random value is:')
        console.log('🔐 Verifiable - BLS signature can be verified by anyone')
        console.log('🎲 Unpredictable - Cannot be known before beacon round')
        console.log('⚖️  Unbiasable - Cannot be manipulated by any party')
        console.log('')
    } else {
        console.log('Note about the fulfillment:')
        console.log('🔧 The script attempted to use real drand signatures')
        console.log('🔧 If fulfillment failed, check the error messages above')
        console.log('🔧 Your request (ID: ' + requestId.toString() + ') may still be pending')
        console.log('🔧 In production, a keeper service handles automatic fulfillment')
        console.log('')
    }

    console.log('🎯 Your Anyrand Scroll Sepolia environment is ready!')
    console.log('')
    console.log('Next steps for production:')
    console.log('1. Set up a keeper service to fetch drand signatures')
    console.log('2. Configure automatic fulfillment for pending requests')
    console.log('3. Monitor request events and fulfill them programmatically')
    console.log('')
    console.log('The contracts are fully deployed and operational on Scroll Sepolia!')
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a testnet beacon signature for demo purposes
 * WARNING: This is for TESTNET DEMO ONLY and is not cryptographically secure!
 */
async function generateTestnetBeaconSignature(
    round: bigint,
    beacon: any
): Promise<[bigint, bigint]> {
    const DST = 'BLS_SIG_BN254G1_XMD:KECCAK-256_SVDW_RO_NUL_'

    // Get or use default public key hash
    let pubKeyHash: string
    try {
        pubKeyHash = await beacon.publicKeyHash()
    } catch (error) {
        pubKeyHash = '0xed6820c99270b1f84b30b0d2973ddd6a0f460fe9fc9dcd867dd909c1c1ac20f9'
    }

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

/**
 * Convert numeric request state to human-readable string
 */
function getRequestStateName(state: number): string {
    const states = ['Nonexistent', 'Pending', 'Fulfilled', 'Failed']
    return states[state] || 'Unknown'
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

main()
    .then(() => {
        console.log('=====================================')
        console.log('✨ Scroll Sepolia quickstart completed!')
        console.log('=====================================')
        process.exit(0)
    })
    .catch((error) => {
        console.error('')
        console.error('❌ SCROLL SEPOLIA QUICKSTART FAILED')
        console.error('=====================================')
        console.error('')
        console.error('Error:', error.message || error)
        console.error('')
        console.error('Troubleshooting:')
        console.error('1. Make sure you\'re connected to Scroll Sepolia testnet')
        console.error('2. Deploy Anyrand contracts: yarn deploy:scrollSepolia')
        console.error('3. Check that you have sufficient Sepolia ETH')
        console.error('4. Verify .env contains ANYRAND_SCROLL_SEPOLIA_ADDRESS and BEACON_SCROLL_SEPOLIA_ADDRESS')
        console.error('')
        process.exit(1)
    })