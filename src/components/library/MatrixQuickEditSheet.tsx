import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Microscope,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useWorkspaceActions } from '../../state/workspace';
import type {
  CustomExtractionColumn,
  LibraryGroup,
  SavedPaperItem,
  ScreeningStatus,
} from '../../types/academic';
import { getScreeningReasonLabels } from '../../utils/prismaFlow';
import { sanitizeExternalUrl } from '../../utils/urlSafety';
import { MobileSheet } from '../ui/MobileSheet';
import { ExtractedVariablesPanel, QualityAppraisalSection } from './SavedPaperPanels';
import {
  getExtractedMetadataForItem,
  getPaperAuthorYearLabel,
  resolveFocusColumnDisplay,
  type MatrixFocusColumnId,
} from './libraryShared';

interface MatrixQuickEditSheetProps {
  open: boolean;
  onClose: () => void;
  items: SavedPaperItem[];
  currentIndex: number;
  onChangeIndex: (nextIndex: number) => void;
  focusColumn: MatrixFocusColumnId;
  customColumns: CustomExtractionColumn[];
  groups: LibraryGroup[];
  groupNameMap: Record<string, string>;
  onRequestRemovePaper?: (item: SavedPaperItem) => void;
}

/**
 * Full-height mobile bottom sheet / modal for one-handed sequential extraction across
 * studies in the active slot, spotlighting the currently focused matrix column at the top.
 */
export function MatrixQuickEditSheet({
  open,
  onClose,
  items,
  currentIndex,
  onChangeIndex,
  focusColumn,
  customColumns,
  groups,
  groupNameMap,
  onRequestRemovePaper,
}: MatrixQuickEditSheetProps) {
  const { language, t } = useI18n();
  const actions = useWorkspaceActions();
  const [qualityExpanded, setQualityExpanded] = useState(focusColumn === 'quality');
  const [abstractExpanded, setAbstractExpanded] = useState(false);

  const safeIndex = items.length > 0 ? Math.max(0, Math.min(items.length - 1, currentIndex)) : 0;
  const item = items[safeIndex] ?? null;

  useEffect(() => {
    if (open) {
      setQualityExpanded(focusColumn === 'quality');
    }
  }, [open, focusColumn]);

  useEffect(() => {
    if (!open || items.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' && safeIndex > 0) {
        event.preventDefault();
        onChangeIndex(safeIndex - 1);
      } else if (event.key === 'ArrowRight' && safeIndex < items.length - 1) {
        event.preventDefault();
        onChangeIndex(safeIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, items.length, safeIndex, onChangeIndex]);

  if (!item) {
    return null;
  }

  const meta = getExtractedMetadataForItem(item, language);
  const currentStatus: ScreeningStatus = item.screeningStatus || 'unscreened';
  const focusDisplay = resolveFocusColumnDisplay(item, focusColumn, customColumns, language, t);
  const spotlightCustomColId = focusColumn.startsWith('custom:')
    ? focusColumn.slice('custom:'.length)
    : null;
  const spotlightCustomCol = spotlightCustomColId
    ? customColumns.find((c) => c.id === spotlightCustomColId) ?? null
    : null;
  const remainingCustomColumns = spotlightCustomCol
    ? customColumns.filter((c) => c.id !== spotlightCustomCol.id)
    : customColumns;

  const safeArticleUrl = sanitizeExternalUrl(item.url);
  const safePdfUrl = sanitizeExternalUrl(item.pdfUrl);

  const renderScreeningButtons = () => (
    <div className="space-y-2.5">
      <span className="block text-xs font-semibold text-[var(--text-secondary)]">
        {t('prismaDecisionLabel')}
      </span>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => actions.updateScreening(item.id, 'included')}
          aria-pressed={currentStatus === 'included'}
          className={`min-h-11 px-2.5 py-2 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors border ${
            currentStatus === 'included'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--divider)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('decisionInclude')}</span>
        </button>

        <button
          type="button"
          onClick={() =>
            actions.updateScreening(
              item.id,
              'excluded',
              item.exclusionReason || 'populacao_inadequada'
            )
          }
          aria-pressed={currentStatus === 'excluded'}
          className={`min-h-11 px-2.5 py-2 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors border ${
            currentStatus === 'excluded'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--divider)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('decisionExclude')}</span>
        </button>

        <button
          type="button"
          onClick={() => actions.updateScreening(item.id, 'unscreened')}
          aria-pressed={currentStatus === 'unscreened'}
          className={`min-h-11 px-2.5 py-2 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors border ${
            currentStatus === 'unscreened'
              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] border-[var(--btn-primary-bg)] shadow-xs'
              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--divider)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('decisionPending')}</span>
        </button>
      </div>

      {currentStatus === 'excluded' && (
        <select
          value={item.exclusionReason || 'populacao_inadequada'}
          onChange={(e) => actions.updateScreening(item.id, 'excluded', e.target.value)}
          aria-label={t('triageChooseReasonTitle')}
          className="w-full min-h-11 px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-rose-300 dark:border-rose-900/40 text-base md:text-[13px] font-medium text-rose-700 dark:text-rose-300 cursor-pointer"
        >
          {Object.entries(getScreeningReasonLabels(language)).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const renderNotesEditor = (rows: number) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[var(--text-secondary)]">
        {t('matrixFocusNotes')}
      </label>
      <textarea
        rows={rows}
        value={item.researcherNotes}
        onChange={(e) => actions.updateNotes(item.id, e.target.value)}
        placeholder={t('notesPlaceholder')}
        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-base leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
      />
    </div>
  );

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      initialSnap="full"
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-2xl"
      title={t('matrixQuickEditTitle')}
      subtitle={item.title}
    >
      <div className="space-y-4 pb-2">
        {/* Sticky 1-handed Study Stepper */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 -mt-3 px-4 sm:px-6 py-2.5 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--divider)] flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={safeIndex <= 0}
            onClick={() => onChangeIndex(Math.max(0, safeIndex - 1))}
            className="min-h-11 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13px] font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:bg-[var(--bg-subtle)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('matrixPrevStudyBtn')}</span>
          </button>

          <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums text-center px-1">
            {t('matrixStudyProgress', { current: safeIndex + 1, total: items.length })}
          </span>

          <button
            type="button"
            disabled={safeIndex >= items.length - 1}
            onClick={() => onChangeIndex(Math.min(items.length - 1, safeIndex + 1))}
            className="min-h-11 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13px] font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:bg-[var(--bg-subtle)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{t('matrixNextStudyBtn')}</span>
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>

        {/* Study Header Metadata */}
        <div className="space-y-2">
          <div className="text-[13px] text-[var(--meta-green)] font-medium">
            {getPaperAuthorYearLabel(item, t('noAuthors'))}
            {item.venue ? ` · ${item.venue}` : ''}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {safeArticleUrl && (
              <a
                href={safeArticleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-9 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs font-medium text-[var(--link-academic)] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t('openSource')}</span>
              </a>
            )}
            {safePdfUrl && (
              <a
                href={safePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-9 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs font-medium text-[var(--meta-green)] hover:underline"
              >
                <span>[PDF] {t('downloadFullPdf')}</span>
              </a>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs text-[var(--text-secondary)] tabular-nums">
              {t('citedByCount', { count: item.citationCount })}
            </span>
          </div>
        </div>

        {/* Spotlight Card for the Currently Focused Column */}
        <div className="rounded-2xl p-4 bg-[var(--accent-blue-tint)]/60 border border-[var(--link-academic)]/25 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--link-academic)]">
              {t('matrixFocusColumnLabel')} {focusDisplay.label}
            </span>
          </div>

          {spotlightCustomCol && (
            <input
              type="text"
              value={item.customFields?.[spotlightCustomCol.id] ?? ''}
              onChange={(e) =>
                actions.updateCustomField(item.id, spotlightCustomCol.id, e.target.value)
              }
              placeholder={spotlightCustomCol.placeholder || spotlightCustomCol.label}
              aria-label={spotlightCustomCol.label}
              className="w-full min-h-11 px-3.5 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          )}

          {focusColumn === 'notes' && renderNotesEditor(4)}

          {focusColumn === 'status' && renderScreeningButtons()}

          {focusColumn === 'quality' && (
            <QualityAppraisalSection
              item={item}
              isExpanded={qualityExpanded}
              onToggleExpanded={() => setQualityExpanded((prev) => !prev)}
              onChange={(appraisal) => actions.updateQualityAppraisal(item.id, appraisal)}
            />
          )}

          {(focusColumn === 'studyDesign' ||
            focusColumn === 'sampleSize' ||
            focusColumn === 'citations') && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                  {focusColumn === 'studyDesign' && (
                    <Microscope className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                  )}
                  {focusColumn === 'sampleSize' && (
                    <Users className="w-4 h-4 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
                  )}
                  <span>{focusDisplay.value}</span>
                </span>
                {focusColumn === 'studyDesign' && meta.sampleSize && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs text-[var(--meta-green)] tabular-nums">
                    {meta.sampleSize}
                  </span>
                )}
                {focusColumn === 'sampleSize' && meta.studyDesign && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs text-[var(--link-academic)]">
                    {meta.studyDesign}
                  </span>
                )}
              </div>
              <ExtractedVariablesPanel meta={meta} />
            </div>
          )}
        </div>

        {/* PRISMA Screening Status (when not already in spotlight) */}
        {focusColumn !== 'status' && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--divider)]">
            {renderScreeningButtons()}
          </div>
        )}

        {/* Custom Extraction Columns */}
        {remainingCustomColumns.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--divider)] space-y-3">
            {remainingCustomColumns.map((col) => (
              <div key={col.id} className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  {col.label}
                </label>
                <input
                  type="text"
                  value={item.customFields?.[col.id] ?? ''}
                  onChange={(e) => actions.updateCustomField(item.id, col.id, e.target.value)}
                  placeholder={col.placeholder || col.label}
                  className="w-full min-h-11 px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-base text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
              </div>
            ))}
          </div>
        )}

        {/* Researcher Notes (when not already in spotlight) */}
        {focusColumn !== 'notes' && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--divider)]">
            {renderNotesEditor(3)}
          </div>
        )}

        {/* Risk of Bias / Quality Checklist (when not already in spotlight) */}
        {focusColumn !== 'quality' && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--divider)]">
            <QualityAppraisalSection
              item={item}
              isExpanded={qualityExpanded}
              onToggleExpanded={() => setQualityExpanded((prev) => !prev)}
              onChange={(appraisal) => actions.updateQualityAppraisal(item.id, appraisal)}
            />
          </div>
        )}

        {/* Extracted Structured Abstract Context (collapsible when not in spotlight) */}
        {focusColumn !== 'studyDesign' &&
          focusColumn !== 'sampleSize' &&
          focusColumn !== 'citations' && (
            <div>
              <button
                type="button"
                onClick={() => setAbstractExpanded((prev) => !prev)}
                aria-expanded={abstractExpanded}
                className="min-h-10 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
              >
                {abstractExpanded ? t('hideExtractedVars') : t('showExtractedVars')}
              </button>
              {abstractExpanded && <ExtractedVariablesPanel meta={meta} />}
            </div>
          )}

        {/* Group, Priority & Remove Controls */}
        <div className="pt-2 border-t border-[var(--divider)] flex flex-wrap items-center gap-2">
          <select
            value={item.groupId && groupNameMap[item.groupId] ? item.groupId : ''}
            onChange={(e) =>
              actions.assignPaperGroup(item.id, e.target.value ? e.target.value : null)
            }
            aria-label={t('movePaperGroupTitle')}
            className="flex-1 min-w-[140px] min-h-11 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-[13px] font-medium text-[var(--text-primary)] cursor-pointer"
          >
            <option value="">{t('ungroupedOption')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {t('slotPrefix')} {g.name}
              </option>
            ))}
          </select>

          <select
            value={item.relevanceTag}
            onChange={(e) =>
              actions.updateRelevance(
                item.id,
                e.target.value as SavedPaperItem['relevanceTag']
              )
            }
            aria-label={t('sortByLabel')}
            className="min-h-11 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-[13px] font-medium text-[var(--text-primary)] cursor-pointer"
          >
            <option value="alta">{t('priorityHigh')}</option>
            <option value="media">{t('priorityMedium')}</option>
            <option value="revisar">{t('priorityReview')}</option>
          </select>

          <button
            type="button"
            onClick={() => {
              const targetItem = item;
              if (items.length <= 1) {
                onClose();
              } else if (safeIndex >= items.length - 1) {
                onChangeIndex(Math.max(0, safeIndex - 1));
              }
              if (onRequestRemovePaper) {
                onRequestRemovePaper(targetItem);
              } else {
                actions.removePaper(targetItem.id);
              }
            }}
            className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
            title={t('removeTooltip')}
            aria-label={t('removeTooltip')}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}
