import { keccak256 } from 'viem'
import { bn254 } from '@kevincharm/noble-bn254-drand'

/**
 * Fetch real DRAND signature from the evmnet beacon (like quickstart script)
 * This fetches actual cryptographically valid signatures instead of mock ones
 */
export async function generateTestnetBeaconSignature(
  round: bigint,
  pubKeyHash: string = '0xed6820c99270b1f84b30b0d2973ddd6a0f460fe9fc9dcd867dd909c1c1ac20f9'
): Promise<[bigint, bigint]> {
  try {
    console.log('Fetching real DRAND signature from evmnet beacon...')

    // Use the same approach as the quickstart script - fetch directly from DRAND API
    const drandUrl = `https://api.drand.sh/v2/beacons/evmnet/rounds/${round.toString()}`
    console.log('DRAND API URL:', drandUrl)

    const response = await fetch(drandUrl)
    if (!response.ok) {
      throw new Error(`DRAND API failed: ${response.status} ${response.statusText}`)
    }

    const drandData = await response.json()
    console.log('DRAND response:', drandData)

    if (!drandData.signature) {
      throw new Error('No signature in DRAND response')
    }

    // Parse the G1 point signature using bn254 from noble-bn254-drand (same as quickstart)
    const signatureHex = drandData.signature
    console.log('Raw DRAND signature hex:', signatureHex)

    // Parse using bn254 G1 point (exactly like quickstart script)
    const sigPoint = bn254.G1.ProjectivePoint.fromHex(signatureHex).toAffine()

    console.log('✅ Real DRAND signature decoded successfully')
    console.log('- Signature X:', '0x' + sigPoint.x.toString(16))
    console.log('- Signature Y:', '0x' + sigPoint.y.toString(16))

    return [sigPoint.x, sigPoint.y]

  } catch (error) {
    console.error('Failed to fetch real DRAND signature:', error)
    console.log('⚠️ WARNING: Falling back to mock signature - this will fail contract verification!')

    // Fallback to deterministic signature if DRAND API fails
    // This WILL fail contract verification but allows testing UI flow
    return generateDeterministicSignature(round, pubKeyHash)
  }
}

/**
 * Generate a deterministic mock signature as fallback
 * WARNING: This is NOT cryptographically valid and will likely fail contract verification
 */
function generateDeterministicSignature(
  round: bigint,
  pubKeyHash: string
): [bigint, bigint] {
  // Create deterministic input from round and pubKeyHash
  const roundHex = round.toString(16).padStart(16, '0')
  const pubKeyHex = pubKeyHash.startsWith('0x') ? pubKeyHash.slice(2) : pubKeyHash
  const combinedHex = roundHex + pubKeyHex

  // Generate deterministic hashes
  const hash1 = keccak256(`0x${combinedHex}` as `0x${string}`)
  const hash2 = keccak256(hash1)

  // Convert to signature components (modulo BN254 field prime)
  const signatureX = BigInt(hash1) % BigInt('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47')
  const signatureY = BigInt(hash2) % BigInt('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47')

  console.log('⚠️ Using deterministic mock signature (will likely fail verification)')
  console.log('- Mock Signature X:', '0x' + signatureX.toString(16))
  console.log('- Mock Signature Y:', '0x' + signatureY.toString(16))

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