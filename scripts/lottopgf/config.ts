export interface Config {
    [chainId: string]: {
        anyrand: `0x${string}`
        weth: `0x${string}`
        owner?: `0x${string}`
        feeRecipient?: `0x${string}`
    }
}

export const config: Config = {
    '31337': {
        /** localhost hardhat */
        anyrand: '0x0000000000000000000000000000000000000000', // Will be replaced dynamically
        weth: '0x0000000000000000000000000000000000000000', // No WETH needed for local
        owner: undefined,
        feeRecipient: undefined,
    },
    '534351': {
        /** scroll sepolia */
        anyrand: '0xdFB68D4a5703bC99bEe0A8eb48fA12aBF1280aaC',
        weth: '0x5300000000000000000000000000000000000004',
        owner: '0xFDbdDD397b9B643C7c28e9AeFBA8751253A320a5',
        feeRecipient: '0xFDbdDD397b9B643C7c28e9AeFBA8751253A320a5',
    },
    '534352': {
        /** scroll mainnet */
        anyrand: '0x46CFe55bf2E5A02B738f5BBdc1bDEE9Dd22b5d39', // NB: This was the old Anyrand address, but corrected after deployment to 0x7ED45287f817842d72753FE02617629c4c7c2FBE
        weth: '0x5300000000000000000000000000000000000004',
        owner: '0xF9FCDf64160087Ac1610bB1366750D55043ef206',
        feeRecipient: '0xF9FCDf64160087Ac1610bB1366750D55043ef206',
    },
    '8453': {
        /** base */
        anyrand: '0xF6baf607AC2971EE6A3C47981E7176134628e36C',
        weth: '0x4200000000000000000000000000000000000006',
        owner: '0xF9FCDf64160087Ac1610bB1366750D55043ef206',
        feeRecipient: '0xF9FCDf64160087Ac1610bB1366750D55043ef206',
    },
}

/**
 * Get dynamic configuration with the ability to override Anyrand address
 * @param chainId The chain ID
 * @param anyrandAddress Optional Anyrand address to use instead of the default
 * @returns Configuration for the chain with optional overrides
 */
export function getDynamicConfig(
    chainId: string,
    anyrandAddress?: `0x${string}`
): Config[string] {
    const base = config[chainId]
    if (!base) {
        throw new Error(`No configuration found for chain ${chainId}`)
    }
    return {
        ...base,
        anyrand: anyrandAddress || base.anyrand,
    }
}
