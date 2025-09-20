import { LOOTERY_ABI } from "@/abi/Lootery";
import { CONTRACT_ADDRESS } from "@/config";
import { getNowInSeconds } from "@/lib/time";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { readContractsQueryOptions } from "wagmi/query";

export function useGameData({
  gameId,
  refetchInterval,
}: {
  gameId: bigint;
  refetchInterval?: number;
}) {
  const config = useConfig();
  const options = readContractsQueryOptions(config, {
    contracts: [
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "jackpot",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "isApocalypseMode",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "isGameActive",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "gamePeriod",
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "gameData",
        args: [gameId],
      },
      {
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "accruedCommunityFees",
      },
    ] as const,
    allowFailure: false,
  });

  const { data, ...rest } = useSuspenseQuery({
    ...options,
    refetchInterval,
  });

  const [
    jackpot,
    isApocalypseMode,
    isActive,
    roundDuration,
    gameData,
    accruedCommunityFees,
  ] = data;

  const [ticketsSold, startedAt, winningPickId] = gameData;

  const roundEndTime = startedAt + roundDuration;
  const roundHasEnded = BigInt(getNowInSeconds()) > roundEndTime;

  return {
    jackpot,
    ticketsSold,
    startedAt,
    winningPickId,
    isActive,
    isApocalypse: isApocalypseMode,
    roundDuration,
    roundEndTime,
    roundHasEnded,
    accruedCommunityFees,
    ...rest,
  };
}
