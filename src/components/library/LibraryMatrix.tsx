import { Filter } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import type {
  CustomExtractionColumn,
  LibraryGroup,
  Prisma2020Counts,
  SavedPaperItem,
  ScreeningStatus,
} from '../../types/academic';
import { SavedPaperCard } from './SavedPaperCard';
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
}

/** Screening view: PRISMA status filter ribbon above the extraction cards of the current slot. */
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
}: LibraryMatrixProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Screening Status Quick Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl text-[13px]">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Filter className="w-4 h-4" />
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
              className={`px-2.5 py-1 rounded-md text-[13px] font-medium cursor-pointer transition-colors ${
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

      {/* Cards List */}
      <div className="space-y-4">
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
          />
        ))}
      </div>
    </div>
  );
}
