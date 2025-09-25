import { ethers } from 'hardhat'

async function main() {
    const lotteryAddress = '0x58151e5288828b93C22D1beFA0b5997c20797b6e'

    console.log('🔍 VRF Debug Analysis')
    console.log('='.repeat(40))
    console.log('Lottery Address:', lotteryAddress)

    const [deployer] = await ethers.getSigners()

    // Extended ABI to check VRF configuration
    const lotteryABI = [
        'function draw() external payable',
        'function getRequestPrice() external view returns (uint256)',
        'function currentGame() external view returns (tuple(uint8 state, uint248 id))',
        'function gameData(uint256 gameId) external view returns (tuple(uint64 ticketsSold, uint64 startedAt, uint256 winningPickId))',
        'function gamePeriod() external view returns (uint256)',
        'function jackpot() external view returns (uint256)',
        'function owner() external view returns (address)',
        // VRF related functions
        'function vrfCoordinator() external view returns (address)',
        'function keyHash() external view returns (bytes32)',
        'function subscriptionId() external view returns (uint64)',
        'function callbackGasLimit() external view returns (uint32)',
        'function requestConfirmations() external view returns (uint16)',
        'function numWords() external view returns (uint32)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    try {
        console.log('\n📊 Basic Lottery Info:')
        const currentGameInfo = await lottery.currentGame()
        const gameData = await lottery.gameData(currentGameInfo.id)
        const owner = await lottery.owner()
        const requestPrice = await lottery.getRequestPrice()

        console.log('- Owner:', owner)
        console.log('- Game State:', currentGameInfo.state.toString())
        console.log('- Tickets Sold:', gameData.ticketsSold.toString())
        console.log('- Request Price:', ethers.formatEther(requestPrice), 'ETH')

        console.log('\n🎯 VRF Configuration:')
        try {
            const vrfCoordinator = await lottery.vrfCoordinator()
            console.log('- VRF Coordinator:', vrfCoordinator)
        } catch (e) {
            console.log('- VRF Coordinator: Cannot retrieve')
        }

        try {
            const keyHash = await lottery.keyHash()
            console.log('- Key Hash:', keyHash)
        } catch (e) {
            console.log('- Key Hash: Cannot retrieve')
        }

        try {
            const subscriptionId = await lottery.subscriptionId()
            console.log('- Subscription ID:', subscriptionId.toString())
        } catch (e) {
            console.log('- Subscription ID: Cannot retrieve')
        }

        try {
            const callbackGasLimit = await lottery.callbackGasLimit()
            console.log('- Callback Gas Limit:', callbackGasLimit.toString())
        } catch (e) {
            console.log('- Callback Gas Limit: Cannot retrieve')
        }

        try {
            const requestConfirmations = await lottery.requestConfirmations()
            console.log('- Request Confirmations:', requestConfirmations.toString())
        } catch (e) {
            console.log('- Request Confirmations: Cannot retrieve')
        }

        // Try to directly decode the revert reason from a failed call
        console.log('\n🔧 Testing draw with detailed error analysis:')

        try {
            const tx = await lottery.draw.populateTransaction({
                value: requestPrice * 10n,
                gasLimit: 500000
            })

            console.log('Transaction data:', tx.data)

            // Try to estimate gas first
            const gasEstimate = await ethers.provider.estimateGas({
                to: lotteryAddress,
                data: tx.data,
                value: requestPrice * 10n,
                from: deployer.address
            })
            console.log('Gas estimate:', gasEstimate.toString())

        } catch (gasError: any) {
            console.log('❌ Gas estimation failed:', gasError.message)

            if (gasError.data) {
                console.log('Error data:', gasError.data)

                // Try to decode the error data
                const errorData = gasError.data
                if (typeof errorData === 'string' && errorData.startsWith('0x')) {
                    console.log('Raw error data:', errorData)

                    // Try common error selectors
                    const commonErrors = {
                        '0x08c379a0': 'Error(string)', // Standard revert with message
                        '0x4e487b71': 'Panic(uint256)', // Panic errors
                        '0x7e273289': 'Unauthorized()',
                        '0xe2517d3f': 'InvalidCaller()',
                        '0xf7760f25': 'TransferFailed()',
                        '0xd1f28288': 'Addr()',
                        '0x8a4068dd': 'InsufficientBalance()',
                    }

                    const selector = errorData.slice(0, 10)
                    console.log('Error selector:', selector)

                    if (commonErrors[selector as keyof typeof commonErrors]) {
                        console.log('Possible error:', commonErrors[selector as keyof typeof commonErrors])

                        if (selector === '0x08c379a0' && errorData.length > 10) {
                            // Try to decode string message
                            try {
                                const message = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + errorData.slice(10))
                                console.log('Error message:', message[0])
                            } catch (e) {
                                console.log('Could not decode error message')
                            }
                        }

                        if (selector === '0x4e487b71' && errorData.length > 10) {
                            // Try to decode panic code
                            try {
                                const panicCode = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], '0x' + errorData.slice(10))
                                console.log('Panic code:', panicCode[0].toString())

                                const panicReasons = {
                                    '0x00': 'Generic panic',
                                    '0x01': 'Assert failed',
                                    '0x11': 'Arithmetic overflow/underflow',
                                    '0x12': 'Division by zero',
                                    '0x21': 'Invalid enum value',
                                    '0x22': 'Invalid storage byte array access',
                                    '0x31': 'Pop from empty array',
                                    '0x32': 'Array index out of bounds',
                                    '0x41': 'Out of memory',
                                    '0x51': 'Invalid internal function'
                                }

                                const panicHex = '0x' + panicCode[0].toString(16).padStart(2, '0')
                                if (panicReasons[panicHex as keyof typeof panicReasons]) {
                                    console.log('Panic reason:', panicReasons[panicHex as keyof typeof panicReasons])
                                }
                            } catch (e) {
                                console.log('Could not decode panic code')
                            }
                        }
                    }
                }
            }
        }

        // Check if we can simulate the draw on a fork
        console.log('\n🧪 Attempting simulation:')
        try {
            const result = await lottery.draw.staticCall({
                value: requestPrice * 10n,
                gasLimit: 1000000
            })
            console.log('Static call result:', result)
        } catch (simError: any) {
            console.log('❌ Simulation failed:', simError.message)
            console.log('Full error:', simError)
        }

    } catch (error: any) {
        console.error('❌ Debug script error:', error.message)
    }

    console.log('\n✅ Debug analysis complete!')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Fatal error:', error)
        process.exit(1)
    })