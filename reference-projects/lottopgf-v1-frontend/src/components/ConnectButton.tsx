"use client";

import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/format";
import { ensConfig } from "@/lib/wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useEnsName } from "wagmi";

export default function ConnectButton() {
  const { isConnected, address } = useAccount();
  const { data } = useEnsName({
    address,
    chainId: ensConfig.chains.at(0)?.id,
    config: ensConfig,
  });
  const { open } = useAppKit();

  if (isConnected) {
    return (
      <Button size="sm" onClick={() => open()} className="md:min-w-40">
        {data ? data : formatAddress(address)}
      </Button>
    );
  }
  return (
    <Button size="sm" onClick={() => open()} className="md:min-w-40">
      Connect wallet
    </Button>
  );
}
