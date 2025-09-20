/**
 * TransactionMonitorIndicator Component
 *
 * Displays a visual indicator of pending transactions and monitoring status
 * in the application header or sidebar.
 */

'use client';

import React from 'react';
import { useTransactionMonitoring } from './TransactionMonitorProvider';
import { Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface TransactionMonitorIndicatorProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'compact' | 'detailed';
  onClick?: () => void;
}

export const TransactionMonitorIndicator: React.FC<TransactionMonitorIndicatorProps> = ({
  className,
  showLabel = true,
  variant = 'compact',
  onClick,
}) => {
  const { totalPendingCount } = useTransactionMonitoring();

  if (totalPendingCount === 0) {
    // Don't show anything when no pending transactions
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: could open a transaction history modal
      console.log('Open transaction history');
    }
  };

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={cn(
          'flex items-center space-x-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50',
          className
        )}
      >
        <div className="relative">
          <Clock className="w-4 h-4" />
          <Activity className="w-2 h-2 absolute -top-0.5 -right-0.5 animate-pulse text-blue-500" />
        </div>
        {showLabel && (
          <span className="text-sm font-medium">
            {totalPendingCount} pending
          </span>
        )}
        <Badge variant="secondary" className="text-xs">
          {totalPendingCount}
        </Badge>
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Clock className="w-5 h-5 text-blue-600" />
          <Activity className="w-3 h-3 absolute -top-1 -right-1 animate-pulse text-blue-500" />
        </div>
        <div>
          <div className="text-sm font-medium text-blue-900">
            Transaction Monitoring
          </div>
          <div className="text-xs text-blue-700">
            {totalPendingCount} transaction{totalPendingCount !== 1 ? 's' : ''} pending confirmation
          </div>
        </div>
      </div>
      <Badge variant="secondary" className="text-blue-700 bg-blue-100">
        {totalPendingCount}
      </Badge>
    </div>
  );
};