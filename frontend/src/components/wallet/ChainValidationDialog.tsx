'use client';

import { useNetworkState } from '@/hooks/useNetworkState';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { AlertTriangle, Network } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ChainValidationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChainValidationDialog({
  open: controlledOpen,
  onOpenChange
}: ChainValidationDialogProps) {
  const {
    chainId,
    currentNetwork,
    isSupported,
    isConnected,
    switchNetwork,
    isSwitching
  } = useNetworkState();

  const { disconnect } = useWalletConnection();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Show dialog when connected to unsupported network
  useEffect(() => {
    if (isConnected && !isSupported && chainId) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isConnected, isSupported, chainId, setIsOpen]);

  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork(DEFAULT_CHAIN.id);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (!isOpen || !chainId || isSupported) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Unsupported Network</h2>
                <p className="text-sm text-muted-foreground">
                  Please switch to a supported network
                </p>
              </div>
            </div>

            {/* Network Info */}
            <div className="bg-muted rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Current Network:</span>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-sm">
                    {currentNetwork?.name || `Chain ${chainId}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Required Network:</span>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">
                    {DEFAULT_CHAIN.name}
                    {DEFAULT_CHAIN.testnet && ' (Testnet)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-6">
              This application only works with supported networks. You can either
              switch to {DEFAULT_CHAIN.name} or disconnect your wallet.
            </p>

            {/* Actions */}
            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleSwitchNetwork}
                disabled={isSwitching}
                className="w-full"
              >
                {isSwitching ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Switching Network...
                  </>
                ) : (
                  <>
                    <Network className="h-4 w-4 mr-2" />
                    Switch to {DEFAULT_CHAIN.name}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isSwitching}
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Some wallets may require manual approval for network switching
            </p>
          </div>
        </div>
      </div>
    </>
  );
}