/**
 * NetworkStatus Component
 *
 * Displays current network status, including connectivity, gas prices,
 * and network health indicators.
 */

import React from 'react';
import { Wifi, WifiOff, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useBlockchainData } from '../hooks/useBlockchainData';
import { formatEther } from 'viem';
import { formatNumber, getRelativeTime } from '../lib/utils';
import { NetworkStatusProps } from '../types/components';

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showGasPrice = true,
  showBlockInfo = true,
  showNetworkHealth = true,
  compact = false,
  className,
}) => {
  const {
    networkConfig,
    networkStatus,
    gasPriceData,
    gasPriceTrend,
    blockInfo,
    blockAge,
    blockUtilization,
    networkHealth,
    isNetworkCongested,
  } = useBlockchainData();

  if (!networkConfig) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">No network connection</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (!networkStatus.isConnected) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    switch (networkHealth) {
      case 'healthy':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthColor = () => {
    switch (networkHealth) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCongestionColor = () => {
    switch (networkStatus.congestion) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTrendIcon = () => {
    switch (gasPriceTrend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-green-500" />;
      default:
        return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          {getStatusIcon()}
          <span className="text-sm font-medium">{networkConfig.name}</span>
        </div>

        {/* Gas Price */}
        {showGasPrice && gasPriceData && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className="text-sm">
              {Math.round(Number(formatEther(gasPriceData.current)) * 1e9)} gwei
            </span>
          </div>
        )}

        {/* Network Health */}
        {showNetworkHealth && (
          <div className={`px-2 py-1 rounded-full text-xs ${getCongestionColor()}`}>
            {networkStatus.congestion} congestion
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>{networkConfig.name}</span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs ${getCongestionColor()}`}>
            {networkStatus.congestion}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className={`text-sm font-medium ${getHealthColor()}`}>
            {networkHealth}
          </span>
        </div>

        {/* Gas Price Information */}
        {showGasPrice && gasPriceData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gas Price</span>
              <div className="flex items-center space-x-1">
                {getTrendIcon()}
                <span className="text-sm font-mono">
                  {Math.round(Number(formatEther(gasPriceData.current)) * 1e9)} gwei
                </span>
              </div>
            </div>

            {/* Gas Price Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-muted-foreground">Safe</div>
                <div className="font-mono">
                  {Math.round(Number(formatEther(gasPriceData.safe)) * 1e9)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Standard</div>
                <div className="font-mono">
                  {Math.round(Number(formatEther(gasPriceData.standard)) * 1e9)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Fast</div>
                <div className="font-mono">
                  {Math.round(Number(formatEther(gasPriceData.fast)) * 1e9)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Block Information */}
        {showBlockInfo && blockInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Latest Block</span>
              <span className="text-sm font-mono">
                #{formatNumber(Number(blockInfo.number))}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Block Age</span>
              <span className="text-sm">
                {blockAge}s ago
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Utilization</span>
              <span className="text-sm">
                {Math.round(blockUtilization * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Network Metrics */}
        {showNetworkHealth && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Block Time</span>
              <span className="text-sm">
                {networkConfig.features.averageBlockTime}s
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network Type</span>
              <span className="text-sm">
                {networkConfig.features.isTestnet ? 'Testnet' : 'Mainnet'}
              </span>
            </div>
          </div>
        )}

        {/* Congestion Warning */}
        {isNetworkCongested && (
          <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-2">
              <Activity className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  High Network Congestion
                </div>
                <div className="text-yellow-700 dark:text-yellow-300">
                  Transactions may take longer and cost more gas.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};