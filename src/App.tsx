import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLATFORMS,
  getLocalizedAccessBadges,
  getLocalizedCategoryMeta,
  getLocalizedLaunchPresets,
} from './data/platforms';
import {
  BooleanQueryState,
  NormalizedPaper,
  PlatformCategory,
  SavedPaperItem,
  SourceFetchStatus,
} from './types/academic';
import {
  launchUrlsCrossPlatform,
  runFederatedSearch,
} from './services/academicAggregator';
import { translateAcademicQueryPtToEn } from './utils/queryBuilder';
import { BooleanBuilderDrawer } from './components/BooleanBuilderDrawer';
import { FederatedResultsPanel } from './components/FederatedResultsPanel';
import { SavedLiteratureDrawer } from './components/SavedLiteratureDrawer';
import { useI18n } from './i18n/context';
import {
  BookMarked,
  BrainCircuit,
  Check,
  CheckSquare,
  ChevronDown,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  Languages,
  Layers,
  Loader2,
  Rocket,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Terminal,
  X,
} from 'lucide-react';

const STORAGE_KEY_SAVED = 'cartograph_saved_papers_v2';
const STORAGE_KEY_SELECTED_PLATFORMS = 'cartograph_selected_platforms_v2';

export default function AcademicCommandCenter() {
  const { language, setLanguage, t, availableLanguages } = useI18n();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'platforms' | 'federated' | 'saved'>('platforms');
  const [activeCategory, setActiveCategory] = useState<'all' | PlatformCategory>('all');
  const [onlyStrictlyFree, setOnlyStrictlyFree] = useState(false);
  const [showBooleanDrawer, setShowBooleanDrawer] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const localizedPresets = useMemo(() => getLocalizedLaunchPresets(t), [t]);
  const localizedCategoryMeta = useMemo(() => getLocalizedCategoryMeta(t), [t]);
  const localizedAccessBadges = useMemo(() => getLocalizedAccessBadges(t), [t]);

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
      if (onlyStrictlyFree && p.accessModel !== 'gratuito') return false;
      return true;
    });
  }, [activeCategory, onlyStrictlyFree]);

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
        setTimeout(() => setStatusBanner(null), 4500);
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
      const { papers, statuses } = await runFederatedSearch(
        trimmedQuery,
        yearStartNum,
        (liveStatuses) => setSourceStatuses(liveStatuses)
      );
      setFederatedPapers(papers);
      setSourceStatuses(statuses);
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
          : t('platformsOpenedBrowser', { count: result.launchedCount })
      );
      setTimeout(() => setStatusBanner(null), 4500);
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
      const newItem: SavedPaperItem = {
        ...paper,
        savedAt: new Date().toISOString(),
        researcherNotes: '',
        relevanceTag: 'alta',
      };
      return [newItem, ...prev];
    });
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

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans pb-20 selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Subtle Ambient Radial Highlight */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(14,165,233,0.06),rgba(255,255,255,0))]" />

      {/* Top System Bar — Clean, Translucent, Focused */}
      <header className="border-b border-white/[0.06] bg-[#0B0F17]/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-semibold text-slate-100 tracking-tight">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <BrainCircuit className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold tracking-normal">{t('appName')}</span>
              <span className="text-slate-600 font-normal">/</span>
              <span className="text-slate-400 font-normal hidden sm:inline">
                {t('appTagline')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Automatic / Manual Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setShowLangMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                title="Idioma / Language"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium uppercase tracking-wider">{language}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl py-1 z-50 backdrop-blur-xl">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-800/80">
                    Idioma / Language
                  </div>
                  {availableLanguages.map((langOpt) => (
                    <button
                      key={langOpt.code}
                      type="button"
                      onClick={() => {
                        setLanguage(langOpt.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                        language === langOpt.code
                          ? 'bg-cyan-500/10 text-cyan-300 font-medium'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <span>{langOpt.nativeLabel}</span>
                      {language === langOpt.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Local Bridge Status Pill */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                bridgeStatus.online
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800'
              }`}
              title="O Bridge Nativo abre abas diretamente pelo Sistema Operacional, contornando bloqueadores de pop-up."
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  bridgeStatus.online ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              <span className="hidden sm:inline">
                {bridgeStatus.online
                  ? t('bridgeActive', { osName: bridgeStatus.osName })
                  : t('bridgeOffline')}
              </span>
              <Terminal className="w-3 h-3 sm:hidden text-slate-400" />
            </span>

            <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-400 font-mono text-[10px]">
              {t('keyboardShortcut')}
            </kbd>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 relative z-10">
        {/* Hero Section — Minimalist Search Omnibox */}
        <section className="mb-8">
          <div className="text-center max-w-3xl mx-auto mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-100">
              {t('heroTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl mx-auto leading-relaxed">
              {t('heroSubtitle')}
            </p>
          </div>

          {/* Omnibox Container */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2 sm:p-2.5 shadow-2xl transition-all focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30">
            {/* Input Row */}
            <div className="relative flex items-center">
              <div className="pl-3.5 pr-2 text-slate-400 pointer-events-none">
                <Search className="w-5 h-5 text-cyan-400/80" />
              </div>
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
                className="w-full py-3.5 pl-1 pr-10 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors mr-2 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Omnibox Footer Toolbar: Query Tools & Action Launchers */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 mt-1 border-t border-slate-800/80 px-1.5">
              {/* Secondary Query Helpers */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleTranslatePtToEn}
                  disabled={!isValidQuery || isTranslating}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isValidQuery
                      ? 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border-slate-800 hover:border-slate-700 cursor-pointer'
                      : 'text-slate-600 border-transparent cursor-not-allowed'
                  }`}
                  title="Traduzir consulta do Português para terminologia acadêmica internacional em Inglês"
                >
                  {isTranslating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <Languages className="w-3.5 h-3.5 text-cyan-400/80" />
                  )}
                  <span>{t('translateBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBooleanDrawer((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    showBooleanDrawer
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{t('booleanBuilderBtn')}</span>
                </button>
              </div>

              {/* Primary Search Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunFederatedSearch}
                  disabled={!isValidQuery || isSearchingApis}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
                    isValidQuery
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950/40 cursor-pointer'
                      : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Consultar 10 APIs científicas abertas (Enter)"
                >
                  {isSearchingApis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                  <span>{t('btnSearchApis')}</span>
                  <span className="hidden md:inline font-mono text-[10px] opacity-70">↵</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchSelectedPlatforms}
                  disabled={!isValidQuery || selectedPlatformIds.length === 0 || isLaunchingTabs}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
                    isValidQuery && selectedPlatformIds.length > 0
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 cursor-pointer'
                      : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Lançar abas nas plataformas selecionadas (Shift + Enter)"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>{t('btnLaunchTabs', { count: selectedPlatformIds.length })}</span>
                  <span className="hidden md:inline font-mono text-[10px] opacity-70">⇧↵</span>
                </button>

                <button
                  type="button"
                  onClick={handleHybridOmniSearch}
                  disabled={!isValidQuery}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-medium text-xs border transition-all ${
                    isValidQuery
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                      : 'text-slate-600 border-transparent cursor-not-allowed'
                  }`}
                  title="Busca Híbrida Total (Ctrl/Cmd + Enter)"
                >
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xl:inline">{t('btnTotalSearch')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Status Toast Banner */}
          {statusBanner && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
              <span>{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-cyan-400 hover:text-white ml-3 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Preset Profiles Bar (Cumulative Multi-Select) */}
          <div className="mt-4 pt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1.5">
              {t('presetsTitle')}
            </span>
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isFullyActive
                      ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40 shadow-xs'
                      : isPartiallyActive
                      ? 'bg-slate-900/90 text-cyan-300/80 border-cyan-500/20 hover:border-cyan-500/40'
                      : 'bg-slate-950/60 hover:bg-slate-850 text-slate-300 border-slate-800/80'
                  }`}
                >
                  {isFullyActive ? (
                    <CheckSquare className="w-3 h-3 text-cyan-400 shrink-0" />
                  ) : (
                    <Square
                      className={`w-3 h-3 shrink-0 ${
                        isPartiallyActive ? 'text-cyan-400/70' : 'text-slate-500'
                      }`}
                    />
                  )}
                  <span>{preset.name}</span>
                  {isPartiallyActive && (
                    <span className="text-[10px] font-mono px-1 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/30">
                      {matchedCount}/{preset.platformIds.length}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex items-center gap-2 ml-auto text-xs">
              <button
                type="button"
                onClick={() => setSelectedPlatformIds(PLATFORMS.map((p) => p.id))}
                className="text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                {t('selectAll', { count: PLATFORMS.length })}
              </button>
              <span className="text-slate-700">·</span>
              <button
                type="button"
                onClick={() => setSelectedPlatformIds([])}
                className="text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                {t('clearSelection')}
              </button>
            </div>
          </div>
        </section>

        {/* Optional Boolean Builder Drawer */}
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

        {/* Modern Segmented Navigation Dock */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/[0.06] pb-3">
          <nav className="inline-flex p-1 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('platforms')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'platforms'
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('tabPlatforms', { count: PLATFORMS.length })}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('federated')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'federated'
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('tabFederated', { count: federatedPapers.length })}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('tabSaved', { count: savedPapers.length })}</span>
            </button>
          </nav>

          {activeTab === 'platforms' && (
            <button
              type="button"
              onClick={() => setOnlyStrictlyFree((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                onlyStrictlyFree
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('filterStrictlyFree')}</span>
            </button>
          )}
        </div>

        {/* TAB 1: PLATFORMS DIRECTORY */}
        {activeTab === 'platforms' && (
          <div>
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-slate-100 text-slate-950 border-white'
                    : 'bg-slate-900/50 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                {t('allCategories', { count: PLATFORMS.length })}
              </button>
              {(Object.keys(localizedCategoryMeta) as PlatformCategory[]).map((catKey) => {
                const meta = localizedCategoryMeta[catKey];
                const count = PLATFORMS.filter((p) => p.category === catKey).length;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveCategory(catKey)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      activeCategory === catKey
                        ? meta.badgeClass
                        : 'bg-slate-900/50 text-slate-400 border-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    {meta.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Platforms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visiblePlatforms.map((platform) => {
                const isSelected = selectedPlatformIds.includes(platform.id);
                const catMeta = localizedCategoryMeta[platform.category];
                const accessBadge = localizedAccessBadges[platform.accessModel];
                const searchUrl = platform.buildUrl(
                  encodedQuery,
                  trimmedQuery,
                  yearStartNum
                );

                return (
                  <div
                    key={platform.id}
                    className={`group relative rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900/60 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900/35 border-slate-800/70 hover:border-slate-700/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleTogglePlatformSelection(platform.id)}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                            title={
                              isSelected
                                ? 'Incluída no lote (clique para desmarcar)'
                                : 'Clique para incluir no lote'
                            }
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                            )}
                          </button>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-100 leading-tight">
                              {platform.name}
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              {platform.shortTag}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0 ${accessBadge.className}`}
                        >
                          {accessBadge.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300/85 leading-relaxed mb-3">
                        {platform.description}
                      </p>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2 mb-3">
                        <span className="text-slate-500">{t('coverageLabel')}</span>
                        <span className="text-slate-300 font-medium truncate max-w-[190px]">
                          {platform.coverageNote}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 mt-auto">
                      <a
                        href={isValidQuery ? searchUrl : undefined}
                        target={isValidQuery ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!isValidQuery) e.preventDefault();
                        }}
                        className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all ${
                          isValidQuery
                            ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-600 cursor-pointer'
                            : 'bg-slate-950/40 text-slate-600 border-slate-800/60 cursor-not-allowed'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 text-cyan-400/80" />
                        <span>
                          {isValidQuery
                            ? t('platformSearchBtn', { name: platform.name })
                            : t('enterTopicAbove')}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  </div>
                );
              })}
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
          />
        )}

        {/* TAB 3: SAVED LITERATURE REVIEW MATRIX */}
        {activeTab === 'saved' && (
          <SavedLiteratureDrawer
            items={savedPapers}
            onUpdateNotes={handleUpdateNotes}
            onUpdateRelevance={handleUpdateRelevance}
            onRemoveItem={handleRemoveSaved}
            onClearAll={() => setSavedPapers([])}
          />
        )}
      </main>
    </div>
  );
}
