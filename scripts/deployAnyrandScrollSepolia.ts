import { ethers, ignition, run } from 'hardhat'
import { parseUnits } from 'ethers'
import { getDrandBeaconInfo } from '../lib/drand'
import { bn254 } from '@kevincharm/noble-bn254-drand'
import { Anyrand__factory } from '../typechain-types'
import Anyrand from '../ignition/modules/Anyrand'
import DrandBeacon from '../ignition/modules/DrandBeacon'
import GasStationScroll from '../ignition/modules/GasStationScroll'
import AnyrandConsumer from '../ignition/modules/AnyrandConsumer'
import fs from 'node:fs/promises'
import path from 'node:path'

const REQUEST_PREMIUM_MULTIPLIER_BPS = 5000n // 50%
const MAX_CALLBACK_GAS_LIMIT = 7_500_000n
const MAX_DEADLINE_DELTA = 5n * 60n // 5 minutes
const MAX_FEE_PER_GAS = parseUnits('50', 'gwei') // Sepolia gas can get crazy

const DEPLOYMENT_VERSION = '1_0_0-test_3' // Increment version to avoid conflicts

async function getDeploymentId() {
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
    const [deployer] = await ethers.getSigners()
    // Include deployer address in deployment ID to avoid account conflicts
    return `chain-${chainId.toString()}-v${DEPLOYMENT_VERSION}-${deployer.address.slice(2, 8)}`
}

async function wipeDeployment(deploymentId: string) {
    try {
        await fs.rm(path.resolve(__dirname, '../ignition/deployments', deploymentId), {
            recursive: true,
            force: true,
        })
        console.log(`Cleaned up previous deployment: ${deploymentId}`)
    } catch (error) {
        // Deployment directory doesn't exist, that's fine
    }
}

async function main() {
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
    if (chainId !== 534351n) {
        throw new Error(`Unexpected chainid: ${chainId}`)
    }

    const deploymentId = await getDeploymentId()
    console.log(`Deployment ID: ${deploymentId}`)

    // Clean up any existing deployment to avoid conflicts
    await wipeDeployment(deploymentId)

    // Beacon
    const evmnet = await getDrandBeaconInfo('evmnet')
    const publicKey = bn254.G2.ProjectivePoint.fromHex(evmnet.public_key).toAffine()
    const { drandBeacon } = await ignition.deploy(DrandBeacon, {
        deploymentId,
        parameters: {
            DrandBeacon: {
                publicKey: [publicKey.x.c0, publicKey.x.c1, publicKey.y.c0, publicKey.y.c1],
                genesisTimestamp: evmnet.genesis_time,
                period: evmnet.period,
            },
        },
    })

    // Gas station
    const { gasStationScroll } = await ignition.deploy(GasStationScroll, {
        deploymentId,
    })

    // Anyrand coordinator
    const factoryInitData = Anyrand__factory.createInterface().encodeFunctionData('init', [
        await drandBeacon.getAddress(),
        REQUEST_PREMIUM_MULTIPLIER_BPS,
        MAX_CALLBACK_GAS_LIMIT,
        MAX_DEADLINE_DELTA,
        await gasStationScroll.getAddress(),
        MAX_FEE_PER_GAS,
    ])
    const { proxy } = await ignition.deploy(Anyrand, {
        deploymentId,
        parameters: {
            Anyrand: {
                factoryInitData,
            },
        },
        strategy: 'create2',
        strategyConfig: {
            salt: '0x2Cb29742D951ec681BEb5d8E1FC0F5B7209ed019000000000000000000000001',
        },
    })
    console.log(`Anyrand upgradeable proxy deployed at ${await proxy.getAddress()}`)

    const { anyrandConsumer } = await ignition.deploy(AnyrandConsumer, {
        deploymentId,
        parameters: {
            AnyrandConsumer: {
                anyrand: await proxy.getAddress(),
            },
        },
    })
    console.log(`Anyrand consumer deployed at ${await anyrandConsumer.getAddress()}`)

    // Update .env file with addresses while preserving existing variables
    const envPath = path.resolve(__dirname, '../.env')
    const addresses = {
        ANYRAND_SCROLL_SEPOLIA_ADDRESS: await proxy.getAddress(),
        BEACON_SCROLL_SEPOLIA_ADDRESS: await drandBeacon.getAddress(),
        CONSUMER_SCROLL_SEPOLIA_ADDRESS: await anyrandConsumer.getAddress(),
        GAS_STATION_SCROLL_SEPOLIA_ADDRESS: await gasStationScroll.getAddress(),
    }

    try {
        // Read existing .env file if it exists
        let existingEnv = ''
        try {
            existingEnv = await fs.readFile(envPath, 'utf8')
        } catch (error) {
            // File doesn't exist, that's okay
        }

        // Parse existing environment variables
        const envLines = existingEnv.split('\n')
        const envVars = new Map<string, string>()

        for (const line of envLines) {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=')
                if (key && valueParts.length > 0) {
                    envVars.set(key.trim(), valueParts.join('=').trim())
                }
            }
        }

        // Update with new addresses
        for (const [key, value] of Object.entries(addresses)) {
            envVars.set(key, value)
        }

        // Rebuild .env content
        const updatedLines: string[] = []

        // Add header comment if this is a new file
        if (existingEnv === '') {
            updatedLines.push('# Anyrand Environment Variables')
            updatedLines.push('')
        }

        // Find existing non-scroll sepolia deployment variables first
        const processedKeys = new Set<string>()
        for (const line of envLines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('#') || trimmed === '') {
                // Keep comments and empty lines in their original position
                updatedLines.push(line)
            } else {
                const [key] = trimmed.split('=')
                if (key && !key.trim().endsWith('_SCROLL_SEPOLIA_ADDRESS')) {
                    // Keep non-scroll sepolia deployment variables
                    const cleanKey = key.trim()
                    if (envVars.has(cleanKey)) {
                        updatedLines.push(`${cleanKey}=${envVars.get(cleanKey)}`)
                        processedKeys.add(cleanKey)
                    }
                }
            }
        }

        // Add scroll sepolia deployment section
        const hasScrollSepoliaSection = existingEnv.includes('# Scroll Sepolia deployment addresses')
        if (!hasScrollSepoliaSection && updatedLines.length > 0) {
            updatedLines.push('')
        }
        if (!hasScrollSepoliaSection) {
            updatedLines.push('# Scroll Sepolia deployment addresses (auto-generated by deployAnyrandScrollSepolia.ts)')
        }

        // Add scroll sepolia deployment addresses
        for (const [key, value] of Object.entries(addresses)) {
            updatedLines.push(`${key}=${value}`)
            processedKeys.add(key)
        }

        // Add any remaining variables that weren't processed
        for (const [key, value] of envVars) {
            if (!processedKeys.has(key)) {
                updatedLines.push(`${key}=${value}`)
            }
        }

        // Write updated content
        const finalContent = updatedLines.join('\n') + '\n'
        await fs.writeFile(envPath, finalContent)

        console.log('\n✅ Contract addresses updated in .env file:')
        console.log(`- ANYRAND_SCROLL_SEPOLIA_ADDRESS=${addresses.ANYRAND_SCROLL_SEPOLIA_ADDRESS}`)
        console.log(`- BEACON_SCROLL_SEPOLIA_ADDRESS=${addresses.BEACON_SCROLL_SEPOLIA_ADDRESS}`)
        console.log(`- CONSUMER_SCROLL_SEPOLIA_ADDRESS=${addresses.CONSUMER_SCROLL_SEPOLIA_ADDRESS}`)
        console.log(`- GAS_STATION_SCROLL_SEPOLIA_ADDRESS=${addresses.GAS_STATION_SCROLL_SEPOLIA_ADDRESS}`)
        console.log('\n✅ Existing environment variables preserved')
        console.log('Other scripts can now automatically use these addresses.')
    } catch (error) {
        console.log('\n⚠️  Warning: Could not update .env file:', error)
        console.log('You may need to manually copy addresses for other scripts.')
        console.log('\nAddresses to copy:')
        console.log(`ANYRAND_SCROLL_SEPOLIA_ADDRESS=${addresses.ANYRAND_SCROLL_SEPOLIA_ADDRESS}`)
        console.log(`BEACON_SCROLL_SEPOLIA_ADDRESS=${addresses.BEACON_SCROLL_SEPOLIA_ADDRESS}`)
        console.log(`CONSUMER_SCROLL_SEPOLIA_ADDRESS=${addresses.CONSUMER_SCROLL_SEPOLIA_ADDRESS}`)
        console.log(`GAS_STATION_SCROLL_SEPOLIA_ADDRESS=${addresses.GAS_STATION_SCROLL_SEPOLIA_ADDRESS}`)
    }

    // Verify all contracts on Etherscan
    console.log('\nVerifying contracts on Etherscan...')
    try {
        await run(
            {
                scope: 'ignition',
                task: 'verify',
            },
            {
                deploymentId,
            },
        )
        console.log('✅ Contract verification completed')
    } catch (error) {
        console.log('⚠️  Contract verification failed (this is normal if contracts are already verified)')
        console.log('Error:', error.message)
    }

    // Clean up deployment files after successful deployment
    await wipeDeployment(deploymentId)
    console.log('✅ Deployment completed and cleaned up')
}

main()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
