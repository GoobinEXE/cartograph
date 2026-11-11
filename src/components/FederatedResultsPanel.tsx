import React, { useMemo, useState } from 'react';
import { ApiSourceId, NormalizedPaper, SourceFetchStatus } from '../types/academic';
import {
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
} from '../utils/citationExporter';
import { useI18n } from '../i18n/context';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileDown,
  Filter,
  Loader2,
  Quote,
  Sparkles,
} from 'lucide-react';

interface FederatedResultsPanelProps {
  papers: NormalizedPaper[];
  statuses: SourceFetchStatus[];
  isSearching: boolean;
  savedIds: Set<string>;
  onToggleSave: (paper: NormalizedPaper) => void;
}

export const FederatedResultsPanel: React.FC<FederatedResultsPanelProps> = ({
  papers,
  statuses,
  isSearching,
  savedIds,
  onToggleSave,
}) => {
  const { t } = useI18n();
  const [onlyOpenAccess, setOnlyOpenAccess] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'all' | ApiSourceId>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'citations' | 'year'>('relevance');
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filteredPapers = useMemo(() => {
    let list = [...papers];
    if (onlyOpenAccess) {
      list = list.filter((p) => p.isOpenAccess);
    }
    if (selectedSource !== 'all') {
      list = list.filter((p) => p.source === selectedSource);
    }
    if (sortBy === 'citations') {
      list.sort((a, b) => b.citationCount - a.citationCount);
    } else if (sortBy === 'year') {
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    return list;
  }, [papers, onlyOpenAccess, selectedSource, sortBy]);

  const handleCopyCitation = async (paper: NormalizedPaper, format: 'abnt' | 'apa' | 'bibtex') => {
    const text =
      format === 'abnt'
        ? formatAbntCitation(paper)
        : format === 'apa'
        ? formatApaCitation(paper)
        : formatBibtexEntry(paper);
    await navigator.clipboard.writeText(text);
    const key = `${paper.id}-${format}`;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  if (!isSearching && statuses.length === 0 && papers.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3.5">
          <Sparkles className="w-6 h-6 text-cyan-400/80" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          {t('emptyFederatedTitle')}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          {t('emptyFederatedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live API Status Bar — Modern Compact Source Navigator */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              {t('federatedTitle')}
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
              {t('federatedCount', { displayed: filteredPapers.length, total: papers.length })}
            </span>
          </div>
          {isSearching && (
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t('querying')}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {statuses.map((st) => {
            const isSelected = selectedSource === st.source;
            return (
              <button
                key={st.source}
                type="button"
                onClick={() =>
                  setSelectedSource((prev) => (prev === st.source ? 'all' : st.source))
                }
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/70 text-slate-300 hover:border-slate-700/80 hover:bg-slate-900/60'
                }`}
              >
                <div className="truncate pr-1.5">
                  <div className="text-[11px] font-medium truncate">{st.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {st.status === 'loading' && '...'}
                    {st.status === 'success' && `${st.count} un.`}
                    {st.status === 'error' && (st.errorMessage ? 'Erro' : t('unavailable'))}
                  </div>
                </div>
                <div className="shrink-0 flex items-center">
                  {st.status === 'loading' && (
                    <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                  )}
                  {st.status === 'success' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {st.status === 'error' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/80 rounded-xl px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400/80" />
            <span>{t('filtersLabel')}</span>
          </div>

          <button
            type="button"
            onClick={() => setOnlyOpenAccess((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              onlyOpenAccess
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200'
            }`}
          >
            {t('filterOnlyOa')}
          </button>

          {selectedSource !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedSource('all')}
              className="px-2 py-1 rounded-lg text-xs bg-slate-800/80 text-cyan-300 hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {t('showAllSources')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{t('sortByLabel')}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all cursor-pointer"
          >
            <option value="relevance">{t('sortRelevance')}</option>
            <option value="citations">{t('sortCitations')}</option>
            <option value="year">{t('sortYear')}</option>
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {filteredPapers.map((paper) => {
          const isSaved = savedIds.has(paper.id);
          const isExpanded = Boolean(expandedAbstracts[paper.id]);

          return (
            <article
              key={paper.id}
              className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {paper.sourceLabel}
                  </span>
                  {paper.year && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800/90 text-slate-300">
                      {paper.year}
                    </span>
                  )}
                  {paper.isOpenAccess && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Open Access
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-300">
                    <Quote className="w-3 h-3 text-purple-400" />
                    {paper.citationCount} {t('sortCitations').toLowerCase()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleSave(paper)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSaved
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/70'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('savedInMatrix')}</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{t('savePaperBtn')}</span>
                    </>
                  )}
                </button>
              </div>

              <h4 className="text-base sm:text-lg font-semibold text-slate-100 leading-snug mb-1">
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-300 transition-colors"
                >
                  {paper.title}
                </a>
              </h4>

              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                <span className="text-slate-300 font-medium">
                  {paper.authors.length > 0 ? paper.authors.join(', ') : t('noAuthors')}
                </span>
                {' · '}
                <span className="italic text-slate-400">{paper.venue}</span>
                {paper.doi && (
                  <>
                    {' · '}
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-cyan-400 hover:underline"
                    >
                      DOI: {paper.doi}
                    </a>
                  </>
                )}
              </p>

              {paper.abstractText && (
                <div className="mb-3">
                  <p
                    className={`text-xs text-slate-300/90 leading-relaxed bg-slate-950/60 border border-slate-800/70 rounded-xl p-3 ${
                      !isExpanded ? 'line-clamp-3' : ''
                    }`}
                  >
                    {paper.abstractText}
                  </p>
                  {paper.abstractText.length > 240 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAbstracts((prev) => ({
                          ...prev,
                          [paper.id]: !prev[paper.id],
                        }))
                      }
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> {t('collapseAbstract')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> {t('readFullAbstract')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/60">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <span>{t('openPage')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {paper.pdfUrl && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors"
                    >
                      <FileDown className="w-3 h-3" />
                      <span>{t('freePdf')}</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">{t('copyCitation')}</span>
                  {(['abnt', 'apa', 'bibtex'] as const).map((fmt) => {
                    const isCopied = copiedKey === `${paper.id}-${fmt}`;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => handleCopyCitation(paper, fmt)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono uppercase bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 cursor-pointer transition-colors"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{fmt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
