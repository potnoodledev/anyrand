/**
 * Contract ABIs Index
 *
 * Exports all contract ABIs used in the Anyrand frontend application
 */

export { anyrandAbi } from './anyrand';

// Re-export for convenience
export const abis = {
  anyrand: anyrandAbi,
} as const;

// Type helpers for ABI usage
export type AbiName = keyof typeof abis;
export type AnyrandAbi = typeof anyrandAbi;