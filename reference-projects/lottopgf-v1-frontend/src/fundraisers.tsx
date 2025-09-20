import { PRIZE_TOKEN_DECIMALS } from "@/config";
import type { ReactNode } from "react";
import { parseUnits, type Address } from "viem";

interface Fundraiser {
  title: string;
  address: Address;
  description?: ReactNode;
  targetAmount?: bigint;
}

// List of fundraisers that will be shown on the homepage.
// Each beneficiary address needs to be whitelisted on the lottery contract
// with the `setBeneficiary` function, otherwise the transactions will fail.
// If you don't want to show any fundraisers, set this to an empty array.
export const FUNDRAISERS: Fundraiser[] = [
  {
    title: "LottoPGF Support Fund",
    description: "Support development of the LottoPGF protocol!",
    targetAmount: parseUnits("0.42069", PRIZE_TOKEN_DECIMALS),
    address: "0x8220B74b87D77b11f6950dD2dFCe77D5D8971829",
  },
];
