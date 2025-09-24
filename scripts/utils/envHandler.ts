import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { LottoPGFDeployment } from '../lottopgf/deployLottoPGF'

// Load existing environment variables
dotenv.config()

/**
 * Get the path to the .env file
 */
function getEnvPath(): string {
    return path.resolve(process.cwd(), '.env')
}

/**
 * Read the current .env file content
 */
function readEnvFile(): string {
    const envPath = getEnvPath()
    if (!fs.existsSync(envPath)) {
        return ''
    }
    return fs.readFileSync(envPath, 'utf-8')
}

/**
 * Write content to the .env file
 */
function writeEnvFile(content: string): void {
    const envPath = getEnvPath()
    fs.writeFileSync(envPath, content, 'utf-8')
}

/**
 * Update or add an environment variable in the .env file
 */
function updateEnvVariable(key: string, value: string): void {
    let envContent = readEnvFile()
    const lines = envContent.split('\n')

    // Check if the variable already exists
    const existingLineIndex = lines.findIndex(line => {
        const trimmed = line.trim()
        return trimmed.startsWith(`${key}=`) || trimmed.startsWith(`#${key}=`)
    })

    const newLine = `${key}=${value}`

    if (existingLineIndex >= 0) {
        // Update existing variable
        lines[existingLineIndex] = newLine
    } else {
        // Add new variable
        // Add before the last empty line if it exists, otherwise at the end
        if (lines[lines.length - 1] === '') {
            lines.splice(lines.length - 1, 0, newLine)
        } else {
            lines.push(newLine)
        }
    }

    envContent = lines.join('\n')
    writeEnvFile(envContent)
}

/**
 * Save LottoPGF deployment addresses to .env file
 * @param deployment LottoPGF deployment information
 * @param network Network name (localhost, scrollSepolia, etc.)
 */
export function saveLottoPGFAddresses(
    deployment: LottoPGFDeployment,
    network: string
): void {
    console.log(`\nSaving LottoPGF addresses to .env for network: ${network}`)

    // Convert network name to uppercase for env variable naming
    const networkKey = network.toUpperCase().replace(/[^A-Z0-9]/g, '_')

    // Save each contract address
    updateEnvVariable(`LOTTOPGF_FACTORY_${networkKey}_ADDRESS`, deployment.looteryFactory)
    updateEnvVariable(`LOTTOPGF_IMPL_${networkKey}_ADDRESS`, deployment.looteryImpl)
    updateEnvVariable(`LOTTOPGF_RENDERER_${networkKey}_ADDRESS`, deployment.ticketSVGRenderer)
    updateEnvVariable(`LOTTOPGF_ADAPTER_${networkKey}_ADDRESS`, deployment.looteryETHAdapter)

    // Save deployment metadata
    updateEnvVariable(`LOTTOPGF_${networkKey}_BLOCK`, deployment.deploymentBlock.toString())
    updateEnvVariable(`LOTTOPGF_${networkKey}_TIMESTAMP`, deployment.deploymentTimestamp.toString())

    console.log('✅ LottoPGF addresses saved to .env')
}

/**
 * Read Anyrand address from environment variables
 * @param network Network name (localhost, scrollSepolia, etc.)
 * @returns Anyrand address if found, null otherwise
 */
export function readAnyrandAddress(network: string): `0x${string}` | null {
    // Convert network name to uppercase for env variable naming
    const networkKey = network.toUpperCase().replace(/[^A-Z0-9]/g, '_')

    // Try different possible env variable names
    const possibleKeys = [
        `ANYRAND_${networkKey}_ADDRESS`,
        `ANYRAND_${networkKey}`,
        `${networkKey}_ANYRAND_ADDRESS`,
        `${networkKey}_ANYRAND`,
    ]

    for (const key of possibleKeys) {
        const value = process.env[key]
        if (value && value.startsWith('0x')) {
            console.log(`Found Anyrand address in ${key}: ${value}`)
            return value as `0x${string}`
        }
    }

    // Special case for localhost - also check LOCAL
    if (network.toLowerCase() === 'localhost') {
        const localAddress = process.env.ANYRAND_LOCAL_ADDRESS || process.env.LOCAL_ANYRAND_ADDRESS
        if (localAddress && localAddress.startsWith('0x')) {
            console.log(`Found Anyrand address for localhost: ${localAddress}`)
            return localAddress as `0x${string}`
        }
    }

    // Special case for scrollSepolia - also check SCROLL_SEPOLIA
    if (network.toLowerCase() === 'scrollsepolia') {
        const scrollSepoliaAddress = process.env.ANYRAND_SCROLL_SEPOLIA_ADDRESS || process.env.SCROLL_SEPOLIA_ANYRAND_ADDRESS
        if (scrollSepoliaAddress && scrollSepoliaAddress.startsWith('0x')) {
            console.log(`Found Anyrand address for Scroll Sepolia: ${scrollSepoliaAddress}`)
            return scrollSepoliaAddress as `0x${string}`
        }
    }

    console.log(`No Anyrand address found for network: ${network}`)
    return null
}

/**
 * Read Beacon address from environment variables
 * @param network Network name (localhost, scrollSepolia, etc.)
 * @returns Beacon address if found, null otherwise
 */
export function readBeaconAddress(network: string): `0x${string}` | null {
    // Convert network name to uppercase for env variable naming
    const networkKey = network.toUpperCase().replace(/[^A-Z0-9]/g, '_')

    // Try different possible env variable names
    const possibleKeys = [
        `BEACON_${networkKey}_ADDRESS`,
        `BEACON_${networkKey}`,
        `${networkKey}_BEACON_ADDRESS`,
        `${networkKey}_BEACON`,
    ]

    for (const key of possibleKeys) {
        const value = process.env[key]
        if (value && value.startsWith('0x')) {
            console.log(`Found Beacon address in ${key}: ${value}`)
            return value as `0x${string}`
        }
    }

    // Special case for localhost - also check LOCAL
    if (network.toLowerCase() === 'localhost') {
        const localAddress = process.env.BEACON_LOCAL_ADDRESS || process.env.LOCAL_BEACON_ADDRESS
        if (localAddress && localAddress.startsWith('0x')) {
            console.log(`Found Beacon address for localhost: ${localAddress}`)
            return localAddress as `0x${string}`
        }
    }

    // Special case for scrollSepolia - also check SCROLL_SEPOLIA
    if (network.toLowerCase() === 'scrollsepolia') {
        const scrollSepoliaAddress = process.env.BEACON_SCROLL_SEPOLIA_ADDRESS || process.env.SCROLL_SEPOLIA_BEACON_ADDRESS
        if (scrollSepoliaAddress && scrollSepoliaAddress.startsWith('0x')) {
            console.log(`Found Beacon address for Scroll Sepolia: ${scrollSepoliaAddress}`)
            return scrollSepoliaAddress as `0x${string}`
        }
    }

    console.log(`No Beacon address found for network: ${network}`)
    return null
}

/**
 * Save Anyrand deployment addresses to .env file
 * @param anyrandAddress Anyrand contract address
 * @param beaconAddress Beacon contract address
 * @param network Network name (localhost, scrollSepolia, etc.)
 */
export function saveAnyrandAddresses(
    anyrandAddress: `0x${string}`,
    beaconAddress: `0x${string}`,
    network: string
): void {
    console.log(`\nSaving Anyrand addresses to .env for network: ${network}`)

    // Convert network name to uppercase for env variable naming
    const networkKey = network.toUpperCase().replace(/[^A-Z0-9]/g, '_')

    // Special handling for common network names
    if (network.toLowerCase() === 'localhost' || network.toLowerCase() === 'local') {
        updateEnvVariable('ANYRAND_LOCAL_ADDRESS', anyrandAddress)
        updateEnvVariable('BEACON_LOCAL_ADDRESS', beaconAddress)
    } else if (network.toLowerCase() === 'scrollsepolia' || network.toLowerCase() === 'scroll-sepolia') {
        updateEnvVariable('ANYRAND_SCROLL_SEPOLIA_ADDRESS', anyrandAddress)
        updateEnvVariable('BEACON_SCROLL_SEPOLIA_ADDRESS', beaconAddress)
    } else {
        // Generic naming for other networks
        updateEnvVariable(`ANYRAND_${networkKey}_ADDRESS`, anyrandAddress)
        updateEnvVariable(`BEACON_${networkKey}_ADDRESS`, beaconAddress)
    }

    console.log('✅ Anyrand addresses saved to .env')
}

/**
 * Read LottoPGF deployment addresses from .env file
 * @param network Network name (localhost, scrollSepolia, etc.)
 * @returns LottoPGF deployment information if found, null otherwise
 */
export function readLottoPGFAddresses(network: string): Partial<LottoPGFDeployment> | null {
    // Convert network name to uppercase for env variable naming
    const networkKey = network.toUpperCase().replace(/[^A-Z0-9]/g, '_')

    const factory = process.env[`LOTTOPGF_FACTORY_${networkKey}_ADDRESS`] as `0x${string}` | undefined
    const impl = process.env[`LOTTOPGF_IMPL_${networkKey}_ADDRESS`] as `0x${string}` | undefined
    const renderer = process.env[`LOTTOPGF_RENDERER_${networkKey}_ADDRESS`] as `0x${string}` | undefined
    const adapter = process.env[`LOTTOPGF_ADAPTER_${networkKey}_ADDRESS`] as `0x${string}` | undefined

    if (!factory || !impl || !renderer || !adapter) {
        return null
    }

    return {
        looteryFactory: factory,
        looteryImpl: impl,
        ticketSVGRenderer: renderer,
        looteryETHAdapter: adapter,
        deploymentBlock: parseInt(process.env[`LOTTOPGF_${networkKey}_BLOCK`] || '0'),
        deploymentTimestamp: parseInt(process.env[`LOTTOPGF_${networkKey}_TIMESTAMP`] || '0'),
    }
}