import type { SupportedLanguage } from '../../i18n/translations';
import type {
  CustomExtractionColumn,
  LibraryGroup,
  NormalizedPaper,
  QualityAppraisalResult,
  SavedPaperItem,
  ScreeningStatus,
  SearchLogEntry,
} from '../../types/academic';
import type { AnalyticsEventName, AnalyticsEventParams } from '../../utils/analytics';
import { parseAbstractMetadata } from '../../utils/abstractParser';
import { makePairKey } from '../../utils/deduplication';
import type { CartographBackupPayload } from '../../utils/workspaceBackup';
import type { BackupRestoreMode, PlatformPreset } from './workspaceReducer';
import type { WorkspaceStore } from './workspaceStore';

/** Group colour used when the caller does not pick one (first swatch of the library palette). */
export const DEFAULT_GROUP_COLOR = '#01ABE8';

export interface WorkspaceActionDeps {
  now: () => Date;
  /** Unique suffix for generated IDs; injected so tests stay deterministic. */
  randomSuffix: () => string;
  getLanguage: () => SupportedLanguage;
  track: (event: AnalyticsEventName, params?: AnalyticsEventParams) => void;
}

export interface LibraryImportResult {
  added: number;
  skippedDuplicates: number;
}

export interface BackupRestoreResult {
  papersAdded: number;
  groupsAdded: number;
}

export interface WorkspaceActions {
  /** Saves the paper (into `targetGroupId`, or the active save group when undefined) or removes it when already saved. */
  toggleSavePaper: (paper: NormalizedPaper, targetGroupId?: string | null) => void;
  removePaper: (paperId: string) => void;
  updateScreening: (paperId: string, status: ScreeningStatus, reason?: string) => void;
  updateNotes: (paperId: string, notes: string) => void;
  updateCustomField: (paperId: string, columnId: string, value: string) => void;
  updateQualityAppraisal: (paperId: string, appraisal: QualityAppraisalResult) => void;
  updateRelevance: (paperId: string, relevanceTag: SavedPaperItem['relevanceTag']) => void;
  assignPaperGroup: (paperId: string, groupId: string | null) => void;
  linkRelatedPaper: (targetId: string, sourceId: string) => void;
  /** Adds papers unknown to the library (identity rule of findLibraryMatch) and reports what was skipped. */
  importPapers: (items: SavedPaperItem[], targetGroupId?: string | null) => LibraryImportResult;
  /** No argument clears the library; UNGROUPED_SLOT or a group ID clears only that slot. */
  clearLibrary: (onlyGroupId?: string) => void;
  createGroup: (name: string, color?: string) => LibraryGroup;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  setActiveSaveGroup: (groupId: string | null) => void;
  setSelectedPlatformIds: (platformIds: string[]) => void;
  togglePlatform: (platformId: string) => void;
  togglePreset: (preset: PlatformPreset, presets: readonly PlatformPreset[]) => void;
  appendSearchLog: (entry: SearchLogEntry) => void;
  clearSearchLogs: () => void;
  splitMergePair: (idA: string, idB: string) => void;
  setCustomColumns: (columns: CustomExtractionColumn[]) => void;
  /** `payload.selectedPlatformIds` must already be limited to known portals. */
  restoreBackup: (payload: CartographBackupPayload, mode: BackupRestoreMode) => BackupRestoreResult;
}

/**
 * Action creators: they stamp timestamps, IDs and extracted metadata, emit analytics, then
 * dispatch. Results that callers read back (import counts, the created group) come from the
 * store right after the synchronous dispatch.
 */
export function createWorkspaceActions(store: WorkspaceStore, deps: WorkspaceActionDeps): WorkspaceActions {
  const { dispatch, getState } = store;

  return {
    toggleSavePaper: (paper, targetGroupId) => {
      const alreadySaved = getState().savedPapers.some((item) => item.id === paper.id);
      if (!alreadySaved) {
        deps.track('paper_saved', { source_api: paper.source });
      }
      dispatch({
        type: 'paper/toggleSaved',
        paper,
        savedAt: deps.now().toISOString(),
        extractedMetadata: parseAbstractMetadata(
          paper.title,
          paper.abstractText,
          paper.publicationType,
          deps.getLanguage()
        ),
        targetGroupId,
      });
    },
    removePaper: (paperId) => dispatch({ type: 'paper/remove', paperId }),
    updateScreening: (paperId, status, reason) => dispatch({ type: 'paper/setScreening', paperId, status, reason }),
    updateNotes: (paperId, notes) => dispatch({ type: 'paper/setNotes', paperId, notes }),
    updateCustomField: (paperId, columnId, value) =>
      dispatch({ type: 'paper/setCustomField', paperId, columnId, value }),
    updateQualityAppraisal: (paperId, appraisal) =>
      dispatch({ type: 'paper/setQualityAppraisal', paperId, appraisal }),
    updateRelevance: (paperId, relevanceTag) => dispatch({ type: 'paper/setRelevance', paperId, relevanceTag }),
    assignPaperGroup: (paperId, groupId) => dispatch({ type: 'paper/assignGroup', paperId, groupId }),
    linkRelatedPaper: (targetId, sourceId) => dispatch({ type: 'paper/linkRelated', targetId, sourceId }),
    importPapers: (items, targetGroupId) => {
      const before = getState().savedPapers.length;
      dispatch({ type: 'library/import', items, targetGroupId });
      // The import only prepends accepted papers, so the growth is the number added.
      const added = getState().savedPapers.length - before;
      return { added, skippedDuplicates: items.length - added };
    },
    clearLibrary: (onlyGroupId) => dispatch({ type: 'library/clear', onlyGroupId }),
    createGroup: (name, color = DEFAULT_GROUP_COLOR) => {
      const now = deps.now();
      const group: LibraryGroup = {
        id: `grp-${now.getTime()}-${deps.randomSuffix()}`,
        name: name.trim(),
        color,
        createdAt: now.toISOString(),
      };
      dispatch({ type: 'group/create', group });
      deps.track('library_group_action', { action: 'create' });
      return group;
    },
    renameGroup: (groupId, name) => dispatch({ type: 'group/rename', groupId, name }),
    deleteGroup: (groupId) => dispatch({ type: 'group/delete', groupId }),
    setActiveSaveGroup: (groupId) => dispatch({ type: 'group/setActiveSave', groupId }),
    setSelectedPlatformIds: (platformIds) => dispatch({ type: 'platforms/set', platformIds }),
    togglePlatform: (platformId) => dispatch({ type: 'platforms/toggle', platformId }),
    togglePreset: (preset, presets) => {
      deps.track('preset_selected', { preset_id: preset.id, platforms_count: preset.platformIds.length });
      dispatch({ type: 'platforms/togglePreset', preset, presets });
    },
    appendSearchLog: (entry) => dispatch({ type: 'searchLog/append', entry }),
    clearSearchLogs: () => dispatch({ type: 'searchLog/clear' }),
    splitMergePair: (idA, idB) => dispatch({ type: 'dedup/splitPair', pairKey: makePairKey(idA, idB) }),
    setCustomColumns: (columns) => dispatch({ type: 'customColumns/set', columns }),
    restoreBackup: (payload, mode) => {
      const before = getState();
      dispatch({ type: 'backup/restore', payload, mode });
      if (mode === 'replace') {
        return { papersAdded: payload.savedPapers.length, groupsAdded: payload.groups.length };
      }
      const after = getState();
      return {
        papersAdded: after.savedPapers.length - before.savedPapers.length,
        groupsAdded: after.libraryGroups.length - before.libraryGroups.length,
      };
    },
  };
}
