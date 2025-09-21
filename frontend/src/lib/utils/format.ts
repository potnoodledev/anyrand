/**
 * Utility functions for formatting addresses and other data
 */

/**
 * Truncate an Ethereum address for display
 */
export function truncateAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return '';

  if (address.length <= startLength + endLength) {
    return address;
  }

  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Format a display name from ENS name or address
 */
export function formatDisplayName(
  address: string,
  ensName?: string | null,
  truncateLength?: number
): string {
  if (ensName) {
    return ensName;
  }

  if (truncateLength) {
    return truncateAddress(address, truncateLength, truncateLength);
  }

  return truncateAddress(address);
}

/**
 * Format wei values to Ether with specified decimal places
 */
export function formatEther(
  wei: bigint,
  decimals: number = 4
): string {
  const ether = Number(wei) / 1e18;
  return ether.toFixed(decimals);
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}