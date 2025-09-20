import { LOOTERY_ABI } from "@/abi/Lootery";
import { CONTRACT_ADDRESS } from "@/config";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { readContractsQueryOptions } from "wagmi/query";

export function useGameConfig() {
  const config = useConfig();
  const options = readContractsQueryOptions(config, {
    contracts: [
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "maxBallValue",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "pickLength",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "gamePeriod",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "ticketPrice",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "prizeToken",
      },
    ] as const,
    allowFailure: false,
  });

  const { data, ...rest } = useSuspenseQuery({
    ...options,
    // Data is immutable, we can cache forever
    staleTime: Infinity,
  });

  const [maxBallValue, pickLength, gamePeriod, ticketPrice, prizeToken] = data;

  return {
    maxBallValue,
    pickLength,
    gamePeriod,
    ticketPrice,
    prizeToken,
    ...rest,
  };
}
