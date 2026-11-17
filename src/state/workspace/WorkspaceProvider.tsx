import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useI18n } from '../../i18n/context';
import { trackAcademicEvent } from '../../utils/analytics';
import { workspaceStorageEngine, type WorkspaceStorageEngine } from '../../utils/storageEngine';
import { createWorkspaceActions, type WorkspaceActions } from './workspaceActions';
import { bindFlushToPageLifecycle, connectWorkspacePersistence } from './workspacePersistence';
import type { WorkspaceState } from './workspaceState';
import { createWorkspaceStore, type WorkspaceStore } from './workspaceStore';

interface WorkspaceContextValue {
  store: WorkspaceStore;
  actions: WorkspaceActions;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
  engine?: WorkspaceStorageEngine;
}

/**
 * Owns the research-library store for the app: hydrates it from the storage engine, writes
 * changes back with a per-key debounce and flushes pending writes when the page is hidden,
 * closed or when the provider unmounts.
 */
export function WorkspaceProvider({ children, engine = workspaceStorageEngine }: WorkspaceProviderProps) {
  const { language } = useI18n();
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const [value] = useState<WorkspaceContextValue>(() => {
    const store = createWorkspaceStore();
    const actions = createWorkspaceActions(store, {
      now: () => new Date(),
      randomSuffix: () => Math.random().toString(36).slice(2, 6),
      getLanguage: () => languageRef.current,
      track: trackAcademicEvent,
    });
    return { store, actions };
  });

  useEffect(() => {
    const persistence = connectWorkspacePersistence(value.store, engine, {
      onHydrated: ({ rejected }) => {
        if (rejected.length > 0) {
          console.warn(
            `[Cartograph] ${rejected.length} stored workspace record(s) failed validation and were left out of this session.`,
            rejected
          );
        }
      },
      onError: (error) => {
        console.error('[Cartograph] workspace storage error', error);
      },
    });
    void persistence.hydrate();
    const unbindLifecycle =
      typeof window !== 'undefined' && typeof document !== 'undefined'
        ? bindFlushToPageLifecycle(persistence, { window, document })
        : () => undefined;

    return () => {
      unbindLifecycle();
      void persistence.dispose();
    };
  }, [value.store, engine]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export interface WorkspaceHandle {
  state: WorkspaceState;
  /** False until stored data is loaded; actions taken before are kept and replayed. */
  isHydrated: boolean;
  actions: WorkspaceActions;
}

function useWorkspaceContext(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace() must be called inside <WorkspaceProvider>.');
  }
  return context;
}

/** Action creators only: components that never read library state skip the store subscription. */
export function useWorkspaceActions(): WorkspaceActions {
  return useWorkspaceContext().actions;
}

export function useWorkspace(): WorkspaceHandle {
  const context = useWorkspaceContext();
  const snapshot = useSyncExternalStore(
    context.store.subscribe,
    context.store.getSnapshot,
    context.store.getSnapshot
  );
  return { state: snapshot.state, isHydrated: snapshot.hydrated, actions: context.actions };
}
