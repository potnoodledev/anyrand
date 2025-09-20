/**
 * WalletConnectButton Component
 *
 * A button component for connecting/disconnecting wallets using Reown AppKit.
 * Shows connection status, account info, and handles wallet interactions.
 */

import React from 'react';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useWallet } from '../hooks/useWallet';
import { copyToClipboard, truncateAddress } from '../lib/utils';
import { toast } from 'sonner';
import { WalletConnectButtonProps } from '../types/components';

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  size = 'default',
  variant = 'default',
  showBalance = true,
  showNetwork = true,
  className,
  onConnected,
  onDisconnected,
}) => {
  const {
    isConnected,
    isConnecting,
    address,
    formattedAddress,
    displayName,
    balance,
    formattedBalance,
    currentNetwork,
    isNetworkSupported,
    connectWallet,
    disconnectWallet,
    error,
  } = useWallet();

  const [showAccountDialog, setShowAccountDialog] = React.useState(false);

  // Call onConnected when wallet connects
  React.useEffect(() => {
    if (isConnected && address && onConnected) {
      onConnected(address);
    }
  }, [isConnected, address, onConnected]);

  // Call onDisconnected when wallet disconnects
  React.useEffect(() => {
    if (!isConnected && onDisconnected) {
      onDisconnected();
    }
  }, [isConnected, onDisconnected]);

  const handleConnect = async () => {
    try {
      await connectWallet();
      if (onConnected && address) {
        onConnected(address);
      }
      toast.success('Wallet Connected', {
        description: 'Your wallet has been successfully connected.',
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Connection Failed', {
        description: 'Failed to connect your wallet. Please try again.',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setShowAccountDialog(false);
      if (onDisconnected) {
        onDisconnected();
      }
      toast.success('Wallet Disconnected', {
        description: 'Your wallet has been disconnected.',
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Disconnection Failed', {
        description: 'Failed to disconnect your wallet.',
      });
    }
  };

  const handleCopyAddress = async () => {
    if (address) {
      const success = await copyToClipboard(address);
      if (success) {
        toast.success('Address Copied', {
          description: 'Wallet address has been copied to clipboard.',
        });
      } else {
        toast.error('Copy Failed', {
          description: 'Failed to copy address to clipboard.',
        });
      }
    }
  };

  const openBlockExplorer = () => {
    if (address && currentNetwork?.blockExplorerUrls[0]) {
      const url = `${currentNetwork.blockExplorerUrls[0]}/address/${address}`;
      window.open(url, '_blank');
    }
  };

  // Show error state if there's an error
  if (error) {
    return (
      <Button
        variant="destructive"
        size={size}
        className={className}
        onClick={handleConnect}
        disabled={isConnecting}
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connection Error
      </Button>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleConnect}
        loading={isConnecting}
        leftIcon={<Wallet className="w-4 h-4" />}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  // Connected state - show account info
  return (
    <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
      <DialogTrigger asChild>
        <Button
          variant={isNetworkSupported ? 'outline' : 'warning'}
          size={size}
          className={className}
          rightIcon={<ChevronDown className="w-4 h-4" />}
        >
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {displayName || formattedAddress}
              </span>
              {showBalance && formattedBalance && (
                <span className="text-xs text-muted-foreground">
                  {formattedBalance}
                </span>
              )}
            </div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Account Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <div className="flex items-center space-x-2 p-3 rounded-md border bg-muted/50">
              <span className="text-sm font-mono flex-1">
                {formattedAddress}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyAddress}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
              {currentNetwork?.blockExplorerUrls[0] && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={openBlockExplorer}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Balance */}
          {showBalance && balance && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Balance</label>
              <div className="p-3 rounded-md border bg-muted/50">
                <span className="text-sm font-mono">
                  {formattedBalance}
                </span>
              </div>
            </div>
          )}

          {/* Network */}
          {showNetwork && currentNetwork && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Network</label>
              <div className="flex items-center justify-between p-3 rounded-md border bg-muted/50">
                <span className="text-sm">{currentNetwork.name}</span>
                <div className={`px-2 py-1 rounded-full text-xs ${
                  isNetworkSupported
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {isNetworkSupported ? 'Supported' : 'Unsupported'}
                </div>
              </div>
            </div>
          )}

          {/* Disconnect Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            className="w-full"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Disconnect Wallet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};