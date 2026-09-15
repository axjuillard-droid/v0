import { useState, useEffect, useCallback } from 'react';
import { fetchSearch, fetchSources, fetchSourcesLists, fetchTagsList, updateTags, fetchExtensionsList, ExtensionItem } from '../api/search';
import { useSearchStore } from '../store/searchStore';

export const useSearch = () => {
  const store = useSearchStore();
  const {
    q, nas, source, ext, empty, tags, sort, order, from, size,
    date_mode, date_start, date_end, search_mode, search_field,
    hasPerformedSearch
  } = store;

  const params = {
    q, nas, source, ext, empty, tags, sort, order, from, size,
    date_mode, date_start, date_end, search_mode, search_field
  };

  const [data, setData] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState(hasPerformedSearch);
  const [error, setError] = useState<Error | null>(null);

  const paramsKey = JSON.stringify(params);

  const performSearch = useCallback(async (active: { current: boolean }) => {
    setIsLoading(true);
    try {
      const result = await fetchSearch(params);
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
  }, [paramsKey]);

  useEffect(() => {
    if (!hasPerformedSearch) {
      setIsLoading(false);
      return;
    }
    const active = { current: true };
    performSearch(active);

    const handleInvalidate = () => {
      performSearch(active);
    };

    window.addEventListener('query-invalidate-search', handleInvalidate);
    window.addEventListener('query-invalidate-all', handleInvalidate);

    return () => {
      active.current = false;
      window.removeEventListener('query-invalidate-search', handleInvalidate);
      window.removeEventListener('query-invalidate-all', handleInvalidate);
    };
  }, [performSearch, hasPerformedSearch]);

  return { data, isLoading, isError: !!error, error };
};

export const useSources = () => {
  const [data, setData] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (active: { current: boolean }) => {
    try {
      const result = await fetchSources();
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
    load(active);
    const handleInvalidate = () => load(active);
    window.addEventListener('query-invalidate-all', handleInvalidate);
    return () => {
      active.current = false;
      window.removeEventListener('query-invalidate-all', handleInvalidate);
    };
  }, [load]);

  return { data, isLoading, isError: !!error, error };
};

export const useSourcesLists = () => {
  const [data, setData] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (active: { current: boolean }) => {
    try {
      const result = await fetchSourcesLists();
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
    load(active);
    const handleInvalidate = () => load(active);
    window.addEventListener('query-invalidate-all', handleInvalidate);
    return () => {
      active.current = false;
      window.removeEventListener('query-invalidate-all', handleInvalidate);
    };
  }, [load]);

  return { data, isLoading, isError: !!error, error };
};

export const useTagsList = () => {
  const [data, setData] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTags = useCallback(async (active: { current: boolean }) => {
    try {
      const result = await fetchTagsList();
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
    loadTags(active);

    const handleInvalidate = () => {
      loadTags(active);
    };

    window.addEventListener('query-invalidate-tagsList', handleInvalidate);
    window.addEventListener('query-invalidate-all', handleInvalidate);

    return () => {
      active.current = false;
      window.removeEventListener('query-invalidate-tagsList', handleInvalidate);
      window.removeEventListener('query-invalidate-all', handleInvalidate);
    };
  }, [loadTags]);

  return { data, isLoading, isError: !!error, error };
};

export const useUpdateTags = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = async ({ fileId, tags }: { fileId: string, tags: string[] }) => {
    setIsPending(true);
    try {
      const result = await updateTags(fileId, tags);
      window.dispatchEvent(new Event('query-invalidate-search'));
      window.dispatchEvent(new Event('query-invalidate-tagsList'));
      setError(null);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending, error };
};

export const useExtensionsList = () => {
  const [data, setData] = useState<ExtensionItem[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (active: { current: boolean }) => {
    try {
      const result = await fetchExtensionsList();
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
    load(active);
    const handleInvalidate = () => load(active);
    window.addEventListener('query-invalidate-all', handleInvalidate);
    return () => {
      active.current = false;
      window.removeEventListener('query-invalidate-all', handleInvalidate);
    };
  }, [load]);

  return { data, isLoading, isError: !!error, error };
};
