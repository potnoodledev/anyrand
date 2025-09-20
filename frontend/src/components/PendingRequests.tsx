/**
 * PendingRequests Component
 *
 * Displays pending randomness requests across all users with fulfillment
 * queue information, priority indicators, and estimated wait times.
 */

import React from 'react';
import { Clock, TrendingUp, Users, RefreshCw, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyState,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { usePendingRequests } from '../hooks/usePendingRequests';
import { useWallet } from '../hooks/useWallet';
import { RequestPriority } from '../types/entities';
import { formatEther } from 'viem';
import { formatNumber, truncateAddress, getRelativeTime } from '../lib/utils';
import { PendingRequestsProps } from '../types/components';

const PRIORITY_COLORS = {
  [RequestPriority.HIGH]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [RequestPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [RequestPriority.LOW]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const PRIORITY_LABELS = {
  [RequestPriority.HIGH]: 'High',
  [RequestPriority.MEDIUM]: 'Medium',
  [RequestPriority.LOW]: 'Low',
};

export const PendingRequests: React.FC<PendingRequestsProps> = ({
  showUserRequests = false,
  showQueue = true,
  showFilters = true,
  onRequestSelect,
  className,
}) => {
  const { address } = useWallet();
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const [priorityFilter, setPriorityFilter] = React.useState<RequestPriority | 'all'>('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  const {
    pendingRequests,
    queueStats,
    getNextInQueue,
    getUserRequests,
    refreshPendingRequests,
    isLoading,
    isFetching,
    error,
  } = usePendingRequests({
    ...(priorityFilter !== 'all' && { priority: [priorityFilter] }),
    ...(searchTerm && { requester: searchTerm }),
  });

  const userRequests = React.useMemo(() => {
    return address ? getUserRequests(address) : [];
  }, [address, getUserRequests]);

  const displayRequests = showUserRequests ? userRequests : pendingRequests;

  const filteredRequests = React.useMemo(() => {
    let filtered = displayRequests;

    if (searchTerm && !showUserRequests) {
      filtered = filtered.filter(
        (request) =>
          request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.requester.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [displayRequests, searchTerm, showUserRequests]);

  const nextInQueue = getNextInQueue(5);

  const formatEstimatedTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff <= 0) return 'Soon';

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `~${hours}h ${minutes % 60}m`;
    return `~${minutes}m`;
  };

  const renderRequestDetails = (request: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Request ID</label>
          <div className="text-sm font-mono mt-1">{request.id}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Priority</label>
          <div className="mt-1">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[request.priority]}`}>
              {PRIORITY_LABELS[request.priority]}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Queue Position</label>
          <div className="text-sm font-mono mt-1">#{request.queuePosition}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Estimated Fulfillment</label>
          <div className="text-sm mt-1">{formatEstimatedTime(request.estimatedFulfillmentTime)}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Requester</label>
          <div className="text-sm font-mono mt-1">{truncateAddress(request.requester)}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Fee Paid</label>
          <div className="text-sm font-mono mt-1">{formatEther(request.feePaid)} ETH</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Gas Limit</label>
          <div className="text-sm font-mono mt-1">{formatNumber(Number(request.callbackGasLimit))}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Created</label>
          <div className="text-sm mt-1">{getRelativeTime(request.createdAt)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>{showUserRequests ? 'My Pending Requests' : 'Pending Requests Queue'}</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPendingRequests}
            disabled={isFetching}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>

        {/* Queue Statistics */}
        {showQueue && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Queue</div>
              <div className="font-semibold">{queueStats.total}</div>
            </div>
            <div>
              <div className="text-muted-foreground">High Priority</div>
              <div className="font-semibold text-red-600">{queueStats.byPriority.high}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Wait</div>
              <div className="font-semibold">{queueStats.avgWaitTime}m</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Fees</div>
              <div className="font-semibold">{formatEther(queueStats.totalFees)} ETH</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Filters */}
        {showFilters && !showUserRequests && (
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by request ID or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as RequestPriority | 'all')}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="all">All Priority</option>
              <option value={RequestPriority.HIGH}>High</option>
              <option value={RequestPriority.MEDIUM}>Medium</option>
              <option value={RequestPriority.LOW}>Low</option>
            </select>
          </div>
        )}

        {/* Next in Queue Highlight */}
        {showQueue && nextInQueue.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Next in Queue
              </span>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              Request #{nextInQueue[0].requestId.toString()} • {PRIORITY_LABELS[nextInQueue[0].priority]} Priority •
              Est. {formatEstimatedTime(nextInQueue[0].estimatedFulfillmentTime)}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
            <div className="text-sm text-red-800 dark:text-red-200">
              {error.userMessage || error.message}
            </div>
          </div>
        )}

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Queue Position</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Estimated Time</TableHead>
              {!showUserRequests && <TableHead>Requester</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showUserRequests ? 6 : 7} className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2" />
                  Loading pending requests...
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableEmptyState
                title={showUserRequests ? "No pending requests" : "No requests in queue"}
                description={
                  showUserRequests
                    ? "You don't have any pending randomness requests."
                    : "There are no pending requests in the fulfillment queue."
                }
              />
            ) : (
              filteredRequests.slice(0, 50).map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-sm">
                    #{request.requestId.toString()}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[request.priority]}`}>
                      {PRIORITY_LABELS[request.priority]}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    #{request.queuePosition}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatEther(request.feePaid)} ETH
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatEstimatedTime(request.estimatedFulfillmentTime)}
                  </TableCell>
                  {!showUserRequests && (
                    <TableCell className="font-mono text-sm">
                      {truncateAddress(request.requester)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            onRequestSelect?.(request);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent size="lg">
                        <DialogHeader>
                          <DialogTitle>Pending Request Details</DialogTitle>
                        </DialogHeader>
                        {selectedRequest && renderRequestDetails(selectedRequest)}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};