import { useEffect, useMemo, useState } from 'react';
import { Columns3, Filter, LayoutList, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import type {
  CustomExtractionColumn,
  LibraryGroup,
  LibraryMatrixMobileMode,
  Prisma2020Counts,
  SavedPaperItem,
  ScreeningStatus,
} from '../../types/academic';
import { LAYOUT_STORAGE_KEYS } from '../../utils/layoutPreferences';
import { MatrixQuickEditSheet } from './MatrixQuickEditSheet';
import { SavedPaperCard } from './SavedPaperCard';
import {
  getPaperAuthorYearLabel,
  resolveFocusColumnDisplay,
  type MatrixFocusColumnId,
} from './libraryShared';
import type { LibraryCardState } from './useLibraryCardState';

interface LibraryMatrixProps {
  slotItemCount: number;
  filteredItems: SavedPaperItem[];
  prismaCounts: Prisma2020Counts;
  filterScreening: 'all' | ScreeningStatus;
  onFilterScreening: (filter: 'all' | ScreeningStatus) => void;
  currentSlotTitle: string;
  library: SavedPaperItem[];
  groups: LibraryGroup[];
  groupNameMap: Record<string, string>;
  customColumns: CustomExtractionColumn[];
  cardState: LibraryCardState;
  onChaseCitations: (item: SavedPaperItem) => void;
  onRequestRemovePaper?: (item: SavedPaperItem) => void;
}

function readStoredMobileMode(): LibraryMatrixMobileMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const val = window.localStorage.getItem(LAYOUT_STORAGE_KEYS.mobileMatrixViewMode);
    return val === 'compare' ? 'compare' : 'cards';
  } catch {
    return 'cards';
  }
}

function readStoredFocusColumn(): MatrixFocusColumnId {
  if (typeof window === 'undefined') return 'studyDesign';
  try {
    const val = window.localStorage.getItem(LAYOUT_STORAGE_KEYS.mobileMatrixFocusColumn);
    if (!val) return 'studyDesign';
    if (
      val === 'studyDesign' ||
      val === 'sampleSize' ||
      val === 'quality' ||
      val === 'status' ||
      val === 'citations' ||
      val === 'notes' ||
      val.startsWith('custom:')
    ) {
      return val as MatrixFocusColumnId;
    }
    return 'studyDesign';
  } catch {
    return 'studyDesign';
  }
}

/** Screening view: PRISMA status filter ribbon, mobile Focus Comparator, and extraction cards. */
export function LibraryMatrix({
  slotItemCount,
  filteredItems,
  prismaCounts,
  filterScreening,
  onFilterScreening,
  currentSlotTitle,
  library,
  groups,
  groupNameMap,
  customColumns,
  cardState,
  onChaseCitations,
  onRequestRemovePaper,
}: LibraryMatrixProps) {
  const { language, t } = useI18n();
  const [mobileMode, setMobileMode] = useState<LibraryMatrixMobileMode>(readStoredMobileMode);
  const [focusColumn, setFocusColumn] = useState<MatrixFocusColumnId>(readStoredFocusColumn);
  const [quickEditIndex, setQuickEditIndex] = useState<number | null>(null);

  const focusColumns = useMemo<Array<{ id: MatrixFocusColumnId; label: string }>>(() => {
    const nativeCols: Array<{ id: MatrixFocusColumnId; label: string }> = [
      { id: 'studyDesign', label: t('matrixFocusStudyDesign') },
      { id: 'sampleSize', label: t('matrixFocusSampleSize') },
      { id: 'quality', label: t('matrixFocusQuality') },
      { id: 'status', label: t('matrixFocusStatus') },
      { id: 'citations', label: t('matrixFocusCitations') },
      { id: 'notes', label: t('matrixFocusNotes') },
    ];
    const customCols = customColumns.map((col) => ({
      id: `custom:${col.id}` as MatrixFocusColumnId,
      label: col.label,
    }));
    return [...nativeCols, ...customCols];
  }, [t, customColumns]);

  const effectiveFocusColumn: MatrixFocusColumnId = useMemo(() => {
    if (focusColumns.some((col) => col.id === focusColumn)) {
      return focusColumn;
    }
    return 'studyDesign';
  }, [focusColumns, focusColumn]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEYS.mobileMatrixViewMode, mobileMode);
    } catch {
      // ignore storage errors
    }
  }, [mobileMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEYS.mobileMatrixFocusColumn, effectiveFocusColumn);
    } catch {
      // ignore storage errors
    }
  }, [effectiveFocusColumn]);

  useEffect(() => {
    if (quickEditIndex !== null && filteredItems.length === 0) {
      setQuickEditIndex(null);
    } else if (quickEditIndex !== null && quickEditIndex >= filteredItems.length) {
      setQuickEditIndex(filteredItems.length - 1);
    }
  }, [quickEditIndex, filteredItems.length]);

  return (
    <div className="space-y-4">
      {/* Screening Status Quick Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl text-[13px]">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Filter className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-[var(--text-primary)]">
            {t('systematicScreeningLabel', { title: currentSlotTitle })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: t('filterAllCount', { count: slotItemCount }) },
              {
                id: 'included',
                label: t('filterIncludedCount', { count: prismaCounts.includedStudies }),
              },
              {
                id: 'excluded',
                label: t('filterExcludedCount', {
                  count: prismaCounts.excludedScreening,
                }),
              },
              {
                id: 'unscreened',
                label: t('filterPendingCount', {
                  count: Math.max(
                    0,
                    slotItemCount -
                      prismaCounts.includedStudies -
                      prismaCounts.excludedScreening
                  ),
                }),
              },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterScreening(f.id)}
              aria-pressed={filterScreening === f.id}
              className={`min-h-10 md:min-h-0 px-3 md:px-2.5 py-1.5 md:py-1 rounded-lg md:rounded-md text-[13px] font-medium cursor-pointer transition-colors tabular-nums ${
                filterScreening === f.id
                  ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Cards <-> Focus Comparator Mode Switcher (< 768px) */}
      <div className="md:hidden">
        <div
          role="group"
          aria-label={t('matrixFocusColumnLabel')}
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)]"
        >
          <button
            type="button"
            aria-pressed={mobileMode === 'cards'}
            onClick={() => setMobileMode('cards')}
            className={`min-h-11 px-3 py-2 rounded-lg text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              mobileMode === 'cards'
                ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutList className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('matrixModeCards')}</span>
          </button>

          <button
            type="button"
            aria-pressed={mobileMode === 'compare'}
            onClick={() => setMobileMode('compare')}
            className={`min-h-11 px-3 py-2 rounded-lg text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              mobileMode === 'compare'
                ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Columns3 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('matrixModeCompare')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Focus Matrix Comparator View (< 768px when mobileMode === 'compare') */}
      {mobileMode === 'compare' && (
        <div className="md:hidden space-y-3">
          <div className="sticky top-0 sm:static z-20 -mx-1 px-1 py-2 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--divider)] space-y-1.5">
            <span className="block px-1 text-[11.5px] font-semibold text-[var(--text-muted)]">
              {t('matrixFocusColumnLabel')}
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {focusColumns.map((col) => {
                const isSelected = effectiveFocusColumn === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setFocusColumn(col.id)}
                    className={`shrink-0 min-h-10 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] border-[var(--btn-primary-bg)] shadow-xs'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--divider)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredItems.map((item, idx) => {
              const status = item.screeningStatus || 'unscreened';
              const display = resolveFocusColumnDisplay(
                item,
                effectiveFocusColumn,
                customColumns,
                language,
                t
              );
              const toneClass =
                display.tone === 'emerald'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : display.tone === 'rose'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  : display.tone === 'amber'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-primary)] border-[var(--divider)]';

              return (
                <div
                  key={item.id}
                  onClick={() => setQuickEditIndex(idx)}
                  className="content-auto-card relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-[var(--divider)] min-h-[92px] pl-3.5 pr-3 py-3 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1 ${
                      status === 'included'
                        ? 'bg-emerald-600'
                        : status === 'excluded'
                        ? 'bg-rose-600'
                        : 'bg-amber-500'
                    }`}
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h4 className="text-[14.5px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="text-xs text-[var(--text-secondary)] truncate tabular-nums">
                      {getPaperAuthorYearLabel(item, t('noAuthors'))} ·{' '}
                      {t('citedByCount', { count: item.citationCount })}
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-lg border text-xs font-medium leading-tight ${
                          display.isEmpty
                            ? 'bg-[var(--bg-canvas)] border-[var(--divider)] text-[var(--text-muted)] italic'
                            : toneClass
                        }`}
                      >
                        <span className="truncate tabular-nums">{display.value}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickEditIndex(idx);
                    }}
                    className="shrink-0 min-h-10 px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-semibold text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('matrixQuickEditBtn')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards List (always visible on >= md; on mobile visible when mobileMode === 'cards') */}
      <div className={mobileMode === 'cards' ? 'space-y-4' : 'hidden md:block space-y-4'}>
        {filteredItems.map((item) => (
          <SavedPaperCard
            key={item.id}
            item={item}
            library={library}
            groups={groups}
            groupNameMap={groupNameMap}
            customColumns={customColumns}
            cardState={cardState}
            onChaseCitations={onChaseCitations}
            onRequestRemovePaper={onRequestRemovePaper}
          />
        ))}
      </div>

      <MatrixQuickEditSheet
        open={quickEditIndex !== null}
        onClose={() => setQuickEditIndex(null)}
        items={filteredItems}
        currentIndex={quickEditIndex ?? 0}
        onChangeIndex={setQuickEditIndex}
        focusColumn={effectiveFocusColumn}
        customColumns={customColumns}
        groups={groups}
        groupNameMap={groupNameMap}
        onRequestRemovePaper={onRequestRemovePaper}
      />
    </div>
  );
}
