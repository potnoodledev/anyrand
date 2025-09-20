"use client";

import { CurrentTickets } from "@/components/CurrentTickets";
import { PreviousTickets } from "@/components/PreviousTickets";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { ErrorBoundary } from "react-error-boundary";

export function Tickets() {
  const { gameId } = useCurrentGame();

  return (
    <div className="mb-4 space-y-14">
      <ErrorBoundary fallback={<p>Error</p>}>
        <CurrentTickets />
      </ErrorBoundary>
      {gameId !== 0n && (
        <ErrorBoundary fallback={<p>Error</p>}>
          <PreviousTickets />
        </ErrorBoundary>
      )}
    </div>
  );
}
