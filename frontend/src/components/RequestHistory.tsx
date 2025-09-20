/**
 * RequestHistory Component
 *
 * Displays a paginated table of user's randomness requests with filtering,
 * sorting, and detailed status information.
 */

import React from 'react';
import { Search, Filter, RefreshCw, Eye, Copy, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
  TableEmptyState,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useRandomnessRequests } from '../hooks/useRandomnessRequests';
import { useBlockchainData } from '../hooks/useBlockchainData';
import { RequestState } from '../types/entities';
import { formatEther } from 'viem';
import { formatDate, formatNumber, copyToClipboard, truncateAddress } from '../lib/utils';
import { toast } from './ui/toast';
import { RequestHistoryProps } from '../types/components';

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

export const RequestHistory: React.FC<RequestHistoryProps> = ({
  pageSize = 10,
  showFilters = true,
  showPagination = true,
  onRequestSelect,
  className,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<RequestState | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);

  const { networkConfig } = useBlockchainData();

  const {
    requests,
    requestStats,
    isLoading,
    isFetching,
    refreshRequests,
    hasNextPage,
    loadMoreRequests,
    error,
  } = useRandomnessRequests({
    pageSize,
    filter: {
      ...(statusFilter !== 'all' && { state: [statusFilter] }),
    },
  });

  const filteredRequests = React.useMemo(() => {
    let filtered = requests;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.id.toLowerCase().includes(term) ||
          request.requester.toLowerCase().includes(term) ||
          request.transactionHash?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [requests, searchTerm]);

  const paginatedRequests = React.useMemo(() => {
    if (!showPagination) return filteredRequests;

    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize);

  const handleCopyId = async (id: string) => {
    const success = await copyToClipboard(id);
    if (success) {
      toast.success({ title: 'Copied', description: 'Request ID copied to clipboard.' });
    }
  };

  const handleCopyHash = async (hash: string) => {
    const success = await copyToClipboard(hash);
    if (success) {
      toast.success({ title: 'Copied', description: 'Transaction hash copied to clipboard.' });
    }
  };

  const openBlockExplorer = (hash: string) => {
    if (networkConfig?.blockExplorerUrls[0]) {
      const url = `${networkConfig.blockExplorerUrls[0]}/tx/${hash}`;
      window.open(url, '_blank');
    }
  };

  const formatRandomness = (randomness: bigint) => {
    if (randomness === 0n) return 'Pending';
    return `${randomness.toString().slice(0, 10)}...`;
  };

  const renderRequestDetails = (request: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Request ID</label>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm font-mono">{request.id}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopyId(request.id)}
              className="h-6 w-6 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <div className="mt-1">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.state]}`}>
              {STATUS_LABELS[request.state]}
            </span>
          </div>
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
          <label className="text-sm font-medium text-muted-foreground">Deadline</label>
          <div className="text-sm mt-1">{formatDate(new Date(Number(request.deadline) * 1000))}</div>
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium text-muted-foreground">Randomness</label>
          <div className="text-sm font-mono mt-1 break-all">
            {request.randomness === 0n ? 'Pending' : request.randomness.toString()}
          </div>
        </div>

        {request.transactionHash && (
          <div className="col-span-2">
            <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm font-mono">{truncateAddress(request.transactionHash, 10, 8)}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyHash(request.transactionHash!)}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openBlockExplorer(request.transactionHash!)}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Request History</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshRequests}
              disabled={isFetching}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-semibold">{requestStats.total}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Pending</div>
            <div className="font-semibold text-yellow-600">{requestStats.pending}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Fulfilled</div>
            <div className="font-semibold text-green-600">{requestStats.fulfilled}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Success Rate</div>
            <div className="font-semibold">{requestStats.successRate.toFixed(1)}%</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by ID, address, or transaction hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestState | 'all')}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="all">All Status</option>
              <option value={RequestState.PENDING}>Pending</option>
              <option value={RequestState.FULFILLED}>Fulfilled</option>
              <option value={RequestState.CALLBACK_FAILED}>Failed</option>
            </select>
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
              <TableHead>Status</TableHead>
              <TableHead>Fee Paid</TableHead>
              <TableHead>Gas Limit</TableHead>
              <TableHead>Randomness</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2" />
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : paginatedRequests.length === 0 ? (
              <TableEmptyState
                title="No requests found"
                description={
                  searchTerm || statusFilter !== 'all'
                    ? 'No requests match your current filters.'
                    : "You haven't made any randomness requests yet."
                }
                action={
                  (searchTerm || statusFilter !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )
                }
              />
            ) : (
              paginatedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-sm">
                    #{request.requestId.toString()}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.state]}`}>
                      {STATUS_LABELS[request.state]}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatEther(request.feePaid)} ETH
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatNumber(Number(request.callbackGasLimit))}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatRandomness(request.randomness)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(request.createdAt)}
                  </TableCell>
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
                          <DialogTitle>Request Details</DialogTitle>
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

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            disabled={isLoading}
          />
        )}

        {/* Load More Button */}
        {hasNextPage && !showPagination && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={loadMoreRequests}
              disabled={isFetching}
            >
              {isFetching ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};