/**
 * DrandBeaconStatus Component
 *
 * Displays the status of the Drand beacon network including connectivity,
 * current round information, and network health indicators.
 */

import React from 'react';
import { Radio, CheckCircle, AlertCircle, XCircle, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useDrandBeacon } from '../hooks/useDrandBeacon';
import { formatDate, getRelativeTime } from '../lib/utils';
import { DrandBeaconStatusProps } from '../types/components';

const STATUS_ICONS = {
  active: CheckCircle,
  delayed: AlertCircle,
  offline: XCircle,
};

const STATUS_COLORS = {
  active: 'text-green-600 dark:text-green-400',
  delayed: 'text-yellow-600 dark:text-yellow-400',
  offline: 'text-red-600 dark:text-red-400',
};

const STATUS_BACKGROUNDS = {
  active: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  delayed: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  offline: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

const STATUS_LABELS = {
  active: 'Active',
  delayed: 'Delayed',
  offline: 'Offline',
};

export const DrandBeaconStatus: React.FC<DrandBeaconStatusProps> = ({
  network = 'quicknet',
  showDetails = true,
  showActions = true,
  autoRefresh = true,
  className,
}) => {
  const {
    currentRound,
    beaconInfo,
    beaconStatus,
    getNextRoundTime,
    getTimeToNextRound,
    refreshCurrentPulse,
    isLoading,
    networkConfig,
    error,
  } = useDrandBeacon(network);

  const StatusIcon = STATUS_ICONS[beaconStatus.status];

  const formatTimeToNext = () => {
    const timeMs = getTimeToNextRound();
    const seconds = Math.floor(timeMs / 1000);

    if (seconds <= 0) return 'Now';
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getStatusMessage = () => {
    switch (beaconStatus.status) {
      case 'active':
        return 'Beacon is operating normally';
      case 'delayed':
        return `Beacon is delayed by ${beaconStatus.latency}s`;
      case 'offline':
        return 'Beacon appears to be offline';
      default:
        return 'Unknown beacon status';
    }
  };

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh || beaconStatus.status !== 'active') return;

    const interval = setInterval(() => {
      refreshCurrentPulse();
    }, networkConfig.period * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, beaconStatus.status, refreshCurrentPulse, networkConfig.period]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5" />
            <span>Drand Beacon Status</span>
            <span className="text-sm text-muted-foreground">({network})</span>
          </div>
          {showActions && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCurrentPulse}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Banner */}
        <div className={`p-3 rounded-md border ${STATUS_BACKGROUNDS[beaconStatus.status]}`}>
          <div className="flex items-center space-x-2">
            <StatusIcon className={`w-5 h-5 ${STATUS_COLORS[beaconStatus.status]}`} />
            <div>
              <div className={`font-medium ${STATUS_COLORS[beaconStatus.status]}`}>
                {STATUS_LABELS[beaconStatus.status]}
              </div>
              <div className={`text-sm ${STATUS_COLORS[beaconStatus.status]}`}>
                {getStatusMessage()}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="text-sm text-red-800 dark:text-red-200">
              {error.userMessage || error.message}
            </div>
          </div>
        )}

        {/* Current Round Info */}
        {currentRound && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Round</label>
                <div className="text-lg font-mono font-semibold">
                  #{currentRound.round.toString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Next Round In</label>
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {formatTimeToNext()}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Latest Randomness</label>
              <div className="text-sm font-mono break-all p-2 rounded border bg-muted/50">
                {currentRound.randomness}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Round Time</label>
                <div className="text-sm">{formatDate(currentRound.timestamp)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Age</label>
                <div className="text-sm">{getRelativeTime(currentRound.timestamp)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Extended Details */}
        {showDetails && beaconInfo && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Network Configuration</label>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Period:</span> {beaconInfo.period}s
                </div>
                <div>
                  <span className="text-muted-foreground">Scheme:</span> {beaconInfo.schemeID}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Public Key</label>
              <div className="text-xs font-mono break-all p-2 rounded border bg-muted/50">
                {beaconInfo.publicKey}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Network Hash</label>
              <div className="text-xs font-mono break-all p-2 rounded border bg-muted/50">
                {beaconInfo.hash}
              </div>
            </div>
          </div>
        )}

        {/* Connection Statistics */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Expected Round</div>
            <div className="font-mono text-sm">#{beaconStatus.expectedRound.toString()}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Latency</div>
            <div className="font-mono text-sm">{beaconStatus.latency}s</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Last Update</div>
            <div className="text-sm">{getRelativeTime(beaconStatus.lastUpdate)}</div>
          </div>
        </div>

        {/* Next Round Countdown */}
        {beaconStatus.status === 'active' && (
          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <div className="font-medium">Next Round Schedule</div>
                <div className="text-xs">
                  Round #{(beaconStatus.expectedRound + 1n).toString()} expected at{' '}
                  {formatDate(getNextRoundTime())}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Offline Warning */}
        {beaconStatus.status === 'offline' && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="text-sm text-red-800 dark:text-red-200">
              <div className="font-medium mb-1">Beacon Offline</div>
              <div className="text-xs">
                The Drand beacon appears to be offline or unreachable.
                This may affect randomness fulfillment times.
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !currentRound && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border border-gray-300 border-t-gray-600 rounded-full mr-3" />
            <span className="text-sm text-muted-foreground">Loading beacon status...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};