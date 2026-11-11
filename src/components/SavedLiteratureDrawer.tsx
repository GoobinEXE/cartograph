import React, { useState } from 'react';
import { SavedPaperItem } from '../types/academic';
import {
  exportSavedPapersCsv,
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
  triggerFileDownload,
} from '../utils/citationExporter';
import { useI18n } from '../i18n/context';
import {
  BookMarked,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

interface SavedLiteratureDrawerProps {
  items: SavedPaperItem[];
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateRelevance: (id: string, relevance: SavedPaperItem['relevanceTag']) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export const SavedLiteratureDrawer: React.FC<SavedLiteratureDrawerProps> = ({
  items,
  onUpdateNotes,
  onUpdateRelevance,
  onRemoveItem,
  onClearAll,
}) => {
  const { t } = useI18n();
  const [bulkCopied, setBulkCopied] = useState<string | null>(null);

  const handleCopyAll = async (format: 'abnt' | 'apa' | 'bibtex') => {
    if (items.length === 0) return;
    const text = items
      .map((item) =>
        format === 'abnt'
          ? formatAbntCitation(item)
          : format === 'apa'
          ? formatApaCitation(item)
          : formatBibtexEntry(item)
      )
      .join('\n\n');

    await navigator.clipboard.writeText(text);
    setBulkCopied(format);
    setTimeout(() => setBulkCopied(null), 2000);
  };

  const handleDownloadCsv = () => {
    if (items.length === 0) return;
    const csv = exportSavedPapersCsv(items);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-literature-matrix-${dateStamp}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
  };

  const handleDownloadBibtex = () => {
    if (items.length === 0) return;
    const bib = items.map(formatBibtexEntry).join('\n\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-references-${dateStamp}.bib`,
      bib,
      'application/x-bibtex;charset=utf-8;'
    );
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
        <BookMarked className="w-10 h-10 text-amber-400/70 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200 mb-1">
          {t('emptySavedTitle')}
        </h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          {t('emptySavedDesc')}
        </p>
      </div>
    );
  }

  const countLabel = items.length === 1 ? t('studySingular') : t('studyPlural');

  return (
    <div className="space-y-5">
      {/* Bulk Export Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            {t('savedTitle', { count: items.length, label: countLabel })}
          </h3>
          <p className="text-xs text-slate-400">
            {t('savedSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('downloadCsv')}
          </button>

          <button
            type="button"
            onClick={handleDownloadBibtex}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            {t('downloadBib')}
          </button>

          {(['abnt', 'apa'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleCopyAll(fmt)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer uppercase"
            >
              {bulkCopied === fmt ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {t('copyAll', { format: fmt })}
            </button>
          ))}

          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('clearAll')}
          </button>
        </div>
      </div>

      {/* Saved Items Cards */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {item.sourceLabel}
                  </span>
                  {item.year && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                      {item.year}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-300">
                    {item.citationCount} {t('sortCitations').toLowerCase()}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-100">{item.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.authors.length > 0 ? item.authors.join(', ') : t('noAuthors')} · <span className="italic">{item.venue}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={item.relevanceTag}
                  onChange={(e) =>
                    onUpdateRelevance(
                      item.id,
                      e.target.value as SavedPaperItem['relevanceTag']
                    )
                  }
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="alta">{t('priorityHigh')}</option>
                  <option value="media">{t('priorityMedium')}</option>
                  <option value="revisar">{t('priorityReview')}</option>
                </select>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title={t('removeTooltip')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Formatted ABNT Reference Preview */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 font-mono">
              <span className="text-cyan-400 font-semibold select-none">ABNT NBR 6023: </span>
              {formatAbntCitation(item)}
            </div>

            {/* Researcher Notes Input */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {t('notesLabel')}
              </label>
              <textarea
                rows={2}
                value={item.researcherNotes}
                onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
              >
                <span>{t('openSource')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {item.pdfUrl && (
                <a
                  href={item.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{t('downloadFullPdf')}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
