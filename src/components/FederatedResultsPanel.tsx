import React, { useMemo, useState } from 'react';
import { ApiSourceId, DeduplicationSummary, NormalizedPaper, SourceFetchStatus } from '../types/academic';
import {
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
} from '../utils/citationExporter';
import { parseAbstractMetadata } from '../utils/abstractParser';
import { useI18n } from '../i18n/context';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Loader2,
  Microscope,
  Users,
} from 'lucide-react';

interface FederatedResultsPanelProps {
  papers: NormalizedPaper[];
  statuses: SourceFetchStatus[];
  isSearching: boolean;
  savedIds: Set<string>;
  onToggleSave: (paper: NormalizedPaper) => void;
  deduplicationSummary?: DeduplicationSummary | null;
}

export const FederatedResultsPanel: React.FC<FederatedResultsPanelProps> = ({
  papers,
  statuses,
  isSearching,
  savedIds,
  onToggleSave,
  deduplicationSummary,
}) => {
  const { t } = useI18n();
  const [onlyOpenAccess, setOnlyOpenAccess] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'all' | ApiSourceId>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'citations' | 'year'>('relevance');
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});
  const [expandedStructured, setExpandedStructured] = useState<Record<string, boolean>>({});
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
      <div className="py-16 text-center max-w-md mx-auto">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
          {t('emptyFederatedTitle')}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t('emptyFederatedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 items-start">
      {/* Left Filter Column — Borderless Google Scholar / Semantic Scholar Style */}
      <aside className="space-y-6 lg:sticky lg:top-20">
        {/* Sort Controls */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">
            {t('sortByLabel')}
          </div>
          <div className="space-y-0.5 text-[13px]">
            {(['relevance', 'citations', 'year'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortBy(mode)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  sortBy === mode
                    ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'relevance' && t('sortRelevance')}
                {mode === 'citations' && t('sortCitations')}
                {mode === 'year' && t('sortYear')}
              </button>
            ))}
          </div>
        </div>

        {/* Access Filter */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">
            Disponibilidade
          </div>
          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOpenAccess}
              onChange={(e) => setOnlyOpenAccess(e.target.checked)}
              className="rounded accent-[var(--link-academic)]"
            />
            <span>Somente Open Access</span>
          </label>
        </div>

        {/* Source Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Bases Consultadas
            </span>
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--link-academic)]" />
            )}
          </div>

          <div className="space-y-0.5 text-[13px]">
            <button
              type="button"
              onClick={() => setSelectedSource('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedSource === 'all'
                  ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Todas as fontes</span>
              <span className="text-xs text-[var(--text-muted)]">{papers.length}</span>
            </button>

            {statuses.map((st) => {
              const isSelected = selectedSource === st.source;
              return (
                <button
                  key={st.source}
                  type="button"
                  onClick={() =>
                    setSelectedSource((prev) => (prev === st.source ? 'all' : st.source))
                  }
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate pr-2">{st.label.split(' ')[0]}</span>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    {st.status === 'loading' ? '...' : st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Results Column — Classic Borderless Academic Stream */}
      <div className="max-w-3xl">
        {/* Deterministic Deduplication Summary Banner */}
        {deduplicationSummary && deduplicationSummary.duplicatesRemoved > 0 && (
          <div className="mb-5 bg-[var(--bg-secondary)] rounded-xl p-3.5 flex items-start gap-3 border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <Layers className="w-4 h-4 text-[var(--link-academic)] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-[var(--text-primary)]">
                Deduplicação Determinística Multicritério:
              </span>{' '}
              <span>
                {deduplicationSummary.duplicatesRemoved} duplicatas removidas ({deduplicationSummary.mergedByDoi} por DOI canônico, {deduplicationSummary.mergedByPmidOrArxiv} por ID persistente, {deduplicationSummary.mergedByFuzzyTitle} por Jaro-Winkler). Restaram {deduplicationSummary.uniqueCount} artigos únicos.
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-[var(--text-muted)] mb-5">
          Exibindo {filteredPapers.length} de {papers.length} artigos científicos encontrados
        </div>

        <div className="space-y-7">
          {filteredPapers.map((paper) => {
            const isSaved = savedIds.has(paper.id);
            const isExpanded = Boolean(expandedAbstracts[paper.id]);
            const isStructuredExpanded = Boolean(expandedStructured[paper.id]);
            const meta = parseAbstractMetadata(paper.title, paper.abstractText, paper.publicationType);

            return (
              <article key={paper.id} className="group">
                {/* Title Row + Direct PDF Link (Google Scholar Pattern) */}
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[17px] font-semibold leading-snug">
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--link-academic)] hover:underline"
                    >
                      {paper.title}
                    </a>
                  </h3>

                  {paper.pdfUrl && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[13px] font-medium text-[var(--meta-green)] hover:underline"
                    >
                      [PDF] {paper.sourceLabel.split(' ')[0]}
                    </a>
                  )}
                </div>

                {/* Green Academic Metadata Line */}
                <div className="text-[13px] text-[var(--meta-green)] mt-0.5 mb-1.5 truncate">
                  <span>
                    {paper.authors.length > 0 ? paper.authors.slice(0, 4).join(', ') : t('noAuthors')}
                  </span>
                  {paper.venue && <span> - {paper.venue}</span>}
                  {paper.year && <span>, {paper.year}</span>}
                  <span> - {paper.sourceLabel}</span>
                </div>

                {/* Extracted Methodology & Study Design Badges (Deterministic) */}
                {(meta.studyDesign || meta.sampleSize) && (
                  <div className="flex flex-wrap items-center gap-1.5 my-2">
                    {meta.studyDesign && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--bg-subtle)] text-[var(--link-academic)]">
                        <Microscope className="w-3 h-3" />
                        {meta.studyDesign}
                      </span>
                    )}
                    {meta.sampleSize && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--bg-subtle)] text-[var(--meta-green)]">
                        <Users className="w-3 h-3" />
                        {meta.sampleSize}
                      </span>
                    )}
                  </div>
                )}

                {/* Abstract Snippet */}
                {paper.abstractText && (
                  <div className="mb-2">
                    <p
                      className={`text-[14px] text-[var(--text-secondary)] leading-relaxed ${
                        !isExpanded ? 'line-clamp-3' : ''
                      }`}
                    >
                      {paper.abstractText}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {paper.abstractText.length > 240 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAbstracts((prev) => ({
                              ...prev,
                              [paper.id]: !prev[paper.id],
                            }))
                          }
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          {isExpanded ? t('collapseAbstract') : t('readFullAbstract')}
                        </button>
                      )}

                      {meta.hasStructuredAbstract && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStructured((prev) => ({
                              ...prev,
                              [paper.id]: !prev[paper.id],
                            }))
                          }
                          className="inline-flex items-center gap-1 text-[var(--link-academic)] hover:underline cursor-pointer font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          <span>
                            {isStructuredExpanded
                              ? 'Ocultar Seções Estruturadas'
                              : 'Ver Resumo Estruturado'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Expandable Structured Abstract Card */}
                    {isStructuredExpanded && (
                      <div className="mt-2.5 p-3.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] space-y-2 text-xs">
                        {meta.objective && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Objetivo: </span>
                            <span className="text-[var(--text-secondary)]">{meta.objective}</span>
                          </div>
                        )}
                        {meta.methods && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Métodos / Casuística: </span>
                            <span className="text-[var(--text-secondary)]">{meta.methods}</span>
                          </div>
                        )}
                        {meta.results && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Resultados: </span>
                            <span className="text-[var(--text-secondary)]">{meta.results}</span>
                          </div>
                        )}
                        {meta.conclusion && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Conclusão: </span>
                            <span className="text-[var(--text-secondary)]">{meta.conclusion}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Borderless Academic Action Links Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-muted)]">
                  <button
                    type="button"
                    onClick={() => onToggleSave(paper)}
                    className={`inline-flex items-center gap-1 font-medium cursor-pointer transition-colors ${
                      isSaved
                        ? 'text-[var(--link-academic)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Salvo na biblioteca</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </>
                    )}
                  </button>

                  <span>
                    Citado por {paper.citationCount}
                  </span>

                  <div className="inline-flex items-center gap-2">
                    <span>Citar:</span>
                    {(['abnt', 'apa', 'bibtex'] as const).map((fmt) => {
                      const isCopied = copiedKey === `${paper.id}-${fmt}`;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleCopyCitation(paper, fmt)}
                          className="inline-flex items-center gap-0.5 uppercase text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--link-academic)] cursor-pointer"
                        >
                          {isCopied && <Check className="w-3 h-3 text-[var(--meta-green)]" />}
                          <span>{fmt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {paper.doi && (
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--text-primary)] hover:underline"
                    >
                      DOI
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
