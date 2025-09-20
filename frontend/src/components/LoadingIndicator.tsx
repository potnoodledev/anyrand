/**
 * LoadingIndicator Component
 *
 * Comprehensive loading indicator component with multiple variants
 * for different use cases throughout the application.
 */

'use client';

import React from 'react';
import { Loader2, Clock, Zap, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoadingIndicatorProps {
  variant?: 'spinner' | 'pulse' | 'bars' | 'dots' | 'progress' | 'skeleton';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  text?: string;
  description?: string;
  progress?: number; // 0-100
  className?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorClasses = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  description,
  progress,
  className,
  fullScreen = false,
  overlay = false,
}) => {
  const renderLoadingElement = () => {
    const baseClasses = cn(sizeClasses[size], colorClasses[color]);

    switch (variant) {
      case 'spinner':
        return <Loader2 className={cn(baseClasses, 'animate-spin')} />;

      case 'pulse':
        return (
          <div className={cn(baseClasses, 'bg-current rounded-full animate-pulse opacity-75')} />
        );

      case 'bars':
        return (
          <div className="flex items-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-1 bg-current rounded-full animate-pulse',
                  size === 'sm' ? 'h-3' : size === 'md' ? 'h-4' : size === 'lg' ? 'h-6' : 'h-8',
                  colorClasses[color]
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        );

      case 'dots':
        return (
          <div className="flex items-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'bg-current rounded-full animate-bounce',
                  size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-4 h-4',
                  colorClasses[color]
                )}
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        );

      case 'progress':
        return (
          <div className="w-full">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  color === 'primary' ? 'bg-blue-600' :
                  color === 'secondary' ? 'bg-gray-600' :
                  color === 'success' ? 'bg-green-600' :
                  color === 'warning' ? 'bg-yellow-600' :
                  'bg-red-600'
                )}
                style={{ width: `${progress || 0}%` }}
              />
            </div>
            {progress !== undefined && (
              <div className="text-xs text-gray-600 mt-1 text-center">
                {Math.round(progress)}%
              </div>
            )}
          </div>
        );

      case 'skeleton':
        return (
          <div className="animate-pulse">
            <div className={cn(
              'bg-gray-300 rounded',
              size === 'sm' ? 'h-4' : size === 'md' ? 'h-6' : size === 'lg' ? 'h-8' : 'h-12',
              'w-full'
            )} />
          </div>
        );

      default:
        return <Loader2 className={cn(baseClasses, 'animate-spin')} />;
    }
  };

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-2',
      className
    )}>
      {renderLoadingElement()}
      {text && (
        <div className={cn(
          'font-medium',
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg',
          colorClasses[color]
        )}>
          {text}
        </div>
      )}
      {description && (
        <div className="text-sm text-gray-600 text-center max-w-xs">
          {description}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-10">
        {content}
      </div>
    );
  }

  return content;
};

// Specialized loading components for common use cases

export const TransactionLoadingIndicator: React.FC<{
  stage: 'submitting' | 'pending' | 'confirming' | 'confirmed' | 'failed';
  transactionHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
}> = ({ stage, transactionHash, confirmations = 0, requiredConfirmations = 3 }) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'submitting':
        return {
          icon: Clock,
          text: 'Submitting Transaction',
          description: 'Preparing and submitting your transaction...',
          color: 'warning' as const,
          variant: 'spinner' as const,
        };
      case 'pending':
        return {
          icon: Clock,
          text: 'Transaction Pending',
          description: transactionHash ? `Waiting for confirmation: ${transactionHash.slice(0, 10)}...` : 'Waiting for confirmation...',
          color: 'primary' as const,
          variant: 'pulse' as const,
        };
      case 'confirming':
        return {
          icon: Activity,
          text: 'Confirming Transaction',
          description: `${confirmations}/${requiredConfirmations} confirmations received`,
          color: 'primary' as const,
          variant: 'progress' as const,
          progress: (confirmations / requiredConfirmations) * 100,
        };
      case 'confirmed':
        return {
          icon: CheckCircle,
          text: 'Transaction Confirmed',
          description: 'Your transaction has been successfully confirmed!',
          color: 'success' as const,
          variant: 'pulse' as const,
        };
      case 'failed':
        return {
          icon: AlertCircle,
          text: 'Transaction Failed',
          description: 'Your transaction could not be completed',
          color: 'error' as const,
          variant: 'pulse' as const,
        };
    }
  };

  const stageInfo = getStageInfo();
  const Icon = stageInfo.icon;

  return (
    <div className="flex flex-col items-center space-y-3 p-4">
      <div className="relative">
        <Icon className={cn('w-8 h-8', colorClasses[stageInfo.color])} />
        {(stage === 'submitting' || stage === 'pending') && (
          <div className="absolute inset-0">
            <LoadingIndicator
              variant="spinner"
              size="lg"
              color={stageInfo.color}
              className="opacity-50"
            />
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="font-medium text-gray-900">{stageInfo.text}</div>
        <div className="text-sm text-gray-600 mt-1">{stageInfo.description}</div>
      </div>
      {stageInfo.variant === 'progress' && stageInfo.progress !== undefined && (
        <div className="w-full max-w-xs">
          <LoadingIndicator
            variant="progress"
            progress={stageInfo.progress}
            color={stageInfo.color}
          />
        </div>
      )}
    </div>
  );
};

export const RequestLoadingIndicator: React.FC<{
  stage: 'preparing' | 'submitting' | 'waiting' | 'fulfilling' | 'completed';
  estimatedTime?: number; // in seconds
}> = ({ stage, estimatedTime }) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'preparing':
        return {
          text: 'Preparing Request',
          description: 'Calculating fees and validating parameters...',
          color: 'secondary' as const,
          variant: 'spinner' as const,
        };
      case 'submitting':
        return {
          text: 'Submitting Request',
          description: 'Sending randomness request to blockchain...',
          color: 'primary' as const,
          variant: 'spinner' as const,
        };
      case 'waiting':
        return {
          text: 'Awaiting Fulfillment',
          description: estimatedTime
            ? `Estimated time: ${Math.ceil(estimatedTime / 60)} minutes`
            : 'Waiting for Drand beacon round...',
          color: 'warning' as const,
          variant: 'pulse' as const,
        };
      case 'fulfilling':
        return {
          text: 'Fulfilling Request',
          description: 'Randomness is being delivered to your callback...',
          color: 'primary' as const,
          variant: 'bars' as const,
        };
      case 'completed':
        return {
          text: 'Request Completed',
          description: 'Your randomness request has been fulfilled successfully!',
          color: 'success' as const,
          variant: 'pulse' as const,
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <LoadingIndicator
        variant={stageInfo.variant}
        size="md"
        color={stageInfo.color}
      />
      <div>
        <div className="font-medium text-gray-900">{stageInfo.text}</div>
        <div className="text-sm text-gray-600">{stageInfo.description}</div>
      </div>
    </div>
  );
};

export const SkeletonLoader: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingIndicator
          key={i}
          variant="skeleton"
          className={cn(
            i === lines - 1 ? 'w-2/3' : 'w-full', // Last line shorter
            'h-4'
          )}
        />
      ))}
    </div>
  );
};