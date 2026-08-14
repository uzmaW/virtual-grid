import { RowData } from '../components/VirtualGrid/VirtualGrid.types';

// --- LRU Cache ---
export class LRUCache<T> {
  private cache: Map<string, T>;
  private maxSize: number;

  constructor(maxSize: number = 20) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get(key: string): T | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }
}

// --- IndexedDB Cache ---
interface GridCacheDB {
  chunks: {
    key: string;
    value: { rows: RowData[]; totalRows: number; timestamp: number };
  };
  metadata: {
    key: string;
    value: { lastUpdated: number };
  };
}

const DB_NAME = 'VirtualGridCache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

const getDB = (): Promise<IDBDatabase | null> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      };
    });
  }
  return dbPromise;
};

export class HybridCache {
  private lruCache: LRUCache<RowData[]>;
  private totalRowsMap: Map<string, number>;
  private maxLruSize: number;
  private db: Promise<IDBDatabase | null>;
  private enableDb: boolean;

  constructor(maxLruSize: number = 20, enableDb: boolean = true) {
    this.lruCache = new LRUCache(maxLruSize);
    this.totalRowsMap = new Map();
    this.maxLruSize = maxLruSize;
    this.db = enableDb ? getDB() : Promise.resolve(null);
    this.enableDb = enableDb;
  }

  getSync(key: string): { rows: RowData[]; totalRows: number } | null {
    if (this.lruCache.has(key)) {
      const rows = this.lruCache.get(key)!;
      const totalRows = this.totalRowsMap.get(key) || 0;
      return { rows, totalRows };
    }
    return null;
  }

  async get(key: string): Promise<{ rows: RowData[]; totalRows: number } | null> {
    if (this.lruCache.has(key)) {
      const rows = this.lruCache.get(key)!;
      const totalRows = this.totalRowsMap.get(key) || 0;
      return { rows, totalRows };
    }

    if (!this.enableDb) return null;

    try {
      const database = await this.db;
      if (!database) return null;

      return new Promise((resolve) => {
        const transaction = database.transaction(['chunks'], 'readonly');
        const store = transaction.objectStore('chunks');
        const request = store.get(key);
        request.onsuccess = () => {
          if (request.result) {
            const { rows, totalRows } = request.result.value;
            this.lruCache.set(key, rows);
            this.totalRowsMap.set(key, totalRows);
            resolve({ rows, totalRows });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (err) {
      console.error('IndexedDB read error:', err);
      return null;
    }
  }

  async set(key: string, value: { rows: RowData[]; totalRows: number }): Promise<void> {
    this.lruCache.set(key, value.rows);
    this.totalRowsMap.set(key, value.totalRows);

    if (!this.enableDb) return;

    try {
      const database = await this.db;
      if (!database) return;

      const transaction = database.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      store.put({ key, value: { ...value, timestamp: Date.now() } });
    } catch (err) {
      console.error('IndexedDB write error:', err);
    }
  }

  async clear(): Promise<void> {
    this.lruCache.clear();
    this.totalRowsMap.clear();

    if (!this.enableDb) return;

    try {
      const database = await this.db;
      if (!database) return;

      const transaction = database.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      store.clear();
    } catch (err) {
      console.error('IndexedDB clear error:', err);
    }
  }

  async getLastUpdated(): Promise<number> {
    if (!this.enableDb) return 0;

    try {
      const database = await this.db;
      if (!database) return 0;

      return new Promise((resolve) => {
        const transaction = database.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get('lastUpdated');
        request.onsuccess = () => {
          resolve(request.result?.value?.lastUpdated || 0);
        };
        request.onerror = () => resolve(0);
      });
    } catch (err) {
      return 0;
    }
  }

  async setLastUpdated(timestamp: number): Promise<void> {
    if (!this.enableDb) return;

    try {
      const database = await this.db;
      if (!database) return;

      const transaction = database.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      store.put({ lastUpdated: timestamp });
    } catch (err) {
      console.error('IndexedDB metadata write error:', err);
    }
  }
}

// --- Debounce Utility ---
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// --- Throttle Utility ---
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// --- String Interning for Memory Optimization ---
const stringInterner = new Map<string, string>();

export const internString = (str: string): string => {
  if (!stringInterner.has(str)) {
    stringInterner.set(str, str);
  }
  return stringInterner.get(str)!;
};

export const normalizeRowData = (rows: RowData[]): RowData[] => {
  return rows.map(row => {
    const normalized: RowData = { ...row };
    Object.keys(normalized).forEach(key => {
      if (typeof normalized[key] === 'string') {
        normalized[key] = internString(normalized[key]);
      }
    });
    return normalized;
  });
};