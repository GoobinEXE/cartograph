import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FileSearch,
  FileText,
  Folder,
  GitBranch,
  HelpCircle,
  Link2,
  Loader2,
  Microscope,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useWorkspaceActions } from '../../state/workspace';
import type { CustomExtractionColumn, LibraryGroup, SavedPaperItem } from '../../types/academic';
import { formatAbntCitation } from '../../utils/citationExporter';
import { getScreeningReasonLabels } from '../../utils/prismaFlow';
import { sanitizeExternalUrl } from '../../utils/urlSafety';
import { ExtractedVariablesPanel, QualityAppraisalSection } from './SavedPaperPanels';
import { getExtractedMetadataForItem } from './libraryShared';
import type { LibraryCardState } from './useLibraryCardState';

interface SavedPaperCardProps {
  item: SavedPaperItem;
  /** Whole library: candidates for the preprint/published link picker. */
  library: readonly SavedPaperItem[];
  groups: LibraryGroup[];
  groupNameMap: Record<string, string>;
  customColumns: CustomExtractionColumn[];
  cardState: LibraryCardState;
  onChaseCitations: (item: SavedPaperItem) => void;
  onRequestRemovePaper?: (item: SavedPaperItem) => void;
}

/** One study of the screening matrix: metadata, PRISMA decision, citation, extraction fields and notes. */
export function SavedPaperCard({
  item,
  library,
  groups,
  groupNameMap,
  customColumns,
  cardState,
  onChaseCitations,
  onRequestRemovePaper,
}: SavedPaperCardProps) {
  const { language, t } = useI18n();
  const actions = useWorkspaceActions();

  const meta = getExtractedMetadataForItem(item, language);
  const isDetailsOpen = Boolean(cardState.expandedDetails[item.id]);
  const currentStatus = item.screeningStatus || 'unscreened';
  const itemGroup = item.groupId
    ? groups.find((g) => g.id === item.groupId)
    : null;
  const unpaywallEntry = cardState.unpaywallState[item.id];

  return (
    <div className="content-auto-card bg-[var(--bg-secondary)] rounded-2xl p-4 sm:p-5 space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {itemGroup ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--divider)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: itemGroup.color }}
                />
                <span>{itemGroup.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--divider)]">
                {t('ungroupedShort')}
              </span>
            )}

            {item.isRetracted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-600 text-white">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                <span>{t('retractedBadge')}</span>
              </span>
            )}
          </div>

          <h4 className="text-[17px] sm:text-[18px] font-medium text-[var(--link-academic)] leading-snug">
            {sanitizeExternalUrl(item.url) ? (
              <a
                href={sanitizeExternalUrl(item.url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {item.title}
              </a>
            ) : (
              <span className="text-[var(--text-primary)]">{item.title}</span>
            )}
          </h4>
          <div className="text-[13.5px] text-[var(--meta-green)] mt-1">
            {item.authors.length > 0
              ? item.authors.join(', ')
              : t('noAuthors')}
            {item.venue && <span> - {item.venue}</span>}
            {item.year && <span>, {item.year}</span>}
            <span> - {item.sourceLabel}</span>
          </div>
        </div>

        {/* Group / Slot Assignment + Priority + Remove Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
          {/* Move between Groups or to Ungrouped */}
          <div className="inline-flex items-center gap-1.5 bg-[var(--bg-canvas)] rounded-lg px-2.5 py-1 min-h-10 md:min-h-0 border border-[var(--divider)] flex-1 sm:flex-initial min-w-0">
            <Folder className="w-3.5 h-3.5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
            <select
              value={item.groupId && groupNameMap[item.groupId] ? item.groupId : ''}
              onChange={(e) =>
                actions.assignPaperGroup(
                  item.id,
                  e.target.value ? e.target.value : null
                )
              }
              aria-label={t('movePaperGroupTitle')}
              className="w-full bg-transparent text-base md:text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none"
              title={t('movePaperGroupTitle')}
            >
              <option value="">{t('ungroupedOption')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {t('slotPrefix')} {g.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={item.relevanceTag}
            onChange={(e) =>
              actions.updateRelevance(
                item.id,
                e.target.value as SavedPaperItem['relevanceTag']
              )
            }
            aria-label={t('sortByLabel')}
            className="min-h-10 md:min-h-0 bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-lg px-2.5 py-1 text-base md:text-[13px] font-medium text-[var(--text-primary)] cursor-pointer"
          >
            <option value="alta">{t('priorityHigh')}</option>
            <option value="media">{t('priorityMedium')}</option>
            <option value="revisar">{t('priorityReview')}</option>
          </select>

          <button
            type="button"
            onClick={() =>
              onRequestRemovePaper ? onRequestRemovePaper(item) : actions.removePaper(item.id)
            }
            className="min-w-10 min-h-10 md:min-w-0 md:min-h-0 p-2 md:p-1.5 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            title={t('removeTooltip')}
            aria-label={t('removeTooltip')}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Deterministic Badges: Study Design & Sample Size */}
      {(meta.studyDesign || meta.sampleSize) && (
        <div className="flex flex-wrap items-center gap-2">
          {meta.studyDesign && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 md:py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--link-academic)] border border-[var(--divider)]">
              <Microscope className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {meta.studyDesign}
            </span>
          )}
          {meta.sampleSize && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 md:py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--meta-green)] border border-[var(--divider)] tabular-nums">
              <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {meta.sampleSize}
            </span>
          )}
        </div>
      )}

      {/* Systematic Screening Action Buttons (Included / Excluded / Pending) */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--divider)]">
        <span className="text-[13px] font-semibold text-[var(--text-primary)] mr-1">
          {t('prismaDecisionLabel')}
        </span>

        <button
          type="button"
          onClick={() => actions.updateScreening(item.id, 'included')}
          aria-pressed={currentStatus === 'included'}
          className={`min-h-10 md:min-h-0 inline-flex items-center gap-1.5 px-3 md:px-2.5 py-1.5 md:py-1 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
            currentStatus === 'included'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{t('decisionInclude')}</span>
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
          className={`min-h-10 md:min-h-0 inline-flex items-center gap-1.5 px-3 md:px-2.5 py-1.5 md:py-1 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
            currentStatus === 'excluded'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)]'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{t('decisionExclude')}</span>
        </button>

        <button
          type="button"
          onClick={() => actions.updateScreening(item.id, 'unscreened')}
          aria-pressed={currentStatus === 'unscreened'}
          className={`min-h-10 md:min-h-0 inline-flex items-center gap-1.5 px-3 md:px-2.5 py-1.5 md:py-1 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
            currentStatus === 'unscreened'
              ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--divider)] shadow-xs'
              : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{t('decisionPending')}</span>
        </button>

        {/* If Excluded: Reason Selector */}
        {currentStatus === 'excluded' && (
          <select
            value={item.exclusionReason || 'populacao_inadequada'}
            onChange={(e) =>
              actions.updateScreening(item.id, 'excluded', e.target.value)
            }
            aria-label={t('triageChooseReasonTitle')}
            className="w-full sm:w-auto min-h-10 md:min-h-0 bg-[var(--bg-canvas)] border border-rose-300 dark:border-rose-900/40 rounded-lg px-2.5 py-1 text-base md:text-[13px] text-rose-700 dark:text-rose-300 cursor-pointer font-medium"
          >
            {Object.entries(getScreeningReasonLabels(language)).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Formatted ABNT Reference Preview + In-text Copy */}
      <div className="bg-[var(--bg-canvas)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-secondary)] leading-relaxed space-y-2">
        <div>
          <span className="font-semibold text-[var(--text-primary)] select-none">
            ABNT:{' '}
          </span>
          {formatAbntCitation(item)}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-[var(--divider)]">
          {(['abnt', 'apa'] as const).map((styleKey) => {
            const activeKey = `${styleKey}-${item.id}`;
            const isCopied = cardState.copiedInTextKey === activeKey;
            return (
              <button
                key={styleKey}
                type="button"
                onClick={() => cardState.copyInTextCitation(item, styleKey)}
                className="min-h-9 md:min-h-0 inline-flex items-center gap-1.5 px-2.5 py-1 md:py-0.5 rounded-md text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                {isCopied ? (
                  <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="w-3 h-3" aria-hidden="true" />
                )}
                <span>
                  {isCopied
                    ? t('inTextCopiedLabel')
                    : styleKey === 'abnt'
                    ? t('copyInTextAbnt')
                    : t('copyInTextApa')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Extracted Structured Abstract Drawer Toggle */}
      <div>
        <button
          type="button"
          onClick={() => cardState.toggleDetails(item.id)}
          aria-expanded={isDetailsOpen}
          className="min-h-10 md:min-h-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
        >
          <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {isDetailsOpen ? t('hideExtractedVars') : t('showExtractedVars')}
          </span>
        </button>

        {isDetailsOpen && <ExtractedVariablesPanel meta={meta} />}
      </div>

      {/* Custom Extraction Columns Inputs */}
      {customColumns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {customColumns.map((col) => (
            <div key={col.id}>
              <label className="block text-xs md:text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                {col.label}
              </label>
              <input
                type="text"
                value={item.customFields?.[col.id] ?? ''}
                onChange={(e) =>
                  actions.updateCustomField(item.id, col.id, e.target.value)
                }
                placeholder={col.placeholder || col.label}
                className="w-full min-h-11 md:min-h-0 px-3 md:px-2.5 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-base md:text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
            </div>
          ))}
        </div>
      )}

      {/* Quality Appraisal Checklist Drawer (RoB 2 / JBI / CASP) */}
      <QualityAppraisalSection
        item={item}
        isExpanded={Boolean(cardState.expandedQuality[item.id])}
        onToggleExpanded={() => cardState.toggleQuality(item.id)}
        onChange={(appraisal) => actions.updateQualityAppraisal(item.id, appraisal)}
      />

      {/* Researcher Notes Input */}
      <div>
        <textarea
          rows={2}
          value={item.researcherNotes}
          onChange={(e) => actions.updateNotes(item.id, e.target.value)}
          placeholder={t('notesPlaceholder')}
          aria-label={t('notesLabel')}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20 transition-all border border-[var(--divider)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--text-muted)]">
        {sanitizeExternalUrl(item.url) && (
          <a
            href={sanitizeExternalUrl(item.url)!}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-10 md:min-h-0 inline-flex items-center font-medium text-[var(--link-academic)] hover:underline"
          >
            {t('openSource')}
          </a>
        )}
        {sanitizeExternalUrl(item.pdfUrl) && (
          <a
            href={sanitizeExternalUrl(item.pdfUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-10 md:min-h-0 inline-flex items-center font-medium text-[var(--meta-green)] hover:underline"
          >
            [PDF] {t('downloadFullPdf')}
          </a>
        )}
        {!sanitizeExternalUrl(item.pdfUrl) &&
          sanitizeExternalUrl(unpaywallEntry?.pdfUrl) && (
            <a
              href={sanitizeExternalUrl(unpaywallEntry?.pdfUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-10 md:min-h-0 inline-flex items-center font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              [{t('unpaywallFoundBadge')}]
            </a>
          )}
        {!sanitizeExternalUrl(item.pdfUrl) &&
          !sanitizeExternalUrl(unpaywallEntry?.pdfUrl) &&
          item.doi && (
            <button
              type="button"
              disabled={unpaywallEntry?.status === 'loading'}
              onClick={() => cardState.findUnpaywall(item)}
              className="min-h-10 md:min-h-0 inline-flex items-center gap-1.5 font-medium text-[var(--link-academic)] hover:underline cursor-pointer disabled:opacity-50"
            >
              {unpaywallEntry?.status === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileSearch className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {unpaywallEntry?.status === 'not_found'
                  ? t('unpaywallNotFoundMsg')
                  : t('findOaPdfBtn')}
              </span>
            </button>
          )}

        <button
          type="button"
          onClick={() => onChaseCitations(item)}
          className="min-h-10 md:min-h-0 inline-flex items-center gap-1.5 font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
        >
          <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('chaseCitationsBtn')}</span>
        </button>

        <span className="tabular-nums">{t('citedByCount', { count: item.citationCount })}</span>

        {library.length > 1 && (
          <button
            type="button"
            onClick={() => cardState.toggleLinking(item, library)}
            className="min-h-10 md:min-h-0 inline-flex items-center gap-1.5 font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('linkPreprintAction')}</span>
          </button>
        )}
      </div>

      {item.relatedUrls && item.relatedUrls.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5 text-[var(--link-academic)]" aria-hidden="true" />
            {t('relatedLinksTitle')}:
          </span>
          {item.relatedUrls.map((rel, relIdx) => {
            const safeRel = sanitizeExternalUrl(rel.url);
            if (!safeRel) return null;
            return (
              <a
                key={`${safeRel}-${relIdx}`}
                href={safeRel}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 md:py-0.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--link-academic)] hover:underline"
              >
                [{rel.kind === 'preprint' ? 'Preprint' : rel.kind === 'published' ? 'Published' : 'Ref'}] {rel.label}
              </a>
            );
          })}
        </div>
      )}

      {cardState.linkingTargetId === item.id && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs">
          <select
            value={cardState.linkCandidateId}
            onChange={(e) => cardState.setLinkCandidateId(e.target.value)}
            aria-label={t('linkPreprintAction')}
            className="flex-1 min-w-[200px] min-h-10 md:min-h-0 bg-[var(--bg-subtle)] border border-[var(--divider)] rounded-lg px-2.5 py-1.5 text-base md:text-xs text-[var(--text-primary)]"
          >
            {library
              .filter((other) => other.id !== item.id)
              .map((other) => (
                <option key={other.id} value={other.id}>
                  [{other.source.toUpperCase()} {other.year ?? 's.d.'}] {other.title.slice(0, 75)}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!cardState.linkCandidateId}
            onClick={() => {
              if (cardState.linkCandidateId) {
                actions.linkRelatedPaper(item.id, cardState.linkCandidateId);
                cardState.closeLinking();
              }
            }}
            className="min-h-10 md:min-h-0 px-3 py-1.5 rounded-lg bg-[var(--link-academic)] text-white font-medium cursor-pointer disabled:opacity-50"
          >
            {t('linkPreprintAction')}
          </button>
          <button
            type="button"
            onClick={cardState.closeLinking}
            aria-label={t('cancelActionBtn')}
            className="min-w-10 min-h-10 md:min-w-0 md:min-h-0 px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
