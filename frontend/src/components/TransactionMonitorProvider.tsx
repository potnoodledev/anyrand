/**
 * TransactionMonitorProvider Component
 *
 * Provides global transaction monitoring capabilities with automatic
 * confirmation tracking and status notifications.
 */

'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Hash, TransactionReceipt } from 'viem';
import { useTransactionMonitor } from '../hooks/useTransactionMonitor';
import { TransactionStatus } from '../types/entities';
import { toast } from 'sonner';
import { Check, Clock, X, ExternalLink } from 'lucide-react';

interface TransactionMonitorContextType {
  // Transaction management
  addTransaction: (hash: Hash, description?: string) => void;
  removeTransaction: (hash: Hash) => void;
  clearTransactions: () => void;

  // Status queries
  isTransactionPending: (hash: Hash) => boolean;
  isTransactionConfirmed: (hash: Hash) => boolean;
  isTransactionFailed: (hash: Hash) => boolean;
  getTransactionStatus: (hash: Hash) => TransactionStatus | undefined;

  // Counts
  totalPendingCount: number;
}

const TransactionMonitorContext = createContext<TransactionMonitorContextType | null>(null);

export const useTransactionMonitoring = () => {
  const context = useContext(TransactionMonitorContext);
  if (!context) {
    throw new Error('useTransactionMonitoring must be used within TransactionMonitorProvider');
  }
  return context;
};

interface TransactionMonitorProviderProps {
  children: React.ReactNode;
  enableNotifications?: boolean;
  confirmationsRequired?: number;
}

// Track transaction descriptions
const transactionDescriptions = new Map<Hash, string>();

export const TransactionMonitorProvider: React.FC<TransactionMonitorProviderProps> = ({
  children,
  enableNotifications = true,
  confirmationsRequired = 3,
}) => {
  const {
    addTransaction: addTx,
    removeTransaction,
    clearTransactions,
    getTransaction,
    isTransactionPending,
    isTransactionConfirmed,
    isTransactionFailed,
    totalPendingCount,
    latestUpdate,
  } = useTransactionMonitor({
    confirmationsRequired,
    enabled: true,
    onStatusUpdate: (update) => {
      if (!enableNotifications) return;

      const description = transactionDescriptions.get(update.hash) || 'Transaction';
      const shortHash = `${update.hash.slice(0, 6)}...${update.hash.slice(-4)}`;

      switch (update.currentStatus) {
        case TransactionStatus.CONFIRMING:
          toast.info('Transaction Confirming', {
            description: `${description} (${shortHash}) is being confirmed. ${update.confirmations}/${confirmationsRequired} confirmations.`,
            icon: <Clock className="w-4 h-4" />,
            duration: 3000,
          });
          break;

        case TransactionStatus.CONFIRMED:
          toast.success('Transaction Confirmed', {
            description: `${description} (${shortHash}) has been confirmed successfully!`,
            icon: <Check className="w-4 h-4" />,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => {
                // Open block explorer
                const explorerUrl = getBlockExplorerUrl(update.hash);
                if (explorerUrl) {
                  window.open(explorerUrl, '_blank');
                }
              },
            },
          });
          break;

        case TransactionStatus.FAILED:
          toast.error('Transaction Failed', {
            description: `${description} (${shortHash}) has failed. Please check the transaction details.`,
            icon: <X className="w-4 h-4" />,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => {
                // Open block explorer
                const explorerUrl = getBlockExplorerUrl(update.hash);
                if (explorerUrl) {
                  window.open(explorerUrl, '_blank');
                }
              },
            },
          });
          break;
      }
    },
    onConfirmed: (hash, receipt) => {
      if (!enableNotifications) return;

      const description = transactionDescriptions.get(hash) || 'Transaction';
      const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;

      toast.success('Transaction Successful', {
        description: `${description} (${shortHash}) completed successfully with ${receipt.gasUsed} gas used.`,
        icon: <Check className="w-4 h-4" />,
        duration: 6000,
        action: {
          label: 'View Receipt',
          onClick: () => {
            const explorerUrl = getBlockExplorerUrl(hash);
            if (explorerUrl) {
              window.open(explorerUrl, '_blank');
            }
          },
        },
      });

      // Clean up description after confirmation
      setTimeout(() => {
        transactionDescriptions.delete(hash);
      }, 60000); // Clean up after 1 minute
    },
    onFailed: (hash, error) => {
      if (!enableNotifications) return;

      const description = transactionDescriptions.get(hash) || 'Transaction';
      const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;

      toast.error('Transaction Failed', {
        description: `${description} (${shortHash}) failed: ${error}`,
        icon: <X className="w-4 h-4" />,
        duration: 10000,
        action: {
          label: 'Details',
          onClick: () => {
            const explorerUrl = getBlockExplorerUrl(hash);
            if (explorerUrl) {
              window.open(explorerUrl, '_blank');
            }
          },
        },
      });

      // Clean up description after failure
      setTimeout(() => {
        transactionDescriptions.delete(hash);
      }, 60000);
    },
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getBlockExplorerUrl = (hash: Hash): string | null => {
    // This would be dynamically determined based on the current chain
    // For now, returning a placeholder that could work for Ethereum mainnet
    return `https://etherscan.io/tx/${hash}`;
  };

  const addTransaction = useCallback((hash: Hash, description?: string) => {
    if (description) {
      transactionDescriptions.set(hash, description);
    }

    addTx(hash);

    if (enableNotifications) {
      const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;
      const desc = description || 'Transaction';

      toast.info('Transaction Submitted', {
        description: `${desc} (${shortHash}) has been submitted to the network.`,
        icon: <Clock className="w-4 h-4" />,
        duration: 4000,
        action: {
          label: 'Track',
          onClick: () => {
            const explorerUrl = getBlockExplorerUrl(hash);
            if (explorerUrl) {
              window.open(explorerUrl, '_blank');
            }
          },
        },
      });
    }
  }, [addTx, enableNotifications]);

  const getTransactionStatus = useCallback((hash: Hash): TransactionStatus | undefined => {
    return getTransaction(hash)?.status;
  }, [getTransaction]);

  // ============================================================================
  // Periodic Cleanup
  // ============================================================================

  useEffect(() => {
    // Clean up old completed transactions every 5 minutes
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      // Remove old descriptions for completed transactions
      Array.from(transactionDescriptions.keys()).forEach(hash => {
        const tx = getTransaction(hash);
        if (tx &&
            (tx.status === TransactionStatus.CONFIRMED || tx.status === TransactionStatus.FAILED) &&
            tx.timestamp &&
            tx.timestamp.getTime() < fiveMinutesAgo) {
          transactionDescriptions.delete(hash);
        }
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(cleanup);
  }, [getTransaction]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: TransactionMonitorContextType = {
    // Transaction management
    addTransaction,
    removeTransaction,
    clearTransactions,

    // Status queries
    isTransactionPending,
    isTransactionConfirmed,
    isTransactionFailed,
    getTransactionStatus,

    // Counts
    totalPendingCount,
  };

  return (
    <TransactionMonitorContext.Provider value={contextValue}>
      {children}
    </TransactionMonitorContext.Provider>
  );
};