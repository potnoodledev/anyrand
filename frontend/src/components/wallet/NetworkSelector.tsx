'use client';

import { useNetworkState } from '@/hooks/useNetworkState';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface NetworkSelectorProps {
  className?: string;
  showTestnets?: boolean;
  onNetworkChange?: (chainId: number) => void;
}

export function NetworkSelector({
  className,
  showTestnets = true,
  onNetworkChange
}: NetworkSelectorProps) {
  const {
    chainId,
    currentNetwork,
    supportedNetworks,
    isSupported,
    switchNetwork,
    isSwitching
  } = useNetworkState();

  const [isOpen, setIsOpen] = useState(false);

  const filteredNetworks = showTestnets
    ? supportedNetworks
    : supportedNetworks.filter(network => !network.testnet);

  const handleNetworkSwitch = async (targetChainId: number) => {
    try {
      await switchNetwork(targetChainId);
      onNetworkChange?.(targetChainId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (!chainId) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant={isSupported ? 'outline' : 'destructive'}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="w-full justify-between"
      >
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              isSupported ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span>
            {currentNetwork?.name || `Chain ${chainId}`}
            {currentNetwork?.testnet && ' (Testnet)'}
          </span>
          {isSwitching && <LoadingSpinner size="sm" />}
        </div>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
            <div className="p-1">
              {filteredNetworks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleNetworkSwitch(network.id)}
                  disabled={isSwitching || network.id === chainId}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                    network.id === chainId && 'bg-accent text-accent-foreground',
                    isSwitching && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      network.id === chainId ? 'bg-green-500' : 'bg-muted-foreground'
                    )}
                  />
                  <span className="flex-1 text-left">
                    {network.name}
                    {network.testnet && ' (Testnet)'}
                  </span>
                  {network.id === chainId && (
                    <span className="text-xs text-muted-foreground">Current</span>
                  )}
                </button>
              ))}
            </div>

            {!isSupported && (
              <div className="border-t border-border p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Current network is not supported. Please switch to a supported network.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}