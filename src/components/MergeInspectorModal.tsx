import React, { useEffect } from 'react';
import { GitMerge, Split, X } from 'lucide-react';
import { MergeClusterEntry } from '../types/academic';
import { useI18n } from '../i18n/context';
import { sanitizeExternalUrl } from '../utils/urlSafety';

interface MergeInspectorModalProps {
  isOpen: boolean;
  clusters: MergeClusterEntry[];
  focusClusterId?: string | null;
  onSplitPair: (idA: string, idB: string) => void;
  onClose: () => void;
}

export const MergeInspectorModal: React.FC<MergeInspectorModalProps> = ({
  isOpen,
  clusters,
  focusClusterId,
  onSplitPair,
  onClose,
}) => {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const visibleClusters = focusClusterId
    ? clusters.filter((c) => c.clusterId === focusClusterId)
    : clusters;

  const renderRuleLabel = (cluster: MergeClusterEntry): string => {
    if (cluster.ruleMatched === 'doi') return t('mergeRuleDoi');
    if (cluster.ruleMatched === 'pmid-arxiv') return t('mergeRulePersistentId');
    return t('mergeRuleFuzzyTitle', { score: Math.round(cluster.similarityScore * 100) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('mergeInspectorTitle')}
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--divider)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[17px] font-semibold text-[var(--text-primary)]">
              <GitMerge className="w-5 h-5 text-[var(--link-academic)] shrink-0" />
              <span className="truncate">{t('mergeInspectorTitle')}</span>
            </div>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              {t('mergeInspectorSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
            aria-label={t('closeModalBtn')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {visibleClusters.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              {t('noPapersInViewTitle')}
            </p>
          ) : (
            visibleClusters.map((cluster) => {
              const primary = cluster.constituents[0];
              return (
                <div
                  key={cluster.clusterId}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--divider)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--link-academic)]/15 text-[var(--link-academic)]">
                        {renderRuleLabel(cluster)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {t('mergeClusterCount', { count: cluster.constituents.length })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cluster.constituents.map((record, idx) => {
                      const safeUrl = sanitizeExternalUrl(record.url);
                      const safePdf = sanitizeExternalUrl(record.pdfUrl);
                      const isTitleDiff = record.title !== primary.title;
                      const isVenueDiff = record.venue !== primary.venue;
                      const isYearDiff = record.year !== primary.year;

                      return (
                        <div
                          key={record.id}
                          className="rounded-xl bg-[var(--bg-primary)] border border-[var(--divider)] p-3.5 space-y-2 text-[13px]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {record.sourceLabel}
                            </span>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => onSplitPair(primary.id, record.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] text-[var(--link-academic)] hover:underline cursor-pointer"
                              >
                                <Split className="w-3.5 h-3.5" />
                                <span>{t('splitPairBtn')}</span>
                              </button>
                            )}
                          </div>

                          <div
                            className={`font-medium leading-snug ${
                              isTitleDiff ? 'text-[var(--link-academic)]' : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {record.title}
                          </div>

                          <div className="text-xs text-[var(--meta-green)]">
                            {record.authors.length > 0
                              ? record.authors.slice(0, 4).join(', ')
                              : t('noAuthors')}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                            <span className={isVenueDiff ? 'font-semibold text-[var(--text-primary)]' : ''}>
                              {record.venue || '-'}
                            </span>
                            <span className={isYearDiff ? 'font-semibold text-[var(--text-primary)]' : ''}>
                              {record.year ?? 's.d.'}
                            </span>
                            {record.doi && <span>DOI: {record.doi}</span>}
                          </div>

                          {record.abstractText && (
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                              {record.abstractText}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                            {safeUrl && (
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--link-academic)] hover:underline"
                              >
                                {t('openPage')}
                              </a>
                            )}
                            {safePdf && (
                              <a
                                href={safePdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--meta-green)] hover:underline"
                              >
                                {t('freePdf')}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-[var(--divider)] flex justify-end bg-[var(--bg-secondary)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] cursor-pointer"
          >
            {t('closeModalBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
