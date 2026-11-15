# Graph Report - SUPER PESQUISADOR 2000  (2026-11-15)

## Corpus Check
- 77 files · ~80,672 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .xml 3, (none) 2, .command 2)

## Summary
- 677 nodes · 1614 edges · 34 communities (28 shown, 6 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 148 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73001cdb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AccessSettingsModal.tsx
- Federated Results & PRISMA Views
- Tauri Multi-Platform App Icons
- academicAggregator.ts
- Tauri Desktop Window Configuration
- Architecture Docs & HTML Shell
- TypeScript Compiler Configuration
- package.json
- useI18n
- Local Node Launcher Bridge
- GitHub Pages Deploy Job
- CI Release Action Inputs
- CI Workflow Build Steps
- seo.ts
- Railway Deployment Configuration
- BooleanBuilderDrawer.tsx
- PRISM Brand & OG Assets
- Tauri Desktop Release Job
- CI Workflow Branch Triggers
- Vercel Routing & Headers Config
- CI Web Verification Job
- CI Platform Build Matrix
- Tauri Default Capabilities
- _security.ts
- relevanceRanker.ts
- App.tsx
- context.tsx
- Linux Desktop Launcher Script
- Linux Web Bridge Script
- Rust Cargo Crate Manifest
- deduplication.ts

## God Nodes (most connected - your core abstractions)
1. `Cartograph Master App Icon (512x512 PNG)` - 55 edges
2. `AcademicCommandCenter()` - 36 edges
3. `runFederatedSearch()` - 32 edges
4. `cleanDoi()` - 30 edges
5. `useI18n()` - 21 edges
6. `crossPlatformFetch()` - 21 edges
7. `sanitizeExternalUrl()` - 21 edges
8. `applyCorsHeaders()` - 20 edges
9. `enforceRateLimit()` - 18 edges
10. `AppIcon-512@2x.png (Tauri iOS App Store Icon 512@2x)` - 18 edges

## Surprising Connections (you probably didn't know these)
- `HTTP 404 Static Fallback Page` --conceptually_related_to--> `Cartograph Web SPA Entry Shell (index.html)`  [INFERRED]
  public/404.html → index.html
- `Robots Crawler & Sitemap Policy (robots.txt)` --conceptually_related_to--> `Cartograph Web SPA Entry Shell (index.html)`  [INFERRED]
  public/robots.txt → index.html
- `Tauri App Icon 128x128@2x (256x256 PNG)` --semantically_similar_to--> `Cartograph Master App Icon (512x512 PNG)`  [INFERRED] [semantically similar]
  src-tauri/icons/128x128@2x.png → src-tauri/icons/icon.png
- `Tauri App Icon 128x128 PNG` --semantically_similar_to--> `Cartograph Master App Icon (512x512 PNG)`  [INFERRED] [semantically similar]
  src-tauri/icons/128x128.png → src-tauri/icons/icon.png
- `Tauri App Icon 32x32 PNG` --semantically_similar_to--> `Cartograph Master App Icon (512x512 PNG)`  [INFERRED] [semantically similar]
  src-tauri/icons/32x32.png → src-tauri/icons/icon.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cartograph Hybrid Runtime & OS Integration Layer** — agents_cartograph, agents_node_local_bridge, agents_tauri_desktop_architecture, agents_serverless_proxies [EXTRACTED 1.00]
- **Cartograph Deterministic Metasearch & PRISMA Pipeline** — agents_boolean_query_engine, agents_federated_aggregator, agents_platform_catalog, agents_deterministic_pro_pipeline [EXTRACTED 1.00]
- **Cartograph Public Web Entry, SEO & Fallback Surface** — index_spa_entry, index_schema_org_graph, public_404_error_page, public_robots_crawler_policy [INFERRED 0.85]

## Communities (34 total, 6 thin omitted)

### Community 0 - "AccessSettingsModal.tsx"
Cohesion: 0.14
Nodes (24): AccessSettingsModal(), AccessSettingsModalProps, ModalTab, API_SOURCE_AUTHORITY_WEIGHTS, API_SOURCE_REGISTRY, ApiSourceMetadata, BYOK_PROVIDER_MAP, BYOK_PROVIDERS (+16 more)

### Community 1 - "Federated Results & PRISMA Views"
Cohesion: 0.07
Nodes (65): FederatedResultsPanel(), FederatedResultsPanelProps, FederatedSidebarSectionKey, PrismaFlowDiagram(), PrismaFlowDiagramProps, GROUP_COLORS, LibrarySlotView, SavedLiteratureDrawer() (+57 more)

### Community 2 - "Tauri Multi-Platform App Icons"
Cohesion: 0.07
Nodes (56): Tauri App Icon 128x128@2x (256x256 PNG), Tauri App Icon 128x128 PNG, Tauri App Icon 32x32 PNG, Tauri App Icon 64x64 PNG, Android Adaptive Foreground Icon Variant (ic_launcher_foreground), Android Round Launcher Icon Variant (ic_launcher_round), Android Launcher Icon Variant (ic_launcher), Android HDPI Density Bucket (mipmap-hdpi) (+48 more)

### Community 3 - "academicAggregator.ts"
Cohesion: 0.09
Nodes (68): sourceMatchesScope(), BYOK_ONLY_SOURCES, diagnoseSourceError(), federatedSearchCache, FederatedSearchProgress, PROXY_SOURCES, reconstructOpenAlexAbstract(), runFederatedSearch() (+60 more)

### Community 4 - "Tauri Desktop Window Configuration"
Cohesion: 0.10
Nodes (19): debugApplicationIdSuffix, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 5 - "Architecture Docs & HTML Shell"
Cohesion: 0.13
Nodes (16): Boolean Query Builder & PT-EN Technical Dictionary, Cartograph (Scientific Metasearch Hub), Federated Academic Aggregator (15 Open APIs), Reactive Multilingual i18n Layer (PT, EN, ES, FR), Node Local Bridge (launcher-bridge.mjs), Curated Academic Platform Catalog (111 Platforms & 20 Presets), Serverless CORS & Remote API Proxies (api/), Tauri v2 Standalone Desktop Architecture (+8 more)

### Community 6 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 7 - "package.json"
Cohesion: 0.05
Nodes (50): dependencies, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, @tauri-apps/api@^2.12.4, @tauri-apps/plugin-http@^2.9.0, @tauri-apps/plugin-opener@^2.7.3, @tauri-apps/plugin-shell@^2.6.0 (+42 more)

### Community 8 - "useI18n"
Cohesion: 0.21
Nodes (15): lucide-react, AboutView(), AboutViewProps, FEDERATED_APIS_LIST, FederatedApiDoc, FeedbackView(), FeedbackViewProps, NOT_FOUND_COPY (+7 more)

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

### Community 13 - "seo.ts"
Cohesion: 0.16
Nodes (14): AboutSectionId, LanguageCode, ABOUT_SECTIONS_BY_PATH, AppTab, buildCanonicalPath(), CANONICAL_ORIGIN, CANONICAL_PATH_BY_ABOUT_SECTION, HTML_LANG_MAP (+6 more)

### Community 14 - "Railway Deployment Configuration"
Cohesion: 0.22
Nodes (8): build, buildCommand, builder, deploy, restartPolicyMaxRetries, restartPolicyType, startCommand, $schema

### Community 15 - "BooleanBuilderDrawer.tsx"
Cohesion: 0.31
Nodes (7): BooleanBuilderDrawer(), BooleanBuilderDrawerProps, BooleanQueryState, ACADEMIC_PT_EN_GLOSSARY, compileBooleanQuery(), extractGlossaryEnglishEquivalents(), translateAcademicQueryPtToEn()

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
Cohesion: 0.16
Nodes (34): buildFreeUpstreamUrl(), FreeProxyProvider, handler(), VALID_PROVIDERS, handler(), buildByokUpstreamSpec(), ByokUpstreamId, handler() (+26 more)

### Community 25 - "relevanceRanker.ts"
Cohesion: 0.19
Nodes (20): RankedPaperResult, buildFrequencyMaps(), clamp(), computeConsensusMetrics(), computeImpactRecencyMetrics(), computeLexicalMetrics(), computePaperRelevance(), computeQualityAccessScore() (+12 more)

### Community 26 - "App.tsx"
Cohesion: 0.12
Nodes (29): AboutView, AcademicCommandCenter(), AccessSettingsModal, BooleanBuilderDrawer, FeedbackView, renderAreaIcon(), SavedLiteratureDrawer, SidebarSectionKey (+21 more)

### Community 27 - "context.tsx"
Cohesion: 0.12
Nodes (17): @vercel/analytics@^2.0.1, react, @vercel/analytics, ErrorBoundary, ErrorBoundaryState, WebLaunchDrawerProps, WebLaunchTarget, AVAILABLE_LANGUAGES (+9 more)

### Community 36 - "deduplication.ts"
Cohesion: 0.19
Nodes (18): deduplicatePapers(), cleanBibValue(), makeImportedId(), parseBibFields(), parseBibtexEntries(), parseImportedReferences(), parseRisEntries(), deduplicatePapersAdvanced() (+10 more)

## Knowledge Gaps
- **21 isolated node(s):** `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)`, `Tauri App Icon 128x128@2x (256x256 PNG)`, `Tauri App Icon 128x128 PNG` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `context.tsx` to `AccessSettingsModal.tsx`, `Federated Results & PRISMA Views`, `package.json`, `useI18n`, `seo.ts`, `BooleanBuilderDrawer.tsx`, `App.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `Cartograph Master App Icon (512x512 PNG)` (e.g. with `Tauri App Icon 128x128@2x (256x256 PNG)` and `Tauri App Icon 128x128 PNG`) actually correct?**
  _`Cartograph Master App Icon (512x512 PNG)` has 55 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cartograph`, `Cartograph Favicon (Squircle 512x512)`, `Cartograph OpenGraph Social Banner (PNG)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessSettingsModal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `useI18n` to `AccessSettingsModal.tsx`, `Federated Results & PRISMA Views`, `package.json`, `BooleanBuilderDrawer.tsx`, `App.tsx`, `context.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `runFederatedSearch()` (e.g. with `searchArxiv()` and `searchCrossref()`) actually correct?**
  _`runFederatedSearch()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `Federated Results & PRISMA Views` be split into smaller, more focused modules?**
  _Cohesion score 0.06945863125638406 - nodes in this community are weakly interconnected._