import { ethers } from 'hardhat'
import { getDrandBeaconRound, decodeG1 } from '../lib/drand'
import { LooteryFactory__factory, DrandBeacon__factory } from '../typechain-types'
import * as readline from 'readline'

interface LotteryInfo {
    address: string
    name: string
    state: string
    ticketsSold: string
    jackpot: string
    drawTime: string
}

async function buyTickets(lotteryAddress: string, ticketCount: number, signer: any): Promise<void> {
    // Get ETH Adapter address
    const ADAPTER_ADDRESS = process.env.LOTTOPGF_ADAPTER_SCROLLSEPOLIA_ADDRESS
    if (!ADAPTER_ADDRESS) {
        throw new Error('LOTTOPGF_ADAPTER_SCROLLSEPOLIA_ADDRESS environment variable is required')
    }

    const lotteryABI = [
        'function ticketPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function pickLength() external view returns (uint8)',
        'function maxBallValue() external view returns (uint8)'
    ]

    const adapterABI = [
        'function purchase(address payable looteryAddress, tuple(address whomst, uint8[] pick)[] tickets, address beneficiary) external payable'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, signer)
    const adapter = new ethers.Contract(ADAPTER_ADDRESS, adapterABI, signer)

    // Get lottery parameters
    const ticketPrice = await lottery.ticketPrice()
    const pickLength = Number(await lottery.pickLength())
    const maxBallValue = Number(await lottery.maxBallValue())
    const totalCost = ticketPrice * BigInt(ticketCount)

    console.log(`- Ticket price: ${ethers.formatEther(ticketPrice)} ETH each`)
    console.log(`- Total cost: ${ethers.formatEther(totalCost)} ETH for ${ticketCount} tickets`)
    console.log(`- Pick length: ${pickLength}, Max ball value: ${maxBallValue}`)

    // Check balance
    const balance = await signer.provider.getBalance(signer.address)
    if (balance < totalCost) {
        throw new Error(`Insufficient balance. Need: ${ethers.formatEther(totalCost)} ETH, Have: ${ethers.formatEther(balance)} ETH`)
    }

    // Check current state
    const currentGame = await lottery.currentGame()
    if (currentGame.state !== 1n) { // 1 = Purchase state
        throw new Error('Lottery is not in Purchase state')
    }

    // Get current ticket count
    const gameData = await lottery.gameData(currentGame.id)
    const currentTickets = gameData.ticketsSold

    console.log(`- Current tickets sold: ${currentTickets.toString()}`)

    // Generate random tickets (simple approach)
    const tickets = []
    for (let i = 0; i < ticketCount; i++) {
        // Generate random picks (ascending order, no duplicates)
        const pick = []
        const used = new Set()

        while (pick.length < pickLength) {
            const num = Math.floor(Math.random() * maxBallValue) + 1
            if (!used.has(num)) {
                pick.push(num)
                used.add(num)
            }
        }
        pick.sort((a, b) => a - b)

        tickets.push({
            whomst: signer.address,
            pick: pick
        })
    }

    console.log('Generated tickets:', tickets.map((t, i) => `${i + 1}: [${t.pick.join(', ')}]`).join(', '))

    // Purchase tickets using ETH adapter
    const tx = await adapter.purchase(
        lotteryAddress,
        tickets,
        ethers.ZeroAddress, // no specific beneficiary
        {
            value: totalCost,
            gasLimit: 1000000
        }
    )

    console.log(`⏳ Transaction submitted: ${tx.hash}`)
    const receipt = await tx.wait()
    console.log('✅ Tickets purchased successfully!')

    // Check new ticket count
    const newGameData = await lottery.gameData(currentGame.id)
    const newTickets = newGameData.ticketsSold

    console.log(`- New total tickets: ${newTickets.toString()}`)
    console.log(`- You purchased: ${newTickets - currentTickets} tickets`)
}

async function selectLottery(): Promise<string> {
    const [deployer] = await ethers.getSigners()

    // Get factory address
    const FACTORY_ADDRESS = process.env.LOTTOPGF_FACTORY_SCROLLSEPOLIA_ADDRESS
    if (!FACTORY_ADDRESS) {
        console.error('❌ LOTTOPGF_FACTORY_SCROLLSEPOLIA_ADDRESS environment variable is required')
        process.exit(1)
    }

    console.log('🔍 Fetching available lotteries from factory:', FACTORY_ADDRESS)
    console.log('='.repeat(70))

    const factory = LooteryFactory__factory.connect(FACTORY_ADDRESS, deployer)

    try {
        // Get all lottery addresses from factory using LooteryLaunched event
        console.log('📡 Searching for deployed lotteries...')
        const filter = factory.filters.LooteryLaunched()

        // Try different block ranges to avoid "Block range too large" error
        let events: any[] = []
        const currentBlock = await deployer.provider!.getBlockNumber()

        // Try smaller ranges first
        const blockRanges = [5000, 10000, 25000]

        for (const range of blockRanges) {
            try {
                const fromBlock = Math.max(0, currentBlock - range)
                console.log(`Searching from block ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`)
                events = await factory.queryFilter(filter, fromBlock, 'latest')
                break // Success, exit the loop
            } catch (error: any) {
                console.log(`❌ Failed with range ${range}: ${error.message}`)
                continue
            }
        }

        // If still no events and we haven't tried all ranges, show known lotteries
        if (events.length === 0) {
            console.log('\n⚠️ Could not fetch lottery events from factory')
            console.log('You can manually specify a lottery address as an argument:')
            console.log('Known lottery addresses:')
            console.log('- 0x6F0f10f47989e87943deF43C6c7B9084F7506dB8 (Recent test lottery)')
            console.log('- 0x56c70Ca00E32b6dA26D28C23eAc4b3C6CeA1a00E (Previous test lottery)')

            // Ask user to enter address manually
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })

            return new Promise((resolve) => {
                rl.question('\nEnter lottery address manually (or press Enter to exit): ', (answer) => {
                    rl.close()
                    if (!answer.trim()) {
                        console.log('❌ No lottery address provided')
                        process.exit(1)
                    }
                    console.log(`\n✅ Using manually entered address: ${answer}`)
                    resolve(answer.trim())
                })
            })
        }

        if (events.length === 0) {
            console.log('❌ No lotteries found in factory')
            console.log('Please deploy a lottery first using: yarn create-lottery')
            process.exit(1)
        }

        console.log(`✅ Found ${events.length} deployed lotteries\n`)

        // Get lottery details
        const lotteries: LotteryInfo[] = []
        const lotteryABI = [
            'function name() external view returns (string)',
            'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
            'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
            'function jackpot() external view returns (uint256)',
            'function gamePeriod() external view returns (uint256)'
        ]

        for (let i = 0; i < events.length; i++) {
            const event = events[i]
            // LooteryLaunched event: (address indexed looteryProxy, address indexed looteryImplementation, address indexed deployer, string name)
            const lotteryAddress = event.args[0] // looteryProxy

            try {
                const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)
                const name = await lottery.name()
                const currentGame = await lottery.currentGame()
                const gameData = await lottery.gameData(currentGame.id)
                const jackpot = await lottery.jackpot()
                const gamePeriod = await lottery.gamePeriod()

                const stateNames = ['Nonexistent', 'Purchase', 'DrawPending', 'Dead']
                const state = stateNames[currentGame.state] || 'Unknown'

                const gameStartedAt = Number(gameData.startedAt)
                const drawScheduledAt = gameStartedAt + Number(gamePeriod)
                const drawTime = gameStartedAt > 0 ? new Date(drawScheduledAt * 1000).toLocaleString() : 'Not started'

                lotteries.push({
                    address: lotteryAddress,
                    name: name || `Lottery ${i + 1}`,
                    state,
                    ticketsSold: gameData.ticketsSold.toString(),
                    jackpot: ethers.formatEther(jackpot),
                    drawTime
                })
            } catch (error) {
                console.log(`⚠️ Could not fetch details for lottery ${lotteryAddress}`)
                lotteries.push({
                    address: lotteryAddress,
                    name: `Lottery ${i + 1} (Details unavailable)`,
                    state: 'Unknown',
                    ticketsSold: '?',
                    jackpot: '?',
                    drawTime: '?'
                })
            }
        }

        // Display lotteries
        console.log('Available Lotteries:')
        console.log('='.repeat(70))
        lotteries.forEach((lottery, index) => {
            console.log(`${index + 1}. ${lottery.name}`)
            console.log(`   Address: ${lottery.address}`)
            console.log(`   State: ${lottery.state}`)
            console.log(`   Tickets Sold: ${lottery.ticketsSold}`)
            console.log(`   Jackpot: ${lottery.jackpot} ETH`)
            console.log(`   Next Draw: ${lottery.drawTime}`)
            console.log()
        })

        // Get user selection
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        return new Promise((resolve) => {
            rl.question(`Enter the number of the lottery to test (1-${lotteries.length}): `, async (answer) => {
                const selection = parseInt(answer)
                if (isNaN(selection) || selection < 1 || selection > lotteries.length) {
                    console.error('❌ Invalid selection')
                    rl.close()
                    process.exit(1)
                }

                const selectedLottery = lotteries[selection - 1]
                console.log(`\n✅ Selected: ${selectedLottery.name} (${selectedLottery.address})`)

                // If lottery is in Purchase state, offer to buy tickets
                if (selectedLottery.state === 'Purchase') {
                    rl.question('\n🎫 Would you like to buy tickets first? (y/N): ', async (buyAnswer) => {
                        if (buyAnswer.toLowerCase().startsWith('y')) {
                            rl.question('How many tickets to buy? (default: 1): ', async (ticketAnswer) => {
                                const ticketCount = parseInt(ticketAnswer) || 1
                                console.log(`\n🛒 Buying ${ticketCount} tickets...`)

                                try {
                                    await buyTickets(selectedLottery.address, ticketCount, deployer)
                                } catch (error: any) {
                                    console.log('❌ Failed to buy tickets:', error.message)
                                }

                                rl.close()
                                resolve(selectedLottery.address)
                            })
                        } else {
                            rl.close()
                            resolve(selectedLottery.address)
                        }
                    })
                } else {
                    rl.close()
                    resolve(selectedLottery.address)
                }
            })
        })

    } catch (error: any) {
        console.error('❌ Error fetching lotteries:', error.message)
        process.exit(1)
    }
}

async function main() {
    // Get lottery address from command line or environment variable
    let lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS

    if (!lotteryAddress) {
        // Interactive mode - fetch available lotteries
        lotteryAddress = await selectLottery()
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
            await fulfillPendingDraw(lottery, lotteryAddress, deployer, undefined, currentGameInfo)
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
            // Add buffer like quickstart for more reliable execution
            const bufferAmount = requestPrice + ethers.parseEther('0.0001')
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
                // Parse VRF request from the draw transaction receipt
                await fulfillPendingDraw(lottery, lotteryAddress, deployer, drawReceipt, currentGameInfo)
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

async function fulfillPendingDraw(lottery: any, lotteryAddress: string, deployer: any, drawReceipt?: any, gameInfo?: any) {
    console.log('\n==========================================')
    console.log('VRF FULFILLMENT')
    console.log('==========================================\n')

    let requestId: bigint, round: bigint, pubKeyHash: string, callbackGasLimit: number
    const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS || '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC'

    if (drawReceipt && drawReceipt.logs) {
        console.log('🔍 Parsing VRF request from draw transaction...')

        // Find the RandomnessRequested event from Anyrand - use the same approach as testAnyrandCall.ts
        const requestLog = drawReceipt.logs.find((log: any) =>
            log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()
        )

        if (requestLog) {
            console.log('✅ Found Anyrand log in draw receipt')
            console.log('- Log address:', requestLog.address)
            console.log('- Topics:', requestLog.topics)

            let parsedSuccessfully = false

            try {
                // Create Anyrand interface to parse the event properly
                const anyrandABI = [
                    'event RandomnessRequested(uint256 indexed requestId, uint256 round, address indexed requester, bytes32 indexed pubKeyHash, uint256 callbackGasLimit)'
                ]
                const anyrandInterface = new ethers.Interface(anyrandABI)
                const requestEvent = anyrandInterface.parseLog({
                    topics: requestLog.topics,
                    data: requestLog.data
                })

                if (requestEvent && requestEvent.name === 'RandomnessRequested') {
                    requestId = requestEvent.args.requestId
                    round = requestEvent.args.round
                    pubKeyHash = requestEvent.args.pubKeyHash
                    callbackGasLimit = Number(requestEvent.args.callbackGasLimit)

                    console.log('✅ Successfully parsed VRF request using interface!')
                    parsedSuccessfully = true
                }
            } catch (parseError) {
                console.log('⚠️ Interface parsing failed:', parseError instanceof Error ? parseError.message : parseError)
                console.log('🔄 Falling back to manual extraction...')
            }

            if (!parsedSuccessfully) {
                try {
                    // Manual extraction from raw log data (same as forceRedraw section)
                    requestId = BigInt(requestLog.topics[1])
                    pubKeyHash = requestLog.topics[3]

                    // Decode data field
                    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                        ['uint256', 'uint256', 'uint256', 'uint256'],
                        requestLog.data
                    )

                    round = decoded[0]

                    // Try to get callback gas limit from lottery contract
                    try {
                        callbackGasLimit = Number(await lottery.callbackGasLimit())
                        console.log('Using lottery callbackGasLimit:', callbackGasLimit)
                    } catch (gasLimitError) {
                        // If decoded[1] looks like a reasonable gas limit (between 100k and 1M), use it
                        if (decoded[1] >= 100000n && decoded[1] <= 1000000n) {
                            callbackGasLimit = Number(decoded[1])
                            console.log('Using decoded callbackGasLimit:', callbackGasLimit)
                        } else {
                            callbackGasLimit = 500000 // fallback
                            console.log('Using fallback callbackGasLimit:', callbackGasLimit)
                        }
                    }

                    console.log('✅ Manually extracted VRF request from draw receipt!')
                    parsedSuccessfully = true

                } catch (manualError) {
                    console.log('❌ Manual extraction also failed:', manualError instanceof Error ? manualError.message : manualError)
                }
            }

            if (parsedSuccessfully) {
                console.log('📋 Parsed VRF request from draw transaction:')
                console.log('- Request ID:', requestId.toString())
                console.log('- Round:', round.toString())
                console.log('- Pub Key Hash:', pubKeyHash)
                console.log('- Callback Gas Limit:', callbackGasLimit)
            } else {
                console.log('❌ Could not parse VRF request from draw receipt by any method')
                throw new Error('Cannot proceed without valid VRF request parameters from draw receipt')
            }
        } else {
            console.log('❌ No Anyrand event found in draw receipt')
            throw new Error('Draw receipt does not contain RandomnessRequested event')
        }
    } else {
        console.log('⚠️ No draw receipt provided - need to find the pending VRF request...')

        // Find the most recent pending request for this lottery
        try {
            const anyrandABI = [
                'event RandomnessRequested(uint256 indexed requestId, uint256 round, address indexed requester, bytes32 indexed pubKeyHash, uint256 callbackGasLimit)',
                'function getRequestState(uint256 requestId) external view returns (uint8)'
            ]
            const anyrand = new ethers.Contract(ANYRAND_ADDRESS, anyrandABI, deployer)

            // Search for recent RandomnessRequested events from this lottery
            console.log('🔍 Searching for recent RandomnessRequested events from this lottery...')
            console.log('- Lottery address (requester):', lotteryAddress)
            console.log('- Anyrand address:', ANYRAND_ADDRESS)

            // FIXED: Correct filter order - RandomnessRequested(requestId, round, requester, pubKeyHash, callbackGasLimit)
            // Parameters: requestId(indexed), round(NOT indexed), requester(indexed), pubKeyHash(indexed), callbackGasLimit(NOT indexed)
            // Non-indexed parameters MUST be null in filter
            const filter = anyrand.filters.RandomnessRequested(
                null,           // requestId (indexed) - any value
                null,           // round (NOT indexed) - must be null
                lotteryAddress, // requester (indexed) - specific lottery
                null,           // pubKeyHash (indexed) - any value
                null            // callbackGasLimit (NOT indexed) - must be null
            )
            const currentBlock = await deployer.provider!.getBlockNumber()

            console.log(`- Searching from block ${currentBlock - 10000} to ${currentBlock} (10000 blocks)`)

            // Expand search to last 10000 blocks for better coverage
            let events
            try {
                events = await anyrand.queryFilter(filter, currentBlock - 10000, 'latest')
                console.log(`- Found ${events.length} RandomnessRequested events for this lottery`)
            } catch (filterError) {
                console.log('⚠️ Ethers filter failed:', filterError instanceof Error ? filterError.message : filterError)
                events = []
            }

            if (events.length === 0) {
                // Try direct RPC call as fallback
                console.log('🔍 Trying direct RPC call as fallback...')
                let foundViaRPC = false

                try {
                    const provider = deployer.provider!
                    const eventSignature = '0x4d742ad77e9e8ee172d944c464321fc0e5c49465017bf65357c77b62de3a1b58'
                    const paddedLotteryAddress = ethers.zeroPadValue(lotteryAddress, 32)

                    console.log('- Event signature:', eventSignature)
                    console.log('- Padded lottery address:', paddedLotteryAddress)

                    const logs = await provider.send('eth_getLogs', [{
                        address: ANYRAND_ADDRESS,
                        fromBlock: ethers.toBeHex(currentBlock - 5000),
                        toBlock: 'latest',
                        topics: [
                            eventSignature,  // RandomnessRequested event signature
                            null,           // requestId (any)
                            paddedLotteryAddress, // requester (specific lottery)
                            null            // pubKeyHash (any)
                        ]
                    }])

                    console.log(`- Direct RPC found ${logs.length} events`)

                    if (logs.length > 0) {
                        console.log('✅ Direct RPC call found events! Issue was with ethers filter.')
                        console.log(`📊 Found ${logs.length} RandomnessRequested events for this lottery`)

                        // Check all events to find pending ones
                        let foundPendingRequest = false
                        console.log('\n🔍 Analyzing all requests to find pending ones:')

                        for (let i = logs.length - 1; i >= 0; i--) {
                            const log = logs[i]
                            const logRequestId = BigInt(log.topics[1])
                            const logPubKeyHash = log.topics[3]

                            // Decode the data field
                            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                                ['uint256', 'uint256', 'uint256', 'uint256'],
                                log.data
                            )
                            const logRound = decoded[0]

                            console.log(`\n  Event ${i + 1}/${logs.length}:`)
                            console.log(`    - Request ID: ${logRequestId}`)
                            console.log(`    - Round: ${logRound}`)
                            console.log(`    - Block: ${parseInt(log.blockNumber, 16)}`)
                            console.log(`    - Transaction: ${log.transactionHash}`)

                            // Check the state of this request
                            try {
                                const requestState = await anyrand.getRequestState(logRequestId)
                                const stateNames = ['Nonexistent', 'Pending', 'Fulfilled', 'Expired']
                                console.log(`    - State: ${stateNames[requestState]} (${requestState})`)

                                if (requestState === 1n && !foundPendingRequest) { // First pending request
                                    requestId = logRequestId
                                    round = logRound
                                    pubKeyHash = logPubKeyHash
                                    callbackGasLimit = Number(await lottery.callbackGasLimit())

                                    console.log(`    ✅ This request is PENDING - will use this one!`)
                                    foundPendingRequest = true
                                } else if (requestState === 1n) {
                                    console.log(`    ⚠️ This request is also pending, but using the first one found`)
                                }
                            } catch (stateError) {
                                console.log(`    ❌ Could not check state: ${stateError}`)
                            }
                        }

                        if (foundPendingRequest) {
                            console.log('\n📋 Selected pending VRF request:')
                            console.log('- Request ID:', requestId.toString())
                            console.log('- Round:', round.toString())
                            console.log('- Pub Key Hash:', pubKeyHash)
                            console.log('- Callback Gas Limit:', callbackGasLimit)
                            foundViaRPC = true
                        } else {
                            console.log('\n❌ No pending requests found among all events')
                            console.log('All requests for this lottery have already been fulfilled or expired')

                            // If lottery is in DrawPending but no pending requests, this is suspicious
                            const currentGame = await lottery.currentGame()
                            if (currentGame.state === 2n) {
                                console.log('\n🚨 INCONSISTENCY DETECTED:')
                                console.log('- Lottery state: DrawPending (waiting for VRF)')
                                console.log('- All VRF requests: Already fulfilled/expired')
                                console.log('- This suggests the lottery might be stuck or there might be a newer request')

                                // Check for very recent events (maybe in last 100 blocks)
                                console.log('\n🔍 Checking for very recent requests (last 100 blocks)...')
                                const recentLogs = await provider.send('eth_getLogs', [{
                                    address: ANYRAND_ADDRESS,
                                    fromBlock: ethers.toBeHex(currentBlock - 100),
                                    toBlock: 'latest',
                                    topics: [
                                        eventSignature,
                                        null,
                                        paddedLotteryAddress,
                                        null
                                    ]
                                }])

                                if (recentLogs.length > 0) {
                                    console.log(`Found ${recentLogs.length} very recent requests`)
                                    const recentLog = recentLogs[recentLogs.length - 1]
                                    const recentRequestId = BigInt(recentLog.topics[1])
                                    const recentState = await anyrand.getRequestState(recentRequestId)
                                    console.log(`Most recent request ${recentRequestId} state: ${['Nonexistent', 'Pending', 'Fulfilled', 'Expired'][recentState]}`)

                                    if (recentState === 1n) {
                                        console.log('✅ Found a pending recent request!')
                                        // Use this recent request
                                        const recentDecoded = ethers.AbiCoder.defaultAbiCoder().decode(
                                            ['uint256', 'uint256', 'uint256', 'uint256'],
                                            recentLog.data
                                        )
                                        requestId = recentRequestId
                                        round = recentDecoded[0]
                                        pubKeyHash = recentLog.topics[3]
                                        callbackGasLimit = Number(await lottery.callbackGasLimit())
                                        foundViaRPC = true
                                    }
                                }
                            }
                        }
                    } else {
                        console.log('❌ Even direct RPC call found no events')
                    }
                } catch (rpcError) {
                    console.log('❌ Direct RPC call also failed:', rpcError instanceof Error ? rpcError.message : rpcError)
                }

                if (foundViaRPC) {
                    console.log('✅ Proceeding directly to fulfillment with found request...')
                    // Continue to the next section for fulfillment
                } else {
                    console.log('🔍 No events found with any method, checking for any RandomnessRequested events...')
                    try {
                        const broadEvents = await anyrand.queryFilter(anyrand.filters.RandomnessRequested(), currentBlock - 5000, 'latest')
                        console.log(`- Found ${broadEvents.length} total RandomnessRequested events in last 5000 blocks`)
                    } catch (broadError) {
                        console.log('❌ Even broad search failed:', broadError instanceof Error ? broadError.message : broadError)
                    }

                    console.log('⚠️ No RandomnessRequested events found')
                    console.log('🔍 Checking lottery state to determine next action...')
                }

                if (!foundViaRPC) {
                    // Check the current lottery state only if we didn't find a request
                    const currentGame = await lottery.currentGame()
                    const gameData = await lottery.gameData(currentGame.id)

                    console.log(`- Current game state: ${['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][currentGame.state]}`)
                    console.log(`- Tickets sold: ${gameData.ticketsSold}`)

                    if (currentGame.state === 2n) { // DrawPending - stuck state, needs forceRedraw
                    console.log('🔄 Lottery is in DrawPending state - this indicates a stuck/failed draw')
                    console.log('Will attempt to use forceRedraw() to reset and create a new draw...')

                    try {
                        // Create a new contract instance with the forceRedraw function
                        const lotteryWithForceRedraw = new ethers.Contract(lotteryAddress, [
                            'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
                            'function forceRedraw() external payable',
                            'function getRequestPrice() external view returns (uint256)',
                            'function draw() external payable'
                        ], deployer)

                        console.log('Checking if forceRedraw() is available and callable...')

                        // Test if forceRedraw function exists and can be called
                        const requestPrice = await lotteryWithForceRedraw.getRequestPrice()
                        const forceRedrawValue = requestPrice * 2n // Use 2x price for safety as per forceRedrawAndFulfill.ts

                        try {
                            await lotteryWithForceRedraw.forceRedraw.estimateGas({
                                value: forceRedrawValue
                            })
                            console.log('✅ forceRedraw() is available and callable')
                        } catch (estimateError: any) {
                            console.log('⚠️ Cannot call forceRedraw():', estimateError.message)
                            console.log('This might be because the request is too recent (< 1 hour old)')
                            throw new Error('forceRedraw() is not available - request may be too recent')
                        }

                        console.log('Calling forceRedraw() to reset the lottery...')
                        const forceRedrawTx = await lotteryWithForceRedraw.forceRedraw({
                            value: forceRedrawValue,
                            gasLimit: 1000000
                        })

                        console.log('⏳ ForceRedraw transaction submitted:', forceRedrawTx.hash)
                        const forceRedrawReceipt = await forceRedrawTx.wait()
                        console.log('✅ ForceRedraw transaction confirmed!')

                        // Check new state after forceRedraw
                        const newGameInfo = await lotteryWithForceRedraw.currentGame()
                        console.log(`- New game state after forceRedraw: ${['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][newGameInfo.state]}`)

                        if (newGameInfo.state !== 1n) {
                            console.log(`⚠️ Expected Purchase state after forceRedraw, got: ${['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][newGameInfo.state]}`)
                            console.log('ForceRedraw completed but lottery is not in expected state')
                        }

                        // Check if forceRedraw created a new RandomnessRequested event
                        const forceRedrawRequestLog = forceRedrawReceipt.logs.find((log: any) =>
                            log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()
                        )

                        if (forceRedrawRequestLog) {
                            console.log('🎉 forceRedraw() created a new RandomnessRequested event!')

                            try {
                                // Create a fresh Anyrand interface for parsing
                                const freshAnyrandABI = [
                                    'event RandomnessRequested(uint256 indexed requestId, uint256 round, address indexed requester, bytes32 indexed pubKeyHash, uint256 callbackGasLimit)'
                                ]
                                const parseInterface = new ethers.Interface(freshAnyrandABI)
                                const requestEvent = parseInterface.parseLog(forceRedrawRequestLog)

                                if (requestEvent && requestEvent.name === 'RandomnessRequested') {
                                    requestId = requestEvent.args.requestId
                                    round = requestEvent.args.round
                                    pubKeyHash = requestEvent.args.pubKeyHash
                                    callbackGasLimit = Number(requestEvent.args.callbackGasLimit)

                                    console.log('✅ Successfully parsed VRF request from forceRedraw!')
                                    console.log('- Request ID:', requestId.toString())
                                    console.log('- Round:', round.toString())
                                    console.log('- Pub Key Hash:', pubKeyHash)
                                    console.log('- Callback Gas Limit:', callbackGasLimit)
                                } else {
                                    throw new Error('Event name does not match RandomnessRequested')
                                }
                            } catch (parseError) {
                                console.log('⚠️ Failed to parse event with interface, extracting manually from raw log...')

                                // Manual extraction from raw log data
                                requestId = BigInt(forceRedrawRequestLog.topics[1])
                                pubKeyHash = forceRedrawRequestLog.topics[3]

                                // Decode data field (round, unknown params, callbackGasLimit)
                                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                                    ['uint256', 'uint256', 'uint256', 'uint256'],
                                    forceRedrawRequestLog.data
                                )
                                round = decoded[0]
                                // The 4th parameter looks like gas price, not callback gas limit
                                // Let's use the lottery's configured callback gas limit instead
                                console.log('Raw decoded data:', decoded.map(d => d.toString()))

                                try {
                                    callbackGasLimit = Number(await lottery.callbackGasLimit())
                                    console.log('Using lottery callbackGasLimit:', callbackGasLimit)
                                } catch (gasLimitError) {
                                    callbackGasLimit = 500000 // fallback
                                    console.log('Using fallback callbackGasLimit:', callbackGasLimit)
                                }

                                console.log('✅ Manually extracted VRF request from forceRedraw!')
                                console.log('- Request ID:', requestId.toString())
                                console.log('- Round:', round.toString())
                                console.log('- Pub Key Hash:', pubKeyHash)
                                console.log('- Callback Gas Limit:', callbackGasLimit)
                            }
                        } else {
                            console.log('⚠️ forceRedraw() did not create a RandomnessRequested event')
                            console.log('This might be expected depending on the lottery implementation')

                            if (newGameInfo.state === 1n) {
                                console.log('🎲 Lottery is now in Purchase state - will initiate a new draw...')

                                const drawTx = await lotteryWithForceRedraw.draw({
                                    value: requestPrice + ethers.parseEther('0.0001'),
                                    gasLimit: 1000000
                                })

                                console.log('⏳ New draw transaction submitted:', drawTx.hash)
                                const drawReceipt = await drawTx.wait()
                                console.log('✅ New draw transaction confirmed!')

                                // Parse the RandomnessRequested event from the new draw
                                const drawRequestLog = drawReceipt.logs.find((log: any) =>
                                    log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()
                                )

                                if (drawRequestLog) {
                                    const requestEvent = anyrand.interface.parseLog(drawRequestLog)

                                    if (requestEvent && requestEvent.name === 'RandomnessRequested') {
                                        requestId = requestEvent.args.requestId
                                        round = requestEvent.args.round
                                        pubKeyHash = requestEvent.args.pubKeyHash
                                        callbackGasLimit = Number(requestEvent.args.callbackGasLimit)

                                        console.log('✅ Successfully created and parsed VRF request from new draw!')
                                        console.log('- Request ID:', requestId.toString())
                                        console.log('- Round:', round.toString())
                                        console.log('- Pub Key Hash:', pubKeyHash)
                                        console.log('- Callback Gas Limit:', callbackGasLimit)
                                    } else {
                                        throw new Error('Could not parse RandomnessRequested event from new draw')
                                    }
                                } else {
                                    throw new Error('No RandomnessRequested event found in new draw transaction')
                                }
                            } else {
                                throw new Error('Cannot proceed - lottery not in correct state after forceRedraw')
                            }
                        }

                    } catch (forceRedrawError) {
                        console.log('❌ Failed to force redraw:', forceRedrawError instanceof Error ? forceRedrawError.message : forceRedrawError)
                        throw new Error('Cannot recover from DrawPending state using forceRedraw')
                    }

                } else if (currentGame.state === 1n) { // Purchase state
                    console.log('🎲 Lottery is in Purchase state - will initiate a regular draw...')

                    // Check timing requirements
                    const gamePeriod = await lottery.gamePeriod()
                    const gameStartedAt = Number(gameData.startedAt)
                    const drawScheduledAt = gameStartedAt + Number(gamePeriod)
                    const currentTime = Math.floor(Date.now() / 1000)

                    if (currentTime < drawScheduledAt) {
                        const waitTime = drawScheduledAt - currentTime
                        throw new Error(`Cannot draw yet. Must wait ${waitTime} seconds until ${new Date(drawScheduledAt * 1000).toLocaleString()}`)
                    }

                    console.log('✅ Draw timing requirements met - initiating draw...')

                    try {
                        const requestPrice = await lottery.getRequestPrice()
                        console.log('VRF request price:', ethers.formatEther(requestPrice), 'ETH')

                        const bufferAmount = requestPrice + ethers.parseEther('0.0001')

                        const drawTx = await lottery.draw({
                            value: bufferAmount,
                            gasLimit: 1000000
                        })

                        console.log('⏳ Draw transaction submitted:', drawTx.hash)
                        const drawReceipt = await drawTx.wait()
                        console.log('✅ Draw transaction confirmed!')

                        // Parse the RandomnessRequested event from this new draw
                        const requestLog = drawReceipt.logs.find((log: any) =>
                            log.address.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()
                        )

                        if (requestLog) {
                            const requestEvent = anyrand.interface.parseLog(requestLog)

                            if (requestEvent && requestEvent.name === 'RandomnessRequested') {
                                requestId = requestEvent.args.requestId
                                round = requestEvent.args.round
                                pubKeyHash = requestEvent.args.pubKeyHash
                                callbackGasLimit = Number(requestEvent.args.callbackGasLimit)

                                console.log('✅ Successfully created and parsed VRF request!')
                                console.log('- Request ID:', requestId.toString())
                                console.log('- Round:', round.toString())
                                console.log('- Pub Key Hash:', pubKeyHash)
                                console.log('- Callback Gas Limit:', callbackGasLimit)
                            } else {
                                throw new Error('Could not parse RandomnessRequested event from draw')
                            }
                        } else {
                            throw new Error('No RandomnessRequested event found in draw transaction')
                        }

                    } catch (drawError) {
                        console.log('❌ Failed to initiate draw:', drawError instanceof Error ? drawError.message : drawError)
                        throw new Error('Cannot create VRF request through regular draw')
                    }

                    } else {
                        throw new Error(`Lottery is in ${['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][currentGame.state]} state - cannot create VRF request`)
                    }
                }

            } else {
                console.log(`Found ${events.length} RandomnessRequested event(s) for this lottery`)

                // Find the most recent pending request
                let foundPendingRequest = false
                for (let i = events.length - 1; i >= 0; i--) {
                    const event = events[i]
                    const testRequestId = event.args.requestId

                    try {
                        const requestState = await anyrand.getRequestState(testRequestId)
                        console.log(`- Request ${testRequestId}: state = ${['Nonexistent', 'Pending', 'Fulfilled', 'Expired'][requestState]}`)

                        if (requestState === 1n) { // Pending
                            requestId = testRequestId
                            round = event.args.round
                            pubKeyHash = event.args.pubKeyHash
                            callbackGasLimit = Number(event.args.callbackGasLimit)

                            console.log('✅ Found pending VRF request!')
                            console.log('- Request ID:', requestId.toString())
                            console.log('- Round:', round.toString())
                            console.log('- Pub Key Hash:', pubKeyHash)
                            console.log('- Callback Gas Limit:', callbackGasLimit)

                            foundPendingRequest = true
                            break
                        }
                    } catch (stateError) {
                        console.log(`- Could not check state for request ${testRequestId}`)
                        continue
                    }
                }

                if (!foundPendingRequest) {
                    throw new Error('No pending VRF requests found for this lottery. All requests may have been fulfilled or expired.')
                }
            }

        } catch (searchError) {
            console.log('❌ Failed to find pending VRF request:', searchError instanceof Error ? searchError.message : searchError)
            throw new Error('Cannot proceed without finding a valid pending VRF request')
        }
    }
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

    // Get beacon parameters from the actual beacon contract
    const BEACON_ADDRESS = process.env.BEACON_SCROLL_SEPOLIA_ADDRESS
    let beaconGenesis: bigint
    let beaconPeriod: bigint

    if (BEACON_ADDRESS) {
        try {
            const beacon = DrandBeacon__factory.connect(BEACON_ADDRESS, deployer)
            beaconGenesis = await beacon.genesisTimestamp()
            beaconPeriod = await beacon.period()
            console.log('✅ Retrieved beacon parameters from contract:')
            console.log('- Genesis timestamp:', beaconGenesis.toString())
            console.log('- Period:', beaconPeriod.toString(), 'seconds')
        } catch (beaconError: any) {
            console.log('⚠️ Failed to get beacon parameters from contract:', beaconError.message)
            console.log('Using fallback evmnet beacon timing values...')
            beaconGenesis = 1713244728n // evmnet genesis timestamp
            beaconPeriod = 3n // 3 seconds per round
        }
    } else {
        console.log('⚠️ BEACON_SCROLL_SEPOLIA_ADDRESS not found in .env')
        console.log('Using fallback evmnet beacon timing values...')
        beaconGenesis = 1713244728n // evmnet genesis timestamp
        beaconPeriod = 3n // 3 seconds per round
    }

    // Calculate when the round will be available
    const roundTimestamp = Number(beaconGenesis) + (Number(round) - 1) * Number(beaconPeriod)
    const currentTime = Math.floor(Date.now() / 1000)
    const waitTime = Math.max(0, roundTimestamp - currentTime)

    console.log('\nRound timing:')
    console.log('- Round', round.toString(), 'available at:', new Date(roundTimestamp * 1000).toLocaleString())
    console.log('- Current time:', new Date(currentTime * 1000).toLocaleString())

    if (waitTime > 0) {
        console.log(`- Waiting ${waitTime} seconds for round availability...`)

        // Only wait up to 60 seconds for testing
        if (waitTime <= 60) {
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

            console.log('\n🎲 VRF Fulfillment Results:')
            console.log('- Random value:', randomness.toString())
            console.log('- Random value (hex):', '0x' + randomness.toString(16))
            console.log('- Callback success:', callbackSuccess ? '✅ Yes' : '❌ No')
            console.log('- Gas used for callback:', actualGasUsed.toString())
        }

        // Check the new lottery state and get draw results
        console.log('\n🎰 Lottery Draw Results:')
        const newGameInfo = await lottery.currentGame()
        const newGameData = await lottery.gameData(newGameInfo.id)

        // Get the previous (completed) game data
        // The completed game should be the one that was just drawn (before fulfillment created a new game)
        let previousGameId: bigint
        if (gameInfo && gameInfo.id) {
            // Use the game info passed in
            previousGameId = gameInfo.id
        } else if (newGameInfo.id > 0n) {
            // If a new game was created, the previous game is newGameInfo.id - 1
            previousGameId = newGameInfo.id - 1n
        } else {
            // Fallback to current game if no new game was created
            previousGameId = newGameInfo.id
        }
        let completedGameData
        try {
            completedGameData = await lottery.gameData(previousGameId)
        } catch (error) {
            console.log('⚠️ Could not fetch completed game data')
            completedGameData = null
        }

        console.log('- Previous Game ID:', previousGameId.toString())
        if (completedGameData) {
            console.log('- Tickets Sold:', completedGameData.ticketsSold.toString())

            // Calculate total jackpot
            try {
                const ticketPrice = await lottery.ticketPrice()
                const totalJackpot = ticketPrice * completedGameData.ticketsSold
                console.log('- Total Jackpot:', ethers.formatEther(totalJackpot), 'ETH')
            } catch (priceError) {
                console.log('- Could not calculate total jackpot')
            }

            // Check for winning pick and calculate winning numbers
            if (completedGameData.winningPickId && completedGameData.winningPickId > 0n) {
                console.log('\n🎉 WINNING PICK SELECTED!')
                console.log('- Winning Pick ID:', completedGameData.winningPickId.toString())

                // Calculate winning numbers (assuming 6 numbers from 1-59 format)
                try {
                    const winningNumbers = []
                    let pickId = completedGameData.winningPickId

                    // Extract 6 numbers from the pick ID
                    for (let i = 0; i < 6; i++) {
                        const number = (pickId % 59n) + 1n
                        winningNumbers.unshift(number.toString()) // Add to front to get correct order
                        pickId = pickId / 59n
                    }

                    console.log('- Winning Numbers: [' + winningNumbers.join(', ') + ']')
                    console.log('- Numbers drawn from random value:', '0x' + randomness.toString(16))
                } catch (calcError) {
                    console.log('- Could not calculate winning numbers from pick ID')
                }
            } else {
                console.log('\n⚪ No winning pick (no tickets sold or special case)')
            }
        }

        // Check if there are any claimable winnings for the caller
        try {
            const claimable = await lottery.claimable(deployer.address)
            if (claimable > 0n) {
                console.log('\n💰 You have winnings to claim!')
                console.log('- Claimable amount:', ethers.formatEther(claimable), 'ETH')
                console.log('- Use lottery.claim() to collect your winnings')
            }
        } catch (claimError) {
            // claimable function might not exist or revert - that's ok
        }

        // Show new game state
        console.log('\n📊 Post-Draw Lottery State:')
        console.log('- Current Game ID:', newGameInfo.id.toString())
        console.log('- Current State:', ['Nonexistent', 'Purchase', 'DrawPending', 'Dead'][newGameInfo.state])

        if (newGameInfo.state === 1n) {
            console.log('✅ Lottery draw completed successfully!')
            console.log('   New game has automatically started and is accepting tickets.')
        } else if (newGameInfo.state === 0n) {
            console.log('⚪ Lottery has ended (no new game started)')
        } else if (newGameInfo.state === 2n) {
            console.log('⚠️ Unexpected: Still in DrawPending state')
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