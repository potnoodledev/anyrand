"use client";

import { LOOTERY_ABI } from "@/abi/Lootery";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CHAIN, CONTRACT_ADDRESS } from "@/config";
import { GameState } from "@/hooks/useCurrentGame";
import { extractErrorMessages, handleTransactionError } from "@/lib/error";
import { useAppKit } from "@reown/appkit/react";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { encodeFunctionData, hexToBigInt, type Hex } from "viem";
import { simulateContract } from "viem/actions";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";

export function RoundEndAlert({
  gameState,
  onDraw,
  onGameFinalized,
}: {
  gameState: GameState;
  onDraw?: () => void;
  onGameFinalized?: () => void;
}) {
  const client = usePublicClient();
  const { open } = useAppKit();
  const { isConnected } = useAccount();

  const {
    writeContractAsync,
    data: hash,
    isPending: isPendingTransaction,
  } = useWriteContract();

  const { isLoading: isPendingExecution } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (gameState === GameState.DrawPending) {
      toast.promise(
        new Promise<{ hash: Hex; numbers: readonly number[] }>(
          (resolve, reject) => {
            client?.watchContractEvent({
              address: CONTRACT_ADDRESS,
              abi: LOOTERY_ABI,
              eventName: "GameFinalised",
              onLogs(logs) {
                const log = logs.find(
                  (log) => log.eventName === "GameFinalised",
                );
                if (!log) return;
                const numbers = log.args.winningPick;
                if (!numbers) return;

                resolve({
                  hash: log.transactionHash,
                  numbers,
                });
              },
              onError(error) {
                console.error(error);
                reject(error);
              },
            });
          },
        ),
        {
          loading: "Waiting for the draw to complete…",
          success: "Draw has been completed!",
          action: hash
            ? {
                label: "Explorer",
                onClick(e) {
                  e.preventDefault();
                  window.open(
                    `${CHAIN.blockExplorers.default.url}/tx/${hash}`,
                    "_blank",
                  );
                },
              }
            : undefined,
          description: ({ numbers }) =>
            numbers ? `The numbers are ${numbers.join(" ")}.` : undefined,
          error: "Error",
        },
      );
    }
  }, [client, gameState, hash]);

  const isDrawing = gameState === GameState.DrawPending;

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: LOOTERY_ABI,
    eventName: "GameFinalised",
    onLogs(logs) {
      if (logs.some((log) => log.eventName === "GameFinalised")) {
        onGameFinalized?.();
      }
    },
    enabled: isDrawing,
  });

  const isPending = isPendingTransaction || isPendingExecution;

  async function handleTransaction() {
    if (!client) return;

    try {
      const { maxFeePerGas, maxPriorityFeePerGas } =
        await client.estimateFeesPerGas({
          chain: CHAIN,
          type: "eip1559",
        });

      // give me ethers or give me death
      const { data: _requestPrice } = await client.call({
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: LOOTERY_ABI,
          functionName: "getRequestPrice",
        }),
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      const requestPrice = hexToBigInt(_requestPrice!);

      // 2x in case of gas price fluctuation; excess will be refunded
      const valueToSend = requestPrice * 2n;

      const response = await simulateContract(client, {
        chain: CHAIN,
        abi: LOOTERY_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "draw",
        value: valueToSend,
      });

      // Set a minimum gas limit of 200,000
      response.request.gas =
        (response.request.gas ?? 0n) < 200000n ? 200000n : response.request.gas;

      const hash = await writeContractAsync(response.request);

      toast.promise(async () => client?.waitForTransactionReceipt({ hash }), {
        loading: "Waiting for confirmation…",
        action: {
          label: "Explorer",
          onClick(e) {
            e.preventDefault();
            window.open(
              `${CHAIN.blockExplorers.default.url}/tx/${hash}`,
              "_blank",
            );
          },
        },
        success: "Lottery has been drawn!",
        error(error) {
          const { message } = extractErrorMessages(error);
          return message;
        },
        finally() {
          onDraw?.();
        },
      });
    } catch (error) {
      handleTransactionError(error);
    }
  }

  return (
    <Alert>
      <AlertTriangleIcon className="h-4 w-4" />
      <div />
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <AlertTitle>The lottery is ready to be drawn</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>You can still buy tickets or execute the draw.</p>
          </AlertDescription>
        </div>
        {isConnected ? (
          <Button
            className="shrink-0"
            disabled={!isConnected || isDrawing || isPending}
            onClick={handleTransaction}
          >
            {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Execute
          </Button>
        ) : (
          <Button className="shrink-0" onClick={() => open()}>
            Connect wallet
          </Button>
        )}
      </div>
    </Alert>
  );
}
