'use client';

import { useAccountInfo } from '@/hooks/useAccountInfo';
import { Skeleton } from '@/components/ui/loading';
import { cn, copyToClipboard } from '@/lib/utils';
import { useState } from 'react';
import Image from 'next/image';

export interface AccountDisplayProps {
  showBalance?: boolean;
  showAvatar?: boolean;
  className?: string;
  truncateLength?: number;
}

export function AccountDisplay({
  showBalance = false,
  showAvatar = false,
  className,
  truncateLength
}: AccountDisplayProps) {
  const {
    address,
    ensName,
    ensAvatar,
    balance,
    displayName,
    isLoading
  } = useAccountInfo();

  const [isCopied, setIsCopied] = useState(false);

  if (!address) {
    return null;
  }

  const handleCopyAddress = async () => {
    if (await copyToClipboard(address)) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        {showAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          {showBalance && <Skeleton className="h-3 w-20" />}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {showAvatar && (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {ensAvatar ? (
            <Image
              src={ensAvatar}
              alt={ensName || address}
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyAddress}
            className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
            title="Click to copy address"
          >
            {truncateLength
              ? displayName.length > truncateLength * 2
                ? `${displayName.slice(0, truncateLength)}...${displayName.slice(-truncateLength)}`
                : displayName
              : displayName
            }
          </button>
          {isCopied && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Copied!
            </span>
          )}
        </div>

        {showBalance && balance && (
          <div className="text-sm text-muted-foreground">
            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </div>
        )}
      </div>
    </div>
  );
}