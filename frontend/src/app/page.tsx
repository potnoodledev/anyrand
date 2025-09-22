'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { AccountDisplay } from '@/components/wallet/AccountDisplay';
import { NetworkSelector } from '@/components/wallet/NetworkSelector';
import { ChainValidationDialog } from '@/components/wallet/ChainValidationDialog';

export default function Home() {
  const { isConnected } = useAccount();

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

        {isConnected && (
          <div className="mt-8 space-y-4">
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:justify-center">
              <AccountDisplay showBalance showAvatar />
              <NetworkSelector />
            </div>
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

          {isConnected && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Demo Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="font-medium mb-2">Account Information</h4>
                  <AccountDisplay showBalance showAvatar />
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="font-medium mb-2">Network Selector</h4>
                  <NetworkSelector />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chain validation dialog */}
      <ChainValidationDialog />
    </main>
  );
}