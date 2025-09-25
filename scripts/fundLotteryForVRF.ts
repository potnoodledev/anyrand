import { ethers } from 'hardhat'

async function main() {
    // Get lottery address from command line or environment variable
    const lotteryAddress = process.argv[2] || process.env.TEST_LOTTERY_ADDRESS

    if (!lotteryAddress) {
        console.error('❌ Usage: Set TEST_LOTTERY_ADDRESS environment variable')
        console.error('   Or pass as argument: yarn fund-lottery 0x123...')
        process.exit(1)
    }

    console.log('💰 Funding Lottery for VRF Operations')
    console.log('='.repeat(50))

    const [deployer] = await ethers.getSigners()
    console.log('Funder:', deployer.address)

    // Get current balances
    const deployerBalance = await ethers.provider.getBalance(deployer.address)
    const lotteryBalance = await ethers.provider.getBalance(lotteryAddress)

    console.log('\n📊 Current Balances:')
    console.log('- Funder ETH:', ethers.formatEther(deployerBalance), 'ETH')
    console.log('- Lottery ETH:', ethers.formatEther(lotteryBalance), 'ETH')

    // Get VRF request price
    const lotteryABI = [
        'function getRequestPrice() external view returns (uint256)',
        'function callbackGasLimit() external view returns (uint256)',
        'function randomiser() external view returns (address)',
        'function owner() external view returns (address)'
    ]

    const lottery = new ethers.Contract(lotteryAddress, lotteryABI, deployer)

    try {
        const requestPrice = await lottery.getRequestPrice()
        const callbackGasLimit = await lottery.callbackGasLimit()
        const randomiser = await lottery.randomiser()
        const owner = await lottery.owner()

        console.log('\n🎲 VRF Configuration:')
        console.log('- Request Price:', ethers.formatEther(requestPrice), 'ETH')
        console.log('- Callback Gas Limit:', callbackGasLimit.toString())
        console.log('- Randomiser:', randomiser)
        console.log('- Lottery Owner:', owner)

        // Calculate recommended funding amount (enough for 10 draws)
        const recommendedAmount = requestPrice * 10n
        const minimumAmount = requestPrice * 2n

        console.log('\n💡 Funding Recommendations:')
        console.log('- Minimum (2 draws):', ethers.formatEther(minimumAmount), 'ETH')
        console.log('- Recommended (10 draws):', ethers.formatEther(recommendedAmount), 'ETH')

        if (lotteryBalance >= minimumAmount) {
            console.log('\n✅ Lottery has sufficient funds for at least',
                (lotteryBalance / requestPrice).toString(), 'draws')

            const userInput = await askQuestion('\nDo you want to add more funds anyway? (y/n): ')
            if (userInput.toLowerCase() !== 'y') {
                console.log('Skipping funding.')
                return
            }
        }

        // Determine funding amount
        let fundingAmount = minimumAmount
        if (lotteryBalance < requestPrice) {
            // If lottery has less than 1 draw worth, fund with minimum
            fundingAmount = minimumAmount
        } else {
            // Otherwise, top up to recommended amount
            fundingAmount = recommendedAmount > lotteryBalance
                ? recommendedAmount - lotteryBalance
                : minimumAmount
        }

        // Check if funder has enough balance
        if (deployerBalance < fundingAmount) {
            console.log('\n❌ Insufficient funder balance!')
            console.log('Need:', ethers.formatEther(fundingAmount), 'ETH')
            console.log('Have:', ethers.formatEther(deployerBalance), 'ETH')
            process.exit(1)
        }

        console.log('\n💸 Sending', ethers.formatEther(fundingAmount), 'ETH to lottery...')

        const tx = await deployer.sendTransaction({
            to: lotteryAddress,
            value: fundingAmount
        })

        console.log('Transaction submitted:', tx.hash)
        const receipt = await tx.wait()

        console.log('✅ Funding successful!')
        console.log('- Block:', receipt!.blockNumber)
        console.log('- Gas Used:', receipt!.gasUsed.toString())

        // Check new balance
        const newLotteryBalance = await ethers.provider.getBalance(lotteryAddress)
        console.log('\n📊 New Lottery Balance:', ethers.formatEther(newLotteryBalance), 'ETH')
        console.log('Can now perform', (newLotteryBalance / requestPrice).toString(), 'draws')

    } catch (error: any) {
        console.log('❌ Error:', error.message)

        // If getRequestPrice fails, try to check Anyrand directly
        if (error.message.includes('getRequestPrice')) {
            console.log('\n🔍 Checking Anyrand configuration directly...')

            const ANYRAND_ADDRESS = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS
            if (ANYRAND_ADDRESS) {
                const anyrandABI = [
                    'function getRequestPrice(uint256 callbackGasLimit) external view returns (uint256 totalPrice, uint256 effectiveFeePerGas)'
                ]
                const anyrand = new ethers.Contract(ANYRAND_ADDRESS, anyrandABI, deployer)

                try {
                    const [price] = await anyrand.getRequestPrice(500000) // Default callback gas
                    console.log('VRF Request Price:', ethers.formatEther(price), 'ETH')

                    // Fund with a reasonable amount
                    const fundingAmount = price * 5n // Fund for 5 draws

                    console.log('\n💸 Sending', ethers.formatEther(fundingAmount), 'ETH to lottery...')
                    const tx = await deployer.sendTransaction({
                        to: lotteryAddress,
                        value: fundingAmount
                    })
                    await tx.wait()
                    console.log('✅ Funding successful!')

                } catch (anyrandError: any) {
                    console.log('❌ Anyrand query failed:', anyrandError.message)

                    // Last resort: fund with a fixed amount
                    const fixedAmount = ethers.parseEther('0.01')
                    console.log('\n💸 Sending fallback amount:', ethers.formatEther(fixedAmount), 'ETH')

                    const tx = await deployer.sendTransaction({
                        to: lotteryAddress,
                        value: fixedAmount
                    })
                    await tx.wait()
                    console.log('✅ Funding successful!')
                }
            }
        }
    }
}

// Helper function to get user input
function askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        })

        readline.question(question, (answer: string) => {
            readline.close()
            resolve(answer)
        })
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })