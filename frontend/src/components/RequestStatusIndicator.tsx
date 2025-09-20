/**
 * RequestStatusIndicator Component
 *
 * Displays real-time status updates for randomness requests with visual indicators
 * and automatic refresh capabilities.
 */

'use client';

import React from 'react';
import { RequestState } from '../types/entities';
import { useRequestStatusUpdates } from '../hooks/useRequestStatusUpdates';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface RequestStatusIndicatorProps {
  requestId: bigint;
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  onStatusChange?: (requestId: bigint, newStatus: RequestState) => void;
}

const getStatusConfig = (state: RequestState) => {
  switch (state) {
    case RequestState.PENDING:
      return {
        icon: Clock,
        label: 'Pending',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        badgeVariant: 'secondary' as const,
      };
    case RequestState.FULFILLED:
      return {
        icon: CheckCircle,
        label: 'Fulfilled',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        badgeVariant: 'default' as const,
      };
    case RequestState.CALLBACK_FAILED:
      return {
        icon: XCircle,
        label: 'Failed',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeVariant: 'destructive' as const,
      };
    default:
      return {
        icon: AlertTriangle,
        label: 'Unknown',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeVariant: 'outline' as const,
      };
  }
};

export const RequestStatusIndicator: React.FC<RequestStatusIndicatorProps> = ({
  requestId,
  className,
  showDetails = false,
  autoRefresh = true,
  onStatusChange,
}) => {
  const {
    getRequestStatus,
    isPolling,
    latestUpdate,
    statusUpdates,
  } = useRequestStatusUpdates({
    requestIds: [requestId],
    enabled: autoRefresh,
    onStatusUpdate: (update) => {
      if (update.requestId === requestId && onStatusChange) {
        onStatusChange(requestId, update.currentState);
      }
    },
  });

  const currentStatus = getRequestStatus(requestId);
  const config = getStatusConfig(currentStatus || RequestState.PENDING);
  const Icon = config.icon;

  // Find the latest update for this specific request
  const requestUpdate = statusUpdates
    .filter(update => update.requestId === requestId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

  if (!showDetails) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="relative">
          <Icon className={cn('w-4 h-4', config.color)} />
          {isPolling && currentStatus === RequestState.PENDING && (
            <Loader2 className="w-3 h-3 absolute -top-1 -right-1 animate-spin text-blue-500" />
          )}
        </div>
        <Badge variant={config.badgeVariant} className="text-xs">
          {config.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn('w-full', config.borderColor, className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Icon className={cn('w-5 h-5', config.color)} />
              {isPolling && currentStatus === RequestState.PENDING && (
                <Activity className="w-3 h-3 absolute -top-1 -right-1 animate-pulse text-blue-500" />
              )}
            </div>
            <span className="text-sm font-medium">
              Request #{requestId.toString()}
            </span>
          </div>
          <Badge variant={config.badgeVariant}>
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('pt-0', config.bgColor)}>
        <div className="space-y-3">
          {/* Current Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className={cn('font-medium', config.color)}>
              {config.label}
            </span>
          </div>

          {/* Polling Indicator */}
          {autoRefresh && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Real-time updates:</span>
              <div className="flex items-center space-x-1">
                {isPolling ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-green-500" />
                    <span className="text-green-600 text-xs">Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <span className="text-gray-600 text-xs">Inactive</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Last Update */}
          {requestUpdate && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last update:</span>
                <span className="text-xs">
                  {requestUpdate.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {requestUpdate.previousState !== requestUpdate.currentState && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">Changed from:</span>
                  <Badge variant="outline" className="text-xs">
                    {getStatusConfig(requestUpdate.previousState).label}
                  </Badge>
                  <span className="text-muted-foreground">to:</span>
                  <Badge variant={config.badgeVariant} className="text-xs">
                    {config.label}
                  </Badge>
                </div>
              )}

              {requestUpdate.transactionHash && (
                <div className="flex items-center space-x-2 text-xs">
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="text-muted-foreground">Tx:</span>
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    {requestUpdate.transactionHash.slice(0, 10)}...
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Status Description */}
          <div className="text-xs text-muted-foreground pt-2 border-t border-gray-200">
            {currentStatus === RequestState.PENDING && (
              "Waiting for Drand round fulfillment. This may take a few minutes."
            )}
            {currentStatus === RequestState.FULFILLED && (
              "Randomness has been successfully delivered to your callback."
            )}
            {currentStatus === RequestState.CALLBACK_FAILED && (
              "Randomness was generated but callback execution failed. Check gas limits."
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};