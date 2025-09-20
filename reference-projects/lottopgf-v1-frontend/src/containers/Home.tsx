"use client";

import { Banner } from "@/components/Banner";
import { Footer } from "@/components/Footer";
import { LotteryStats, LotteryStatsSkeleton } from "@/components/LotteryStats";
import { PreviousTickets } from "@/components/PreviousTickets";
import { RoundEndAlert } from "@/components/RoundEndAlert";
import { TicketPurchase } from "@/components/TicketPurchase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WinnerAlert } from "@/components/WinnerAlert";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useGameData } from "@/hooks/useGameData";
import { AlertTriangleIcon } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export function Home() {
  const { gameState, gameId, refetch: refetchCurrentGame } = useCurrentGame();
  const {
    isActive,
    refetch: refetchGameData,
    roundHasEnded,
  } = useGameData({ gameId });

  if (!isActive) {
    return (
      <div className="mb-4 space-y-14">
        <div className="space-y-8">
          <Banner />
          <LotteryInactive />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-14">
      <div className="space-y-8">
        <Banner />

        {roundHasEnded && (
          <RoundEndAlert
            gameState={gameState}
            onDraw={() => {
              refetchCurrentGame();
            }}
            onGameFinalized={() => {
              refetchCurrentGame();
            }}
          />
        )}

        {gameId !== 0n && <WinnerAlert gameId={gameId - 1n} />}

        <ErrorBoundary fallback={<p>Error fetching lottery stats…</p>}>
          <Suspense fallback={<LotteryStatsSkeleton />}>
            <LotteryStats />
          </Suspense>
        </ErrorBoundary>
      </div>

      <ErrorBoundary fallback={<p>Error fetching tickets…</p>}>
        <TicketPurchase
          onPurchase={() => {
            refetchGameData();
          }}
        />
      </ErrorBoundary>

      <Footer />
    </div>
  );
}

function LotteryInactive() {
  return (
    <>
      <Alert>
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>Lottery is no longer active</AlertTitle>
        <AlertDescription>
          The lottery has ended and no longer accepts ticket purchases. <br />
          You can still view and redeem any previous tickets.
        </AlertDescription>
      </Alert>
      <ErrorBoundary fallback={<p>Error fetching previous tickets…</p>}>
        <PreviousTickets />
      </ErrorBoundary>
    </>
  );
}
