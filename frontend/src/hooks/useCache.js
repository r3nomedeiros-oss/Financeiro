import { useState, useEffect, useCallback, useRef } from 'react';

// Cache em memória para dados frequentes
const memoryCache = new Map();
const CACHE_TTL = 60000; // 1 minuto

// Hook para busca com cache
export function useCachedData(key, fetchFn, dependencies = []) {
  const [data, setData] = useState(() => {
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const refetch = useCallback(async (force = false) => {
    // Verificar cache
    if (!force) {
      const cached = memoryCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      if (isMounted.current) {
        memoryCache.set(key, { data: result, timestamp: Date.now() });
        setData(result);
        setLoading(false);
      }
      return result;
    } catch (err) {
      if (isMounted.current) {
        setError(err);
        setLoading(false);
      }
      throw err;
    }
  }, [key, fetchFn]);

  useEffect(() => {
    isMounted.current = true;
    refetch();
    return () => {
      isMounted.current = false;
    };
  }, [key, ...dependencies]);

  const invalidate = useCallback(() => {
    memoryCache.delete(key);
  }, [key]);

  return { data, loading, error, refetch, invalidate };
}

// Hook para múltiplas requisições em paralelo
export function useParallelFetch(fetchFns) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        Object.entries(fetchFns).map(async ([key, fn]) => {
          const result = await fn();
          return [key, result];
        })
      );
      setData(Object.fromEntries(results));
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [fetchFns]);

  useEffect(() => {
    fetchAll();
  }, []);

  return { data, loading, error, refetch: fetchAll };
}

// Invalidar cache específico ou todo
export function invalidateCache(key = null) {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

// Prefetch de dados
export async function prefetchData(key, fetchFn) {
  const cached = memoryCache.get(key);
  if (!cached || Date.now() - cached.timestamp >= CACHE_TTL) {
    try {
      const result = await fetchFn();
      memoryCache.set(key, { data: result, timestamp: Date.now() });
    } catch (err) {
      console.warn('Prefetch failed:', key, err);
    }
  }
}

export default { useCachedData, useParallelFetch, invalidateCache, prefetchData };
