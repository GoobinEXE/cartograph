# Graph Report - agent-abe108ef68fb3efdc  (2026-11-17)

## Corpus Check
- 149 files · ~119,764 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 3, .xml 3, .command 2)

## Summary
- 1078 nodes · 3415 edges · 47 communities (39 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03ccea0c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- workspaceBackup.ts
- Tauri Multi-Platform App Icons
- sourceAdapters.ts
- Tauri Desktop Window Configuration
- Architecture Docs & HTML Shell
- TypeScript Compiler Configuration
- dependencies
- workspaceState.ts
- ref_node_assert
- GitHub Pages Deploy Job
- CI Release Action Inputs
- CI Workflow Build Steps
- WorkspaceProvider.tsx
- Railway Deployment Configuration
- useI18n
- academicAggregator.ts
- PRISM Brand & OG Assets
- Tauri Desktop Release Job
- CI Workflow Branch Triggers
- Vercel Routing & Headers Config
- CI Web Verification Job
- CI Platform Build Matrix
- Tauri Default Capabilities
- launcher-bridge.mjs
- relevanceRanker.ts
- seo.ts
- context.tsx
- package.json
- scripts
- Linux Desktop Launcher Script
- Linux Web Bridge Script
- Rust Cargo Crate Manifest
- deduplication.ts
- AboutView.tsx
- AccessSettingsModal.tsx
- LibraryBackupSection.tsx
- workspaceActions.ts
- devDependencies
- academic.ts
- platforms.ts
- workspaceReducer.ts
- @tauri-apps/api@^2.12.4
- vite

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 58 edges
2. `normalizeDoi()` - 55 edges
3. `Cartograph Master App Icon (512x512 PNG)` - 55 edges
4. `SavedPaperItem` - 47 edges
5. `AcademicCommandCenter()` - 45 edges
6. `asString()` - 38 edges
7. `react` - 34 edges
8. `asRecords()` - 34 edges
9. `NormalizedPaper` - 33 edges
10. `asRecord()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `AcademicCommandCenter()`  [INFERRED]
  agents/DESIGN_AND_INTEGRATION.md → src/App.tsx
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `AcademicCommandCenter()`  [INFERRED]
  .agents/rules/design-and-integration.md → src/App.tsx
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `BooleanQueryState`  [INFERRED]
  agents/DESIGN_AND_INTEGRATION.md → src/types/academic.ts
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `BooleanQueryState`  [INFERRED]
  .agents/rules/design-and-integration.md → src/types/academic.ts
- `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` --references--> `ScreeningStatus`  [INFERRED]
  agents/DESIGN_AND_INTEGRATION.md → src/types/academic.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cartograph Hybrid Runtime & OS Integration Layer** — agents_cartograph, agents_node_local_bridge, agents_tauri_desktop_architecture, agents_serverless_proxies [EXTRACTED 1.00]
- **Cartograph Deterministic Metasearch & PRISMA Pipeline** — agents_boolean_query_engine, agents_federated_aggregator, agents_platform_catalog, agents_deterministic_pro_pipeline [EXTRACTED 1.00]
- **Cartograph Public Web Entry, SEO & Fallback Surface** — index_spa_entry, index_schema_org_graph, public_404_error_page, public_robots_crawler_policy [INFERRED 0.85]

## Communities (47 total, 8 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.11
Nodes (26): @vercel/analytics, AboutView, AcademicCommandCenter(), BooleanBuilderDrawer, FeedbackView, PLATFORM_SIDEBAR_DRAWER_DEFAULTS, PlatformSortMode, SavedLiteratureDrawer (+18 more)

### Community 1 - "workspaceBackup.ts"
Cohesion: 0.31
Nodes (12): BackupParseResult, EmergencyBackupResult, parseWorkspaceBackup(), sanitizeCustomColumn(), sanitizeCustomFields(), sanitizeGroup(), sanitizeQualityAppraisal(), sanitizeRecordList() (+4 more)

### Community 2 - "Tauri Multi-Platform App Icons"
Cohesion: 0.07
Nodes (56): Tauri App Icon 128x128@2x (256x256 PNG), Tauri App Icon 128x128 PNG, Tauri App Icon 32x32 PNG, Tauri App Icon 64x64 PNG, Android Adaptive Foreground Icon Variant (ic_launcher_foreground), Android Round Launcher Icon Variant (ic_launcher_round), Android Launcher Icon Variant (ic_launcher), Android HDPI Density Bucket (mipmap-hdpi) (+48 more)

### Community 3 - "sourceAdapters.ts"
Cohesion: 0.11
Nodes (90): normalizeDoi(), extractYear(), filterByYear(), nonNegativeCount(), pdfUrlOrNull(), UNTITLED_PAPER_TITLE, joinName(), parseArxivAtom() (+82 more)

### Community 4 - "Tauri Desktop Window Configuration"
Cohesion: 0.10
Nodes (19): debugApplicationIdSuffix, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 5 - "Architecture Docs & HTML Shell"
Cohesion: 0.13
Nodes (16): Boolean Query Builder & PT-EN Technical Dictionary, Cartograph (Scientific Metasearch Hub), Federated Academic Aggregator (15 Open APIs), Reactive Multilingual i18n Layer (PT, EN, ES, FR), Node Local Bridge (launcher-bridge.mjs), Curated Academic Platform Catalog (111 Platforms & 20 Presets), Serverless CORS & Remote API Proxies (api/), Tauri v2 Standalone Desktop Architecture (+8 more)

### Community 6 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, isolatedModules, jsx, lib, module, moduleDetection (+10 more)

### Community 7 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, @tauri-apps/plugin-http@^2.9.0, @tauri-apps/plugin-opener@^2.7.3, @tauri-apps/plugin-shell@^2.6.0, @vercel/analytics@^2.0.1 (+6 more)

### Community 8 - "workspaceState.ts"
Cohesion: 0.31
Nodes (11): CustomColumnsManagerProps, SavedPaperCardProps, createInitialWorkspaceState(), WorkspaceState, WorkspaceStoreSnapshot, CustomExtractionColumn, DedupOverrideRule, LibraryGroup (+3 more)

### Community 9 - "ref_node_assert"
Cohesion: 0.06
Nodes (42): esbuildBin, outDir, projectRoot, testFiles, testsDir, BooleanBuilderDrawer(), BooleanBuilderDrawerProps, formatMeshInsertionTerm() (+34 more)

### Community 10 - "GitHub Pages Deploy Job"
Cohesion: 0.18
Nodes (11): environment, if, name, needs, permissions, runs-on, name, url (+3 more)

### Community 11 - "CI Release Action Inputs"
Cohesion: 0.18
Nodes (11): with, args, cache, node-version, path, prerelease, releaseBody, releaseDraft (+3 more)

### Community 12 - "CI Workflow Build Steps"
Cohesion: 0.29
Nodes (10): steps, steps, GITHUB_TOKEN, env, id, if, name, run (+2 more)

### Community 13 - "WorkspaceProvider.tsx"
Cohesion: 0.11
Nodes (29): createWorkspaceActions(), buildHydratedWorkspaceState(), HydratedWorkspace, bindFlushToPageLifecycle(), connectWorkspacePersistence(), DEFAULT_TIMERS, LifecycleEventSource, PageLifecycleTargets (+21 more)

### Community 14 - "Railway Deployment Configuration"
Cohesion: 0.22
Nodes (8): build, buildCommand, builder, deploy, restartPolicyMaxRetries, restartPolicyType, startCommand, $schema

### Community 15 - "useI18n"
Cohesion: 0.16
Nodes (26): lucide-react, react, AccessSettingsModalProps, CitationChaserModal(), CitationChaserModalProps, FEDERATED_SIDEBAR_DRAWER_DEFAULTS, FederatedResultsPanel(), FederatedResultsPanelProps (+18 more)

### Community 16 - "academicAggregator.ts"
Cohesion: 0.10
Nodes (33): BYOK_UPSTREAM_PROVIDERS, API_SOURCE_REGISTRY, ApiSourceMetadata, sourceMatchesScope(), THEMATIC_AREA_TO_SCOPE, TOTAL_FEDERATED_SOURCE_COUNT, BYOK_PROVIDER_MAP, BYOK_PROVIDERS (+25 more)

### Community 17 - "PRISM Brand & OG Assets"
Cohesion: 0.32
Nodes (8): Cartograph App Icon (Squircle 512x512), PRISM Ecosystem Monogram P Mark, PRISM Ecosystem Triangular Prism Symbol, Cartograph Favicon (Squircle 512x512), Cartograph Logo Dark Theme Variant, Cartograph Logo Light Theme Variant, Cartograph OpenGraph Social Banner (PNG), Cartograph OpenGraph Social Banner (SVG 1200x630)

### Community 18 - "Tauri Desktop Release Job"
Cohesion: 0.29
Nodes (7): if, name, needs, permissions, runs-on, build-tauri-desktop, contents

### Community 19 - "CI Workflow Branch Triggers"
Cohesion: 0.29
Nodes (7): on, pull_request, push, workflow_dispatch, branches, branches, tags

### Community 20 - "Vercel Routing & Headers Config"
Cohesion: 0.29
Nodes (6): cleanUrls, headers, redirects, rewrites, trailingSlash, version

### Community 21 - "CI Web Verification Job"
Cohesion: 0.33
Nodes (5): jobs, verify-web-and-bridge, name, name, runs-on

### Community 22 - "CI Platform Build Matrix"
Cohesion: 0.33
Nodes (6): strategy, args, platform, include, fail-fast, matrix

### Community 23 - "Tauri Default Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 24 - "launcher-bridge.mjs"
Cohesion: 0.07
Nodes (68): handler(), handler(), handler(), readHeaderValue(), ALLOWED_TYPES, handler(), sanitizeHttpUrl(), handler() (+60 more)

### Community 25 - "relevanceRanker.ts"
Cohesion: 0.18
Nodes (21): RankedPaperResult, RelevanceBreakdown, buildFrequencyMaps(), clamp(), computeConsensusMetrics(), computeImpactRecencyMetrics(), computeLexicalMetrics(), computePaperRelevance() (+13 more)

### Community 26 - "seo.ts"
Cohesion: 0.15
Nodes (15): AboutSectionId, LanguageCode, ABOUT_SECTIONS_BY_PATH, AppTab, buildCanonicalPath(), CANONICAL_ORIGIN, CANONICAL_PATH_BY_ABOUT_SECTION, HTML_LANG_MAP (+7 more)

### Community 27 - "context.tsx"
Cohesion: 0.08
Nodes (33): EmergencyBackupStatus, ErrorBoundary, ErrorBoundaryState, PersistedDrawers, readDrawerState(), usePersistedDrawers(), writeDrawerState(), AVAILABLE_LANGUAGES (+25 more)

### Community 28 - "package.json"
Cohesion: 0.20
Nodes (9): description, tailwindcss@^4.0.6, @types/node@^22.10.2, name, private, type, version, tailwindcss (+1 more)

### Community 29 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, bridge, build, desktop, desktop:build, dev, preview, start (+3 more)

### Community 36 - "deduplication.ts"
Cohesion: 0.06
Nodes (53): 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita, 3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias, Diretrizes Normativas: UI/UX Intelligence, Rigor Tipográfico e Integração Arquitetural Estrita, 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita (+45 more)

### Community 37 - "AboutView.tsx"
Cohesion: 0.23
Nodes (11): AboutView(), AboutViewProps, NotFoundView(), NotFoundViewProps, PrismMonogram(), PrismSpectralBar(), API_SOURCE_DOCS, ApiSourceDoc (+3 more)

### Community 38 - "AccessSettingsModal.tsx"
Cohesion: 0.33
Nodes (8): AccessSettingsModal, AccessSettingsModal(), InstitutionalProxyConfig, CAPES_CAFE_COVERED_PLATFORM_IDS, buildDoiProxyUrl(), buildPrefixProxyUrl(), DEFAULT_INSTITUTIONAL_PROXY, rewriteUrlWithInstitutionalProxy()

### Community 39 - "LibraryBackupSection.tsx"
Cohesion: 0.19
Nodes (22): LibraryBackupSection(), GROUP_COLORS, LibrarySlotView, LibrarySortMode, LibrarySubTab, resolveImportTargetGroup(), SAVED_CARD_DRAWER_HEADER_CLASS, SAVED_CARD_DRAWER_TITLE_CLASS (+14 more)

### Community 40 - "workspaceActions.ts"
Cohesion: 0.23
Nodes (16): LibraryBackupSectionProps, LibrarySidebarProps, SavedLiteratureDrawerProps, BackupRestoreResult, DEFAULT_GROUP_COLOR, LibraryImportResult, WorkspaceActionDeps, WorkspaceActions (+8 more)

### Community 41 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @tailwindcss/vite@^4.0.6, @tauri-apps/cli@^2.12.4, @types/react@^18.3.18, @types/react-dom@^18.3.5, typescript@~5.6.2, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite (+5 more)

### Community 42 - "academic.ts"
Cohesion: 0.05
Nodes (88): BibliometricsPanel(), BibliometricsPanelProps, BlindScreeningModal(), BlindScreeningModalProps, ModalMode, CustomColumnsManager(), BibliometricsPanel, LibraryBibliometricsTab() (+80 more)

### Community 43 - "platforms.ts"
Cohesion: 0.11
Nodes (22): UnifiedAreaFilterDrawer(), UnifiedAreaFilterDrawerProps, API_SOURCE_AUTHORITY_WEIGHTS, BYOK_FEDERATED_SOURCE_COUNT, countSourcesForScope(), mapAreaToSearchScope(), ACCESS_BADGES, CATEGORY_META (+14 more)

### Community 44 - "workspaceReducer.ts"
Cohesion: 0.21
Nodes (14): importIntoLibrary(), inferRelatedKind(), LibraryImportPlan, linkRelatedPaper(), planLibraryImport(), resolveTargetGroup(), restoreWorkspaceBackup(), togglePresetSelection() (+6 more)

## Knowledge Gaps
- **21 isolated node(s):** `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)`, `Tauri App Icon 128x128@2x (256x256 PNG)`, `Tauri App Icon 128x128 PNG` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 263 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizeDoi()` connect `sourceAdapters.ts` to `workspaceBackup.ts`, `deduplication.ts`, `academic.ts`, `useI18n`, `launcher-bridge.mjs`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `Cartograph Master App Icon (512x512 PNG)` (e.g. with `Tauri App Icon 128x128@2x (256x256 PNG)` and `Tauri App Icon 128x128 PNG`) actually correct?**
  _`Cartograph Master App Icon (512x512 PNG)` has 55 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11290322580645161 - nodes in this community are weakly interconnected._
- **Why does `NormalizedPaper` connect `deduplication.ts` to `App.tsx`, `sourceAdapters.ts`, `workspaceActions.ts`, `academic.ts`, `workspaceReducer.ts`, `WorkspaceProvider.tsx`, `useI18n`, `academicAggregator.ts`, `relevanceRanker.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AcademicCommandCenter()` (e.g. with `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` and `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias`) actually correct?**
  _`AcademicCommandCenter()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Tauri Multi-Platform App Icons` be split into smaller, more focused modules?**
  _Cohesion score 0.06623376623376623 - nodes in this community are weakly interconnected._