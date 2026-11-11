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
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans pb-16">
      {/* Subtle Scientific Grid & Ambient Lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-12%] left-[-8%] w-[38%] h-[38%] bg-cyan-900/15 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-12%] right-[-8%] w-[38%] h-[38%] bg-indigo-900/15 blur-[130px] rounded-full" />
      </div>

      {/* Top System Bar */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-cyan-400 tracking-wide">
              <BrainCircuit className="w-4 h-4" />
              <span>{t('appName')}</span>
              <span className="text-slate-500 font-normal">·</span>
              <span className="text-slate-300 font-medium hidden md:inline">
                {t('appTagline')}
              </span>
            </div>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden lg:inline text-slate-400">
              {t('systemBarSubtitle')}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Automatic / Manual Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setShowLangMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors cursor-pointer text-xs"
                title="Idioma detectado automaticamente do sistema. Clique para alternar."
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold uppercase tracking-wider">{language}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50">
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
                          ? 'bg-cyan-950/70 text-cyan-300 font-semibold'
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

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border ${
                bridgeStatus.online
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title="O Bridge Nativo abre abas diretamente pelo Sistema Operacional (Windows, Linux, macOS), contornando bloqueadores de pop-up."
            >
              <Terminal className="w-3.5 h-3.5" />
              {bridgeStatus.online
                ? t('bridgeActive', { osName: bridgeStatus.osName })
                : t('bridgeOffline')}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
              {t('keyboardShortcut')}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 relative z-10">
        {/* Hero Command Section */}
        <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                {t('heroTitle')}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-3xl">
                {t('heroSubtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTranslatePtToEn}
                disabled={!isValidQuery || isTranslating}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isValidQuery
                    ? 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border-cyan-500/40 cursor-pointer'
                    : 'bg-slate-950/50 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
                title="Traduzir consulta do Português para terminologia acadêmica internacional em Inglês"
              >
                {isTranslating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Languages className="w-3.5 h-3.5" />
                )}
                <span>{t('translateBtn')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBooleanDrawer((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showBooleanDrawer
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t('booleanBuilderBtn')}</span>
              </button>
            </div>
          </div>

          {/* Search Input & Action Buttons */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-cyan-400" />
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
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-700/80 rounded-2xl text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all font-mono"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRunFederatedSearch}
                disabled={!isValidQuery || isSearchingApis}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${
                  isValidQuery
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/50 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
                title="Enter"
              >
                {isSearchingApis ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>{t('btnSearchApis')}</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchSelectedPlatforms}
                disabled={!isValidQuery || selectedPlatformIds.length === 0 || isLaunchingTabs}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${
                  isValidQuery && selectedPlatformIds.length > 0
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
                title="Shift + Enter"
              >
                <Rocket className="w-4 h-4" />
                <span>{t('btnLaunchTabs', { count: selectedPlatformIds.length })}</span>
              </button>

              <button
                type="button"
                onClick={handleHybridOmniSearch}
                disabled={!isValidQuery}
                className={`inline-flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-bold text-sm border transition-all ${
                  isValidQuery
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/30 cursor-pointer'
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
                title="Ctrl/Cmd + Enter"
              >
                <Cpu className="w-4 h-4" />
                <span className="hidden xl:inline">{t('btnTotalSearch')}</span>
              </button>
            </div>
          </div>

          {statusBanner && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-200 flex items-center justify-between">
              <span>{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-cyan-400 hover:text-white ml-4 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Preset Profiles Bar (Multi-Select Cumulative) */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    isFullyActive
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 shadow-sm shadow-cyan-950/50'
                      : isPartiallyActive
                      ? 'bg-slate-900 text-cyan-300/85 border-cyan-500/30 hover:border-cyan-500/50'
                      : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  {isFullyActive ? (
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <Square
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isPartiallyActive ? 'text-cyan-400/70' : 'text-slate-500'
                      }`}
                    />
                  )}
                  <span>{preset.name}</span>
                  {isPartiallyActive && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/40">
                      {matchedCount}/{preset.platformIds.length}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedPlatformIds(PLATFORMS.map((p) => p.id))}
              className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-slate-800/60 cursor-pointer"
            >
              {t('selectAll', { count: PLATFORMS.length })}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatformIds([])}
              className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-slate-800/60 cursor-pointer"
            >
              {t('clearSelection')}
            </button>
          </div>
        </div>

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

        {/* Primary Workspace Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('platforms')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'platforms'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>{t('tabPlatforms', { count: PLATFORMS.length })}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('federated')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'federated'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{t('tabFederated', { count: federatedPapers.length })}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              <span>{t('tabSaved', { count: savedPapers.length })}</span>
            </button>
          </div>

          {activeTab === 'platforms' && (
            <button
              type="button"
              onClick={() => setOnlyStrictlyFree((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                onlyStrictlyFree
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t('filterStrictlyFree')}</span>
            </button>
          )}
        </div>

        {/* TAB 1: PLATFORMS DIRECTORY */}
        {activeTab === 'platforms' && (
          <div>
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-slate-100 text-slate-950 border-white'
                    : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      activeCategory === catKey
                        ? meta.badgeClass
                        : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {meta.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Platforms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    className={`group relative rounded-2xl p-5 border transition-all flex flex-col h-full ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/20'
                        : 'bg-slate-900/45 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePlatformSelection(platform.id)}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                          title={
                            isSelected
                              ? 'Incluída no lançamento em lote (clique para desmarcar)'
                              : 'Clique para incluir no lançamento em lote'
                          }
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                        <div>
                          <h3 className="text-base font-bold text-slate-100 leading-tight">
                            {platform.name}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            {platform.shortTag}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${accessBadge.className}`}
                      >
                        {accessBadge.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300/90 leading-relaxed mb-3 flex-grow">
                      {platform.description}
                    </p>

                    <div className="text-[11px] text-slate-400 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 mb-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('coverageLabel')}</span>
                        <span className="text-slate-300 font-medium truncate max-w-[190px]">
                          {platform.coverageNote}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('categoryLabel')}</span>
                        <span className="text-cyan-300/90">{catMeta.label.split('&')[0]}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      <a
                        href={isValidQuery ? searchUrl : undefined}
                        target={isValidQuery ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!isValidQuery) e.preventDefault();
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold border transition-all ${
                          isValidQuery
                            ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 hover:border-cyan-500/40'
                            : 'bg-slate-950/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>
                          {isValidQuery
                            ? t('platformSearchBtn', { name: platform.name })
                            : t('enterTopicAbove')}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
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
