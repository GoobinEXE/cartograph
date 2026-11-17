export {
  WorkspaceProvider,
  useWorkspace,
  useWorkspaceActions,
  type WorkspaceHandle,
} from './WorkspaceProvider';
export {
  DEFAULT_GROUP_COLOR,
  type BackupRestoreResult,
  type LibraryImportResult,
  type WorkspaceActions,
} from './workspaceActions';
export type { BackupRestoreMode, PlatformPreset, WorkspaceAction } from './workspaceReducer';
export {
  DEFAULT_SELECTED_PLATFORM_IDS,
  SEARCH_LOG_LIMIT,
  UNGROUPED_SLOT,
  type WorkspaceState,
} from './workspaceState';
