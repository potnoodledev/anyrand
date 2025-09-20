import { TicketClaimButton } from "@/components/TicketClaimButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumbersList } from "@/components/WinningNumbers";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useTicketClaimStatuses } from "@/hooks/useTicketClaimStatuses";
import { useTickets } from "@/hooks/useTickets";
import { useAppKit } from "@reown/appkit/react";
import { AlertTriangleIcon, PartyPopperIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { useAccount } from "wagmi";

export function Tickets({ gameId }: { gameId: bigint }) {
  const { gameId: currentGameId } = useCurrentGame();
  const { open } = useAppKit();
  const { address } = useAccount();
  const { tickets, hasWon, refetch } = useTicketsWithClaimStatus({
    address,
    gameId,
  });

  const isPreviousGame = gameId === currentGameId - 1n;
  const isPastGame = gameId < currentGameId;
  const congratulationsAlert = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasWon && isPreviousGame) {
      toast.message("Congratulations! You have won!", {
        icon: <PartyPopperIcon className="h-4 w-4" />,
        description: "Claim your prize now.",
        action: {
          label: "Claim",
          onClick: () =>
            congratulationsAlert.current?.scrollIntoView({ block: "start" }),
        },
      });
    }
  }, [hasWon, isPreviousGame]);

  if (!tickets) {
    return (
      <p>
        <button
          type="button"
          className="underline underline-offset-2 hover:no-underline"
          onClick={() => open()}
        >
          Connect your wallet
        </button>{" "}
        to view tickets.
      </p>
    );
  }

  if (!tickets.length) {
    return <p>You don&apos;t have any tickets in this draw.</p>;
  }

  return (
    <div className="space-y-4">
      {hasWon &&
        (isPreviousGame ? (
          <Alert ref={congratulationsAlert}>
            <PartyPopperIcon className="h-4 w-4" />
            <div />
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <AlertTitle>Congratulations! You have won!</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Claim your prize by clicking the button below.</p>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ) : (
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <div />
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <AlertTitle>You won in this draw!</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>But didn&apos;t claim your prize in time. Sorry!</p>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      <div className="grid gap-6 sm:grid-cols-2">
        {tickets
          .sort((ticket) => (ticket.claimStatus?.isWinner === true ? -1 : 1))
          .map((ticket) => {
            if (!ticket.claimStatus?.isOwner) return null;

            return (
              <Card key={ticket.tokenId}>
                <CardHeader>
                  <div className="space-y-4">
                    <CardTitle>Ticket #{ticket.tokenId}</CardTitle>
                    <NumbersList numbers={ticket.pick} />
                    {ticket.claimStatus?.hasBeenClaimed ? (
                      <p className="text-muted-foreground">Claimed</p>
                    ) : ticket.claimStatus.isWinner ? (
                      <TicketClaimButton
                        tokenId={BigInt(ticket.tokenId)}
                        onClaim={() => refetch()}
                      />
                    ) : (
                      isPastGame && (
                        <p className="py-3.5 text-sm text-muted-foreground">
                          This ticket did not win
                        </p>
                      )
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

export function TicketsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <TicketSkeleton />
      <TicketSkeleton />
      <TicketSkeleton />
    </div>
  );
}

function TicketSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <CardDescription>
              <Skeleton className="block w-[100px]">&nbsp;</Skeleton>
            </CardDescription>
            <CardTitle>
              <Skeleton className="block w-[140px]">&nbsp;</Skeleton>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function useTicketsWithClaimStatus({
  address,
  gameId,
}: {
  address: Address | undefined;
  gameId: bigint;
}) {
  const { tickets } = useTickets({
    address,
    gameId,
  });

  const { claimStatuses, refetch } = useTicketClaimStatuses({
    gameId,
    ticketIds: tickets?.map((ticket) => BigInt(ticket.tokenId)) ?? [],
    address,
  });

  const ticketsWithClaimStatus = tickets?.map((ticket) => {
    const claimStatus = claimStatuses.get(BigInt(ticket.tokenId));
    return { ...ticket, claimStatus };
  });

  const hasWon = !!ticketsWithClaimStatus?.some(
    (ticket) => ticket.claimStatus?.isWinner,
  );

  return {
    tickets: ticketsWithClaimStatus,
    hasWon,
    refetch,
  };
}
