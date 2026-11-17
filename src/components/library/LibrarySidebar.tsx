import { Pin } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  useWorkspace,
  type BackupRestoreMode,
  type BackupRestoreResult,
} from '../../state/workspace';
import { LAYOUT_STORAGE_KEYS } from '../../utils/layoutPreferences';
import type { CartographBackupPayload } from '../../utils/workspaceBackup';
import { CollapsibleSection, SidebarDrawersHeader } from '../ui/CollapsibleSection';
import { usePersistedDrawers } from '../ui/usePersistedDrawers';
import { LibraryBackupSection } from './LibraryBackupSection';
import { LibrarySlotsSection } from './LibrarySlotsSection';
import { NewGroupSection } from './NewGroupSection';
import {
  SAVED_CARD_DRAWER_HEADER_CLASS,
  SAVED_CARD_DRAWER_TITLE_CLASS,
  type LibrarySlotView,
  type LibrarySortMode,
} from './libraryShared';

interface LibrarySidebarProps {
  selectedSlotView: LibrarySlotView;
  onSelectSlotView: (view: LibrarySlotView) => void;
  savedSortBy: LibrarySortMode;
  onSortChange: (mode: LibrarySortMode) => void;
  ungroupedCount: number;
  countsByGroup: Record<string, number>;
  ownedPlatformIds?: string[];
  onRestoreBackup: (payload: CartographBackupPayload, mode: BackupRestoreMode) => BackupRestoreResult;
}

/** Left column of the library: sort order, slot navigation, save target, group creation, backup. */
export function LibrarySidebar({
  selectedSlotView,
  onSelectSlotView,
  savedSortBy,
  onSortChange,
  ungroupedCount,
  countsByGroup,
  ownedPlatformIds,
  onRestoreBackup,
}: LibrarySidebarProps) {
  const { t } = useI18n();
  const { state: workspace, actions } = useWorkspace();
  const { savedPapers: items, libraryGroups: groups, activeSaveGroupId } = workspace;
  const {
    drawers: sidebarDrawers,
    allDrawersOpen,
    toggleDrawer: toggleSidebarDrawer,
    toggleAllDrawers: toggleAllSidebarDrawers,
  } = usePersistedDrawers(LAYOUT_STORAGE_KEYS.savedSidebarDrawers, {
    sort: true,
    slots: true,
    defaultTarget: true,
    // First run only: offer group creation to a library without groups.
    newGroup: groups.length === 0,
    backup: false,
  });

  return (
    <aside
      className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pr-2 pb-8 select-none"
      aria-label={t('savedSidebarAria')}
    >
      <SidebarDrawersHeader allOpen={allDrawersOpen} onToggleAll={toggleAllSidebarDrawers} />

      {/* 1. Sort Controls (Primary ordering control — top priority) */}
      <CollapsibleSection
        isOpen={sidebarDrawers.sort}
        onToggle={() => toggleSidebarDrawer('sort')}
        className="border-b border-[var(--divider)] pb-3"
        headerClassName="w-full flex items-center justify-between py-1.5 px-2 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] select-none text-left"
        contentClassName="space-y-0.5 text-[13.5px]"
        title={
          <>
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              {t('sortByLabel')}
            </span>
            {savedSortBy !== 'recent' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                {savedSortBy === 'year'
                  ? t('sortShortYear')
                  : savedSortBy === 'citations'
                  ? t('sortShortCitations')
                  : t('savedSortShortTitle')}
              </span>
            )}
          </>
        }
        actions={
          savedSortBy !== 'recent' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSortChange('recent');
              }}
              className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
            >
              {t('clearFilter')}
            </button>
          )
        }
      >
        {(['recent', 'year', 'citations', 'title'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSortChange(mode)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              savedSortBy === mode
                ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {mode === 'recent' && t('savedSortRecent')}
            {mode === 'year' && t('savedSortYear')}
            {mode === 'citations' && t('savedSortCitations')}
            {mode === 'title' && t('savedSortTitle')}
          </button>
        ))}
      </CollapsibleSection>

      {/* 2. Lista de Visões e Slots da Biblioteca (Primary navigation) */}
      <LibrarySlotsSection
        isOpen={sidebarDrawers.slots}
        onToggle={() => toggleSidebarDrawer('slots')}
        totalCount={items.length}
        ungroupedCount={ungroupedCount}
        countsByGroup={countsByGroup}
        groups={groups}
        activeSaveGroupId={activeSaveGroupId}
        selectedSlotView={selectedSlotView}
        onSelectSlotView={onSelectSlotView}
      />

      {/* 3. Seletor do Slot Ativo para Novos Salvamentos */}
      <CollapsibleSection
        isOpen={sidebarDrawers.defaultTarget}
        onToggle={() => toggleSidebarDrawer('defaultTarget')}
        className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-2.5"
        headerClassName={SAVED_CARD_DRAWER_HEADER_CLASS}
        titleClassName={SAVED_CARD_DRAWER_TITLE_CLASS}
        contentClassName="space-y-2"
        title={
          <>
            <Pin className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
            <span className="truncate">{t('defaultSaveTargetTitle')}</span>
          </>
        }
      >
        <select
          value={activeSaveGroupId ?? ''}
          onChange={(e) => actions.setActiveSaveGroup(e.target.value ? e.target.value : null)}
          className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
        >
          <option value="">{t('ungroupedOption')}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {t('slotPrefix')} {g.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--text-muted)] leading-snug">
          {t('defaultSaveTargetDescPrefix')}{' '}
          <em>{t('tabFederated', { count: 0 }).replace(/\s*\(\d+\)\s*$/, '')}</em>{' '}
          {t('defaultSaveTargetDescSuffix')}
        </p>
      </CollapsibleSection>

      {/* 4. Criar Novo Slot / Grupo de Pesquisa (Secondary creation action) */}
      <NewGroupSection
        isOpen={sidebarDrawers.newGroup}
        onToggle={() => toggleSidebarDrawer('newGroup')}
        onCreated={onSelectSlotView}
      />

      {/* 5. Backup & Importação (.bib / .ris / .json — Utility maintenance) */}
      <LibraryBackupSection
        isOpen={sidebarDrawers.backup}
        onToggle={() => toggleSidebarDrawer('backup')}
        selectedSlotView={selectedSlotView}
        ownedPlatformIds={ownedPlatformIds}
        onRestoreBackup={onRestoreBackup}
      />
    </aside>
  );
}
