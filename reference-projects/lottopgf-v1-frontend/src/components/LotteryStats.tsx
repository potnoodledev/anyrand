"use client";

import { Amount } from "@/components/Amount";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FUNDRAISE_TARGET,
  PRIZE_TOKEN_DECIMALS,
  PRIZE_TOKEN_TICKER,
} from "@/config";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useGameData } from "@/hooks/useGameData";
import { useTickets } from "@/hooks/useTickets";
import Link from "next/link";
import type { ReactNode } from "react";
import Countdown, { type CountdownRendererFn } from "react-countdown";
import { useAccount } from "wagmi";

const STATS_REFRESH_INTERVAL = 5000;
const SHOW_FUNDS_RAISED = false;

export function LotteryStats() {
  const { address } = useAccount();
  const { gameId } = useCurrentGame();
  const { jackpot, ticketsSold, roundEndTime, accruedCommunityFees } =
    useGameData({ gameId, refetchInterval: STATS_REFRESH_INTERVAL });
  const { tickets } = useTickets({
    address,
    gameId,
  });

  const numberOfTickets = tickets?.length ?? 0;

  const percentageRaised = FUNDRAISE_TARGET
    ? (accruedCommunityFees * 100n) / FUNDRAISE_TARGET
    : 0n;

  const renderer: CountdownRendererFn = ({
    days,
    hours,
    minutes,
    seconds,
    completed,
  }) => {
    return completed ? (
      <p>now</p>
    ) : (
      <span className="tabular-nums">
        {days ? `${days.toString().padStart(2, "0")}d ` : ""}
        {hours ? `${hours.toString().padStart(2, "0")}h ` : ""}
        {minutes.toString().padStart(2, "0")}m{" "}
        {!days ? `${seconds.toString().padStart(2, "0")}s ` : ""}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-6 sm:grid-cols-2">
        {SHOW_FUNDS_RAISED && (
          <Card>
            <CardHeader>
              <CardDescription>Amount raised</CardDescription>
              <CardTitle>
                <div>
                  <span className="text-3xl sm:text-5xl">
                    <Amount
                      value={accruedCommunityFees}
                      decimals={PRIZE_TOKEN_DECIMALS}
                    />
                  </span>{" "}
                  <span className="text-base text-muted-foreground">
                    {PRIZE_TOKEN_TICKER}
                  </span>
                </div>

                {!!FUNDRAISE_TARGET && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">of</span>{" "}
                    <span className="text-white">
                      <Amount
                        value={FUNDRAISE_TARGET}
                        decimals={PRIZE_TOKEN_DECIMALS}
                      />
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {PRIZE_TOKEN_TICKER}
                    </span>
                  </div>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Progress
                  className="h-3"
                  value={parseInt(percentageRaised.toString())}
                />
                <span className="text-sm tabular-nums text-foreground">
                  {percentageRaised.toLocaleString("en-US")}%
                </span>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardDescription>Jackpot</CardDescription>
            <CardTitle>
              <DetailsCardTitle>
                <Amount value={jackpot} decimals={PRIZE_TOKEN_DECIMALS} />
              </DetailsCardTitle>{" "}
              <span className="text-base text-muted-foreground">
                {PRIZE_TOKEN_TICKER}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Tickets in this draw</CardDescription>
            <CardTitle>
              <DetailsCardTitle>
                {ticketsSold.toLocaleString("en-US")}
              </DetailsCardTitle>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Draw in</CardDescription>
            <CardTitle>
              <DetailsCardTitle>
                <Countdown
                  renderer={renderer}
                  date={Number(roundEndTime) * 1000}
                />
              </DetailsCardTitle>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Your tickets</CardDescription>
            <CardTitle className="flex items-end justify-between">
              <DetailsCardTitle>{numberOfTickets}</DetailsCardTitle>{" "}
              <Link href="/tickets" className="text-base text-green-500">
                View your tickets &gt;
              </Link>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export function LotteryStatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-6 sm:grid-cols-2">
        {SHOW_FUNDS_RAISED && (
          <Card>
            <CardHeader>
              <CardDescription>Amount raised</CardDescription>
              <CardTitle>
                <div>
                  <span className="text-3xl sm:text-5xl">
                    <Skeleton>&nbsp;&nbsp;&nbsp;&nbsp;</Skeleton>
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardDescription>Jackpot</CardDescription>
            <CardTitle>
              <div>
                <span className="text-3xl sm:text-5xl">
                  <Skeleton>&nbsp;&nbsp;&nbsp;&nbsp;</Skeleton>
                </span>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Tickets in this draw</CardDescription>
            <CardTitle>
              <div>
                <span className="text-3xl sm:text-5xl">
                  <Skeleton>&nbsp;&nbsp;&nbsp;&nbsp;</Skeleton>
                </span>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Draw in</CardDescription>
            <CardTitle>
              <div>
                <span className="text-3xl sm:text-5xl">
                  <Skeleton>&nbsp;&nbsp;&nbsp;&nbsp;</Skeleton>
                </span>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Your tickets</CardDescription>
            <CardTitle>
              <div>
                <span className="text-3xl sm:text-5xl">
                  <Skeleton>&nbsp;&nbsp;&nbsp;&nbsp;</Skeleton>
                </span>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function DetailsCardTitle({ children }: { children: ReactNode }) {
  return (
    <span className="text-3xl font-bold sm:text-4xl lg:text-5xl">
      {children}
    </span>
  );
}
