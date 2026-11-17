import type { WorkspaceStorageKey } from '../../utils/storageEngine';
import {
  sanitizeStoredWorkspaceRecords,
  type EmergencyRejectedRecord,
} from '../../utils/workspaceBackup';
import {
  DEFAULT_SELECTED_PLATFORM_IDS,
  SEARCH_LOG_LIMIT,
  type WorkspaceState,
} from './workspaceState';

export interface HydratedWorkspace {
  state: WorkspaceState;
  /** Stored records that failed sanitization; they never reach the store. */
  rejected: EmergencyRejectedRecord[];
}

/**
 * Turns raw stored records into a store state through the same sanitizers as backup import
 * and the emergency backup. Invalid entries (for example a saved paper without title) are
 * dropped from the state and reported in `rejected`; missing keys fall back to defaults, and
 * an empty platform selection falls back to the default portals.
 */
export function buildHydratedWorkspaceState(
  records: Partial<Record<WorkspaceStorageKey, unknown>>
): HydratedWorkspace {
  const clean = sanitizeStoredWorkspaceRecords(records);
  return {
    state: {
      savedPapers: clean.savedPapers,
      libraryGroups: clean.groups,
      activeSaveGroupId: clean.activeSaveGroupId,
      selectedPlatformIds:
        clean.selectedPlatformIds.length > 0 ? clean.selectedPlatformIds : [...DEFAULT_SELECTED_PLATFORM_IDS],
      searchLogs: clean.searchLogs.slice(0, SEARCH_LOG_LIMIT),
      dedupOverrides: clean.dedupOverrides ?? { splitPairs: [] },
      customColumns: clean.customColumns,
    },
    rejected: clean.rejected,
  };
}
