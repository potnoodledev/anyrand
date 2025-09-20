/**
 * PriceDisplay Component
 *
 * Displays price information for randomness requests including gas costs,
 * fee breakdowns, and price trends.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatEther } from 'viem';
import { formatNumber } from '../lib/utils';
import { PriceDisplayProps } from '../types/components';

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  baseFee,
  totalFee,
  gasLimit,
  gasPrice,
  trend = 'stable',
  showBreakdown = true,
  showTrend = true,
  currency = 'ETH',
  size = 'default',
  className,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-red-600 dark:text-red-400';
      case 'down':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'up':
        return 'Prices Rising';
      case 'down':
        return 'Prices Falling';
      default:
        return 'Prices Stable';
    }
  };

  const formatPrice = (price: bigint) => {
    const formatted = formatEther(price);
    return `${formatted} ${currency}`;
  };

  const formatGwei = (price: bigint) => {
    return `${Math.round(Number(formatEther(price)) * 1e9)} gwei`;
  };

  const calculateGasCost = () => {
    if (!gasLimit || !gasPrice) return null;
    return gasLimit * gasPrice;
  };

  const gasCost = calculateGasCost();

  if (size === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="text-sm font-mono">
          {formatPrice(totalFee)}
        </div>
        {showTrend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-xs ${getTrendColor()}`}>
              {getTrendLabel()}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5" />
            <span>Price Information</span>
          </div>
          {showTrend && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-sm ${getTrendColor()}`}>
                {getTrendLabel()}
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Price Display */}
        <div className="text-center p-4 rounded-lg border bg-muted/50">
          <div className="text-sm text-muted-foreground mb-1">Total Fee</div>
          <div className="text-2xl font-mono font-bold">
            {formatPrice(totalFee)}
          </div>
          {gasPrice && (
            <div className="text-sm text-muted-foreground mt-1">
              Gas Price: {formatGwei(gasPrice)}
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        {showBreakdown && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Base Fee</span>
              <span className="text-sm font-mono">{formatPrice(baseFee)}</span>
            </div>

            {gasCost && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gas Cost</span>
                <span className="text-sm font-mono">{formatPrice(gasCost)}</span>
              </div>
            )}

            {gasLimit && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gas Limit</span>
                <span className="text-sm font-mono">{formatNumber(Number(gasLimit))}</span>
              </div>
            )}

            <div className="border-t pt-2">
              <div className="flex justify-between items-center font-medium">
                <span className="text-sm">Total</span>
                <span className="text-sm font-mono">{formatPrice(totalFee)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Price Comparison */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 rounded border">
            <div className="text-muted-foreground">Low</div>
            <div className="font-mono">
              {formatPrice(totalFee * 8n / 10n)}
            </div>
          </div>
          <div className="text-center p-2 rounded border bg-blue-50 dark:bg-blue-900/20">
            <div className="text-blue-600 dark:text-blue-400">Current</div>
            <div className="font-mono text-blue-600 dark:text-blue-400">
              {formatPrice(totalFee)}
            </div>
          </div>
          <div className="text-center p-2 rounded border">
            <div className="text-muted-foreground">High</div>
            <div className="font-mono">
              {formatPrice(totalFee * 12n / 10n)}
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <div className="font-medium mb-1">Price Information</div>
              <div className="text-xs">
                This fee covers transaction execution and callback gas costs.
                Higher gas limits may cost more but ensure successful execution.
              </div>
            </div>
          </div>
        </div>

        {/* Price Trend Details */}
        {showTrend && trend !== 'stable' && (
          <div className="p-3 rounded-md border">
            <div className="flex items-center space-x-2 mb-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                Network {trend === 'up' ? 'Congestion' : 'Relief'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {trend === 'up'
                ? 'Gas prices are rising due to increased network demand. Consider waiting for lower fees or using a higher gas price for faster confirmation.'
                : 'Gas prices are falling due to decreased network demand. Good time to submit transactions.'
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};