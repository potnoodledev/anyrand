"use client";

import { Tickets, TicketsSkeleton } from "@/components/Tickets";
import { WinningNumbers } from "@/components/WinningNumbers";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

export function PreviousTickets() {
  const { gameId: currentGameId } = useCurrentGame();
  const [gameId, setGameId] = useState(currentGameId - 1n);

  useEffect(() => {
    setGameId(currentGameId - 1n);
  }, [currentGameId]);

  if (currentGameId === 0n) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
          Previous draw
        </h2>
        <Select
          value={gameId.toString()}
          onValueChange={(value) => setGameId(BigInt(value))}
        >
          <SelectTrigger className="w-[140px] tabular-nums">
            <SelectValue placeholder="Select a draw" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: Number(currentGameId) }).map((_, i) => (
              <SelectItem key={i} value={i.toString()} className="tabular-nums">
                Draw #{i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardHeader>
          <CardDescription>Winning numbers</CardDescription>
          <CardTitle>
            <div className="text-4xl font-bold tabular-nums">
              <ErrorBoundary fallbackRender={() => `Error`}>
                <Suspense
                  fallback={
                    <Skeleton className="block w-[100px]">&nbsp;</Skeleton>
                  }
                >
                  <WinningNumbers gameId={gameId} />
                </Suspense>
              </ErrorBoundary>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>
      <ErrorBoundary fallback={<p>Error</p>}>
        <Suspense fallback={<TicketsSkeleton />}>
          <Tickets gameId={gameId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
