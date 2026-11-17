# Graph Report - SUPER PESQUISADOR 2000  (2026-11-17)

## Corpus Check
- 158 files · ~135,819 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .xml 3, (none) 2, .command 2)

## Summary
- 1140 nodes · 3724 edges · 47 communities (41 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 156 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d0cf256`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- workspaceBackup.ts
- Tauri Multi-Platform App Icons
- academicAggregator.ts
- Tauri Desktop Window Configuration
- Architecture Docs & HTML Shell
- TypeScript Compiler Configuration
- dependencies
- SavedPaperItem
- ref_node_assert
- GitHub Pages Deploy Job
- CI Release Action Inputs
- CI Workflow Build Steps
- BooleanBuilderDrawer.tsx
- Railway Deployment Configuration
- seo.ts
- academicAggregator.ts
- PRISM Brand & OG Assets
- Tauri Desktop Release Job
- CI Workflow Branch Triggers
- Vercel Routing & Headers Config
- CI Web Verification Job
- CI Platform Build Matrix
- Tauri Default Capabilities
- _security.ts
- relevanceRanker.ts
- BooleanBuilderDrawer.tsx
- ErrorBoundary
- FeedbackView.tsx
- scripts
- Linux Desktop Launcher Script
- Linux Web Bridge Script
- Rust Cargo Crate Manifest
- deduplication.ts
- AboutView.tsx
- useI18n
- workspaceActions.ts
- devDependencies
- BlindScreeningModal.tsx
- academic.ts
- render-og-image.mjs
- BlindScreeningModal.tsx
- academic.ts
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 62 edges
2. `normalizeDoi()` - 55 edges
3. `Cartograph Master App Icon (512x512 PNG)` - 55 edges
4. `AcademicCommandCenter()` - 49 edges
5. `SavedPaperItem` - 47 edges
6. `asString()` - 47 edges
7. `asRecord()` - 46 edges
8. `asRecords()` - 41 edges
9. `react` - 36 edges
10. `NormalizedPaper` - 34 edges

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

## Communities (47 total, 6 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.13
Nodes (29): AboutView, AcademicCommandCenter(), AccessSettingsModal, BooleanBuilderDrawer, FeedbackView, PLATFORM_SIDEBAR_DRAWER_DEFAULTS, PlatformSortMode, SavedLiteratureDrawer (+21 more)

### Community 1 - "workspaceBackup.ts"
Cohesion: 0.24
Nodes (14): BackupParseResult, buildEmergencyBackupFromRecords(), buildWorkspaceBackupPayload(), EmergencyBackupResult, parseWorkspaceBackup(), sanitizeCustomColumn(), sanitizeCustomFields(), sanitizeGroup() (+6 more)

### Community 2 - "Tauri Multi-Platform App Icons"
Cohesion: 0.07
Nodes (56): Tauri App Icon 128x128@2x (256x256 PNG), Tauri App Icon 128x128 PNG, Tauri App Icon 32x32 PNG, Tauri App Icon 64x64 PNG, Android Adaptive Foreground Icon Variant (ic_launcher_foreground), Android Round Launcher Icon Variant (ic_launcher_round), Android Launcher Icon Variant (ic_launcher), Android HDPI Density Bucket (mipmap-hdpi) (+48 more)

### Community 3 - "academicAggregator.ts"
Cohesion: 0.06
Nodes (140): normalizeDoi(), extractYear(), filterByYear(), localizeUntitledPapers(), nonNegativeCount(), pdfUrlOrNull(), UNTITLED_PAPER_TITLE, chasePaperCitations() (+132 more)

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
Cohesion: 0.12
Nodes (16): dependencies, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, @tauri-apps/api@^2.12.4, @tauri-apps/plugin-http@^2.9.0, @tauri-apps/plugin-opener@^2.7.3, @tauri-apps/plugin-shell@^2.6.0 (+8 more)

### Community 8 - "SavedPaperItem"
Cohesion: 0.30
Nodes (14): CustomColumnsManagerProps, LibraryMatrixProps, UnpaywallLookup, LibraryToolbarProps, SavedPaperCardProps, LibraryCardState, PrismaFlowDiagramProps, CustomExtractionColumn (+6 more)

### Community 9 - "ref_node_assert"
Cohesion: 0.06
Nodes (31): CLOUD_PROXY_ORIGIN, STORAGE_KEY_USER_ACCESS_CONFIG, cleanBibValue(), makeImportedId(), parseBibFields(), parseBibtexEntries(), parseImportedReferences(), parseRisEntries() (+23 more)

### Community 10 - "GitHub Pages Deploy Job"
Cohesion: 0.18
Nodes (11): environment, if, name, needs, permissions, runs-on, name, url (+3 more)

### Community 11 - "CI Release Action Inputs"
Cohesion: 0.18
Nodes (11): with, args, cache, node-version, path, prerelease, releaseBody, releaseDraft (+3 more)

### Community 12 - "CI Workflow Build Steps"
Cohesion: 0.29
Nodes (10): steps, steps, GITHUB_TOKEN, env, id, if, name, run (+2 more)

### Community 13 - "BooleanBuilderDrawer.tsx"
Cohesion: 0.15
Nodes (16): buildHydratedWorkspaceState(), HydratedWorkspace, connectWorkspacePersistence(), DEFAULT_TIMERS, LifecycleEventSource, PageLifecycleTargets, PERSISTED_KEYS, PersistenceTimers (+8 more)

### Community 14 - "Railway Deployment Configuration"
Cohesion: 0.22
Nodes (8): build, buildCommand, builder, deploy, restartPolicyMaxRetries, restartPolicyType, startCommand, $schema

### Community 15 - "seo.ts"
Cohesion: 0.13
Nodes (17): AboutSectionId, MobileTabBar(), MobileTabBarProps, TabItem, ABOUT_SECTIONS_BY_PATH, AppTab, buildCanonicalPath(), CANONICAL_ORIGIN (+9 more)

### Community 16 - "academicAggregator.ts"
Cohesion: 0.15
Nodes (22): API_SOURCE_REGISTRY, countSourcesForScope(), sourceMatchesScope(), BYOK_PROVIDERS, diagnoseSourceError(), federatedSearchCache, FederatedSearchProgress, FederatedSearchResult (+14 more)

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

### Community 24 - "_security.ts"
Cohesion: 0.10
Nodes (59): handler(), handler(), handler(), readHeaderValue(), ALLOWED_TYPES, handler(), sanitizeHttpUrl(), handler() (+51 more)

### Community 25 - "relevanceRanker.ts"
Cohesion: 0.12
Nodes (28): ExtractedPaperMetadata, RankedPaperResult, RelevanceBreakdown, detectStudyDesign(), extractSampleSize(), SAMPLE_SIZE_REGEXES, SECTION_PATTERNS, STUDY_DESIGN_PATTERNS (+20 more)

### Community 26 - "BooleanBuilderDrawer.tsx"
Cohesion: 0.11
Nodes (25): 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita, 3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias, Diretrizes Normativas: UI/UX Intelligence, Rigor Tipográfico e Integração Arquitetural Estrita, 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita (+17 more)

### Community 27 - "ErrorBoundary"
Cohesion: 0.06
Nodes (54): EmergencyBackupStatus, ErrorBoundary, ErrorBoundaryState, CustomColumnsManager(), LibraryToolbar(), PrismaFlowDiagram(), getLocalizedPlatformInfo(), PLATFORM_TRANSLATIONS_EN (+46 more)

### Community 28 - "FeedbackView.tsx"
Cohesion: 0.35
Nodes (7): FeedbackView(), FeedbackViewProps, NotFoundView(), NotFoundViewProps, PrismMonogram(), PrismSpectralBar(), UserFeedbackItem

### Community 29 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, bridge, build, desktop, desktop:build, dev, og:render, preview (+4 more)

### Community 36 - "deduplication.ts"
Cohesion: 0.13
Nodes (25): CitationChaseResult, BatchResolveResult, MergeRuleMatched, NormalizedPaper, buildFuzzyIdentityKey(), combineIndexedRecords(), createLibraryMatcher(), findLibraryMatch() (+17 more)

### Community 37 - "AboutView.tsx"
Cohesion: 0.11
Nodes (24): @vercel/analytics, SearchHistoryDrawer, AboutView(), AboutViewProps, formatSearchLogsAsMarkdown(), SearchHistoryDrawer(), SearchHistoryDrawerProps, API_SOURCE_DOCS (+16 more)

### Community 39 - "useI18n"
Cohesion: 0.06
Nodes (87): lucide-react, react, AccessSettingsModal(), AccessSettingsModalProps, BibliometricsPanel(), BibliometricsPanelProps, CitationChaserModal(), CitationChaserModalProps (+79 more)

### Community 40 - "workspaceActions.ts"
Cohesion: 0.17
Nodes (24): createWorkspaceActions(), DEFAULT_GROUP_COLOR, LibraryImportResult, WorkspaceActionDeps, WorkspaceActions, bindFlushToPageLifecycle(), WorkspaceContext, WorkspaceContextValue (+16 more)

### Community 41 - "devDependencies"
Cohesion: 0.13
Nodes (20): description, devDependencies, tailwindcss@^4.0.6, @tauri-apps/cli@^2.12.4, @types/node@^22.10.2, @types/react@^18.3.18, @types/react-dom@^18.3.5, typescript@~5.6.2 (+12 more)

### Community 44 - "BlindScreeningModal.tsx"
Cohesion: 0.20
Nodes (15): importIntoLibrary(), inferRelatedKind(), LibraryImportPlan, linkRelatedPaper(), planLibraryImport(), resolveTargetGroup(), restoreWorkspaceBackup(), togglePresetSelection() (+7 more)

### Community 45 - "academic.ts"
Cohesion: 0.30
Nodes (12): QualityAppraisalSection(), QualityAppraisalSectionProps, QualityAppraisalResult, QualityRating, QualityToolId, computeOverallQuality(), createEmptyQualityAppraisal(), getQualityChecklistDefinition() (+4 more)

### Community 46 - "render-og-image.mjs"
Cohesion: 0.12
Nodes (12): chrome, chromeCandidates, outPath, root, svg, svgPath, workDir, esbuildBin (+4 more)

### Community 49 - "BlindScreeningModal.tsx"
Cohesion: 0.28
Nodes (11): BlindScreeningModal(), BlindScreeningModalProps, ModalMode, ScreeningStatus, BlindReviewItem, BlindReviewPackage, CARTOGRAPH_BLIND_SCHEMA, CohensKappaResult (+3 more)

### Community 50 - "academic.ts"
Cohesion: 0.16
Nodes (18): BYOK_UPSTREAM_PROVIDERS, ApiSourceMetadata, BYOK_FEDERATED_SOURCE_COUNT, OPEN_FEDERATED_SOURCE_COUNT, THEMATIC_AREA_TO_SCOPE, TOTAL_FEDERATED_SOURCE_COUNT, BYOK_PROVIDER_MAP, ByokProviderSpec (+10 more)

### Community 52 - "vite.config.ts"
Cohesion: 0.20
Nodes (8): @tailwindcss/vite@^4.0.6, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite, @vitejs/plugin-react, CATALOG_TOKENS, injectCatalogStats(), replaceCatalogTokens(), TOKENIZED_PUBLIC_FILES

## Knowledge Gaps
- **21 isolated node(s):** `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)`, `Tauri App Icon 128x128@2x (256x256 PNG)`, `Tauri App Icon 128x128 PNG` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 290 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizeDoi()` connect `academicAggregator.ts` to `_security.ts`, `ref_node_assert`, `deduplication.ts`, `workspaceBackup.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `Cartograph Master App Icon (512x512 PNG)` (e.g. with `Tauri App Icon 128x128@2x (256x256 PNG)` and `Tauri App Icon 128x128 PNG`) actually correct?**
  _`Cartograph Master App Icon (512x512 PNG)` has 55 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13012477718360071 - nodes in this community are weakly interconnected._
- **Why does `react` connect `useI18n` to `App.tsx`, `AboutView.tsx`, `dependencies`, `SavedPaperItem`, `devDependencies`, `workspaceActions.ts`, `seo.ts`, `BlindScreeningModal.tsx`, `BooleanBuilderDrawer.tsx`, `ErrorBoundary`, `FeedbackView.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AcademicCommandCenter()` (e.g. with `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` and `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias`) actually correct?**
  _`AcademicCommandCenter()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Tauri Multi-Platform App Icons` be split into smaller, more focused modules?**
  _Cohesion score 0.06623376623376623 - nodes in this community are weakly interconnected._