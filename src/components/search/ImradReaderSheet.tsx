import React from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, FileText, Microscope, Users } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { ExtractedPaperMetadata, NormalizedPaper } from '../../types/academic';
import { sanitizeExternalUrl } from '../../utils/urlSafety';
import { MobileSheet } from '../ui/MobileSheet';

export interface ImradReaderSheetProps {
  paper: NormalizedPaper | null;
  metadata: ExtractedPaperMetadata | null;
  isSaved: boolean;
  activeSaveGroupName?: string | null;
  onToggleSave: () => void;
  onClose: () => void;
}

/**
 * Mobile-first IMRAD reader sheet that renders structured abstract sections and
 * study metadata in comfortable reading typography without shifting result scroll.
 */
export const ImradReaderSheet: React.FC<ImradReaderSheetProps> = ({
  paper,
  metadata,
  isSaved,
  activeSaveGroupName,
  onToggleSave,
  onClose,
}) => {
  const { t } = useI18n();

  const safePaperUrl = paper ? sanitizeExternalUrl(paper.url) : null;
  const safePdfUrl = paper ? sanitizeExternalUrl(paper.pdfUrl) : null;
  const cleanDoi = paper?.doi
    ? paper.doi
        .trim()
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .replace(/^doi:\s*/i, '')
    : null;
  const safeDoiUrl = cleanDoi ? sanitizeExternalUrl(`https://doi.org/${cleanDoi}`) : null;
  const primaryReadUrl = safePdfUrl || safePaperUrl || safeDoiUrl;

  const authorsLabel = paper
    ? paper.authors.length > 0
      ? paper.authors.slice(0, 4).join(', ')
      : t('noAuthors')
    : '';
  const subtitleText = paper
    ? `${authorsLabel}${paper.year ? ` · ${paper.year}` : ''}`
    : undefined;

  const hasImradSections = Boolean(
    metadata?.hasStructuredAbstract &&
      (metadata.objective || metadata.methods || metadata.results || metadata.conclusion)
  );

  const imradSections = hasImradSections && metadata
    ? [
        metadata.objective ? { key: 'objective', label: t('labelObjective'), body: metadata.objective } : null,
        metadata.methods ? { key: 'methods', label: t('labelMethodsSample'), body: metadata.methods } : null,
        metadata.results ? { key: 'results', label: t('labelResults'), body: metadata.results } : null,
        metadata.conclusion ? { key: 'conclusion', label: t('labelConclusion'), body: metadata.conclusion } : null,
      ].filter((item): item is { key: string; label: string; body: string } => item !== null)
    : [];

  const footer = paper ? (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onToggleSave}
        className={`flex-1 min-h-11 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl text-[14px] font-semibold border transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
          isSaved
            ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/35 text-[var(--link-academic)]'
            : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        {isSaved ? (
          <>
            <BookmarkCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t('savedShort')}</span>
          </>
        ) : (
          <>
            <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {activeSaveGroupName
                ? t('saveIntoGroup', { name: activeSaveGroupName })
                : t('saveShort')}
            </span>
          </>
        )}
      </button>

      {primaryReadUrl && (
        <a
          href={primaryReadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[14px] font-semibold hover:opacity-90 transition-opacity touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]"
        >
          <span className="truncate">{safePdfUrl ? t('freePdf') : t('openPage')}</span>
          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
        </a>
      )}
    </div>
  ) : undefined;

  return (
    <MobileSheet
      open={Boolean(paper)}
      onClose={onClose}
      title={t('paperImradReaderTitle')}
      subtitle={subtitleText}
      enableHalfSnap={true}
      initialSnap="full"
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-2xl"
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      footer={footer}
    >
      {paper && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h3 className="font-heading text-[17px] font-semibold leading-snug text-[var(--text-primary)]">
              {safePaperUrl ? (
                <a
                  href={safePaperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--link-academic)] hover:underline"
                >
                  {paper.title}
                </a>
              ) : (
                paper.title
              )}
            </h3>
            <div className="text-[13px] text-[var(--meta-green)] leading-snug">
              {paper.venue && <span>{paper.venue} · </span>}
              {paper.year && <span className="tabular-nums font-medium">{paper.year} · </span>}
              <span>{paper.sourceLabel}</span>
            </div>
          </div>

          {(metadata?.studyDesign || metadata?.sampleSize) && (
            <div className="flex flex-wrap items-center gap-2">
              {metadata.studyDesign && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] text-[var(--link-academic)]">
                  <Microscope className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{metadata.studyDesign}</span>
                </span>
              )}
              {metadata.sampleSize && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] text-[var(--meta-green)] tabular-nums">
                  <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{metadata.sampleSize}</span>
                </span>
              )}
            </div>
          )}

          {hasImradSections ? (
            <div className="space-y-3">
              {imradSections.map((section) => (
                <section
                  key={section.key}
                  className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] p-3.5 space-y-1.5"
                >
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--link-academic)]">
                    <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{section.label}</span>
                  </div>
                  <p className="text-[15.5px] leading-relaxed text-[var(--text-primary)]">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          ) : (
            paper.abstractText && (
              <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] p-3.5">
                <p className="text-[15.5px] leading-relaxed text-[var(--text-primary)] whitespace-pre-line">
                  {paper.abstractText}
                </p>
              </div>
            )
          )}
        </div>
      )}
    </MobileSheet>
  );
};
