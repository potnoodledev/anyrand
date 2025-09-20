import { LOOTERY_ABI } from "@/abi/Lootery";
import { CHAIN, CONTRACT_ADDRESS } from "@/config";
import {
  createPublicClient,
  createWalletClient,
  fallback,
  getContract,
  http,
  parseGwei,
  webSocket,
  type GetContractReturnType,
} from "viem";
import { scroll } from "viem/chains";

export const transport = fallback([
  webSocket(process.env.NEXT_PUBLIC_RPC_WS),
  http(process.env.NEXT_PUBLIC_RPC_HTTP, { batch: true }),
]);

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport,
});

export const walletClient = createWalletClient({
  chain: CHAIN,
  transport,
});

export const lootery: GetContractReturnType<
  typeof LOOTERY_ABI,
  { public: typeof publicClient; wallet: typeof walletClient },
  typeof CONTRACT_ADDRESS
> = getContract({
  address: CONTRACT_ADDRESS,
  abi: LOOTERY_ABI,
  client: {
    public: publicClient,
    wallet: walletClient,
  },
});

const SCROLL_MINIMUM_MAX_FEE_PER_GAS = parseGwei("0.3");

export async function estimateFeesPerGas() {
  let { maxFeePerGas, maxPriorityFeePerGas } =
    await publicClient.estimateFeesPerGas();

  if ((publicClient.chain.id as number) === scroll.id) {
    maxFeePerGas =
      maxFeePerGas < SCROLL_MINIMUM_MAX_FEE_PER_GAS
        ? SCROLL_MINIMUM_MAX_FEE_PER_GAS
        : maxFeePerGas;
  }

  return { maxFeePerGas, maxPriorityFeePerGas };
}
