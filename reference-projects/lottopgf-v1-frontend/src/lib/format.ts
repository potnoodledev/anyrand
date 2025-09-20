import type { Address } from "viem";

export function formatAddress(address?: Address, length: number = 4) {
  if (!address) return null;
  return `${address.slice(0, length + 2)}…${address.slice(-length)}`;
}
