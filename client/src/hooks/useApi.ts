import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const refetch = useCallback(() => {
    if (hasFetched.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);
    fetcher()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setIsRefetching(false);
        hasFetched.current = true;
      });
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, isRefetching, error, refetch };
}
