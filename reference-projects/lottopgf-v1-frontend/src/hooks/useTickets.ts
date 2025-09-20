import { CONTRACT_ADDRESS, GRAPHQL_API } from "@/config";
import { useSuspenseQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import type { Address } from "viem";

const ticketsQuery = gql`
  query tickets($gameId: String!, $whomst: String!) {
    tickets(where: { whomstId: $whomst, gameId: $gameId }) {
      items {
        tokenId
        pick
      }
    }
  }
`;

interface TicketsData {
  tickets: {
    items: {
      tokenId: string;
      pick: number[];
    }[];
  };
}

export function useTickets({
  address,
  gameId,
  apiEndpoint = GRAPHQL_API,
  lotteryId = CONTRACT_ADDRESS,
}: {
  address: Address | undefined;
  gameId: bigint | undefined;
  apiEndpoint?: string;
  lotteryId?: Address;
}) {
  const { data, ...rest } = useSuspenseQuery<TicketsData | null>({
    queryKey: [
      "tickets",
      { lotteryId, apiEndpoint, address, gameId: gameId?.toString() },
    ],
    queryFn: async () => {
      if (!address) return null;

      return request(apiEndpoint, ticketsQuery, {
        gameId: `${lotteryId}-${gameId?.toString()}`,
        whomst: address,
      });
    },
    retry: false,
  });

  const tickets = data?.tickets.items;

  return {
    ...rest,
    data,
    tickets,
  };
}
