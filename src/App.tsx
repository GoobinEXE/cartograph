import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLATFORMS,
  THEMATIC_AREAS,
  getLocalizedAccessBadges,
  getLocalizedCategoryMeta,
  getLocalizedLaunchPresets,
  getLocalizedThematicAreas,
} from './data/platforms';
import {
  BooleanQueryState,
  DeduplicationSummary,
  NormalizedPaper,
  PlatformCategory,
  SavedPaperItem,
  ScreeningStatus,
  SourceFetchStatus,
  ThematicArea,
} from './types/academic';
import {
  launchUrlsCrossPlatform,
  runFederatedSearch,
} from './services/academicAggregator';
import { translateAcademicQueryPtToEn } from './utils/queryBuilder';
import { parseAbstractMetadata } from './utils/abstractParser';
import { BooleanBuilderDrawer } from './components/BooleanBuilderDrawer';
import { FederatedResultsPanel } from './components/FederatedResultsPanel';
import { SavedLiteratureDrawer } from './components/SavedLiteratureDrawer';
import { FeedbackView } from './components/FeedbackView';
import { PrismMonogram, PrismSpectralBar } from './components/PrismLogo';
import { useI18n } from './i18n/context';
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  Code,
  Cpu,
  Gamepad2,
  Globe,
  HardDrive,
  LayoutGrid,
  List,
  Loader2,
  Moon,
  Palette,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';

const STORAGE_KEY_SAVED = 'cartograph_saved_papers_v2';
const STORAGE_KEY_SELECTED_PLATFORMS = 'cartograph_selected_platforms_v2';
const STORAGE_KEY_THEME = 'cartograph_theme_v1';
const STORAGE_KEY_SIDEBAR_DRAWERS = 'cartograph_sidebar_drawers_v2';

type SidebarSectionKey = 'areas' | 'access' | 'presets' | 'categories';

function renderAreaIcon(area: ThematicArea, className: string = 'w-3.5 h-3.5') {
  switch (area) {
    case 'tecnologia':
      return <Cpu className={className} />;
    case 'ia':
      return <Bot className={className} />;
    case 'saude':
      return <Activity className={className} />;
    case 'arte':
      return <Palette className={className} />;
    case 'games':
      return <Gamepad2 className={className} />;
    case 'software':
      return <Code className={className} />;
    case 'hardware':
      return <HardDrive className={className} />;
    case 'multidisciplinar':
    default:
      return <Globe className={className} />;
  }
}

export default function AcademicCommandCenter() {
  const { language, setLanguage, t, availableLanguages } = useI18n();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'platforms' | 'federated' | 'saved' | 'feedback'>('platforms');
  const [activeCategory, setActiveCategory] = useState<'all' | PlatformCategory>('all');
  const [selectedArea, setSelectedArea] = useState<'all' | ThematicArea>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [accessFilter, setAccessFilter] = useState<'all' | 'gratuito' | 'pago' | 'aberto-institucional' | 'freemium'>('all');
  const [showBooleanDrawer, setShowBooleanDrawer] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [sidebarDrawers, setSidebarDrawers] = useState<Record<SidebarSectionKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR_DRAWERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            areas: parsed.areas !== false,
            access: parsed.access !== false,
            presets: parsed.presets !== false,
            categories: parsed.categories !== false,
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      areas: true,
      access: true,
      presets: true,
      categories: true,
    };
  });

  const toggleSidebarDrawer = (key: SidebarSectionKey) => {
    setSidebarDrawers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR_DRAWERS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const allDrawersOpen = Object.values(sidebarDrawers).every(Boolean);

  const toggleAllSidebarDrawers = () => {
    const targetState = !allDrawersOpen;
    const next = {
      areas: targetState,
      access: targetState,
      presets: targetState,
      categories: targetState,
    };
    setSidebarDrawers(next);
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR_DRAWERS, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const localizedPresets = useMemo(() => getLocalizedLaunchPresets(t), [t]);
  const localizedCategoryMeta = useMemo(() => getLocalizedCategoryMeta(t), [t]);
  const localizedAccessBadges = useMemo(() => getLocalizedAccessBadges(t), [t]);
  const localizedThematicAreas = useMemo(() => getLocalizedThematicAreas(t), [t]);

  const [booleanState, setBooleanState] = useState<BooleanQueryState>({
    mainConcept: '',
    andTerms: '',
    orTerms: '',
    notTerms: '',
    exactPhrase: '',
    yearFrom: '',
    studyDesign: 'any',
  });

  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY_SELECTED_PLATFORMS) ||
        localStorage.getItem('nexus_academico_selected_platforms_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return [
      'scholar',
      'openalex',
      'semanticscholar',
      'pubmed',
      'scielo',
      'consensus',
    ];
  });

  const [savedPapers, setSavedPapers] = useState<SavedPaperItem[]>(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY_SAVED) ||
        localStorage.getItem('nexus_academico_saved_papers_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return [];
  });

  const [federatedPapers, setFederatedPapers] = useState<NormalizedPaper[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<SourceFetchStatus[]>([]);
  const [dedupSummary, setDedupSummary] = useState<DeduplicationSummary | null>(null);
  const [isSearchingApis, setIsSearchingApis] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLaunchingTabs, setIsLaunchingTabs] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<{
    online: boolean;
    osName: string;
  }>({ online: false, osName: 'Desktop' });
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(savedPapers));
    } catch {
      // ignore quota error
    }
  }, [savedPapers]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SELECTED_PLATFORMS,
        JSON.stringify(selectedPlatformIds)
      );
    } catch {
      // ignore quota error
    }
  }, [selectedPlatformIds]);

  // Check multiplatform local bridge health (Windows / Linux / macOS)
  useEffect(() => {
    let mounted = true;
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data?.ok) {
          setBridgeStatus({
            online: true,
            osName: String(data.osName || data.platform || 'Desktop'),
          });
        }
      })
      .catch(() => {
        // Running in static browser mode
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl + K focuses the search input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();
  const encodedQuery = encodeURIComponent(trimmedQuery);
  const isValidQuery = trimmedQuery.length > 0;
  const yearStartNum = booleanState.yearFrom ? Number(booleanState.yearFrom) : undefined;

  const visiblePlatforms = useMemo(() => {
    return PLATFORMS.filter((p) => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (accessFilter !== 'all' && p.accessModel !== accessFilter) return false;
      if (selectedArea !== 'all' && !p.thematicAreas.includes(selectedArea)) return false;
      return true;
    });
  }, [activeCategory, accessFilter, selectedArea]);

  const savedIdsSet = useMemo(
    () => new Set(savedPapers.map((s) => s.id)),
    [savedPapers]
  );

  const handleTogglePlatformSelection = (id: string) => {
    setSelectedPlatformIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTogglePreset = (presetId: string, presetPlatformIds: string[]) => {
    setSelectedPlatformIds((prev) => {
      const isFullyActive = presetPlatformIds.every((id) => prev.includes(id));

      if (!isFullyActive) {
        return Array.from(new Set([...prev, ...presetPlatformIds]));
      }

      const otherActivePresets = localizedPresets.filter(
        (p) =>
          p.id !== presetId &&
          p.platformIds.every((id) => prev.includes(id))
      );
      const protectedIds = new Set(
        otherActivePresets.flatMap((p) => p.platformIds)
      );

      return prev.filter(
        (id) => !presetPlatformIds.includes(id) || protectedIds.has(id)
      );
    });
  };

  const handleTranslatePtToEn = async () => {
    if (!isValidQuery || isTranslating) return;
    setIsTranslating(true);
    try {
      const translated = await translateAcademicQueryPtToEn(trimmedQuery);
      if (translated) {
        setQuery(translated);
        setStatusBanner(t('termTranslatedBanner', { term: translated }));
        setTimeout(() => setStatusBanner(null), 4000);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRunFederatedSearch = async () => {
    if (!isValidQuery || isSearchingApis) return;
    setActiveTab('federated');
    setIsSearchingApis(true);
    try {
      const { papers, statuses, deduplicationSummary } = await runFederatedSearch(
        trimmedQuery,
        yearStartNum,
        (liveStatuses) => setSourceStatuses(liveStatuses)
      );
      setFederatedPapers(papers);
      setSourceStatuses(statuses);
      setDedupSummary(deduplicationSummary);
    } finally {
      setIsSearchingApis(false);
    }
  };

  const handleLaunchSelectedPlatforms = async () => {
    if (!isValidQuery || selectedPlatformIds.length === 0 || isLaunchingTabs) return;
    setIsLaunchingTabs(true);
    try {
      const urls = PLATFORMS.filter((p) => selectedPlatformIds.includes(p.id)).map((p) =>
        p.buildUrl(encodedQuery, trimmedQuery, yearStartNum)
      );
      const result = await launchUrlsCrossPlatform(urls);
      setStatusBanner(
        result.usedNativeBridge
          ? t('platformsOpenedBridge', {
              count: result.launchedCount,
              osName: bridgeStatus.osName,
            })
          : `${t('platformsOpenedBrowser', { count: result.launchedCount })}${
              urls.length > 1
                ? ' • Dica: Autorize pop-ups no navegador para abrir múltiplas abas simultaneamente.'
                : ''
            }`
      );
      setTimeout(() => setStatusBanner(null), 5000);
    } finally {
      setIsLaunchingTabs(false);
    }
  };

  const handleHybridOmniSearch = async () => {
    if (!isValidQuery) return;
    await Promise.all([handleRunFederatedSearch(), handleLaunchSelectedPlatforms()]);
  };

  const handleToggleSavePaper = (paper: NormalizedPaper) => {
    setSavedPapers((prev) => {
      const exists = prev.some((item) => item.id === paper.id);
      if (exists) {
        return prev.filter((item) => item.id !== paper.id);
      }
      const extractedMetadata = parseAbstractMetadata(
        paper.title,
        paper.abstractText,
        paper.publicationType
      );
      const newItem: SavedPaperItem = {
        ...paper,
        savedAt: new Date().toISOString(),
        researcherNotes: '',
        relevanceTag: 'alta',
        screeningStatus: 'unscreened',
        extractedMetadata,
      };
      return [newItem, ...prev];
    });
  };

  const handleUpdateScreening = (
    id: string,
    status: ScreeningStatus,
    reason?: string
  ) => {
    setSavedPapers((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              screeningStatus: status,
              exclusionReason: status === 'excluded' ? reason : undefined,
            }
          : item
      )
    );
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setSavedPapers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, researcherNotes: notes } : item))
    );
  };

  const handleUpdateRelevance = (
    id: string,
    relevanceTag: SavedPaperItem['relevanceTag']
  ) => {
    setSavedPapers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, relevanceTag } : item))
    );
  };

  const handleRemoveSaved = (id: string) => {
    setSavedPapers((prev) => prev.filter((item) => item.id !== id));
  };

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    sourceStatuses.forEach((s) => {
      if (s.count > 0) {
        counts[s.label] = s.count;
      }
    });
    return counts;
  }, [sourceStatuses]);

  const activeCategoryHeading =
    activeCategory === 'all'
      ? {
          title: t('allCategories', { count: PLATFORMS.length }).replace(/\s*\(\d+\)/, ''),
          subtitle: t('heroSubtitle'),
        }
      : {
          title: localizedCategoryMeta[activeCategory].label,
          subtitle: localizedCategoryMeta[activeCategory].subtitle,
        };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-20">
      {/* Academic Search Header — Google Scholar / Semantic Scholar / Consensus Pattern */}
      <header className="sticky top-0 z-30 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--divider)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-3.5">
          {/* Top Search & Brand Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 flex-1">
              {/* Brand Wordmark with Prism Monogram */}
              <div className="flex items-center justify-between">
                <a
                  href="#top"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('platforms');
                    setActiveCategory('all');
                    setSelectedArea('all');
                  }}
                  className="inline-flex items-center gap-2.5 font-heading tracking-tight text-[var(--text-primary)] shrink-0 hover:opacity-90 transition-opacity"
                  title="Cartograph — Desenvolvido pela Prism"
                >
                  <PrismMonogram className="h-5 w-auto" />
                  <div className="flex flex-col leading-none">
                    <span className="font-heading font-semibold text-[17px] tracking-tight">Cartograph</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">by Prism</span>
                  </div>
                </a>

                {/* Mobile Controls */}
                <div className="flex items-center gap-1.5 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                    className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Borderless Search Pill (Google Scholar / Consensus Style) */}
              <div className="flex-1 max-w-2xl flex items-center bg-[var(--bg-subtle)] focus-within:bg-[var(--bg-secondary)] focus-within:ring-2 focus-within:ring-[var(--link-academic)]/25 rounded-full pl-4 pr-1.5 py-1.5 transition-all">
                <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0 mr-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleHybridOmniSearch();
                    } else if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault();
                      handleLaunchSelectedPlatforms();
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRunFederatedSearch();
                    }
                  }}
                  placeholder={t('searchPlaceholder')}
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-1 cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTranslatePtToEn}
                  disabled={!isValidQuery || isTranslating}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors mr-1 ${
                    isValidQuery
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer'
                      : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                  }`}
                  title="Traduzir termos para inglês acadêmico"
                >
                  {isTranslating ? '...' : 'PT→EN'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBooleanDrawer((v) => !v)}
                  className={`p-1.5 rounded-full transition-colors mr-1.5 cursor-pointer ${
                    showBooleanDrawer
                      ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                  title={t('booleanBuilderBtn')}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleRunFederatedSearch}
                  disabled={!isValidQuery || isSearchingApis}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-opacity shrink-0 ${
                    isValidQuery
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  {isSearchingApis && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Buscar</span>
                </button>
              </div>
            </div>

            {/* Right Actions: Batch Portal Launch + Theme + Language */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button
                type="button"
                onClick={handleLaunchSelectedPlatforms}
                disabled={!isValidQuery || selectedPlatformIds.length === 0 || isLaunchingTabs}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                  isValidQuery && selectedPlatformIds.length > 0
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] hover:opacity-85 cursor-pointer'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
                }`}
                title="Abrir pesquisa em abas nos portais selecionados (Shift + Enter)"
              >
                <span>Abrir {selectedPlatformIds.length} portais</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                  className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  title="Alternar modo Claro / Escuro"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                <div className="relative" ref={langMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowLangMenu((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer uppercase"
                  >
                    <span>{language}</span>
                    <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                  </button>

                  {showLangMenu && (
                    <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-[var(--bg-canvas)] shadow-xl py-1.5 z-50">
                      {availableLanguages.map((langOpt) => (
                        <button
                          key={langOpt.code}
                          type="button"
                          onClick={() => {
                            setLanguage(langOpt.code);
                            setShowLangMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs transition-colors cursor-pointer text-left ${
                            language === langOpt.code
                              ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-semibold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <span>{langOpt.nativeLabel}</span>
                          {language === langOpt.code && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Optional Advanced Boolean Drawer */}
          {showBooleanDrawer && (
            <BooleanBuilderDrawer
              state={booleanState}
              onChange={setBooleanState}
              onApplyCompiledQuery={(compiled) => {
                setQuery(compiled);
                setStatusBanner(t('booleanAppliedBanner'));
                setTimeout(() => setStatusBanner(null), 3500);
              }}
            />
          )}

          {/* Status Banner */}
          {statusBanner && (
            <div className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-blue-tint)] text-xs text-[var(--link-academic)] flex items-center justify-between">
              <span>{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="ml-3 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Familiar Academic Navigation Bar (Underline Tabs like Google Scholar / Semantic Scholar) */}
          <nav className="flex items-center gap-6 mt-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('platforms')}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'platforms'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('tabPlatforms', { count: PLATFORMS.length })}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('federated')}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'federated'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('tabFederated', { count: federatedPapers.length })}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('tabSaved', { count: savedPapers.length })}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'feedback'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('tabFeedback')}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: PLATFORMS DIRECTORY */}
        {activeTab === 'platforms' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[290px_1fr] gap-6 xl:gap-8 items-start">
            {/* Left Sidebar — Scroll Individual com Gavetas Retráteis / Expansíveis */}
            <aside
              className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pr-2 pb-8 select-none"
              aria-label="Filtros e navegação de plataformas"
            >
              {/* Header com Ação Rápida de Expandir / Recolher Todas */}
              <div className="flex items-center justify-between px-2 pb-2.5 border-b border-[var(--divider)]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Filtros & Navegação</span>
                </div>
                <button
                  type="button"
                  onClick={toggleAllSidebarDrawers}
                  className="text-[11px] text-[var(--link-academic)] hover:underline cursor-pointer font-medium"
                  title={allDrawersOpen ? 'Recolher todas as gavetas' : 'Expandir todas as gavetas'}
                >
                  {allDrawersOpen ? 'Recolher tudo' : 'Expandir tudo'}
                </button>
              </div>

              {/* Gaveta 1: Disciplines / Specialized Areas */}
              <div className="border-b border-[var(--divider)] pb-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSidebarDrawer('areas')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSidebarDrawer('areas');
                    }
                  }}
                  aria-expanded={sidebarDrawers.areas}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {t('thematicAreasTitle')}
                    </span>
                    {selectedArea !== 'all' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                        {localizedThematicAreas[selectedArea]?.label || selectedArea}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedArea !== 'all' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArea('all');
                        }}
                        className="text-[11px] text-[var(--link-academic)] hover:underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                        sidebarDrawers.areas ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </div>
                </div>

                {sidebarDrawers.areas && (
                  <div className="space-y-0.5 text-[13px] pt-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedArea('all')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        selectedArea === 'all'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <span className="truncate">{t('areaAll')}</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] shrink-0">{PLATFORMS.length}</span>
                    </button>

                    {THEMATIC_AREAS.map((areaKey) => {
                      const meta = localizedThematicAreas[areaKey];
                      const count = PLATFORMS.filter((p) => p.thematicAreas.includes(areaKey)).length;
                      return (
                        <button
                          key={areaKey}
                          type="button"
                          onClick={() => setSelectedArea(areaKey)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                            selectedArea === areaKey
                              ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {renderAreaIcon(areaKey, 'w-3.5 h-3.5 text-[var(--text-muted)] shrink-0')}
                            <span className="truncate">{meta.label}</span>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] shrink-0">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gaveta 2: Access Model Filter */}
              <div className="border-b border-[var(--divider)] pb-3">
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
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Modelo de Acesso
                    </span>
                    {accessFilter !== 'all' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                        {accessFilter === 'gratuito'
                          ? 'Gratuito'
                          : accessFilter === 'pago'
                          ? 'Assinatura'
                          : accessFilter === 'aberto-institucional'
                          ? 'Institucional'
                          : 'Freemium'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {accessFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccessFilter('all');
                        }}
                        className="text-[11px] text-[var(--link-academic)] hover:underline cursor-pointer"
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
                  <div className="space-y-0.5 text-[13px] pt-1.5">
                    <button
                      type="button"
                      onClick={() => setAccessFilter('all')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        accessFilter === 'all'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Todos os modelos</span>
                      <span className="text-xs text-[var(--text-muted)]">{PLATFORMS.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessFilter('gratuito')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        accessFilter === 'gratuito'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>100% Gratuitas & Open</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {PLATFORMS.filter((p) => p.accessModel === 'gratuito').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessFilter('pago')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        accessFilter === 'pago'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Pagas / Assinatura</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {PLATFORMS.filter((p) => p.accessModel === 'pago').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessFilter('aberto-institucional')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        accessFilter === 'aberto-institucional'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Acesso Aberto + CAFe</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {PLATFORMS.filter((p) => p.accessModel === 'aberto-institucional').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessFilter('freemium')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        accessFilter === 'freemium'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Gratuito c/ Cota IA</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {PLATFORMS.filter((p) => p.accessModel === 'freemium').length}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Gaveta 3: Cumulative Presets List */}
              <div className="border-b border-[var(--divider)] pb-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSidebarDrawer('presets')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSidebarDrawer('presets');
                    }
                  }}
                  aria-expanded={sidebarDrawers.presets}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      Seleção Rápida
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums shrink-0 ${
                        selectedPlatformIds.length > 0
                          ? 'bg-[var(--link-academic)]/15 text-[var(--link-academic)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}
                      title={`${selectedPlatformIds.length} de ${PLATFORMS.length} plataformas selecionadas`}
                    >
                      {selectedPlatformIds.length}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0 ${
                      sidebarDrawers.presets ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </div>

                {sidebarDrawers.presets && (
                  <div className="space-y-1 text-[13px] pt-1.5">
                    {/* Sub-barra de Ações da Gaveta */}
                    <div className="flex items-center justify-between px-2 py-1 mb-1.5 bg-[var(--bg-subtle)]/70 rounded-md border border-[var(--divider)]">
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">
                        {selectedPlatformIds.length} de {PLATFORMS.length} ativas
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPlatformIds(PLATFORMS.map((p) => p.id))}
                          className="text-[11px] font-semibold text-[var(--link-academic)] hover:underline cursor-pointer"
                        >
                          Todas
                        </button>
                        <span className="text-[var(--divider)] text-[10px]">·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPlatformIds([])}
                          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>
                    {localizedPresets.map((preset) => {
                      const matchedCount = preset.platformIds.filter((id) =>
                        selectedPlatformIds.includes(id)
                      ).length;
                      const isFullyActive =
                        matchedCount === preset.platformIds.length &&
                        preset.platformIds.length > 0;
                      const isPartiallyActive = matchedCount > 0 && !isFullyActive;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleTogglePreset(preset.id, preset.platformIds)}
                          title={preset.description}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                            isFullyActive
                              ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={isFullyActive}
                              ref={(el) => {
                                if (el) el.indeterminate = isPartiallyActive;
                              }}
                              readOnly
                              className="rounded accent-[var(--link-academic)] pointer-events-none"
                            />
                            <span className="truncate">{preset.name}</span>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] shrink-0">
                            {matchedCount}/{preset.platformIds.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gaveta 4: Functional Categories */}
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSidebarDrawer('categories')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSidebarDrawer('categories');
                    }
                  }}
                  aria-expanded={sidebarDrawers.categories}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Tipo de Plataforma
                    </span>
                    {activeCategory !== 'all' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                        {localizedCategoryMeta[activeCategory]?.label.split('&')[0].trim() || activeCategory}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategory('all');
                        }}
                        className="text-[11px] text-[var(--link-academic)] hover:underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                        sidebarDrawers.categories ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </div>
                </div>

                {sidebarDrawers.categories && (
                  <div className="space-y-0.5 text-[13px] pt-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveCategory('all')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        activeCategory === 'all'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Todas as categorias</span>
                      <span className="text-xs text-[var(--text-muted)]">{PLATFORMS.length}</span>
                    </button>

                    {(Object.keys(localizedCategoryMeta) as PlatformCategory[]).map((catKey) => {
                      const meta = localizedCategoryMeta[catKey];
                      const count = PLATFORMS.filter((p) => p.category === catKey).length;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setActiveCategory(catKey)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                            activeCategory === catKey
                              ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="truncate pr-2">{meta.label.split('&')[0].trim()}</span>
                          <span className="text-xs text-[var(--text-muted)] shrink-0">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            {/* Right Main Directory Area */}
            <div className="min-w-0">
              {/* Specialized Areas Horizontal Quick Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedArea('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedArea === 'all'
                      ? 'bg-[var(--link-academic)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('areaAll')}</span>
                  <span className="opacity-70 text-[11px]">({PLATFORMS.length})</span>
                </button>
                {THEMATIC_AREAS.map((areaKey) => {
                  const meta = localizedThematicAreas[areaKey];
                  const count = PLATFORMS.filter((p) => p.thematicAreas.includes(areaKey)).length;
                  const isActive = selectedArea === areaKey;
                  return (
                    <button
                      key={areaKey}
                      type="button"
                      onClick={() => setSelectedArea(areaKey)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[var(--link-academic)] text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {renderAreaIcon(areaKey, 'w-3.5 h-3.5')}
                      <span>{meta.label}</span>
                      <span className="opacity-70 text-[11px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Directory Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="font-heading text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    {selectedArea !== 'all' && renderAreaIcon(selectedArea, 'w-4 h-4 text-[var(--link-academic)]')}
                    <span>
                      {selectedArea !== 'all'
                        ? localizedThematicAreas[selectedArea].label
                        : activeCategoryHeading.title}
                    </span>
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {visiblePlatforms.length} portais correspondentes · {selectedPlatformIds.length} marcados para abertura simultânea
                  </p>
                </div>

                {/* Borderless View Switcher */}
                <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    title="Visualização em blocos"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    title="Visualização em lista acadêmica"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* VIEW 1: BORDERLESS SOFT SURFACE CARDS */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {visiblePlatforms.map((platform) => {
                    const isSelected = selectedPlatformIds.includes(platform.id);
                    const accessBadge = localizedAccessBadges[platform.accessModel];
                    const targetUrl = platform.buildUrl(
                      encodedQuery,
                      trimmedQuery,
                      yearStartNum
                    );

                    return (
                      <div
                        key={platform.id}
                        className={`group rounded-2xl p-4 transition-colors flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[var(--accent-blue-tint)]'
                            : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)]/75'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTogglePlatformSelection(platform.id)}
                                className="mt-1 rounded accent-[var(--link-academic)] cursor-pointer shrink-0"
                                title="Incluir na abertura em lote"
                              />
                              <div className="min-w-0">
                                <a
                                  href={targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[15px] font-semibold text-[var(--link-academic)] hover:underline inline-flex items-center gap-1 leading-snug"
                                >
                                  <span>{platform.name}</span>
                                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <div className="text-xs text-[var(--meta-green)] truncate">
                                  {platform.shortTag} · {accessBadge.label.split('/')[0].trim()}
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-2 mb-2.5">
                            {platform.description}
                          </p>

                          {/* Discipline Tags */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {platform.thematicAreas
                              .filter((a) => a !== 'multidisciplinar')
                              .map((area) => (
                                <button
                                  key={area}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedArea(area);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--link-academic)] font-medium cursor-pointer transition-colors"
                                >
                                  {renderAreaIcon(area, 'w-2.5 h-2.5 opacity-70')}
                                  <span>{localizedThematicAreas[area]?.shortLabel || area}</span>
                                </button>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)] pt-1">
                          <span className="truncate">{platform.coverageNote}</span>
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[var(--link-academic)] hover:underline shrink-0"
                          >
                            {isValidQuery ? 'Pesquisar ↗' : 'Abrir ↗'}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW 2: CLASSIC GOOGLE SCHOLAR / SEMANTIC SCHOLAR LIST */}
              {viewMode === 'list' && (
                <div className="space-y-6 max-w-3xl">
                  {visiblePlatforms.map((platform) => {
                    const isSelected = selectedPlatformIds.includes(platform.id);
                    const accessBadge = localizedAccessBadges[platform.accessModel];
                    const targetUrl = platform.buildUrl(
                      encodedQuery,
                      trimmedQuery,
                      yearStartNum
                    );

                    return (
                      <div key={platform.id} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePlatformSelection(platform.id)}
                          className="mt-1.5 rounded accent-[var(--link-academic)] cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-4">
                            <h3 className="text-[16px] font-semibold leading-snug">
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--link-academic)] hover:underline"
                              >
                                {platform.name}
                              </a>
                            </h3>
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[var(--link-academic)] hover:underline shrink-0"
                            >
                              {isValidQuery ? 'Pesquisar ↗' : 'Abrir portal ↗'}
                            </a>
                          </div>

                          <div className="text-[13px] text-[var(--meta-green)] mt-0.5 mb-1">
                            {platform.shortTag} - {platform.coverageNote} - {accessBadge.label}
                          </div>

                          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                            {platform.description}
                          </p>

                          {/* Discipline Tags */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {platform.thematicAreas
                              .filter((a) => a !== 'multidisciplinar')
                              .map((area) => (
                                <button
                                  key={area}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedArea(area);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--link-academic)] font-medium cursor-pointer transition-colors"
                                >
                                  {renderAreaIcon(area, 'w-2.5 h-2.5 opacity-70')}
                                  <span>{localizedThematicAreas[area]?.shortLabel || area}</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FEDERATED METASEARCH RESULTS */}
        {activeTab === 'federated' && (
          <FederatedResultsPanel
            papers={federatedPapers}
            statuses={sourceStatuses}
            isSearching={isSearchingApis}
            savedIds={savedIdsSet}
            onToggleSave={handleToggleSavePaper}
            deduplicationSummary={dedupSummary}
          />
        )}

        {/* TAB 3: SAVED LITERATURE REVIEW MATRIX */}
        {activeTab === 'saved' && (
          <SavedLiteratureDrawer
            items={savedPapers}
            dedupSummary={dedupSummary}
            sourceBreakdown={sourceBreakdown}
            onUpdateNotes={handleUpdateNotes}
            onUpdateRelevance={handleUpdateRelevance}
            onUpdateScreening={handleUpdateScreening}
            onRemoveItem={handleRemoveSaved}
            onClearAll={() => setSavedPapers([])}
          />
        )}

        {/* TAB 4: USER FEEDBACK & COMMUNITY CONTRIBUTIONS */}
        {activeTab === 'feedback' && <FeedbackView />}
      </main>

      {/* Prism Institutional Footer */}
      <footer className="mt-20 border-t border-[var(--divider)] pt-6 pb-12 text-xs text-[var(--text-muted)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <PrismSpectralBar className="h-[2px] w-full mb-6 opacity-80" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PrismMonogram className="h-4 w-auto" />
              <div className="text-[13px]">
                <span className="font-semibold text-[var(--text-primary)]">Cartograph</span>
                <span className="mx-2 text-[var(--text-muted)]">·</span>
                <span>Desenvolvido pela Prism</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-[var(--text-muted)]">
              <span>Pesquisa acadêmica e metabusca integrada em periódicos e repositórios abertos.</span>
              <span className="hidden sm:inline">·</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('feedback');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[var(--link-academic)] hover:underline cursor-pointer"
              >
                {t('tabFeedback')}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
