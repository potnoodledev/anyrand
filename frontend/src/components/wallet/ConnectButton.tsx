'use client';

import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { appKit } from '@/lib/providers';
import { formatDisplayName } from '@/lib/utils/format';

interface ConnectButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ConnectButton({
  variant = 'default',
  size = 'default',
  className
}: ConnectButtonProps) {
  const { isConnected, isConnecting, address } = useAccount();

  const handleClick = () => {
    appKit.open();
  };

  if (isConnecting) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
      >
        <LoadingSpinner size="sm" className="mr-2" />
        Connecting...
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        {formatDisplayName(address)}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      Connect Wallet
    </Button>
  );
}