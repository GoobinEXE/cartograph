import React, { useMemo, useState } from 'react';
import {
  ApiSourceId,
  DeduplicationSummary,
  LibraryGroup,
  NormalizedPaper,
  SavedPaperItem,
  SourceFetchStatus,
} from '../types/academic';
import {
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
} from '../utils/citationExporter';
import { parseAbstractMetadata } from '../utils/abstractParser';
import { useI18n } from '../i18n/context';
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Microscope,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

type FederatedSidebarSectionKey = 'slot' | 'sort' | 'access' | 'sources';
const STORAGE_KEY_FEDERATED_DRAWERS = 'cartograph_federated_sidebar_drawers_v1';

interface FederatedResultsPanelProps {
  papers: NormalizedPaper[];
  statuses: SourceFetchStatus[];
  isSearching: boolean;
  savedIds: Set<string>;
  savedPapers?: SavedPaperItem[];
  groups?: LibraryGroup[];
  activeSaveGroupId?: string | null;
  onSelectActiveSaveGroup?: (groupId: string | null) => void;
  onCreateGroup?: (name: string, color?: string) => LibraryGroup;
  onAssignPaperGroup?: (paperId: string, groupId: string | null) => void;
  onToggleSave: (paper: NormalizedPaper, targetGroupId?: string | null) => void;
  deduplicationSummary?: DeduplicationSummary | null;
}

export const FederatedResultsPanel: React.FC<FederatedResultsPanelProps> = ({
  papers,
  statuses,
  isSearching,
  savedIds,
  savedPapers = [],
  groups = [],
  activeSaveGroupId = null,
  onSelectActiveSaveGroup,
  onCreateGroup,
  onAssignPaperGroup,
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
  const [showQuickGroupInput, setShowQuickGroupInput] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');

  const [sidebarDrawers, setSidebarDrawers] = useState<
    Record<FederatedSidebarSectionKey, boolean>
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FEDERATED_DRAWERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            slot: parsed.slot !== false,
            sort: parsed.sort !== false,
            access: parsed.access !== false,
            sources: parsed.sources !== false,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return {
      slot: true,
      sort: true,
      access: true,
      sources: true,
    };
  });

  const toggleSidebarDrawer = (key: FederatedSidebarSectionKey) => {
    setSidebarDrawers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY_FEDERATED_DRAWERS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const allDrawersOpen = Object.values(sidebarDrawers).every(Boolean);

  const toggleAllSidebarDrawers = () => {
    const targetState = !allDrawersOpen;
    const next: Record<FederatedSidebarSectionKey, boolean> = {
      slot: targetState,
      sort: targetState,
      access: targetState,
      sources: targetState,
    };
    setSidebarDrawers(next);
    try {
      localStorage.setItem(STORAGE_KEY_FEDERATED_DRAWERS, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const activeSaveGroupObj = useMemo(
    () => (activeSaveGroupId ? groups.find((g) => g.id === activeSaveGroupId) ?? null : null),
    [groups, activeSaveGroupId]
  );

  const savedPaperGroupMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    savedPapers.forEach((sp) => {
      map[sp.id] = sp.groupId ?? null;
    });
    return map;
  }, [savedPapers]);

  const filteredPapers = useMemo(() => {
    let list = [...papers];
    if (onlyOpenAccess) {
      list = list.filter((p) => p.isOpenAccess);
    }
    if (selectedSource !== 'all') {
      list = list.filter(
        (p) => p.source === selectedSource || Boolean(p.sources?.includes(selectedSource))
      );
    }
    if (sortBy === 'citations') {
      list.sort((a, b) => b.citationCount - a.citationCount);
    } else if (sortBy === 'year') {
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    return list;
  }, [papers, onlyOpenAccess, selectedSource, sortBy]);

  const totalSources = statuses.length;
  const completedSources = statuses.filter(
    (st) => st.status === 'success' || st.status === 'error'
  ).length;
  const loadingSourcesCount = statuses.filter((st) => st.status === 'loading').length;
  const progressPercent =
    totalSources > 0 ? Math.round((completedSources / totalSources) * 100) : 0;

  const activeSourceStatus =
    selectedSource === 'all'
      ? null
      : statuses.find((st) => st.source === selectedSource) ?? null;

  const isActiveViewLoading =
    selectedSource === 'all'
      ? isSearching && (totalSources === 0 || loadingSourcesCount > 0)
      : isSearching && activeSourceStatus?.status === 'loading';

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

  const handleQuickCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickGroupName.trim();
    if (!trimmed || !onCreateGroup) return;
    const created = onCreateGroup(trimmed);
    if (onSelectActiveSaveGroup) {
      onSelectActiveSaveGroup(created.id);
    }
    setQuickGroupName('');
    setShowQuickGroupInput(false);
  };

  if (!isSearching && statuses.length === 0 && papers.length === 0) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto">
        <h3 className="text-[17px] font-semibold text-[var(--text-primary)] mb-2">
          {t('emptyFederatedTitle')}
        </h3>
        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
          {t('emptyFederatedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
      {/* Left Filter & Target Slot Column — Scroll Independente + Gavetas Retráteis */}
      <aside
        className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain pr-2 pb-6 select-none"
        aria-label="Filtros e navegação de artigos encontrados"
      >
        {/* Controle de Gavetas */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--divider)]">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Filtros & Navegação</span>
          </div>
          <button
            type="button"
            onClick={toggleAllSidebarDrawers}
            className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer font-medium"
            title={allDrawersOpen ? 'Recolher todas as gavetas' : 'Expandir todas as gavetas'}
          >
            {allDrawersOpen ? 'Recolher tudo' : 'Expandir tudo'}
          </button>
        </div>

        {/* Target Slot / Group Selector for Saving (Visual original preservado) */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-3.5 space-y-2.5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('slot')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('slot');
              }
            }}
            aria-expanded={sidebarDrawers.slot}
            className="w-full flex items-center justify-between gap-2 cursor-pointer group select-none text-left"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Folder className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                Salvar no Slot / Grupo
              </span>
              {activeSaveGroupObj && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] truncate max-w-[78px] shrink-0">
                  {activeSaveGroupObj.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeSaveGroupId && onSelectActiveSaveGroup && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectActiveSaveGroup(null);
                  }}
                  className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                  sidebarDrawers.slot ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </div>
          </div>

          {sidebarDrawers.slot && (
            <div className="space-y-2.5">
              {onCreateGroup && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowQuickGroupInput((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                    title="Criar novo slot de pesquisa"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </button>
                </div>
              )}

              <select
                value={activeSaveGroupId ?? ''}
                onChange={(e) => {
                  if (onSelectActiveSaveGroup) {
                    onSelectActiveSaveGroup(e.target.value ? e.target.value : null);
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
              >
                <option value="">Sem grupo (Geral)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Slot: {g.name}
                  </option>
                ))}
              </select>

              {showQuickGroupInput && (
                <form onSubmit={handleQuickCreateGroup} className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={quickGroupName}
                    onChange={(e) => setQuickGroupName(e.target.value)}
                    placeholder="Ex: Jogos de IA, Medicamentos..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowQuickGroupInput(false)}
                      className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!quickGroupName.trim()}
                      className="px-2.5 py-1 rounded-md bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Criar Slot
                    </button>
                  </div>
                </form>
              )}

              <p className="text-xs text-[var(--text-muted)] leading-snug">
                Escolha um grupo para organizar esta pesquisa ou mantenha em <strong>Sem grupo</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Sort Controls */}
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('sort')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('sort');
              }
            }}
            aria-expanded={sidebarDrawers.sort}
            className="w-full flex items-center justify-between py-1 px-1 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {t('sortByLabel')}
              </span>
              {sortBy !== 'relevance' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                  {sortBy === 'citations' ? 'Citações' : 'Ano'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {sortBy !== 'relevance' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSortBy('relevance');
                  }}
                  className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                  sidebarDrawers.sort ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </div>
          </div>

          {sidebarDrawers.sort && (
            <div className="space-y-0.5 text-[13.5px]">
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
          )}
        </div>

        {/* Access Filter (Visual original com checkbox preservado) */}
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('access')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('access');
              }
            }}
            aria-expanded={sidebarDrawers.access}
            className="w-full flex items-center justify-between py-1 px-1 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                Disponibilidade
              </span>
              {onlyOpenAccess && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                  Open Access
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onlyOpenAccess && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOnlyOpenAccess(false);
                  }}
                  className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                  sidebarDrawers.access ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </div>
          </div>

          {sidebarDrawers.access && (
            <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[13.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOpenAccess}
                onChange={(e) => setOnlyOpenAccess(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--link-academic)]"
              />
              <span>Somente Open Access</span>
            </label>
          )}
        </div>

        {/* Source Filter */}
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('sources')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('sources');
              }
            }}
            aria-expanded={sidebarDrawers.sources}
            className="w-full flex items-center justify-between py-1 px-1 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                Bases Consultadas
              </span>
              {selectedSource !== 'all' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] truncate max-w-[85px]">
                  {activeSourceStatus?.label.split(' ')[0] || selectedSource}
                </span>
              )}
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--link-academic)] shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedSource !== 'all' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSource('all');
                  }}
                  className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                  sidebarDrawers.sources ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </div>
          </div>

          {sidebarDrawers.sources && (
            <div className="space-y-0.5 text-[13.5px]">
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
                const isSourceError = st.status === 'error';
                const isSourceLoading = st.status === 'loading';
                return (
                  <button
                    key={st.source}
                    type="button"
                    onClick={() =>
                      setSelectedSource((prev) => (prev === st.source ? 'all' : st.source))
                    }
                    title={isSourceError ? st.errorMessage : st.label}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="truncate pr-2">{st.label.split(' ')[0]}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
                      {isSourceLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[var(--link-academic)]" />
                      ) : isSourceError ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500/80" />
                      ) : (
                        st.count
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Results Column — Classic Borderless Academic Stream */}
      <div className="max-w-3xl">
        {/* Sleek Top Linear Progress Bar during active streaming */}
        {isSearching && totalSources > 0 && (
          <div
            className="mb-3 h-[2px] w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da metabusca nas fontes científicas"
          >
            <div
              className="h-full bg-[var(--link-academic)] transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(8, progressPercent)}%` }}
            />
          </div>
        )}

        {/* Fixed-height Live Status Line (Zero Layout Shift during streaming) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--text-muted)] mb-5">
          <div className="flex items-center gap-2 min-w-0">
            {isActiveViewLoading && (
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--link-academic)] animate-pulse shrink-0" />
            )}
            <span>
              {isActiveViewLoading ? (
                selectedSource === 'all' ? (
                  <>
                    Consultando bases ({completedSources} de {totalSources})
                    {filteredPapers.length > 0 && ` · ${filteredPapers.length} artigos exibidos`}
                  </>
                ) : (
                  <>
                    Consultando {activeSourceStatus?.label ?? selectedSource}... ({completedSources} de{' '}
                    {totalSources} bases)
                  </>
                )
              ) : (
                <>
                  Exibindo {filteredPapers.length} de {papers.length} artigos científicos encontrados
                  {activeSourceStatus?.latencyMs ? ` · ${activeSourceStatus.label} (${activeSourceStatus.latencyMs} ms)` : ''}
                </>
              )}
            </span>
          </div>

          {deduplicationSummary && deduplicationSummary.duplicatesRemoved > 0 && (
            <span
              className="text-xs text-[var(--text-muted)] shrink-0"
              title={`${deduplicationSummary.mergedByDoi} por DOI canônico, ${deduplicationSummary.mergedByPmidOrArxiv} por ID persistente (PMID/arXiv), ${deduplicationSummary.mergedByFuzzyTitle} por título (Jaro-Winkler)`}
            >
              {deduplicationSummary.duplicatesRemoved} duplicatas mescladas
            </span>
          )}
        </div>

        {/* Minimalist Search Result Skeletons while waiting for first hits of the active view */}
        {filteredPapers.length === 0 && isActiveViewLoading && (
          <div className="space-y-7" aria-busy="true" aria-label="Carregando resultados">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="animate-pulse space-y-2.5">
                <div className="h-5 w-4/5 rounded bg-[var(--bg-secondary)]" />
                <div className="h-3.5 w-2/5 rounded bg-[var(--bg-secondary)]" />
                <div className="space-y-1.5 pt-1">
                  <div className="h-3.5 w-full rounded bg-[var(--bg-secondary)]" />
                  <div className="h-3.5 w-11/12 rounded bg-[var(--bg-secondary)]" />
                </div>
                <div className="h-3.5 w-1/3 rounded bg-[var(--bg-secondary)] pt-0.5" />
              </div>
            ))}
          </div>
        )}

        {/* Explicit Empty / Error Feedback when selected base or filter has 0 results */}
        {filteredPapers.length === 0 && !isActiveViewLoading && (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 text-sm text-[var(--text-secondary)] space-y-2.5">
            {activeSourceStatus?.status === 'error' ? (
              <>
                <div className="font-semibold text-[var(--text-primary)]">
                  Consulta não concluída em {activeSourceStatus.label}
                </div>
                <p className="text-[13.5px] text-[var(--text-primary)] leading-relaxed">
                  {activeSourceStatus.errorMessage || 'O tempo limite de resposta da base foi atingido.'}
                </p>
                {activeSourceStatus.errorDetail && (
                  <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                    {activeSourceStatus.errorDetail}
                  </p>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSource('all')}
                    className="text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                  >
                    Voltar para &ldquo;Todas as fontes&rdquo;
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-[var(--text-primary)]">
                  Nenhum artigo encontrado nesta visualização
                </div>
                <p className="text-[13.5px] text-[var(--text-muted)]">
                  {onlyOpenAccess
                    ? 'Nenhum artigo com acesso aberto direto corresponde aos filtros atuais. Desmarque "Somente Open Access" para ampliar.'
                    : selectedSource !== 'all'
                    ? `${activeSourceStatus?.label ?? 'Esta base'} concluiu sem correspondências para esta consulta.`
                    : 'Nenhuma das bases consultadas retornou correspondências para os termos informados.'}
                </p>
              </>
            )}
          </div>
        )}

        <div className="space-y-7">
          {filteredPapers.map((paper) => {
            const isSaved = savedIds.has(paper.id);
            const assignedGroupId = savedPaperGroupMap[paper.id] ?? null;
            const isExpanded = Boolean(expandedAbstracts[paper.id]);
            const isStructuredExpanded = Boolean(expandedStructured[paper.id]);
            const meta = parseAbstractMetadata(paper.title, paper.abstractText, paper.publicationType);

            return (
              <article key={paper.id} className="group">
                {/* Title Row + Direct PDF Link (Google Scholar Pattern) */}
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[19px] font-medium leading-snug">
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
                <div className="text-[13px] text-[var(--meta-green)] mt-1 mb-1 truncate">
                  <span>
                    {paper.authors.length > 0 ? paper.authors.slice(0, 4).join(', ') : t('noAuthors')}
                  </span>
                  {paper.venue && <span> - {paper.venue}</span>}
                  {paper.year && <span>, {paper.year}</span>}
                  <span> - {paper.sourceLabel}</span>
                </div>

                {/* Extracted Methodology & Study Design Badges (Deterministic) */}
                {(meta.studyDesign || meta.sampleSize) && (
                  <div className="flex flex-wrap items-center gap-1.5 my-1.5">
                    {meta.studyDesign && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-subtle)] text-[var(--link-academic)]">
                        <Microscope className="w-3 h-3" />
                        {meta.studyDesign}
                      </span>
                    )}
                    {meta.sampleSize && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-subtle)] text-[var(--meta-green)]">
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
                      className={`text-[15px] text-[var(--text-secondary)] leading-relaxed ${
                        !isExpanded ? 'line-clamp-3' : ''
                      }`}
                    >
                      {paper.abstractText}
                    </p>
                    <div className="flex items-center gap-3.5 mt-1 text-[13.5px]">
                      {paper.abstractText.length > 240 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAbstracts((prev) => ({
                              ...prev,
                              [paper.id]: !prev[paper.id],
                            }))
                          }
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer font-medium"
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
                          <FileText className="w-3.5 h-3.5" />
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
                      <div className="mt-2.5 p-3.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] space-y-2 text-[13.5px]">
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleSave(paper, activeSaveGroupId)}
                      className={`inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors ${
                        isSaved
                          ? 'text-[var(--link-academic)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="w-4 h-4" />
                          <span>Salvo</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>
                            Salvar
                            {activeSaveGroupId &&
                              groups.find((g) => g.id === activeSaveGroupId) &&
                              ` em "${groups.find((g) => g.id === activeSaveGroupId)?.name}"`}
                          </span>
                        </>
                      )}
                    </button>

                    {/* If saved, allow switching its group directly from search results */}
                    {isSaved && onAssignPaperGroup && (
                      <select
                        value={assignedGroupId ?? ''}
                        onChange={(e) =>
                          onAssignPaperGroup(paper.id, e.target.value ? e.target.value : null)
                        }
                        className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs font-medium text-[var(--text-primary)] cursor-pointer"
                        title="Alterar grupo / slot deste artigo"
                      >
                        <option value="">Sem grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            Slot: {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

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
                          className="inline-flex items-center gap-1 uppercase text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--link-academic)] cursor-pointer"
                        >
                          {isCopied && <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />}
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

        {/* Subtle bottom indicator while remaining bases finish loading */}
        {isActiveViewLoading && filteredPapers.length > 0 && (
          <div className="mt-7 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--link-academic)]" />
            <span>
              Aguardando mais {loadingSourcesCount}{' '}
              {loadingSourcesCount === 1 ? 'base científica...' : 'bases científicas...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
