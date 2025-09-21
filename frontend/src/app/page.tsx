'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { formatDisplayName } from '@/lib/utils/format';

export default function Home() {
  const { isConnected, address } = useAccount();

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Anyrand
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Verifiable randomness service for Web3 applications
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <ConnectButton size="lg" />
        </div>

        {isConnected && address && (
          <div className="mt-8">
            <p className="text-sm text-muted-foreground">
              Connected as: {formatDisplayName(address)}
            </p>
          </div>
        )}

        <div className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Phase 1: Wallet Authentication
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            This is the initial implementation focusing on secure wallet connection and session management.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-card p-6 text-card-foreground">
              <h3 className="font-semibold">✅ Wallet Connection</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Connect securely using WalletConnect/Reown protocol
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-card-foreground">
              <h3 className="font-semibold">✅ Session Persistence</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Stay connected across browser sessions
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-card-foreground">
              <h3 className="font-semibold">✅ Network Validation</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Automatic network switching and validation
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}