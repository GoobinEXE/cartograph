import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  GitBranch,
  Loader2,
  X,
} from 'lucide-react';
import { NormalizedPaper, UserAccessConfig } from '../types/academic';
import { chasePaperCitations, CitationChaseResult } from '../services/citationChaser';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { useI18n } from '../i18n/context';

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
  const { t } = useI18n();
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
  }, [seedPaper, accessConfig]);

  useEffect(() => {
    if (!seedPaper) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seedPaper, onClose]);

  if (!seedPaper) return null;

  const list =
    activeDirection === 'citations' ? result?.citations ?? [] : result?.references ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-chaser-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[86vh] flex flex-col bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[var(--link-academic)] shrink-0" />
              <h2
                id="citation-chaser-title"
                className="text-base font-bold text-[var(--text-primary)] truncate"
              >
                {t('citationChaserTitle')}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
              {seedPaper.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer shrink-0"
            aria-label={t('closeModalBtn')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-[var(--divider)] bg-[var(--bg-canvas)]">
          <button
            type="button"
            onClick={() => setActiveDirection('citations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeDirection === 'citations'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {t('citationChaserCitedByTab', { count: result?.citations.length ?? 0 })}
          </button>
          <button
            type="button"
            onClick={() => setActiveDirection('references')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeDirection === 'references'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {t('citationChaserRefsTab', { count: result?.references.length ?? 0 })}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2.5 text-sm text-[var(--text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--link-academic)]" />
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
            list.map((paper) => {
              const isSaved = savedIds.has(paper.id);
              const safeUrl = sanitizeExternalUrl(paper.url);
              const safePdf = sanitizeExternalUrl(paper.pdfUrl);
              return (
                <div
                  key={paper.id}
                  className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--divider)] space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {paper.isRetracted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-600 text-white">
                            <AlertTriangle className="w-3 h-3" />
                            {t('retractedBadge')}
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                          {paper.title}
                        </h3>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.year ? ` (${paper.year})` : ''} · {paper.venue} ·{' '}
                        {t('citedByCount', { count: paper.citationCount })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleSave(paper, activeSaveGroupId)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                        isSaved
                          ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                          : 'bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                      <span>{isSaved ? t('savedShort') : t('saveShort')}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--link-academic)] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{t('openSource')}</span>
                      </a>
                    )}
                    {safePdf && (
                      <a
                        href={safePdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--meta-green)] hover:underline"
                      >
                        [PDF]
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
