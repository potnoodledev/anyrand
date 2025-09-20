"use client";

import { LOOTERY_ABI } from "@/abi/Lootery";
import { LOOTERY_ETH_ADAPTER_ABI } from "@/abi/LooteryETHAdapter";
import { Amount } from "@/components/Amount";
import { FundingProgress } from "@/components/FundingProgress";
import { NumberPicker } from "@/components/NumberPicker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  CHAIN,
  COLLECTIVE_FUND_METADATA,
  CONTRACT_ADDRESS,
  LOOTERY_ETH_ADAPTER_ADDRESS,
  PRIZE_TOKEN_DECIMALS,
  PRIZE_TOKEN_IS_NATIVE,
  PRIZE_TOKEN_TICKER,
} from "@/config";
import { FUNDRAISERS } from "@/fundraisers";
import { useBalanceWithAllowance } from "@/hooks/useBalanceWithAllowance";
import { GameState, useCurrentGame } from "@/hooks/useCurrentGame";
import { useGameConfig } from "@/hooks/useGameConfig";
import { useGameData } from "@/hooks/useGameData";
import { useTickets } from "@/hooks/useTickets";
import { BRIDGE_NAME, makeBridgeUrl } from "@/lib/bridge";
import { extractErrorMessages, handleTransactionError } from "@/lib/error";
import { getRandomPicks } from "@/lib/random";
import { cn } from "@/lib/utils";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useAppKit } from "@reown/appkit/react";
import {
  CheckIcon,
  DicesIcon,
  Loader2Icon,
  PlusIcon,
  WalletMinimalIcon,
} from "lucide-react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  array,
  check,
  minLength,
  number,
  object,
  optional,
  pipe,
  set,
  size,
  string,
  transform,
  type InferOutput,
} from "valibot";
import {
  erc20Abi,
  getAddress,
  isAddress,
  isAddressEqual,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

const makeFieldSchema = (numbersCount: number) =>
  object({
    recipient: pipe(
      string(),
      check((value) => isAddress(value)),
      transform((value) => getAddress(value)),
    ),
    tickets: pipe(
      array(
        object({
          numbers: pipe(
            set(number()),
            size(numbersCount, `You have to select ${numbersCount} numbers.`),
          ),
          recipient: optional(
            pipe(
              string(),
              check(
                (value) => isAddress(value),
                "Please enter a valid ethereum address",
              ),
              transform((value) => getAddress(value)),
            ),
          ),
        }),
      ),
      minLength(1, "You must select at least 1 ticket."),
    ),
  });

export type TicketPurchaseFields = InferOutput<
  ReturnType<typeof makeFieldSchema>
>;

export function TicketPurchase({ onPurchase }: { onPurchase?: () => void }) {
  const client = usePublicClient();
  const { open } = useAppKit();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const addTicketRef = useRef<HTMLButtonElement>(null);

  const { address, isConnected } = useAccount();
  const { gameId, gameState } = useCurrentGame();
  const { isActive, accruedCommunityFees } = useGameData({ gameId });
  const { pickLength, maxBallValue, ticketPrice, prizeToken } = useGameConfig();
  const { refetch: refetchTickets } = useTickets({ address, gameId });

  const {
    balance,
    allowance,
    increaseAllowance,
    refetch: refetchAllowance,
    isPendingAllowance,
  } = useBalanceWithAllowance({
    address,
    token: prizeToken,
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
    reset,
  } = useForm<TicketPurchaseFields>({
    defaultValues: {
      tickets: [{ numbers: new Set() }],
      recipient: zeroAddress,
    },
    resolver: valibotResolver(makeFieldSchema(pickLength)),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "tickets",
  });

  const { writeContractAsync, data: hash } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  const tickets = useWatch({ name: "tickets", control });
  const recipient = useWatch({ name: "recipient", control });

  const isLoading = isSubmitting || isConfirming || isPendingAllowance;

  const totalPrice = ticketPrice * BigInt(tickets.length);

  const hasEnoughBalance = !!balance && balance >= totalPrice;
  const hasEnoughAllowance = !!allowance && allowance >= totalPrice;

  function onPurchaseComplete() {
    setTimeout(() => refetchTickets(), 2000);
    refetchAllowance();
    reset();
    onPurchase?.();
  }

  async function onSubmit(fields: TicketPurchaseFields) {
    if (!address || !fields.tickets.length) return;

    try {
      let hash: Hex;

      const picks = fields.tickets.map(({ numbers, recipient }) => ({
        whomst: recipient ?? address,
        pick: [...numbers].sort((a, b) => a - b),
      }));

      if (PRIZE_TOKEN_IS_NATIVE) {
        hash = await writeContractAsync({
          chain: CHAIN,
          type: "eip1559",
          abi: LOOTERY_ETH_ADAPTER_ABI,
          address: LOOTERY_ETH_ADAPTER_ADDRESS,
          functionName: "purchase",
          value: totalPrice,
          args: [CONTRACT_ADDRESS, picks, fields.recipient],
        });
      } else {
        if (!hasEnoughAllowance) return;

        hash = await writeContractAsync({
          chain: CHAIN,
          type: "eip1559",
          abi: LOOTERY_ABI,
          address: CONTRACT_ADDRESS,
          functionName: "purchase",
          args: [picks, fields.recipient],
        });
      }

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
        success: "Tickets have been purchased!",
        error(error) {
          const { message } = extractErrorMessages(error);
          return message;
        },
        finally: onPurchaseComplete,
      });
    } catch (error) {
      handleTransactionError(error);
    }
  }

  function scrollToLastItem() {
    setTimeout(() => {
      if (tickets.length > 1 && scrollAreaRef.current && addTicketRef.current) {
        scrollAreaRef.current.scrollLeft +=
          addTicketRef.current.offsetWidth +
          (addTicketRef.current.parentElement
            ? parseFloat(
                getComputedStyle(addTicketRef.current.parentElement).gap,
              )
            : 0);
      }
    });
  }

  function pickShortcut(amount: number) {
    setValue(
      "tickets",
      Array.from({ length: amount }, () => ({
        numbers: getRandomPicks(pickLength, maxBallValue),
      })),
    );
  }

  if (gameState === GameState.DrawPending) {
    return <p>Draw is pending</p>;
  }

  if (!isActive) {
    return <p>Game is not active.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset
        className="min-w-0 space-y-14"
        disabled={!isActive || isLoading}
      >
        <section id="cause" className="space-y-6">
          <header className="space-y-2">
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
              Select a cause to fund
            </h2>
            <p className="text-muted-foreground">
              Select a fundraiser you want to support or contribute to the
              collective Fund.
            </p>
          </header>

          <div className="grid gap-6 sm:grid-cols-6">
            <Card className="sm:col-span-6">
              <CardHeader>
                <div className="flex flex-col items-stretch justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg">
                        {COLLECTIVE_FUND_METADATA.name}
                      </CardTitle>
                      <CardDescription>
                        {COLLECTIVE_FUND_METADATA.description}
                      </CardDescription>
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        <Amount
                          value={accruedCommunityFees}
                          decimals={PRIZE_TOKEN_DECIMALS}
                        />
                      </span>{" "}
                      {PRIZE_TOKEN_TICKER} raised
                    </p>
                  </div>

                  <div>
                    <Button
                      size="lg"
                      variant="outline"
                      disabled={isAddressEqual(zeroAddress, recipient)}
                      className={cn(
                        "w-full",
                        isAddressEqual(zeroAddress, recipient) && "opacity-50",
                      )}
                      type="button"
                      onClick={() => setValue("recipient", zeroAddress)}
                    >
                      {isAddressEqual(zeroAddress, recipient) ? (
                        <>
                          <CheckIcon size="1em" className="mr-1" /> Selected
                        </>
                      ) : (
                        "Select to fund"
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            {FUNDRAISERS.map((fundraiser, i) => {
              const isActive = isAddressEqual(fundraiser.address, recipient);
              return (
                <FundraiserCard
                  key={i}
                  title={fundraiser.title}
                  description={fundraiser.description}
                  targetAmount={fundraiser.targetAmount}
                  address={fundraiser.address}
                  isActive={isActive}
                  onClick={() => setValue("recipient", fundraiser.address)}
                />
              );
            })}
          </div>
        </section>

        <section id="numbers" className="space-y-4">
          <header className="space-y-2">
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
              Pick your numbers
            </h2>
            <p className="text-muted-foreground">
              Please pick {pickLength.toLocaleString("en-US")}{" "}
              {pickLength === 1 ? `number` : `numbers`}
            </p>
          </header>
          <ScrollArea
            viewportRef={scrollAreaRef}
            viewportClassName="overscroll-contain scroll-smooth"
            className="mb-14 ml-[50%] w-[100vw] -translate-x-1/2"
          >
            <div className="mx-auto w-full max-w-[48.875rem] px-4">
              <div className="flex gap-6">
                {fields.map((field, index) => (
                  <fieldset
                    className="w-full max-w-[280px] flex-shrink-0 sm:max-w-[322px] md:max-w-[calc(50%-.75rem)]"
                    key={field.id}
                  >
                    <NumberPicker
                      index={index}
                      name={`tickets.${index}`}
                      onRemove={fields.length > 1 ? remove : undefined}
                      control={control}
                    />
                  </fieldset>
                ))}
                <button
                  type="button"
                  ref={addTicketRef}
                  onClick={() => {
                    append([{ numbers: new Set() }]);

                    scrollToLastItem();
                  }}
                  className="flex w-full max-w-[280px] flex-shrink-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-foreground/5 bg-foreground/[0.01] sm:max-w-[322px] md:max-w-[calc(50%-.75rem)]"
                >
                  <PlusIcon className="size-6" />
                  <p className="text-lg">Add a ticket</p>
                </button>
                <div>&nbsp;</div>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Shortcuts</p>
            <div className="flex gap-2 overflow-x-auto">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                size="sm"
                onClick={() => pickShortcut(5)}
              >
                <DicesIcon size="1em" /> Pick 5 random tickets
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                size="sm"
                onClick={() => pickShortcut(10)}
              >
                <DicesIcon size="1em" /> Pick 10 random tickets
              </Button>
            </div>
          </div>
        </section>

        <section id="purchase" className="space-y-6">
          {!hasEnoughBalance && (
            <Alert>
              <WalletMinimalIcon className="size-4" />
              <AlertTitle>Need more {PRIZE_TOKEN_TICKER}?</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  You can bridge & swap funds from other chains to {CHAIN.name}.
                  We recommend {BRIDGE_NAME}.
                </p>
                <Button asChild>
                  <Link
                    target="_blank"
                    href={makeBridgeUrl({
                      amount: totalPrice,
                      token: prizeToken,
                    })}
                  >
                    Bridge using {BRIDGE_NAME}
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="rounded-3xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground shadow-sm md:text-base">
            {isConnected ? (
              <div className="flex items-center justify-between gap-6">
                {hasEnoughBalance ? (
                  <>
                    <div>
                      <p>
                        Buying {tickets.length}{" "}
                        {tickets.length === 1 ? "ticket" : "tickets"} for{" "}
                        <Amount
                          value={totalPrice}
                          decimals={PRIZE_TOKEN_DECIMALS}
                        />{" "}
                        {PRIZE_TOKEN_TICKER}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        You have{" "}
                        <Amount
                          value={balance}
                          decimals={PRIZE_TOKEN_DECIMALS}
                        />{" "}
                        {PRIZE_TOKEN_TICKER}
                      </p>
                    </div>

                    {PRIZE_TOKEN_IS_NATIVE || hasEnoughAllowance ? (
                      <Button size="sm" disabled={!hasEnoughBalance}>
                        {isLoading && (
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        )}{" "}
                        Buy {tickets.length}{" "}
                        {tickets.length === 1 ? "ticket" : "tickets"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        type="button"
                        onClick={() =>
                          increaseAllowance({ amount: totalPrice })
                        }
                        disabled={!totalPrice || !hasEnoughBalance}
                      >
                        {isPendingAllowance && (
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        )}{" "}
                        Allow spending {PRIZE_TOKEN_TICKER}
                      </Button>
                    )}
                  </>
                ) : (
                  <div>
                    <p>
                      You do not have enough balance. You need{" "}
                      <Amount
                        value={totalPrice}
                        decimals={PRIZE_TOKEN_DECIMALS}
                      />{" "}
                      {PRIZE_TOKEN_TICKER}.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You have{" "}
                      <Amount value={balance} decimals={PRIZE_TOKEN_DECIMALS} />{" "}
                      {PRIZE_TOKEN_TICKER}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-6">
                <p>Connect wallet to purchase tickets.</p>
                <Button size="sm" type="button" onClick={() => open()}>
                  Connect wallet
                </Button>
              </div>
            )}
          </div>
        </section>
      </fieldset>
    </form>
  );
}

function FundraiserCard({
  title,
  description,
  targetAmount,
  address,
  isActive,
  onClick,
}: {
  title: string;
  description?: ReactNode;
  targetAmount?: bigint;
  address: Address;
  isActive: boolean;
  onClick: () => void;
}) {
  const { prizeToken } = useGameConfig();
  const { data: balance } = useReadContract({
    address: prizeToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });

  return (
    <Card className="sm:col-span-3">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {!!description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">
          <span className="font-semibold text-foreground">
            <Amount value={balance ?? 0n} decimals={PRIZE_TOKEN_DECIMALS} />
          </span>{" "}
          {targetAmount ? (
            <>
              of <Amount value={targetAmount} decimals={PRIZE_TOKEN_DECIMALS} />{" "}
              {PRIZE_TOKEN_TICKER}
            </>
          ) : (
            <>{PRIZE_TOKEN_TICKER} raised</>
          )}
        </div>

        {!!targetAmount && (
          <FundingProgress amount={balance ?? 0n} target={targetAmount} />
        )}
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          variant="outline"
          disabled={isActive}
          className={cn("w-full", isActive && "opacity-50")}
          type="button"
          onClick={onClick}
        >
          {isActive ? (
            <>
              <CheckIcon size="1em" className="mr-1" /> Selected
            </>
          ) : (
            "Select to fund"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
