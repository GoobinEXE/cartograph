import React, { useMemo, useState } from 'react';
import { Folder } from 'lucide-react';
import type {
  DeduplicationSummary,
  NormalizedPaper,
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
import type { LibrarySlotView, LibrarySortMode, LibrarySubTab } from './library/libraryShared';
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
  const cardState = useLibraryCardState(userAccessConfig?.unpaywallEmail);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[295px_1fr] xl:grid-cols-[310px_1fr] gap-6 items-start pb-14">
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
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-10 text-center space-y-2.5">
            <Folder className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" />
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
          </div>
        ) : (
          <>
            {/* VIEW 1: PRISMA 2020 FLOW DIAGRAM */}
            {subTab === 'prisma' && <LibraryPrismaTab counts={prismaCounts} />}

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
              />
            )}
          </>
        )}
      </div>

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
