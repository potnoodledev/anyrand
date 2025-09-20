import { Progress } from "@/components/ui/progress";
import { formatUnits } from "viem";

export function FundingProgress({
  amount,
  target,
}: {
  amount: bigint;
  target: bigint;
}) {
  const percentageRaised = parseFloat(
    formatUnits((amount * 10_000n) / target, 2),
  );

  return (
    <div className="flex items-center gap-2">
      <Progress className="h-3" value={parseInt(percentageRaised.toString())} />
      <span className="text-sm tabular-nums text-foreground">
        {percentageRaised.toLocaleString("en-US", { maximumFractionDigits: 1 })}
        %
      </span>
    </div>
  );
}
