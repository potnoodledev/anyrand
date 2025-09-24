import { ethers } from 'hardhat'
import { readLottoPGFAddresses } from './utils/envHandler'
import { createLotteryDemo, checkLotteryResults } from './utils/lottoPGFDemo'
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
    console.log('🎲 LottoPGF Standalone Test')
    console.log('==============================')

    // Load addresses
    const ANYRAND_ADDRESS = process.env.ANYRAND_LOCAL_ADDRESS
    if (!ANYRAND_ADDRESS) {
        throw new Error('ANYRAND_LOCAL_ADDRESS not found in .env')
    }

    const lottoPGFDeployment = readLottoPGFAddresses('localhost')
    if (!lottoPGFDeployment) {
        throw new Error('LottoPGF addresses not found. Please run the full quickstart first.')
    }

    console.log('Using addresses:')
    console.log('- Anyrand:', ANYRAND_ADDRESS)
    console.log('- LottoPGF Factory:', lottoPGFDeployment.looteryFactory)
    console.log('- LottoPGF ETH Adapter:', lottoPGFDeployment.looteryETHAdapter)

    try {
        // Test the complete LottoPGF flow
        const demoResult = await createLotteryDemo(
            lottoPGFDeployment as any,
            ANYRAND_ADDRESS as `0x${string}`
        )

        console.log('\n✅ LottoPGF Demo Completed Successfully!')
        console.log('Results:')
        console.log('- Lottery Address:', demoResult.lotteryAddress)
        console.log('- Ticket ID:', demoResult.ticketId)
        console.log('- Your Numbers:', demoResult.ticketNumbers.join(', '))
        console.log('- Game ID:', demoResult.gameId)
        console.log('- Randomness Requested:', demoResult.randomnessRequested)

    } catch (error) {
        console.error('❌ LottoPGF test failed:', error instanceof Error ? error.message : error)
        process.exit(1)
    }
}

main().catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
})