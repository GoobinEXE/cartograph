# Graph Report - SUPER PESQUISADOR 2000  (2026-11-18)

## Corpus Check
- 171 files · ~162,763 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .xml 3, (none) 2, .command 2)

## Summary
- 1256 nodes · 4179 edges · 55 communities (49 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 160 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d0cc728d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sourceAdapters.ts & coreSourceAdapters.ts
- launcher-bridge.mjs & upstreams.mjs
- academicAggregator.ts & httpClient.ts
- deduplication.ts & NormalizedPaper
- Cartograph Master App Icon (512x512 PNG) & AppIcon-512@2x.png (Tauri iOS App Store Icon 512@2x)
- useI18n() & FederatedResultsPanel.tsx
- App.tsx & AcademicCommandCenter()
- layoutPreferences.test.ts & render-og-image.mjs
- react & AboutView.tsx
- LibraryBackupSection.tsx & PrismaFlowDiagram.tsx
- BlindScreeningModal.tsx & BlindScreeningModal()
- BooleanBuilderDrawer.tsx & queryBuilder.ts
- LibraryToolbar.tsx & citationExporter.ts
- academic.ts & ref_node_assert
- index.ts & workspaceActions.ts
- libraryShared.ts & LibraryMatrix.tsx
- storageEngine.ts & storageEngineWrites.test.ts
- workspaceBackup.ts & workspaceBackup.test.ts
- lucide-react & LibrarySidebar.tsx
- workspacePersistence.ts & workspacePersistence.test.ts
- tauri.conf.json & build
- Cartograph (Scientific Metasearch Hub) & Federated Academic Aggregator (15 Open APIs)
- package.json & devDependencies
- SavedLiteratureDrawer.tsx & abstractParser.ts
- compilerOptions & tsconfig.json
- AccessSettingsModal.tsx & UserAccessConfig
- useSheetGesture.ts & useSheetGesture()
- dependencies & react-dom
- SavedPaperItem & LibraryGroup
- qualityChecklists.ts & SavedPaperPanels.tsx
- ErrorBoundary.tsx & layoutPreferences.ts
- translations.ts & SupportedLanguage
- vite.config.ts & BYOK_FEDERATED_SOURCE_COUNT
- _workspaceFixtures.ts & workspaceReducer.test.ts
- scripts & bridge
- context.tsx & I18nProvider()
- workspaceReducer.ts & workspaceReducer()
- deploy-github-pages & environment
- with & args
- steps & steps
- deploy & railway.json
- Cartograph App Icon (Squircle 512x512) & PRISM Ecosystem Triangular Prism Symbol
- bibImporter.ts & bibImporter.test.ts
- build-tauri-desktop & permissions
- on & push
- vercel.json & cleanUrls
- jobs & verify-web-and-bridge
- strategy & include
- default.json & description
- iniciar-desktop-linux.sh & iniciar-desktop-linux.sh script
- iniciar-linux.sh & iniciar-linux.sh script
- cartograph

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 70 edges
2. `normalizeDoi()` - 57 edges
3. `Cartograph Master App Icon (512x512 PNG)` - 55 edges
4. `AcademicCommandCenter()` - 53 edges
5. `SavedPaperItem` - 52 edges
6. `asString()` - 47 edges
7. `asRecord()` - 46 edges
8. `react` - 44 edges
9. `asRecords()` - 41 edges
10. `NormalizedPaper` - 38 edges

## Surprising Connections (you probably didn't know these)
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `AcademicCommandCenter()`  [INFERRED]
  agents/DESIGN_AND_INTEGRATION.md → src/App.tsx
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `AcademicCommandCenter()`  [INFERRED]
  .agents/rules/design-and-integration.md → src/App.tsx
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `NormalizedPaper`  [INFERRED]
  agents/DESIGN_AND_INTEGRATION.md → src/types/academic.ts
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `NormalizedPaper`  [INFERRED]
  .agents/rules/design-and-integration.md → src/types/academic.ts
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `ScreeningStatus`  [INFERRED]
  agents/DESIGN_AND_INTEGRATION.md → src/types/academic.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cartograph Hybrid Runtime & OS Integration Layer** — agents_cartograph, agents_node_local_bridge, agents_tauri_desktop_architecture, agents_serverless_proxies [EXTRACTED 1.00]
- **Cartograph Deterministic Metasearch & PRISMA Pipeline** — agents_boolean_query_engine, agents_federated_aggregator, agents_platform_catalog, agents_deterministic_pro_pipeline [EXTRACTED 1.00]
- **Cartograph Public Web Entry, SEO & Fallback Surface** — index_spa_entry, index_schema_org_graph, public_404_error_page, public_robots_crawler_policy [INFERRED 0.85]

## Communities (55 total, 6 thin omitted)

### Community 0 - "sourceAdapters.ts & coreSourceAdapters.ts"
Cohesion: 0.07
Nodes (128): normalizeDoi(), extractYear(), filterByYear(), localizeUntitledPapers(), nonNegativeCount(), pdfUrlOrNull(), UNTITLED_PAPER_TITLE, chasePaperCitations() (+120 more)

### Community 1 - "launcher-bridge.mjs & upstreams.mjs"
Cohesion: 0.08
Nodes (63): handler(), handler(), handler(), readHeaderValue(), ALLOWED_TYPES, handler(), sanitizeHttpUrl(), handler() (+55 more)

### Community 2 - "academicAggregator.ts & httpClient.ts"
Cohesion: 0.05
Nodes (54): BYOK_UPSTREAM_PROVIDERS, API_SOURCE_DOCS, ApiSourceDoc, API_SOURCE_AUTHORITY_WEIGHTS, API_SOURCE_REGISTRY, ApiSourceMetadata, countSourcesForScope(), sourceMatchesScope() (+46 more)

### Community 3 - "deduplication.ts & NormalizedPaper"
Cohesion: 0.07
Nodes (52): CitationChaseResult, BatchResolveResult, MergeRuleMatched, NormalizedPaper, RankedPaperResult, RelevanceBreakdown, buildFuzzyIdentityKey(), combineIndexedRecords() (+44 more)

### Community 4 - "Cartograph Master App Icon (512x512 PNG) & AppIcon-512@2x.png (Tauri iOS App Store Icon 512@2x)"
Cohesion: 0.07
Nodes (56): Tauri App Icon 128x128@2x (256x256 PNG), Tauri App Icon 128x128 PNG, Tauri App Icon 32x32 PNG, Tauri App Icon 64x64 PNG, Android Adaptive Foreground Icon Variant (ic_launcher_foreground), Android Round Launcher Icon Variant (ic_launcher_round), Android Launcher Icon Variant (ic_launcher), Android HDPI Density Bucket (mipmap-hdpi) (+48 more)

### Community 5 - "useI18n() & FederatedResultsPanel.tsx"
Cohesion: 0.11
Nodes (39): SearchHistoryDrawer, AccessSettingsModal(), CitationChaserModal(), FEDERATED_SIDEBAR_DRAWER_DEFAULTS, FederatedResultsPanel(), FederatedSidebarSectionKey, getShortSourceLabel(), SHORT_SOURCE_LABELS (+31 more)

### Community 6 - "App.tsx & AcademicCommandCenter()"
Cohesion: 0.09
Nodes (41): AboutView, AcademicCommandCenter(), AccessSettingsModal, BooleanBuilderDrawer, FeedbackView, PLATFORM_SIDEBAR_DRAWER_DEFAULTS, PLATFORM_SIDEBAR_MOBILE_DEFAULTS, PlatformSortMode (+33 more)

### Community 7 - "layoutPreferences.test.ts & render-og-image.mjs"
Cohesion: 0.06
Nodes (19): chrome, chromeCandidates, outPath, root, svg, svgPath, workDir, esbuildBin (+11 more)

### Community 8 - "react & AboutView.tsx"
Cohesion: 0.11
Nodes (28): react, @vercel/analytics, AboutView(), AboutViewProps, FeedbackView(), FeedbackViewProps, MobileTabBar(), MobileTabBarProps (+20 more)

### Community 9 - "LibraryBackupSection.tsx & PrismaFlowDiagram.tsx"
Cohesion: 0.10
Nodes (21): BibliometricsPanel(), BibliometricsPanelProps, LibraryBackupSection(), resolveImportTargetGroup(), clampZoom(), PointerPoint, PrismaFlowDiagram(), PrismaFlowDiagramProps (+13 more)

### Community 10 - "BlindScreeningModal.tsx & BlindScreeningModal()"
Cohesion: 0.11
Nodes (29): BlindScreeningModal(), BlindScreeningModalProps, MobileAutoExcludeMode, ModalMode, persistStoragePreference(), readInitialAutoExcludeMode(), readInitialHapticsEnabled(), ScreeningUndoEntry (+21 more)

### Community 11 - "BooleanBuilderDrawer.tsx & queryBuilder.ts"
Cohesion: 0.10
Nodes (27): 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita, 3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias, Diretrizes Normativas: UI/UX Intelligence, Rigor Tipográfico e Integração Arquitetural Estrita, 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita (+19 more)

### Community 12 - "LibraryToolbar.tsx & citationExporter.ts"
Cohesion: 0.20
Nodes (23): CustomColumnsManager(), LibrarySlotView, LibrarySubTab, LibrarySlotsSectionProps, LibraryToolbar(), LibraryToolbarProps, INTL_LOCALES, proseLanguage (+15 more)

### Community 13 - "academic.ts & ref_node_assert"
Cohesion: 0.13
Nodes (15): PLATFORM_TRANSLATIONS_EN, PlatformEnTranslation, translate(), FeedbackType, LaunchPreset, LibraryMatrixMobileMode, PlatformConfig, ScreeningExclusionReason (+7 more)

### Community 14 - "index.ts & workspaceActions.ts"
Cohesion: 0.15
Nodes (24): LibraryBackupSectionProps, LibrarySidebarProps, QualityAppraisalSectionProps, SavedLiteratureDrawerProps, BackupRestoreResult, createWorkspaceActions(), DEFAULT_GROUP_COLOR, LibraryImportResult (+16 more)

### Community 15 - "libraryShared.ts & LibraryMatrix.tsx"
Cohesion: 0.25
Nodes (18): LibraryMatrix(), readStoredFocusColumn(), readStoredMobileMode(), FocusColumnDisplayValue, getExtractedMetadataForItem(), getPaperAuthorYearLabel(), GROUP_COLORS, MatrixFocusColumnId (+10 more)

### Community 16 - "storageEngine.ts & storageEngineWrites.test.ts"
Cohesion: 0.15
Nodes (16): createWorkspaceStorageEngine(), LEGACY_LOCAL_STORAGE_ALIASES, localKeysFor(), readLegacyLocalValue(), readLocalWorkspaceValue(), StorageEngineDeps, WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION (+8 more)

### Community 17 - "workspaceBackup.ts & workspaceBackup.test.ts"
Cohesion: 0.17
Nodes (18): BackupParseResult, buildEmergencyBackupFromRecords(), buildWorkspaceBackupPayload(), CARTOGRAPH_BACKUP_SCHEMA, CARTOGRAPH_BACKUP_SCHEMA_V2, CartographEmergencyBackup, EmergencyBackupResult, parseWorkspaceBackup() (+10 more)

### Community 18 - "lucide-react & LibrarySidebar.tsx"
Cohesion: 0.21
Nodes (15): lucide-react, SAVED_CARD_DRAWER_HEADER_CLASS, SAVED_CARD_DRAWER_TITLE_CLASS, LibrarySidebar(), LibrarySlotsSection(), NewGroupSection(), NewGroupSectionProps, CollapsibleSection() (+7 more)

### Community 19 - "workspacePersistence.ts & workspacePersistence.test.ts"
Cohesion: 0.15
Nodes (16): buildHydratedWorkspaceState(), HydratedWorkspace, connectWorkspacePersistence(), DEFAULT_TIMERS, LifecycleEventSource, PageLifecycleTargets, PERSISTED_KEYS, PersistenceTimers (+8 more)

### Community 20 - "tauri.conf.json & build"
Cohesion: 0.10
Nodes (19): debugApplicationIdSuffix, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 21 - "Cartograph (Scientific Metasearch Hub) & Federated Academic Aggregator (15 Open APIs)"
Cohesion: 0.13
Nodes (16): Boolean Query Builder & PT-EN Technical Dictionary, Cartograph (Scientific Metasearch Hub), Federated Academic Aggregator (15 Open APIs), Reactive Multilingual i18n Layer (PT, EN, ES, FR), Node Local Bridge (launcher-bridge.mjs), Curated Academic Platform Catalog (111 Platforms & 20 Presets), Serverless CORS & Remote API Proxies (api/), Tauri v2 Standalone Desktop Architecture (+8 more)

### Community 22 - "package.json & devDependencies"
Cohesion: 0.14
Nodes (18): description, devDependencies, tailwindcss@^4.0.6, @tauri-apps/cli@^2.12.4, @types/node@^22.10.2, @types/react@^18.3.18, @types/react-dom@^18.3.5, typescript@~5.6.2 (+10 more)

### Community 23 - "SavedLiteratureDrawer.tsx & abstractParser.ts"
Cohesion: 0.21
Nodes (14): BibliometricsPanel, LibraryBibliometricsTab(), LibraryPrismaTab(), LibrarySortMode, QuickCaptureSheet(), QuickCaptureSheetProps, useLibraryCardState(), SavedLiteratureDrawer() (+6 more)

### Community 24 - "compilerOptions & tsconfig.json"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, isolatedModules, jsx, lib, module, moduleDetection (+10 more)

### Community 25 - "AccessSettingsModal.tsx & UserAccessConfig"
Cohesion: 0.20
Nodes (14): AccessSettingsModalProps, CitationChaserModalProps, FederatedResultsPanelProps, USER_WORKSPACE_SECTION_TAG, UserWorkspaceSectionProps, AccessModel, AccessSettingsTab, DeduplicationSummary (+6 more)

### Community 26 - "useSheetGesture.ts & useSheetGesture()"
Cohesion: 0.20
Nodes (15): clamp(), computeReleaseVelocity(), GestureSession, isBlockedInteractiveTarget(), projectMomentum(), readLiveTranslateY(), resolveSheetSnapOrDismiss(), ResolveSheetSnapParams (+7 more)

### Community 27 - "dependencies & react-dom"
Cohesion: 0.12
Nodes (16): dependencies, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, @tauri-apps/api@^2.12.4, @tauri-apps/plugin-http@^2.9.0, @tauri-apps/plugin-opener@^2.7.3, @tauri-apps/plugin-shell@^2.6.0 (+8 more)

### Community 28 - "SavedPaperItem & LibraryGroup"
Cohesion: 0.35
Nodes (14): CustomColumnsManagerProps, LibraryMatrixProps, MatrixQuickEditSheetProps, SavedPaperCardProps, SearchHistoryDrawerProps, WorkspaceState, CustomExtractionColumn, DedupOverrideRule (+6 more)

### Community 29 - "qualityChecklists.ts & SavedPaperPanels.tsx"
Cohesion: 0.29
Nodes (12): QualityAppraisalSection(), ImradReaderSheetProps, ExtractedPaperMetadata, QualityRating, QualityToolId, computeOverallQuality(), createEmptyQualityAppraisal(), getQualityChecklistDefinition() (+4 more)

### Community 30 - "ErrorBoundary.tsx & layoutPreferences.ts"
Cohesion: 0.23
Nodes (11): EmergencyBackupStatus, ErrorBoundaryState, PersistedDrawers, readDrawerState(), writeDrawerState(), DrawerState, LAYOUT_STORAGE_KEYS, LayoutStorageKey (+3 more)

### Community 31 - "translations.ts & SupportedLanguage"
Cohesion: 0.24
Nodes (9): TabItem, I18nContextType, LanguageOption, en, es, fr, pt, SupportedLanguage (+1 more)

### Community 32 - "vite.config.ts & BYOK_FEDERATED_SOURCE_COUNT"
Cohesion: 0.17
Nodes (11): @tailwindcss/vite@^4.0.6, vite@^6.0.5, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite, vite, @vitejs/plugin-react, BYOK_FEDERATED_SOURCE_COUNT, CATALOG_TOKENS (+3 more)

### Community 33 - "_workspaceFixtures.ts & workspaceReducer.test.ts"
Cohesion: 0.24
Nodes (9): WorkspaceAction, createInitialWorkspaceState(), UNGROUPED_SLOT, WorkspaceStore, WorkspaceStoreSnapshot, createManualTimers(), makePaper(), makeSaved() (+1 more)

### Community 34 - "scripts & bridge"
Cohesion: 0.17
Nodes (12): scripts, bridge, build, desktop, desktop:build, dev, og:render, preview (+4 more)

### Community 35 - "context.tsx & I18nProvider()"
Cohesion: 0.32
Nodes (11): AVAILABLE_LANGUAGES, detectBrowserLanguage(), detectSystemLanguage(), hasManualLanguageOverride(), htmlLangFor(), I18nContext, I18nProvider(), isSupportedLanguage() (+3 more)

### Community 36 - "workspaceReducer.ts & workspaceReducer()"
Cohesion: 0.32
Nodes (11): importIntoLibrary(), inferRelatedKind(), LibraryImportPlan, linkRelatedPaper(), planLibraryImport(), resolveTargetGroup(), restoreWorkspaceBackup(), togglePresetSelection() (+3 more)

### Community 37 - "deploy-github-pages & environment"
Cohesion: 0.18
Nodes (11): environment, if, name, needs, permissions, runs-on, name, url (+3 more)

### Community 38 - "with & args"
Cohesion: 0.18
Nodes (11): with, args, cache, node-version, path, prerelease, releaseBody, releaseDraft (+3 more)

### Community 39 - "steps & steps"
Cohesion: 0.29
Nodes (10): steps, steps, GITHUB_TOKEN, env, id, if, name, run (+2 more)

### Community 40 - "deploy & railway.json"
Cohesion: 0.22
Nodes (8): build, buildCommand, builder, deploy, restartPolicyMaxRetries, restartPolicyType, startCommand, $schema

### Community 41 - "Cartograph App Icon (Squircle 512x512) & PRISM Ecosystem Triangular Prism Symbol"
Cohesion: 0.32
Nodes (8): Cartograph App Icon (Squircle 512x512), PRISM Ecosystem Monogram P Mark, PRISM Ecosystem Triangular Prism Symbol, Cartograph Favicon (Squircle 512x512), Cartograph Logo Dark Theme Variant, Cartograph Logo Light Theme Variant, Cartograph OpenGraph Social Banner (PNG), Cartograph OpenGraph Social Banner (SVG 1200x630)

### Community 42 - "bibImporter.ts & bibImporter.test.ts"
Cohesion: 0.57
Nodes (6): cleanBibValue(), makeImportedId(), parseBibFields(), parseBibtexEntries(), parseImportedReferences(), parseRisEntries()

### Community 43 - "build-tauri-desktop & permissions"
Cohesion: 0.29
Nodes (7): if, name, needs, permissions, runs-on, build-tauri-desktop, contents

### Community 44 - "on & push"
Cohesion: 0.29
Nodes (7): on, pull_request, push, workflow_dispatch, branches, branches, tags

### Community 45 - "vercel.json & cleanUrls"
Cohesion: 0.29
Nodes (6): cleanUrls, headers, redirects, rewrites, trailingSlash, version

### Community 46 - "jobs & verify-web-and-bridge"
Cohesion: 0.33
Nodes (5): jobs, verify-web-and-bridge, name, name, runs-on

### Community 47 - "strategy & include"
Cohesion: 0.33
Nodes (6): strategy, args, platform, include, fail-fast, matrix

### Community 48 - "default.json & description"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

## Knowledge Gaps
- **21 isolated node(s):** `cartograph`, `HTTP 404 Static Fallback Page`, `Reactive Multilingual i18n Layer (PT, EN, ES, FR)`, `Curated Academic Platform Catalog (111 Platforms & 20 Presets)`, `Prism (Prism Labs)` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 335 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizeDoi()` connect `sourceAdapters.ts & coreSourceAdapters.ts` to `launcher-bridge.mjs & upstreams.mjs`, `bibImporter.ts & bibImporter.test.ts`, `deduplication.ts & NormalizedPaper`, `workspaceBackup.ts & workspaceBackup.test.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `Cartograph Master App Icon (512x512 PNG)` (e.g. with `Tauri App Icon 128x128@2x (256x256 PNG)` and `Tauri App Icon 128x128 PNG`) actually correct?**
  _`Cartograph Master App Icon (512x512 PNG)` has 55 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cartograph`, `HTTP 404 Static Fallback Page`, `Reactive Multilingual i18n Layer (PT, EN, ES, FR)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sourceAdapters.ts & coreSourceAdapters.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06874815325519551 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react & AboutView.tsx` to `context.tsx & I18nProvider()`, `useI18n() & FederatedResultsPanel.tsx`, `App.tsx & AcademicCommandCenter()`, `LibraryBackupSection.tsx & PrismaFlowDiagram.tsx`, `BlindScreeningModal.tsx & BlindScreeningModal()`, `BooleanBuilderDrawer.tsx & queryBuilder.ts`, `LibraryToolbar.tsx & citationExporter.ts`, `index.ts & workspaceActions.ts`, `libraryShared.ts & LibraryMatrix.tsx`, `lucide-react & LibrarySidebar.tsx`, `package.json & devDependencies`, `SavedLiteratureDrawer.tsx & abstractParser.ts`, `AccessSettingsModal.tsx & UserAccessConfig`, `useSheetGesture.ts & useSheetGesture()`, `dependencies & react-dom`, `ErrorBoundary.tsx & layoutPreferences.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AcademicCommandCenter()` (e.g. with `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` and `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias`) actually correct?**
  _`AcademicCommandCenter()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `launcher-bridge.mjs & upstreams.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08491418247515808 - nodes in this community are weakly interconnected._