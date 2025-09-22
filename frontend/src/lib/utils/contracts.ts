import { SUPPORTED_CHAINS } from '../constants';

/**
 * Check if contracts are deployed on a given chain
 */
export function isContractDeployed(chainId: number, contractName: 'anyrand' | 'beacon' | 'gasStation'): boolean {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  if (!chain) return false;

  const address = chain.contracts[contractName]?.address;
  return address !== undefined && address !== '0x0000000000000000000000000000000000000000';
}

/**
 * Check if all core contracts are deployed on a given chain
 */
export function areContractsDeployed(chainId: number): boolean {
  return (
    isContractDeployed(chainId, 'anyrand') &&
    isContractDeployed(chainId, 'beacon') &&
    isContractDeployed(chainId, 'gasStation')
  );
}

/**
 * Get contract address for a given chain and contract
 */
export function getContractAddress(chainId: number, contractName: 'anyrand' | 'beacon' | 'gasStation'): `0x${string}` | null {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  if (!chain) return null;

  const address = chain.contracts[contractName]?.address;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  return address;
}

/**
 * Get all deployed chains (chains with all contracts deployed)
 */
export function getDeployedChains() {
  return SUPPORTED_CHAINS.filter(chain => areContractsDeployed(chain.id));
}

/**
 * Get the default chain for the app (preferring deployed chains)
 */
export function getDefaultChain() {
  const deployedChains = getDeployedChains();

  // Prefer Scroll Sepolia if deployed, otherwise first deployed chain
  const scrollSepolia = deployedChains.find(chain => chain.id === 534351);
  if (scrollSepolia) return scrollSepolia;

  // Fall back to first deployed chain
  if (deployedChains.length > 0) return deployedChains[0];

  // If no chains have contracts deployed, fall back to Scroll Sepolia for wallet connection
  return SUPPORTED_CHAINS.find(chain => chain.id === 534351) || SUPPORTED_CHAINS[0];
}