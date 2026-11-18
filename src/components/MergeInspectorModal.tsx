import React, { useState } from 'react';
import { GitMerge, Split } from 'lucide-react';
import { MergeClusterEntry } from '../types/academic';
import { useI18n } from '../i18n/context';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { MobileSheet } from './ui/MobileSheet';

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
  const [highlightDiffs, setHighlightDiffs] = useState(true);

  const visibleClusters = focusClusterId
    ? clusters.filter((c) => c.clusterId === focusClusterId)
    : clusters;

  const renderRuleLabel = (cluster: MergeClusterEntry): string => {
    if (cluster.ruleMatched === 'doi') return t('mergeRuleDoi');
    if (cluster.ruleMatched === 'pmid-arxiv') return t('mergeRulePersistentId');
    return t('mergeRuleFuzzyTitle', { score: Math.round(cluster.similarityScore * 100) });
  };

  return (
    <MobileSheet
      open={isOpen}
      onClose={onClose}
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-3xl"
      initialSnap="full"
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      title={
        <span className="inline-flex items-center gap-2">
          <GitMerge className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <span>{t('mergeInspectorTitle')}</span>
        </span>
      }
      subtitle={t('mergeInspectorSubtitle')}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-11 md:min-h-0 px-4 py-2 md:py-1.5 rounded-xl md:rounded-lg text-sm font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer"
          >
            {t('closeModalBtn')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {visibleClusters.length > 0 && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              aria-pressed={highlightDiffs}
              onClick={() => setHighlightDiffs((prev) => !prev)}
              className={`min-h-11 md:min-h-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl md:rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                highlightDiffs
                  ? 'border-[var(--link-academic)] bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                  : 'border-[var(--divider)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  highlightDiffs ? 'bg-[var(--link-academic)]' : 'bg-[var(--text-muted)]'
                }`}
              />
              <span>{t('mergeDiffOnlyToggle')}</span>
            </button>
          </div>
        )}

        {visibleClusters.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            {t('noPapersInViewTitle')}
          </p>
        ) : (
          visibleClusters.map((cluster) => {
            const primary = cluster.constituents[0];
            if (!primary) return null;

            const hasTitleDiff = cluster.constituents.some((r) => r.title !== primary.title);
            const hasVenueDiff = cluster.constituents.some((r) => r.venue !== primary.venue);
            const hasYearDiff = cluster.constituents.some((r) => r.year !== primary.year);
            const hasDoiDiff = cluster.constituents.some((r) => (r.doi ?? '') !== (primary.doi ?? ''));
            const diffFieldCount = [hasTitleDiff, hasVenueDiff, hasYearDiff, hasDoiDiff].filter(Boolean).length;

            return (
              <div
                key={cluster.clusterId}
                className="rounded-xl border border-[var(--divider)] bg-[var(--bg-secondary)] p-3 sm:p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--divider)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
                      {renderRuleLabel(cluster)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] tabular-nums">
                      {t('mergeClusterCount', { count: cluster.constituents.length })}
                    </span>
                  </div>

                  {highlightDiffs && diffFieldCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--link-academic)] tabular-nums">
                      {diffFieldCount} Δ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cluster.constituents.map((record, idx) => {
                    const safeUrl = sanitizeExternalUrl(record.url);
                    const safePdf = sanitizeExternalUrl(record.pdfUrl);
                    const isTitleDiff = highlightDiffs && idx > 0 && record.title !== primary.title;
                    const isVenueDiff = highlightDiffs && idx > 0 && record.venue !== primary.venue;
                    const isYearDiff = highlightDiffs && idx > 0 && record.year !== primary.year;
                    const isDoiDiff = highlightDiffs && idx > 0 && (record.doi ?? '') !== (primary.doi ?? '');

                    return (
                      <div
                        key={record.id}
                        className="rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] p-3 sm:p-3.5 space-y-2 text-[13px] min-w-0"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--text-primary)] min-w-0 break-words">
                            {record.sourceLabel}
                          </span>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => onSplitPair(primary.id, record.id)}
                              className="min-h-11 md:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 md:px-2.5 md:py-1 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--bg-subtle)] text-[var(--link-academic)] hover:underline cursor-pointer shrink-0"
                            >
                              <Split className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{t('splitPairBtn')}</span>
                            </button>
                          )}
                        </div>

                        <div
                          className={`font-medium leading-snug break-words ${
                            isTitleDiff
                              ? 'text-[var(--link-academic)] bg-[var(--accent-blue-tint)]/60 px-1.5 py-0.5 -mx-1.5 rounded'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {record.title}
                        </div>

                        <div className="text-xs text-[var(--meta-green)] break-words">
                          {record.authors.length > 0
                            ? record.authors.slice(0, 4).join(', ')
                            : t('noAuthors')}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                          <span
                            className={`break-words ${
                              isVenueDiff ? 'font-semibold text-[var(--link-academic)]' : ''
                            }`}
                          >
                            {record.venue || '-'}
                          </span>
                          <span
                            className={`tabular-nums ${
                              isYearDiff ? 'font-semibold text-[var(--link-academic)]' : ''
                            }`}
                          >
                            {record.year ?? 's.d.'}
                          </span>
                          {record.doi && (
                            <span
                              className={`break-all ${
                                isDoiDiff ? 'font-semibold text-[var(--link-academic)]' : ''
                              }`}
                            >
                              DOI: {record.doi}
                            </span>
                          )}
                        </div>

                        {record.abstractText && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                            {record.abstractText}
                          </p>
                        )}

                        {(safeUrl || safePdf) && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs">
                            {safeUrl && (
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-11 md:min-h-0 inline-flex items-center px-3 md:px-0 py-1.5 md:py-0 rounded-xl md:rounded-none bg-[var(--bg-secondary)] md:bg-transparent border border-[var(--divider)] md:border-0 text-[var(--link-academic)] hover:underline"
                              >
                                {t('openPage')}
                              </a>
                            )}
                            {safePdf && (
                              <a
                                href={safePdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-11 md:min-h-0 inline-flex items-center px-3 md:px-0 py-1.5 md:py-0 rounded-xl md:rounded-none bg-[var(--bg-secondary)] md:bg-transparent border border-[var(--divider)] md:border-0 text-[var(--meta-green)] font-medium hover:underline"
                              >
                                {t('freePdf')}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </MobileSheet>
  );
};
