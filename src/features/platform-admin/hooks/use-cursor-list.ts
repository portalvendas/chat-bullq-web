'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

type Fetcher<T> = (params: {
  cursor?: string;
  search?: string;
}) => Promise<Page<T>>;

/**
 * Lista paginada por cursor com busca. Reinicia ao trocar a busca e acumula
 * páginas no "carregar mais". `fetcher` deve ter identidade estável (método de
 * service), pois entra nas dependências.
 */
export function useCursorList<T>(fetcher: Fetcher<T>, search: string) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const my = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetcher({ cursor, search: search || undefined });
        if (my !== reqId.current) return; // resposta obsoleta
        setItems((prev) => (cursor ? [...prev, ...res.items] : res.items));
        setNextCursor(res.nextCursor);
      } catch (e: unknown) {
        if (my !== reqId.current) return;
        setError(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    },
    [fetcher, search],
  );

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    void fetchPage(undefined);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (nextCursor) void fetchPage(nextCursor);
  }, [nextCursor, fetchPage]);

  const reload = useCallback(() => void fetchPage(undefined), [fetchPage]);

  return { items, nextCursor, loading, error, loadMore, reload };
}
