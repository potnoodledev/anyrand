/**
 * HistoryContainer Component
 *
 * Container for the request history page with filtering and detailed views.
 */

'use client';

import React from 'react';
import { RequestHistory } from '../components/RequestHistory';
import { PageHeader } from '../components/Navigation';
import { useWallet } from '../hooks/useWallet';
import { useRandomnessRequests } from '../hooks/useRandomnessRequests';
import { History, FileText } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { WalletConnectButton } from '../components/WalletConnectButton';

export const HistoryContainer: React.FC = () => {
  const { isConnected, address, formattedAddress } = useWallet();
  const { requestStats } = useRandomnessRequests();

  const handleRequestSelect = (request: any) => {
    console.log('Selected request for detailed view:', request);
    // Could navigate to a detailed request page or show modal
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <PageHeader
          title="Request History"
          description="View your randomness request history and transaction details"
          breadcrumb={[
            { label: 'Home', href: '/' },
            { label: 'History' },
          ]}
        />

        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <History className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Connect your wallet to view your randomness request history and track
                  the status of your transactions.
                </p>
              </div>
              <WalletConnectButton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader
        title="Request History"
        description={`Viewing request history for ${formattedAddress}`}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'History' },
        ]}
        actions={
          <div className="text-sm text-muted-foreground">
            Connected: {formattedAddress}
          </div>
        }
      />

      {/* Summary Stats */}
      {requestStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{requestStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{requestStats.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{requestStats.fulfilled}</div>
                <div className="text-sm text-muted-foreground">Fulfilled</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{requestStats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main History Component */}
      <RequestHistory
        pageSize={20}
        showFilters
        showPagination
        onRequestSelect={handleRequestSelect}
      />

      {/* Help Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <FileText className="w-6 h-6 text-muted-foreground mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Understanding Request Status</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>
                  <span className="font-medium text-yellow-600">Pending:</span> Request submitted, waiting for Drand round fulfillment
                </div>
                <div>
                  <span className="font-medium text-green-600">Fulfilled:</span> Randomness delivered successfully to your callback
                </div>
                <div>
                  <span className="font-medium text-red-600">Failed:</span> Callback execution failed (usually due to insufficient gas)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};