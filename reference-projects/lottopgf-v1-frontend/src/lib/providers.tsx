"use client";

import { CHAIN, METADATA } from "@/config";
import { projectId, wagmiAdapter } from "@/lib/wagmi";
import { createAppKit } from "@reown/appkit/react";
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useTheme } from "next-themes";
import { useLayoutEffect, type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { hashFn } from "wagmi/query";

if (!projectId) throw new Error("WalletConnect Project ID is not defined");

const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [CHAIN],
  allowUnsupportedChain: false,
  projectId,
  metadata: {
    name: METADATA.name,
    description: METADATA.description,
    url: METADATA.url,
    icons: [METADATA.icon],
  },
  features: {
    analytics: false,
  },
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: hashFn,
        retry: false,
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: State | undefined;
}) {
  const queryClient = getQueryClient();

  const { resolvedTheme } = useTheme();

  useLayoutEffect(() => {
    if (resolvedTheme !== undefined) {
      appKit.setThemeMode("dark" === resolvedTheme ? "dark" : "light");
    }
  }, [resolvedTheme]);

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
