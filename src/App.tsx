import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  PLATFORMS,
  THEMATIC_AREAS,
  getLocalizedAccessBadges,
  getLocalizedCategoryMeta,
  getLocalizedLaunchPresets,
  getLocalizedThematicAreas,
} from './data/platforms';
import { getLocalizedPlatformInfo } from './data/platformsEn';
import {
  AccessModel,
  AccessSettingsTab,
  BooleanQueryState,
  CustomExtractionColumn,
  DedupOverrideRule,
  DeduplicationSummary,
  LibraryGroup,
  NormalizedPaper,
  PlatformCategory,
  QualityAppraisalResult,
  RelatedPaperUrl,
  SavedPaperItem,
  ScreeningStatus,
  SearchLogEntry,
  SearchScopeId,
  SourceFetchStatus,
  ThematicArea,
  UserAccessConfig,
} from './types/academic';
import {
  launchUrlsCrossPlatform,
  runFederatedSearch,
} from './services/academicAggregator';
import { OPEN_FEDERATED_SOURCE_COUNT, mapAreaToSearchScope } from './data/apiSources';
import { renderAreaIcon } from './utils/areaIcons';
import { translateAcademicQueryPtToEn } from './utils/queryBuilder';
import { parseAbstractMetadata } from './utils/abstractParser';
import { loadUserAccessConfig, saveUserAccessConfig } from './utils/accessConfig';
import { rewriteUrlWithInstitutionalProxy } from './utils/institutionalProxy';
import { FederatedResultsPanel } from './components/FederatedResultsPanel';
import { NotFoundView } from './components/NotFoundView';
import { PrismMonogram, PrismSpectralBar } from './components/PrismLogo';
import { UnifiedAreaFilterDrawer } from './components/UnifiedAreaFilterDrawer';
import { UserWorkspaceSection } from './components/UserWorkspaceSection';
import { WebLaunchDrawer, WebLaunchTarget } from './components/WebLaunchDrawer';
import type { AboutSectionId } from './components/AboutView';
import { useI18n } from './i18n/context';
import {
  buildCanonicalPath,
  parsePathnameToRoute,
  useSeoMeta,
  type AppTab,
} from './utils/seo';
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
  initPrivacyFirstAnalytics,
  isGaConfigured,
  trackAcademicEvent,
} from './utils/analytics';
import { CartographBackupPayload } from './utils/workspaceBackup';
import { deduplicatePapersAdvanced, makePairKey, normalizeDoi } from './utils/deduplication';
import { workspaceStorageEngine } from './utils/storageEngine';
import { LAYOUT_STORAGE_KEYS } from './utils/layoutPreferences';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Globe,
  History,
  KeyRound,
  LayoutGrid,
  List,
  Loader2,
  Moon,
  Search,
  Share2,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';

const BooleanBuilderDrawer = lazy(() =>
  import('./components/BooleanBuilderDrawer').then((m) => ({ default: m.BooleanBuilderDrawer }))
);
const SavedLiteratureDrawer = lazy(() =>
  import('./components/SavedLiteratureDrawer').then((m) => ({ default: m.SavedLiteratureDrawer }))
);
const FeedbackView = lazy(() =>
  import('./components/FeedbackView').then((m) => ({ default: m.FeedbackView }))
);
const AboutView = lazy(() =>
  import('./components/AboutView').then((m) => ({ default: m.AboutView }))
);
const AccessSettingsModal = lazy(() =>
  import('./components/AccessSettingsModal').then((m) => ({ default: m.AccessSettingsModal }))
);
const SearchHistoryDrawer = lazy(() =>
  import('./components/SearchHistoryDrawer').then((m) => ({ default: m.SearchHistoryDrawer }))
);

const STORAGE_KEY_SAVED = 'cartograph_saved_papers_v2';
const STORAGE_KEY_GROUPS = 'cartograph_library_groups_v1';
const STORAGE_KEY_ACTIVE_GROUP = 'cartograph_active_save_group_v1';
const STORAGE_KEY_SELECTED_PLATFORMS = 'cartograph_selected_platforms_v2';
const STORAGE_KEY_THEME = LAYOUT_STORAGE_KEYS.theme;
const STORAGE_KEY_SIDEBAR_DRAWERS = LAYOUT_STORAGE_KEYS.platformsSidebarDrawers;
const STORAGE_KEY_SELECTED_AREA = 'cartograph_selected_area_v1';
const STORAGE_KEY_DEDUP_ENABLED = 'cartograph_dedup_enabled_v1';
const STORAGE_KEY_DEDUP_OVERRIDES = 'cartograph_dedup_overrides_v1';
const STORAGE_KEY_SEARCH_LOG = 'cartograph_search_log_v1';

type SidebarSectionKey = 'sort' | 'presets' | 'categories' | 'access' | 'areas';
type PlatformSortMode = 'curated' | 'trust' | 'name' | 'access';

export default function AcademicCommandCenter() {
  const { language, isAutoLanguage, setLanguage, resetToSystemLanguage, t, availableLanguages } = useI18n();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const initialRoute = useMemo(
    () =>
      typeof window !== 'undefined'
        ? parsePathnameToRoute(window.location.pathname)
        : { tab: 'platforms' as AppTab, aboutSection: 'cartograph' as AboutSectionId, isNotFound: false, canonicalPath: '/' },
    []
  );

  const [query, setQuery] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('q')?.trim() || '';
    } catch {
      return '';
    }
  });
  const [activeTab, setActiveTab] = useState<AppTab>(initialRoute.tab);
  const [aboutSection, setAboutSection] = useState<AboutSectionId>(initialRoute.aboutSection);
  const [isNotFound, setIsNotFound] = useState<boolean>(initialRoute.isNotFound);

  const syncBrowserHistory = (
    tab: AppTab,
    section: AboutSectionId,
    queryOverride?: string
  ) => {
    try {
      const targetPath = buildCanonicalPath(tab, section);
      const effectiveQuery = (queryOverride ?? query).trim();
      const targetUrl =
        tab === 'federated' && effectiveQuery
          ? `${targetPath}?q=${encodeURIComponent(effectiveQuery)}`
          : targetPath;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== targetUrl) {
        window.history.pushState({ tab, aboutSection: section }, '', targetUrl);
      }
    } catch {
      // ignore in restricted environments
    }
  };

  const navigateToTab = (tab: AppTab) => {
    setIsNotFound(false);
    setActiveTab(tab);
    syncBrowserHistory(tab, aboutSection);
    trackAcademicEvent('navigation_view', { view: tab });
  };

  const navigateToAboutSection = (section: AboutSectionId) => {
    setIsNotFound(false);
    setAboutSection(section);
    setActiveTab('about');
    syncBrowserHistory('about', section);
    trackAcademicEvent('navigation_view', { view: `about_${section}` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useSeoMeta({
    activeTab,
    aboutSection,
    language,
    isNotFound,
  });
  const [activeCategory, setActiveCategory] = useState<'all' | PlatformCategory>('all');
  const [selectedArea, setSelectedArea] = useState<'all' | ThematicArea>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SELECTED_AREA);
      if (saved === 'all' || THEMATIC_AREAS.includes(saved as ThematicArea)) {
        return saved as 'all' | ThematicArea;
      }
    } catch {
      // ignore
    }
    return 'all';
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [accessFilter, setAccessFilter] = useState<'all' | 'gratuito' | 'pago' | 'aberto-institucional' | 'freemium'>('all');
  const [ownedOnlyFilter, setOwnedOnlyFilter] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalTab, setAccessModalTab] = useState<AccessSettingsTab>('proxy');
  const [userAccessConfig, setUserAccessConfig] = useState<UserAccessConfig>(() =>
    loadUserAccessConfig()
  );
  const activeSearchScope = useMemo<SearchScopeId>(
    () => mapAreaToSearchScope(selectedArea),
    [selectedArea]
  );
  const [showBooleanDrawer, setShowBooleanDrawer] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [platformSortBy, setPlatformSortBy] = useState<PlatformSortMode>('curated');
  const [sidebarDrawers, setSidebarDrawers] = useState<Record<SidebarSectionKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR_DRAWERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            sort: parsed.sort !== false,
            presets: parsed.presets !== false,
            categories: parsed.categories !== false,
            access: parsed.access !== false,
            areas: parsed.areas !== false,
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      sort: true,
      presets: true,
      categories: true,
      access: true,
      areas: true,
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
      sort: targetState,
      presets: targetState,
      categories: targetState,
      access: targetState,
      areas: targetState,
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

  const [libraryGroups, setLibraryGroups] = useState<LibraryGroup[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return [];
  });

  const [activeSaveGroupId, setActiveSaveGroupId] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_GROUP);
      if (raw) return raw;
    } catch {
      // ignore
    }
    return null;
  });

  const [rawFederatedPapers, setRawFederatedPapers] = useState<NormalizedPaper[]>([]);
  const [dedupEnabled, setDedupEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DEDUP_ENABLED) !== 'false';
    } catch {
      return true;
    }
  });
  const [dedupOverrides, setDedupOverrides] = useState<DedupOverrideRule>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DEDUP_OVERRIDES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.splitPairs)) {
          return {
            splitPairs: parsed.splitPairs.filter((x: unknown): x is string => typeof x === 'string'),
          };
        }
      }
    } catch {
      // ignore
    }
    return { splitPairs: [] };
  });
  const [searchLogs, setSearchLogs] = useState<SearchLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SEARCH_LOG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.slice(0, 100);
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [customColumns, setCustomColumns] = useState<CustomExtractionColumn[]>([]);
  const [showSearchHistoryModal, setShowSearchHistoryModal] = useState(false);
  const [federatedQuery, setFederatedQuery] = useState<string>('');
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
  const [webLaunchDrawerOpen, setWebLaunchDrawerOpen] = useState(false);
  const [webLaunchTargets, setWebLaunchTargets] = useState<WebLaunchTarget[]>([]);
  const [webLaunchLimited, setWebLaunchLimited] = useState(false);
  const [analyticsConsentPrompt, setAnalyticsConsentPrompt] = useState<boolean>(
    () => isGaConfigured() && getAnalyticsConsent() === null
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchRequestIdRef = useRef(0);
  const didAutoSearchRef = useRef(false);
  const isStorageHydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await workspaceStorageEngine.initAndMigrate();
        const [
          storedPapers,
          storedGroups,
          storedActiveGroup,
          storedPlatforms,
          storedLogs,
          storedOverrides,
          storedCustomColumns,
        ] = await Promise.all([
          workspaceStorageEngine.getItem<SavedPaperItem[] | null>('savedPapers', null),
          workspaceStorageEngine.getItem<LibraryGroup[] | null>('libraryGroups', null),
          workspaceStorageEngine.getItem<string | null>('activeSaveGroupId', null),
          workspaceStorageEngine.getItem<string[] | null>('selectedPlatformIds', null),
          workspaceStorageEngine.getItem<SearchLogEntry[] | null>('searchLogs', null),
          workspaceStorageEngine.getItem<DedupOverrideRule | null>('dedupOverrides', null),
          workspaceStorageEngine.getItem<CustomExtractionColumn[] | null>('customColumns', null),
        ]);

        if (!active) return;

        if (Array.isArray(storedPapers)) setSavedPapers(storedPapers);
        if (Array.isArray(storedGroups)) setLibraryGroups(storedGroups);
        if (storedActiveGroup !== null) setActiveSaveGroupId(storedActiveGroup);
        if (Array.isArray(storedPlatforms) && storedPlatforms.length > 0) {
          setSelectedPlatformIds(storedPlatforms);
        }
        if (Array.isArray(storedLogs)) setSearchLogs(storedLogs.slice(0, 100));
        if (storedOverrides && Array.isArray(storedOverrides.splitPairs)) {
          setDedupOverrides({ splitPairs: storedOverrides.splitPairs });
        }
        if (Array.isArray(storedCustomColumns)) {
          setCustomColumns(storedCustomColumns);
        }
      } finally {
        if (active) {
          isStorageHydratedRef.current = true;
        }
      }
    })();
    return () => {
      active = false;
      searchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    void workspaceStorageEngine.setItem('savedPapers', savedPapers);
  }, [savedPapers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DEDUP_ENABLED, String(dedupEnabled));
    } catch {
      // ignore
    }
  }, [dedupEnabled]);

  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    void workspaceStorageEngine.setItem('dedupOverrides', dedupOverrides);
  }, [dedupOverrides]);

  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    void workspaceStorageEngine.setItem('searchLogs', searchLogs);
  }, [searchLogs]);

  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    void workspaceStorageEngine.setItem('libraryGroups', libraryGroups);
  }, [libraryGroups]);

  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    void workspaceStorageEngine.setItem('activeSaveGroupId', activeSaveGroupId);
  }, [activeSaveGroupId]);

  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    void workspaceStorageEngine.setItem('selectedPlatformIds', selectedPlatformIds);
  }, [selectedPlatformIds]);

  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    void workspaceStorageEngine.setItem('customColumns', customColumns);
  }, [customColumns]);

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

  // Initialize privacy-first GA4 (if configured) and browser history popstate listener
  useEffect(() => {
    initPrivacyFirstAnalytics();

    try {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get('lang')?.toLowerCase();
      if (langParam === 'pt' || langParam === 'en') {
        setLanguage(langParam);
      }
    } catch {
      // ignore
    }

    const onPopState = () => {
      const parsed = parsePathnameToRoute(window.location.pathname);
      setIsNotFound(parsed.isNotFound);
      setActiveTab(parsed.tab);
      setAboutSection(parsed.aboutSection);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setLanguage]);

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

  const ownedPlatformSet = useMemo(
    () => new Set(userAccessConfig.ownedPlatformIds),
    [userAccessConfig.ownedPlatformIds]
  );

  const hasActiveAccessEnhancement = useMemo(
    () =>
      userAccessConfig.institutionalProxy.enabled ||
      Object.values(userAccessConfig.byokKeys).some(
        (entry) => Boolean(entry?.enabled && entry?.apiKey?.trim())
      ) ||
      userAccessConfig.ownedPlatformIds.length > 0,
    [userAccessConfig]
  );

  const handleUpdateUserAccessConfig = (next: UserAccessConfig) => {
    setUserAccessConfig(next);
    saveUserAccessConfig(next);
  };

  const openAccessSettings = (tab: AccessSettingsTab = 'proxy') => {
    setAccessModalTab(tab);
    setShowAccessModal(true);
  };

  const handleSelectUnifiedArea = (area: 'all' | ThematicArea) => {
    const prevScope = activeSearchScope;
    const nextScope = mapAreaToSearchScope(area);
    setSelectedArea(area);
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_AREA, area);
    } catch {
      // ignore
    }

    if (activeTab === 'federated' && federatedQuery.trim() && nextScope !== prevScope) {
      void executeFederatedSearch(nextScope);
    }
  };

  const visiblePlatforms = useMemo(() => {
    const filtered = PLATFORMS.filter((p) => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (accessFilter !== 'all' && p.accessModel !== accessFilter) return false;
      if (ownedOnlyFilter && !ownedPlatformSet.has(p.id)) return false;
      if (selectedArea !== 'all' && !p.thematicAreas.includes(selectedArea)) return false;
      return true;
    });

    if (platformSortBy === 'curated') return filtered;

    const accessRank: Record<AccessModel, number> = {
      gratuito: 0,
      'aberto-institucional': 1,
      freemium: 2,
      pago: 3,
    };

    return [...filtered].sort((a, b) => {
      if (platformSortBy === 'trust') {
        if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
        return a.name.localeCompare(b.name);
      }
      if (platformSortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      const rankDiff = accessRank[a.accessModel] - accessRank[b.accessModel];
      if (rankDiff !== 0) return rankDiff;
      return b.trustScore - a.trustScore;
    });
  }, [activeCategory, accessFilter, ownedOnlyFilter, ownedPlatformSet, selectedArea, platformSortBy]);

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
    trackAcademicEvent('preset_selected', {
      preset_id: presetId,
      platforms_count: presetPlatformIds.length,
    });
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

  const handleCopySearchShareUrl = async () => {
    if (!isValidQuery) return;
    try {
      const shareUrl = `${window.location.origin}/federated?q=${encodeURIComponent(trimmedQuery)}`;
      await navigator.clipboard.writeText(shareUrl);
      setStatusBanner(t('shareLinkCopied'));
      setTimeout(() => setStatusBanner(null), 4000);
    } catch {
      setStatusBanner(t('shareLinkError'));
      setTimeout(() => setStatusBanner(null), 3500);
    }
  };

  const executeFederatedSearch = async (
    scopeOverride: SearchScopeId,
    queryOverride?: string,
    yearFromOverride?: number | null
  ) => {
    const effectiveQuery = (queryOverride ?? trimmedQuery).trim();
    if (!effectiveQuery) return;
    const effectiveYearFrom =
      yearFromOverride !== undefined ? (yearFromOverride ?? undefined) : yearStartNum;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const requestId = ++searchRequestIdRef.current;

    setIsNotFound(false);
    setActiveTab('federated');
    syncBrowserHistory('federated', aboutSection, effectiveQuery);
    setIsSearchingApis(true);
    setFederatedQuery(effectiveQuery);
    setRawFederatedPapers([]);
    setDedupSummary(null);
    setSourceStatuses([]);

    try {
      const { rawPapers, statuses, deduplicationSummary } = await runFederatedSearch(
        effectiveQuery,
        effectiveYearFrom,
        {
          signal: controller.signal,
          language,
          scope: scopeOverride,
          accessConfig: userAccessConfig,
          onProgress: (progress) => {
            if (requestId !== searchRequestIdRef.current || controller.signal.aborted) {
              return;
            }
            setRawFederatedPapers(progress.rawPapers);
            setSourceStatuses(progress.statuses);
            setDedupSummary(progress.deduplicationSummary);
          },
        }
      );

      if (requestId !== searchRequestIdRef.current || controller.signal.aborted) {
        return;
      }

      setRawFederatedPapers(rawPapers);
      setSourceStatuses(statuses);
      setDedupSummary(deduplicationSummary);

      const bySource: SearchLogEntry['bySource'] = {};
      statuses.forEach((s) => {
        bySource[s.source] = {
          status: s.status,
          count: s.count,
          latencyMs: s.latencyMs,
        };
      });
      const newLog: SearchLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        executedAt: new Date().toISOString(),
        query: effectiveQuery,
        yearFrom: effectiveYearFrom ?? null,
        scope: scopeOverride,
        dedupEnabled,
        totalRaw: rawPapers.length,
        totalUnique: dedupEnabled ? deduplicationSummary.uniqueCount : rawPapers.length,
        bySource,
      };
      setSearchLogs((prev) => [newLog, ...prev].slice(0, 100));

      trackAcademicEvent('federated_search', {
        query_length: effectiveQuery.length,
        has_year_filter: Boolean(effectiveYearFrom),
        results_count: rawPapers.length,
      });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError' && requestId === searchRequestIdRef.current) {
        // Fallback safety: individual source errors are reflected via statuses
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearchingApis(false);
      }
    }
  };

  const handleRunFederatedSearch = () => executeFederatedSearch(activeSearchScope);

  // Auto-trigger federated search once when loading a shared /federated?q=... URL
  useEffect(() => {
    if (
      !didAutoSearchRef.current &&
      initialRoute.tab === 'federated' &&
      !initialRoute.isNotFound &&
      trimmedQuery
    ) {
      didAutoSearchRef.current = true;
      void handleRunFederatedSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLaunchSelectedPlatforms = async () => {
    if (!isValidQuery || selectedPlatformIds.length === 0 || isLaunchingTabs) return;
    setIsLaunchingTabs(true);
    try {
      const targets: WebLaunchTarget[] = PLATFORMS.filter((p) =>
        selectedPlatformIds.includes(p.id)
      ).map((p) => {
        const rawUrl = p.buildUrl(encodedQuery, trimmedQuery, yearStartNum);
        return {
          id: p.id,
          name: p.name,
          shortTag: getLocalizedPlatformInfo(p, language).shortTag,
          url: rewriteUrlWithInstitutionalProxy(
            rawUrl,
            userAccessConfig.institutionalProxy,
            p.accessModel
          ),
        };
      });
      const urls = targets.map((target) => target.url);
      const result = await launchUrlsCrossPlatform(urls);
      trackAcademicEvent('multi_tab_launch', {
        platforms_count: urls.length,
        used_native_bridge: result.usedNativeBridge,
      });

      if (!result.usedNativeBridge && targets.length > 1) {
        setWebLaunchTargets(targets);
        setWebLaunchLimited(true);
        setWebLaunchDrawerOpen(true);
      }

      setStatusBanner(
        result.usedNativeBridge
          ? t('platformsOpenedBridge', {
              count: result.launchedCount,
              osName: bridgeStatus.osName,
            })
          : `${t('platformsOpenedBrowser', { count: result.launchedCount })}${
              urls.length > 1 ? ` ${t('assistedLaunchNotice')}` : ''
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

  const handleCreateGroup = (name: string, color: string = '#01ABE8'): LibraryGroup => {
    const newGroup: LibraryGroup = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      color,
      createdAt: new Date().toISOString(),
    };
    setLibraryGroups((prev) => [...prev, newGroup]);
    trackAcademicEvent('library_group_action', { action: 'create' });
    return newGroup;
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setLibraryGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g))
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    setLibraryGroups((prev) => prev.filter((g) => g.id !== groupId));
    // Move papers of this deleted group back to "Sem grupo" (null) so no research is lost
    setSavedPapers((prev) =>
      prev.map((item) => (item.groupId === groupId ? { ...item, groupId: null } : item))
    );
    setActiveSaveGroupId((prev) => (prev === groupId ? null : prev));
  };

  const handleAssignPaperGroup = (paperId: string, groupId: string | null) => {
    setSavedPapers((prev) =>
      prev.map((item) => (item.id === paperId ? { ...item, groupId } : item))
    );
  };

  const handleClearLibrary = (onlyGroupId?: string | 'ungrouped') => {
    if (!onlyGroupId) {
      setSavedPapers([]);
      return;
    }
    if (onlyGroupId === 'ungrouped') {
      const validGroupIds = new Set(libraryGroups.map((g) => g.id));
      setSavedPapers((prev) =>
        prev.filter((item) => item.groupId && validGroupIds.has(item.groupId))
      );
      return;
    }
    setSavedPapers((prev) => prev.filter((item) => item.groupId !== onlyGroupId));
  };

  const handleImportSavedPapers = (
    imported: SavedPaperItem[],
    targetGroupId?: string | null
  ): { added: number; skippedDuplicates: number } => {
    const existingIds = new Set(savedPapers.map((p) => p.id));
    const existingDois = new Set(
      savedPapers
        .map((p) => normalizeDoi(p.doi))
        .filter((d): d is string => Boolean(d))
    );
    const existingTitles = new Set(
      savedPapers.map((p) => p.title.trim().toLowerCase())
    );

    const resolvedGroup =
      targetGroupId !== undefined ? targetGroupId : activeSaveGroupId;

    const toAdd: SavedPaperItem[] = [];
    let skippedDuplicates = 0;

    for (const candidate of imported) {
      const normDoi = normalizeDoi(candidate.doi);
      const normTitle = candidate.title.trim().toLowerCase();
      if (
        existingIds.has(candidate.id) ||
        (normDoi && existingDois.has(normDoi)) ||
        existingTitles.has(normTitle)
      ) {
        skippedDuplicates++;
        continue;
      }
      existingIds.add(candidate.id);
      if (normDoi) existingDois.add(normDoi);
      existingTitles.add(normTitle);
      toAdd.push({
        ...candidate,
        groupId: candidate.groupId ?? resolvedGroup ?? null,
      });
    }

    if (toAdd.length > 0) {
      setSavedPapers((prev) => [...toAdd, ...prev]);
    }

    return { added: toAdd.length, skippedDuplicates };
  };

  const handleRestoreWorkspaceBackup = (
    payload: CartographBackupPayload,
    mode: 'merge' | 'replace'
  ): { papersAdded: number; groupsAdded: number } => {
    const validPlatformSet = new Set(PLATFORMS.map((p) => p.id));
    const validPlatforms = payload.selectedPlatformIds.filter((id) =>
      validPlatformSet.has(id)
    );

    if (mode === 'replace') {
      setLibraryGroups(payload.groups);
      setSavedPapers(payload.savedPapers);
      if (validPlatforms.length > 0) {
        setSelectedPlatformIds(validPlatforms);
      }
      if (Array.isArray(payload.ownedPlatformIds)) {
        const validOwned = payload.ownedPlatformIds.filter((id) => validPlatformSet.has(id));
        handleUpdateUserAccessConfig({
          ...userAccessConfig,
          ownedPlatformIds: validOwned,
        });
      }
      setActiveSaveGroupId(payload.activeSaveGroupId ?? null);
      if (Array.isArray(payload.searchLogs)) {
        setSearchLogs(payload.searchLogs.slice(0, 100));
      }
      if (payload.dedupOverrides) {
        setDedupOverrides(payload.dedupOverrides);
      }
      if (Array.isArray(payload.customColumns)) {
        setCustomColumns(payload.customColumns);
      }
      return {
        papersAdded: payload.savedPapers.length,
        groupsAdded: payload.groups.length,
      };
    }

    const existingGroupIds = new Set(libraryGroups.map((g) => g.id));
    const newGroups = payload.groups.filter((g) => !existingGroupIds.has(g.id));
    if (newGroups.length > 0) {
      setLibraryGroups((prev) => [...prev, ...newGroups]);
    }

    if (validPlatforms.length > 0) {
      setSelectedPlatformIds((prev) =>
        Array.from(new Set([...prev, ...validPlatforms]))
      );
    }

    if (Array.isArray(payload.ownedPlatformIds) && payload.ownedPlatformIds.length > 0) {
      const validOwned = payload.ownedPlatformIds.filter((id) => validPlatformSet.has(id));
      handleUpdateUserAccessConfig({
        ...userAccessConfig,
        ownedPlatformIds: Array.from(
          new Set([...userAccessConfig.ownedPlatformIds, ...validOwned])
        ),
      });
    }

    if (Array.isArray(payload.searchLogs) && payload.searchLogs.length > 0) {
      setSearchLogs((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        const merged = [...prev, ...payload.searchLogs!.filter((l) => !seen.has(l.id))];
        return merged.slice(0, 100);
      });
    }

    if (payload.dedupOverrides?.splitPairs?.length) {
      setDedupOverrides((prev) => ({
        splitPairs: Array.from(new Set([...prev.splitPairs, ...payload.dedupOverrides!.splitPairs])),
      }));
    }

    if (Array.isArray(payload.customColumns) && payload.customColumns.length > 0) {
      setCustomColumns((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...payload.customColumns!.filter((c) => !seen.has(c.id))];
      });
    }

    const paperRes = handleImportSavedPapers(payload.savedPapers, null);
    return {
      papersAdded: paperRes.added,
      groupsAdded: newGroups.length,
    };
  };

  const handleToggleSavePaper = (
    paper: NormalizedPaper,
    targetGroupId?: string | null
  ) => {
    setSavedPapers((prev) => {
      const exists = prev.some((item) => item.id === paper.id);
      if (exists) {
        return prev.filter((item) => item.id !== paper.id);
      }
      trackAcademicEvent('paper_saved', {
        source_api: paper.source,
      });
      const extractedMetadata = parseAbstractMetadata(
        paper.title,
        paper.abstractText,
        paper.publicationType,
        language
      );
      const resolvedGroupId =
        targetGroupId !== undefined ? targetGroupId : activeSaveGroupId;
      const newItem: SavedPaperItem = {
        ...paper,
        savedAt: new Date().toISOString(),
        researcherNotes: '',
        relevanceTag: 'alta',
        screeningStatus: 'unscreened',
        extractedMetadata,
        groupId: resolvedGroupId ?? null,
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

  const handleUpdateCustomField = (id: string, columnId: string, value: string) => {
    setSavedPapers((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              customFields: {
                ...(item.customFields || {}),
                [columnId]: value,
              },
            }
          : item
      )
    );
  };

  const handleUpdateQualityAppraisal = (
    id: string,
    appraisal: QualityAppraisalResult
  ) => {
    setSavedPapers((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qualityAppraisal: appraisal } : item
      )
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

  const handleSplitMergePair = (idA: string, idB: string) => {
    const key = makePairKey(idA, idB);
    setDedupOverrides((prev) => {
      if (prev.splitPairs.includes(key)) return prev;
      return { splitPairs: [...prev.splitPairs, key] };
    });
  };

  const handleLinkRelatedPaper = (targetId: string, sourceId: string) => {
    if (!targetId || !sourceId || targetId === sourceId) return;
    setSavedPapers((prev) => {
      const target = prev.find((p) => p.id === targetId);
      const source = prev.find((p) => p.id === sourceId);
      if (!target || !source) return prev;

      const existing = target.relatedUrls ?? [];
      const seenUrls = new Set(existing.map((r) => r.url));
      const newLinks: RelatedPaperUrl[] = [...existing];

      const inferredKind: RelatedPaperUrl['kind'] =
        source.source === 'arxiv' ||
        source.source === 'socarxiv' ||
        (source.url || '').includes('osf.io/preprints') ||
        (source.url || '').includes('biorxiv') ||
        (source.url || '').includes('medrxiv')
          ? 'preprint'
          : 'published';

      if (source.url && !seenUrls.has(source.url) && source.url !== target.url) {
        seenUrls.add(source.url);
        newLinks.push({
          kind: inferredKind,
          label: `${source.source.toUpperCase()} (${source.year ?? 's.d.'})`,
          url: source.url,
        });
      }
      if (source.pdfUrl && !seenUrls.has(source.pdfUrl) && source.pdfUrl !== target.pdfUrl) {
        seenUrls.add(source.pdfUrl);
        newLinks.push({
          kind: inferredKind,
          label: `${source.source.toUpperCase()} PDF`,
          url: source.pdfUrl,
        });
      }
      for (const extra of source.relatedUrls ?? []) {
        if (extra.url && !seenUrls.has(extra.url)) {
          seenUrls.add(extra.url);
          newLinks.push(extra);
        }
      }

      const mergedNotes =
        source.researcherNotes.trim() && !target.researcherNotes.includes(source.researcherNotes.trim())
          ? [target.researcherNotes.trim(), source.researcherNotes.trim()].filter(Boolean).join('\n\n')
          : target.researcherNotes;

      return prev
        .filter((p) => p.id !== sourceId)
        .map((p) =>
          p.id === targetId
            ? {
                ...p,
                relatedUrls: newLinks,
                researcherNotes: mergedNotes,
                pdfUrl: p.pdfUrl ?? source.pdfUrl,
                doi: p.doi ?? source.doi,
              }
            : p
        );
    });
  };

  const dedupComputation = useMemo(
    () => deduplicatePapersAdvanced(rawFederatedPapers, dedupOverrides),
    [rawFederatedPapers, dedupOverrides]
  );

  const federatedPapers = useMemo(
    () => (dedupEnabled ? dedupComputation.papers : rawFederatedPapers),
    [dedupEnabled, dedupComputation.papers, rawFederatedPapers]
  );

  const effectiveDedupSummary = useMemo<DeduplicationSummary | null>(() => {
    if (!dedupSummary && rawFederatedPapers.length === 0) return null;
    if (!dedupEnabled) {
      return {
        originalCount: rawFederatedPapers.length,
        uniqueCount: rawFederatedPapers.length,
        duplicatesRemoved: 0,
        mergedByDoi: 0,
        mergedByPmidOrArxiv: 0,
        mergedByFuzzyTitle: 0,
      };
    }
    return dedupComputation.summary;
  }, [dedupSummary, rawFederatedPapers.length, dedupEnabled, dedupComputation.summary]);

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
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToTab('platforms');
                    setActiveCategory('all');
                    handleSelectUnifiedArea('all');
                  }}
                  className="inline-flex items-center gap-2.5 font-heading tracking-tight text-[var(--text-primary)] shrink-0 hover:opacity-90 transition-opacity"
                  title={t('brandTitle')}
                >
                  <PrismMonogram className="h-[30px] w-auto" />
                  <div className="flex flex-col leading-none">
                    <span className="font-heading font-semibold text-[18px] tracking-tight">Cartograph</span>
                    <span className="text-[11.5px] text-[var(--text-muted)] font-medium mt-0.5">{t('appTagline')}</span>
                  </div>
                </a>

                {/* Mobile Controls */}
                <div className="flex items-center gap-1.5 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setShowAccessModal(true)}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      hasActiveAccessEnhancement
                        ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                    title={t('accessSettingsBtn')}
                    aria-label={t('accessSettingsBtn')}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
                    className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] uppercase cursor-pointer"
                    aria-label={t('languageMenuLabel')}
                    title={t('languageMenuLabel')}
                  >
                    {language}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                    className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                    title={t('toggleThemeTitle')}
                    aria-label={t('toggleThemeTitle')}
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Borderless Search Pill (Balanced Search Engine Scale) */}
              <div className="flex-1 max-w-[720px] flex items-center bg-[var(--bg-subtle)] focus-within:bg-[var(--bg-secondary)] focus-within:ring-2 focus-within:ring-[var(--link-academic)]/25 rounded-full pl-4 pr-1.5 py-1.5 transition-all">
                <Search className="w-[18px] h-[18px] text-[var(--text-muted)] shrink-0 mr-2.5" />
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
                  className="w-full bg-transparent text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-1 cursor-pointer"
                    title={t('clearSearchTitle')}
                    aria-label={t('clearSearchTitle')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {isValidQuery && (
                  <button
                    type="button"
                    onClick={handleCopySearchShareUrl}
                    className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] mr-1 cursor-pointer"
                    title={t('shareSearchTitle')}
                    aria-label={t('shareSearchTitle')}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTranslatePtToEn}
                  disabled={!isValidQuery || isTranslating}
                  className={`px-2.5 py-1 rounded-full text-[13px] font-medium transition-colors mr-1 ${
                    isValidQuery
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer'
                      : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                  }`}
                  title={t('translateTitle')}
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
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleRunFederatedSearch}
                  disabled={!isValidQuery}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-opacity shrink-0 ${
                    isValidQuery
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  {isSearchingApis && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('searchBtn')}</span>
                </button>
              </div>
            </div>

            {/* Right Actions: Batch Portal Launch + Theme + Language */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button
                type="button"
                onClick={handleLaunchSelectedPlatforms}
                disabled={!isValidQuery || selectedPlatformIds.length === 0 || isLaunchingTabs}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  isValidQuery && selectedPlatformIds.length > 0
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] hover:opacity-85 cursor-pointer'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
                }`}
                title={t('openPortalsTitle')}
              >
                <span>{t('openPortalsCount', { count: selectedPlatformIds.length })}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openAccessSettings('proxy')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors cursor-pointer ${
                    hasActiveAccessEnhancement
                      ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  title={t('accessSettingsBtn')}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">{t('accessSettingsBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                  className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  title={t('toggleThemeTitle')}
                  aria-label={t('toggleThemeTitle')}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                <div className="relative" ref={langMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowLangMenu((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer uppercase"
                    aria-label={t('languageMenuLabel')}
                    title={isAutoLanguage ? `${t('languageMenuLabel')} · ${t('languageSystemHint')}` : t('languageMenuLabel')}
                  >
                    <span>{language}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </button>

                  {showLangMenu && (
                    <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] shadow-xl py-1.5 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          resetToSystemLanguage();
                          setShowLangMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-1.5 text-[13px] transition-colors cursor-pointer text-left ${
                          isAutoLanguage
                            ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        <span className="truncate">{t('languageAutoSystem')}</span>
                        {isAutoLanguage && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                      <div className="my-1 border-t border-[var(--divider)]" />
                      {availableLanguages.map((langOpt) => (
                        <button
                          key={langOpt.code}
                          type="button"
                          onClick={() => {
                            setLanguage(langOpt.code);
                            setShowLangMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-1.5 text-[13px] transition-colors cursor-pointer text-left ${
                            !isAutoLanguage && language === langOpt.code
                              ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-semibold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <span>{langOpt.nativeLabel}</span>
                          {!isAutoLanguage && language === langOpt.code && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
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
            <Suspense fallback={null}>
              <BooleanBuilderDrawer
                state={booleanState}
                onChange={setBooleanState}
                onApplyCompiledQuery={(compiled) => {
                  setQuery(compiled);
                  setStatusBanner(t('booleanAppliedBanner'));
                  setTimeout(() => setStatusBanner(null), 3500);
                }}
              />
            </Suspense>
          )}

          {/* Status Banner */}
          {statusBanner && (
            <div className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-blue-tint)] text-[13px] text-[var(--link-academic)] flex items-center justify-between">
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
              onClick={() => navigateToTab('platforms')}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                !isNotFound && activeTab === 'platforms'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('tabPlatforms', { count: PLATFORMS.length })}
            </button>

            <button
              type="button"
              onClick={() => navigateToTab('federated')}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                !isNotFound && activeTab === 'federated'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('tabFederated', { count: federatedPapers.length })}
            </button>

            <button
              type="button"
              onClick={() => navigateToTab('saved')}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                !isNotFound && activeTab === 'saved'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('tabSaved', { count: savedPapers.length })}
            </button>

            <button
              type="button"
              onClick={() => setShowSearchHistoryModal(true)}
              className="ml-auto pb-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--link-academic)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5" />
              <span>{t('searchHistoryBtn', { count: searchLogs.length })}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isNotFound ? (
          <NotFoundView
            invalidPath={typeof window !== 'undefined' ? window.location.pathname : ''}
            onNavigateTab={(tab) => {
              navigateToTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onFocusSearch={() => searchInputRef.current?.focus()}
          />
        ) : (
          <>
            {/* TAB 1: PLATFORMS DIRECTORY */}
            {activeTab === 'platforms' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 xl:gap-8 items-start">
            {/* Left Sidebar — Scroll Individual com Gavetas Retráteis / Expansíveis */}
            <aside
              className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pr-2 pb-8 select-none"
              aria-label={t('sidebarAriaLabel')}
            >
              {/* Header com Ação Rápida de Expandir / Recolher Todas */}
              <div className="flex items-center justify-between px-2 pb-2.5 border-b border-[var(--divider)]">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>{t('filtersNavTitle')}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleAllSidebarDrawers}
                  className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer font-medium"
                  title={allDrawersOpen ? t('collapseAllTitle') : t('expandAllTitle')}
                >
                  {allDrawersOpen ? t('collapseAll') : t('expandAll')}
                </button>
              </div>

              {/* Gaveta 1: Sort Controls (Primary ordering control — top priority) */}
              <div className="border-b border-[var(--divider)] pb-3">
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
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {t('sortByLabel')}
                    </span>
                    {platformSortBy !== 'curated' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                        {platformSortBy === 'trust'
                          ? t('platformSortShortTrust')
                          : platformSortBy === 'name'
                          ? t('platformSortShortName')
                          : t('platformSortShortAccess')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {platformSortBy !== 'curated' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlatformSortBy('curated');
                        }}
                        className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                      >
                        {t('clearFilter')}
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
                  <div className="space-y-0.5 text-[13.5px] pt-1.5">
                    {(['curated', 'trust', 'name', 'access'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPlatformSortBy(mode)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          platformSortBy === mode
                            ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {mode === 'curated' && t('platformSortCurated')}
                        {mode === 'trust' && t('platformSortTrust')}
                        {mode === 'name' && t('platformSortName')}
                        {mode === 'access' && t('platformSortAccess')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Gaveta 2: Cumulative Presets List (Highest-frequency batch selection) */}
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
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {t('quickSelectionTitle')}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums shrink-0 ${
                        selectedPlatformIds.length > 0
                          ? 'bg-[var(--link-academic)]/15 text-[var(--link-academic)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}
                      title={t('quickSelectionTitleAttr', { selected: selectedPlatformIds.length, total: PLATFORMS.length })}
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
                  <div className="space-y-1 text-[13.5px] pt-1.5">
                    {/* Sub-barra de Ações da Gaveta */}
                    <div className="flex items-center justify-between px-2.5 py-1 mb-1.5 bg-[var(--bg-subtle)]/70 rounded-md border border-[var(--divider)]">
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        {t('quickSelectionActiveCount', { selected: selectedPlatformIds.length, total: PLATFORMS.length })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPlatformIds(PLATFORMS.map((p) => p.id))}
                          className="text-xs font-semibold text-[var(--link-academic)] hover:underline cursor-pointer"
                        >
                          {t('quickSelectionAllBtn')}
                        </button>
                        <span className="text-[var(--divider)] text-xs">·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPlatformIds([])}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          {t('clearFilter')}
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
                              className="w-3.5 h-3.5 rounded accent-[var(--link-academic)] pointer-events-none"
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

              {/* Gaveta 3: Functional Categories (Primary structural filter) */}
              <div className="border-b border-[var(--divider)] pb-3">
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
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {t('platformTypeTitle')}
                    </span>
                    {activeCategory !== 'all' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
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
                        className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                      >
                        {t('clearFilter')}
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
                  <div className="space-y-0.5 text-[13.5px] pt-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveCategory('all')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        activeCategory === 'all'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>{t('platformTypeAll')}</span>
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

              {/* Gaveta 4: Access Model Filter */}
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
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {t('accessModelTitle')}
                    </span>
                    {accessFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                        {accessFilter === 'gratuito'
                          ? t('accessShortFree')
                          : accessFilter === 'pago'
                          ? t('accessShortPaid')
                          : accessFilter === 'aberto-institucional'
                          ? t('accessShortInst')
                          : t('accessShortFreemium')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(accessFilter !== 'all' || ownedOnlyFilter) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccessFilter('all');
                          setOwnedOnlyFilter(false);
                        }}
                        className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                      >
                        {t('clearFilter')}
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
                  <div className="space-y-0.5 text-[13.5px] pt-1.5">
                    <button
                      type="button"
                      onClick={() => setAccessFilter('all')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        accessFilter === 'all'
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>{t('accessModelAll')}</span>
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
                      <span>{t('accessModelFree')}</span>
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
                      <span>{t('accessModelPaid')}</span>
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
                      <span>{t('accessModelInstitutional')}</span>
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
                      <span>{t('accessModelFreemium')}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {PLATFORMS.filter((p) => p.accessModel === 'freemium').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOwnedOnlyFilter((prev) => !prev)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        ownedOnlyFilter
                          ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="truncate">{t('filterOwnedOnly')}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {userAccessConfig.ownedPlatformIds.length}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Gaveta 5: Unified Thematic Field & Metasearch Scope (14-item disciplinary filter) */}
              <UnifiedAreaFilterDrawer
                selectedArea={selectedArea}
                onSelectArea={handleSelectUnifiedArea}
                isOpen={sidebarDrawers.areas}
                onToggleOpen={() => toggleSidebarDrawer('areas')}
                mode="platforms"
                accessConfig={userAccessConfig}
              />

              {/* User Preferences & Access Workspace (Tagged for future User System) */}
              <UserWorkspaceSection
                config={userAccessConfig}
                onOpenAccessSettings={openAccessSettings}
              />
            </aside>

            {/* Right Main Directory Area */}
            <div className="min-w-0">
              {/* Specialized Areas Horizontal Quick Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
                <button
                  type="button"
                  onClick={() => handleSelectUnifiedArea('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedArea === 'all'
                      ? 'bg-[var(--link-academic)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('areaAll')}</span>
                  <span className="opacity-75 text-[11.5px]">({PLATFORMS.length})</span>
                </button>
                {THEMATIC_AREAS.map((areaKey) => {
                  const meta = localizedThematicAreas[areaKey];
                  const count = PLATFORMS.filter((p) => p.thematicAreas.includes(areaKey)).length;
                  const isActive = selectedArea === areaKey;
                  return (
                    <button
                      key={areaKey}
                      type="button"
                      onClick={() => handleSelectUnifiedArea(areaKey)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[var(--link-academic)] text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {renderAreaIcon(areaKey, 'w-3.5 h-3.5')}
                      <span>{meta.label}</span>
                      <span className="opacity-75 text-[11.5px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Directory Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    {selectedArea !== 'all' && renderAreaIcon(selectedArea, 'w-4 h-4 text-[var(--link-academic)]')}
                    <span>
                      {selectedArea !== 'all'
                        ? localizedThematicAreas[selectedArea].label
                        : activeCategoryHeading.title}
                    </span>
                  </h1>
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                    {t('directoryResultsSummary', { visible: visiblePlatforms.length, selected: selectedPlatformIds.length })}
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
                    title={t('gridViewTitle')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    title={t('listViewTitle')}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* VIEW 1: BORDERLESS SOFT SURFACE CARDS */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {visiblePlatforms.map((platform) => {
                    const isSelected = selectedPlatformIds.includes(platform.id);
                    const isOwned = ownedPlatformSet.has(platform.id);
                    const accessBadge = localizedAccessBadges[platform.accessModel];
                    const localizedInfo = getLocalizedPlatformInfo(platform, language);
                    const rawTargetUrl = platform.buildUrl(
                      encodedQuery,
                      trimmedQuery,
                      yearStartNum
                    );
                    const targetUrl = rewriteUrlWithInstitutionalProxy(
                      rawTargetUrl,
                      userAccessConfig.institutionalProxy,
                      platform.accessModel
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
                                title={t('includeInBatchTitle')}
                              />
                              <div className="min-w-0">
                                <a
                                  href={targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-base font-semibold text-[var(--link-academic)] hover:underline inline-flex items-center gap-1 leading-snug"
                                >
                                  <span>{platform.name}</span>
                                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <div className="text-[13px] text-[var(--meta-green)] truncate">
                                  {localizedInfo.shortTag} · {accessBadge.label.split('/')[0].trim()}
                                </div>
                                {isOwned && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>{t('activeSubscriptionBadge')}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2 mb-2.5">
                            {localizedInfo.description}
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
                                    handleSelectUnifiedArea(area);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--link-academic)] font-medium cursor-pointer transition-colors"
                                >
                                  {renderAreaIcon(area, 'w-2.5 h-2.5 opacity-75')}
                                  <span>{localizedThematicAreas[area]?.shortLabel || area}</span>
                                </button>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[13px] text-[var(--text-muted)] pt-1">
                          <span className="truncate">{localizedInfo.coverageNote}</span>
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[var(--link-academic)] hover:underline shrink-0"
                          >
                            {isValidQuery ? t('cardSearchAction') : t('cardOpenAction')}
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
                    const isOwned = ownedPlatformSet.has(platform.id);
                    const accessBadge = localizedAccessBadges[platform.accessModel];
                    const localizedInfo = getLocalizedPlatformInfo(platform, language);
                    const rawTargetUrl = platform.buildUrl(
                      encodedQuery,
                      trimmedQuery,
                      yearStartNum
                    );
                    const targetUrl = rewriteUrlWithInstitutionalProxy(
                      rawTargetUrl,
                      userAccessConfig.institutionalProxy,
                      platform.accessModel
                    );

                    return (
                      <div key={platform.id} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePlatformSelection(platform.id)}
                          className="mt-1.5 rounded accent-[var(--link-academic)] cursor-pointer shrink-0"
                          title={t('includeInBatchTitle')}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-4">
                            <h3 className="text-lg font-semibold leading-snug">
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
                              className="text-[13px] font-medium text-[var(--link-academic)] hover:underline shrink-0"
                            >
                              {isValidQuery ? t('cardSearchAction') : t('cardOpenPortalAction')}
                            </a>
                          </div>

                          <div className="text-[13.5px] text-[var(--meta-green)] mt-0.5 mb-1 flex flex-wrap items-center gap-2">
                            <span>{localizedInfo.shortTag} - {localizedInfo.coverageNote} - {accessBadge.label}</span>
                            {isOwned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
                                <Check className="w-2.5 h-2.5" />
                                <span>{t('activeSubscriptionBadge')}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                            {localizedInfo.description}
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
                                    handleSelectUnifiedArea(area);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--link-academic)] font-medium cursor-pointer transition-colors"
                                >
                                  {renderAreaIcon(area, 'w-2.5 h-2.5 opacity-75')}
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
            searchQuery={federatedQuery}
            statuses={sourceStatuses}
            isSearching={isSearchingApis}
            savedIds={savedIdsSet}
            savedPapers={savedPapers}
            groups={libraryGroups}
            activeSaveGroupId={activeSaveGroupId}
            onSelectActiveSaveGroup={setActiveSaveGroupId}
            onCreateGroup={handleCreateGroup}
            onAssignPaperGroup={handleAssignPaperGroup}
            onToggleSave={handleToggleSavePaper}
            deduplicationSummary={effectiveDedupSummary}
            dedupEnabled={dedupEnabled}
            onToggleDedup={setDedupEnabled}
            mergeClusters={dedupComputation.mergeClusters}
            onSplitMergePair={handleSplitMergePair}
            institutionalProxy={userAccessConfig.institutionalProxy}
            selectedArea={selectedArea}
            onSelectArea={handleSelectUnifiedArea}
            userAccessConfig={userAccessConfig}
            onOpenAccessSettings={openAccessSettings}
          />
        )}

        {/* TAB 3: SAVED LITERATURE REVIEW MATRIX */}
        {activeTab === 'saved' && (
          <Suspense fallback={null}>
            <SavedLiteratureDrawer
              items={savedPapers}
              groups={libraryGroups}
              selectedPlatformIds={selectedPlatformIds}
              ownedPlatformIds={userAccessConfig.ownedPlatformIds}
              userAccessConfig={userAccessConfig}
              searchLogs={searchLogs}
              dedupOverrides={dedupOverrides}
              customColumns={customColumns}
              onSaveCustomColumns={setCustomColumns}
              activeSaveGroupId={activeSaveGroupId}
              onSelectActiveSaveGroup={setActiveSaveGroupId}
              onCreateGroup={handleCreateGroup}
              onRenameGroup={handleRenameGroup}
              onDeleteGroup={handleDeleteGroup}
              onAssignPaperGroup={handleAssignPaperGroup}
              dedupSummary={effectiveDedupSummary}
              sourceBreakdown={sourceBreakdown}
              onUpdateNotes={handleUpdateNotes}
              onUpdateCustomField={handleUpdateCustomField}
              onUpdateQualityAppraisal={handleUpdateQualityAppraisal}
              onUpdateRelevance={handleUpdateRelevance}
              onUpdateScreening={handleUpdateScreening}
              onRemoveItem={handleRemoveSaved}
              onLinkRelatedPaper={handleLinkRelatedPaper}
              onClearAll={handleClearLibrary}
              onImportPapers={handleImportSavedPapers}
              onRestoreBackup={handleRestoreWorkspaceBackup}
            />
          </Suspense>
        )}

        {/* TAB 4: USER FEEDBACK & COMMUNITY CONTRIBUTIONS */}
        {activeTab === 'feedback' && (
          <Suspense fallback={null}>
            <FeedbackView />
          </Suspense>
        )}

        {/* TAB 5: ABOUT CARTOGRAPH & LEGAL NOTICES */}
        {activeTab === 'about' && (
          <Suspense fallback={null}>
            <AboutView
              activeSection={aboutSection}
              onSelectSection={navigateToAboutSection}
              onNavigateTab={(tab) => {
                navigateToTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </Suspense>
        )}
          </>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="mt-20 border-t border-[var(--divider)] pt-7 pb-12 text-[13px] text-[var(--text-muted)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <PrismSpectralBar className="h-[2px] w-full opacity-80" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Brand Signature: Cartograph */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigateToAboutSection('cartograph')}
                className="inline-flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer text-left"
                title={t('footerBrandTitle')}
              >
                <PrismMonogram className="h-5 w-auto shrink-0" />
                <div className="leading-tight">
                  <div className="text-[15px] font-heading font-semibold text-[var(--text-primary)]">
                    Cartograph
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {t('appTagline')}
                  </div>
                </div>
              </button>
            </div>

            {/* Direct Non-Redundant Institutional & Legal Navigation */}
            <nav
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]"
              aria-label={t('footerNavAria')}
            >
              <button
                type="button"
                onClick={() => navigateToAboutSection('cartograph')}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'about' && aboutSection === 'cartograph'
                    ? 'font-semibold text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                }`}
              >
                {t('footerAbout')}
              </button>
              <button
                type="button"
                onClick={() => navigateToAboutSection('apis')}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'about' && aboutSection === 'apis'
                    ? 'font-semibold text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                }`}
              >
                {t('footerApis', { count: OPEN_FEDERATED_SOURCE_COUNT })}
              </button>
              <button
                type="button"
                onClick={() => navigateToAboutSection('citation')}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'about' && aboutSection === 'citation'
                    ? 'font-semibold text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                }`}
              >
                {t('footerCitation')}
              </button>
              <button
                type="button"
                onClick={() => navigateToAboutSection('copyright')}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'about' && aboutSection === 'copyright'
                    ? 'font-semibold text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                }`}
              >
                {t('footerCopyright')}
              </button>
              <button
                type="button"
                onClick={() => navigateToAboutSection('privacy')}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'about' && aboutSection === 'privacy'
                    ? 'font-semibold text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                }`}
              >
                {t('footerPrivacy')}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigateToTab('feedback');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`transition-colors cursor-pointer ${
                  !isNotFound && activeTab === 'feedback'
                    ? 'font-semibold text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                }`}
              >
                {t('tabFeedback')}
              </button>
            </nav>
          </div>

          {/* Bottom Copyright Notice */}
          <div className="pt-4 border-t border-[var(--divider)]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[13px] text-[var(--text-muted)]">
            <div>
              <span>©&nbsp;{new Date().getFullYear()} </span>
              <strong className="font-medium text-[var(--text-secondary)]">Cartograph</strong>
              <span> {t('footerRightsReserved')}</span>
            </div>
            <div>
              {t('footerEngineeringNote')}
            </div>
          </div>
        </div>
      </footer>
      <WebLaunchDrawer
        isOpen={webLaunchDrawerOpen}
        query={trimmedQuery}
        targets={webLaunchTargets}
        blockedOrBrowserLimited={webLaunchLimited}
        onClose={() => setWebLaunchDrawerOpen(false)}
      />

      {showAccessModal && (
        <Suspense fallback={null}>
          <AccessSettingsModal
            isOpen={showAccessModal}
            config={userAccessConfig}
            initialTab={accessModalTab}
            onChange={handleUpdateUserAccessConfig}
            onClose={() => setShowAccessModal(false)}
          />
        </Suspense>
      )}

      {showSearchHistoryModal && (
        <Suspense fallback={null}>
          <SearchHistoryDrawer
            isOpen={showSearchHistoryModal}
            logs={searchLogs}
            onClose={() => setShowSearchHistoryModal(false)}
            onRerunSearch={(entry) => {
              setQuery(entry.query);
              setBooleanState((prev) => ({
                ...prev,
                yearFrom: entry.yearFrom ? String(entry.yearFrom) : '',
              }));
              void executeFederatedSearch(entry.scope, entry.query, entry.yearFrom);
            }}
            onClearLogs={() => setSearchLogs([])}
          />
        </Suspense>
      )}

      {analyticsConsentPrompt && (
        <div
          className="fixed bottom-4 right-4 z-40 max-w-sm bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-2xl shadow-xl p-4 space-y-3"
          role="region"
          aria-label={t('analyticsConsentAria')}
        >
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {t('analyticsConsentText')}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                denyAnalyticsConsent();
                setAnalyticsConsentPrompt(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              {t('analyticsDeclineBtn')}
            </button>
            <button
              type="button"
              onClick={() => {
                grantAnalyticsConsent();
                setAnalyticsConsentPrompt(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer"
            >
              {t('analyticsAcceptBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
