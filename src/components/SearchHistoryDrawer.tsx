import { intlLocale } from '../i18n/localized';
import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  History,
  Play,
  Share2,
  Trash2,
  XCircle,
} from 'lucide-react';
import { SearchLogEntry } from '../types/academic';
import { canUseNativeShare, copyTextSafely, shareOrDownloadFile } from '../utils/fileDownload';
import { useI18n } from '../i18n/context';
import { MobileSheet } from './ui/MobileSheet';

interface SearchHistoryDrawerProps {
  isOpen: boolean;
  logs: SearchLogEntry[];
  onClose: () => void;
  onRerunSearch: (entry: SearchLogEntry) => void;
  onClearLogs: () => void;
}

export function formatSearchLogsAsMarkdown(logs: SearchLogEntry[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    '---',
    'type: prisma-s-search-log',
    `generated: ${today}`,
    `searches_count: ${logs.length}`,
    '---',
    '',
    '# PRISMA-S Auditable Search Strategy Log',
    '',
    '| Date (UTC) | Query | Year >= | Scope | Dedup | Raw | Unique |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const log of logs) {
    const safeQuery = log.query.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
    lines.push(
      `| ${log.executedAt} | \`${safeQuery}\` | ${log.yearFrom ?? '-'} | ${log.scope} | ${
        log.dedupEnabled ? 'On' : 'Off'
      } | ${log.totalRaw} | ${log.totalUnique} |`
    );
  }

  for (const log of logs) {
    lines.push('', `## Search \`${log.id}\` (${log.executedAt})`);
    lines.push(`- **Query:** \`${log.query}\``);
    lines.push(
      `- **Parameters:** Scope=\`${log.scope}\`, YearFrom=${log.yearFrom ?? 'any'}, Dedup=${log.dedupEnabled ? 'On' : 'Off'}`
    );
    lines.push(`- **Yield:** ${log.totalRaw} raw -> ${log.totalUnique} unique`);
    const entries = Object.entries(log.bySource);
    if (entries.length > 0) {
      lines.push('', '| Source | Status | Count | Latency (ms) |', '| --- | --- | --- | --- |');
      for (const [src, snap] of entries) {
        if (!snap) continue;
        lines.push(`| ${src} | ${snap.status} | ${snap.count} | ${snap.latencyMs ?? '-'} |`);
      }
    }
  }

  return lines.join('\n');
}

export const SearchHistoryDrawer: React.FC<SearchHistoryDrawerProps> = ({
  isOpen,
  logs,
  onClose,
  onRerunSearch,
  onClearLogs,
}) => {
  const { language, t } = useI18n();
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportMd = async () => {
    if (logs.length === 0) return;
    const md = formatSearchLogsAsMarkdown(logs);
    const dateStamp = new Date().toISOString().slice(0, 10);
    await shareOrDownloadFile(
      `cartograph-prisma-s-log-${dateStamp}.md`,
      md,
      'text/markdown;charset=utf-8;',
      t('searchHistoryTitle')
    );
  };

  const handleCopyMd = async () => {
    if (logs.length === 0) return;
    const md = formatSearchLogsAsMarkdown(logs);
    const ok = await copyTextSafely(md);
    if (ok) {
      setCopiedFeedback(true);
      window.setTimeout(() => setCopiedFeedback(false), 1800);
    }
  };

  const ExportIcon = canUseNativeShare() ? Share2 : Download;

  return (
    <MobileSheet
      open={isOpen}
      onClose={onClose}
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-3xl"
      enableHalfSnap={true}
      initialSnap="full"
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      title={
        <span className="inline-flex items-center gap-2">
          <History className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <span>{t('searchHistoryTitle')}</span>
        </span>
      }
      subtitle={t('searchHistorySubtitle')}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            type="button"
            disabled={logs.length === 0}
            onClick={onClearLogs}
            className="min-h-11 md:min-h-0 inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t('searchHistoryClear')}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={logs.length === 0}
              onClick={() => {
                void handleCopyMd();
              }}
              className="min-h-11 md:min-h-0 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {copiedFeedback ? (
                <Check className="w-3.5 h-3.5 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
              )}
              <span>{t('feedbackCopyBtn')}</span>
            </button>

            <button
              type="button"
              disabled={logs.length === 0}
              onClick={() => {
                void handleExportMd();
              }}
              className="min-h-11 md:min-h-0 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ExportIcon className="w-3.5 h-3.5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
              <span>{t('searchHistoryExportMd')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-11 md:min-h-0 w-full sm:w-auto px-4 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer"
            >
              {t('closeModalBtn')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-muted)]">
            {t('searchHistoryEmpty')}
          </div>
        ) : (
          logs.map((entry) => {
            const sourceEntries = Object.entries(entry.bySource);
            const isExpanded = Boolean(expandedLogIds[entry.id]);
            const formattedDate = new Date(entry.executedAt).toLocaleString(
              intlLocale(language)
            );

            return (
              <div
                key={entry.id}
                className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--divider)] p-3.5 sm:p-4 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <code className="block text-[13px] font-semibold text-[var(--text-primary)] break-words bg-[var(--bg-canvas)] px-2.5 py-1.5 rounded-lg border border-[var(--divider)]">
                      {entry.query}
                    </code>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] pt-0.5 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {formattedDate}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-secondary)]">
                        {t('searchHistoryScopeLabel')}: {entry.scope}
                      </span>
                      {entry.yearFrom && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)]">
                          ≥ {entry.yearFrom}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)]">
                        {entry.dedupEnabled
                          ? t('searchHistoryDedupOn')
                          : t('searchHistoryDedupOff')}
                      </span>
                      <span className="font-semibold text-[var(--link-academic)]">
                        {t('searchHistoryStats', {
                          raw: entry.totalRaw,
                          unique: entry.totalUnique,
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onRerunSearch(entry);
                      onClose();
                    }}
                    className="w-full sm:w-auto min-h-11 md:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('searchHistoryRerun')}</span>
                  </button>
                </div>

                {sourceEntries.length > 0 && (
                  <div>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpand(entry.id)}
                      className="min-h-11 md:min-h-0 py-1.5 md:py-0 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {t('searchHistorySourcesToggle', { count: sourceEntries.length })}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {sourceEntries.map(([srcId, snap]) => {
                          if (!snap) return null;
                          const isOk = snap.status === 'success';
                          return (
                            <div
                              key={srcId}
                              className="flex items-center justify-between gap-2 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs min-w-0"
                            >
                              <span className="inline-flex items-center gap-1.5 min-w-0 font-medium text-[var(--text-primary)]">
                                {isOk ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
                                )}
                                <span className="break-words sm:truncate">{srcId}</span>
                              </span>
                              <span className="text-[var(--text-muted)] shrink-0 tabular-nums">
                                {snap.count}
                                {snap.latencyMs ? ` (${snap.latencyMs}ms)` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </MobileSheet>
  );
};
