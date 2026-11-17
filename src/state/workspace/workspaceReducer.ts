import type {
  CustomExtractionColumn,
  ExtractedPaperMetadata,
  LibraryGroup,
  NormalizedPaper,
  QualityAppraisalResult,
  RelatedPaperUrl,
  SavedPaperItem,
  ScreeningStatus,
  SearchLogEntry,
} from '../../types/academic';
import type { CartographBackupPayload } from '../../utils/workspaceBackup';
import { createLibraryMatcher } from '../../utils/deduplication';
import { SEARCH_LOG_LIMIT, UNGROUPED_SLOT, type WorkspaceState } from './workspaceState';

export interface PlatformPreset {
  id: string;
  platformIds: readonly string[];
}

export type BackupRestoreMode = 'merge' | 'replace';

/**
 * Every mutation of the research library. Actions carry their own timestamps and IDs, so
 * the reducer stays deterministic and can replay actions queued before hydration.
 */
export type WorkspaceAction =
  | {
      type: 'paper/toggleSaved';
      paper: NormalizedPaper;
      savedAt: string;
      extractedMetadata: ExtractedPaperMetadata;
      /** undefined: use the active save group; null: save without group. */
      targetGroupId?: string | null;
    }
  | { type: 'paper/remove'; paperId: string }
  | { type: 'paper/setScreening'; paperId: string; status: ScreeningStatus; reason?: string }
  | { type: 'paper/setNotes'; paperId: string; notes: string }
  | { type: 'paper/setCustomField'; paperId: string; columnId: string; value: string }
  | { type: 'paper/setQualityAppraisal'; paperId: string; appraisal: QualityAppraisalResult }
  | { type: 'paper/setRelevance'; paperId: string; relevanceTag: SavedPaperItem['relevanceTag'] }
  | { type: 'paper/assignGroup'; paperId: string; groupId: string | null }
  | { type: 'paper/linkRelated'; targetId: string; sourceId: string }
  | {
      type: 'library/import';
      items: SavedPaperItem[];
      /** undefined: use the active save group; null: keep items without group. */
      targetGroupId?: string | null;
    }
  | {
      type: 'library/clear';
      /** undefined clears the whole library; UNGROUPED_SLOT clears papers without a valid group. */
      onlyGroupId?: string;
    }
  | { type: 'group/create'; group: LibraryGroup }
  | { type: 'group/rename'; groupId: string; name: string }
  | { type: 'group/delete'; groupId: string }
  | { type: 'group/setActiveSave'; groupId: string | null }
  | { type: 'platforms/set'; platformIds: string[] }
  | { type: 'platforms/toggle'; platformId: string }
  | { type: 'platforms/togglePreset'; preset: PlatformPreset; presets: readonly PlatformPreset[] }
  | { type: 'searchLog/append'; entry: SearchLogEntry }
  | { type: 'searchLog/clear' }
  | { type: 'dedup/splitPair'; pairKey: string }
  | { type: 'customColumns/set'; columns: CustomExtractionColumn[] }
  | { type: 'backup/restore'; payload: CartographBackupPayload; mode: BackupRestoreMode };

export interface LibraryImportPlan {
  toAdd: SavedPaperItem[];
  skippedDuplicates: number;
}

/**
 * Applies the library identity rule (findLibraryMatch levels) to an import batch. Candidates
 * that match the library or an earlier candidate of the same batch are skipped; accepted ones
 * keep their own group or receive `fallbackGroupId`.
 */
export function planLibraryImport(
  library: readonly SavedPaperItem[],
  candidates: readonly SavedPaperItem[],
  fallbackGroupId: string | null
): LibraryImportPlan {
  const matcher = createLibraryMatcher(library);
  const toAdd: SavedPaperItem[] = [];
  let skippedDuplicates = 0;

  for (const candidate of candidates) {
    if (matcher.find(candidate)) {
      skippedDuplicates += 1;
      continue;
    }
    const item: SavedPaperItem = { ...candidate, groupId: candidate.groupId ?? fallbackGroupId ?? null };
    matcher.add(item);
    toAdd.push(item);
  }

  return { toAdd, skippedDuplicates };
}

function resolveTargetGroup(state: WorkspaceState, targetGroupId: string | null | undefined): string | null {
  return targetGroupId !== undefined ? targetGroupId : state.activeSaveGroupId;
}

/** Returns `state` itself when no saved paper has `paperId`, so persistence skips the write. */
function updatePaper(
  state: WorkspaceState,
  paperId: string,
  update: (item: SavedPaperItem) => SavedPaperItem
): WorkspaceState {
  let changed = false;
  const savedPapers = state.savedPapers.map((item) => {
    if (item.id !== paperId) return item;
    changed = true;
    return update(item);
  });
  return changed ? { ...state, savedPapers } : state;
}

function importIntoLibrary(
  state: WorkspaceState,
  items: readonly SavedPaperItem[],
  targetGroupId: string | null | undefined
): WorkspaceState {
  const { toAdd } = planLibraryImport(state.savedPapers, items, resolveTargetGroup(state, targetGroupId));
  return toAdd.length > 0 ? { ...state, savedPapers: [...toAdd, ...state.savedPapers] } : state;
}

function inferRelatedKind(source: SavedPaperItem): RelatedPaperUrl['kind'] {
  const url = source.url || '';
  return source.source === 'arxiv' ||
    source.source === 'socarxiv' ||
    url.includes('osf.io/preprints') ||
    url.includes('biorxiv') ||
    url.includes('medrxiv')
    ? 'preprint'
    : 'published';
}

/**
 * Folds `sourceId` into `targetId` (preprint and published version of one study): the
 * target gains the source's URLs as related links, its notes, and its PDF/DOI when missing,
 * and the source record leaves the library.
 */
function linkRelatedPaper(state: WorkspaceState, targetId: string, sourceId: string): WorkspaceState {
  if (!targetId || !sourceId || targetId === sourceId) return state;
  const target = state.savedPapers.find((p) => p.id === targetId);
  const source = state.savedPapers.find((p) => p.id === sourceId);
  if (!target || !source) return state;

  const existing = target.relatedUrls ?? [];
  const seenUrls = new Set(existing.map((r) => r.url));
  const newLinks: RelatedPaperUrl[] = [...existing];
  const inferredKind = inferRelatedKind(source);

  if (source.url && !seenUrls.has(source.url) && source.url !== target.url) {
    seenUrls.add(source.url);
    newLinks.push({
      kind: inferredKind,
      label: `${source.source.toUpperCase()} (${source.year ?? 's.d.'})`,
      url: source.url,
    });
  }
  if (source.pdfUrl && !seenUrls.has(source.pdfUrl) && source.pdfUrl !== target.pdfUrl) {
    seenUrls.add(source.pdfUrl);
    newLinks.push({
      kind: inferredKind,
      label: `${source.source.toUpperCase()} PDF`,
      url: source.pdfUrl,
    });
  }
  for (const extra of source.relatedUrls ?? []) {
    if (extra.url && !seenUrls.has(extra.url)) {
      seenUrls.add(extra.url);
      newLinks.push(extra);
    }
  }

  const sourceNotes = source.researcherNotes.trim();
  const mergedNotes =
    sourceNotes && !target.researcherNotes.includes(sourceNotes)
      ? [target.researcherNotes.trim(), sourceNotes].filter(Boolean).join('\n\n')
      : target.researcherNotes;

  return {
    ...state,
    savedPapers: state.savedPapers
      .filter((p) => p.id !== sourceId)
      .map((p) =>
        p.id === targetId
          ? {
              ...p,
              relatedUrls: newLinks,
              researcherNotes: mergedNotes,
              pdfUrl: p.pdfUrl ?? source.pdfUrl,
              doi: p.doi ?? source.doi,
            }
          : p
      ),
  };
}

/**
 * Selecting a preset adds all of its portals; deselecting a fully active preset removes its
 * portals except those still required by another fully active preset.
 */
function togglePresetSelection(
  selected: string[],
  preset: PlatformPreset,
  presets: readonly PlatformPreset[]
): string[] {
  const isFullyActive = preset.platformIds.every((id) => selected.includes(id));
  if (!isFullyActive) {
    return Array.from(new Set([...selected, ...preset.platformIds]));
  }
  const protectedIds = new Set(
    presets
      .filter((p) => p.id !== preset.id && p.platformIds.every((id) => selected.includes(id)))
      .flatMap((p) => p.platformIds)
  );
  return selected.filter((id) => !preset.platformIds.includes(id) || protectedIds.has(id));
}

/**
 * Replace swaps the library for the backup (keeping current platforms, logs, overrides and
 * columns when the backup omits them); merge appends unseen groups, logs and columns, unions
 * platforms and split pairs, and imports papers through the identity rule without a group
 * fallback. `payload.selectedPlatformIds` must already be filtered to known portals.
 */
export function restoreWorkspaceBackup(
  state: WorkspaceState,
  payload: CartographBackupPayload,
  mode: BackupRestoreMode
): WorkspaceState {
  if (mode === 'replace') {
    return {
      ...state,
      libraryGroups: payload.groups,
      savedPapers: payload.savedPapers,
      selectedPlatformIds:
        payload.selectedPlatformIds.length > 0 ? payload.selectedPlatformIds : state.selectedPlatformIds,
      activeSaveGroupId: payload.activeSaveGroupId ?? null,
      searchLogs: Array.isArray(payload.searchLogs)
        ? payload.searchLogs.slice(0, SEARCH_LOG_LIMIT)
        : state.searchLogs,
      dedupOverrides: payload.dedupOverrides ?? state.dedupOverrides,
      customColumns: Array.isArray(payload.customColumns) ? payload.customColumns : state.customColumns,
    };
  }

  let next = state;

  const existingGroupIds = new Set(state.libraryGroups.map((g) => g.id));
  const newGroups = payload.groups.filter((g) => !existingGroupIds.has(g.id));
  if (newGroups.length > 0) {
    next = { ...next, libraryGroups: [...next.libraryGroups, ...newGroups] };
  }

  if (payload.selectedPlatformIds.length > 0) {
    next = {
      ...next,
      selectedPlatformIds: Array.from(new Set([...next.selectedPlatformIds, ...payload.selectedPlatformIds])),
    };
  }

  const incomingLogs = payload.searchLogs ?? [];
  if (incomingLogs.length > 0) {
    const seen = new Set(next.searchLogs.map((l) => l.id));
    next = {
      ...next,
      searchLogs: [...next.searchLogs, ...incomingLogs.filter((l) => !seen.has(l.id))].slice(0, SEARCH_LOG_LIMIT),
    };
  }

  const incomingPairs = payload.dedupOverrides?.splitPairs ?? [];
  if (incomingPairs.length > 0) {
    next = {
      ...next,
      dedupOverrides: {
        splitPairs: Array.from(new Set([...next.dedupOverrides.splitPairs, ...incomingPairs])),
      },
    };
  }

  const incomingColumns = payload.customColumns ?? [];
  if (incomingColumns.length > 0) {
    const seen = new Set(next.customColumns.map((c) => c.id));
    next = { ...next, customColumns: [...next.customColumns, ...incomingColumns.filter((c) => !seen.has(c.id))] };
  }

  return importIntoLibrary(next, payload.savedPapers, null);
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'paper/toggleSaved': {
      if (state.savedPapers.some((item) => item.id === action.paper.id)) {
        return { ...state, savedPapers: state.savedPapers.filter((item) => item.id !== action.paper.id) };
      }
      const newItem: SavedPaperItem = {
        ...action.paper,
        savedAt: action.savedAt,
        researcherNotes: '',
        relevanceTag: 'alta',
        screeningStatus: 'unscreened',
        extractedMetadata: action.extractedMetadata,
        groupId: resolveTargetGroup(state, action.targetGroupId) ?? null,
      };
      return { ...state, savedPapers: [newItem, ...state.savedPapers] };
    }

    case 'paper/remove': {
      const savedPapers = state.savedPapers.filter((item) => item.id !== action.paperId);
      return savedPapers.length === state.savedPapers.length ? state : { ...state, savedPapers };
    }

    case 'paper/setScreening':
      return updatePaper(state, action.paperId, (item) => ({
        ...item,
        screeningStatus: action.status,
        exclusionReason: action.status === 'excluded' ? action.reason : undefined,
      }));

    case 'paper/setNotes':
      return updatePaper(state, action.paperId, (item) => ({ ...item, researcherNotes: action.notes }));

    case 'paper/setCustomField':
      return updatePaper(state, action.paperId, (item) => ({
        ...item,
        customFields: { ...(item.customFields || {}), [action.columnId]: action.value },
      }));

    case 'paper/setQualityAppraisal':
      return updatePaper(state, action.paperId, (item) => ({ ...item, qualityAppraisal: action.appraisal }));

    case 'paper/setRelevance':
      return updatePaper(state, action.paperId, (item) => ({ ...item, relevanceTag: action.relevanceTag }));

    case 'paper/assignGroup':
      return updatePaper(state, action.paperId, (item) => ({ ...item, groupId: action.groupId }));

    case 'paper/linkRelated':
      return linkRelatedPaper(state, action.targetId, action.sourceId);

    case 'library/import':
      return importIntoLibrary(state, action.items, action.targetGroupId);

    case 'library/clear': {
      if (!action.onlyGroupId) {
        return state.savedPapers.length === 0 ? state : { ...state, savedPapers: [] };
      }
      if (action.onlyGroupId === UNGROUPED_SLOT) {
        const validGroupIds = new Set(state.libraryGroups.map((g) => g.id));
        return {
          ...state,
          savedPapers: state.savedPapers.filter((item) => item.groupId && validGroupIds.has(item.groupId)),
        };
      }
      return {
        ...state,
        savedPapers: state.savedPapers.filter((item) => item.groupId !== action.onlyGroupId),
      };
    }

    case 'group/create':
      return { ...state, libraryGroups: [...state.libraryGroups, action.group] };

    case 'group/rename': {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        libraryGroups: state.libraryGroups.map((g) => (g.id === action.groupId ? { ...g, name } : g)),
      };
    }

    case 'group/delete':
      // Papers of the deleted group move to "Sem grupo" so no research is lost.
      return {
        ...state,
        libraryGroups: state.libraryGroups.filter((g) => g.id !== action.groupId),
        savedPapers: state.savedPapers.map((item) =>
          item.groupId === action.groupId ? { ...item, groupId: null } : item
        ),
        activeSaveGroupId: state.activeSaveGroupId === action.groupId ? null : state.activeSaveGroupId,
      };

    case 'group/setActiveSave':
      return state.activeSaveGroupId === action.groupId ? state : { ...state, activeSaveGroupId: action.groupId };

    case 'platforms/set':
      return { ...state, selectedPlatformIds: action.platformIds };

    case 'platforms/toggle':
      return {
        ...state,
        selectedPlatformIds: state.selectedPlatformIds.includes(action.platformId)
          ? state.selectedPlatformIds.filter((id) => id !== action.platformId)
          : [...state.selectedPlatformIds, action.platformId],
      };

    case 'platforms/togglePreset':
      return {
        ...state,
        selectedPlatformIds: togglePresetSelection(state.selectedPlatformIds, action.preset, action.presets),
      };

    case 'searchLog/append':
      return { ...state, searchLogs: [action.entry, ...state.searchLogs].slice(0, SEARCH_LOG_LIMIT) };

    case 'searchLog/clear':
      return state.searchLogs.length === 0 ? state : { ...state, searchLogs: [] };

    case 'dedup/splitPair':
      return state.dedupOverrides.splitPairs.includes(action.pairKey)
        ? state
        : { ...state, dedupOverrides: { splitPairs: [...state.dedupOverrides.splitPairs, action.pairKey] } };

    case 'customColumns/set':
      return { ...state, customColumns: action.columns };

    case 'backup/restore':
      return restoreWorkspaceBackup(state, action.payload, action.mode);
  }
}
