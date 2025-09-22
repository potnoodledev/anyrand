'use client'

import React, { useState, useCallback } from 'react'
import { useRequestsQuery } from '../../hooks/anyrand/use-requests-query'
import { RandomnessRequest, getStatusText, RequestStatus } from '../../types/anyrand/randomness-request'
import { RequestQueryFilters } from '../../types/anyrand/frontend-api'

interface RequestListProps {
  filters?: RequestQueryFilters
  pageSize?: number
  showUserOnly?: boolean
  onRequestClick?: (request: RandomnessRequest) => void
  onRequestSelect?: (request: RandomnessRequest) => void
  selectable?: boolean
  className?: string
}

interface RequestCardProps {
  request: RandomnessRequest
  onClick?: () => void
  onSelect?: () => void
  selected?: boolean
  selectable?: boolean
}

function RequestCard({ request, onClick, onSelect, selected, selectable }: RequestCardProps) {
  const statusColors = {
    [RequestStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [RequestStatus.Fulfilled]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [RequestStatus.Failed]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [RequestStatus.Nonexistent]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimestamp = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const isPastDeadline = request.deadline < BigInt(Math.floor(Date.now() / 1000))

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
        selected ? 'ring-2 ring-blue-500 border-blue-500' : ''
      } ${onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Request #{request.id.toString()}
          </h3>
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[request.status]}`}>
          {getStatusText(request.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Requester:</span>
          <p className="font-mono text-gray-900 dark:text-white">{formatAddress(request.requester)}</p>
        </div>

        <div>
          <span className="text-gray-500 dark:text-gray-400">Fee Paid:</span>
          <p className="font-mono text-gray-900 dark:text-white">
            {(Number(request.feePaid) / 1e18).toFixed(6)} ETH
          </p>
        </div>

        <div>
          <span className="text-gray-500 dark:text-gray-400">Deadline:</span>
          <p className="text-gray-900 dark:text-white">
            {formatTimestamp(request.deadline)}
            {request.status === RequestStatus.Pending && (
              <span className={`ml-2 text-xs ${isPastDeadline ? 'text-green-600' : 'text-yellow-600'}`}>
                ({isPastDeadline ? 'Fulfillable' : 'Pending'})
              </span>
            )}
          </p>
        </div>

        <div>
          <span className="text-gray-500 dark:text-gray-400">Gas Limit:</span>
          <p className="font-mono text-gray-900 dark:text-white">
            {request.callbackGasLimit.toLocaleString()}
          </p>
        </div>

        <div className="md:col-span-2">
          <span className="text-gray-500 dark:text-gray-400">Created:</span>
          <p className="text-gray-900 dark:text-white">{formatTimestamp(request.timestamp)}</p>
        </div>

        {request.fulfillment && (
          <div className="md:col-span-2 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Operator:</span>
                <p className="font-mono text-gray-900 dark:text-white">
                  {formatAddress(request.fulfillment.operator)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Fulfilled:</span>
                <p className="text-gray-900 dark:text-white">
                  {formatTimestamp(request.fulfillment.timestamp)}
                </p>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Randomness:</span>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                  {request.fulfillment.randomness.toString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action indicators */}
      <div className="flex justify-end mt-3 space-x-2">
        {request.status === RequestStatus.Pending && isPastDeadline && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Can Fulfill
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            // View transaction on block explorer
            const explorerUrl = `https://sepolia.scrollscan.com/tx/${request.transactionHash}`
            window.open(explorerUrl, '_blank')
          }}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Tx
        </button>
      </div>
    </div>
  )
}

export function RequestList({
  filters: _filters,
  pageSize: _pageSize = 10,
  showUserOnly = false,
  onRequestClick,
  onRequestSelect,
  selectable = false,
  className = ''
}: RequestListProps) {
  const { requests } = useRequestsQuery()
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())

  // Handle request selection
  const handleRequestSelect = useCallback((request: RandomnessRequest) => {
    if (!selectable) return

    const requestId = request.id.toString()
    const newSelected = new Set(selectedRequests)

    if (newSelected.has(requestId)) {
      newSelected.delete(requestId)
    } else {
      newSelected.add(requestId)
    }

    setSelectedRequests(newSelected)
    onRequestSelect?.(request)
  }, [selectedRequests, selectable, onRequestSelect])

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedRequests.size === requests.data.length) {
      setSelectedRequests(new Set())
    } else {
      const allIds = new Set(requests.data.map(r => r.id.toString()))
      setSelectedRequests(allIds)
    }
  }, [requests.data, selectedRequests])

  // Filter requests based on props
  const filteredRequests = requests.data.filter(_request => {
    if (showUserOnly) {
      // In a real implementation, this would filter by connected user address
      return true // Placeholder
    }
    return true
  })

  if (requests.isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse">
            <div className="flex justify-between items-start mb-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (requests.error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading Requests</h3>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
          {requests.error.message}
        </p>
        <button
          onClick={requests.refetch}
          className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (filteredRequests.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No requests found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {showUserOnly
            ? "You haven't submitted any randomness requests yet."
            : "No randomness requests have been submitted on this network yet."
          }
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header with bulk actions */}
      {selectable && (
        <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedRequests.size === requests.data.length && requests.data.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Select All ({selectedRequests.size} selected)
            </span>
          </label>

          {selectedRequests.size > 0 && (
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                Export Selected
              </button>
              <button
                onClick={() => setSelectedRequests(new Set())}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <RequestCard
            key={request.id.toString()}
            request={request}
            onClick={onRequestClick ? () => onRequestClick(request) : undefined}
            onSelect={() => handleRequestSelect(request)}
            selected={selectedRequests.has(request.id.toString())}
            selectable={selectable}
          />
        ))}
      </div>

      {/* Pagination */}
      {requests.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((requests.currentPage - 1) * requests.pageSize) + 1} to {Math.min(requests.currentPage * requests.pageSize, requests.totalItems)} of {requests.totalItems} requests
          </div>

          <div className="flex space-x-2">
            <button
              disabled={!requests.hasPreviousPage}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
              Page {requests.currentPage} of {Math.ceil(requests.totalItems / requests.pageSize)}
            </span>

            <button
              disabled={!requests.hasNextPage}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}