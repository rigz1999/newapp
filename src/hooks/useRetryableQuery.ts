// ============================================
// Retryable Query Hook - Handles Network Failures
// Path: src/hooks/useRetryableQuery.ts
// ============================================

import { useState, useCallback } from 'react';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // in milliseconds
  maxDelay?: number; // in milliseconds
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryableQueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

export interface RetryableQueryResult<T> extends RetryableQueryState<T> {
  execute: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Hook for retryable async queries with exponential backoff
 *
 * @example
 * const { data, loading, error, execute, retry } = useRetryableQuery(
 *   async () => {
 *     const { data } = await supabase.from('users').select('*');
 *     return data;
 *   },
 *   { maxRetries: 3 }
 * );
 */
export function useRetryableQuery<T>(
  queryFn: () => Promise<T>,
  options: RetryOptions = {}
): RetryableQueryResult<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<RetryableQueryState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attemptNumber: number): number => {
    const delay = Math.min(
      opts.initialDelay * Math.pow(opts.backoffMultiplier, attemptNumber),
      opts.maxDelay
    );
    return delay;
  };

  const executeWithRetry = useCallback(
    async (currentRetry: number = 0): Promise<void> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await queryFn();
        setState({
          data: result,
          loading: false,
          error: null,
          retryCount: currentRetry,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Check if we should retry
        if (currentRetry < opts.maxRetries) {
          const delay = calculateDelay(currentRetry);

          opts.onRetry(currentRetry + 1, error);

          // Wait before retrying
          await sleep(delay);

          // Recursive retry
          return executeWithRetry(currentRetry + 1);
        } else {
          // Max retries reached
          setState({
            data: null,
            loading: false,
            error,
            retryCount: currentRetry,
          });
        }
      }
    },
    [queryFn, opts]
  );

  const execute = useCallback(async () => executeWithRetry(0), [executeWithRetry]);

  const retry = useCallback(async () => executeWithRetry(0), [executeWithRetry]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
    });
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset,
  };
}

/**
 * Utility function to wrap a Supabase query with retry logic
 *
 * @example
 * const data = await withRetry(
 *   async () => {
 *     const { data, error } = await supabase.from('users').select('*');
 *     if (error) throw error;
 *     return data;
 *   },
 *   { maxRetries: 3 }
 * );
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error('Query failed after retries');

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < opts.maxRetries) {
        const delay = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelay
        );

        opts.onRetry(attempt + 1, lastError);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
