import { ethers, ignition, run } from 'hardhat'
import { parseUnits } from 'ethers'
import { getDrandBeaconInfo } from '../lib/drand'
import { bn254 } from '@kevincharm/noble-bn254-drand'
import { Anyrand__factory } from '../typechain-types'
import Anyrand from '../ignition/modules/Anyrand'
import DrandBeacon from '../ignition/modules/DrandBeacon'
import GasStationEthereum from '../ignition/modules/GasStationEthereum'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

// This script deploys the Anyrand coordinator on a local hardhat node
// Launch a local hardhat node before running this script using `yarn hardhat node`

const REQUEST_PREMIUM_MULTIPLIER_BPS = 150_00n // 150% => 1.5x multiplier (=> 50% premium on top)
const MAX_CALLBACK_GAS_LIMIT = 7_500_000n
const MAX_DEADLINE_DELTA = 5n * 60n // 5 minutes
const MAX_FEE_PER_GAS = parseUnits('30', 'gwei') // gas lane

const DEPLOYMENT_VERSION = '1_0_0'

async function getDeploymentId() {
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
    return `chain-${chainId.toString()}-v${DEPLOYMENT_VERSION}`
}

async function wipeDeployment(deploymentId: string) {
    await fs.rm(path.resolve(__dirname, '../ignition/deployments', deploymentId), {
        recursive: true,
        force: true,
    })
}

async function main() {
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
    if (chainId !== 31337n) {
        throw new Error(`Unexpected chainid: ${chainId}`)
    }

    const deploymentId = await getDeploymentId()
    console.log(`Deployment ID: ${deploymentId}`)

    // Wipe any existing deployment
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
    console.log(`Drand beacon deployed at ${await drandBeacon.getAddress()}`)

    // Gas station
    const { gasStationEthereum } = await ignition.deploy(GasStationEthereum, {
        deploymentId,
    })

    // Anyrand coordinator
    const factoryInitData = Anyrand__factory.createInterface().encodeFunctionData('init', [
        await drandBeacon.getAddress(),
        REQUEST_PREMIUM_MULTIPLIER_BPS,
        MAX_CALLBACK_GAS_LIMIT,
        MAX_DEADLINE_DELTA,
        await gasStationEthereum.getAddress(),
        MAX_FEE_PER_GAS,
    ])
    const { proxy } = await ignition.deploy(Anyrand, {
        deploymentId,
        parameters: {
            Anyrand: {
                factoryInitData,
            },
        },
    })
    console.log(`Anyrand upgradeable proxy deployed at ${await proxy.getAddress()}`)

    const [deployer] = await ethers.getSigners()
    const anyrand = Anyrand__factory.connect(await proxy.getAddress(), deployer)

    // Transfer ownership/admin rights to another account (defaults to deployer)
    // const NEW_ADMIN = '0x'
    // await anyrand.transferOwnership(NEW_ADMIN).then((tx) => tx.wait(1))
    // console.log(`Anyrand ownership transferred to ${NEW_ADMIN}`)
    // assert(
    //     getAddress(await anyrand.owner()) === NEW_ADMIN,
    //     'Anyrand owner is not multisig',
    // )

    // Sanity checks!
    assert(
        (await anyrand.nextRequestId()) === 1n,
        'Proxy not initialised properly? nextRequestId != 1',
    )

    // Update .env file with addresses while preserving existing variables
    const envPath = path.resolve(__dirname, '../.env')
    const addresses = {
        ANYRAND_LOCAL_ADDRESS: await proxy.getAddress(),
        BEACON_LOCAL_ADDRESS: await drandBeacon.getAddress(),
        GAS_STATION_LOCAL_ADDRESS: await gasStationEthereum.getAddress(),
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

        // Find existing non-local deployment variables first
        const processedKeys = new Set<string>()
        for (const line of envLines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('#') || trimmed === '') {
                // Keep comments and empty lines in their original position
                updatedLines.push(line)
            } else {
                const [key] = trimmed.split('=')
                if (key && !key.trim().endsWith('_LOCAL_ADDRESS')) {
                    // Keep non-local deployment variables
                    const cleanKey = key.trim()
                    if (envVars.has(cleanKey)) {
                        updatedLines.push(`${cleanKey}=${envVars.get(cleanKey)}`)
                        processedKeys.add(cleanKey)
                    }
                }
            }
        }

        // Add local deployment section
        const hasLocalSection = existingEnv.includes('# Local deployment addresses')
        if (!hasLocalSection && updatedLines.length > 0) {
            updatedLines.push('')
        }
        if (!hasLocalSection) {
            updatedLines.push('# Local deployment addresses (auto-generated by deployAnyrandLocal.ts)')
        }

        // Add local deployment addresses
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
        console.log(`- ANYRAND_LOCAL_ADDRESS=${addresses.ANYRAND_LOCAL_ADDRESS}`)
        console.log(`- BEACON_LOCAL_ADDRESS=${addresses.BEACON_LOCAL_ADDRESS}`)
        console.log(`- GAS_STATION_LOCAL_ADDRESS=${addresses.GAS_STATION_LOCAL_ADDRESS}`)
        console.log('\n✅ Existing environment variables preserved')
        console.log('Other scripts can now automatically use these addresses.')
    } catch (error) {
        console.log('\n⚠️  Warning: Could not update .env file:', error)
        console.log('You may need to manually copy addresses for other scripts.')
        console.log('\nAddresses to copy:')
        console.log(`ANYRAND_LOCAL_ADDRESS=${addresses.ANYRAND_LOCAL_ADDRESS}`)
        console.log(`BEACON_LOCAL_ADDRESS=${addresses.BEACON_LOCAL_ADDRESS}`)
        console.log(`GAS_STATION_LOCAL_ADDRESS=${addresses.GAS_STATION_LOCAL_ADDRESS}`)
    }

    // Cleanup deployment
    await wipeDeployment(deploymentId)
}

main()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
