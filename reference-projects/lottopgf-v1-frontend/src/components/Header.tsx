"use client";

import ConnectButton from "@/components/ConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { METADATA } from "@/config";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";

export function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="py-2 sm:py-8">
      <div className="mx-auto flex w-full max-w-[48.875rem] flex-col items-center gap-2 px-4 leading-tight sm:flex-row sm:gap-4">
        <Link href="/" className="flex flex-1 items-center gap-2">
          {!!METADATA.logo && (
            <Image
              src={METADATA.logo}
              width={180}
              height={36}
              className="h-9 w-auto"
              priority
              alt={METADATA.name}
            />
          )}
          {!!METADATA.title && (
            <h1 className="font-serif text-sm leading-tight sm:text-2xl">
              {METADATA.title}
            </h1>
          )}
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center leading-tight">
            {isConnected && (
              <Link
                href="/tickets"
                className="text-sm underline-offset-2 hover:underline"
              >
                Your Tickets
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ConnectButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
