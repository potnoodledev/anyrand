/**
 * Providers Component
 *
 * Wraps the application with all necessary providers including Wagmi,
 * TanStack Query, Reown AppKit, and Toast providers.
 */

'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId } from '../lib/wagmi';
import { networks } from '../lib/networks';
import { ToastProvider, ToastViewport } from './ui/toast';
import { queryClient } from '../lib/queryClient';

// Create the modal outside of the component to prevent recreation
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: networks[0],
  metadata: {
    name: 'Anyrand',
    description: 'Verifiable randomness for smart contracts',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://anyrand.io',
    icons: ['/favicon.ico'],
  },
  features: {
    analytics: true,
    email: false,
    socials: [],
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-color-mix': '#00D2FF',
    '--w3m-color-mix-strength': 20,
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}