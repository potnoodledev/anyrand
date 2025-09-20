/**
 * StatusNotificationProvider Component
 *
 * Provides global status notifications for randomness request updates
 * with toast notifications and real-time monitoring.
 */

'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRandomnessRequests } from '../hooks/useRandomnessRequests';
import { useRequestStatusUpdates } from '../hooks/useRequestStatusUpdates';
import { RequestState } from '../types/entities';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface StatusNotificationContextType {
  showRequestSubmitted: (requestId: bigint) => void;
  showRequestFulfilled: (requestId: bigint) => void;
  showRequestFailed: (requestId: bigint) => void;
}

const StatusNotificationContext = createContext<StatusNotificationContextType | null>(null);

export const useStatusNotifications = () => {
  const context = useContext(StatusNotificationContext);
  if (!context) {
    throw new Error('useStatusNotifications must be used within StatusNotificationProvider');
  }
  return context;
};

interface StatusNotificationProviderProps {
  children: React.ReactNode;
  enableAutoNotifications?: boolean;
}

export const StatusNotificationProvider: React.FC<StatusNotificationProviderProps> = ({
  children,
  enableAutoNotifications = true,
}) => {
  const { address, isConnected } = useAccount();
  const { allRequests } = useRandomnessRequests({ enabled: isConnected });

  // Get all pending request IDs
  const pendingRequestIds = allRequests
    .filter(request => request.state === RequestState.PENDING)
    .map(request => request.requestId);

  // Setup status monitoring for pending requests
  const { latestUpdate } = useRequestStatusUpdates({
    requestIds: pendingRequestIds,
    enabled: enableAutoNotifications && isConnected && pendingRequestIds.length > 0,
    onStatusUpdate: (update) => {
      if (!enableAutoNotifications) return;

      // Show notifications for status changes
      if (update.currentState === RequestState.FULFILLED) {
        showRequestFulfilled(update.requestId);
      } else if (update.currentState === RequestState.CALLBACK_FAILED) {
        showRequestFailed(update.requestId);
      }
    },
  });

  // ============================================================================
  // Notification Functions
  // ============================================================================

  const showRequestSubmitted = useCallback((requestId: bigint) => {
    toast.success('Request Submitted', {
      description: `Randomness request #${requestId} has been submitted successfully.`,
      icon: <Zap className="w-4 h-4" />,
      duration: 5000,
      action: {
        label: 'View',
        onClick: () => {
          // Navigate to request details or history
          console.log('Navigate to request:', requestId);
        },
      },
    });
  }, []);

  const showRequestFulfilled = useCallback((requestId: bigint) => {
    toast.success('Request Fulfilled', {
      description: `Randomness request #${requestId} has been fulfilled successfully!`,
      icon: <CheckCircle className="w-4 h-4" />,
      duration: 8000,
      action: {
        label: 'View Details',
        onClick: () => {
          // Navigate to request details
          console.log('Navigate to fulfilled request:', requestId);
        },
      },
    });
  }, []);

  const showRequestFailed = useCallback((requestId: bigint) => {
    toast.error('Request Failed', {
      description: `Randomness request #${requestId} callback execution failed. Check gas limits.`,
      icon: <XCircle className="w-4 h-4" />,
      duration: 10000,
      action: {
        label: 'Troubleshoot',
        onClick: () => {
          // Navigate to troubleshooting or request details
          console.log('Navigate to failed request:', requestId);
        },
      },
    });
  }, []);

  // ============================================================================
  // Auto-notifications for new requests
  // ============================================================================

  useEffect(() => {
    if (!enableAutoNotifications || !isConnected) return;

    // This would typically be triggered by the request submission process
    // For now, we'll rely on the parent components to call showRequestSubmitted
  }, [enableAutoNotifications, isConnected]);

  // ============================================================================
  // Connection Status Notifications
  // ============================================================================

  useEffect(() => {
    if (!enableAutoNotifications) return;

    if (isConnected && address) {
      toast.info('Wallet Connected', {
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        duration: 3000,
      });
    }
  }, [isConnected, address, enableAutoNotifications]);

  const contextValue: StatusNotificationContextType = {
    showRequestSubmitted,
    showRequestFulfilled,
    showRequestFailed,
  };

  return (
    <StatusNotificationContext.Provider value={contextValue}>
      {children}
    </StatusNotificationContext.Provider>
  );
};