import { ethers } from 'hardhat'

async function main() {
    // Get lottery address
    const lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS

    if (!lotteryAddress) {
        console.error('❌ Usage: yarn diagnose-lottery <lottery-address>')
        process.exit(1)
    }

    console.log('🔍 Diagnosing Lottery Draw Issues')
    console.log('='.repeat(70))
    console.log('Lottery:', lotteryAddress)

    const [deployer] = await ethers.getSigners()
    console.log('Diagnostics run by:', deployer.address)

    // Contract ABIs
    const lotteryABI = [
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function gamePeriod() external view returns (uint256)',
        'function owner() external view returns (address)',
        'function randomiser() external view returns (address)',
        'function getRequestPrice() external view returns (uint256)',
        'function callbackGasLimit() external view returns (uint256)',
        'function randomnessRequest() external view returns (tuple(uint208 requestId, uint48 timestamp))',
        'function isApocalypseMode() external view returns (bool)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    console.log('\n' + '='.repeat(70))
    console.log('📋 DIAGNOSTIC REPORT')
    console.log('='.repeat(70))

    // 1. Check game state
    console.log('\n1️⃣ GAME STATE CHECK')
    console.log('-'.repeat(40))

    let currentGameInfo, gameData
    try {
        currentGameInfo = await lottery.currentGame()
        gameData = await lottery.gameData(currentGameInfo.id)

        const stateNames = ['Nonexistent', 'Purchase', 'DrawPending', 'Dead']
        console.log('✅ Current Game ID:', currentGameInfo.id.toString())
        console.log('✅ Game State:', stateNames[currentGameInfo.state], `(${currentGameInfo.state})`)

        if (currentGameInfo.state !== 1n) {
            console.log('⚠️ ISSUE: Game is not in Purchase state!')
            console.log('   Solution: Wait for current state to resolve')

            if (currentGameInfo.state === 2n) {
                console.log('   Note: Draw is pending VRF fulfillment')

                // Check randomness request
                try {
                    const randomnessRequest = await lottery.randomnessRequest()
                    if (randomnessRequest.requestId > 0) {
                        const requestTime = Number(randomnessRequest.timestamp)
                        const currentTime = Math.floor(Date.now() / 1000)
                        const timeSinceRequest = currentTime - requestTime

                        console.log('   Request ID:', randomnessRequest.requestId.toString())
                        console.log('   Request Time:', new Date(requestTime * 1000).toLocaleString())
                        console.log('   Time Since Request:', timeSinceRequest, 'seconds')

                        if (timeSinceRequest > 3600) {
                            console.log('   ⚠️ Request is stale (>1 hour). Can call forceRedraw()')
                        }
                    }
                } catch {}
            } else if (currentGameInfo.state === 3n) {
                console.log('   Note: Lottery is dead (apocalypse mode activated)')
            }
        } else {
            console.log('✅ Game is in correct state for drawing')
        }
    } catch (error: any) {
        console.log('❌ Failed to get game state:', error.message)
    }

    // 2. Check timing
    console.log('\n2️⃣ TIMING CHECK')
    console.log('-'.repeat(40))

    try {
        const gamePeriod = await lottery.gamePeriod()
        const gameStartedAt = Number(gameData.startedAt)
        const drawScheduledAt = gameStartedAt + Number(gamePeriod)
        const currentTime = Math.floor(Date.now() / 1000)
        const timeToDraws = drawScheduledAt - currentTime

        console.log('✅ Game Started:', new Date(gameStartedAt * 1000).toLocaleString())
        console.log('✅ Game Period:', Number(gamePeriod) / 60, 'minutes')
        console.log('✅ Draw Scheduled:', new Date(drawScheduledAt * 1000).toLocaleString())
        console.log('✅ Current Time:', new Date(currentTime * 1000).toLocaleString())

        if (timeToDraws > 0) {
            console.log('⚠️ ISSUE: Game period not over yet!')
            console.log('   Time remaining:', Math.ceil(timeToDraws), 'seconds')
            console.log('   Solution: Wait until', new Date(drawScheduledAt * 1000).toLocaleString())
        } else {
            console.log('✅ Game period has expired, drawing is allowed')
        }
    } catch (error: any) {
        console.log('❌ Failed to check timing:', error.message)
    }

    // 3. Check tickets sold
    console.log('\n3️⃣ TICKETS CHECK')
    console.log('-'.repeat(40))

    const ticketsSold = gameData?.ticketsSold || 0n
    console.log('✅ Tickets Sold:', ticketsSold.toString())

    if (ticketsSold === 0n) {
        const isApocalypseMode = await lottery.isApocalypseMode().catch(() => false)
        if (isApocalypseMode) {
            console.log('⚠️ ISSUE: No tickets sold in apocalypse mode!')
            console.log('   This will cause draw() to revert with NoTicketsSold()')
            console.log('   Solution: Cannot draw in this state')
        } else {
            console.log('⚠️ WARNING: No tickets sold, draw will skip to next game')
        }
    } else {
        console.log('✅ Has tickets to draw winners from')
    }

    // 4. Check VRF configuration
    console.log('\n4️⃣ VRF CONFIGURATION CHECK')
    console.log('-'.repeat(40))

    let requestPrice = 0n
    try {
        const randomiser = await lottery.randomiser()
        console.log('✅ Randomiser:', randomiser)

        const callbackGasLimit = await lottery.callbackGasLimit()
        console.log('✅ Callback Gas Limit:', callbackGasLimit.toString())

        requestPrice = await lottery.getRequestPrice()
        console.log('✅ VRF Request Price:', ethers.formatEther(requestPrice), 'ETH')

        // Check if Anyrand is responding
        const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS
        if (ANYRAND_ADDRESS && randomiser.toLowerCase() === ANYRAND_ADDRESS.toLowerCase()) {
            console.log('✅ Using configured Anyrand coordinator')
        } else if (ANYRAND_ADDRESS) {
            console.log('⚠️ WARNING: Randomiser differs from configured Anyrand')
            console.log('   Expected:', ANYRAND_ADDRESS)
            console.log('   Actual:', randomiser)
        }
    } catch (error: any) {
        console.log('❌ Failed to get VRF configuration:', error.message)
        console.log('   This is likely the cause of draw() failure')
    }

    // 5. Check contract funding
    console.log('\n5️⃣ CONTRACT FUNDING CHECK')
    console.log('-'.repeat(40))

    const contractBalance = await ethers.provider.getBalance(lotteryAddress)
    console.log('✅ Contract ETH Balance:', ethers.formatEther(contractBalance), 'ETH')

    if (requestPrice > 0n) {
        if (contractBalance < requestPrice) {
            console.log('⚠️ ISSUE: Insufficient ETH for VRF request!')
            console.log('   Need:', ethers.formatEther(requestPrice), 'ETH')
            console.log('   Have:', ethers.formatEther(contractBalance), 'ETH')
            console.log('   Solution: Send', ethers.formatEther(requestPrice - contractBalance), 'ETH to contract')
        } else {
            const numDrawsPossible = contractBalance / requestPrice
            console.log('✅ Can afford', numDrawsPossible.toString(), 'draws')
        }
    }

    // 6. Check ownership
    console.log('\n6️⃣ OWNERSHIP CHECK')
    console.log('-'.repeat(40))

    try {
        const owner = await lottery.owner()
        console.log('✅ Contract Owner:', owner)
        console.log('✅ Caller is owner:', owner.toLowerCase() === deployer.address.toLowerCase())
        console.log('   Note: draw() is not owner-restricted, anyone can call it')
    } catch (error: any) {
        console.log('❌ Failed to check ownership:', error.message)
    }

    // 7. Attempt dry run
    console.log('\n7️⃣ DRY RUN SIMULATION')
    console.log('-'.repeat(40))

    if (currentGameInfo?.state === 1n && requestPrice > 0n) {
        try {
            console.log('Attempting staticCall simulation...')
            await lottery.draw.staticCall({
                value: requestPrice,
                from: deployer.address
            })
            console.log('✅ Simulation successful! draw() should work')
        } catch (error: any) {
            console.log('❌ Simulation failed:', error.message)

            // Try to decode error
            if (error.data) {
                const errorSelectors: { [key: string]: string } = {
                    '0x7c89e734': 'WaitLonger(uint256) - Game period not over',
                    '0x8b9e7347': 'UnexpectedState(uint8) - Wrong game state',
                    '0xdedb78e0': 'NoTicketsSold() - No tickets in apocalypse mode',
                    '0x9811e0c7': 'TransferFailed(address,uint256) - ETH transfer failed',
                    '0x3cfc1798': 'InsufficientOperationalFunds(uint256,uint256) - Not enough ETH'
                }

                const selector = error.data.slice(0, 10)
                if (errorSelectors[selector]) {
                    console.log('   Decoded:', errorSelectors[selector])
                }
            }
        }
    } else {
        console.log('⚠️ Cannot simulate: Prerequisites not met')
    }

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('📝 SUMMARY & RECOMMENDATIONS')
    console.log('='.repeat(70))

    const issues = []

    if (currentGameInfo?.state !== 1n) {
        issues.push('Game is not in Purchase state')
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const gameStartedAt = Number(gameData?.startedAt || 0)
    const gamePeriod = await lottery.gamePeriod().catch(() => 0n)
    const drawScheduledAt = gameStartedAt + Number(gamePeriod)

    if (currentTime < drawScheduledAt) {
        issues.push(`Wait ${drawScheduledAt - currentTime} seconds for game period to end`)
    }

    if (contractBalance < requestPrice && requestPrice > 0n) {
        issues.push(`Send ${ethers.formatEther(requestPrice - contractBalance)} ETH to contract`)
    }

    if (issues.length === 0) {
        console.log('✅ No issues found! The draw() function should work.')
        console.log('\nTo execute draw, run:')
        console.log(`./test-lottery-fixed.sh ${lotteryAddress}`)
    } else {
        console.log('⚠️ Issues found:')
        issues.forEach((issue, i) => {
            console.log(`${i + 1}. ${issue}`)
        })

        console.log('\n📌 Next Steps:')
        if (contractBalance < requestPrice && requestPrice > 0n) {
            console.log(`1. Fund the contract:`)
            console.log(`   yarn hardhat --config hardhat.config.scrollSepolia.ts --network scrollSepolia run scripts/fundLotteryForVRF.ts`)
        }
        if (currentTime < drawScheduledAt) {
            console.log(`2. Wait until ${new Date(drawScheduledAt * 1000).toLocaleString()}`)
        }
        if (currentGameInfo?.state === 2n) {
            console.log(`3. Wait for VRF fulfillment or call forceRedraw() if >1 hour`)
        }
    }

    console.log('\n' + '='.repeat(70))
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Fatal Error:', error)
        process.exit(1)
    })