export const WORKSPACE_DB_NAME = 'cartograph_workspace_db';
export const WORKSPACE_DB_VERSION = 1;
export const WORKSPACE_STORE_NAME = 'workspace_kv';

export const WORKSPACE_STORAGE_KEYS = {
  savedPapers: 'cartograph_saved_papers_v2',
  libraryGroups: 'cartograph_library_groups_v1',
  activeSaveGroupId: 'cartograph_active_save_group_v1',
  selectedPlatformIds: 'cartograph_selected_platforms_v2',
  searchLogs: 'cartograph_search_log_v1',
  dedupOverrides: 'cartograph_dedup_overrides_v1',
  customColumns: 'cartograph_custom_columns_v1',
} as const;

export type WorkspaceStorageKey = keyof typeof WORKSPACE_STORAGE_KEYS;

const IDB_MIGRATION_SENTINEL_KEY = '__idb_migrated_v1';

export interface StorageEngineDeps {
  idbFactory?: IDBFactory | null;
  localStorage?: Storage | null;
}

export interface WorkspaceStorageEngine {
  initAndMigrate: () => Promise<{ backend: 'indexeddb' | 'localstorage'; migratedKeys: number }>;
  getItem: <T>(key: WorkspaceStorageKey, fallback: T) => Promise<T>;
  setItem: <T>(key: WorkspaceStorageKey, value: T) => Promise<void>;
  getBackendType: () => Promise<'indexeddb' | 'localstorage'>;
  exportAllRawRecords: () => Promise<Record<string, unknown>>;
}

function readLegacyLocalValue(storage: Storage | null | undefined, legacyKey: string): { found: boolean; value: unknown } {
  if (!storage) return { found: false, value: null };
  try {
    const raw = storage.getItem(legacyKey);
    if (raw === null) return { found: false, value: null };
    if (legacyKey === WORKSPACE_STORAGE_KEYS.activeSaveGroupId) {
      // activeSaveGroupId was historically stored either as plain string or JSON string
      try {
        return { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: true, value: raw };
      }
    }
    return { found: true, value: JSON.parse(raw) };
  } catch {
    return { found: false, value: null };
  }
}

export function createWorkspaceStorageEngine(deps?: StorageEngineDeps): WorkspaceStorageEngine {
  const getIdb = (): IDBFactory | null => {
    if (deps && 'idbFactory' in deps) return deps.idbFactory ?? null;
    return typeof globalThis !== 'undefined' && 'indexedDB' in globalThis
      ? (globalThis.indexedDB ?? null)
      : null;
  };

  const getLs = (): Storage | null => {
    if (deps && 'localStorage' in deps) return deps.localStorage ?? null;
    try {
      return typeof globalThis !== 'undefined' && 'localStorage' in globalThis
        ? (globalThis.localStorage ?? null)
        : null;
    } catch {
      return null;
    }
  };

  let dbPromise: Promise<IDBDatabase | null> | null = null;
  let migrationPromise: Promise<{ backend: 'indexeddb' | 'localstorage'; migratedKeys: number }> | null = null;

  const openDb = (): Promise<IDBDatabase | null> => {
    if (dbPromise) return dbPromise;
    const idb = getIdb();
    if (!idb) {
      dbPromise = Promise.resolve(null);
      return dbPromise;
    }

    dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const req = idb.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(WORKSPACE_STORE_NAME)) {
            db.createObjectStore(WORKSPACE_STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return dbPromise;
  };

  const idbReadRaw = async (db: IDBDatabase, storeKey: string): Promise<{ found: boolean; value: unknown }> => {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(WORKSPACE_STORE_NAME, 'readonly');
        const store = tx.objectStore(WORKSPACE_STORE_NAME);
        const req = store.get(storeKey);
        req.onsuccess = () => {
          if (req.result === undefined) {
            resolve({ found: false, value: null });
          } else {
            resolve({ found: true, value: req.result });
          }
        };
        req.onerror = () => resolve({ found: false, value: null });
      } catch {
        resolve({ found: false, value: null });
      }
    });
  };

  const idbWriteBatch = async (db: IDBDatabase, entries: Array<[string, unknown]>): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(WORKSPACE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(WORKSPACE_STORE_NAME);
        for (const [k, v] of entries) {
          store.put(v, k);
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  };

  const initAndMigrate = async (): Promise<{
    backend: 'indexeddb' | 'localstorage';
    migratedKeys: number;
  }> => {
    if (migrationPromise) return migrationPromise;

    migrationPromise = (async () => {
      const db = await openDb();
      if (!db) {
        return { backend: 'localstorage', migratedKeys: 0 };
      }

      const sentinel = await idbReadRaw(db, IDB_MIGRATION_SENTINEL_KEY);
      if (sentinel.found && sentinel.value === true) {
        return { backend: 'indexeddb', migratedKeys: 0 };
      }

      const ls = getLs();
      const batch: Array<[string, unknown]> = [];
      const keys = Object.keys(WORKSPACE_STORAGE_KEYS) as WorkspaceStorageKey[];

      for (const logicalKey of keys) {
        const legacyKey = WORKSPACE_STORAGE_KEYS[logicalKey];
        const existingInIdb = await idbReadRaw(db, logicalKey);
        if (existingInIdb.found) continue;

        const legacy = readLegacyLocalValue(ls, legacyKey);
        if (legacy.found) {
          batch.push([logicalKey, legacy.value]);
        }
      }

      const migratedCount = batch.length;
      batch.push([IDB_MIGRATION_SENTINEL_KEY, true]);
      const ok = await idbWriteBatch(db, batch);
      return {
        backend: ok ? 'indexeddb' : 'localstorage',
        migratedKeys: ok ? migratedCount : 0,
      };
    })();

    return migrationPromise;
  };

  const getItem = async <T>(key: WorkspaceStorageKey, fallback: T): Promise<T> => {
    await initAndMigrate();
    const db = await openDb();
    if (db) {
      const res = await idbReadRaw(db, key);
      if (res.found) {
        return res.value as T;
      }
    }

    const ls = getLs();
    const legacy = readLegacyLocalValue(ls, WORKSPACE_STORAGE_KEYS[key]);
    if (legacy.found) {
      return legacy.value as T;
    }
    return fallback;
  };

  const setItem = async <T>(key: WorkspaceStorageKey, value: T): Promise<void> => {
    await initAndMigrate();
    const db = await openDb();
    if (db) {
      const ok = await idbWriteBatch(db, [[key, value]]);
      if (ok) {
        // Keep localStorage mirror best-effort for backwards recovery on small keys; ignore quota error
        const ls = getLs();
        if (ls) {
          try {
            const legacyKey = WORKSPACE_STORAGE_KEYS[key];
            if (legacyKey === WORKSPACE_STORAGE_KEYS.activeSaveGroupId) {
              if (value === null || value === undefined) {
                ls.removeItem(legacyKey);
              } else {
                ls.setItem(legacyKey, String(value));
              }
            } else {
              ls.setItem(legacyKey, JSON.stringify(value));
            }
          } catch {
            // QuotaExceededError expected for huge libraries (>5MB) when IndexedDB holds full store
          }
        }
        return;
      }
    }

    const ls = getLs();
    if (ls) {
      try {
        const legacyKey = WORKSPACE_STORAGE_KEYS[key];
        if (legacyKey === WORKSPACE_STORAGE_KEYS.activeSaveGroupId) {
          if (value === null || value === undefined) {
            ls.removeItem(legacyKey);
          } else {
            ls.setItem(legacyKey, String(value));
          }
        } else {
          ls.setItem(legacyKey, JSON.stringify(value));
        }
      } catch {
        // ignore quota error
      }
    }
  };

  const getBackendType = async (): Promise<'indexeddb' | 'localstorage'> => {
    const db = await openDb();
    return db ? 'indexeddb' : 'localstorage';
  };

  const exportAllRawRecords = async (): Promise<Record<string, unknown>> => {
    const out: Record<string, unknown> = {};
    const db = await openDb();
    const keys = Object.keys(WORKSPACE_STORAGE_KEYS) as WorkspaceStorageKey[];
    for (const k of keys) {
      if (db) {
        const res = await idbReadRaw(db, k);
        if (res.found) {
          out[k] = res.value;
          continue;
        }
      }
      const ls = getLs();
      const legacy = readLegacyLocalValue(ls, WORKSPACE_STORAGE_KEYS[k]);
      if (legacy.found) {
        out[k] = legacy.value;
      }
    }
    return out;
  };

  return {
    initAndMigrate,
    getItem,
    setItem,
    getBackendType,
    exportAllRawRecords,
  };
}

export const workspaceStorageEngine = createWorkspaceStorageEngine();

export async function getWorkspaceStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
} | null> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return {
        usageBytes: est.usage ?? 0,
        quotaBytes: est.quota ?? 0,
      };
    }
  } catch {
    // ignore
  }
  return null;
}
