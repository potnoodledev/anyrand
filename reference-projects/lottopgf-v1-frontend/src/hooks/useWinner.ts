import { LOOTERY_ABI } from "@/abi/Lootery";
import { CONTRACT_ADDRESS } from "@/config";
import { useGameData } from "@/hooks/useGameData";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ContractFunctionExecutionError } from "viem";
import { useConfig } from "wagmi";
import { readContractsQueryOptions } from "wagmi/query";

export function useWinner({ gameId }: { gameId: bigint }) {
  const config = useConfig();

  const { winningPickId, isApocalypse, isActive } = useGameData({ gameId });

  const isOverWithApocalypse = isApocalypse && !isActive;

  const readContractsOptions = readContractsQueryOptions(config, {
    contracts: Array.from(
      { length: 10 },
      (_, i) =>
        ({
          abi: LOOTERY_ABI,
          address: CONTRACT_ADDRESS,
          functionName: "tokenByPickIdentity",
          args: [gameId, winningPickId, BigInt(i)],
        }) as const,
    ),
  });

  const { data: rawWinningIds } = useSuspenseQuery({
    ...readContractsOptions,
    queryFn: async (params) => {
      if (winningPickId) {
        try {
          return await readContractsOptions.queryFn(params);
        } catch (error) {
          if (error instanceof ContractFunctionExecutionError) {
            return null;
          }

          throw error;
        }
      }

      return null;
    },
  });

  let winningIds = rawWinningIds
    ?.filter((response) => response.status === "success")
    .map((response) => response.result);

  const ownerOptions = readContractsQueryOptions(config, {
    contracts: winningIds?.map(
      (id) =>
        ({
          abi: LOOTERY_ABI,
          address: CONTRACT_ADDRESS,
          functionName: "ownerOf",
          args: [id],
        }) as const,
    ),
  });

  const { data: rawWinningAddresses, ...rest } = useSuspenseQuery({
    ...ownerOptions,
    queryFn: (params) => (winningIds ? ownerOptions.queryFn(params) : null),
  });

  const winningAddresses = rawWinningAddresses
    ?.filter((response) => response.status === "success")
    .map((response) => response.result);

  return {
    ...rest,
    winningIds,
    winningAddresses,
    isApocalypse,
    isOverWithApocalypse,
  };
}
