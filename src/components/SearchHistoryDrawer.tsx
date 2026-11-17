import { intlLocale } from '../i18n/localized';
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  History,
  Play,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { SearchLogEntry } from '../types/academic';
import { triggerFileDownload } from '../utils/citationExporter';
import { useI18n } from '../i18n/context';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportMd = () => {
    if (logs.length === 0) return;
    const md = formatSearchLogsAsMarkdown(logs);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-prisma-s-log-${dateStamp}.md`,
      md,
      'text/markdown;charset=utf-8;'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prisma-s-log-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[86vh] flex flex-col bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--link-academic)]" />
              <h2
                id="prisma-s-log-title"
                className="text-base font-bold text-[var(--text-primary)]"
              >
                {t('searchHistoryTitle')}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t('searchHistorySubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            aria-label={t('closeModalBtn')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
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
                  className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--divider)] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-[min(100%,15rem)]">
                      <code className="block text-[13px] font-semibold text-[var(--text-primary)] break-words bg-[var(--bg-canvas)] px-2.5 py-1.5 rounded-lg border border-[var(--divider)]">
                        {entry.query}
                      </code>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{t('searchHistoryRerun')}</span>
                    </button>
                  </div>

                  {sourceEntries.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {t('searchHistorySourcesToggle', { count: sourceEntries.length })}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {sourceEntries.map(([srcId, snap]) => {
                            if (!snap) return null;
                            const isOk = snap.status === 'success';
                            return (
                              <div
                                key={srcId}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs"
                              >
                                <span className="inline-flex items-center gap-1.5 truncate font-medium text-[var(--text-primary)]">
                                  {isOk ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span className="truncate">{srcId}</span>
                                </span>
                                <span className="text-[var(--text-muted)] shrink-0">
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

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-[var(--divider)] bg-[var(--bg-secondary)]">
          <button
            type="button"
            disabled={logs.length === 0}
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('searchHistoryClear')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={logs.length === 0}
              onClick={handleExportMd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-[var(--link-academic)]" />
              <span>{t('searchHistoryExportMd')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] cursor-pointer"
            >
              {t('closeModalBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
