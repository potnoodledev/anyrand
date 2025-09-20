/**
 * useTransactionMonitor Hook
 *
 * Monitors transaction confirmations and provides real-time updates
 * on transaction status, including pending, confirmed, and failed states.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, TransactionReceipt } from 'viem';
import { useChainId, useBlockNumber, useWaitForTransactionReceipt } from 'wagmi';
import { TransactionStatus } from '../types/entities';

interface TransactionInfo {
  hash: Hash;
  status: TransactionStatus;
  confirmations: number;
  blockNumber?: bigint;
  blockHash?: string;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  timestamp?: Date;
  receipt?: TransactionReceipt;
  error?: string;
}

interface TransactionUpdate {
  hash: Hash;
  previousStatus: TransactionStatus;
  currentStatus: TransactionStatus;
  confirmations: number;
  timestamp: Date;
}

interface UseTransactionMonitorOptions {
  confirmationsRequired?: number;
  pollingInterval?: number;
  enabled?: boolean;
  onStatusUpdate?: (update: TransactionUpdate) => void;
  onConfirmed?: (hash: Hash, receipt: TransactionReceipt) => void;
  onFailed?: (hash: Hash, error: string) => void;
}

interface UseTransactionMonitorReturn {
  // Transaction management
  addTransaction: (hash: Hash) => void;
  removeTransaction: (hash: Hash) => void;
  clearTransactions: () => void;

  // Transaction info
  getTransaction: (hash: Hash) => TransactionInfo | undefined;
  isTransactionPending: (hash: Hash) => boolean;
  isTransactionConfirmed: (hash: Hash) => boolean;
  isTransactionFailed: (hash: Hash) => boolean;

  // Bulk queries
  allTransactions: TransactionInfo[];
  pendingTransactions: TransactionInfo[];
  confirmedTransactions: TransactionInfo[];
  failedTransactions: TransactionInfo[];

  // Status tracking
  updates: TransactionUpdate[];
  latestUpdate: TransactionUpdate | null;

  // State
  isMonitoring: boolean;
  totalPendingCount: number;
}

export function useTransactionMonitor(
  options: UseTransactionMonitorOptions = {}
): UseTransactionMonitorReturn {
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const queryClient = useQueryClient();

  const {
    confirmationsRequired = 3,
    pollingInterval = 5000,
    enabled = true,
    onStatusUpdate,
    onConfirmed,
    onFailed,
  } = options;

  // State management
  const [monitoredHashes, setMonitoredHashes] = useState<Set<Hash>>(new Set());
  const [transactions, setTransactions] = useState<Map<Hash, TransactionInfo>>(new Map());
  const [updates, setUpdates] = useState<TransactionUpdate[]>([]);

  const blockNumberRef = useRef<bigint>();
  const lastUpdateRef = useRef<Date>(new Date());

  // ============================================================================
  // Transaction Management
  // ============================================================================

  const addTransaction = useCallback((hash: Hash) => {
    setMonitoredHashes(prev => new Set([...prev, hash]));
    setTransactions(prev => new Map(prev).set(hash, {
      hash,
      status: TransactionStatus.PENDING,
      confirmations: 0,
      timestamp: new Date(),
    }));
  }, []);

  const removeTransaction = useCallback((hash: Hash) => {
    setMonitoredHashes(prev => {
      const newSet = new Set(prev);
      newSet.delete(hash);
      return newSet;
    });
    setTransactions(prev => {
      const newMap = new Map(prev);
      newMap.delete(hash);
      return newMap;
    });
  }, []);

  const clearTransactions = useCallback(() => {
    setMonitoredHashes(new Set());
    setTransactions(new Map());
    setUpdates([]);
  }, []);

  // ============================================================================
  // Individual Transaction Monitoring
  // ============================================================================

  const useTransactionReceipt = (hash: Hash) => {
    return useWaitForTransactionReceipt({
      hash,
      confirmations: confirmationsRequired,
      chainId,
      query: {
        enabled: enabled && monitoredHashes.has(hash),
        retry: true,
        retryDelay: pollingInterval,
      },
    });
  };

  // ============================================================================
  // Transaction Status Updates
  // ============================================================================

  const updateTransactionStatus = useCallback(
    (hash: Hash, updates: Partial<TransactionInfo>) => {
      setTransactions(prev => {
        const current = prev.get(hash);
        if (!current) return prev;

        const updated = { ...current, ...updates };
        const newMap = new Map(prev);
        newMap.set(hash, updated);

        // Track status changes
        if (current.status !== updated.status) {
          const statusUpdate: TransactionUpdate = {
            hash,
            previousStatus: current.status,
            currentStatus: updated.status,
            confirmations: updated.confirmations,
            timestamp: new Date(),
          };

          setUpdates(prevUpdates => [...prevUpdates.slice(-99), statusUpdate]); // Keep last 100

          if (onStatusUpdate) {
            onStatusUpdate(statusUpdate);
          }

          // Call specific callbacks
          if (updated.status === TransactionStatus.CONFIRMED && onConfirmed && updated.receipt) {
            onConfirmed(hash, updated.receipt);
          } else if (updated.status === TransactionStatus.FAILED && onFailed && updated.error) {
            onFailed(hash, updated.error);
          }
        }

        return newMap;
      });
    },
    [onStatusUpdate, onConfirmed, onFailed]
  );

  // ============================================================================
  // Block-based Confirmation Tracking
  // ============================================================================

  useEffect(() => {
    if (!blockNumber || !enabled) return;

    blockNumberRef.current = blockNumber;

    // Update confirmations for pending/confirming transactions
    transactions.forEach((tx, hash) => {
      if (tx.status === TransactionStatus.PENDING || tx.status === TransactionStatus.CONFIRMING) {
        if (tx.blockNumber) {
          const confirmations = Number(blockNumber - tx.blockNumber);

          updateTransactionStatus(hash, {
            confirmations,
            status: confirmations >= confirmationsRequired
              ? TransactionStatus.CONFIRMED
              : TransactionStatus.CONFIRMING,
          });
        }
      }
    });
  }, [blockNumber, enabled, confirmationsRequired, transactions, updateTransactionStatus]);

  // ============================================================================
  // Receipt Monitoring for Each Transaction
  // ============================================================================

  // Monitor each transaction individually
  const monitoredHashesArray = Array.from(monitoredHashes);

  useEffect(() => {
    if (!enabled || monitoredHashesArray.length === 0) return;

    const cleanup: (() => void)[] = [];

    monitoredHashesArray.forEach(hash => {
      const tx = transactions.get(hash);
      if (!tx || tx.status === TransactionStatus.CONFIRMED || tx.status === TransactionStatus.FAILED) {
        return;
      }

      // Use the individual receipt monitoring
      const intervalId = setInterval(async () => {
        try {
          // This would typically use useWaitForTransactionReceipt
          // but we need to handle it programmatically here
          const receipt = await queryClient.fetchQuery({
            queryKey: ['transactionReceipt', hash, chainId],
            queryFn: async () => {
              // This would be replaced with actual receipt fetching
              return null;
            },
            staleTime: pollingInterval,
          });

          if (receipt) {
            const currentBlock = blockNumberRef.current;
            const confirmations = currentBlock ? Number(currentBlock - receipt.blockNumber) : 0;

            updateTransactionStatus(hash, {
              status: receipt.status === 'success'
                ? (confirmations >= confirmationsRequired ? TransactionStatus.CONFIRMED : TransactionStatus.CONFIRMING)
                : TransactionStatus.FAILED,
              confirmations,
              blockNumber: receipt.blockNumber,
              blockHash: receipt.blockHash,
              gasUsed: receipt.gasUsed,
              effectiveGasPrice: receipt.effectiveGasPrice,
              receipt,
              error: receipt.status === 'reverted' ? 'Transaction reverted' : undefined,
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch receipt for ${hash}:`, error);

          // After several failures, mark as failed
          const tx = transactions.get(hash);
          if (tx && Date.now() - tx.timestamp!.getTime() > 300000) { // 5 minutes
            updateTransactionStatus(hash, {
              status: TransactionStatus.FAILED,
              error: 'Transaction timeout - not found after 5 minutes',
            });
          }
        }
      }, pollingInterval);

      cleanup.push(() => clearInterval(intervalId));
    });

    return () => {
      cleanup.forEach(fn => fn());
    };
  }, [
    enabled,
    monitoredHashesArray,
    pollingInterval,
    confirmationsRequired,
    transactions,
    updateTransactionStatus,
    queryClient,
    chainId,
  ]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const allTransactions = useMemo(() => {
    return Array.from(transactions.values()).sort(
      (a, b) => b.timestamp!.getTime() - a.timestamp!.getTime()
    );
  }, [transactions]);

  const pendingTransactions = useMemo(() => {
    return allTransactions.filter(tx =>
      tx.status === TransactionStatus.PENDING || tx.status === TransactionStatus.CONFIRMING
    );
  }, [allTransactions]);

  const confirmedTransactions = useMemo(() => {
    return allTransactions.filter(tx => tx.status === TransactionStatus.CONFIRMED);
  }, [allTransactions]);

  const failedTransactions = useMemo(() => {
    return allTransactions.filter(tx => tx.status === TransactionStatus.FAILED);
  }, [allTransactions]);

  const latestUpdate = useMemo(() => {
    return updates[updates.length - 1] || null;
  }, [updates]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getTransaction = useCallback((hash: Hash): TransactionInfo | undefined => {
    return transactions.get(hash);
  }, [transactions]);

  const isTransactionPending = useCallback((hash: Hash): boolean => {
    const tx = getTransaction(hash);
    return tx?.status === TransactionStatus.PENDING || tx?.status === TransactionStatus.CONFIRMING || false;
  }, [getTransaction]);

  const isTransactionConfirmed = useCallback((hash: Hash): boolean => {
    const tx = getTransaction(hash);
    return tx?.status === TransactionStatus.CONFIRMED || false;
  }, [getTransaction]);

  const isTransactionFailed = useCallback((hash: Hash): boolean => {
    const tx = getTransaction(hash);
    return tx?.status === TransactionStatus.FAILED || false;
  }, [getTransaction]);

  return {
    // Transaction management
    addTransaction,
    removeTransaction,
    clearTransactions,

    // Transaction info
    getTransaction,
    isTransactionPending,
    isTransactionConfirmed,
    isTransactionFailed,

    // Bulk queries
    allTransactions,
    pendingTransactions,
    confirmedTransactions,
    failedTransactions,

    // Status tracking
    updates,
    latestUpdate,

    // State
    isMonitoring: enabled && monitoredHashes.size > 0,
    totalPendingCount: pendingTransactions.length,
  };
}