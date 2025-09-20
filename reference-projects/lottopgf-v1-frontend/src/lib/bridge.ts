import { CHAIN, PRIZE_TOKEN_DECIMALS } from "@/config";
import { formatUnits, type Address } from "viem";

export const BRIDGE_NAME = "Jumper";
// To account for swap fees and gas
const BRIDGE_MULTIPLIER_BPS = 500n; // 5%

export function makeBridgeUrl({
  amount,
  token,
}: {
  amount: bigint;
  token: Address;
}) {
  const multipliedAmount = amount + (amount * BRIDGE_MULTIPLIER_BPS) / 10000n;

  const url = new URL("https://jumper.exchange");
  url.searchParams.set(
    "fromamount",
    formatUnits(multipliedAmount, PRIZE_TOKEN_DECIMALS),
  );
  url.searchParams.set("toChain", CHAIN.id.toString());
  url.searchParams.set("toToken", token);
  return url.toString();
}
