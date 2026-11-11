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
  Quote,
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3.5">
          <BookMarked className="w-6 h-6 text-amber-400/80" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          {t('emptySavedTitle')}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          {t('emptySavedDesc')}
        </p>
      </div>
    );
  }

  const countLabel = items.length === 1 ? t('studySingular') : t('studyPlural');

  return (
    <div className="space-y-4">
      {/* Bulk Export Toolbar */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">
              {t('savedTitle', { count: items.length, label: countLabel })}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {items.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('savedSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t('downloadCsv')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBibtex}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600/90 hover:bg-cyan-600 text-white transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('downloadBib')}</span>
          </button>

          {(['abnt', 'apa'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleCopyAll(fmt)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/70 transition-all cursor-pointer uppercase"
            >
              {bulkCopied === fmt ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{t('copyAll', { format: fmt })}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-all cursor-pointer ml-auto sm:ml-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clearAll')}</span>
          </button>
        </div>
      </div>

      {/* Saved Items Cards */}
      <div className="space-y-3.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3 transition-all"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {item.sourceLabel}
                  </span>
                  {item.year && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800/90 text-slate-300">
                      {item.year}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-300 bg-purple-500/10">
                    <Quote className="w-3 h-3 text-purple-400" />
                    {item.citationCount}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="text-slate-300 font-medium">
                    {item.authors.length > 0 ? item.authors.join(', ') : t('noAuthors')}
                  </span>
                  {' · '}
                  <span className="italic">{item.venue}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={item.relevanceTag}
                  onChange={(e) =>
                    onUpdateRelevance(
                      item.id,
                      e.target.value as SavedPaperItem['relevanceTag']
                    )
                  }
                  className="bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all cursor-pointer"
                >
                  <option value="alta">{t('priorityHigh')}</option>
                  <option value="media">{t('priorityMedium')}</option>
                  <option value="revisar">{t('priorityReview')}</option>
                </select>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title={t('removeTooltip')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Formatted ABNT Reference Preview */}
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 text-xs text-slate-300 font-mono leading-relaxed">
              <span className="text-cyan-400/90 font-semibold select-none">ABNT: </span>
              {formatAbntCitation(item)}
            </div>

            {/* Researcher Notes Input */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {t('notesLabel')}
              </label>
              <textarea
                rows={2}
                value={item.researcherNotes}
                onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>{t('openSource')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {item.pdfUrl && (
                <a
                  href={item.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <FileDown className="w-3 h-3" />
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
