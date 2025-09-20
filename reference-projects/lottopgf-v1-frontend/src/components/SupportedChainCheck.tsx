"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";

export function SupportedChainCheck() {
  const { chainId: connectedChainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();

  const defaultChain = chains[0];

  const isConnectedToUnsupportedChain =
    isConnected && !chains.some((chain) => chain.id === connectedChainId);

  return (
    <AlertDialog open={isConnectedToUnsupportedChain}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsupported Network</AlertDialogTitle>
          <AlertDialogDescription>
            Please connect to {defaultChain.name} to use this application. Note
            that some wallets like Rainbow might not support custom chains. In
            that case please use another wallet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => disconnect()}>
            Disconnect
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => switchChain({ chainId: defaultChain.id })}
          >
            Connect to {defaultChain.name}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
