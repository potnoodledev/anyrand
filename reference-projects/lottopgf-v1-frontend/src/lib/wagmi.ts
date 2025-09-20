import { CHAIN } from "@/config";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createConfig, createStorage, http } from "@wagmi/core";
import { createClient } from "viem";
import { mainnet } from "viem/chains";

export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
if (!projectId) throw new Error("WalletConnect Project ID is not defined");

export const wagmiAdapter = new WagmiAdapter({
  networks: [CHAIN],
  projectId,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export const ensConfig = createConfig({
  chains: [mainnet],
  client({ chain }) {
    return createClient({ chain, transport: http() });
  },
});
