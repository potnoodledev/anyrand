/**
 * TypeScript contracts for LottoPGF deployment functionality
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Network configuration for deployment
 */
export interface DeploymentConfig {
    /** Network chain ID */
    chainId: string;

    /** Address of deployed Anyrand contract */
    anyrandAddress: `0x${string}`;

    /** WETH contract address for the network */
    wethAddress: `0x${string}`;

    /** Optional owner address (defaults to deployer) */
    ownerAddress?: `0x${string}`;

    /** Optional fee recipient address */
    feeRecipient?: `0x${string}`;
}

/**
 * Deployed LottoPGF contract addresses
 */
export interface LottoPGFDeployment {
    /** Lootery implementation contract address */
    looteryImpl: `0x${string}`;

    /** LooteryFactory proxy contract address */
    looteryFactory: `0x${string}`;

    /** TicketSVGRenderer contract address */
    ticketSVGRenderer: `0x${string}`;

    /** ETH adapter contract address */
    looteryETHAdapter: `0x${string}`;

    /** Unix timestamp of deployment */
    deploymentTimestamp: number;

    /** Block number of deployment */
    deploymentBlock: number;

    /** Network chain ID */
    chainId: string;
}

/**
 * Complete Anyrand deployment information
 */
export interface AnyrandDeployment {
    /** Anyrand coordinator contract address */
    anyrandAddress: `0x${string}`;

    /** Drand beacon contract address */
    beaconAddress: `0x${string}`;

    /** Deployment block number */
    deploymentBlock: number;

    /** Network chain ID */
    chainId: string;
}

/**
 * Complete quickstart environment after deployment
 */
export interface QuickstartEnvironment {
    /** Anyrand contract deployment */
    anyrandDeployment: AnyrandDeployment;

    /** LottoPGF contract deployment */
    lottoPGFDeployment: LottoPGFDeployment;

    /** Optional consumer contract for testing */
    consumerAddress?: `0x${string}`;

    /** Network name */
    network: 'localhost' | 'scrollSepolia' | 'scroll' | 'base';

    /** Path to .env file with addresses */
    envFilePath: string;
}

/**
 * Deployment error information
 */
export interface DeploymentError {
    /** Stage where error occurred */
    stage: 'config' | 'anyrand' | 'lottopgf' | 'verification' | 'save';

    /** Error message */
    error: string;

    /** Additional error context */
    context: Record<string, any>;

    /** Whether deployment can be retried */
    recoverable: boolean;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Service for deploying LottoPGF contracts
 */
export interface ILottoPGFDeploymentService {
    /**
     * Deploy all LottoPGF contracts
     * @param config Deployment configuration
     * @returns Deployment result or error
     */
    deploy(config: DeploymentConfig): Promise<LottoPGFDeployment | DeploymentError>;

    /**
     * Verify deployed contracts are functional
     * @param deployment Deployment to verify
     * @returns True if valid, error otherwise
     */
    verify(deployment: LottoPGFDeployment): Promise<boolean | DeploymentError>;

    /**
     * Get deployment status
     * @param factoryAddress Factory contract address
     * @returns Deployment information if exists
     */
    getDeployment(factoryAddress: `0x${string}`): Promise<LottoPGFDeployment | null>;
}

/**
 * Service for managing quickstart environments
 */
export interface IQuickstartService {
    /**
     * Execute complete quickstart deployment
     * @param network Target network
     * @returns Complete environment or error
     */
    executeQuickstart(network: string): Promise<QuickstartEnvironment | DeploymentError>;

    /**
     * Load existing environment from .env
     * @param network Network to load
     * @returns Environment if exists
     */
    loadEnvironment(network: string): Promise<QuickstartEnvironment | null>;

    /**
     * Save environment to .env file
     * @param environment Environment to save
     * @returns Success or error
     */
    saveEnvironment(environment: QuickstartEnvironment): Promise<boolean | DeploymentError>;
}

/**
 * Service for validating addresses and configurations
 */
export interface IValidationService {
    /**
     * Validate Ethereum address format
     * @param address Address to validate
     */
    isValidAddress(address: string): boolean;

    /**
     * Validate deployment configuration
     * @param config Configuration to validate
     * @returns Valid or validation errors
     */
    validateConfig(config: DeploymentConfig): boolean | string[];

    /**
     * Check if Anyrand is deployed at address
     * @param address Address to check
     * @param chainId Chain to check on
     */
    isAnyrandDeployed(address: `0x${string}`, chainId: string): Promise<boolean>;
}

// ============================================================================
// Function Signatures
// ============================================================================

/**
 * Deploy LottoPGF contracts using Hardhat Ignition
 * @param signer Ethereum signer for deployment
 * @param config Deployment configuration
 * @returns Deployment result
 */
export type DeployLottoPGF = (
    signer: any, // ethers.Signer
    config: DeploymentConfig
) => Promise<LottoPGFDeployment>;

/**
 * Update quickstart script to include LottoPGF
 * @param scriptPath Path to quickstart script
 * @param network Target network
 * @returns Success status
 */
export type UpdateQuickstartScript = (
    scriptPath: string,
    network: 'local' | 'scrollSepolia'
) => Promise<boolean>;

/**
 * Read Anyrand deployment from environment
 * @param network Network name
 * @returns Anyrand deployment info
 */
export type ReadAnyrandDeployment = (
    network: string
) => Promise<AnyrandDeployment | null>;

/**
 * Write deployment addresses to .env file
 * @param deployment Deployment to save
 * @param network Network name
 * @returns Success status
 */
export type WriteDeploymentToEnv = (
    deployment: LottoPGFDeployment,
    network: string
) => Promise<boolean>;

// ============================================================================
// Event Types
// ============================================================================

/**
 * Deployment progress event
 */
export interface DeploymentProgressEvent {
    /** Current step */
    step: 'deploying_renderer' | 'deploying_impl' | 'deploying_factory' | 'deploying_adapter' | 'configuring' | 'verifying';

    /** Progress percentage */
    progress: number;

    /** Optional message */
    message?: string;
}

/**
 * Deployment complete event
 */
export interface DeploymentCompleteEvent {
    /** Deployment result */
    deployment: LottoPGFDeployment;

    /** Gas used for deployment */
    gasUsed: bigint;

    /** Total cost in ETH */
    totalCost: string;
}

// ============================================================================
// Constants
// ============================================================================

export const NETWORK_CONFIGS = {
    localhost: {
        chainId: '31337',
        wethAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    },
    scrollSepolia: {
        chainId: '534351',
        wethAddress: '0x5300000000000000000000000000000000000004' as `0x${string}`,
    },
    scroll: {
        chainId: '534352',
        wethAddress: '0x5300000000000000000000000000000000000004' as `0x${string}`,
    },
    base: {
        chainId: '8453',
        wethAddress: '0x4200000000000000000000000000000000000006' as `0x${string}`,
    },
} as const;

export const ENV_VARIABLE_NAMES = {
    anyrand: {
        local: 'ANYRAND_LOCAL_ADDRESS',
        scrollSepolia: 'ANYRAND_SCROLL_SEPOLIA_ADDRESS',
    },
    beacon: {
        local: 'BEACON_LOCAL_ADDRESS',
        scrollSepolia: 'BEACON_SCROLL_SEPOLIA_ADDRESS',
    },
    lottopgf: {
        factory: {
            local: 'LOTTOPGF_FACTORY_LOCAL_ADDRESS',
            scrollSepolia: 'LOTTOPGF_FACTORY_SCROLL_SEPOLIA_ADDRESS',
        },
        impl: {
            local: 'LOTTOPGF_IMPL_LOCAL_ADDRESS',
            scrollSepolia: 'LOTTOPGF_IMPL_SCROLL_SEPOLIA_ADDRESS',
        },
        renderer: {
            local: 'LOTTOPGF_RENDERER_LOCAL_ADDRESS',
            scrollSepolia: 'LOTTOPGF_RENDERER_SCROLL_SEPOLIA_ADDRESS',
        },
        adapter: {
            local: 'LOTTOPGF_ADAPTER_LOCAL_ADDRESS',
            scrollSepolia: 'LOTTOPGF_ADAPTER_SCROLL_SEPOLIA_ADDRESS',
        },
    },
} as const;