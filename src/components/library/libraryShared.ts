import { UNGROUPED_SLOT } from '../../state/workspace';

export const GROUP_COLORS = [
  { hex: '#01ABE8', label: 'Ciano', labelEn: 'Cyan' },
  { hex: '#AEB932', label: 'Oliva', labelEn: 'Olive' },
  { hex: '#E97635', label: 'Âmbar', labelEn: 'Amber' },
  { hex: '#DA0082', label: 'Magenta', labelEn: 'Magenta' },
  { hex: '#6366F1', label: 'Índigo', labelEn: 'Indigo' },
  { hex: '#10B981', label: 'Esmeralda', labelEn: 'Emerald' },
];

/** Library view selected in the sidebar: everything, papers without group, or one group ID. */
export type LibrarySlotView = 'all' | 'ungrouped' | string;

export type LibrarySortMode = 'recent' | 'year' | 'citations' | 'title';

export type LibrarySubTab = 'matrix' | 'prisma' | 'bibliometrics';

export interface UnpaywallLookup {
  status: 'loading' | 'found' | 'not_found';
  pdfUrl?: string;
}

/** Imports land in the group being viewed, or in the active save group from the All / Ungrouped views. */
export function resolveImportTargetGroup(
  view: LibrarySlotView,
  activeSaveGroupId: string | null
): string | null {
  return view !== 'all' && view !== UNGROUPED_SLOT ? view : activeSaveGroupId;
}

/** Header and title layout of the card-style drawers (default target, new group, backup). */
export const SAVED_CARD_DRAWER_HEADER_CLASS =
  'w-full flex items-center justify-between gap-2 cursor-pointer select-none text-left';
export const SAVED_CARD_DRAWER_TITLE_CLASS =
  'flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] min-w-0';
