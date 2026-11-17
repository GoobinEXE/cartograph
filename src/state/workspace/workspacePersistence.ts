import {
  WORKSPACE_STORAGE_KEYS,
  type WorkspaceStorageEngine,
  type WorkspaceStorageEntry,
  type WorkspaceStorageKey,
} from '../../utils/storageEngine';
import type { EmergencyRejectedRecord } from '../../utils/workspaceBackup';
import { buildHydratedWorkspaceState } from './workspaceHydration';
import type { WorkspaceState } from './workspaceState';
import type { WorkspaceStore } from './workspaceStore';

/** Quiet period per storage key before a change is written. */
export const WORKSPACE_WRITE_DEBOUNCE_MS = 400;

type TimerHandle = ReturnType<typeof setTimeout>;

export interface PersistenceTimers {
  setTimeout: (callback: () => void, ms: number) => TimerHandle;
  clearTimeout: (handle: TimerHandle) => void;
}

export interface WorkspacePersistenceOptions {
  debounceMs?: number;
  timers?: PersistenceTimers;
  /** Called once stored data reached the store, with the records sanitization dropped. */
  onHydrated?: (result: { rejected: EmergencyRejectedRecord[] }) => void;
  onError?: (error: unknown) => void;
}

export interface WorkspacePersistence {
  /** Loads stored data into the store; writes start only after it resolves. */
  hydrate: () => Promise<void>;
  /** Starts every pending debounced write now, in one transaction; resolves when all writes end. */
  flush: () => Promise<void>;
  /** Flushes, then stops observing the store; a hydration still in progress is discarded. */
  dispose: () => Promise<void>;
}

const PERSISTED_KEYS = Object.keys(WORKSPACE_STORAGE_KEYS) as WorkspaceStorageKey[];

const DEFAULT_TIMERS: PersistenceTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

/**
 * Mirrors the store into the storage engine. Each slice is compared by reference with the
 * value last written; a changed slice is written WORKSPACE_WRITE_DEBOUNCE_MS after its last
 * change, so typing a note serializes the library once per pause instead of once per key.
 */
export function connectWorkspacePersistence(
  store: WorkspaceStore,
  engine: Pick<WorkspaceStorageEngine, 'initAndMigrate' | 'exportAllRawRecords' | 'setItems'>,
  options: WorkspacePersistenceOptions = {}
): WorkspacePersistence {
  const debounceMs = options.debounceMs ?? WORKSPACE_WRITE_DEBOUNCE_MS;
  const timers = options.timers ?? DEFAULT_TIMERS;
  const pendingTimers = new Map<WorkspaceStorageKey, TimerHandle>();
  const inFlight = new Set<Promise<void>>();
  let lastSeen: WorkspaceState | null = null;
  let writesEnabled = false;
  let disposed = false;

  const write = (keys: readonly WorkspaceStorageKey[]): void => {
    const state = store.getState();
    const entries: WorkspaceStorageEntry[] = keys.map((key) => [key, state[key]]);
    const promise = engine.setItems(entries).catch((error: unknown) => {
      options.onError?.(error);
    });
    inFlight.add(promise);
    void promise.then(() => {
      inFlight.delete(promise);
    });
  };

  const schedule = (key: WorkspaceStorageKey): void => {
    const existing = pendingTimers.get(key);
    if (existing !== undefined) timers.clearTimeout(existing);
    pendingTimers.set(
      key,
      timers.setTimeout(() => {
        pendingTimers.delete(key);
        write([key]);
      }, debounceMs)
    );
  };

  const onStoreChange = (): void => {
    if (!writesEnabled || disposed) return;
    const state = store.getState();
    const previous = lastSeen;
    for (const key of PERSISTED_KEYS) {
      if (!previous || state[key] !== previous[key]) schedule(key);
    }
    lastSeen = state;
  };

  const unsubscribe = store.subscribe(onStoreChange);

  const enableWrites = (baseline: WorkspaceState): void => {
    lastSeen = baseline;
    writesEnabled = true;
    // Slices changed by actions replayed on top of the stored data differ from the baseline.
    onStoreChange();
  };

  const hydrate = async (): Promise<void> => {
    if (store.getSnapshot().hydrated) {
      enableWrites(store.getState());
      return;
    }

    let records: Partial<Record<WorkspaceStorageKey, unknown>>;
    try {
      await engine.initAndMigrate();
      records = await engine.exportAllRawRecords();
    } catch (error) {
      options.onError?.(error);
      // Nothing was read: keep the session usable, but never let defaults overwrite the
      // stored library, so writes stay disabled.
      if (!disposed) store.hydrate(null);
      return;
    }
    if (disposed) return;

    const { state: persisted, rejected } = buildHydratedWorkspaceState(records);
    if (!store.hydrate(persisted)) {
      enableWrites(store.getState());
      return;
    }
    enableWrites(persisted);
    options.onHydrated?.({ rejected });
  };

  const flush = (): Promise<void> => {
    const keys = Array.from(pendingTimers.keys());
    pendingTimers.forEach((handle) => timers.clearTimeout(handle));
    pendingTimers.clear();
    if (keys.length > 0) write(keys);
    return Promise.all(Array.from(inFlight)).then(() => undefined);
  };

  const dispose = (): Promise<void> => {
    const done = flush();
    disposed = true;
    writesEnabled = false;
    unsubscribe();
    return done;
  };

  return { hydrate, flush, dispose };
}

interface LifecycleEventSource {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export interface PageLifecycleTargets {
  window: LifecycleEventSource;
  document: LifecycleEventSource & { readonly visibilityState: DocumentVisibilityState };
}

/**
 * Flushes pending writes when the page may be discarded: `pagehide` (tab close, navigation,
 * bfcache) and `visibilitychange` to hidden (mobile browsers often skip pagehide).
 */
export function bindFlushToPageLifecycle(
  persistence: Pick<WorkspacePersistence, 'flush'>,
  targets: PageLifecycleTargets
): () => void {
  const onPageHide = (): void => {
    void persistence.flush();
  };
  const onVisibilityChange = (): void => {
    if (targets.document.visibilityState === 'hidden') void persistence.flush();
  };
  targets.window.addEventListener('pagehide', onPageHide);
  targets.document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    targets.window.removeEventListener('pagehide', onPageHide);
    targets.document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
