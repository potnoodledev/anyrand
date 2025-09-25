import { ethers } from 'hardhat'
import { getDrandBeaconRound, decodeG1 } from '../lib/drand'

async function main() {
    // Get lottery address from command line or environment variable
    const lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS

    if (!lotteryAddress) {
        console.error('❌ Usage: Set TEST_LOTTERY_ADDRESS environment variable')
        console.error('   Example: TEST_LOTTERY_ADDRESS=0x123... yarn test-lottery')
        process.exit(1)
    }

    console.log('🧪 Testing Lottery:', lotteryAddress)
    console.log('='.repeat(70))

    const [deployer] = await ethers.getSigners()
    console.log('Deployer/Caller:', deployer.address)

    // Get deployer balance
    const balance = await ethers.provider.getBalance(deployer.address)
    console.log('Caller ETH Balance:', ethers.formatEther(balance), 'ETH')

    // Contract ABIs
    const lotteryABI = [
        'function ticketPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function draw() external payable',
        'function getRequestPrice() external view returns (uint256)',
        'function jackpot() external view returns (uint256)',
        'function gamePeriod() external view returns (uint256)',
        'function owner() external view returns (address)',
        'function randomiser() external view returns (address)',
        'function callbackGasLimit() external view returns (uint256)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    // Get lottery state
    console.log('\n📊 Current Lottery State:')
    const currentGameInfo = await lottery.currentGame()
    const gameData = await lottery.gameData(currentGameInfo.id)
    const jackpot = await lottery.jackpot()
    const ticketPrice = await lottery.ticketPrice()
    const gamePeriod = await lottery.gamePeriod()
    const owner = await lottery.owner()
    const randomiser = await lottery.randomiser()
    const callbackGasLimit = await lottery.callbackGasLimit()

    console.log('- Game ID:', currentGameInfo.id.toString())
    console.log('- Game State:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][currentGameInfo.state])
    console.log('- Current Jackpot:', ethers.formatEther(jackpot), 'ETH')
    console.log('- Ticket Price:', ethers.formatEther(ticketPrice), 'ETH')
    console.log('- Game Period:', Number(gamePeriod) / 60, 'minutes')
    console.log('- Tickets Sold:', gameData.ticketsSold.toString())
    console.log('- Owner:', owner)
    console.log('- Randomiser:', randomiser)
    console.log('- Callback Gas Limit:', callbackGasLimit.toString())

    // Check if we're the owner
    const isOwner = owner.toLowerCase() === deployer.address.toLowerCase()
    console.log('- Is Caller Owner?:', isOwner)

    const gameStartedAt = Number(gameData.startedAt)
    const drawScheduledAt = gameStartedAt + Number(gamePeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeToDraws = drawScheduledAt - currentTime

    console.log('- Game Started:', new Date(gameStartedAt * 1000).toLocaleString())
    console.log('- Draw Scheduled:', new Date(drawScheduledAt * 1000).toLocaleString())
    console.log('- Current Time:', new Date(currentTime * 1000).toLocaleString())

    if (timeToDraws > 0) {
        console.log('- Time until draw:', Math.ceil(timeToDraws), 'seconds')
    } else {
        console.log('- ✅ Draw is available now!')
    }

    // Check if we're in the right state
    if (currentGameInfo.state !== 1n) { // State 1 = Purchase
        console.log('\n❌ Cannot draw: Game is not in Purchase state')
        console.log('Current state:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][currentGameInfo.state])

        if (currentGameInfo.state === 2n) { // DrawPending
            console.log('\n⚠️ A draw is already pending. Will attempt to fulfill it now...')
            await fulfillPendingDraw(lottery, lotteryAddress, deployer)
            process.exit(0)
        }
        process.exit(1)
    }

    // Test drawing if time has passed
    const canDrawNow = currentTime >= drawScheduledAt

    // Get VRF request price from Anyrand (declare outside all try blocks for broader scope)
    let requestPrice = ethers.parseEther('0.001') // fallback default

    if (canDrawNow) {
        console.log('\n🎲 Testing lottery drawing...')

        try {
            try {
                requestPrice = await lottery.getRequestPrice()
                console.log('VRF request price:', ethers.formatEther(requestPrice), 'ETH')
            } catch (error: any) {
                console.log('❌ Failed to get request price:', error.message)
                console.log('\n🔍 Debugging: Checking Anyrand configuration...')

                // Try to check Anyrand directly
                const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS
                if (ANYRAND_ADDRESS) {
                    const anyrandABI = [
                        'function getRequestPrice(uint256 callbackGasLimit) external view returns (uint256 totalPrice, uint256 effectiveFeePerGas)'
                    ]
                    const anyrand = new ethers.Contract(ANYRAND_ADDRESS, anyrandABI, deployer)

                    try {
                        const [price, feePerGas] = await anyrand.getRequestPrice(callbackGasLimit)
                        console.log('Direct Anyrand query:')
                        console.log('- Total Price:', ethers.formatEther(price), 'ETH')
                        console.log('- Effective Fee Per Gas:', feePerGas.toString())
                        requestPrice = price
                    } catch (anyrandError: any) {
                        console.log('❌ Direct Anyrand query failed:', anyrandError.message)
                        // Use a fallback value
                        requestPrice = ethers.parseEther('0.001')
                        console.log('Using fallback request price:', ethers.formatEther(requestPrice), 'ETH')
                    }
                } else {
                    // Use a fallback value
                    requestPrice = ethers.parseEther('0.001')
                    console.log('Using fallback request price:', ethers.formatEther(requestPrice), 'ETH')
                }
            }

            // Check if we have enough balance for exact payment
            if (balance < requestPrice) {
                console.log('❌ Insufficient ETH balance for VRF request')
                console.log('Need:', ethers.formatEther(requestPrice), 'ETH')
                console.log('Have:', ethers.formatEther(balance), 'ETH')
                process.exit(1)
            }

            // Check if there are tickets sold
            if (gameData.ticketsSold === 0n) {
                console.log('⚠️ No tickets sold in this game')
                console.log('The draw will be skipped and a new game will start')
            }

            console.log('\nAttempting to estimate gas for draw() call...')
            // Add buffer like quickstart for more reliable execution (comment out for now)
            const bufferAmount = requestPrice; // + ethers.parseEther('0.00000000001')
            const valueToSend = bufferAmount
            let estimatedGas
            try {
                estimatedGas = await lottery.draw.estimateGas({
                    value: valueToSend
                })
                console.log('✅ Gas estimation successful:', estimatedGas.toString())
            } catch (estimateError: any) {
                console.log('❌ Gas estimation failed:', estimateError.message)

                // Try to decode the error
                if (estimateError.data) {
                    console.log('\n🔍 Error data:', estimateError.data)

                    // Common error selectors
                    const errorSelectors: { [key: string]: string } = {
                        '0x7c89e734': 'WaitLonger(uint256)',
                        '0x8b9e7347': 'UnexpectedState(uint8)',
                        '0xdedb78e0': 'NoTicketsSold()',
                        '0x9811e0c7': 'TransferFailed(address,uint256)',
                        '0x3cfc1798': 'InsufficientOperationalFunds(uint256,uint256)'
                    }

                    const selector = estimateError.data.slice(0, 10)
                    if (errorSelectors[selector]) {
                        console.log('Decoded error:', errorSelectors[selector])

                        if (selector === '0x7c89e734') {
                            // WaitLonger error - decode the timestamp
                            try {
                                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                                    ['uint256'],
                                    '0x' + estimateError.data.slice(10)
                                )
                                const waitUntil = Number(decoded[0])
                                console.log('Must wait until:', new Date(waitUntil * 1000).toLocaleString())
                                console.log('Time to wait:', waitUntil - currentTime, 'seconds')
                            } catch {}
                        }
                    }
                }

                // Use a higher gas limit
                estimatedGas = 1000000n
                console.log('Using fallback gas limit:', estimatedGas.toString())
            }

            console.log('\nCalling draw() function...')
            console.log('Parameters:')
            console.log('- VRF price required:', ethers.formatEther(requestPrice), 'ETH')
            console.log('- Value sent (with buffer):', ethers.formatEther(valueToSend), 'ETH')
            console.log('- Gas limit:', estimatedGas.toString())
            console.log('- Caller:', deployer.address)

            const drawTx = await lottery.draw({
                value: valueToSend,
                gasLimit: estimatedGas
            })

            console.log('⏳ Transaction submitted:', drawTx.hash)
            console.log('Waiting for confirmation...')

            const drawReceipt = await drawTx.wait()
            console.log('✅ Draw transaction successful!')
            console.log('- Block number:', drawReceipt!.blockNumber)
            console.log('- Gas used:', drawReceipt!.gasUsed.toString())

            // Check for events
            if (drawReceipt!.logs.length > 0) {
                console.log('- Events emitted:', drawReceipt!.logs.length)

                // Try to decode RandomnessRequested event
                const randomnessRequestedTopic = ethers.id('RandomnessRequested(uint208)')
                for (const log of drawReceipt!.logs) {
                    if (log.topics[0] === randomnessRequestedTopic) {
                        console.log('✅ RandomnessRequested event found')
                        try {
                            const requestId = ethers.AbiCoder.defaultAbiCoder().decode(
                                ['uint208'],
                                log.topics[1]
                            )[0]
                            console.log('- Request ID:', requestId.toString())
                        } catch {}
                    }
                }
            }

            // Check new game state
            const newGameInfo = await lottery.currentGame()
            console.log('\n📊 New Game State:')
            console.log('- State:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][newGameInfo.state])

            if (newGameInfo.state === 2n) {
                console.log('✅ Game is now in DrawPending state')
                console.log('\n🎲 Proceeding to fulfill the VRF request...')
                await fulfillPendingDraw(lottery, lotteryAddress, deployer)
            }

        } catch (error: any) {
            console.log('\n❌ Draw failed!')
            console.log('Error message:', error.message || 'Unknown error')

            if (error.data) {
                console.log('Error data:', error.data)

                // Try to decode common errors
                const errorSelectors: { [key: string]: string } = {
                    '0x7c89e734': 'WaitLonger - Game period not over yet',
                    '0x8b9e7347': 'UnexpectedState - Wrong game state',
                    '0xdedb78e0': 'NoTicketsSold - Cannot draw with no tickets',
                    '0x9811e0c7': 'TransferFailed - ETH transfer failed',
                    '0x3cfc1798': 'InsufficientOperationalFunds - Not enough ETH in contract'
                }

                const selector = error.data.slice(0, 10)
                if (errorSelectors[selector]) {
                    console.log('\n⚠️ Known error:', errorSelectors[selector])
                }
            }

            // Additional debugging info
            console.log('\n🔧 Debug Info:')
            console.log('- Current timestamp:', currentTime)
            console.log('- Draw scheduled at:', drawScheduledAt)
            console.log('- Time difference:', currentTime - drawScheduledAt, 'seconds')
            console.log('- Game state:', currentGameInfo.state.toString())
            console.log('- Tickets sold:', gameData.ticketsSold.toString())

            // Check contract ETH balance
            const contractBalance = await ethers.provider.getBalance(lotteryAddress)
            console.log('- Contract ETH balance:', ethers.formatEther(contractBalance), 'ETH')

            if (contractBalance < requestPrice) {
                console.log('\n⚠️ The lottery contract needs ETH to pay for VRF requests!')
                console.log('Send some ETH to the contract:', lotteryAddress)
            }
        }
    } else {
        console.log('\n⏳ Cannot draw yet. Waiting', Math.ceil(timeToDraws), 'seconds...')
        console.log('Run this script again after:', new Date(drawScheduledAt * 1000).toLocaleString())
    }

    console.log('\n✅ Testing complete!')
}

async function fulfillPendingDraw(lottery: any, lotteryAddress: string, deployer: any) {
    console.log('\n==========================================')
    console.log('VRF FULFILLMENT')
    console.log('==========================================\n')

    console.log('⚠️ Since we cannot find the original VRF request event,')
    console.log('we will attempt to fulfill request ID 1 with known parameters.')
    console.log('If this fails, you may need to wait 1 hour and use forceRedraw.\n')

    // Use known parameters from the successful draw
    const requestId = 1n // Based on the previous debug session
    const round = 224092n // From the smart-contract-debugger output
    const pubKeyHash = '0xf83ada85de740dd123163aef4df20a378211f9c6f82268151f268a5750040cf4'
    const callbackGasLimit = 500000

    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS || '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC'
    console.log('Anyrand address:', ANYRAND_ADDRESS)

    // ABI for Anyrand contract
    const anyrandABI = [
        'function fulfillRandomness(uint256 requestId, address requester, bytes32 pubKeyHash, uint256 round, uint256 callbackGasLimit, uint256[2] signature) external',
        'function getRequestState(uint256 requestId) external view returns (uint8)',
        'event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness, bool callbackSuccess, uint256 actualGasUsed)'
    ]

    const anyrand = new ethers.Contract(ANYRAND_ADDRESS, anyrandABI, deployer)

    console.log('Request details (hardcoded from previous successful draw):')
    console.log('- Request ID:', requestId.toString())
    console.log('- Round:', round.toString())
    console.log('- PubKeyHash:', pubKeyHash)
    console.log('- Callback gas limit:', callbackGasLimit)

    console.log('')

    // Check request state
    try {
        const requestState = await anyrand.getRequestState(requestId)
        console.log('Request state:', ['Nonexistent', 'Pending', 'Fulfilled', 'Expired'][requestState])

        if (requestState !== 1n) { // Not Pending
            console.log('⚠️ Request is not in pending state')
            if (requestState === 2n) {
                console.log('Request has already been fulfilled')
            } else if (requestState === 3n) {
                console.log('Request has expired')
            }
            return
        }
        console.log('✅ Request is pending and can be fulfilled')
    } catch (error) {
        console.log('Warning: Could not check request state:', error)
    }

    // Hardcode evmnet beacon timing values (to avoid beacon contract issues)
    const beaconGenesis = 1713244728n // evmnet genesis timestamp
    const beaconPeriod = 3n // 3 seconds per round

    // Calculate when the round will be available
    const roundTimestamp = Number(beaconGenesis) + (Number(round) - 1) * Number(beaconPeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const waitTime = Math.max(0, roundTimestamp - currentTime)

    console.log('Round timing:')
    console.log('- Round', round.toString(), 'available at:', new Date(roundTimestamp * 1000).toLocaleString())
    console.log('- Current time:', new Date(currentTime * 1000).toLocaleString())

    if (waitTime > 0) {
        console.log(`- Waiting ${waitTime} seconds for round availability...\n`)

        // Wait for the round to be available
        if (waitTime <= 60) { // Wait up to 60 seconds
            for (let i = waitTime; i > 0; i--) {
                process.stdout.write(`\r⏳ Time remaining: ${i} seconds...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
            console.log('\n✅ Round is now available!')
        } else {
            console.log(`⚠️ Round won't be available for ${waitTime} seconds. Please run again later.`)
            return
        }
    } else {
        console.log('✅ Round is already available!')
    }
    console.log('')

    // Fetch the signature from drand
    console.log('Fetching signature from drand network...')
    let signature: [bigint, bigint]

    try {
        const drandRound = await getDrandBeaconRound('evmnet', Number(round))
        console.log('✅ Fetched drand round', round.toString())
        console.log('- Signature hex:', drandRound.signature)

        // Decode the G1 point signature
        signature = decodeG1(drandRound.signature)

        console.log('✅ Signature decoded successfully')
        console.log('- Signature X:', '0x' + signature[0].toString(16))
        console.log('- Signature Y:', '0x' + signature[1].toString(16))
    } catch (error: any) {
        console.log('❌ Failed to fetch signature from drand:', error.message)
        console.log('Cannot proceed without valid signature')
        return
    }

    console.log('')
    console.log('Submitting fulfillment transaction...')

    try {
        const fulfillTx = await anyrand.fulfillRandomness(
            requestId,
            lotteryAddress, // The lottery contract is the requester
            pubKeyHash,
            round,
            callbackGasLimit,
            signature
        )

        console.log('⏳ Transaction submitted:', fulfillTx.hash)
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

            console.log('\nFulfillment results:')
            console.log('- Random value:', randomness.toString())
            console.log('- Random value (hex):', '0x' + randomness.toString(16))
            console.log('- Callback success:', callbackSuccess ? '✅ Yes' : '❌ No')
            console.log('- Gas used for callback:', actualGasUsed.toString())
        }

        // Check the new lottery state
        console.log('\n📊 Checking lottery state after fulfillment...')
        const newGameInfo = await lottery.currentGame()
        const newGameData = await lottery.gameData(newGameInfo.id)

        console.log('- Game ID:', newGameInfo.id.toString())
        console.log('- Game State:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][newGameInfo.state])

        if (newGameData.winningPickId > 0) {
            console.log('\n🎉 WINNER SELECTED!')
            console.log('- Winning Pick ID:', newGameData.winningPickId.toString())

            // If the game has reset to Purchase state, a new game has started
            if (newGameInfo.state === 1n) {
                console.log('\n✅ Lottery draw completed successfully!')
                console.log('A new game has automatically started.')
            }
        }

    } catch (error: any) {
        console.log('\n❌ Fulfillment failed!')
        console.log('Full error:', error)
        console.log('')

        // Try to decode the error using Anyrand interface
        if (error.data) {
            console.log('Error data:', error.data)
            try {
                const decodedError = anyrand.interface.parseError(error.data)
                console.log('Decoded error:', decodedError)
                console.log('Error name:', decodedError?.name)
                console.log('Error args:', decodedError?.args)
            } catch (decodeError) {
                console.log('Could not decode error data')

                // Try common error selectors
                const errorSelectors: { [key: string]: string } = {
                    '0x637f4a7e': 'InvalidSignature - Signature verification failed',
                    '0xf4755eb3': 'InvalidRequestHash - Request parameters don\'t match',
                    '0xe4e8e735': 'InvalidRequestState - Request not in pending state',
                    '0x7a09dc80': 'RoundNotAvailable - Round not yet available',
                    '0xa537f758': 'InvalidRequestHash - Parameters don\'t match the stored request'
                }

                const selector = error.data.slice(0, 10)
                if (errorSelectors[selector]) {
                    console.log('Error selector match:', errorSelectors[selector])

                    // For this specific error, try to decode the parameters
                    if (selector === '0xa537f758') {
                        try {
                            const paramData = '0x' + error.data.slice(10)
                            console.log('Raw parameter data:', paramData)

                            // Try to decode as two uint256 values (common for hash comparison errors)
                            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                                ['bytes32', 'bytes32'],
                                paramData
                            )
                            console.log('Expected hash:', decoded[0])
                            console.log('Provided hash:', decoded[1])
                        } catch (decodeErr) {
                            console.log('Could not decode error parameters')
                        }
                    }
                }
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
        console.log('- Requester (lottery contract):', lotteryAddress)
        console.log('- Fulfiller (EOA):', deployer.address)
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
            console.log('This is likely because we\'re using hardcoded parameters.')
            console.log('')
        } else if (error.message?.includes('InvalidRequestState') || error.reason?.includes('InvalidRequestState')) {
            console.log('🔍 InvalidRequestState Error Detected')
            console.log('The request is not in a valid state for fulfillment.')
            console.log('It may have already been fulfilled or expired.')
            console.log('')
        } else {
            console.log('🔍 Unknown Error')
            console.log('This is likely because we\'re using hardcoded parameters that don\'t')
            console.log('match the actual VRF request that put the lottery in DrawPending state.')
            console.log('')
            console.log('Solutions:')
            console.log('1. Wait 1 hour from the original draw and use forceRedraw()')
            console.log('2. Deploy a new lottery to test the complete flow')
            console.log('3. Find the exact request parameters from the original draw transaction')
            console.log('')
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })