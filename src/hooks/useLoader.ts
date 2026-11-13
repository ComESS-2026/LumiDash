import { useCallback, useEffect, useRef, useState } from 'react';

export function useLoader<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // If two reloads overlap, only the newest one may update the screen. Otherwise a slow, older
  // response could arrive last and replace fresh data with stale data.
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (request === latestRequest.current) setData(result);
    } catch (err) {
      if (request === latestRequest.current) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
