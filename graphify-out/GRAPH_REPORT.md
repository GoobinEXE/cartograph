# Graph Report - SUPER PESQUISADOR 2000  (2026-11-15)

## Corpus Check
- 102 files · ~106,501 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .xml 3, (none) 2, .command 2)

## Summary
- 823 nodes · 2168 edges · 42 communities (36 shown, 6 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 162 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4dbb5e5e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- analytics.ts
- Tauri Multi-Platform App Icons
- academicAggregator.ts
- Tauri Desktop Window Configuration
- Architecture Docs & HTML Shell
- TypeScript Compiler Configuration
- dependencies
- academic.ts
- Local Node Launcher Bridge
- GitHub Pages Deploy Job
- CI Release Action Inputs
- CI Workflow Build Steps
- BooleanBuilderDrawer.tsx
- Railway Deployment Configuration
- FederatedResultsPanel.tsx
- accessConfig.ts
- PRISM Brand & OG Assets
- Tauri Desktop Release Job
- CI Workflow Branch Triggers
- Vercel Routing & Headers Config
- CI Web Verification Job
- CI Platform Build Matrix
- Tauri Default Capabilities
- _security.ts
- relevanceRanker.ts
- seo.ts
- ErrorBoundary
- devDependencies
- scripts
- Linux Desktop Launcher Script
- Linux Web Bridge Script
- Rust Cargo Crate Manifest
- deduplication.ts
- react
- accessConfig.ts
- context.tsx
- package.json
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `Cartograph Master App Icon (512x512 PNG)` - 55 edges
2. `AcademicCommandCenter()` - 44 edges
3. `cleanDoi()` - 41 edges
4. `useI18n()` - 35 edges
5. `runFederatedSearch()` - 32 edges
6. `SavedLiteratureDrawer()` - 29 edges
7. `SavedPaperItem` - 29 edges
8. `sanitizeExternalUrl()` - 27 edges
9. `react` - 25 edges
10. `NormalizedPaper` - 24 edges

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

## Communities (42 total, 6 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.16
Nodes (25): AcademicCommandCenter(), AccessSettingsModal, BooleanBuilderDrawer, FeedbackView, PlatformSortMode, SavedLiteratureDrawer, SidebarSectionKey, UnifiedAreaFilterDrawer() (+17 more)

### Community 1 - "analytics.ts"
Cohesion: 0.17
Nodes (13): PrismaFlowDiagram(), ANALYTICS_CONSENT_STORAGE_KEY, AnalyticsConsentState, AnalyticsEventName, AnalyticsEventParams, denyAnalyticsConsent(), getAnalyticsConsent(), grantAnalyticsConsent() (+5 more)

### Community 2 - "Tauri Multi-Platform App Icons"
Cohesion: 0.07
Nodes (56): Tauri App Icon 128x128@2x (256x256 PNG), Tauri App Icon 128x128 PNG, Tauri App Icon 32x32 PNG, Tauri App Icon 64x64 PNG, Android Adaptive Foreground Icon Variant (ic_launcher_foreground), Android Round Launcher Icon Variant (ic_launcher_round), Android Launcher Icon Variant (ic_launcher), Android HDPI Density Bucket (mipmap-hdpi) (+48 more)

### Community 3 - "academicAggregator.ts"
Cohesion: 0.09
Nodes (69): BYOK_ONLY_SOURCES, diagnoseSourceError(), federatedSearchCache, FederatedSearchProgress, FederatedSearchResult, PROXY_SOURCES, reconstructOpenAlexAbstract(), runFederatedSearch() (+61 more)

### Community 4 - "Tauri Desktop Window Configuration"
Cohesion: 0.10
Nodes (19): debugApplicationIdSuffix, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 5 - "Architecture Docs & HTML Shell"
Cohesion: 0.13
Nodes (16): Boolean Query Builder & PT-EN Technical Dictionary, Cartograph (Scientific Metasearch Hub), Federated Academic Aggregator (15 Open APIs), Reactive Multilingual i18n Layer (PT, EN, ES, FR), Node Local Bridge (launcher-bridge.mjs), Curated Academic Platform Catalog (111 Platforms & 20 Presets), Serverless CORS & Remote API Proxies (api/), Tauri v2 Standalone Desktop Architecture (+8 more)

### Community 6 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 7 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, @tauri-apps/api@^2.12.4, @tauri-apps/plugin-http@^2.9.0, @tauri-apps/plugin-shell@^2.6.0, @vercel/analytics@^2.0.1 (+6 more)

### Community 8 - "academic.ts"
Cohesion: 0.05
Nodes (91): BibliometricsPanel(), BibliometricsPanelProps, BlindScreeningModal(), BlindScreeningModalProps, ModalMode, FederatedResultsPanelProps, MergeInspectorModalProps, PrismaFlowDiagramProps (+83 more)

### Community 9 - "Local Node Launcher Bridge"
Cohesion: 0.12
Nodes (16): esbuildBin, outDir, projectRoot, testFiles, testsDir, ALLOWED_PROD_ORIGINS, args, BRIDGE_PORT (+8 more)

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
Cohesion: 0.09
Nodes (27): 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita, 3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias, Diretrizes Normativas: UI/UX Intelligence, Rigor Tipográfico e Integração Arquitetural Estrita, 1. Ativação Mandatória de Skills de Design, 2.1 Famílias Tipográficas Canônicas do Projeto, 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita (+19 more)

### Community 14 - "Railway Deployment Configuration"
Cohesion: 0.22
Nodes (8): build, buildCommand, builder, deploy, restartPolicyMaxRetries, restartPolicyType, startCommand, $schema

### Community 15 - "FederatedResultsPanel.tsx"
Cohesion: 0.38
Nodes (10): lucide-react, CitationChaserModal(), FederatedResultsPanel(), FederatedSidebarSectionKey, MergeInspectorModal(), UserWorkspaceSection(), WebLaunchDrawer(), WebLaunchDrawerProps (+2 more)

### Community 16 - "accessConfig.ts"
Cohesion: 0.16
Nodes (20): API_SOURCE_AUTHORITY_WEIGHTS, API_SOURCE_REGISTRY, ApiSourceMetadata, countSourcesForScope(), sourceMatchesScope(), THEMATIC_AREA_TO_SCOPE, BYOK_PROVIDER_MAP, BYOK_PROVIDERS (+12 more)

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
Cohesion: 0.15
Nodes (35): buildFreeUpstreamUrl(), FreeProxyProvider, handler(), VALID_PROVIDERS, handler(), buildByokUpstreamSpec(), ByokUpstreamId, handler() (+27 more)

### Community 25 - "relevanceRanker.ts"
Cohesion: 0.10
Nodes (34): ExtractedPaperMetadata, RankedPaperResult, RelevanceBreakdown, detectStudyDesign(), extractSampleSize(), parseAbstractMetadata(), SAMPLE_SIZE_REGEXES, SECTION_PATTERNS (+26 more)

### Community 26 - "seo.ts"
Cohesion: 0.15
Nodes (15): AboutSectionId, LanguageCode, ABOUT_SECTIONS_BY_PATH, AppTab, buildCanonicalPath(), CANONICAL_ORIGIN, CANONICAL_PATH_BY_ABOUT_SECTION, HTML_LANG_MAP (+7 more)

### Community 27 - "ErrorBoundary"
Cohesion: 0.09
Nodes (17): ErrorBoundary, ErrorBoundaryState, detectBrowserLanguage(), detectSystemLanguage(), hasManualLanguageOverride(), I18nProvider(), isSupportedLanguage(), resolveLanguageFromTags() (+9 more)

### Community 28 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, tailwindcss@^4.0.6, @tauri-apps/cli@^2.12.4, @types/node@^22.10.2, @types/react@^18.3.18, @types/react-dom@^18.3.5, typescript@~5.6.2, tailwindcss (+5 more)

### Community 29 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, bridge, build, desktop, desktop:build, dev, preview, start (+3 more)

### Community 36 - "deduplication.ts"
Cohesion: 0.11
Nodes (36): deduplicatePapers(), chasePaperCitations(), CitationChaseDirection, CitationChaseResult, normalizeOpenAlexWork(), normalizeS2EdgePaper(), reconstructAbstract(), resolveOpenAlexWorkSeed() (+28 more)

### Community 37 - "react"
Cohesion: 0.20
Nodes (14): react, AboutView, AboutView(), AboutViewProps, FEDERATED_APIS_LIST, FederatedApiDoc, FeedbackView(), FeedbackViewProps (+6 more)

### Community 38 - "accessConfig.ts"
Cohesion: 0.21
Nodes (13): AccessSettingsModal(), AccessSettingsModalProps, CitationChaserModalProps, USER_WORKSPACE_SECTION_TAG, UserWorkspaceSectionProps, AccessModel, AccessSettingsTab, InstitutionalProxyConfig (+5 more)

### Community 39 - "context.tsx"
Cohesion: 0.20
Nodes (7): @vercel/analytics, SearchHistoryDrawer, formatSearchLogsAsMarkdown(), SearchHistoryDrawer(), AVAILABLE_LANGUAGES, I18nContext, STORAGE_KEY_LANGUAGE

### Community 40 - "package.json"
Cohesion: 0.25
Nodes (7): @tauri-apps/plugin-opener@^2.7.3, description, name, private, type, version, @tauri-apps/plugin-opener

### Community 41 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.0.6, vite@^6.0.5, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite, vite, @vitejs/plugin-react

## Knowledge Gaps
- **21 isolated node(s):** `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)`, `Tauri App Icon 128x128@2x (256x256 PNG)`, `Tauri App Icon 128x128 PNG` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 239 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.tsx`, `analytics.ts`, `accessConfig.ts`, `dependencies`, `package.json`, `academic.ts`, `context.tsx`, `BooleanBuilderDrawer.tsx`, `FederatedResultsPanel.tsx`, `seo.ts`, `ErrorBoundary`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `Cartograph Master App Icon (512x512 PNG)` (e.g. with `Tauri App Icon 128x128@2x (256x256 PNG)` and `Tauri App Icon 128x128 PNG`) actually correct?**
  _`Cartograph Master App Icon (512x512 PNG)` has 55 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tauri Multi-Platform App Icons` be split into smaller, more focused modules?**
  _Cohesion score 0.06623376623376623 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `FederatedResultsPanel.tsx` to `App.tsx`, `analytics.ts`, `react`, `accessConfig.ts`, `dependencies`, `package.json`, `academic.ts`, `context.tsx`, `BooleanBuilderDrawer.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AcademicCommandCenter()` (e.g. with `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias` and `3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias`) actually correct?**
  _`AcademicCommandCenter()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `academicAggregator.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08684684684684685 - nodes in this community are weakly interconnected._