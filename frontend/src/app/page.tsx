/**
 * Main Page
 *
 * The main page of the Anyrand application featuring randomness request form,
 * request history, pending requests, and network status.
 */

'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { NetworkStatus } from '../components/NetworkStatus';
import { RandomnessRequestForm } from '../components/RandomnessRequestForm';
import { RequestHistory } from '../components/RequestHistory';
import { PendingRequests } from '../components/PendingRequests';
import { DrandBeaconStatus } from '../components/DrandBeaconStatus';
import { useWallet } from '../hooks/useWallet';
import { Zap, History, Clock, Radio } from 'lucide-react';

export default function HomePage() {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = React.useState('request');

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anyrand</h1>
          <p className="text-muted-foreground">
            Verifiable randomness for smart contracts using the Drand network
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <WalletConnectButton />
        </div>
      </div>

      {/* Network Status Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NetworkStatus compact />
        <DrandBeaconStatus
          showDetails={false}
          showActions={false}
          autoRefresh
          className="lg:justify-self-end"
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="request" className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Request</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Pending</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center space-x-2">
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Status</span>
          </TabsTrigger>
        </TabsList>

        {/* Request Randomness Tab */}
        <TabsContent value="request" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RandomnessRequestForm
                onSubmit={(data, hash) => {
                  console.log('Request submitted:', { data, hash });
                  // Optionally switch to history tab after successful submission
                  setActiveTab('history');
                }}
              />
            </div>

            <div className="space-y-4">
              <NetworkStatus
                showGasPrice
                showBlockInfo
                showNetworkHealth
              />
            </div>
          </div>
        </TabsContent>

        {/* Request History Tab */}
        <TabsContent value="history" className="space-y-6">
          {isConnected ? (
            <RequestHistory
              pageSize={20}
              showFilters
              showPagination
              onRequestSelect={(request) => {
                console.log('Selected request:', request);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                <p className="text-muted-foreground">
                  Connect your wallet to view your randomness request history.
                </p>
              </div>
              <WalletConnectButton />
            </div>
          )}
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PendingRequests
                showUserRequests={false}
                showQueue
                showFilters
                onRequestSelect={(request) => {
                  console.log('Selected pending request:', request);
                }}
              />
            </div>

            <div className="space-y-4">
              {isConnected && (
                <PendingRequests
                  showUserRequests={true}
                  showQueue={false}
                  showFilters={false}
                  onRequestSelect={(request) => {
                    console.log('Selected user pending request:', request);
                  }}
                />
              )}

              <DrandBeaconStatus
                showDetails
                showActions
                autoRefresh
              />
            </div>
          </div>
        </TabsContent>

        {/* Network Status Tab */}
        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NetworkStatus
              showGasPrice
              showBlockInfo
              showNetworkHealth
            />

            <DrandBeaconStatus
              showDetails
              showActions
              autoRefresh
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Stats Footer */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">24/7</div>
            <div className="text-sm text-muted-foreground">Beacon Uptime</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">3s</div>
            <div className="text-sm text-muted-foreground">Round Interval</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">100%</div>
            <div className="text-sm text-muted-foreground">Verifiable</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">∞</div>
            <div className="text-sm text-muted-foreground">Entropy</div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-muted/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium mb-1">1. Request Randomness</div>
            <div className="text-muted-foreground">
              Submit a request with your desired callback gas limit and deadline.
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">2. Drand Verification</div>
            <div className="text-muted-foreground">
              Your request is paired with a future Drand beacon round for verification.
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">3. Callback Execution</div>
            <div className="text-muted-foreground">
              Once the Drand round is published, the randomness is delivered to your contract.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}