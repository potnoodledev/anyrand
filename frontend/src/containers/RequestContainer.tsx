/**
 * RequestContainer Component
 *
 * Container for the randomness request page with form and related information.
 */

'use client';

import React from 'react';
import { RandomnessRequestForm } from '../components/RandomnessRequestForm';
import { NetworkStatus } from '../components/NetworkStatus';
import { DrandBeaconStatus } from '../components/DrandBeaconStatus';
import { PriceDisplay } from '../components/PriceDisplay';
import { PageHeader } from '../components/Navigation';
import { useAnyrand } from '../hooks/useAnyrand';
import { useWallet } from '../hooks/useWallet';
import { Zap, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const RequestContainer: React.FC = () => {
  const { isConnected } = useWallet();
  const { contractLimits, beaconInfo } = useAnyrand();

  const handleRequestSubmit = (data: any, hash: string) => {
    console.log('Request submitted:', { data, hash });
    // Handle successful submission (e.g., redirect, show success message)
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader
        title="Request Randomness"
        description="Submit a request for verifiable randomness using the Drand beacon network"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Request' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <RandomnessRequestForm
            onSubmit={handleRequestSubmit}
            onCancel={() => {
              // Handle cancel (e.g., redirect back)
              window.history.back();
            }}
          />
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Network Status */}
          <NetworkStatus
            showGasPrice
            showBlockInfo
            showNetworkHealth
          />

          {/* Beacon Status */}
          <DrandBeaconStatus
            showDetails={false}
            showActions={false}
            autoRefresh
          />

          {/* Request Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>Request Guidelines</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Gas Limit</h4>
                <p className="text-sm text-muted-foreground">
                  Set the gas limit for your callback function. Higher limits ensure execution
                  but cost more in fees.
                </p>
                {contractLimits && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum: {contractLimits.maxCallbackGasLimit.toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Deadline</h4>
                <p className="text-sm text-muted-foreground">
                  Requests must be fulfilled before the deadline. Longer deadlines
                  provide more flexibility but may take longer to fulfill.
                </p>
                {contractLimits && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum delta: {(Number(contractLimits.maxDeadlineDelta) / 3600).toFixed(1)} hours
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Fees</h4>
                <p className="text-sm text-muted-foreground">
                  Fees are calculated based on current gas prices and your callback gas limit.
                  Higher fees may result in faster fulfillment.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>How It Works</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium">Submit Request</div>
                  <div className="text-muted-foreground">
                    Your request is recorded on-chain with specified parameters.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium">Drand Assignment</div>
                  <div className="text-muted-foreground">
                    Your request is paired with a future Drand beacon round.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium">Fulfillment</div>
                  <div className="text-muted-foreground">
                    When the Drand round is published, your callback receives the randomness.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-4">
                You need to connect your wallet to submit randomness requests.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};