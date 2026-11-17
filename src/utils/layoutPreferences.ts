/**
 * localStorage keys that hold purely visual preferences (sidebar drawers and theme).
 * Single source for the components that read them and for the ErrorBoundary reset, so a
 * new drawer key cannot be forgotten by "Reset layout". Research data lives under
 * WORKSPACE_STORAGE_KEYS (storageEngine.ts) and is never touched by this module.
 */
export const LAYOUT_STORAGE_KEYS = {
  theme: 'cartograph_theme_v1',
  platformsSidebarDrawers: 'cartograph_sidebar_drawers_v2',
  federatedSidebarDrawers: 'cartograph_federated_sidebar_drawers_v1',
  savedSidebarDrawers: 'cartograph_saved_sidebar_drawers_v1',
} as const;

export type LayoutStorageKey = (typeof LAYOUT_STORAGE_KEYS)[keyof typeof LAYOUT_STORAGE_KEYS];

/** Removes every layout preference; storage failures are ignored because the next step is a reload. */
export function clearLayoutPreferences(storage: Pick<Storage, 'removeItem'> | null | undefined): void {
  if (!storage) return;
  for (const key of Object.values(LAYOUT_STORAGE_KEYS)) {
    try {
      storage.removeItem(key);
    } catch {
      // ignore storage errors (private mode, blocked site data)
    }
  }
}
