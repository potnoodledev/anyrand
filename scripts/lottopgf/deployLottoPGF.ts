import { ethers, ignition } from 'hardhat'
import { LooteryFactory__factory } from '../../typechain-types'
import { getDynamicConfig } from './config'
import LooteryImplModule from '../../ignition/modules/LooteryImplV1_9_0'
import LooteryFactoryModule from '../../ignition/modules/LooteryFactory'
import LooteryETHAdapterModule from '../../ignition/modules/LooteryETHAdapter'
import TicketSVGRendererModule from '../../ignition/modules/TicketSVGRenderer'
import { getAddress, ZeroAddress } from 'ethers'

export interface LottoPGFDeployment {
    looteryImpl: `0x${string}`
    looteryFactory: `0x${string}`
    ticketSVGRenderer: `0x${string}`
    looteryETHAdapter: `0x${string}`
    deploymentTimestamp: number
    deploymentBlock: number
    chainId: string
}

/**
 * Deploy all LottoPGF contracts
 * @param anyrandAddress Address of deployed Anyrand contract
 * @param network Network to deploy on
 * @returns Deployment information with contract addresses
 */
export async function deployLottoPGF(
    anyrandAddress: `0x${string}`,
    network: 'localhost' | 'scrollSepolia'
): Promise<LottoPGFDeployment> {
    console.log('Deploying LottoPGF contracts...')
    console.log(`Using Anyrand at: ${anyrandAddress}`)

    const [deployer] = await ethers.getSigners()
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)

    // Get network config with dynamic Anyrand address
    const config = getDynamicConfig(chainId.toString(), anyrandAddress)
    const { weth, owner, feeRecipient } = config

    console.log('Configuration:')
    console.log(`  Chain ID: ${chainId}`)
    console.log(`  Anyrand: ${anyrandAddress}`)
    console.log(`  WETH: ${weth}`)
    console.log(`  Owner: ${owner || 'deployer'}`)
    console.log(`  Fee Recipient: ${feeRecipient || 'none'}`)

    // 1. Deploy TicketSVGRenderer
    console.log('\n1. Deploying TicketSVGRenderer...')
    const { ticketSVGRenderer } = await ignition.deploy(TicketSVGRendererModule)
    const ticketSVGRendererAddress = await ticketSVGRenderer.getAddress()
    console.log(`   ✅ TicketSVGRenderer deployed at: ${ticketSVGRendererAddress}`)

    // 2. Deploy Lootery Implementation
    console.log('\n2. Deploying Lootery Implementation...')
    const { looteryImpl } = await ignition.deploy(LooteryImplModule)
    const looteryImplAddress = await looteryImpl.getAddress()
    console.log(`   ✅ LooteryImpl deployed at: ${looteryImplAddress}`)

    // 3. Deploy LooteryFactory with initialization
    console.log('\n3. Deploying LooteryFactory...')
    const factoryInitData = LooteryFactory__factory.createInterface().encodeFunctionData('init', [
        looteryImplAddress,
        anyrandAddress,
        ticketSVGRendererAddress,
    ])

    const { looteryFactoryProxy } = await ignition.deploy(LooteryFactoryModule, {
        parameters: {
            LooteryFactory: {
                factoryInitData,
            },
        },
    })
    const looteryFactoryAddress = await looteryFactoryProxy.getAddress()
    console.log(`   ✅ LooteryFactory deployed at: ${looteryFactoryAddress}`)

    // 4. Deploy LooteryETHAdapter
    console.log('\n4. Deploying LooteryETHAdapter...')
    const { looteryEthAdapter } = await ignition.deploy(LooteryETHAdapterModule, {
        parameters: {
            LooteryETHAdapter: {
                weth,
            },
        },
    })
    const looteryETHAdapterAddress = await looteryEthAdapter.getAddress()
    console.log(`   ✅ LooteryETHAdapter deployed at: ${looteryETHAdapterAddress}`)

    // 5. Configure the factory
    console.log('\n5. Configuring LooteryFactory...')
    const looteryFactory = LooteryFactory__factory.connect(looteryFactoryAddress, deployer)

    // Set fee recipient if provided
    if (feeRecipient && feeRecipient !== ZeroAddress) {
        console.log(`   Setting fee recipient to: ${feeRecipient}`)
        await looteryFactory.setFeeRecipient(feeRecipient)
        console.log('   ✅ Fee recipient set')
    }

    // Transfer ownership if owner is specified and different from deployer
    if (owner && owner !== ZeroAddress && getAddress(owner) !== getAddress(deployer.address)) {
        console.log(`   Transferring ownership to: ${owner}`)
        const DEFAULT_ADMIN_ROLE = await looteryFactory.DEFAULT_ADMIN_ROLE()

        // Grant admin role to new owner
        await looteryFactory.grantRole(DEFAULT_ADMIN_ROLE, owner).then((tx) => tx.wait(1))
        console.log('   ✅ Admin role granted to new owner')

        // Verify the role was granted
        const hasRole = await looteryFactory.hasRole(DEFAULT_ADMIN_ROLE, owner)
        if (!hasRole) {
            throw new Error(`Failed to grant admin role to ${owner}`)
        }

        // Revoke admin role from deployer
        await looteryFactory.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address).then((tx) => tx.wait(1))
        console.log('   ✅ Admin role revoked from deployer')

        // Verify the role was revoked
        const deployerStillHasRole = await looteryFactory.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)
        if (deployerStillHasRole) {
            throw new Error(`Failed to revoke admin role from deployer`)
        }
    }

    // Get deployment block and timestamp
    const deploymentBlock = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(deploymentBlock)
    const deploymentTimestamp = block?.timestamp || Math.floor(Date.now() / 1000)

    console.log('\n✅ LottoPGF deployment complete!')

    return {
        looteryImpl: looteryImplAddress as `0x${string}`,
        looteryFactory: looteryFactoryAddress as `0x${string}`,
        ticketSVGRenderer: ticketSVGRendererAddress as `0x${string}`,
        looteryETHAdapter: looteryETHAdapterAddress as `0x${string}`,
        deploymentTimestamp,
        deploymentBlock,
        chainId: chainId.toString(),
    }
}

// Main function for standalone execution
async function main() {
    // This function is for standalone testing
    // In production, this will be called from quickstart scripts
    const anyrandAddress = process.env.ANYRAND_ADDRESS as `0x${string}`
    if (!anyrandAddress) {
        throw new Error('ANYRAND_ADDRESS environment variable not set')
    }

    const network = process.env.NETWORK as 'localhost' | 'scrollSepolia' || 'localhost'
    const deployment = await deployLottoPGF(anyrandAddress, network)

    console.log('\nDeployment summary:')
    console.log(JSON.stringify(deployment, null, 2))
}

// Only run main if this file is executed directly
if (require.main === module) {
    main()
        .then(() => {
            console.log('Deployment script completed')
            process.exit(0)
        })
        .catch((error) => {
            console.error('Deployment failed:', error)
            process.exit(1)
        })
}