import { workspaceReducer, type WorkspaceAction } from './workspaceReducer';
import { createInitialWorkspaceState, type WorkspaceState } from './workspaceState';

export interface WorkspaceStoreSnapshot {
  readonly state: WorkspaceState;
  /** False until persisted data has been loaded; actions dispatched before are replayed on it. */
  readonly hydrated: boolean;
}

export interface WorkspaceStore {
  getSnapshot: () => WorkspaceStoreSnapshot;
  getState: () => WorkspaceState;
  /** Applies the action synchronously; getState() reflects it as soon as this returns. */
  dispatch: (action: WorkspaceAction) => void;
  /**
   * Replaces the pre-hydration state with `persisted` and replays, in order, every action
   * dispatched before this call, so early user writes are kept. `null` means nothing could be
   * read: the current state (which already contains those actions) is kept. Returns false, and
   * changes nothing, when the store was already hydrated.
   */
  hydrate: (persisted: WorkspaceState | null) => boolean;
  subscribe: (listener: () => void) => () => void;
}

export function createWorkspaceStore(initialState: WorkspaceState = createInitialWorkspaceState()): WorkspaceStore {
  let snapshot: WorkspaceStoreSnapshot = { state: initialState, hydrated: false };
  let pendingActions: WorkspaceAction[] = [];
  const listeners = new Set<() => void>();

  const publish = (next: WorkspaceStoreSnapshot): void => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const dispatch = (action: WorkspaceAction): void => {
    const nextState = workspaceReducer(snapshot.state, action);
    if (!snapshot.hydrated) pendingActions.push(action);
    if (nextState !== snapshot.state) {
      publish({ state: nextState, hydrated: snapshot.hydrated });
    }
  };

  const hydrate = (persisted: WorkspaceState | null): boolean => {
    if (snapshot.hydrated) return false;
    const replayed = persisted ? pendingActions.reduce(workspaceReducer, persisted) : snapshot.state;
    pendingActions = [];
    publish({ state: replayed, hydrated: true });
    return true;
  };

  return {
    getSnapshot: () => snapshot,
    getState: () => snapshot.state,
    dispatch,
    hydrate,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
