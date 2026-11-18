import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Folder, Plus, RotateCcw, X } from 'lucide-react';
import type {
  DeduplicationSummary,
  NormalizedPaper,
  SavedPaperItem,
  ScreeningStatus,
  UserAccessConfig,
} from '../types/academic';
import { CitationChaserModal } from './CitationChaserModal';
import { BlindScreeningModal } from './BlindScreeningModal';
import { calculatePrisma2020Counts } from '../utils/prismaFlow';
import { parseAbstractMetadata } from '../utils/abstractParser';
import type { CartographBackupPayload } from '../utils/workspaceBackup';
import { useI18n } from '../i18n/context';
import { useWorkspace, type BackupRestoreMode, type BackupRestoreResult } from '../state/workspace';
import { LibraryBibliometricsTab, LibraryPrismaTab } from './library/LibraryAnalysisTabs';
import { LibraryMatrix } from './library/LibraryMatrix';
import { LibrarySidebar } from './library/LibrarySidebar';
import { LibraryToolbar } from './library/LibraryToolbar';
import { QuickCaptureSheet } from './library/QuickCaptureSheet';
import {
  resolveImportTargetGroup,
  type LibrarySlotView,
  type LibrarySortMode,
  type LibrarySubTab,
} from './library/libraryShared';
import { useLibraryCardState } from './library/useLibraryCardState';

export type { LibrarySlotView } from './library/libraryShared';

/** Library data and mutations come from the workspace store; App passes search-session context. */
interface SavedLiteratureDrawerProps {
  userAccessConfig?: UserAccessConfig;
  dedupSummary?: DeduplicationSummary | null;
  sourceBreakdown?: Record<string, number>;
  /** App filters unknown portals and merges owned subscriptions into the access config. */
  onRestoreBackup: (payload: CartographBackupPayload, mode: BackupRestoreMode) => BackupRestoreResult;
}

/**
 * Library tab: owns the view selection (slot, sort, sub-tab, screening filter), the derived
 * slot data and the modals; the sidebar, toolbar, matrix and analysis tabs live in ./library.
 */
export const SavedLiteratureDrawer: React.FC<SavedLiteratureDrawerProps> = ({
  userAccessConfig,
  dedupSummary,
  sourceBreakdown,
  onRestoreBackup,
}) => {
  const { state: workspace, actions } = useWorkspace();
  const { savedPapers: items, libraryGroups: groups, customColumns, activeSaveGroupId } = workspace;
  const { language, t } = useI18n();
  const [selectedSlotView, setSelectedSlotView] = useState<LibrarySlotView>('all');
  const [savedSortBy, setSavedSortBy] = useState<LibrarySortMode>('recent');
  const [subTab, setSubTab] = useState<LibrarySubTab>('matrix');
  const [filterScreening, setFilterScreening] = useState<'all' | ScreeningStatus>('all');
  const [chaseSeedPaper, setChaseSeedPaper] = useState<NormalizedPaper | null>(null);
  const [blindScreeningOpen, setBlindScreeningOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [removedUndoItem, setRemovedUndoItem] = useState<SavedPaperItem | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const cardState = useLibraryCardState(userAccessConfig?.unpaywallEmail);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const handleRequestRemovePaper = (item: SavedPaperItem) => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    actions.removePaper(item.id);
    setRemovedUndoItem(item);
    undoTimerRef.current = window.setTimeout(() => {
      setRemovedUndoItem(null);
      undoTimerRef.current = null;
    }, 6000);
  };

  const handleUndoRemovePaper = () => {
    if (!removedUndoItem) return;
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    actions.importPapers([removedUndoItem], removedUndoItem.groupId ?? null);
    setRemovedUndoItem(null);
  };

  const savedIdSet = useMemo(() => new Set(items.map((it) => it.id)), [items]);

  // Map groupId -> groupName for CSV export and badges
  const groupNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [groups]);

  // Counts per slot
  const ungroupedCount = useMemo(
    () => items.filter((item) => !item.groupId || !groupNameMap[item.groupId]).length,
    [items, groupNameMap]
  );

  const countsByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    groups.forEach((g) => {
      map[g.id] = 0;
    });
    items.forEach((item) => {
      if (item.groupId && map[item.groupId] !== undefined) {
        map[item.groupId] += 1;
      }
    });
    return map;
  }, [items, groups]);

  // Items filtered by the currently selected slot/group in the left sidebar
  const slotItems = useMemo(() => {
    if (selectedSlotView === 'all') return items;
    if (selectedSlotView === 'ungrouped') {
      return items.filter((item) => !item.groupId || !groupNameMap[item.groupId]);
    }
    return items.filter((item) => item.groupId === selectedSlotView);
  }, [items, selectedSlotView, groupNameMap]);

  // PRISMA 2020 counts computed for the active slot/group
  const prismaCounts = useMemo(() => {
    const isAll = selectedSlotView === 'all';
    const totalIdentified = isAll ? dedupSummary?.originalCount || slotItems.length : slotItems.length;
    const duplicatesCount = isAll ? dedupSummary?.duplicatesRemoved || 0 : 0;
    return calculatePrisma2020Counts(
      slotItems,
      totalIdentified,
      duplicatesCount,
      isAll ? sourceBreakdown : undefined,
      language
    );
  }, [slotItems, selectedSlotView, dedupSummary, sourceBreakdown, language]);

  // Items further filtered by PRISMA screening status (all / included / excluded / unscreened) and sorted
  const filteredItems = useMemo(() => {
    const base =
      filterScreening === 'all'
        ? slotItems
        : slotItems.filter((item) => (item.screeningStatus || 'unscreened') === filterScreening);

    if (savedSortBy === 'recent') return base;
    return [...base].sort((a, b) => {
      if (savedSortBy === 'year') return (b.year || 0) - (a.year || 0);
      if (savedSortBy === 'citations') return (b.citationCount || 0) - (a.citationCount || 0);
      return a.title.localeCompare(b.title);
    });
  }, [slotItems, filterScreening, savedSortBy]);

  const activeGroupObj = useMemo(
    () => groups.find((g) => g.id === selectedSlotView) || null,
    [groups, selectedSlotView]
  );

  const currentSlotTitle =
    selectedSlotView === 'all'
      ? t('allLibraryPapersTitle')
      : selectedSlotView === 'ungrouped'
      ? t('ungroupedOption')
      : `${t('slotPrefix')} ${activeGroupObj?.name || t('groupFallbackName')}`;

  const captureDefaultGroupId = resolveImportTargetGroup(selectedSlotView, activeSaveGroupId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[295px_1fr] xl:grid-cols-[310px_1fr] gap-4 lg:gap-6 items-start pb-14">
      {/* Mobile Quick Slot Chips + Quick-Capture Bar (< 1024px) */}
      <div className="lg:hidden min-w-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setQuickCaptureOpen(true)}
            className="shrink-0 min-h-10 px-3.5 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('quickCaptureBtn')}</span>
          </button>

          <button
            type="button"
            aria-pressed={selectedSlotView === 'all'}
            onClick={() => setSelectedSlotView('all')}
            className={`shrink-0 min-h-10 px-3.5 py-2 rounded-full text-[13px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer border transition-colors ${
              selectedSlotView === 'all'
                ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/40 text-[var(--link-academic)] font-semibold'
                : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-secondary)]'
            }`}
          >
            <span>{t('allPapersSlot')}</span>
            <span className="text-xs font-mono tabular-nums opacity-85">{items.length}</span>
          </button>

          {groups.length > 0 && (
            <button
              type="button"
              aria-pressed={selectedSlotView === 'ungrouped'}
              onClick={() => {
                setSelectedSlotView('ungrouped');
                actions.setActiveSaveGroup(null);
              }}
              className={`shrink-0 min-h-10 px-3.5 py-2 rounded-full text-[13px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer border transition-colors ${
                selectedSlotView === 'ungrouped'
                  ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/40 text-[var(--link-academic)] font-semibold'
                  : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-secondary)]'
              }`}
            >
              <span>{t('ungroupedOption')}</span>
              <span className="text-xs font-mono tabular-nums opacity-85">{ungroupedCount}</span>
            </button>
          )}

          {groups.map((group) => {
            const isSelected = selectedSlotView === group.id;
            const count = countsByGroup[group.id] || 0;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedSlotView(group.id);
                  actions.setActiveSaveGroup(group.id);
                }}
                className={`shrink-0 min-h-10 px-3.5 py-2 rounded-full text-[13px] font-medium inline-flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/40 text-[var(--link-academic)] font-semibold'
                    : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-secondary)]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span>{group.name}</span>
                <span className="text-xs font-mono tabular-nums opacity-85">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* COLUNA ESQUERDA: GERENCIADOR DE SLOTS & GRUPOS DE PESQUISA */}
      <LibrarySidebar
        selectedSlotView={selectedSlotView}
        onSelectSlotView={setSelectedSlotView}
        savedSortBy={savedSortBy}
        onSortChange={setSavedSortBy}
        ungroupedCount={ungroupedCount}
        countsByGroup={countsByGroup}
        ownedPlatformIds={userAccessConfig?.ownedPlatformIds}
        onRestoreBackup={onRestoreBackup}
      />

      {/* COLUNA DIREITA: MATRIZ DE FICHAMENTO & FLUXO PRISMA DO SLOT SELECIONADO */}
      <div className="min-w-0 space-y-5">
        {/* Top Controls: Slot Header, Mode Switcher & Export Bar */}
        <LibraryToolbar
          slotItems={slotItems}
          selectedSlotView={selectedSlotView}
          activeGroupObj={activeGroupObj}
          currentSlotTitle={currentSlotTitle}
          groupNameMap={groupNameMap}
          customColumns={customColumns}
          subTab={subTab}
          onSubTabChange={setSubTab}
          onOpenBlindScreening={() => setBlindScreeningOpen(true)}
        />

        {/* Empty State for the Selected Slot */}
        {slotItems.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 sm:p-10 text-center space-y-3">
            <Folder className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" aria-hidden="true" />
            <h3 className="text-[17px] font-semibold text-[var(--text-primary)]">
              {selectedSlotView === 'all'
                ? t('emptySavedTitle')
                : selectedSlotView === 'ungrouped'
                ? t('emptyUngroupedTitle')
                : t('emptyGroupTitle', { name: activeGroupObj?.name ?? t('groupFallbackName') })}
            </h3>
            <p className="text-[15px] text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
              {selectedSlotView === 'all' ? t('emptySavedDesc') : t('emptySlotDesc')}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setQuickCaptureOpen(true)}
                className="min-h-11 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-sm font-semibold hover:opacity-90 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('quickCaptureBtn')}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: PRISMA 2020 FLOW DIAGRAM */}
            {subTab === 'prisma' && (
              <LibraryPrismaTab
                counts={prismaCounts}
                onSelectStatusFilter={(status) => {
                  setFilterScreening(status);
                  setSubTab('matrix');
                }}
              />
            )}

            {/* VIEW 1B: PURE-SVG BIBLIOMETRICS DASHBOARD */}
            {subTab === 'bibliometrics' && <LibraryBibliometricsTab items={slotItems} />}

            {/* VIEW 2: SYSTEMATIC SCREENING & MATRIX VIEW */}
            {subTab === 'matrix' && (
              <LibraryMatrix
                slotItemCount={slotItems.length}
                filteredItems={filteredItems}
                prismaCounts={prismaCounts}
                filterScreening={filterScreening}
                onFilterScreening={setFilterScreening}
                currentSlotTitle={currentSlotTitle}
                library={items}
                groups={groups}
                groupNameMap={groupNameMap}
                customColumns={customColumns}
                cardState={cardState}
                onChaseCitations={setChaseSeedPaper}
                onRequestRemovePaper={handleRequestRemovePaper}
              />
            )}
          </>
        )}
      </div>

      {/* Floating Undo Toast for Paper Removal */}
      {removedUndoItem && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 sm:inset-x-auto sm:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 z-40 sm:max-w-md rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-xl px-4 py-3 flex items-center justify-between gap-3"
        >
          <span className="text-[13px] font-medium truncate">
            {t('paperRemovedUndoMsg', { title: removedUndoItem.title })}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndoRemovePaper}
              className="min-h-10 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('triageUndoAction')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (undoTimerRef.current !== null) {
                  window.clearTimeout(undoTimerRef.current);
                  undoTimerRef.current = null;
                }
                setRemovedUndoItem(null);
              }}
              aria-label={t('closeModalBtn')}
              className="min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <QuickCaptureSheet
        open={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        groups={groups}
        defaultTargetGroupId={captureDefaultGroupId}
        unpaywallEmail={userAccessConfig?.unpaywallEmail}
      />

      <CitationChaserModal
        seedPaper={chaseSeedPaper}
        accessConfig={userAccessConfig}
        savedIds={savedIdSet}
        activeSaveGroupId={activeSaveGroupId}
        onToggleSave={(paper, targetGroup) => {
          if (savedIdSet.has(paper.id)) {
            actions.removePaper(paper.id);
          } else {
            actions.importPapers(
              [
                {
                  ...paper,
                  savedAt: new Date().toISOString(),
                  researcherNotes: '',
                  relevanceTag: 'alta',
                  screeningStatus: 'unscreened',
                  extractedMetadata: parseAbstractMetadata(
                    paper.title,
                    paper.abstractText,
                    paper.publicationType,
                    language
                  ),
                },
              ],
              targetGroup ?? activeSaveGroupId
            );
          }
        }}
        onClose={() => setChaseSeedPaper(null)}
      />

      <BlindScreeningModal
        isOpen={blindScreeningOpen}
        items={slotItems}
        groupName={activeGroupObj?.name}
        onUpdateScreening={actions.updateScreening}
        onClose={() => setBlindScreeningOpen(false)}
      />
    </div>
  );
};
