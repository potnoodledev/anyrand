'use client';

import { createAppKit } from '@reown/appkit/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { WagmiProvider, type State } from 'wagmi';
import { ThemeProvider } from 'next-themes';
import { wagmiAdapter } from './wagmi';
import { SUPPORTED_CHAINS, APP_METADATA, WALLETCONNECT_PROJECT_ID } from './constants';
import { useLayoutEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Create AppKit instance
 */
const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...SUPPORTED_CHAINS],
  allowUnsupportedChain: false, // Strict chain validation
  projectId: WALLETCONNECT_PROJECT_ID!,
  metadata: APP_METADATA,
  features: {
    analytics: false, // Disabled for privacy
  },
});

/**
 * Create a client for React Query
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

/**
 * Theme synchronization component
 */
function ThemeSync() {
  const { resolvedTheme } = useTheme();

  useLayoutEffect(() => {
    if (resolvedTheme !== undefined) {
      appKit.setThemeMode(resolvedTheme === 'dark' ? 'dark' : 'light');
    }
  }, [resolvedTheme]);

  return null;
}

/**
 * Main providers component
 */
export function Providers({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          <ThemeSync />
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

export { appKit };