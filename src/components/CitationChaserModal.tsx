import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { NormalizedPaper, UserAccessConfig } from '../types/academic';
import { chasePaperCitations, CitationChaseResult } from '../services/citationChaser';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { useI18n } from '../i18n/context';
import { MobileSheet } from './ui/MobileSheet';

interface CitationChaserModalProps {
  seedPaper: NormalizedPaper | null;
  accessConfig?: UserAccessConfig;
  savedIds: Set<string>;
  activeSaveGroupId: string | null;
  onToggleSave: (paper: NormalizedPaper, targetGroupId?: string | null) => void;
  onClose: () => void;
}

export const CitationChaserModal: React.FC<CitationChaserModalProps> = ({
  seedPaper,
  accessConfig,
  savedIds,
  activeSaveGroupId,
  onToggleSave,
  onClose,
}) => {
  const { t, language } = useI18n();
  const [activeDirection, setActiveDirection] = useState<'citations' | 'references'>('citations');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CitationChaseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!seedPaper) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    chasePaperCitations(seedPaper, 'both', {
      accessConfig,
      signal: controller.signal,
      language,
    })
      .then((res) => {
        if (!controller.signal.aborted) {
          setResult(res);
          if (res.citations.length === 0 && res.references.length > 0) {
            setActiveDirection('references');
          } else {
            setActiveDirection('citations');
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setErrorMsg(err instanceof Error ? err.message : 'Error querying citation graph');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [seedPaper, accessConfig, language]);

  const list =
    activeDirection === 'citations' ? result?.citations ?? [] : result?.references ?? [];

  return (
    <MobileSheet
      open={Boolean(seedPaper)}
      onClose={onClose}
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-3xl"
      initialSnap="full"
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      title={
        <span className="inline-flex items-center gap-2">
          <GitBranch className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <span>{t('citationChaserTitle')}</span>
        </span>
      }
      subtitle={seedPaper?.title}
    >
      <div className="space-y-3">
        <div
          role="tablist"
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 -mt-3 px-4 sm:px-6 py-2.5 border-b border-[var(--divider)] bg-[var(--bg-canvas)]/95 backdrop-blur-xs flex items-center gap-2 overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeDirection === 'citations'}
            onClick={() => setActiveDirection('citations')}
            className={`min-h-11 md:min-h-9 px-3.5 py-2 rounded-xl md:rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors tabular-nums ${
              activeDirection === 'citations'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {t('citationChaserCitedByTab', { count: result?.citations.length ?? 0 })}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeDirection === 'references'}
            onClick={() => setActiveDirection('references')}
            className={`min-h-11 md:min-h-9 px-3.5 py-2 rounded-xl md:rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors tabular-nums ${
              activeDirection === 'references'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {t('citationChaserRefsTab', { count: result?.references.length ?? 0 })}
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2.5 text-sm text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--link-academic)] shrink-0" aria-hidden="true" />
            <span>{t('citationChaserLoading')}</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
            {errorMsg}
          </div>
        ) : list.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            {t('citationChaserEmpty')}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((paper) => {
              const isSaved = savedIds.has(paper.id);
              const safeUrl = sanitizeExternalUrl(paper.url);
              const safePdf = sanitizeExternalUrl(paper.pdfUrl);
              return (
                <div
                  key={paper.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--divider)] space-y-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {paper.isRetracted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-600 text-white">
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                          {t('retractedBadge')}
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug break-words w-full">
                        {paper.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words tabular-nums">
                      {paper.authors.slice(0, 3).join(', ')}
                      {paper.year ? ` (${paper.year})` : ''} · {paper.venue} ·{' '}
                      {t('citedByCount', { count: paper.citationCount })}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2.5 border-t border-[var(--divider)]">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 px-3 sm:px-2 py-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-[var(--bg-canvas)] sm:bg-transparent border border-[var(--divider)] sm:border-0 text-[var(--link-academic)] hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" aria-hidden="true" />
                          <span>{t('openSource')}</span>
                        </a>
                      )}
                      {safePdf && (
                        <a
                          href={safePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-11 sm:min-h-8 inline-flex items-center px-3 sm:px-2 py-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-[var(--bg-canvas)] sm:bg-transparent border border-[var(--divider)] sm:border-0 font-medium text-[var(--meta-green)] hover:underline"
                        >
                          [PDF]
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleSave(paper, activeSaveGroupId)}
                      className={`w-full sm:w-auto min-h-11 sm:min-h-8 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                        isSaved
                          ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                          : 'bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{isSaved ? t('savedShort') : t('saveShort')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileSheet>
  );
};
