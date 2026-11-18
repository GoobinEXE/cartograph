import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  ExternalLink,
  FileSearch,
  Folder,
  GitBranch,
  GitMerge,
  Loader2,
  Share2,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  InstitutionalProxyConfig,
  LibraryGroup,
  MergeClusterEntry,
  NormalizedPaper,
} from '../../types/academic';
import {
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
} from '../../utils/citationExporter';
import { copyTextSafely, shareTextSafely } from '../../utils/fileDownload';
import { buildDoiProxyUrl } from '../../utils/institutionalProxy';
import { sanitizeExternalUrl } from '../../utils/urlSafety';
import { MobileSheet } from '../ui/MobileSheet';

export interface PaperUnpaywallEntry {
  status: 'loading' | 'found' | 'not_found';
  pdfUrl?: string;
}

export interface PaperActionSheetProps {
  paper: NormalizedPaper | null;
  onClose: () => void;
  isSaved: boolean;
  groups: LibraryGroup[];
  assignedGroupId: string | null;
  activeSaveGroupId: string | null;
  onToggleSave: (paper: NormalizedPaper, targetGroupId?: string | null) => void;
  onAssignGroup: (paperId: string, groupId: string | null) => void;
  onOpenCitationChaser: (paper: NormalizedPaper) => void;
  dedupEnabled: boolean;
  mergeCluster: MergeClusterEntry | null;
  onOpenMergeInspector: (clusterId: string) => void;
  unpaywallEntry?: PaperUnpaywallEntry;
  onFindUnpaywallPdf: (paper: NormalizedPaper) => void;
  institutionalProxy?: InstitutionalProxyConfig;
}

/**
 * Progressive-disclosure action sheet for search result cards: group assignment,
 * ABNT/APA/BibTeX copy, native sharing, citation chasing, merge inspection, and OA/DOI links.
 */
export const PaperActionSheet: React.FC<PaperActionSheetProps> = ({
  paper,
  onClose,
  isSaved,
  groups,
  assignedGroupId,
  activeSaveGroupId,
  onToggleSave,
  onAssignGroup,
  onOpenCitationChaser,
  dedupEnabled,
  mergeCluster,
  onOpenMergeInspector,
  unpaywallEntry,
  onFindUnpaywallPdf,
  institutionalProxy,
}) => {
  const { t } = useI18n();
  const [copiedFormat, setCopiedFormat] = useState<'abnt' | 'apa' | 'bibtex' | null>(null);
  const [shareFeedback, setShareFeedback] = useState<'shared' | 'copied' | null>(null);

  useEffect(() => {
    setCopiedFormat(null);
    setShareFeedback(null);
  }, [paper?.id]);

  const safePaperUrl = paper ? sanitizeExternalUrl(paper.url) : null;
  const safePdfUrl = paper ? sanitizeExternalUrl(paper.pdfUrl) : null;
  const resolvedUnpaywallUrl = sanitizeExternalUrl(unpaywallEntry?.pdfUrl);
  const safeProxyDoiUrl =
    paper && institutionalProxy
      ? sanitizeExternalUrl(buildDoiProxyUrl(paper.doi, institutionalProxy))
      : null;

  const cleanDoi = paper?.doi
    ? paper.doi
        .trim()
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .replace(/^doi:\s*/i, '')
    : null;
  const safeDoiUrl = cleanDoi ? sanitizeExternalUrl(`https://doi.org/${cleanDoi}`) : null;

  const handleCopyCitation = async (format: 'abnt' | 'apa' | 'bibtex') => {
    if (!paper) return;
    const text =
      format === 'abnt'
        ? formatAbntCitation(paper)
        : format === 'apa'
        ? formatApaCitation(paper)
        : formatBibtexEntry(paper);
    const ok = await copyTextSafely(text);
    if (ok) {
      setCopiedFormat(format);
      window.setTimeout(() => setCopiedFormat((prev) => (prev === format ? null : prev)), 2000);
    }
  };

  const handleSharePaper = async () => {
    if (!paper) return;
    const authorsSummary = paper.authors.length > 0 ? paper.authors.slice(0, 3).join(', ') : '';
    const yearSuffix = paper.year ? ` (${paper.year})` : '';
    const shareText = `${paper.title}${authorsSummary ? ` — ${authorsSummary}` : ''}${yearSuffix}`;
    const shareUrl = safePaperUrl || safeDoiUrl || safePdfUrl || undefined;
    const result = await shareTextSafely(paper.title, shareText, shareUrl);
    if (result === 'shared' || result === 'copied') {
      setShareFeedback(result);
      window.setTimeout(() => setShareFeedback(null), 2200);
    }
  };

  const handleGroupSelectChange = (nextValue: string) => {
    if (!paper) return;
    const nextGroupId = nextValue ? nextValue : null;
    if (isSaved) {
      onAssignGroup(paper.id, nextGroupId);
      return;
    }
    onToggleSave(paper, nextGroupId);
  };

  const subtitleText = paper
    ? `${paper.sourceLabel}${paper.year ? ` · ${paper.year}` : ''}`
    : undefined;

  const showMergeInspector = Boolean(
    dedupEnabled && mergeCluster && mergeCluster.constituents.length > 1
  );

  return (
    <MobileSheet
      open={Boolean(paper)}
      onClose={onClose}
      title={t('paperActionsSheetTitle')}
      subtitle={subtitleText}
      initialSnap="auto"
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-lg"
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
    >
      {paper && (
        <div className="space-y-4">
          <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug line-clamp-2">
            {paper.title}
          </p>

          {/* Library Save + Group Selector */}
          <section className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onToggleSave(paper, activeSaveGroupId)}
                className={`flex-1 min-h-11 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                  isSaved
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] border border-[var(--link-academic)]/35'
                    : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
                }`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('savedShort')}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('saveShort')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="paper-action-sheet-group"
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <Folder className="w-3.5 h-3.5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                <span>{t('changePaperGroupTitle')}</span>
              </label>
              <select
                id="paper-action-sheet-group"
                value={isSaved ? (assignedGroupId ?? '') : (activeSaveGroupId ?? '')}
                onChange={(e) => handleGroupSelectChange(e.target.value)}
                className="w-full min-h-11 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-base md:text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]"
              >
                <option value="">{t('ungroupedOption')}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {t('slotPrefix')} {g.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Citations (ABNT / APA / BibTeX) + Native Share */}
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('copyCitation')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['abnt', 'apa', 'bibtex'] as const).map((fmt) => {
                const isCopied = copiedFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => void handleCopyCitation(fmt)}
                    className={`min-h-11 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-xl border text-[13px] font-semibold uppercase transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                      isCopied
                        ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/40 text-[var(--link-academic)]'
                        : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                    )}
                    <span>{fmt}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void handleSharePaper()}
              className="w-full min-h-11 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
            >
              {shareFeedback ? (
                <>
                  <Check className="w-4 h-4 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
                  <span>
                    {shareFeedback === 'shared' ? t('paperSharedFeedback') : t('shareLinkCopied')}
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                  <span>{t('paperShareBtn')}</span>
                </>
              )}
            </button>
          </section>

          {/* Discovery, Integrity & External Resolution Links */}
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCitationChaser(paper);
              }}
              className="w-full min-h-11 inline-flex items-center justify-between gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <GitBranch className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                <span className="truncate">{t('chaseCitationsBtn')}</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[var(--text-muted)] shrink-0">
                {paper.citationCount}
              </span>
            </button>

            {showMergeInspector && mergeCluster && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMergeInspector(mergeCluster.clusterId);
                }}
                className="w-full min-h-11 inline-flex items-center justify-between gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <GitMerge className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {t('corroboratedSourcesBadge', { count: mergeCluster.constituents.length })}
                  </span>
                </span>
                <span className="text-xs text-[var(--link-academic)] shrink-0">
                  {t('mergeInspectorTitle')}
                </span>
              </button>
            )}

            {!safePdfUrl && !resolvedUnpaywallUrl && paper.doi && (
              <button
                type="button"
                disabled={unpaywallEntry?.status === 'loading'}
                onClick={() => onFindUnpaywallPdf(paper)}
                className="w-full min-h-11 inline-flex items-center justify-between gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-medium text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] disabled:opacity-55 transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  {unpaywallEntry?.status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                  ) : (
                    <FileSearch className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">
                    {unpaywallEntry?.status === 'not_found'
                      ? t('unpaywallNotFoundMsg')
                      : t('findOaPdfBtn')}
                  </span>
                </span>
              </button>
            )}

            {resolvedUnpaywallUrl && (
              <a
                href={resolvedUnpaywallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 inline-flex items-center justify-between gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-semibold text-[var(--meta-green)] hover:bg-[var(--bg-subtle)] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              >
                <span className="truncate">{t('unpaywallFoundBadge')}</span>
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              </a>
            )}

            {safeProxyDoiUrl && (
              <a
                href={safeProxyDoiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 inline-flex items-center justify-between gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-medium text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              >
                <span className="truncate">{t('proxyDoiButton')}</span>
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              </a>
            )}

            {safeDoiUrl && cleanDoi && (
              <a
                href={safeDoiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 inline-flex items-center justify-between gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              >
                <span className="font-mono truncate">DOI: {cleanDoi}</span>
                <ExternalLink className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
              </a>
            )}

            {safePaperUrl && (
              <a
                href={safePaperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 inline-flex items-center justify-between gap-2 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              >
                <span className="truncate">{t('openPage')}</span>
                <ExternalLink className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
              </a>
            )}
          </section>
        </div>
      )}
    </MobileSheet>
  );
};
