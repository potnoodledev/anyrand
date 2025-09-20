/**
 * QueueContainer Component
 *
 * Container for the pending requests queue page with fulfillment monitoring.
 */

'use client';

import React from 'react';
import { PendingRequests } from '../components/PendingRequests';
import { DrandBeaconStatus } from '../components/DrandBeaconStatus';
import { NetworkStatus } from '../components/NetworkStatus';
import { PageHeader } from '../components/Navigation';
import { usePendingRequests } from '../hooks/usePendingRequests';
import { useWallet } from '../hooks/useWallet';
import { Clock, TrendingUp, Users, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const QueueContainer: React.FC = () => {
  const { isConnected } = useWallet();
  const { queueStats, getNextInQueue } = usePendingRequests();

  const nextInQueue = getNextInQueue(3);

  const handleRequestSelect = (request: any) => {
    console.log('Selected pending request:', request);
    // Could show detailed view or navigate to specific request
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader
        title="Fulfillment Queue"
        description="Monitor pending randomness requests and fulfillment progress"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Queue' },
        ]}
      />

      {/* Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{queueStats.total}</div>
                <div className="text-sm text-muted-foreground">Total in Queue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{queueStats.byPriority.high}</div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{queueStats.avgWaitTime}m</div>
                <div className="text-sm text-muted-foreground">Avg Wait Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {(Number(queueStats.totalFees) / 1e18).toFixed(3)}
                </div>
                <div className="text-sm text-muted-foreground">Total Fees (ETH)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next in Queue Highlight */}
      {nextInQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Next in Queue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nextInQueue.map((request, index) => (
                <div
                  key={request.id}
                  className="p-4 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">#{request.requestId.toString()}</span>
                    <span className="text-sm text-muted-foreground">
                      Position #{request.queuePosition}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Est. {Math.floor((request.estimatedFulfillmentTime.getTime() - Date.now()) / 60000)}m
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Queue Display */}
        <div className="lg:col-span-2">
          <PendingRequests
            showUserRequests={false}
            showQueue
            showFilters
            onRequestSelect={handleRequestSelect}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User's Pending Requests */}
          {isConnected && (
            <PendingRequests
              showUserRequests={true}
              showQueue={false}
              showFilters={false}
              onRequestSelect={handleRequestSelect}
            />
          )}

          {/* Beacon Status */}
          <DrandBeaconStatus
            showDetails={false}
            showActions
            autoRefresh
          />

          {/* Network Status */}
          <NetworkStatus
            showGasPrice
            showNetworkHealth
            compact={false}
          />

          {/* Queue Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Queue Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Priority System</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-red-600">High Priority:</span>
                    <span>High fees, close deadlines</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Medium Priority:</span>
                    <span>Standard fees and deadlines</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Low Priority:</span>
                    <span>Low fees, distant deadlines</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Fulfillment Process</h4>
                <p className="text-muted-foreground">
                  Requests are fulfilled when their assigned Drand round becomes available.
                  Higher priority requests are processed first within each round.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Estimated Times</h4>
                <p className="text-muted-foreground">
                  Estimates are based on current queue depth, priority level, and
                  historical fulfillment patterns. Actual times may vary.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};