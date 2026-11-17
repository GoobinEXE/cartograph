import { useCallback, useState } from 'react';
import {
  parseDrawerState,
  serializeDrawerState,
  type DrawerState,
  type LayoutStorageKey,
} from '../../utils/layoutPreferences';

function readDrawerState<K extends string>(storageKey: LayoutStorageKey, defaults: DrawerState<K>): DrawerState<K> {
  try {
    return parseDrawerState(localStorage.getItem(storageKey), defaults);
  } catch {
    // storage blocked (private mode, site data disabled)
    return { ...defaults };
  }
}

function writeDrawerState<K extends string>(storageKey: LayoutStorageKey, state: DrawerState<K>): void {
  try {
    localStorage.setItem(storageKey, serializeDrawerState(state));
  } catch {
    // storage blocked or full: the drawers still work for this session
  }
}

export interface PersistedDrawers<K extends string> {
  drawers: DrawerState<K>;
  allDrawersOpen: boolean;
  toggleDrawer: (key: K) => void;
  /** Opens every drawer, or closes them all when all are already open. */
  toggleAllDrawers: () => void;
}

/**
 * Open/closed state of a sidebar's collapsible sections, persisted under a LAYOUT_STORAGE_KEYS
 * key. `defaults` applies on first run and to any key the stored map lacks; it is read once,
 * at mount, and nothing is written until the user toggles a drawer.
 */
export function usePersistedDrawers<K extends string>(
  storageKey: LayoutStorageKey,
  defaults: DrawerState<K>
): PersistedDrawers<K> {
  const [drawers, setDrawers] = useState<DrawerState<K>>(() => readDrawerState(storageKey, defaults));

  const toggleDrawer = useCallback(
    (key: K) => {
      setDrawers((prev) => {
        const next: DrawerState<K> = { ...prev, [key]: !prev[key] };
        writeDrawerState(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const allDrawersOpen = Object.values<boolean>(drawers).every(Boolean);

  const toggleAllDrawers = useCallback(() => {
    setDrawers((prev) => {
      const target = !Object.values<boolean>(prev).every(Boolean);
      const next = { ...prev };
      for (const key of Object.keys(next) as K[]) {
        next[key] = target;
      }
      writeDrawerState(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return { drawers, allDrawersOpen, toggleDrawer, toggleAllDrawers };
}
