import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKSPACE_STORAGE_KEYS,
  WORKSPACE_STORE_NAME,
  createWorkspaceStorageEngine,
} from '../src/utils/storageEngine.ts';

function createMemoryLocalStorage(initial: Record<string, string> = {}, failSet = false): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      if (failSet) {
        throw new Error('QuotaExceededError');
      }
      map.set(key, value);
    },
  };
}

function createMockIdbFactory(): { idbFactory: IDBFactory; backingStore: Map<string, unknown> } {
  const backingStore = new Map<string, unknown>();
  const storeNames = new Set<string>();

  const fakeDb = {
    objectStoreNames: {
      contains: (name: string) => storeNames.has(name),
    },
    createObjectStore: (name: string) => {
      storeNames.add(name);
      return {};
    },
    transaction: (_storeName: string, _mode: IDBTransactionMode) => {
      const tx: Record<string, unknown> = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: () => ({
          get: (key: string) => {
            const req: Record<string, unknown> = {
              result: backingStore.has(key) ? backingStore.get(key) : undefined,
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
            };
            queueMicrotask(() => {
              if (typeof req.onsuccess === 'function') (req.onsuccess as () => void)();
            });
            return req;
          },
          put: (value: unknown, key: string) => {
            backingStore.set(key, structuredClone(value));
          },
        }),
      };
      queueMicrotask(() => {
        if (typeof tx.oncomplete === 'function') (tx.oncomplete as () => void)();
      });
      return tx as unknown as IDBTransaction;
    },
  };

  const idbFactory = {
    open: () => {
      const req: Record<string, unknown> = {
        result: fakeDb,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onblocked: null as (() => void) | null,
      };
      queueMicrotask(() => {
        if (!storeNames.has(WORKSPACE_STORE_NAME) && typeof req.onupgradeneeded === 'function') {
          (req.onupgradeneeded as () => void)();
        }
        if (typeof req.onsuccess === 'function') {
          (req.onsuccess as () => void)();
        }
      });
      return req;
    },
  } as unknown as IDBFactory;

  return { idbFactory, backingStore };
}

test('storageEngine migrates legacy localStorage keys into IndexedDB atomically once', async () => {
  const ls = createMemoryLocalStorage({
    [WORKSPACE_STORAGE_KEYS.savedPapers]: JSON.stringify([{ id: 'p1', title: 'Causal Forest' }]),
    [WORKSPACE_STORAGE_KEYS.libraryGroups]: JSON.stringify([{ id: 'g1', name: 'Health' }]),
    [WORKSPACE_STORAGE_KEYS.activeSaveGroupId]: 'g1',
    [WORKSPACE_STORAGE_KEYS.searchLogs]: JSON.stringify([{ id: 'log1', query: 'ml' }]),
  });

  const { idbFactory, backingStore } = createMockIdbFactory();
  const engine = createWorkspaceStorageEngine({ idbFactory, localStorage: ls });

  const migration1 = await engine.initAndMigrate();
  assert.equal(migration1.backend, 'indexeddb');
  assert.equal(migration1.migratedKeys, 4);
  assert.equal(backingStore.get('__idb_migrated_v1'), true);

  // Even if legacy localStorage is cleared later, IndexedDB retains migrated state
  ls.clear();
  const papers = await engine.getItem<Array<{ id: string }>>('savedPapers', []);
  assert.equal(papers.length, 1);
  assert.equal(papers[0].id, 'p1');
  assert.equal(await engine.getItem<string | null>('activeSaveGroupId', null), 'g1');

  // Re-initializing runs idempotently with 0 additional migrations
  const engine2 = createWorkspaceStorageEngine({ idbFactory, localStorage: ls });
  const migration2 = await engine2.initAndMigrate();
  assert.equal(migration2.migratedKeys, 0);
});

test('storageEngine falls back gracefully to localStorage when IndexedDB is unavailable and absorbs QuotaExceededError', async () => {
  const ls = createMemoryLocalStorage({
    [WORKSPACE_STORAGE_KEYS.savedPapers]: JSON.stringify([{ id: 'legacy-1', title: 'Test' }]),
  });

  const engine = createWorkspaceStorageEngine({ idbFactory: null, localStorage: ls });
  const initRes = await engine.initAndMigrate();
  assert.equal(initRes.backend, 'localstorage');
  assert.equal(await engine.getBackendType(), 'localstorage');

  const papers = await engine.getItem<Array<{ id: string }>>('savedPapers', []);
  assert.equal(papers[0].id, 'legacy-1');

  await engine.setItem('selectedPlatformIds', ['openalex', 'pubmed']);
  assert.deepEqual(
    JSON.parse(ls.getItem(WORKSPACE_STORAGE_KEYS.selectedPlatformIds) || '[]'),
    ['openalex', 'pubmed']
  );

  // QuotaExceededError should not crash the app
  const fullLs = createMemoryLocalStorage({}, true);
  const fullEngine = createWorkspaceStorageEngine({ idbFactory: null, localStorage: fullLs });
  await assert.doesNotReject(() => fullEngine.setItem('savedPapers', [{ id: 'x' }]));
});
