import type {
  CustomExtractionColumn,
  DedupOverrideRule,
  LibraryGroup,
  SavedPaperItem,
  SearchLogEntry,
} from '../../types/academic';

/**
 * Research-library state owned by the workspace store. Every slice maps 1:1 to a key of
 * WORKSPACE_STORAGE_KEYS, which is how workspacePersistence knows what to write.
 */
export interface WorkspaceState {
  savedPapers: SavedPaperItem[];
  libraryGroups: LibraryGroup[];
  activeSaveGroupId: string | null;
  selectedPlatformIds: string[];
  searchLogs: SearchLogEntry[];
  dedupOverrides: DedupOverrideRule;
  customColumns: CustomExtractionColumn[];
}

/** Portals selected on first run and whenever the stored selection is empty. */
export const DEFAULT_SELECTED_PLATFORM_IDS: readonly string[] = [
  'scholar',
  'openalex',
  'semanticscholar',
  'pubmed',
  'scielo',
  'consensus',
];

/** PRISMA-S search log entries kept, newest first. */
export const SEARCH_LOG_LIMIT = 100;

/** Library view that lists papers without a valid group ("Sem grupo"). */
export const UNGROUPED_SLOT = 'ungrouped';

export function createInitialWorkspaceState(): WorkspaceState {
  return {
    savedPapers: [],
    libraryGroups: [],
    activeSaveGroupId: null,
    selectedPlatformIds: [...DEFAULT_SELECTED_PLATFORM_IDS],
    searchLogs: [],
    dedupOverrides: { splitPairs: [] },
    customColumns: [],
  };
}
