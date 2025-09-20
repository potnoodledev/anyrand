/**
 * RequestCard Component
 *
 * A card component for displaying individual randomness request information
 * with status, progress, and action buttons.
 */

import React from 'react';
import { Clock, Zap, Hash, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RequestState } from '../types/entities';
import { formatEther } from 'viem';
import { formatDate, formatNumber, truncateAddress, copyToClipboard, getRelativeTime } from '../lib/utils';
import { toast } from './ui/toast';
import { RequestCardProps } from '../types/components';

const STATUS_COLORS = {
  [RequestState.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [RequestState.FULFILLED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [RequestState.CALLBACK_FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const STATUS_LABELS = {
  [RequestState.PENDING]: 'Pending',
  [RequestState.FULFILLED]: 'Fulfilled',
  [RequestState.CALLBACK_FAILED]: 'Failed',
};

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  showActions = true,
  showDetails = true,
  onRefresh,
  onViewDetails,
  blockExplorerUrl,
  className,
}) => {
  const handleCopyId = async () => {
    const success = await copyToClipboard(request.id);
    if (success) {
      toast.success({ title: 'Copied', description: 'Request ID copied to clipboard.' });
    }
  };

  const handleCopyHash = async () => {
    if (request.transactionHash) {
      const success = await copyToClipboard(request.transactionHash);
      if (success) {
        toast.success({ title: 'Copied', description: 'Transaction hash copied to clipboard.' });
      }
    }
  };

  const openBlockExplorer = () => {
    if (request.transactionHash && blockExplorerUrl) {
      const url = `${blockExplorerUrl}/tx/${request.transactionHash}`;
      window.open(url, '_blank');
    }
  };

  const getStatusIcon = () => {
    switch (request.state) {
      case RequestState.PENDING:
        return <Clock className="w-4 h-4" />;
      case RequestState.FULFILLED:
        return <Zap className="w-4 h-4" />;
      case RequestState.CALLBACK_FAILED:
        return <Hash className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const isDeadlineExpired = () => {
    const now = Math.floor(Date.now() / 1000);
    return Number(request.deadline) < now;
  };

  const getTimeToDeadline = () => {
    const deadlineDate = new Date(Number(request.deadline) * 1000);
    const now = new Date();

    if (deadlineDate < now) {
      return 'Expired';
    }

    const diff = deadlineDate.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-base">Request #{request.requestId.toString()}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.state]}`}>
            {STATUS_LABELS[request.state]}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Fee Paid</label>
            <div className="text-sm font-mono">{formatEther(request.feePaid)} ETH</div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Gas Limit</label>
            <div className="text-sm font-mono">{formatNumber(Number(request.callbackGasLimit))}</div>
          </div>
        </div>

        {/* Timing Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Created</label>
            <div className="text-sm">{getRelativeTime(request.createdAt)}</div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {request.state === RequestState.PENDING ? 'Time to Deadline' : 'Deadline'}
            </label>
            <div className={`text-sm ${
              request.state === RequestState.PENDING && isDeadlineExpired()
                ? 'text-red-600 dark:text-red-400'
                : ''
            }`}>
              {request.state === RequestState.PENDING ? getTimeToDeadline() : formatDate(new Date(Number(request.deadline) * 1000))}
            </div>
          </div>
        </div>

        {/* Randomness */}
        <div>
          <label className="text-xs text-muted-foreground">Randomness Value</label>
          <div className="text-sm font-mono break-all">
            {request.randomness === 0n ? (
              <span className="text-muted-foreground">Pending...</span>
            ) : (
              <span className="text-green-600 dark:text-green-400">
                {request.randomness.toString()}
              </span>
            )}
          </div>
        </div>

        {/* Extended Details */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <label className="text-xs text-muted-foreground">Requester</label>
              <div className="text-sm font-mono">{truncateAddress(request.requester)}</div>
            </div>

            {request.transactionHash && (
              <div>
                <label className="text-xs text-muted-foreground">Transaction Hash</label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono flex-1">
                    {truncateAddress(request.transactionHash, 8, 6)}
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
            )}

            {request.state === RequestState.CALLBACK_FAILED && (
              <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="text-xs text-red-800 dark:text-red-200">
                  The callback function failed during execution. Gas limit may have been too low.
                </div>
              </div>
            )}

            {request.state === RequestState.PENDING && isDeadlineExpired() && (
              <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  This request has expired and will not be fulfilled.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyId}
              leftIcon={<Copy className="w-3 h-3" />}
            >
              Copy ID
            </Button>

            <div className="flex items-center space-x-2">
              {onRefresh && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRefresh(request)}
                  leftIcon={<RefreshCw className="w-3 h-3" />}
                >
                  Refresh
                </Button>
              )}

              {onViewDetails && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onViewDetails(request)}
                >
                  View Details
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};