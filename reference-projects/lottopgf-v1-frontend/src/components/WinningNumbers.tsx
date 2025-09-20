import { useWinningNumbers } from "@/hooks/useWinningNumbers";

export function WinningNumbers({ gameId }: { gameId: bigint }) {
  const { numbers } = useWinningNumbers({ gameId });

  return <>{numbers ? <NumbersList numbers={numbers} /> : <span>–</span>}</>;
}

export function NumbersList({ numbers }: { numbers: number[] }) {
  return (
    <div className="flex gap-2">
      {numbers.map((number) => (
        <div
          key={number}
          className="flex size-12 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white"
        >
          {number}
        </div>
      ))}
    </div>
  );
}
