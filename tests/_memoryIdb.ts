import { WORKSPACE_STORE_NAME } from '../src/utils/storageEngine.ts';

/**
 * Minimal IndexedDB double for the storage engine (not picked up as a test: no `.test.ts`).
 * Requests resolve on a microtask like the real API; `put` lands in `backingStore` at call
 * time, which lets tests observe whether a write started synchronously.
 */
export interface MemoryIdb {
  idbFactory: IDBFactory;
  backingStore: Map<string, unknown>;
  stats: { readwriteTransactions: number };
}

type Handler = (() => void) | null;

export function createMemoryIdb(initial: Record<string, unknown> = {}): MemoryIdb {
  const backingStore = new Map<string, unknown>(Object.entries(initial));
  const storeNames = new Set<string>([WORKSPACE_STORE_NAME]);
  const stats = { readwriteTransactions: 0 };

  const fakeDb = {
    objectStoreNames: { contains: (name: string) => storeNames.has(name) },
    createObjectStore: (name: string) => {
      storeNames.add(name);
      return {};
    },
    transaction: (_storeName: string, mode: IDBTransactionMode) => {
      if (mode === 'readwrite') stats.readwriteTransactions += 1;
      const tx: { oncomplete: Handler; onerror: Handler; onabort: Handler; objectStore: () => unknown } = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore: () => ({
          get: (key: string) => {
            const req: { result: unknown; onsuccess: Handler; onerror: Handler } = {
              result: backingStore.has(key) ? structuredClone(backingStore.get(key)) : undefined,
              onsuccess: null,
              onerror: null,
            };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          put: (value: unknown, key: string) => {
            backingStore.set(key, structuredClone(value));
          },
        }),
      };
      queueMicrotask(() => tx.oncomplete?.());
      return tx as unknown as IDBTransaction;
    },
  };

  const idbFactory = {
    open: () => {
      const req: { result: unknown; onupgradeneeded: Handler; onsuccess: Handler; onerror: Handler; onblocked: Handler } = {
        result: fakeDb,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  } as unknown as IDBFactory;

  return { idbFactory, backingStore, stats };
}
