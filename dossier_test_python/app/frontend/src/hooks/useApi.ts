import { useState, useEffect, useCallback } from 'react';

interface QueryOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

interface MutationOptions<TData> {
  onSuccess?: (data: TData) => void;
}

export function useApiQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: any[] = [],
  options?: QueryOptions
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(options?.enabled !== false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled !== false;

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const result = await queryFn();
      setData(result);
      setIsError(false);
      setError(null);
    } catch (err) {
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [...dependencies, enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await queryFn();
        if (active) {
          setData(result);
          setIsError(false);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setIsError(true);
          setError(err as Error);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    let intervalId: any;
    if (options?.refetchInterval) {
      intervalId = setInterval(load, options.refetchInterval);
    }

    return () => {
      active = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [...dependencies, enabled, options?.refetchInterval]);

  return { data, isLoading, isError, error, refetch };
}

export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: MutationOptions<TData>
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = async (variables: TVariables) => {
    setIsPending(true);
    try {
      const result = await mutationFn(variables);
      setError(null);
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending, error };
}
