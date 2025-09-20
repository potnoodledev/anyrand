/**
 * PendingRequestCard Component
 *
 * A card component for displaying individual pending request information
 * with queue position, priority, and estimated fulfillment time.
 */

import React from 'react';
import { Clock, TrendingUp, Timer, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RequestPriority } from '../types/entities';
import { formatEther } from 'viem';
import { formatNumber, truncateAddress, getRelativeTime } from '../lib/utils';
import { PendingRequestCardProps } from '../types/components';

const PRIORITY_COLORS = {
  [RequestPriority.HIGH]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [RequestPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [RequestPriority.LOW]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const PRIORITY_ICONS = {
  [RequestPriority.HIGH]: TrendingUp,
  [RequestPriority.MEDIUM]: Timer,
  [RequestPriority.LOW]: Clock,
};

export const PendingRequestCard: React.FC<PendingRequestCardProps> = ({
  request,
  showEstimatedTime = true,
  showQueuePosition = true,
  onViewDetails,
  className,
}) => {
  const PriorityIcon = PRIORITY_ICONS[request.priority];

  const formatEstimatedTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff <= 0) return 'Soon';

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `~${hours}h ${minutes % 60}m`;
    return `~${minutes}m`;
  };

  const getPriorityLabel = () => {
    switch (request.priority) {
      case RequestPriority.HIGH:
        return 'High Priority';
      case RequestPriority.MEDIUM:
        return 'Medium Priority';
      case RequestPriority.LOW:
        return 'Low Priority';
      default:
        return 'Unknown Priority';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PriorityIcon className="w-4 h-4" />
            <span className="text-base">Request #{request.requestId.toString()}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[request.priority]}`}>
            {getPriorityLabel()}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Queue Information */}
        <div className="grid grid-cols-2 gap-4">
          {showQueuePosition && (
            <div>
              <label className="text-xs text-muted-foreground">Queue Position</label>
              <div className="text-lg font-mono font-semibold">#{request.queuePosition}</div>
            </div>
          )}

          {showEstimatedTime && (
            <div>
              <label className="text-xs text-muted-foreground">Estimated Fulfillment</label>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {formatEstimatedTime(request.estimatedFulfillmentTime)}
              </div>
            </div>
          )}
        </div>

        {/* Request Details */}
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

        {/* Requester and Timing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Requester</label>
            <div className="text-sm font-mono">{truncateAddress(request.requester)}</div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Created</label>
            <div className="text-sm">{getRelativeTime(request.createdAt)}</div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Zap className="w-3 h-3" />
            <span>Waiting for fulfillment</span>
          </div>

          {onViewDetails && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(request)}
            >
              View Details
            </Button>
          )}
        </div>

        {/* Priority-specific messaging */}
        {request.priority === RequestPriority.HIGH && (
          <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="text-xs text-red-800 dark:text-red-200">
              High priority request - likely to be fulfilled soon
            </div>
          </div>
        )}

        {request.priority === RequestPriority.LOW && (
          <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              Low priority request - may take longer to fulfill
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};