import { CHAIN, CONTRACT_ADDRESS, PRIZE_TOKEN_IS_NATIVE } from "@/config";
import { extractErrorMessages, handleTransactionError } from "@/lib/error";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { erc20Abi, type Address } from "viem";
import {
  useBalance,
  usePublicClient,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

export function useBalanceWithAllowance({
  address,
  token,
  onAllowanceUpdated,
}: {
  address?: Address;
  token?: Address;
  onAllowanceUpdated?: () => void;
}) {
  const client = usePublicClient();
  const { data: tokenBalanceData, refetch } = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        abi: erc20Abi,
        address: token,
        functionName: "balanceOf",
        args: [address!],
      },
      {
        abi: erc20Abi,
        address: token,
        functionName: "allowance",
        args: [address!, CONTRACT_ADDRESS],
      },
    ],
    query: { enabled: !PRIZE_TOKEN_IS_NATIVE && !!address },
  });

  const { writeContractAsync } = useWriteContract();

  const {
    data: hash,
    isPending,
    mutateAsync: increaseAllowance,
  } = useMutation({
    async mutationFn({ amount }: { amount: bigint }) {
      if (!address || !token) return;

      try {
        const hash = await writeContractAsync({
          chain: CHAIN,
          type: "eip1559",
          abi: erc20Abi,
          address: token,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, amount],
        });

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
          success: "Allowance updated successfully",
          error(error) {
            const { message } = extractErrorMessages(error);
            return message;
          },
          finally() {
            refetch();
            onAllowanceUpdated?.();
          },
        });

        return hash;
      } catch (error) {
        handleTransactionError(error);
      }
    },
  });

  const { isFetching: isWaitingForConfirmation } = useWaitForTransactionReceipt(
    {
      hash,
    },
  );

  const { data: nativeBalanceData } = useBalance({ address });

  const [tokenBalance, allowance] = tokenBalanceData ?? [];

  const balance =
    (PRIZE_TOKEN_IS_NATIVE ? nativeBalanceData?.value : tokenBalance) ?? 0n;

  return {
    balance,
    allowance,
    increaseAllowance,
    isPendingAllowance: isPending || isWaitingForConfirmation,
    refetch,
  };
}
