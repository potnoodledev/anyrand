import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useWinner } from "@/hooks/useWinner";
import { PartyPopperIcon } from "lucide-react";
import Link from "next/link";
import ConfettiExplosion from "react-confetti-explosion";
import { withErrorBoundary } from "react-error-boundary";
import { isAddressEqual } from "viem";
import { useAccount } from "wagmi";

function WinnerAlertComponent({ gameId }: { gameId: bigint }) {
  const { address } = useAccount();
  const { winningIds, winningAddresses, isOverWithApocalypse } = useWinner({
    gameId,
  });

  if (isOverWithApocalypse) {
    return (
      <>
        <ConfettiExplosion />
        <Alert>
          <PartyPopperIcon className="size-4" />
          <div />
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <AlertTitle>Everyone wins!</AlertTitle>
              <AlertDescription className="space-y-4">
                <p>Every ticket holder wins an equal share of the jackpot!</p>
              </AlertDescription>
            </div>
            <Button asChild>
              <Link href="/tickets">Check your tickets</Link>
            </Button>
          </div>
        </Alert>
      </>
    );
  }

  if (!winningIds || !winningIds.length || !winningAddresses) return null;

  const userIsWinner =
    !!address &&
    winningAddresses.some((winnerAddress) =>
      isAddressEqual(address, winnerAddress),
    );

  return (
    <>
      <ConfettiExplosion />
      <Alert>
        <PartyPopperIcon className="m-auto size-4" />
        <div />
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <AlertTitle>
              We have {winningIds.length} winning{" "}
              {winningIds.length === 1 ? "ticket" : "tickets"} in the last draw!
            </AlertTitle>
            <AlertDescription className="space-y-4">
              {userIsWinner ? (
                <p>You won! Congratulations! 🎉</p>
              ) : (
                <p>Check your tickets to see if you won</p>
              )}
            </AlertDescription>
          </div>
          <Button asChild>
            <Link href="/tickets">Check your tickets</Link>
          </Button>
        </div>
      </Alert>
    </>
  );
}

export const WinnerAlert = withErrorBoundary(WinnerAlertComponent, {
  fallback: null,
});
