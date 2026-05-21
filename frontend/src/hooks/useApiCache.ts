import { useState, useEffect, useCallback, useRef } from 'react';

const globalCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

export function useApiCache<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const cached = globalCache.get(cacheKey);
  const [data, setData] = useState<T | undefined>(cached?.data);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  // Use refs to avoid re-triggering effects when fetcher identity changes
  const fetcherRef = useRef(fetcher);
  const cacheKeyRef = useRef(cacheKey);
  fetcherRef.current = fetcher;
  cacheKeyRef.current = cacheKey;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetcherRef.current();
      globalCache.set(cacheKeyRef.current, { data: result, ts: Date.now() });
      setData(result);
      setError('');
    } catch {
      setError('Error cargando datos');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const entry = globalCache.get(cacheKey);
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      // Use cached data immediately, refresh silently in background
      setData(entry.data);
      load(true);
    } else {
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { data, loading, error, refresh: () => load(false) };
}

export function invalidateCache(prefix: string) {
  for (const key of globalCache.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.delete(key);
    }
  }
}
