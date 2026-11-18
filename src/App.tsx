import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
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
  DeduplicationSummary,
  NormalizedPaper,
  PlatformCategory,
  SearchLogEntry,
  SearchScopeId,
  SourceFetchStatus,
  ThematicArea,
  UserAccessConfig,
} from './types/academic';
import {
  isLocalBridgeOrigin,
  launchUrlsCrossPlatform,
  runFederatedSearch,
} from './services/academicAggregator';
import { OPEN_FEDERATED_SOURCE_COUNT, mapAreaToSearchScope } from './data/apiSources';
import { renderAreaIcon } from './utils/areaIcons';
import { translateAcademicQueryPtToEn } from './utils/queryBuilder';
import { loadUserAccessConfig, saveUserAccessConfig } from './utils/accessConfig';
import { rewriteUrlWithInstitutionalProxy } from './utils/institutionalProxy';
import { FederatedResultsPanel } from './components/FederatedResultsPanel';
import { MobileTabBar } from './components/MobileTabBar';
import { NotFoundView } from './components/NotFoundView';
import { PrismMonogram, PrismSpectralBar } from './components/PrismLogo';
import { UnifiedAreaFilterDrawer } from './components/UnifiedAreaFilterDrawer';
import { UserWorkspaceSection } from './components/UserWorkspaceSection';
import { CollapsibleSection, SidebarDrawersHeader } from './components/ui/CollapsibleSection';
import { usePersistedDrawers } from './components/ui/usePersistedDrawers';
import { ResponsiveSidebar } from './components/ui/ResponsiveSidebar';
import { MobileSheet } from './components/ui/MobileSheet';
import { WebLaunchDrawer, WebLaunchTarget } from './components/WebLaunchDrawer';
import type { AboutSectionId } from './components/AboutView';
import { isSupportedLanguage, useI18n } from './i18n/context';
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
import { deduplicatePapersAdvanced } from './utils/deduplication';
import { LAYOUT_STORAGE_KEYS, syncThemeColorMeta } from './utils/layoutPreferences';
import { copyTextSafely, shareTextSafely } from './utils/fileDownload';
import { useWorkspace, type BackupRestoreMode, type BackupRestoreResult } from './state/workspace';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Globe,
  History,
  KeyRound,
  Languages,
  LayoutGrid,
  List,
  Loader2,
  Moon,
  Search,
  Settings2,
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

const STORAGE_KEY_THEME = LAYOUT_STORAGE_KEYS.theme;
const STORAGE_KEY_SIDEBAR_DRAWERS = LAYOUT_STORAGE_KEYS.platformsSidebarDrawers;
const STORAGE_KEY_SELECTED_AREA = 'cartograph_selected_area_v1';
const STORAGE_KEY_DEDUP_ENABLED = 'cartograph_dedup_enabled_v1';

type SidebarSectionKey = 'sort' | 'presets' | 'categories' | 'access' | 'areas';

const PLATFORM_SIDEBAR_DRAWER_DEFAULTS: Record<SidebarSectionKey, boolean> = {
  sort: true,
  presets: true,
  categories: true,
  access: true,
  areas: true,
};

const PLATFORM_SIDEBAR_MOBILE_DEFAULTS: Record<SidebarSectionKey, boolean> = {
  sort: true,
  presets: true,
  categories: false,
  access: false,
  areas: false,
};

const PLATFORM_DRAWER_HEADER_CLASS =
  'w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] select-none text-left';
type PlatformSortMode = 'curated' | 'trust' | 'name' | 'access';

export default function AcademicCommandCenter() {
  const { language, isAutoLanguage, setLanguage, resetToSystemLanguage, t, availableLanguages } = useI18n();
  const { state: workspace, actions: workspaceActions, isHydrated: isWorkspaceHydrated } = useWorkspace();
  const { savedPapers, selectedPlatformIds, searchLogs, dedupOverrides } = workspace;

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
    if (typeof window !== 'undefined') {
      tabScrollPositionsRef.current[activeTab] = window.scrollY;
    }
    const isChangingTab = tab !== activeTab || isNotFound;
    setIsNotFound(false);
    setActiveTab(tab);
    syncBrowserHistory(tab, aboutSection);
    trackAcademicEvent('navigation_view', { view: tab });
    if (typeof window !== 'undefined' && isChangingTab) {
      const nextScrollY = tabScrollPositionsRef.current[tab] ?? 0;
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: nextScrollY, behavior: 'instant' as ScrollBehavior });
      });
    }
  };

  const navigateToAboutSection = (section: AboutSectionId) => {
    if (typeof window !== 'undefined' && activeTab !== 'about') {
      tabScrollPositionsRef.current[activeTab] = window.scrollY;
    }
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
  const [showMobileQuickTools, setShowMobileQuickTools] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [platformSortBy, setPlatformSortBy] = useState<PlatformSortMode>('curated');
  const {
    drawers: sidebarDrawers,
    allDrawersOpen,
    toggleDrawer: toggleSidebarDrawer,
    toggleAllDrawers: toggleAllSidebarDrawers,
  } = usePersistedDrawers(
    STORAGE_KEY_SIDEBAR_DRAWERS,
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1023.98px)').matches
      ? PLATFORM_SIDEBAR_MOBILE_DEFAULTS
      : PLATFORM_SIDEBAR_DRAWER_DEFAULTS
  );

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

  const [rawFederatedPapers, setRawFederatedPapers] = useState<NormalizedPaper[]>([]);
  const [dedupEnabled, setDedupEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DEDUP_ENABLED) !== 'false';
    } catch {
      return true;
    }
  });
  const [showSearchHistoryModal, setShowSearchHistoryModal] = useState(false);
  const [federatedQuery, setFederatedQuery] = useState<string>('');
  const [sourceStatuses, setSourceStatuses] = useState<SourceFetchStatus[]>([]);
  // Log entry of the last completed search, appended once the deduplicated count is known.
  const [pendingSearchLog, setPendingSearchLog] = useState<SearchLogEntry | null>(null);
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
  const tabScrollPositionsRef = useRef<Record<string, number>>({});

  // Cancels the in-flight federated search when the app unmounts.
  useEffect(() => () => searchAbortRef.current?.abort(), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeColorMeta(theme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DEDUP_ENABLED, String(dedupEnabled));
    } catch {
      // ignore
    }
  }, [dedupEnabled]);

  // Check multiplatform local bridge health (Windows / Linux / macOS). The bridge only runs
  // on loopback, so hosted builds skip the probe instead of logging a 404 on every load.
  useEffect(() => {
    if (!isLocalBridgeOrigin()) return;
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
      if (isSupportedLanguage(langParam)) {
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

  // Close the mobile quick-tools sheet if the viewport widens past md (768px).
  useEffect(() => {
    if (
      !showMobileQuickTools ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const media = window.matchMedia('(min-width: 768px)');
    if (media.matches) {
      setShowMobileQuickTools(false);
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setShowMobileQuickTools(false);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [showMobileQuickTools]);

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
    const shareUrl = `${window.location.origin}/federated?q=${encodeURIComponent(trimmedQuery)}`;
    const copied = await copyTextSafely(shareUrl);
    setStatusBanner(copied ? t('shareLinkCopied') : t('shareLinkError'));
    setTimeout(() => setStatusBanner(null), copied ? 4000 : 3500);
  };

  const handleShareSearch = async () => {
    if (!isValidQuery) return;
    const shareUrl = `${window.location.origin}/federated?q=${encodeURIComponent(trimmedQuery)}`;
    const result = await shareTextSafely(
      `Cartograph — ${trimmedQuery}`,
      trimmedQuery,
      shareUrl
    );
    if (result === 'copied') {
      setStatusBanner(t('shareLinkCopied'));
      setTimeout(() => setStatusBanner(null), 4000);
    } else if (result === 'failed') {
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

    if (typeof window !== 'undefined') {
      if (activeTab !== 'federated') {
        tabScrollPositionsRef.current[activeTab] = window.scrollY;
      }
      tabScrollPositionsRef.current.federated = 0;
      if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 767.98px)').matches
      ) {
        searchInputRef.current?.blur();
      }
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const requestId = ++searchRequestIdRef.current;

    const enteringFederated = activeTab !== 'federated' || isNotFound;
    setIsNotFound(false);
    setActiveTab('federated');
    syncBrowserHistory('federated', aboutSection, effectiveQuery);
    if (typeof window !== 'undefined' && enteringFederated) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      });
    }
    setIsSearchingApis(true);
    setFederatedQuery(effectiveQuery);
    setRawFederatedPapers([]);
    setSourceStatuses([]);
    setPendingSearchLog(null);

    try {
      const { rawPapers, statuses } = await runFederatedSearch(
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
          },
        }
      );

      if (requestId !== searchRequestIdRef.current || controller.signal.aborted) {
        return;
      }

      setRawFederatedPapers(rawPapers);
      setSourceStatuses(statuses);

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
        // Provisional: the effect below replaces it with the deduplicated count of this result.
        totalUnique: rawPapers.length,
        bySource,
      };
      setPendingSearchLog(newLog);

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
      didAutoSearchRef.current ||
      initialRoute.tab !== 'federated' ||
      initialRoute.isNotFound ||
      !trimmedQuery
    ) {
      return undefined;
    }
    didAutoSearchRef.current = true;
    let settled = false;
    void handleRunFederatedSearch().finally(() => {
      settled = true;
    });
    return () => {
      // StrictMode (dev) unmounts once right after mounting and the unmount effect aborts this
      // search; re-arming the flag lets the remount start it again.
      if (!settled) didAutoSearchRef.current = false;
    };
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

  // Workspace data lives in the store; App only adds what the store does not own: the portal
  // catalog (to drop unknown platform IDs) and the access config (owned subscriptions).
  const handleRestoreWorkspaceBackup = (
    payload: CartographBackupPayload,
    mode: BackupRestoreMode
  ): BackupRestoreResult => {
    const validPlatformSet = new Set(PLATFORMS.map((p) => p.id));
    const result = workspaceActions.restoreBackup(
      {
        ...payload,
        selectedPlatformIds: payload.selectedPlatformIds.filter((id) => validPlatformSet.has(id)),
      },
      mode
    );

    if (Array.isArray(payload.ownedPlatformIds)) {
      const validOwned = payload.ownedPlatformIds.filter((id) => validPlatformSet.has(id));
      if (mode === 'replace') {
        handleUpdateUserAccessConfig({ ...userAccessConfig, ownedPlatformIds: validOwned });
      } else if (payload.ownedPlatformIds.length > 0) {
        handleUpdateUserAccessConfig({
          ...userAccessConfig,
          ownedPlatformIds: Array.from(new Set([...userAccessConfig.ownedPlatformIds, ...validOwned])),
        });
      }
    }

    return result;
  };

  // The only deduplication pass of a search: the aggregator streams raw records and this memo
  // applies the researcher's split overrides to each snapshot.
  const dedupComputation = useMemo(
    () => deduplicatePapersAdvanced(rawFederatedPapers, dedupOverrides),
    [rawFederatedPapers, dedupOverrides]
  );

  useEffect(() => {
    if (!pendingSearchLog) return;
    workspaceActions.appendSearchLog({
      ...pendingSearchLog,
      totalUnique: pendingSearchLog.dedupEnabled
        ? dedupComputation.summary.uniqueCount
        : pendingSearchLog.totalRaw,
    });
    setPendingSearchLog(null);
  }, [pendingSearchLog, dedupComputation, workspaceActions]);

  const federatedPapers = useMemo(
    () => (dedupEnabled ? dedupComputation.papers : rawFederatedPapers),
    [dedupEnabled, dedupComputation.papers, rawFederatedPapers]
  );

  // Null until a search has produced a snapshot (statuses arrive with the first one).
  const hasSearchSnapshot = sourceStatuses.length > 0 || rawFederatedPapers.length > 0;
  const effectiveDedupSummary = useMemo<DeduplicationSummary | null>(() => {
    if (!hasSearchSnapshot) return null;
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
  }, [hasSearchSnapshot, rawFederatedPapers.length, dedupEnabled, dedupComputation.summary]);

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

  const renderPlatformAreaTags = (thematicAreas: ThematicArea[], spacingClass: string) => {
    const areaTags = thematicAreas.filter((area) => area !== 'multidisciplinar');
    const hiddenMobileCount = Math.max(0, areaTags.length - 2);
    return (
      <div className={`flex flex-wrap gap-1.5 md:gap-1 ${spacingClass}`}>
        {areaTags.map((area, index) => (
          <button
            key={area}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectUnifiedArea(area);
            }}
            className={`${
              index >= 2 ? 'hidden md:inline-flex' : 'inline-flex'
            } items-center gap-1 text-[11px] px-2.5 py-1 md:px-2 md:py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--link-academic)] font-medium cursor-pointer transition-colors`}
          >
            {renderAreaIcon(area, 'w-2.5 h-2.5 opacity-75')}
            <span>{localizedThematicAreas[area]?.shortLabel || area}</span>
          </button>
        ))}
        {hiddenMobileCount > 0 && (
          <span className="md:hidden inline-flex items-center text-[11px] px-2 py-1 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium tabular-nums">
            +{hiddenMobileCount}
          </span>
        )}
      </div>
    );
  };

  const hasBooleanTerms = Boolean(
    booleanState.mainConcept.trim() ||
      booleanState.andTerms.trim() ||
      booleanState.orTerms.trim() ||
      booleanState.notTerms.trim() ||
      booleanState.exactPhrase.trim() ||
      booleanState.yearFrom.trim() ||
      booleanState.studyDesign !== 'any'
  );

  const activePlatformFilterCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (accessFilter !== 'all' ? 1 : 0) +
    (ownedOnlyFilter ? 1 : 0) +
    (selectedArea !== 'all' ? 1 : 0) +
    (platformSortBy !== 'curated' ? 1 : 0);

  const clearAllPlatformFilters = () => {
    setPlatformSortBy('curated');
    setActiveCategory('all');
    setAccessFilter('all');
    setOwnedOnlyFilter(false);
    handleSelectUnifiedArea('all');
  };

  /** Secondary search actions (PT→EN, Boolean builder, share) inside the desktop search pill. */
  const renderSearchTools = () => (
    <>
      <button
        type="button"
        onClick={handleTranslatePtToEn}
        disabled={!isValidQuery || isTranslating}
        className={`px-2.5 py-1 rounded-full text-[13px] mr-1 font-medium transition-colors ${
          isValidQuery
            ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer'
            : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
        }`}
        title={t('translateTitle')}
        aria-label={t('translateTitle')}
      >
        {isTranslating ? '...' : 'PT→EN'}
      </button>

      <button
        type="button"
        onClick={() => setShowBooleanDrawer((v) => !v)}
        aria-pressed={showBooleanDrawer}
        className={`p-1.5 rounded-full mr-1 transition-colors cursor-pointer ${
          showBooleanDrawer
            ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        }`}
        title={t('booleanBuilderBtn')}
        aria-label={t('booleanBuilderBtn')}
      >
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>

      {isValidQuery && (
        <button
          type="button"
          onClick={handleCopySearchShareUrl}
          className="p-1.5 rounded-full mr-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
          title={t('shareSearchTitle')}
          aria-label={t('shareSearchTitle')}
        >
          <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-20">
      {/* Academic Search Header — Google Scholar / Semantic Scholar / Consensus Pattern */}
      <header className="relative md:sticky top-0 z-30 glass-chrome bg-[var(--bg-canvas)]/90 border-b border-[var(--divider)] pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 md:pt-3.5 pb-2.5 md:pb-0">
          {/* Top Search & Brand Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 md:gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-5 flex-1">
              {/* Row 1 Compact Header: Brand Wordmark + Mobile Action Triggers */}
              <div className="min-h-11 md:min-h-0 flex items-center justify-between gap-2">
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
                  <PrismMonogram className="h-[28px] md:h-[30px] w-auto" />
                  <div className="flex flex-col leading-none">
                    <span className="font-heading font-semibold text-[18px] tracking-tight">Cartograph</span>
                    <span className="hidden sm:inline text-[11.5px] text-[var(--text-muted)] font-medium mt-0.5">{t('appTagline')}</span>
                  </div>
                </a>

                {/* Mobile Compact Controls (< 768px): 44x44px Boolean Builder + Quick Tools Sheet */}
                <div className="flex items-center gap-1.5 -mr-1.5 md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowBooleanDrawer((v) => !v)}
                    aria-pressed={showBooleanDrawer}
                    className={`relative w-11 h-11 inline-flex items-center justify-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                      showBooleanDrawer || hasBooleanTerms
                        ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                    title={t('booleanBuilderBtn')}
                    aria-label={t('booleanBuilderBtn')}
                  >
                    <SlidersHorizontal className="w-[18px] h-[18px]" aria-hidden="true" />
                    {hasBooleanTerms && !showBooleanDrawer && (
                      <span
                        className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--link-academic)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMobileQuickTools(true)}
                    aria-haspopup="dialog"
                    aria-expanded={showMobileQuickTools}
                    className={`relative w-11 h-11 inline-flex items-center justify-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                      hasActiveAccessEnhancement
                        ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                    title={t('mobileQuickToolsBtn')}
                    aria-label={t('mobileQuickToolsBtn')}
                  >
                    <Settings2 className="w-[18px] h-[18px]" aria-hidden="true" />
                    {hasActiveAccessEnhancement && (
                      <span
                        className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--link-academic)] ring-2 ring-[var(--bg-canvas)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Mobile-First Search Pill */}
              <div className="flex-1 max-w-[720px] flex items-center bg-[var(--bg-subtle)] focus-within:bg-[var(--bg-secondary)] focus-within:ring-2 focus-within:ring-[var(--link-academic)]/25 rounded-full pl-4 pr-1.5 py-1 md:py-1.5 min-h-12 md:min-h-0 transition-all">
                <Search className="w-[18px] h-[18px] text-[var(--text-muted)] shrink-0 mr-2.5" aria-hidden="true" />
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
                  enterKeyHint="search"
                  aria-label={t('searchPlaceholder')}
                  className="w-full min-w-0 bg-transparent text-base md:text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="w-11 h-11 md:w-auto md:h-auto md:p-1.5 inline-flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-0.5 md:mr-1 cursor-pointer shrink-0"
                    title={t('clearSearchTitle')}
                    aria-label={t('clearSearchTitle')}
                  >
                    <X className="w-4 h-4 md:w-3.5 md:h-3.5" aria-hidden="true" />
                  </button>
                )}

                <div className="hidden md:flex items-center">{renderSearchTools()}</div>

                <button
                  type="button"
                  onClick={handleRunFederatedSearch}
                  disabled={!isValidQuery}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-11 md:min-h-0 px-4 md:py-1.5 rounded-full text-[14px] md:text-[13px] font-semibold transition-opacity shrink-0 ${
                    isValidQuery
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  {isSearchingApis && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                  <span>{t('searchBtn')}</span>
                </button>
              </div>
            </div>

            {/* Contextual Mobile Batch Portal Launch Pill (only shown when portals selected + query entered) */}
            {!isNotFound && activeTab === 'platforms' && selectedPlatformIds.length > 0 && isValidQuery && (
              <div className="md:hidden flex items-center">
                <button
                  type="button"
                  onClick={handleLaunchSelectedPlatforms}
                  disabled={isLaunchingTabs}
                  className="w-full min-h-11 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-[var(--accent-blue-tint)] text-[var(--link-academic)] text-[13.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  title={t('openPortalsTitle')}
                >
                  {isLaunchingTabs ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="tabular-nums">
                    {t('openPortalsCount', { count: selectedPlatformIds.length })}
                  </span>
                </button>
              </div>
            )}

            {/* Desktop Right Actions: Batch Portal Launch + Access + Theme + Language */}
            <div className="hidden md:flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleLaunchSelectedPlatforms}
                disabled={!isValidQuery || selectedPlatformIds.length === 0 || isLaunchingTabs}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors shrink-0 ${
                  isValidQuery && selectedPlatformIds.length > 0
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] hover:opacity-85 cursor-pointer'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
                }`}
                title={t('openPortalsTitle')}
              >
                <span className="tabular-nums">{t('openPortalsCount', { count: selectedPlatformIds.length })}</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-1">
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
                  <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden xl:inline">{t('accessSettingsBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                  className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  title={t('toggleThemeTitle')}
                  aria-label={t('toggleThemeTitle')}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" aria-hidden="true" /> : <Sun className="w-4 h-4" aria-hidden="true" />}
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
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
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
                onClose={() => setShowBooleanDrawer(false)}
                onApplyCompiledQuery={(compiled) => {
                  setQuery(compiled);
                  if (
                    typeof window !== 'undefined' &&
                    typeof window.matchMedia === 'function' &&
                    window.matchMedia('(max-width: 767.98px)').matches
                  ) {
                    setShowBooleanDrawer(false);
                  }
                  setStatusBanner(t('booleanAppliedBanner'));
                  setTimeout(() => setStatusBanner(null), 3500);
                }}
              />
            </Suspense>
          )}

          {/* Status Banner */}
          {statusBanner && (
            <div
              role="status"
              className="mt-2.5 pl-3.5 pr-1.5 py-1 md:py-1.5 rounded-lg bg-[var(--accent-blue-tint)] text-[13px] text-[var(--link-academic)] flex items-center justify-between gap-2"
            >
              <span className="min-w-0 py-1">{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                aria-label={t('mobileCloseSheetBtn')}
                className="min-w-11 min-h-11 md:min-w-0 md:min-h-0 md:w-8 md:h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--link-academic)]/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Familiar Academic Navigation Bar (Underline Tabs like Google Scholar / Semantic Scholar) */}
          <nav className="hidden md:flex items-center gap-6 mt-3 overflow-x-auto" aria-label={t('mobileNavAria')}>
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
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('searchHistoryBtn', { count: searchLogs.length })}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
        {isNotFound ? (
          <NotFoundView
            invalidPath={typeof window !== 'undefined' ? window.location.pathname : ''}
            onNavigateTab={navigateToTab}
            onFocusSearch={() => searchInputRef.current?.focus()}
          />
        ) : (
          <>
            {/* TAB 1: PLATFORMS DIRECTORY */}
            {activeTab === 'platforms' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 xl:gap-8 items-start">
            {/* Left Sidebar — Scroll Individual com Gavetas Retráteis / Expansíveis */}
            <ResponsiveSidebar
              ariaLabel={t('sidebarAriaLabel')}
              triggerLabel={t('mobileFiltersBtn')}
              activeCount={activePlatformFilterCount}
              onClearFilters={activePlatformFilterCount > 0 ? clearAllPlatformFilters : undefined}
            >
              <SidebarDrawersHeader allOpen={allDrawersOpen} onToggleAll={toggleAllSidebarDrawers} />

              {/* Gaveta 1: Sort Controls (Primary ordering control — top priority) */}
              <CollapsibleSection
                isOpen={sidebarDrawers.sort}
                onToggle={() => toggleSidebarDrawer('sort')}
                className="border-b border-[var(--divider)] pb-3"
                headerClassName={PLATFORM_DRAWER_HEADER_CLASS}
                contentClassName="space-y-0.5 text-[13.5px] pt-1.5"
                title={
                  <>
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
                  </>
                }
                actions={
                  platformSortBy !== 'curated' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlatformSortBy('curated');
                      }}
                      className="min-h-11 lg:min-h-0 px-2 lg:px-0 inline-flex items-center text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                    >
                      {t('clearFilter')}
                    </button>
                  )
                }
              >
                {(['curated', 'trust', 'name', 'access'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPlatformSortBy(mode)}
                    className={`w-full min-h-11 lg:min-h-0 flex items-center text-left px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer ${
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
              </CollapsibleSection>

              {/* Gaveta 2: Cumulative Presets List (Highest-frequency batch selection) */}
              <CollapsibleSection
                isOpen={sidebarDrawers.presets}
                onToggle={() => toggleSidebarDrawer('presets')}
                className="border-b border-[var(--divider)] pb-3"
                headerClassName={PLATFORM_DRAWER_HEADER_CLASS}
                titleClassName="flex items-center gap-2 min-w-0"
                contentClassName="space-y-1 text-[13.5px] pt-1.5"
                title={
                  <>
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
                  </>
                }
              >
                {/* Sub-barra de Ações da Gaveta */}
                <div className="flex items-center justify-between px-2.5 py-1 mb-1.5 bg-[var(--bg-subtle)]/70 rounded-md border border-[var(--divider)]">
                  <span className="text-xs text-[var(--text-muted)] font-medium tabular-nums">
                    {t('quickSelectionActiveCount', { selected: selectedPlatformIds.length, total: PLATFORMS.length })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => workspaceActions.setSelectedPlatformIds(PLATFORMS.map((p) => p.id))}
                      className="min-h-10 lg:min-h-0 px-1.5 lg:px-0 inline-flex items-center text-xs font-semibold text-[var(--link-academic)] hover:underline cursor-pointer"
                    >
                      {t('quickSelectionAllBtn')}
                    </button>
                    <span className="text-[var(--divider)] text-xs">·</span>
                    <button
                      type="button"
                      onClick={() => workspaceActions.setSelectedPlatformIds([])}
                      className="min-h-10 lg:min-h-0 px-1.5 lg:px-0 inline-flex items-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
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
                      onClick={() => workspaceActions.togglePreset(preset, localizedPresets)}
                      title={preset.description}
                      className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
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
                      <span className="text-xs text-[var(--text-muted)] shrink-0 tabular-nums">
                        {matchedCount}/{preset.platformIds.length}
                      </span>
                    </button>
                  );
                })}
              </CollapsibleSection>

              {/* Gaveta 3: Functional Categories (Primary structural filter) */}
              <CollapsibleSection
                isOpen={sidebarDrawers.categories}
                onToggle={() => toggleSidebarDrawer('categories')}
                className="border-b border-[var(--divider)] pb-3"
                headerClassName={PLATFORM_DRAWER_HEADER_CLASS}
                contentClassName="space-y-0.5 text-[13.5px] pt-1.5"
                title={
                  <>
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {t('platformTypeTitle')}
                    </span>
                    {activeCategory !== 'all' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                        {localizedCategoryMeta[activeCategory]?.label.split('&')[0].trim() || activeCategory}
                      </span>
                    )}
                  </>
                }
                actions={
                  activeCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCategory('all');
                      }}
                      className="min-h-11 lg:min-h-0 px-2 lg:px-0 inline-flex items-center text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                    >
                      {t('clearFilter')}
                    </button>
                  )
                }
              >
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    activeCategory === 'all'
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{t('platformTypeAll')}</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">{PLATFORMS.length}</span>
                </button>

                {(Object.keys(localizedCategoryMeta) as PlatformCategory[]).map((catKey) => {
                  const meta = localizedCategoryMeta[catKey];
                  const count = PLATFORMS.filter((p) => p.category === catKey).length;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setActiveCategory(catKey)}
                      className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        activeCategory === catKey
                          ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="truncate pr-2">{meta.label.split('&')[0].trim()}</span>
                      <span className="text-xs text-[var(--text-muted)] shrink-0 tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </CollapsibleSection>

              {/* Gaveta 4: Access Model Filter */}
              <CollapsibleSection
                isOpen={sidebarDrawers.access}
                onToggle={() => toggleSidebarDrawer('access')}
                className="border-b border-[var(--divider)] pb-3"
                headerClassName={PLATFORM_DRAWER_HEADER_CLASS}
                contentClassName="space-y-0.5 text-[13.5px] pt-1.5"
                title={
                  <>
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
                  </>
                }
                actions={
                  (accessFilter !== 'all' || ownedOnlyFilter) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccessFilter('all');
                        setOwnedOnlyFilter(false);
                      }}
                      className="min-h-11 lg:min-h-0 px-2 lg:px-0 inline-flex items-center text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                    >
                      {t('clearFilter')}
                    </button>
                  )
                }
              >
                <button
                  type="button"
                  onClick={() => setAccessFilter('all')}
                  className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    accessFilter === 'all'
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{t('accessModelAll')}</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">{PLATFORMS.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessFilter('gratuito')}
                  className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    accessFilter === 'gratuito'
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{t('accessModelFree')}</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {PLATFORMS.filter((p) => p.accessModel === 'gratuito').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessFilter('pago')}
                  className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    accessFilter === 'pago'
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{t('accessModelPaid')}</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {PLATFORMS.filter((p) => p.accessModel === 'pago').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessFilter('aberto-institucional')}
                  className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    accessFilter === 'aberto-institucional'
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{t('accessModelInstitutional')}</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {PLATFORMS.filter((p) => p.accessModel === 'aberto-institucional').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessFilter('freemium')}
                  className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    accessFilter === 'freemium'
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{t('accessModelFreemium')}</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {PLATFORMS.filter((p) => p.accessModel === 'freemium').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOwnedOnlyFilter((prev) => !prev)}
                  className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    ownedOnlyFilter
                      ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate">{t('filterOwnedOnly')}</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {userAccessConfig.ownedPlatformIds.length}
                  </span>
                </button>
              </CollapsibleSection>

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
            </ResponsiveSidebar>

            {/* Right Main Directory Area */}
            <div className="min-w-0">
              {/* Specialized Areas Horizontal Quick Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-3 no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleSelectUnifiedArea('all')}
                  className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedArea === 'all'
                      ? 'bg-[var(--link-academic)] text-[var(--bg-canvas)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('areaAll')}</span>
                  <span className="opacity-75 text-[11.5px] tabular-nums">({PLATFORMS.length})</span>
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
                      className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[var(--link-academic)] text-[var(--bg-canvas)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {renderAreaIcon(areaKey, 'w-3.5 h-3.5')}
                      <span>{meta.label}</span>
                      <span className="opacity-75 text-[11.5px] tabular-nums">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Active Filters Bar on Mobile / Tablet (< 1024px) */}
              {activePlatformFilterCount > 0 && (
                <div className="lg:hidden mb-3 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                    {t('mobileActiveFiltersBadge', { count: activePlatformFilterCount })}
                  </span>
                  <button
                    type="button"
                    onClick={clearAllPlatformFilters}
                    className="min-h-10 px-3 -mr-1.5 inline-flex items-center rounded-lg text-[13px] font-semibold text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
                  >
                    {t('mobileClearFiltersBtn')}
                  </button>
                </div>
              )}

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
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                    {t('directoryResultsSummary', { visible: visiblePlatforms.length, selected: selectedPlatformIds.length })}
                  </p>
                </div>

                {/* Borderless View Switcher */}
                <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-1 gap-1 md:gap-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-pressed={viewMode === 'grid'}
                    aria-label={t('gridViewTitle')}
                    className={`w-11 h-11 md:w-auto md:h-auto md:p-1.5 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    title={t('gridViewTitle')}
                  >
                    <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-pressed={viewMode === 'list'}
                    aria-label={t('listViewTitle')}
                    className={`w-11 h-11 md:w-auto md:h-auto md:p-1.5 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    title={t('listViewTitle')}
                  >
                    <List className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* VIEW 1: BORDERLESS SOFT SURFACE CARDS */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 md:gap-4">
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
                            <div className="flex items-start gap-1.5 md:gap-2.5 min-w-0">
                              <label
                                className="w-11 h-11 -ml-2.5 -mt-2 md:w-auto md:h-auto md:m-0 md:mt-1 inline-flex items-center justify-center cursor-pointer shrink-0"
                                title={t('includeInBatchTitle')}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => workspaceActions.togglePlatform(platform.id)}
                                  aria-label={`${t('includeInBatchTitle')}: ${platform.name}`}
                                  className="w-4 h-4 md:w-3.5 md:h-3.5 rounded accent-[var(--link-academic)] cursor-pointer"
                                />
                              </label>
                              <div className="min-w-0">
                                <a
                                  href={targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-base font-semibold text-[var(--link-academic)] hover:underline inline-flex items-center gap-1 leading-snug"
                                >
                                  <span>{platform.name}</span>
                                  <ArrowUpRight
                                    className="w-3.5 h-3.5 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                                    aria-hidden="true"
                                  />
                                </a>
                                <div className="text-[13px] text-[var(--meta-green)] truncate">
                                  {localizedInfo.shortTag} · {accessBadge.label.split('/')[0].trim()}
                                </div>
                                {isOwned && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
                                    <Check className="w-2.5 h-2.5" aria-hidden="true" />
                                    <span>{t('activeSubscriptionBadge')}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1.5 md:mt-2 mb-2.5 line-clamp-2 md:line-clamp-none">
                            {localizedInfo.description}
                          </p>

                          {/* Discipline Tags */}
                          {renderPlatformAreaTags(platform.thematicAreas, 'mb-2.5 md:mb-3')}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[13px] text-[var(--text-muted)] pt-1">
                          <span className="truncate">{localizedInfo.coverageNote}</span>
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center min-h-11 md:min-h-0 px-2 -mr-2 md:px-0 md:mr-0 font-medium text-[var(--link-academic)] hover:underline shrink-0"
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
                <div className="space-y-5 md:space-y-6 max-w-3xl">
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
                      <div key={platform.id} className="group flex items-start gap-1.5 md:gap-3">
                        <label
                          className="w-11 h-11 -ml-2.5 -mt-1.5 md:w-auto md:h-auto md:m-0 md:mt-1.5 inline-flex items-center justify-center cursor-pointer shrink-0"
                          title={t('includeInBatchTitle')}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => workspaceActions.togglePlatform(platform.id)}
                            aria-label={`${t('includeInBatchTitle')}: ${platform.name}`}
                            className="w-4 h-4 md:w-3.5 md:h-3.5 rounded accent-[var(--link-academic)] cursor-pointer"
                          />
                        </label>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3 md:gap-4">
                            <h3 className="text-lg font-semibold leading-snug">
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--link-academic)] hover:underline inline-flex items-center gap-1"
                              >
                                <span>{platform.name}</span>
                                <ArrowUpRight
                                  className="w-3.5 h-3.5 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                                  aria-hidden="true"
                                />
                              </a>
                            </h3>
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center min-h-11 md:min-h-0 px-2 -mr-2 md:px-0 md:mr-0 text-[13px] font-medium text-[var(--link-academic)] hover:underline shrink-0"
                            >
                              {isValidQuery ? t('cardSearchAction') : t('cardOpenPortalAction')}
                            </a>
                          </div>

                          <div className="text-[13.5px] text-[var(--meta-green)] mt-0.5 mb-1 flex flex-wrap items-center gap-2">
                            <span>{localizedInfo.shortTag} - {localizedInfo.coverageNote} - {accessBadge.label}</span>
                            {isOwned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
                                <Check className="w-2.5 h-2.5" aria-hidden="true" />
                                <span>{t('activeSubscriptionBadge')}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 md:line-clamp-none">
                            {localizedInfo.description}
                          </p>

                          {/* Discipline Tags */}
                          {renderPlatformAreaTags(platform.thematicAreas, 'mt-2')}
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
            deduplicationSummary={effectiveDedupSummary}
            dedupEnabled={dedupEnabled}
            onToggleDedup={setDedupEnabled}
            mergeClusters={dedupComputation.mergeClusters}
            institutionalProxy={userAccessConfig.institutionalProxy}
            selectedArea={selectedArea}
            onSelectArea={handleSelectUnifiedArea}
            userAccessConfig={userAccessConfig}
            onOpenAccessSettings={openAccessSettings}
          />
        )}

        {/* TAB 3: SAVED LITERATURE REVIEW MATRIX (after hydration: no flash of an empty library,
            and first-run drawer defaults see the stored groups) */}
        {activeTab === 'saved' && isWorkspaceHydrated && (
          <Suspense fallback={null}>
            <SavedLiteratureDrawer
              userAccessConfig={userAccessConfig}
              dedupSummary={effectiveDedupSummary}
              sourceBreakdown={sourceBreakdown}
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
              onNavigateTab={navigateToTab}
            />
          </Suspense>
        )}
          </>
        )}
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="mt-12 md:mt-20 border-t border-[var(--divider)] pt-6 md:pt-7 pb-8 md:pb-12 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] text-[13px] text-[var(--text-muted)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <PrismSpectralBar className="h-[2px] w-full opacity-80" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 md:gap-6">
            {/* Brand Signature: Cartograph */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigateToAboutSection('cartograph')}
                className="min-h-11 md:min-h-0 inline-flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer text-left"
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
              className="flex flex-wrap items-center gap-x-5 gap-y-1 md:gap-y-2 text-[13px]"
              aria-label={t('footerNavAria')}
            >
              <button
                type="button"
                onClick={() => navigateToAboutSection('cartograph')}
                className={`min-h-11 md:min-h-0 inline-flex items-center transition-colors cursor-pointer ${
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
                className={`min-h-11 md:min-h-0 inline-flex items-center transition-colors cursor-pointer ${
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
                className={`min-h-11 md:min-h-0 inline-flex items-center transition-colors cursor-pointer ${
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
                className={`min-h-11 md:min-h-0 inline-flex items-center transition-colors cursor-pointer ${
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
                className={`min-h-11 md:min-h-0 inline-flex items-center transition-colors cursor-pointer ${
                  activeTab === 'about' && aboutSection === 'privacy'
                    ? 'font-semibold text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--link-academic)]'
                }`}
              >
                {t('footerPrivacy')}
              </button>
              <button
                type="button"
                onClick={() => navigateToTab('feedback')}
                className={`min-h-11 md:min-h-0 inline-flex items-center transition-colors cursor-pointer ${
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
            onClearLogs={workspaceActions.clearSearchLogs}
          />
        </Suspense>
      )}

      <MobileSheet
        open={showMobileQuickTools}
        onClose={() => setShowMobileQuickTools(false)}
        title={t('mobileQuickToolsTitle')}
        mobileBreakpoint="md"
        initialSnap="auto"
        closeLabel={t('mobileCloseSheetBtn')}
        dragHandleLabel={t('mobileDragHandleLabel')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <button
              type="button"
              disabled={!isValidQuery || isTranslating}
              onClick={() => {
                setShowMobileQuickTools(false);
                void handleTranslatePtToEn();
              }}
              className="w-full min-h-12 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Languages className="w-[18px] h-[18px] text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                <span className="text-[14px] font-medium truncate">{t('translateTitle')}</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--divider)] text-[11.5px] font-mono font-semibold text-[var(--text-secondary)] shrink-0">
                {isTranslating ? '...' : 'PT→EN'}
              </span>
            </button>

            <button
              type="button"
              disabled={!isValidQuery}
              onClick={() => {
                setShowMobileQuickTools(false);
                void handleShareSearch();
              }}
              className="w-full min-h-12 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Share2 className="w-[18px] h-[18px] text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                <span className="text-[14px] font-medium truncate">{t('shareSearchTitle')}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMobileQuickTools(false);
                setShowSearchHistoryModal(true);
              }}
              className="w-full min-h-12 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <History className="w-[18px] h-[18px] text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                <span className="text-[14px] font-medium truncate">
                  {t('searchHistoryBtn', { count: searchLogs.length })}
                </span>
              </span>
              <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
                {searchLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMobileQuickTools(false);
                openAccessSettings('proxy');
              }}
              className="w-full min-h-12 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <KeyRound
                  className={`w-[18px] h-[18px] shrink-0 ${
                    hasActiveAccessEnhancement ? 'text-[var(--link-academic)]' : 'text-[var(--text-secondary)]'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[14px] font-medium truncate">{t('accessSettingsBtn')}</span>
              </span>
              {hasActiveAccessEnhancement && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-blue-tint)] text-[var(--link-academic)] shrink-0">
                  {t('activeBadge')}
                </span>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--divider)]">
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className="w-full min-h-12 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                {theme === 'light' ? (
                  <Sun className="w-[18px] h-[18px] text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                ) : (
                  <Moon className="w-[18px] h-[18px] text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                )}
                <span className="text-[14px] font-medium truncate">{t('toggleThemeTitle')}</span>
              </span>
              <span
                aria-hidden="true"
                className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)] shrink-0"
              >
                <span
                  className={`p-1 rounded-full transition-colors ${
                    theme === 'light'
                      ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </span>
                <span
                  className={`p-1 rounded-full transition-colors ${
                    theme === 'dark'
                      ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </span>
              </span>
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--divider)] space-y-2">
            <div className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {t('languageMenuLabel')}
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => resetToSystemLanguage()}
                className={`w-full min-h-11 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-[14px] transition-colors cursor-pointer text-left ${
                  isAutoLanguage
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-semibold'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">{t('languageAutoSystem')}</span>
                {isAutoLanguage && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
              </button>
              <div className="grid grid-cols-2 gap-2">
                {availableLanguages.map((langOpt) => {
                  const isActiveLang = !isAutoLanguage && language === langOpt.code;
                  return (
                    <button
                      key={langOpt.code}
                      type="button"
                      onClick={() => setLanguage(langOpt.code)}
                      className={`min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13.5px] transition-colors cursor-pointer text-left ${
                        isActiveLang
                          ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-semibold'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <span className="truncate">{langOpt.nativeLabel}</span>
                      <span className="text-[11px] font-mono uppercase opacity-75 shrink-0">
                        {langOpt.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </MobileSheet>

      <MobileTabBar
        activeTab={isNotFound ? null : activeTab}
        resultsCount={federatedPapers.length}
        savedCount={savedPapers.length}
        historyCount={searchLogs.length}
        isSearching={isSearchingApis}
        onNavigate={navigateToTab}
        onOpenHistory={() => setShowSearchHistoryModal(true)}
      />

      {analyticsConsentPrompt && (
        <div
          className="fixed left-4 right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:left-auto md:bottom-4 md:right-4 z-40 md:max-w-sm bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-2xl shadow-xl p-4 space-y-3"
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
              className="min-h-11 md:min-h-0 px-3.5 py-2 md:px-3 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              {t('analyticsDeclineBtn')}
            </button>
            <button
              type="button"
              onClick={() => {
                grantAnalyticsConsent();
                setAnalyticsConsentPrompt(false);
              }}
              className="min-h-11 md:min-h-0 px-3.5 py-2 md:px-3 md:py-1.5 rounded-xl md:rounded-lg text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer"
            >
              {t('analyticsAcceptBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
