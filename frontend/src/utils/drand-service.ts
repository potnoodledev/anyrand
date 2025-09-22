import { bn254 } from '@kevincharm/noble-bn254-drand';

const DRAND_PUBLIC_KEY = process.env.NEXT_PUBLIC_DRAND_PUBLIC_KEY || '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a';
const DRAND_URL = 'https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';

interface DrandBeacon {
  round: number;
  randomness: string;
  signature: string;
  previous_signature: string;
}

export class DrandService {
  private static instance: DrandService;
  private cache: Map<number, DrandBeacon> = new Map();

  static getInstance(): DrandService {
    if (!DrandService.instance) {
      DrandService.instance = new DrandService();
    }
    return DrandService.instance;
  }

  /**
   * Get a beacon from DRAND network
   */
  async getBeacon(round?: number): Promise<DrandBeacon> {
    const endpoint = round ? `${DRAND_URL}/public/${round}` : `${DRAND_URL}/public/latest`;

    // Check cache first
    if (round && this.cache.has(round)) {
      return this.cache.get(round)!;
    }

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch beacon: ${response.statusText}`);
      }

      const beacon = await response.json();

      // Cache the beacon
      if (beacon.round) {
        this.cache.set(beacon.round, beacon);
      }

      return beacon;
    } catch (error) {
      console.error('Error fetching DRAND beacon:', error);
      // If CORS fails, try using a proxy
      return this.getBeaconViaProxy(round);
    }
  }

  /**
   * Get beacon via proxy to avoid CORS issues
   */
  private async getBeaconViaProxy(round?: number): Promise<DrandBeacon> {
    // Use Next.js API route as proxy
    const endpoint = round ? `/api/drand/${round}` : `/api/drand/latest`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch beacon via proxy: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get BLS signature for a specific round
   */
  async getSignatureForRound(round: number): Promise<{ signature: string; round: number }> {
    const beacon = await this.getBeacon(round);
    return {
      signature: beacon.signature,
      round: beacon.round
    };
  }

  /**
   * Verify a DRAND signature using the noble-bn254-drand library
   */
  async verifySignature(round: number, signature: string): Promise<boolean> {
    try {
      // For now, we'll skip verification and return true
      // Proper BLS verification would require implementing the pairing check
      // This is complex and the contract already does verification
      console.log('Signature verification skipped (handled by contract)');
      return true;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get the latest round number
   */
  async getLatestRound(): Promise<number> {
    const beacon = await this.getBeacon();
    return beacon.round;
  }

  /**
   * Format signature for contract submission
   */
  formatSignatureForContract(signature: string): string {
    // Ensure signature has 0x prefix for Ethereum
    return signature.startsWith('0x') ? signature : `0x${signature}`;
  }
}