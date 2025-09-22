import { keccak256, getBytes } from 'viem'

/**
 * Generate a test BLS signature for frontend testing (browser-compatible fallback)
 * WARNING: This is for TESTNET DEMO ONLY and is not cryptographically secure!
 *
 * This function provides a deterministic signature based on the round and pubKeyHash
 * that works consistently in the browser environment without complex BLS library dependencies
 */
export async function generateTestnetBeaconSignature(
  round: bigint,
  pubKeyHash: string = '0xed6820c99270b1f84b30b0d2973ddd6a0f460fe9fc9dcd867dd909c1c1ac20f9'
): Promise<[bigint, bigint]> {
  // Create a deterministic but pseudo-random signature based on round and pubKeyHash
  // This approach ensures consistency while avoiding complex BLS library issues in browser

  // Combine round and pubKeyHash for deterministic input
  const roundBytes = getBytes(`0x${round.toString(16).padStart(16, '0')}` as `0x${string}`)
  const pubKeyBytes = getBytes(pubKeyHash as `0x${string}`)

  // Create combined input for hashing
  const combinedInput = new Uint8Array(roundBytes.length + pubKeyBytes.length)
  combinedInput.set(roundBytes, 0)
  combinedInput.set(pubKeyBytes, roundBytes.length)

  // Generate two deterministic hashes for signature components
  const hash1 = keccak256(combinedInput)
  const hash2 = keccak256(getBytes(hash1))

  // Convert hashes to signature components
  // Ensure they're valid field elements by taking modulo a large prime
  const signatureX = BigInt(hash1) % BigInt('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47')
  const signatureY = BigInt(hash2) % BigInt('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47')

  return [signatureX, signatureY]
}

/**
 * Calculate current DRAND round based on current time
 * Matches the approach used in quickstart script
 */
export function getCurrentDrandRound(): bigint {
  const currentTime = Math.floor(Date.now() / 1000)
  return BigInt(Math.floor(currentTime / 30)) // DRAND 30-second periods
}

/**
 * Calculate estimated timestamp for a given DRAND round
 * Based on DRAND beacon configuration
 */
export function getDrandRoundTimestamp(round: bigint, genesisTime: bigint = BigInt(1677685200), period: bigint = BigInt(30)): bigint {
  return genesisTime + (round - 1n) * period
}

/**
 * Check if a DRAND round is available (timestamp has passed)
 */
export function isDrandRoundAvailable(round: bigint): boolean {
  const roundTimestamp = getDrandRoundTimestamp(round)
  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  return currentTime >= roundTimestamp
}