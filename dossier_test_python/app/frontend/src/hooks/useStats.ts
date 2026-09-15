import { useState, useEffect, useCallback } from 'react';
import { fetchStats } from '../api/stats';
import { StatsResponse } from '../types';

export const useStats = () => {
  const [data, setData] = useState<StatsResponse | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async (active: { current: boolean }) => {
    try {
      const result = await fetchStats();
      if (active.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (active.current) {
        setError(err as Error);
      }
    } finally {
      if (active.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const active = { current: true };
    loadStats(active);

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => loadStats(active), 30000);

    const handleInvalidate = () => {
      loadStats(active);
    };

    window.addEventListener('query-invalidate-all', handleInvalidate);

    return () => {
      active.current = false;
      clearInterval(interval);
      window.removeEventListener('query-invalidate-all', handleInvalidate);
    };
  }, [loadStats]);

  return { data, isLoading, error };
};
