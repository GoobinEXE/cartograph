import type { LocalizedText } from '../../i18n/localized';
import type { SupportedLanguage, Translations } from '../../i18n/translations';
import { UNGROUPED_SLOT } from '../../state/workspace';
import type { CustomExtractionColumn, SavedPaperItem } from '../../types/academic';
import { parseAbstractMetadata } from '../../utils/abstractParser';
import { getScreeningReasonLabels } from '../../utils/prismaFlow';
import { getQualityRatingLabel } from '../../utils/qualityChecklists';

/** Group swatches: the hex is stored on the group (data, not theme), the name is localized. */
export const GROUP_COLORS: ReadonlyArray<{ hex: string; label: LocalizedText }> = [
  { hex: '#01ABE8', label: { pt: 'Ciano', en: 'Cyan', es: 'Cian', fr: 'Cyan' } },
  { hex: '#AEB932', label: { pt: 'Oliva', en: 'Olive', es: 'Oliva', fr: 'Olive' } },
  { hex: '#E97635', label: { pt: 'Âmbar', en: 'Amber', es: 'Ámbar', fr: 'Ambre' } },
  { hex: '#DA0082', label: { pt: 'Magenta', en: 'Magenta', es: 'Magenta', fr: 'Magenta' } },
  { hex: '#6366F1', label: { pt: 'Índigo', en: 'Indigo', es: 'Índigo', fr: 'Indigo' } },
  { hex: '#10B981', label: { pt: 'Esmeralda', en: 'Emerald', es: 'Esmeralda', fr: 'Émeraude' } },
];

/** Library view selected in the sidebar: everything, papers without group, or one group ID. */
export type LibrarySlotView = 'all' | 'ungrouped' | string;

export type LibrarySortMode = 'recent' | 'year' | 'citations' | 'title';

export type LibrarySubTab = 'matrix' | 'prisma' | 'bibliometrics';

export type MatrixNativeFocusColumn =
  | 'studyDesign'
  | 'sampleSize'
  | 'quality'
  | 'status'
  | 'citations'
  | 'notes';

export type MatrixFocusColumnId = MatrixNativeFocusColumn | `custom:${string}`;

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

export function getExtractedMetadataForItem(
  item: SavedPaperItem,
  language: SupportedLanguage
) {
  return item.abstractText
    ? parseAbstractMetadata(item.title, item.abstractText, item.publicationType, language)
    : item.extractedMetadata ||
        parseAbstractMetadata(item.title, item.abstractText, item.publicationType, language);
}

export function getPaperAuthorYearLabel(
  item: SavedPaperItem,
  noAuthorsLabel: string
): string {
  const firstAuthor = item.authors[0]?.trim();
  const authorDisplay = firstAuthor
    ? item.authors.length > 1
      ? `${firstAuthor} et al.`
      : firstAuthor
    : noAuthorsLabel;
  const yearDisplay = item.year ?? 's.d.';
  return `${authorDisplay} · ${yearDisplay}`;
}

export interface FocusColumnDisplayValue {
  label: string;
  value: string;
  isEmpty: boolean;
  tone?: 'emerald' | 'rose' | 'amber' | 'neutral';
}

export function resolveFocusColumnDisplay(
  item: SavedPaperItem,
  focusColumn: MatrixFocusColumnId,
  customColumns: readonly CustomExtractionColumn[],
  language: SupportedLanguage,
  t: (key: keyof Translations, params?: Record<string, string | number>) => string
): FocusColumnDisplayValue {
  if (focusColumn.startsWith('custom:')) {
    const colId = focusColumn.slice('custom:'.length);
    const col = customColumns.find((c) => c.id === colId);
    const val = item.customFields?.[colId]?.trim() ?? '';
    return {
      label: col?.label ?? colId,
      value: val || t('matrixEmptyField'),
      isEmpty: val.length === 0,
    };
  }

  const meta = getExtractedMetadataForItem(item, language);
  const nativeCol = focusColumn as MatrixNativeFocusColumn;

  switch (nativeCol) {
    case 'studyDesign': {
      const val = meta.studyDesign?.trim() ?? '';
      return {
        label: t('matrixFocusStudyDesign'),
        value: val || t('matrixEmptyField'),
        isEmpty: val.length === 0,
      };
    }
    case 'sampleSize': {
      const val = meta.sampleSize?.trim() ?? '';
      return {
        label: t('matrixFocusSampleSize'),
        value: val || t('matrixEmptyField'),
        isEmpty: val.length === 0,
      };
    }
    case 'quality': {
      if (!item.qualityAppraisal) {
        return {
          label: t('matrixFocusQuality'),
          value: t('matrixEmptyField'),
          isEmpty: true,
        };
      }
      const overall = item.qualityAppraisal.overall;
      const tone =
        overall === 'low'
          ? 'emerald'
          : overall === 'high'
          ? 'rose'
          : overall === 'some_concerns'
          ? 'amber'
          : 'neutral';
      return {
        label: t('matrixFocusQuality'),
        value: `${item.qualityAppraisal.tool.toUpperCase()} · ${getQualityRatingLabel(overall, language)}`,
        isEmpty: false,
        tone,
      };
    }
    case 'status': {
      const status = item.screeningStatus || 'unscreened';
      if (status === 'included') {
        return {
          label: t('matrixFocusStatus'),
          value: t('decisionInclude'),
          isEmpty: false,
          tone: 'emerald',
        };
      }
      if (status === 'excluded') {
        const reasonLabels = getScreeningReasonLabels(language);
        const reasonKey = item.exclusionReason as keyof typeof reasonLabels | undefined;
        const reasonText = reasonKey ? reasonLabels[reasonKey] || item.exclusionReason : '';
        return {
          label: t('matrixFocusStatus'),
          value: reasonText ? `${t('decisionExclude')} · ${reasonText}` : t('decisionExclude'),
          isEmpty: false,
          tone: 'rose',
        };
      }
      return {
        label: t('matrixFocusStatus'),
        value: t('decisionPending'),
        isEmpty: false,
        tone: 'amber',
      };
    }
    case 'citations':
      return {
        label: t('matrixFocusCitations'),
        value: String(item.citationCount),
        isEmpty: false,
      };
    case 'notes': {
      const val = item.researcherNotes.trim();
      return {
        label: t('matrixFocusNotes'),
        value: val || t('matrixEmptyField'),
        isEmpty: val.length === 0,
      };
    }
  }
}

/** Header and title layout of the card-style drawers (default target, new group, backup). */
export const SAVED_CARD_DRAWER_HEADER_CLASS =
  'w-full flex items-center justify-between gap-2 cursor-pointer select-none text-left';
export const SAVED_CARD_DRAWER_TITLE_CLASS =
  'flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] min-w-0';
