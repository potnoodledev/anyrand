/**
 * TransactionStatus Component
 *
 * Displays transaction status information with progress indicators,
 * confirmation counts, and error handling.
 */

import React from 'react';
import { Check, X, Clock, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TransactionStatus as TxStatus } from '../types/entities';
import { truncateAddress, copyToClipboard, formatDate, getRelativeTime } from '../lib/utils';
import { toast } from './ui/toast';
import { TransactionStatusProps } from '../types/components';

const STATUS_ICONS = {
  [TxStatus.PENDING]: Clock,
  [TxStatus.CONFIRMED]: Check,
  [TxStatus.FAILED]: X,
  [TxStatus.DROPPED]: AlertCircle,
};

const STATUS_COLORS = {
  [TxStatus.PENDING]: 'text-yellow-600 dark:text-yellow-400',
  [TxStatus.CONFIRMED]: 'text-green-600 dark:text-green-400',
  [TxStatus.FAILED]: 'text-red-600 dark:text-red-400',
  [TxStatus.DROPPED]: 'text-gray-600 dark:text-gray-400',
};

const STATUS_BACKGROUNDS = {
  [TxStatus.PENDING]: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  [TxStatus.CONFIRMED]: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  [TxStatus.FAILED]: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  [TxStatus.DROPPED]: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
};

const STATUS_LABELS = {
  [TxStatus.PENDING]: 'Pending',
  [TxStatus.CONFIRMED]: 'Confirmed',
  [TxStatus.FAILED]: 'Failed',
  [TxStatus.DROPPED]: 'Dropped',
};

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  transaction,
  showDetails = true,
  showActions = true,
  requiredConfirmations = 1,
  blockExplorerUrl,
  onRetry,
  className,
}) => {
  const StatusIcon = STATUS_ICONS[transaction.status];

  const handleCopyHash = async () => {
    const success = await copyToClipboard(transaction.hash);
    if (success) {
      toast.success({ title: 'Copied', description: 'Transaction hash copied to clipboard.' });
    }
  };

  const openBlockExplorer = () => {
    if (blockExplorerUrl) {
      const url = `${blockExplorerUrl}/tx/${transaction.hash}`;
      window.open(url, '_blank');
    }
  };

  const getProgressPercentage = () => {
    if (transaction.status !== TxStatus.PENDING) return 100;
    return Math.min((transaction.confirmations / requiredConfirmations) * 100, 100);
  };

  const getStatusMessage = () => {
    switch (transaction.status) {
      case TxStatus.PENDING:
        return `Waiting for confirmations (${transaction.confirmations}/${requiredConfirmations})`;
      case TxStatus.CONFIRMED:
        return `Transaction confirmed with ${transaction.confirmations} confirmations`;
      case TxStatus.FAILED:
        return 'Transaction failed during execution';
      case TxStatus.DROPPED:
        return 'Transaction was dropped from the mempool';
      default:
        return 'Unknown transaction status';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon className={`w-5 h-5 ${STATUS_COLORS[transaction.status]}`} />
            <span>Transaction Status</span>
          </div>
          <span className={`px-2 py-1 rounded text-sm font-medium ${STATUS_COLORS[transaction.status]}`}>
            {STATUS_LABELS[transaction.status]}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Banner */}
        <div className={`p-3 rounded-md border ${STATUS_BACKGROUNDS[transaction.status]}`}>
          <div className={`text-sm font-medium ${STATUS_COLORS[transaction.status]}`}>
            {getStatusMessage()}
          </div>
          {transaction.status === TxStatus.PENDING && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Transaction Hash */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm font-mono flex-1">
              {truncateAddress(transaction.hash, 10, 8)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyHash}
              className="h-6 w-6 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
            {blockExplorerUrl && (
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

        {/* Extended Details */}
        {showDetails && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">From</label>
                <div className="text-sm font-mono">{truncateAddress(transaction.from)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">To</label>
                <div className="text-sm font-mono">
                  {transaction.to ? truncateAddress(transaction.to) : 'Contract Creation'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Value</label>
                <div className="text-sm font-mono">
                  {Number(transaction.value) / 1e18} ETH
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gas Used</label>
                <div className="text-sm font-mono">
                  {transaction.gasUsed?.toLocaleString() || 'Pending'}
                </div>
              </div>
            </div>

            {transaction.blockNumber && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Block Number</label>
                  <div className="text-sm font-mono">#{transaction.blockNumber.toString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <div className="text-sm">{formatDate(transaction.timestamp)}</div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Cost</label>
              <div className="text-sm font-mono">
                {Number(transaction.totalCost) / 1e18} ETH
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-sm text-muted-foreground">
              {transaction.status === TxStatus.PENDING ? (
                <span>Submitted {getRelativeTime(transaction.timestamp)}</span>
              ) : (
                <span>Completed {getRelativeTime(transaction.timestamp)}</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {transaction.status === TxStatus.FAILED && onRetry && (
                <Button size="sm" variant="outline" onClick={() => onRetry(transaction)}>
                  Retry
                </Button>
              )}

              {blockExplorerUrl && (
                <Button size="sm" variant="default" onClick={openBlockExplorer}>
                  View on Explorer
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error Details */}
        {transaction.status === TxStatus.FAILED && transaction.metadata?.error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="text-sm text-red-800 dark:text-red-200">
              <div className="font-medium mb-1">Error Details:</div>
              <div className="text-xs font-mono">{transaction.metadata.error}</div>
            </div>
          </div>
        )}

        {/* Pending Timeout Warning */}
        {transaction.status === TxStatus.PENDING && (
          (() => {
            const now = new Date();
            const timeDiff = now.getTime() - transaction.timestamp.getTime();
            const minutes = Math.floor(timeDiff / (1000 * 60));

            if (minutes > 15) {
              return (
                <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <div className="font-medium mb-1">Transaction Taking Long</div>
                    <div className="text-xs">
                      This transaction has been pending for {minutes} minutes.
                      It may be due to network congestion or low gas price.
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()
        )}
      </CardContent>
    </Card>
  );
};