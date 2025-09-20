import { LOOTERY_ABI } from "@/abi/Lootery";
import { CONTRACT_ADDRESS } from "@/config";
import { useGameData } from "@/hooks/useGameData";
import { useSuspenseQuery } from "@tanstack/react-query";
import { isAddressEqual, zeroAddress, type Address } from "viem";
import { useConfig } from "wagmi";
import {
  readContractQueryOptions,
  readContractsQueryOptions,
} from "wagmi/query";

export function useTicketClaimStatuses({
  address,
  ticketIds,
  gameId,
}: {
  address?: Address;
  ticketIds: bigint[];
  gameId: bigint;
}) {
  const { winningPickId, isApocalypse, isActive } = useGameData({
    gameId,
  });
  const config = useConfig();
  const ticketOwnerOptions = readContractsQueryOptions(config, {
    contracts: ticketIds.map(
      (ticketId) =>
        ({
          abi: LOOTERY_ABI,
          address: CONTRACT_ADDRESS,
          functionName: "ownerOf",
          args: [ticketId],
        }) as const,
    ),
  });

  const { data: ticketOwnerData, refetch: refetchTicketOwners } =
    useSuspenseQuery(ticketOwnerOptions);

  const ticketPickIdOptions = readContractsQueryOptions(config, {
    contracts: ticketIds.map(
      (ticketId) =>
        ({
          abi: LOOTERY_ABI,
          address: CONTRACT_ADDRESS,
          functionName: "purchasedTickets",
          args: [ticketId],
        }) as const,
    ),
  });

  const { data: ticketPickIdData, refetch: refetchTicketPickIds } =
    useSuspenseQuery(ticketPickIdOptions);

  const numWinnersInGameOptions = readContractQueryOptions(config, {
    abi: LOOTERY_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "numWinnersInGame",
    args: [gameId, winningPickId],
  });

  const { data: numWinnersInGameData } = useSuspenseQuery(
    numWinnersInGameOptions,
  );

  const gameHasWinners = numWinnersInGameData > 0;

  const claimStatuses = ticketIds.reduce(
    (_, tokenId, index) => {
      const owner = ticketOwnerData.at(index)?.result;
      const pickId = ticketPickIdData.at(index)?.result?.[1];

      const isOwner = !!address && !!owner && isAddressEqual(owner, address);
      const hasBeenClaimed = !!owner && isAddressEqual(owner, zeroAddress);
      const isApocalypseConsolationWinner =
        isApocalypse && !isActive && !gameHasWinners;
      const isJackpotWinner = pickId === winningPickId;
      const isWinner = isApocalypseConsolationWinner || isJackpotWinner;

      return _.set(tokenId, {
        isOwner,
        hasBeenClaimed,
        isWinner,
        isApocalypseWinner: isApocalypseConsolationWinner,
        isJackpotWinner,
      });
    },
    new Map<
      bigint,
      {
        isOwner: boolean;
        hasBeenClaimed: boolean;
        isWinner: boolean;
        isApocalypseWinner: boolean;
        isJackpotWinner: boolean;
      }
    >(),
  );

  return {
    claimStatuses,
    refetch: async () =>
      Promise.allSettled([refetchTicketOwners(), refetchTicketPickIds()]),
  };
}
