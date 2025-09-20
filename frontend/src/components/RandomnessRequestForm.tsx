/**
 * RandomnessRequestForm Component
 *
 * Form for submitting randomness requests to the Anyrand contract.
 * Includes gas limit configuration, deadline setting, and fee estimation.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Zap, Calculator, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input, NumberInput } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAnyrand } from '../hooks/useAnyrand';
import { useWallet } from '../hooks/useWallet';
import { formatEther } from 'viem';
import { toast } from 'sonner';
import { RandomnessRequestFormProps, RequestFormData } from '../types/components';
import { DEFAULT_CALLBACK_GAS_LIMIT, DEFAULT_DEADLINE_MINUTES } from '../lib/contracts';

const formSchema = z.object({
  callbackGasLimit: z
    .number()
    .min(21000, 'Gas limit is required and must be at least 21,000')
    .max(1000000, 'Gas limit cannot exceed 1,000,000'),
  deadline: z
    .number()
    .min(Date.now() / 1000 + 60, 'Deadline must be in the future')
    .refine((val) => val > Date.now() / 1000, 'Deadline must be in the future'),
  customGasPrice: z
    .number()
    .min(0, 'Gas price cannot be negative')
    .optional(),
  priorityFee: z
    .number()
    .min(0, 'Priority fee cannot be negative')
    .optional(),
});

export const RandomnessRequestForm: React.FC<RandomnessRequestFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  isDisabled = false,
  initialValues,
  showAdvanced = false,
  maxGasLimit,
  minDeadline,
  onPriceUpdate,
  className,
}) => {
  const { isConnected } = useWallet();
  const {
    isReady,
    contractLimits,
    requestRandomness,
    estimateFee,
    validateRequestParams,
    createDefaultParams,
    isRequestingRandomness,
    error: contractError,
  } = useAnyrand();

  const [feeEstimation, setFeeEstimation] = React.useState<{
    baseFee: bigint;
    totalFee: bigint;
    formattedFee: string;
  } | null>(null);

  const [isEstimating, setIsEstimating] = React.useState(false);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      callbackGasLimit: Number(DEFAULT_CALLBACK_GAS_LIMIT),
      deadline: Math.floor(Date.now() / 1000) + (DEFAULT_DEADLINE_MINUTES * 60),
      customGasPrice: undefined,
      priorityFee: undefined,
      ...initialValues,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const watchedValues = watch();

  // Estimate fee when gas limit changes
  React.useEffect(() => {
    const estimateRequestFee = async () => {
      if (!isReady || !watchedValues.callbackGasLimit) return;

      setIsEstimating(true);
      try {
        const estimation = await estimateFee(BigInt(watchedValues.callbackGasLimit));
        setFeeEstimation(estimation);
      } catch (error) {
        console.error('Failed to estimate fee:', error);
        setFeeEstimation(null);
      } finally {
        setIsEstimating(false);
      }
    };

    const timeoutId = setTimeout(estimateRequestFee, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [watchedValues.callbackGasLimit, isReady, estimateFee]);

  const handleFormSubmit = async (data: RequestFormData) => {
    if (!isConnected) {
      toast.error('Wallet Not Connected', {
        description: 'Please connect your wallet to submit a randomness request.',
      });
      return;
    }

    if (!isReady) {
      toast.error('Contract Not Ready', {
        description: 'Contract is not ready. Please wait and try again.',
      });
      return;
    }

    // Validate parameters
    const params = createDefaultParams({
      callbackGasLimit: BigInt(data.callbackGasLimit),
      deadline: BigInt(Math.floor(Date.now() / 1000) + (data.deadlineMinutes * 60)),
      value: data.customValue ? BigInt(Math.floor(data.customValue * 1e18)) : undefined,
    });

    const validation = validateRequestParams(params);
    if (!validation.isValid) {
      toast.error('Invalid Parameters', {
        description: validation.errors.join(', '),
      });
      return;
    }

    try {
      const hash = await requestRandomness(params);

      toast.success('Request Submitted', {
        description: `Randomness request submitted successfully. Transaction: ${hash.slice(0, 10)}...`,
      });

      // Reset form
      form.reset();
      setFeeEstimation(null);

      // Call parent callback
      onSubmit?.(data, hash);
    } catch (error) {
      console.error('Failed to submit randomness request:', error);
      toast.error('Request Failed', {
        description: error instanceof Error ? error.message : 'Failed to submit randomness request.',
      });
    }
  };

  const setRecommendedGasLimit = (type: 'low' | 'medium' | 'high') => {
    const limits = {
      low: 50000,
      medium: 100000,
      high: 200000,
    };
    setValue('callbackGasLimit', limits[type]);
  };

  const setRecommendedDeadline = (type: 'short' | 'medium' | 'long') => {
    const now = Date.now();
    const deadlines = {
      short: Math.floor((now + 15 * 60 * 1000) / 1000), // 15 minutes
      medium: Math.floor((now + 60 * 60 * 1000) / 1000), // 1 hour
      long: Math.floor((now + 240 * 60 * 1000) / 1000), // 4 hours
    };
    setValue('deadline', deadlines[type]);
  };

  const disabled = isDisabled || !isConnected || !isReady || isRequestingRandomness;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="w-5 h-5" />
          <span>Request Randomness</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Callback Gas Limit */}
          <div className="space-y-3">
            <div>
              <label htmlFor="callbackGasLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Gas Limit
              </label>
              <Input
                id="callbackGasLimit"
                type="number"
                placeholder="100000"
                {...register('callbackGasLimit', { valueAsNumber: true })}
                min={21000}
                max={maxGasLimit || (contractLimits?.maxCallbackGasLimit ? Number(contractLimits.maxCallbackGasLimit) : 1000000)}
                disabled={isDisabled}
              />
              {errors.callbackGasLimit && (
                <p className="text-sm text-red-600 mt-1">{errors.callbackGasLimit.message}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Gas limit for the callback function</p>
            </div>

            {/* Gas Limit Presets */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecommendedGasLimit('low')}
              >
                Low (50k)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecommendedGasLimit('medium')}
              >
                Medium (100k)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecommendedGasLimit('high')}
              >
                High (200k)
              </Button>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-3">
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <Input
                id="deadline"
                type="datetime-local"
                {...register('deadline', {
                  setValueAs: (value) => value ? Math.floor(new Date(value).getTime() / 1000) : undefined
                })}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                disabled={isDisabled}
                defaultValue={new Date(Date.now() + DEFAULT_DEADLINE_MINUTES * 60000).toISOString().slice(0, 16)}
              />
              {errors.deadline && (
                <p className="text-sm text-red-600 mt-1">{errors.deadline.message}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">When the request expires</p>
            </div>

            {/* Deadline Presets */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecommendedDeadline('short')}
              >
                15 min
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecommendedDeadline('medium')}
              >
                1 hour
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecommendedDeadline('long')}
              >
                4 hours
              </Button>
            </div>
          </div>

          {/* Custom Value (Optional) */}
          <NumberInput
            label="Custom Fee (ETH)"
            placeholder="Auto-calculated if not specified"
            helpText="Override automatic fee calculation"
            error={errors.customValue?.message}
            {...register('customValue', { valueAsNumber: true })}
            min={0}
            step={0.001}
          />

          {/* Fee Estimation */}
          {feeEstimation && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="w-4 h-4" />
                <span className="text-sm font-medium">Fee Estimation</span>
                {isEstimating && (
                  <div className="animate-spin w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full" />
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Fee:</span>
                  <span className="font-mono">{formatEther(feeEstimation.baseFee)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Fee:</span>
                  <span className="font-mono font-medium">{feeEstimation.formattedFee} ETH</span>
                </div>
              </div>
            </div>
          )}

          {/* Contract Error */}
          {contractError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="text-sm text-red-800 dark:text-red-200">
                {contractError.userMessage || contractError.message}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={disabled || !isConnected || !isReady || isRequestingRandomness}
              loading={isRequestingRandomness}
              className="flex-1"
              leftIcon={<Zap className="w-4 h-4" />}
            >
              {isRequestingRandomness ? 'Submitting...' : 'Request Randomness'}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isRequestingRandomness}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Connection Warning */}
          {!isConnected && (
            <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                Please connect your wallet to submit a randomness request.
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};