"use client";

import { Tickets, TicketsSkeleton } from "@/components/Tickets";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useTickets } from "@/hooks/useTickets";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useAccount } from "wagmi";

export function CurrentTickets() {
  const { address } = useAccount();
  const { gameId } = useCurrentGame();
  const { tickets } = useTickets({
    address,
    gameId,
  });

  const numberOfTickets = tickets?.length ?? 0;

  return (
    <div className="space-y-6">
      <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
        You bought {numberOfTickets}{" "}
        {numberOfTickets === 1 ? "ticket" : "tickets"} in the current draw
      </h2>

      <ErrorBoundary fallback={<p>Error</p>}>
        <Suspense fallback={<TicketsSkeleton />}>
          <Tickets gameId={gameId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
