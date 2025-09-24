import { ethers } from 'hardhat'
import { LooteryFactory__factory } from '../../typechain-types'
import { LottoPGFDeployment } from '../lottopgf/deployLottoPGF'
import { getDynamicConfig } from '../lottopgf/config'

/**
 * Verify that deployed LottoPGF contracts are functional
 * @param deployment Deployment information to verify
 * @param anyrandAddress Expected Anyrand address
 * @returns True if all checks pass, false otherwise
 */
export async function verifyLottoPGFDeployment(
    deployment: LottoPGFDeployment,
    anyrandAddress: `0x${string}`
): Promise<boolean> {
    console.log('Verifying LottoPGF deployment...')
    console.log('- Factory:', deployment.looteryFactory)
    console.log('- Implementation:', deployment.looteryImpl)
    console.log('- SVG Renderer:', deployment.ticketSVGRenderer)
    console.log('- ETH Adapter:', deployment.looteryETHAdapter)
    console.log('- Expected Anyrand:', anyrandAddress)

    try {
        const [deployer] = await ethers.getSigners()

        // 1. Check that factory contract exists and is responding
        console.log('\n1. Checking factory contract...')
        const factory = LooteryFactory__factory.connect(deployment.looteryFactory, deployer)

        // Verify factory has correct Anyrand address
        const factoryAnyrandAddress = await factory.anyrand()
        if (factoryAnyrandAddress.toLowerCase() !== anyrandAddress.toLowerCase()) {
            console.error(`❌ Factory's Anyrand address (${factoryAnyrandAddress}) doesn't match expected (${anyrandAddress})`)
            return false
        }
        console.log('✅ Factory has correct Anyrand address')

        // 2. Check that implementation is set
        console.log('\n2. Checking implementation...')
        const implementationAddress = await factory.implementation()
        if (implementationAddress.toLowerCase() !== deployment.looteryImpl.toLowerCase()) {
            console.error(`❌ Factory's implementation (${implementationAddress}) doesn't match deployed (${deployment.looteryImpl})`)
            return false
        }
        console.log('✅ Factory has correct implementation address')

        // 3. Check that SVG renderer is set
        console.log('\n3. Checking SVG renderer...')
        const rendererAddress = await factory.ticketSVGRenderer()
        if (rendererAddress.toLowerCase() !== deployment.ticketSVGRenderer.toLowerCase()) {
            console.error(`❌ Factory's renderer (${rendererAddress}) doesn't match deployed (${deployment.ticketSVGRenderer})`)
            return false
        }
        console.log('✅ Factory has correct SVG renderer address')

        // 4. Check that factory can create a lottery (simulation, don't actually create)
        console.log('\n4. Testing factory functionality...')
        try {
            // Get the current gas price for estimation
            const gasPrice = await ethers.provider.getGasPrice()

            // Get network configuration for WETH address
            const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
            const config = getDynamicConfig(chainId.toString(), anyrandAddress)

            // Prepare lottery creation parameters
            const name = 'Test Lottery'
            const symbol = 'TEST'
            const pickLength = 5
            const maxBallValue = 36
            const gamePeriod = 600 // 10 minutes (minimum required by contract)
            const ticketPrice = ethers.parseEther('0.01')
            const communityFeeBps = 5000 // 50%
            const prizeToken = config.weth !== ethers.ZeroAddress ? config.weth : '0x' + '1'.repeat(40) // Use WETH or dummy address for gas estimation
            const seedJackpotDelay = 1 // 1 second (minimum required)
            const seedJackpotMinValue = 1 // 1 wei (minimum required)

            // Estimate gas for creating a lottery
            const estimatedGas = await factory.create.estimateGas(
                name,
                symbol,
                pickLength,
                maxBallValue,
                gamePeriod,
                ticketPrice,
                communityFeeBps,
                prizeToken,
                seedJackpotDelay,
                seedJackpotMinValue
            )
            console.log(`✅ Factory can create lottery (estimated gas: ${estimatedGas.toString()})`)

        } catch (error) {
            console.error('❌ Factory cannot create lottery:', error instanceof Error ? error.message : error)
            return false
        }

        // 5. Check contract versions/type info
        console.log('\n5. Checking contract versions...')
        try {
            const factoryVersion = await factory.typeAndVersion()
            console.log(`✅ Factory version: ${factoryVersion}`)
        } catch (error) {
            console.log('ℹ️  Factory version not available (older version)')
        }

        // 6. Verify all addresses are valid contracts
        console.log('\n6. Verifying contract addresses...')
        const addresses = [
            { name: 'Factory', address: deployment.looteryFactory },
            { name: 'Implementation', address: deployment.looteryImpl },
            { name: 'SVG Renderer', address: deployment.ticketSVGRenderer },
            { name: 'ETH Adapter', address: deployment.looteryETHAdapter }
        ]

        for (const { name, address } of addresses) {
            const code = await ethers.provider.getCode(address)
            if (code === '0x') {
                console.error(`❌ ${name} at ${address} has no contract code`)
                return false
            }
            console.log(`✅ ${name} is a valid contract`)
        }

        console.log('\n🎉 All verification checks passed!')
        return true

    } catch (error) {
        console.error('❌ Verification failed with error:', error instanceof Error ? error.message : error)
        return false
    }
}

/**
 * Quick verification that checks basic connectivity to deployed contracts
 * @param deployment Deployment information
 * @returns True if basic checks pass
 */
export async function quickVerifyLottoPGF(deployment: LottoPGFDeployment): Promise<boolean> {
    try {
        const [deployer] = await ethers.getSigners()
        const factory = LooteryFactory__factory.connect(deployment.looteryFactory, deployer)

        // Just check that we can call a view function
        await factory.anyrand()
        return true
    } catch {
        return false
    }
}

/**
 * Verify that Anyrand is properly deployed and accessible
 * @param anyrandAddress Anyrand contract address
 * @returns True if Anyrand is accessible
 */
export async function verifyAnyrandDeployment(anyrandAddress: `0x${string}`): Promise<boolean> {
    try {
        const [deployer] = await ethers.getSigners()
        const anyrandCode = await ethers.provider.getCode(anyrandAddress)

        if (anyrandCode === '0x') {
            console.error(`❌ No contract code found at Anyrand address: ${anyrandAddress}`)
            return false
        }

        // Try to connect and call a view function
        const anyrandABI = [
            'function typeAndVersion() external view returns (string)',
            'function getRequestPrice(uint256 callbackGasLimit) external view returns (uint256, uint256)'
        ]

        const anyrand = new ethers.Contract(anyrandAddress, anyrandABI, deployer)

        try {
            const version = await anyrand.typeAndVersion()
            console.log(`✅ Anyrand connected: ${version}`)
        } catch {
            console.log('ℹ️  Anyrand connected (version info not available)')
        }

        // Test a basic function call
        await anyrand.getRequestPrice(100000)
        console.log('✅ Anyrand is responding to calls')

        return true
    } catch (error) {
        console.error('❌ Failed to verify Anyrand:', error instanceof Error ? error.message : error)
        return false
    }
}