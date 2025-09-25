import { ethers } from 'hardhat'

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
            console.log('\n⚠️ A draw is already pending. The VRF fulfiller needs to complete it.')
            console.log('If it\'s been more than 1 hour, you can call forceRedraw()')
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

            // Check if we have enough balance (we'll send double for safety)
            const requiredBalance = requestPrice * 2n
            if (balance < requiredBalance) {
                console.log('❌ Insufficient ETH balance for VRF request')
                console.log('Need (double for safety):', ethers.formatEther(requiredBalance), 'ETH')
                console.log('Have:', ethers.formatEther(balance), 'ETH')
                process.exit(1)
            }

            // Check if there are tickets sold
            if (gameData.ticketsSold === 0n) {
                console.log('⚠️ No tickets sold in this game')
                console.log('The draw will be skipped and a new game will start')
            }

            console.log('\nAttempting to estimate gas for draw() call...')
            const valueToSend = requestPrice * 2n
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
            console.log('- Value sent (2x for safety):', ethers.formatEther(valueToSend), 'ETH')
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
                console.log('✅ Game is now in DrawPending state, waiting for VRF fulfillment')
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

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })