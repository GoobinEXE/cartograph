import React, { useMemo, useState } from 'react';
import {
  AccessSettingsTab,
  ApiSourceId,
  DeduplicationSummary,
  InstitutionalProxyConfig,
  MergeClusterEntry,
  NormalizedPaper,
  RelevanceBreakdown,
  SavedPaperItem,
  SourceFetchStatus,
  ThematicArea,
  UserAccessConfig,
} from '../types/academic';
import {
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
} from '../utils/citationExporter';
import { parseAbstractMetadata } from '../utils/abstractParser';
import { partitionResultsAgainstLibrary } from '../utils/deduplication';
import { LAYOUT_STORAGE_KEYS } from '../utils/layoutPreferences';
import { buildDoiProxyUrl } from '../utils/institutionalProxy';
import { rankPapersByRelevance } from '../utils/relevanceRanker';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { copyTextSafely } from '../utils/fileDownload';
import { resolveUnpaywallPdf } from '../services/unpaywallResolver';
import { useI18n } from '../i18n/context';
import { useWorkspace } from '../state/workspace';
import { CitationChaserModal } from './CitationChaserModal';
import { MergeInspectorModal } from './MergeInspectorModal';
import { UnifiedAreaFilterDrawer } from './UnifiedAreaFilterDrawer';
import { UserWorkspaceSection } from './UserWorkspaceSection';
import { CollapsibleSection, SidebarDrawersHeader } from './ui/CollapsibleSection';
import { usePersistedDrawers } from './ui/usePersistedDrawers';
import { ResponsiveSidebar } from './ui/ResponsiveSidebar';
import { MobileSheet } from './ui/MobileSheet';
import { PaperActionSheet } from './search/PaperActionSheet';
import { ImradReaderSheet } from './search/ImradReaderSheet';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Check,
  ExternalLink,
  FileSearch,
  FileText,
  Folder,
  FolderPlus,
  GitBranch,
  GitMerge,
  Loader2,
  Microscope,
  MoreHorizontal,
  Users,
} from 'lucide-react';

/** Exhaustive collision-free short labels for all 34 federated sources in compact chips/badges. */
const SHORT_SOURCE_LABELS: Record<ApiSourceId, string> = {
  openalex: 'OpenAlex',
  semanticscholar: 'Semantic Scholar',
  pubmed: 'PubMed',
  europepmc: 'Europe PMC',
  arxiv: 'arXiv',
  crossref: 'Crossref',
  doaj: 'DOAJ',
  zenodo: 'Zenodo',
  hal: 'HAL Science',
  datacite: 'DataCite',
  inspire: 'INSPIRE-HEP',
  figshare: 'Figshare',
  gbif: 'GBIF',
  osti: 'OSTI.GOV',
  ntrs: 'NASA NTRS',
  openaire: 'OpenAIRE',
  osf: 'OSF Preprints',
  eric: 'ERIC',
  plos: 'PLOS',
  oasisbr: 'Oasisbr',
  dataverse: 'Harvard DV',
  core: 'CORE',
  worldbank_wds: 'World Bank',
  worldbank_okr: 'WB OKR',
  socarxiv: 'SocArXiv',
  ipea: 'IPEA',
  undl: 'UN Digital',
  scopus: 'Scopus',
  sciencedirect: 'ScienceDirect',
  ieeexplore: 'IEEE Xplore',
  springer: 'Springer',
  lens: 'The Lens',
  fedinprint: 'Fed in Print',
  govinfo: 'Congress.gov',
};

function getShortSourceLabel(source: ApiSourceId, fallbackLabel: string): string {
  return SHORT_SOURCE_LABELS[source] || fallbackLabel;
}

type FederatedSidebarSectionKey = 'areas' | 'slot' | 'sort' | 'access' | 'sources';

const FEDERATED_SIDEBAR_DRAWER_DEFAULTS: Record<FederatedSidebarSectionKey, boolean> = {
  areas: true,
  slot: true,
  sort: true,
  access: true,
  sources: true,
};

const FEDERATED_DRAWER_HEADER_CLASS =
  'w-full flex items-center justify-between py-1.5 px-2 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] select-none text-left';

/** Search-session data from App; library data (saved papers, groups, save target) comes from the workspace store. */
interface FederatedResultsPanelProps {
  papers: NormalizedPaper[];
  searchQuery?: string;
  statuses: SourceFetchStatus[];
  isSearching: boolean;
  deduplicationSummary?: DeduplicationSummary | null;
  dedupEnabled?: boolean;
  onToggleDedup?: (next: boolean) => void;
  mergeClusters?: MergeClusterEntry[];
  institutionalProxy?: InstitutionalProxyConfig;
  selectedArea: 'all' | ThematicArea;
  onSelectArea: (area: 'all' | ThematicArea) => void;
  userAccessConfig: UserAccessConfig;
  onOpenAccessSettings: (tab?: AccessSettingsTab) => void;
}

export const FederatedResultsPanel: React.FC<FederatedResultsPanelProps> = ({
  papers,
  searchQuery = '',
  statuses,
  isSearching,
  deduplicationSummary,
  dedupEnabled = true,
  onToggleDedup,
  mergeClusters = [],
  institutionalProxy,
  selectedArea,
  onSelectArea,
  userAccessConfig,
  onOpenAccessSettings,
}) => {
  const { language, t } = useI18n();
  const { state: workspace, actions: workspaceActions } = useWorkspace();
  const { savedPapers, libraryGroups: groups, activeSaveGroupId } = workspace;
  const savedIds = useMemo(() => new Set(savedPapers.map((sp) => sp.id)), [savedPapers]);
  const onToggleSave = workspaceActions.toggleSavePaper;
  const [onlyOpenAccess, setOnlyOpenAccess] = useState(false);
  const [hideAlreadySaved, setHideAlreadySaved] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'all' | ApiSourceId>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'citations' | 'year'>('relevance');
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});
  const [expandedStructured, setExpandedStructured] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQuickGroupInput, setShowQuickGroupInput] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorFocusClusterId, setInspectorFocusClusterId] = useState<string | null>(null);
  const [chaseSeedPaper, setChaseSeedPaper] = useState<NormalizedPaper | null>(null);
  const [unpaywallState, setUnpaywallState] = useState<
    Record<string, { status: 'loading' | 'found' | 'not_found'; pdfUrl?: string }>
  >({});
  const [actionSheetPaper, setActionSheetPaper] = useState<NormalizedPaper | null>(null);
  const [imradReaderPaper, setImradReaderPaper] = useState<NormalizedPaper | null>(null);
  const [scoreSheetEntry, setScoreSheetEntry] = useState<{
    paper: NormalizedPaper;
    breakdown: RelevanceBreakdown;
  } | null>(null);

  const handleFindUnpaywallPdf = async (paper: NormalizedPaper) => {
    if (!paper.doi) return;
    setUnpaywallState((prev) => ({ ...prev, [paper.id]: { status: 'loading' } }));
    const res = await resolveUnpaywallPdf(paper.doi, userAccessConfig?.unpaywallEmail);
    const resolvedPdf = res.bestPdfUrl || res.bestLandingUrl;
    if (res.ok && resolvedPdf) {
      setUnpaywallState((prev) => ({
        ...prev,
        [paper.id]: { status: 'found', pdfUrl: resolvedPdf },
      }));
    } else {
      setUnpaywallState((prev) => ({ ...prev, [paper.id]: { status: 'not_found' } }));
    }
  };

  const {
    drawers: sidebarDrawers,
    allDrawersOpen,
    toggleDrawer: toggleSidebarDrawer,
    toggleAllDrawers: toggleAllSidebarDrawers,
  } = usePersistedDrawers(LAYOUT_STORAGE_KEYS.federatedSidebarDrawers, FEDERATED_SIDEBAR_DRAWER_DEFAULTS);

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

  const scopedSavedPapers = useMemo(
    () =>
      activeSaveGroupId
        ? savedPapers.filter((sp) => sp.groupId === activeSaveGroupId)
        : savedPapers,
    [savedPapers, activeSaveGroupId]
  );

  const libraryDiff = useMemo(
    () => partitionResultsAgainstLibrary(papers, scopedSavedPapers),
    [papers, scopedSavedPapers]
  );

  const matchedSavedByPaperId = useMemo(() => {
    const map = new Map<string, SavedPaperItem>();
    libraryDiff.matched.forEach(({ paper, existingItem }) => {
      map.set(paper.id, existingItem);
    });
    return map;
  }, [libraryDiff]);

  const mergeClusterByPaperId = useMemo(() => {
    const map = new Map<string, MergeClusterEntry>();
    mergeClusters.forEach((cluster) => {
      map.set(cluster.mergedPaperId, cluster);
    });
    return map;
  }, [mergeClusters]);

  const { filteredPapers, relevanceBreakdownMap } = useMemo(() => {
    let list = hideAlreadySaved ? [...libraryDiff.unseen] : [...papers];
    if (onlyOpenAccess) {
      list = list.filter((p) => p.isOpenAccess);
    }
    if (selectedSource !== 'all') {
      list = list.filter(
        (p) => p.source === selectedSource || Boolean(p.sources?.includes(selectedSource))
      );
    }
    const breakdownMap: Record<string, RelevanceBreakdown> = {};
    if (sortBy === 'relevance') {
      const ranked = rankPapersByRelevance(list, searchQuery);
      ranked.forEach(({ paper, breakdown }) => {
        breakdownMap[paper.id] = breakdown;
      });
      return {
        filteredPapers: ranked.map((r) => r.paper),
        relevanceBreakdownMap: breakdownMap,
      };
    }
    if (sortBy === 'citations') {
      list.sort((a, b) => b.citationCount - a.citationCount);
    } else if (sortBy === 'year') {
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    return { filteredPapers: list, relevanceBreakdownMap: breakdownMap };
  }, [papers, libraryDiff.unseen, hideAlreadySaved, searchQuery, onlyOpenAccess, selectedSource, sortBy]);

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
    const ok = await copyTextSafely(text);
    if (!ok) return;
    const key = `${paper.id}-${format}`;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleQuickCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickGroupName.trim();
    if (!trimmed) return;
    const created = workspaceActions.createGroup(trimmed);
    workspaceActions.setActiveSaveGroup(created.id);
    setQuickGroupName('');
    setShowQuickGroupInput(false);
  };

  const imradReaderMetadata = useMemo(
    () =>
      imradReaderPaper
        ? parseAbstractMetadata(
            imradReaderPaper.title,
            imradReaderPaper.abstractText,
            imradReaderPaper.publicationType,
            language
          )
        : null,
    [imradReaderPaper, language]
  );

  const isEmptyIdle = !isSearching && statuses.length === 0 && papers.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 xl:gap-8 items-start">
      {/* Left Filter & Target Slot Column — Scroll Independente + Gavetas Retráteis */}
      <ResponsiveSidebar ariaLabel={t('federatedSidebarAria')} triggerLabel={t('mobileFiltersBtn')}>
        <SidebarDrawersHeader allOpen={allDrawersOpen} onToggleAll={toggleAllSidebarDrawers} />

        {/* 1. Sort Controls (Primary ordering control — top priority) */}
        <CollapsibleSection
          isOpen={sidebarDrawers.sort}
          onToggle={() => toggleSidebarDrawer('sort')}
          className="border-b border-[var(--divider)] pb-3"
          headerClassName={FEDERATED_DRAWER_HEADER_CLASS}
          contentClassName="space-y-0.5 text-[13.5px]"
          title={
            <>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {t('sortByLabel')}
              </span>
              {sortBy !== 'relevance' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                  {sortBy === 'citations' ? t('sortShortCitations') : t('sortShortYear')}
                </span>
              )}
            </>
          }
          actions={
            sortBy !== 'relevance' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSortBy('relevance');
                }}
                className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
              >
                {t('clearFilter')}
              </button>
            )
          }
        >
          {(['relevance', 'citations', 'year'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortBy(mode)}
              className={`w-full min-h-11 md:min-h-0 text-left px-2.5 py-2 md:py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation ${
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
          {sortBy === 'relevance' && (
            <p className="px-2.5 pt-1 text-[11px] leading-snug text-[var(--text-muted)]">
              {t('relevanceMethodCaption')}
            </p>
          )}
        </CollapsibleSection>

        {/* 2. Access & Deduplication Toggles (High-frequency screening filters) */}
        <CollapsibleSection
          isOpen={sidebarDrawers.access}
          onToggle={() => toggleSidebarDrawer('access')}
          className="border-b border-[var(--divider)] pb-3"
          headerClassName={FEDERATED_DRAWER_HEADER_CLASS}
          contentClassName="space-y-1"
          title={
            <>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {t('availabilityTitle')}
              </span>
              {onlyOpenAccess && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                  Open Access
                </span>
              )}
            </>
          }
          actions={
            onlyOpenAccess && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOnlyOpenAccess(false);
                }}
                className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
              >
                {t('clearFilter')}
              </button>
            )
          }
        >
          <label className="flex items-center gap-2.5 min-h-11 md:min-h-0 px-2.5 py-2 md:py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[14px] md:text-[13.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOpenAccess}
              onChange={(e) => setOnlyOpenAccess(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--link-academic)]"
            />
            <span>{t('availabilityOpenAccessOnly')}</span>
          </label>

          <label
            className="flex items-center justify-between gap-2 min-h-11 md:min-h-0 px-2.5 py-2 md:py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[14px] md:text-[13.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none"
            title={t('livingDiffTitle')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <input
                type="checkbox"
                checked={hideAlreadySaved}
                onChange={(e) => setHideAlreadySaved(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--link-academic)] shrink-0"
              />
              <span className="truncate">{t('hideAlreadySavedLabel')}</span>
            </span>
            {libraryDiff.matched.length > 0 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] shrink-0 tabular-nums">
                {libraryDiff.matched.length}
              </span>
            )}
          </label>
        </CollapsibleSection>

        {/* 3. Unified Field & Metasearch Scope Drawer */}
        <UnifiedAreaFilterDrawer
          selectedArea={selectedArea}
          onSelectArea={onSelectArea}
          isOpen={sidebarDrawers.areas}
          onToggleOpen={() => toggleSidebarDrawer('areas')}
          mode="metasearch"
          accessConfig={userAccessConfig}
        />

        {/* 4. Source Filter */}
        {statuses.length > 0 && (
          <CollapsibleSection
            isOpen={sidebarDrawers.sources}
            onToggle={() => toggleSidebarDrawer('sources')}
            className="border-b border-[var(--divider)] pb-3"
            headerClassName="w-full flex items-center justify-between py-1 px-1 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] select-none text-left"
            contentClassName="space-y-0.5 text-[13.5px]"
            title={
              <>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {t('queriedSourcesTitle')}
                </span>
                {selectedSource !== 'all' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] truncate max-w-[115px]">
                    {activeSourceStatus
                      ? getShortSourceLabel(activeSourceStatus.source, activeSourceStatus.label)
                      : selectedSource}
                  </span>
                )}
                {isSearching && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--link-academic)] shrink-0" />
                )}
              </>
            }
            actions={
              selectedSource !== 'all' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSource('all');
                  }}
                  className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  {t('clearFilter')}
                </button>
              )
            }
          >
            <button
              type="button"
              onClick={() => setSelectedSource('all')}
              className={`w-full min-h-10 md:min-h-0 flex items-center justify-between px-2.5 py-2 md:py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                selectedSource === 'all'
                  ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{t('allSourcesOption')}</span>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">{papers.length}</span>
            </button>

            {statuses.map((st) => {
              const isSelected = selectedSource === st.source;
              const isSourceError = st.status === 'error';
              const isSourceLoading = st.status === 'loading';
              const shortLabel = getShortSourceLabel(st.source, st.label);
              return (
                <button
                  key={st.source}
                  type="button"
                  onClick={() =>
                    setSelectedSource((prev) => (prev === st.source ? 'all' : st.source))
                  }
                  title={isSourceError ? st.errorMessage : st.label}
                  className={`w-full min-h-10 md:min-h-0 flex items-center justify-between px-2.5 py-2 md:py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                    isSelected
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate pr-2">{shortLabel}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0 tabular-nums">
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
          </CollapsibleSection>
        )}

        {/* 5. Target Slot / Group Selector for Saving (Workflow destination) */}
        <CollapsibleSection
          isOpen={sidebarDrawers.slot}
          onToggle={() => toggleSidebarDrawer('slot')}
          className="bg-[var(--bg-secondary)] rounded-2xl p-3.5 space-y-2.5"
          headerClassName="w-full flex items-center justify-between gap-2 cursor-pointer select-none text-left"
          titleClassName="flex items-center gap-1.5 min-w-0"
          contentClassName="space-y-2.5"
          title={
            <>
              <Folder className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                {t('saveToSlotTitle')}
              </span>
              {activeSaveGroupObj && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] truncate max-w-[78px] shrink-0">
                  {activeSaveGroupObj.name}
                </span>
              )}
            </>
          }
          actions={
            activeSaveGroupId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  workspaceActions.setActiveSaveGroup(null);
                }}
                className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
              >
                {t('clearFilter')}
              </button>
            )
          }
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowQuickGroupInput((v) => !v)}
              className="inline-flex items-center gap-1 min-h-10 md:min-h-0 px-2 md:px-0 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
              title={t('createNewSlotTitle')}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{t('newBtn')}</span>
            </button>
          </div>

          <select
            value={activeSaveGroupId ?? ''}
            onChange={(e) => workspaceActions.setActiveSaveGroup(e.target.value ? e.target.value : null)}
            className="w-full min-h-11 md:min-h-0 px-2.5 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-base md:text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
          >
            <option value="">{t('ungroupedOption')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {t('slotPrefix')} {g.name}
              </option>
            ))}
          </select>

          {showQuickGroupInput && (
            <form onSubmit={handleQuickCreateGroup} className="space-y-2 pt-1">
              <input
                type="text"
                value={quickGroupName}
                onChange={(e) => setQuickGroupName(e.target.value)}
                placeholder={t('slotPlaceholder')}
                enterKeyHint="done"
                className="w-full min-h-11 md:min-h-0 px-2.5 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowQuickGroupInput(false)}
                  className="min-h-10 md:min-h-0 px-3 md:px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={!quickGroupName.trim()}
                  className="min-h-10 md:min-h-0 px-3.5 md:px-2.5 py-1 rounded-md bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {t('createSlotBtn')}
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-[var(--text-muted)] leading-snug">
            {t('slotHelperPrefix')} <strong>{t('slotHelperUngrouped')}</strong>.
          </p>
        </CollapsibleSection>

        {/* User Preferences & Access Workspace (Tagged for future User System) */}
        <UserWorkspaceSection
          config={userAccessConfig}
          onOpenAccessSettings={onOpenAccessSettings}
        />
      </ResponsiveSidebar>

      {/* Main Results Column — Classic Borderless Academic Stream */}
      <div className="min-w-0 w-full max-w-3xl">
        {isEmptyIdle ? (
          <div className="py-14 text-center max-w-lg mx-auto">
            <h3 className="text-[17px] font-semibold text-[var(--text-primary)] mb-2">
              {t('emptyFederatedTitle')}
            </h3>
            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
              {t('emptyFederatedDesc')}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Sticky Quick Sort & Screening Chip Strip */}
            <div
              className="lg:hidden sticky top-0 md:static z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 mb-3 bg-[var(--bg-canvas)]/95 glass-chrome border-b border-[var(--divider)] md:border-b-0 overflow-x-auto no-scrollbar flex items-center gap-2 py-1.5"
              role="region"
              aria-label={t('sortByLabel')}
            >
              {(
                [
                  { id: 'relevance', label: t('quickSortRelevance') },
                  { id: 'citations', label: t('quickSortCitations') },
                  { id: 'year', label: t('quickSortYear') },
                ] as const
              ).map((opt) => {
                const active = sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSortBy(opt.id)}
                    className={`min-h-10 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                      active
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                        : 'bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}

              <span className="w-px h-5 bg-[var(--divider)] shrink-0" aria-hidden="true" />

              <button
                type="button"
                aria-pressed={onlyOpenAccess}
                onClick={() => setOnlyOpenAccess((prev) => !prev)}
                className={`min-h-10 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                  onlyOpenAccess
                    ? 'bg-[var(--accent-blue-tint)] border border-[var(--link-academic)]/40 text-[var(--link-academic)]'
                    : 'bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {t('quickFilterOaOnly')}
              </button>

              <button
                type="button"
                aria-pressed={hideAlreadySaved}
                onClick={() => setHideAlreadySaved((prev) => !prev)}
                className={`min-h-10 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                  hideAlreadySaved
                    ? 'bg-[var(--accent-blue-tint)] border border-[var(--link-academic)]/40 text-[var(--link-academic)]'
                    : 'bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>{t('quickFilterHideSaved')}</span>
                {libraryDiff.matched.length > 0 && (
                  <span className="text-[11px] font-mono tabular-nums opacity-80">
                    ({libraryDiff.matched.length})
                  </span>
                )}
              </button>
            </div>

            {/* Sleek Top Linear Progress Bar during active streaming */}
        {isSearching && totalSources > 0 && (
          <div
            className="mb-3 h-[2px] w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('progressAriaLabel')}
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
                    {t('queryingAllProgress', { completed: completedSources, total: totalSources })}
                    {filteredPapers.length > 0 &&
                      ` ${t('papersDisplayedSuffix', { count: filteredPapers.length })}`}
                  </>
                ) : (
                  <>
                    {t('queryingSourceProgress', {
                      label: activeSourceStatus?.label ?? selectedSource,
                      completed: completedSources,
                      total: totalSources,
                    })}
                  </>
                )
              ) : (
                <>
                  {t('showingResultsSummary', {
                    displayed: filteredPapers.length,
                    total: papers.length,
                  })}
                  {activeSourceStatus?.latencyMs
                    ? ` · ${activeSourceStatus.label} (${activeSourceStatus.latencyMs} ms)`
                    : ''}
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 w-full sm:w-auto sm:shrink-0">
            {deduplicationSummary && deduplicationSummary.originalCount > 1 && (
              <span
                className="text-xs text-[var(--text-muted)]"
                title={t('duplicatesMergedTitle', {
                  doi: deduplicationSummary.mergedByDoi,
                  ids: deduplicationSummary.mergedByPmidOrArxiv,
                  fuzzy: deduplicationSummary.mergedByFuzzyTitle,
                })}
              >
                {dedupEnabled
                  ? deduplicationSummary.duplicatesRemoved > 0
                    ? t('duplicatesMergedCount', { count: deduplicationSummary.duplicatesRemoved })
                    : null
                  : t('dedupDisabledBanner', { count: deduplicationSummary.duplicatesRemoved })}
              </span>
            )}

            {dedupEnabled && mergeClusters.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setInspectorFocusClusterId(null);
                  setInspectorOpen(true);
                }}
                className="inline-flex items-center gap-1 min-h-10 md:min-h-0 px-2 md:px-0 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{t('inspectMergesBtn', { count: mergeClusters.length })}</span>
              </button>
            )}

            {onToggleDedup && (
              <button
                type="button"
                role="switch"
                aria-checked={dedupEnabled}
                onClick={() => onToggleDedup(!dedupEnabled)}
                title={t('dedupToggleTitle')}
                className="inline-flex items-center gap-1.5 min-h-10 md:min-h-0 px-3 md:px-2.5 py-1 rounded-full border border-[var(--divider)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    dedupEnabled ? 'bg-[var(--meta-green)]' : 'bg-[var(--text-muted)]'
                  }`}
                />
                <span>{t('dedupToggleLabel')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimalist Search Result Skeletons while waiting for first hits of the active view */}
        {filteredPapers.length === 0 && isActiveViewLoading && (
          <div className="space-y-7" aria-busy="true" aria-label={t('loadingResultsAria')}>
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
                  {t('sourceErrorTitle', { label: activeSourceStatus.label })}
                </div>
                <p className="text-[13.5px] text-[var(--text-primary)] leading-relaxed">
                  {activeSourceStatus.errorMessage || t('sourceTimeoutFallback')}
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
                    className="min-h-10 md:min-h-0 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                  >
                    {t('backToAllSources')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-[var(--text-primary)]">
                  {t('noPapersInViewTitle')}
                </div>
                <p className="text-[13.5px] text-[var(--text-muted)]">
                  {hideAlreadySaved && libraryDiff.matched.length > 0
                    ? t('noUnseenMatchDesc')
                    : onlyOpenAccess
                    ? t('noOpenAccessMatchDesc')
                    : selectedSource !== 'all'
                    ? t('noSourceMatchDesc', {
                        label: activeSourceStatus?.label ?? t('noSourceFallbackName'),
                      })
                    : t('noAllSourcesMatchDesc')}
                </p>
              </>
            )}
          </div>
        )}

        <div className="space-y-6 md:space-y-7">
          {filteredPapers.map((paper) => {
            const isSaved = savedIds.has(paper.id);
            const assignedGroupId = savedPaperGroupMap[paper.id] ?? null;
            const isExpanded = Boolean(expandedAbstracts[paper.id]);
            const isStructuredExpanded = Boolean(expandedStructured[paper.id]);
            const meta = parseAbstractMetadata(
              paper.title,
              paper.abstractText,
              paper.publicationType,
              language
            );
            const relevance = relevanceBreakdownMap[paper.id];
            const safePaperUrl = sanitizeExternalUrl(paper.url);
            const safePdfUrl = sanitizeExternalUrl(paper.pdfUrl);
            const unpaywallEntry = unpaywallState[paper.id];
            const resolvedUnpaywallUrl = sanitizeExternalUrl(unpaywallEntry?.pdfUrl);
            const safeRetractionUrl = sanitizeExternalUrl(paper.retractionNoticeUrl);
            const safeProxyDoiUrl = institutionalProxy
              ? sanitizeExternalUrl(buildDoiProxyUrl(paper.doi, institutionalProxy))
              : null;
            const cleanDoi = paper.doi
              ? paper.doi
                  .trim()
                  .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
                  .replace(/^doi:\s*/i, '')
              : null;
            const safeDoiUrl = cleanDoi ? sanitizeExternalUrl(`https://doi.org/${cleanDoi}`) : null;
            const shortSourceLabel = getShortSourceLabel(paper.source, paper.sourceLabel);
            const mergeCluster = dedupEnabled ? mergeClusterByPaperId.get(paper.id) : undefined;
            const matchedSavedItem = !hideAlreadySaved
              ? matchedSavedByPaperId.get(paper.id)
              : undefined;
            const mobilePrimaryUrl =
              safePdfUrl || resolvedUnpaywallUrl || safeProxyDoiUrl || safePaperUrl || safeDoiUrl;
            const mobilePrimaryLabel = safePdfUrl
              ? t('freePdf')
              : resolvedUnpaywallUrl
              ? t('unpaywallFoundBadge')
              : safeProxyDoiUrl
              ? t('proxyDoiButton')
              : t('openPage');
            const authorsDisplay =
              paper.authors.length > 0 ? paper.authors.slice(0, 4).join(', ') : t('noAuthors');

            return (
              <article
                key={paper.id}
                className="group content-auto-card pb-6 border-b border-[var(--divider)] last:border-b-0 last:pb-0 md:pb-0 md:border-b-0"
              >
                {paper.isRetracted && (
                  <div className="mb-1.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-600/15 border border-rose-500/35 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('retractedBadge')}</span>
                    {safeRetractionUrl && (
                      <a
                        href={safeRetractionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline ml-1"
                      >
                        {t('retractionNoticeLink')}
                      </a>
                    )}
                  </div>
                )}

                {/* Title Row + Direct PDF / Institutional Proxy Links (Desktop Google Scholar Pattern) */}
                <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 md:gap-4">
                  <h3 className="text-[17px] sm:text-[19px] font-medium leading-snug break-words">
                    {safePaperUrl ? (
                      <a
                        href={safePaperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--link-academic)] hover:underline"
                      >
                        {paper.title}
                      </a>
                    ) : (
                      <span className="text-[var(--text-primary)]">{paper.title}</span>
                    )}
                  </h3>

                  <div className="hidden md:flex flex-wrap items-center gap-x-2.5 gap-y-1 md:shrink-0">
                    {safePdfUrl && (
                      <a
                        href={safePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-medium text-[var(--meta-green)] hover:underline"
                      >
                        [PDF] {shortSourceLabel}
                      </a>
                    )}
                    {!safePdfUrl && resolvedUnpaywallUrl && (
                      <a
                        href={resolvedUnpaywallUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        [{t('unpaywallFoundBadge')}]
                      </a>
                    )}
                    {!safePdfUrl && !resolvedUnpaywallUrl && paper.doi && (
                      <button
                        type="button"
                        disabled={unpaywallEntry?.status === 'loading'}
                        onClick={() => handleFindUnpaywallPdf(paper)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer disabled:opacity-50"
                        title={
                          unpaywallEntry?.status === 'not_found'
                            ? t('unpaywallNotFoundMsg')
                            : t('findOaPdfBtn')
                        }
                      >
                        {unpaywallEntry?.status === 'loading' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <FileSearch className="w-3 h-3" />
                        )}
                        <span>
                          {unpaywallEntry?.status === 'not_found'
                            ? t('unpaywallNotFoundMsg')
                            : t('findOaPdfBtn')}
                        </span>
                      </button>
                    )}
                    {safeProxyDoiUrl && (
                      <a
                        href={safeProxyDoiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-medium text-[var(--link-academic)] hover:underline"
                      >
                        {t('proxyDoiButton')}
                      </a>
                    )}
                  </div>
                </div>

                {/* Green Academic Metadata: 2 compact lines on mobile (preserving Year & Source), 1 line on desktop */}
                <div className="text-[13px] text-[var(--meta-green)] mt-1 mb-1.5 flex flex-col gap-0.5 md:block md:truncate">
                  <span className="truncate md:inline">{authorsDisplay}</span>
                  <span className="flex items-center gap-x-1.5 min-w-0 md:inline">
                    {paper.venue && (
                      <>
                        <span className="hidden md:inline"> - </span>
                        <span className="truncate min-w-0 md:inline">{paper.venue}</span>
                      </>
                    )}
                    {paper.year && (
                      <span className="shrink-0 tabular-nums font-medium md:font-normal">
                        <span className="hidden md:inline">, </span>
                        {paper.venue && <span className="md:hidden">· </span>}
                        {paper.year}
                      </span>
                    )}
                    <span className="shrink-0">
                      <span className="hidden md:inline"> - </span>
                      {(paper.venue || paper.year) && <span className="md:hidden">· </span>}
                      {paper.sourceLabel}
                    </span>
                  </span>
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-subtle)] text-[var(--meta-green)] tabular-nums">
                        <Users className="w-3 h-3" />
                        {meta.sampleSize}
                      </span>
                    )}
                  </div>
                )}

                {/* Mobile Informative Chips (Citations + Tactile Relevance Breakdown + Merge + Library Match) */}
                <div className="flex md:hidden flex-wrap items-center gap-1.5 my-2 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] tabular-nums">
                    {t('citedByCount', { count: paper.citationCount })}
                  </span>

                  {relevance && (
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => setScoreSheetEntry({ paper, breakdown: relevance })}
                      className="min-h-9 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer touch-manipulation tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                    >
                      <BarChart3 className="w-3 h-3 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                      <span>{t('relevanceScoreBadge', { score: Math.round(relevance.totalScore) })}</span>
                      {relevance.sourcesCount > 1 && (
                        <span className="text-[var(--link-academic)]">
                          · {t('corroboratedSourcesBadge', { count: relevance.sourcesCount })}
                        </span>
                      )}
                    </button>
                  )}

                  {mergeCluster && (
                    <button
                      type="button"
                      onClick={() => {
                        setInspectorFocusClusterId(mergeCluster.clusterId);
                        setInspectorOpen(true);
                      }}
                      className="min-h-9 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                    >
                      <GitMerge className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>
                        {t('corroboratedSourcesBadge', {
                          count: mergeCluster.constituents.length,
                        })}
                      </span>
                    </button>
                  )}

                  {matchedSavedItem && (() => {
                    const badgeLabel =
                      matchedSavedItem.screeningStatus === 'included'
                        ? t('libraryMatchIncluded')
                        : matchedSavedItem.screeningStatus === 'excluded'
                        ? t('libraryMatchExcluded')
                        : t('libraryMatchUnscreened');
                    return (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)]">
                        {badgeLabel}
                      </span>
                    );
                  })()}
                </div>

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

                    {/* Mobile Abstract / IMRAD Sheet Triggers (prevents scroll displacement) */}
                    {(paper.abstractText.length > 240 || meta.hasStructuredAbstract) && (
                      <div className="flex md:hidden flex-wrap items-center gap-2 mt-1.5">
                        {meta.hasStructuredAbstract ? (
                          <button
                            type="button"
                            onClick={() => setImradReaderPaper(paper)}
                            className="min-h-10 inline-flex items-center gap-1.5 px-3 rounded-lg bg-[var(--accent-blue-tint)] text-[var(--link-academic)] text-[13.5px] font-medium cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{t('viewStructuredAbstract')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setImradReaderPaper(paper)}
                            className="min-h-10 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] text-[13.5px] font-medium cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{t('readFullAbstract')}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Desktop Inline Abstract Expand / IMRAD Toggle */}
                    <div className="hidden md:flex items-center gap-3.5 mt-1 text-[13.5px]">
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
                              ? t('hideStructuredSections')
                              : t('viewStructuredAbstract')}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Desktop Expandable Structured Abstract Card */}
                    {isStructuredExpanded && (
                      <div className="hidden md:block mt-2.5 p-3.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--divider)] space-y-2 text-[13.5px]">
                        {meta.objective && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">{t('labelObjective')} </span>
                            <span className="text-[var(--text-secondary)]">{meta.objective}</span>
                          </div>
                        )}
                        {meta.methods && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">{t('labelMethodsSample')} </span>
                            <span className="text-[var(--text-secondary)]">{meta.methods}</span>
                          </div>
                        )}
                        {meta.results && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">{t('labelResults')} </span>
                            <span className="text-[var(--text-secondary)]">{meta.results}</span>
                          </div>
                        )}
                        {meta.conclusion && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">{t('labelConclusion')} </span>
                            <span className="text-[var(--text-secondary)]">{meta.conclusion}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Clean 3-Action Bar (Progressive Disclosure) */}
                <div className="flex md:hidden items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => onToggleSave(paper, activeSaveGroupId)}
                    className={`flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border text-[14px] font-semibold transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                      isSaved
                        ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/35 text-[var(--link-academic)]'
                        : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t('savedShort')}</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t('saveShort')}</span>
                      </>
                    )}
                  </button>

                  {mobilePrimaryUrl ? (
                    <a
                      href={mobilePrimaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl text-[14px] font-semibold transition-opacity touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                        safePdfUrl || resolvedUnpaywallUrl
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
                          : 'bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--link-academic)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <span className="truncate">{mobilePrimaryLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : paper.doi ? (
                    <button
                      type="button"
                      disabled={unpaywallEntry?.status === 'loading'}
                      onClick={() => handleFindUnpaywallPdf(paper)}
                      className="flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-medium text-[var(--link-academic)] cursor-pointer disabled:opacity-50 touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                    >
                      {unpaywallEntry?.status === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                      ) : (
                        <FileSearch className="w-4 h-4 shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{t('findOaPdfBtn')}</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setActionSheetPaper(paper)}
                    aria-label={t('paperMoreActionsBtn')}
                    title={t('paperMoreActionsBtn')}
                    aria-haspopup="dialog"
                    className="min-h-11 min-w-11 px-3 inline-flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0 touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                  >
                    <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Desktop Borderless Academic Action Links Row */}
                <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-[var(--text-muted)]">
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
                          <span>{t('savedShort')}</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>
                            {activeSaveGroupObj
                              ? t('saveIntoGroup', { name: activeSaveGroupObj.name })
                              : t('saveShort')}
                          </span>
                        </>
                      )}
                    </button>

                    {/* If saved, allow switching its group directly from search results */}
                    {isSaved && (
                      <select
                        value={assignedGroupId ?? ''}
                        onChange={(e) =>
                          workspaceActions.assignPaperGroup(paper.id, e.target.value ? e.target.value : null)
                        }
                        className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-xs font-medium text-[var(--text-primary)] cursor-pointer"
                        title={t('changePaperGroupTitle')}
                      >
                        <option value="">{t('ungroupedShort')}</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {t('slotPrefix')} {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <span className="tabular-nums">
                    {t('citedByCount', { count: paper.citationCount })}
                  </span>

                  {relevance && (
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => setScoreSheetEntry({ paper, breakdown: relevance })}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                      title={t('relevanceBreakdownTitle', {
                        lexical: relevance.lexicalScore,
                        sources: relevance.sourcesCount,
                        sourcesLabel:
                          relevance.sourcesCount === 1
                            ? t('sourceCountSingular')
                            : t('sourceCountPlural'),
                        consensus: relevance.consensusScore,
                        impact: relevance.impactRecencyScore,
                        quality: relevance.qualityAccessScore,
                      })}
                    >
                      <span>{t('relevanceScoreBadge', { score: Math.round(relevance.totalScore) })}</span>
                      {relevance.sourcesCount > 1 && (
                        <span className="text-[var(--link-academic)]">
                          · {t('corroboratedSourcesBadge', { count: relevance.sourcesCount })}
                        </span>
                      )}
                    </button>
                  )}

                  {mergeCluster && (
                    <button
                      type="button"
                      onClick={() => {
                        setInspectorFocusClusterId(mergeCluster.clusterId);
                        setInspectorOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>
                        {t('corroboratedSourcesBadge', {
                          count: mergeCluster.constituents.length,
                        })}
                      </span>
                    </button>
                  )}

                  {matchedSavedItem && (() => {
                    const badgeLabel =
                      matchedSavedItem.screeningStatus === 'included'
                        ? t('libraryMatchIncluded')
                        : matchedSavedItem.screeningStatus === 'excluded'
                        ? t('libraryMatchExcluded')
                        : t('libraryMatchUnscreened');
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)]">
                        {badgeLabel}
                      </span>
                    );
                  })()}

                  <div className="inline-flex items-center gap-2">
                    <span>{t('citePrefix')}</span>
                    {(['abnt', 'apa', 'bibtex'] as const).map((fmt) => {
                      const isCopied = copiedKey === `${paper.id}-${fmt}`;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => void handleCopyCitation(paper, fmt)}
                          className="inline-flex items-center gap-1 uppercase text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--link-academic)] cursor-pointer"
                        >
                          {isCopied && <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />}
                          <span>{fmt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {safeDoiUrl && (
                    <a
                      href={safeDoiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--text-primary)] hover:underline"
                    >
                      DOI
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setChaseSeedPaper(paper)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>{t('chaseCitationsBtn')}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Subtle bottom indicator while remaining bases finish loading */}
        {isActiveViewLoading && filteredPapers.length > 0 && (
          <div className="mt-7 pt-4 border-t border-[var(--divider)] flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--link-academic)]" />
            <span>
              {loadingSourcesCount === 1
                ? t('waitingMoreSourcesSingular')
                : t('waitingMoreSourcesPlural', { count: loadingSourcesCount })}
            </span>
          </div>
        )}
          </>
        )}
      </div>

      <PaperActionSheet
        paper={actionSheetPaper}
        onClose={() => setActionSheetPaper(null)}
        isSaved={actionSheetPaper ? savedIds.has(actionSheetPaper.id) : false}
        groups={groups}
        assignedGroupId={actionSheetPaper ? (savedPaperGroupMap[actionSheetPaper.id] ?? null) : null}
        activeSaveGroupId={activeSaveGroupId}
        onToggleSave={onToggleSave}
        onAssignGroup={workspaceActions.assignPaperGroup}
        onOpenCitationChaser={(paper) => setChaseSeedPaper(paper)}
        dedupEnabled={dedupEnabled}
        mergeCluster={
          actionSheetPaper ? (mergeClusterByPaperId.get(actionSheetPaper.id) ?? null) : null
        }
        onOpenMergeInspector={(clusterId) => {
          setInspectorFocusClusterId(clusterId);
          setInspectorOpen(true);
        }}
        unpaywallEntry={actionSheetPaper ? unpaywallState[actionSheetPaper.id] : undefined}
        onFindUnpaywallPdf={handleFindUnpaywallPdf}
        institutionalProxy={institutionalProxy}
      />

      <ImradReaderSheet
        paper={imradReaderPaper}
        metadata={imradReaderMetadata}
        isSaved={imradReaderPaper ? savedIds.has(imradReaderPaper.id) : false}
        activeSaveGroupName={activeSaveGroupObj?.name ?? null}
        onToggleSave={() => {
          if (imradReaderPaper) {
            onToggleSave(imradReaderPaper, activeSaveGroupId);
          }
        }}
        onClose={() => setImradReaderPaper(null)}
      />

      <MobileSheet
        open={Boolean(scoreSheetEntry)}
        onClose={() => setScoreSheetEntry(null)}
        title={t('paperScoreBreakdownTitle')}
        subtitle={scoreSheetEntry?.paper.title}
        initialSnap="auto"
        desktopMode="modal"
        desktopMaxWidthClass="md:max-w-md"
        closeLabel={t('mobileCloseSheetBtn')}
        dragHandleLabel={t('mobileDragHandleLabel')}
      >
        {scoreSheetEntry && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] px-4 py-3">
              <div>
                <div className="text-xs font-medium text-[var(--text-muted)]">
                  {scoreSheetEntry.paper.sourceLabel}
                </div>
                {scoreSheetEntry.breakdown.sourcesCount > 1 && (
                  <div className="text-xs font-medium text-[var(--link-academic)] mt-0.5">
                    {t('corroboratedSourcesBadge', {
                      count: scoreSheetEntry.breakdown.sourcesCount,
                    })}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-heading text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-none">
                  {Math.round(scoreSheetEntry.breakdown.totalScore)}
                  <span className="text-sm font-normal text-[var(--text-muted)]">/100</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(
                [
                  {
                    key: 'lexical',
                    label: t('paperScoreLexical'),
                    value: scoreSheetEntry.breakdown.lexicalScore,
                    barColor: 'bg-[var(--link-academic)]',
                  },
                  {
                    key: 'consensus',
                    label: t('paperScoreConsensus'),
                    value: scoreSheetEntry.breakdown.consensusScore,
                    barColor: 'bg-[var(--chart-1)]',
                  },
                  {
                    key: 'impact',
                    label: t('paperScoreImpactRecency'),
                    value: scoreSheetEntry.breakdown.impactRecencyScore,
                    barColor: 'bg-[var(--chart-3)]',
                  },
                  {
                    key: 'quality',
                    label: t('paperScoreQualityAccess'),
                    value: scoreSheetEntry.breakdown.qualityAccessScore,
                    barColor: 'bg-[var(--meta-green)]',
                  },
                ] as const
              ).map((metric) => {
                const clamped = Math.max(0, Math.min(100, Math.round(metric.value)));
                return (
                  <div key={metric.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="text-[var(--text-secondary)] font-medium">
                        {metric.label}
                      </span>
                      <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                        {clamped}%
                      </span>
                    </div>
                    <div
                      className="h-2 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden"
                      role="progressbar"
                      aria-label={metric.label}
                      aria-valuenow={clamped}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ease-out ${metric.barColor}`}
                        style={{ width: `${clamped}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </MobileSheet>

      <MergeInspectorModal
        isOpen={inspectorOpen}
        clusters={mergeClusters}
        focusClusterId={inspectorFocusClusterId}
        onSplitPair={workspaceActions.splitMergePair}
        onClose={() => {
          setInspectorOpen(false);
          setInspectorFocusClusterId(null);
        }}
      />

      <CitationChaserModal
        seedPaper={chaseSeedPaper}
        accessConfig={userAccessConfig}
        savedIds={savedIds}
        activeSaveGroupId={activeSaveGroupId}
        onToggleSave={onToggleSave}
        onClose={() => setChaseSeedPaper(null)}
      />
    </div>
  );
};
