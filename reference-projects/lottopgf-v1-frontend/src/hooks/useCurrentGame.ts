import { LOOTERY_ABI } from "@/abi/Lootery";
import { CONTRACT_ADDRESS } from "@/config";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { readContractQueryOptions } from "wagmi/query";

// See Lootery contract
export enum GameState {
  /** Unitialised state, i.e. before the `init` function has been called */
  Uninitialised,
  /** This is the only state where the jackpot can increase */
  Purchase,
  /** Waiting for VRF fulfilment */
  DrawPending,
  /** Lootery is closed (forever) */
  Dead,
}

export function useCurrentGame() {
  const config = useConfig();
  const options = readContractQueryOptions(config, {
    abi: LOOTERY_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "currentGame",
  });

  const { data, ...rest } = useSuspenseQuery(options);

  const [gameState, gameId] = data;

  return {
    ...rest,
    gameState: gameState as GameState,
    gameId,
  };
}
