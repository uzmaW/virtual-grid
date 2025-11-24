import { useState, useCallback } from 'react';
import { RowData } from './VirtualGrid.types';

export type RowCache = {
  get: (key: string) => RowData[] | undefined;
  set: (key: string, value: RowData[]) => void;
  has: (key: string) => boolean;
  entries: () => IterableIterator<[string, RowData[]]>;
  clear: () => void;
};

export const useRowCache = (maxSize: number): RowCache => {
  const [cache, setCache] = useState<Map<string, RowData[]>>(new Map());

  const get = useCallback((key: string) => cache.get(key), [cache]);
  const has = useCallback((key: string) => cache.has(key), [cache]);
  const entries = useCallback(() => cache.entries(), [cache]);
  const clear = useCallback(() => setCache(new Map()), []);

  const set = useCallback(
    (key: string, rows: RowData[]) => {
      setCache(prev => {
        const next = new Map(prev);
        next.set(key, rows);
        if (next.size > maxSize) {
          const oldestKey = next.keys().next().value;
          if (oldestKey !== undefined) next.delete(oldestKey);
        }
        return next;
      });
    },
    [maxSize]
  );

  return { get, set, has, entries, clear };
};
