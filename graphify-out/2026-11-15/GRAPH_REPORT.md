# Graph Report - SUPER PESQUISADOR 2000  (2026-11-15)

## Corpus Check
- 105 files · ~51,055 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .xml 3, (none) 2, .command 2)

## Summary
- 466 nodes · 826 edges · 36 communities (24 shown, 12 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Main App & Navigation UI
- Federated Results & PRISMA Views
- Tauri Multi-Platform App Icons
- Federated Academic Search Aggregator
- Tauri Desktop Window Configuration
- Architecture Docs & HTML Shell
- TypeScript Compiler Configuration
- Runtime & Tauri Dependencies
- Build & Type DevDependencies
- Local Node Launcher Bridge
- GitHub Pages Deploy Job
- CI Release Action Inputs
- CI Workflow Build Steps
- NPM Workspace Scripts
- Railway Deployment Configuration
- Package Manifest Metadata
- Vite & Tailwind Build Config
- PRISM Brand & OG Assets
- Tauri Desktop Release Job
- CI Workflow Branch Triggers
- Vercel Routing & Headers Config
- CI Web Verification Job
- CI Platform Build Matrix
- Tauri Default Capabilities
- Serverless Feedback Endpoint
- Linux Desktop Launcher Script
- Linux Web Bridge Script
- Rust Cargo Crate Manifest

## God Nodes (most connected - your core abstractions)
1. `Cartograph Master App Icon (512x512 PNG)` - 55 edges
2. `AcademicCommandCenter()` - 26 edges
3. `runFederatedSearch()` - 21 edges
4. `AppIcon-512@2x.png (Tauri iOS App Store Icon 512@2x)` - 18 edges
5. `cleanDoi()` - 16 edges
6. `compilerOptions` - 16 edges
7. `react` - 14 edges
8. `useI18n()` - 13 edges
9. `with` - 12 edges
10. `SavedLiteratureDrawer()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Robots Crawler & Sitemap Policy (robots.txt)` --conceptually_related_to--> `Serverless CORS & Remote API Proxies (api/)`  [INFERRED]
  public/robots.txt → AGENTS.md
- `HTTP 404 Static Fallback Page` --conceptually_related_to--> `Cartograph Web SPA Entry Shell (index.html)`  [INFERRED]
  public/404.html → index.html
- `Robots Crawler & Sitemap Policy (robots.txt)` --conceptually_related_to--> `Cartograph Web SPA Entry Shell (index.html)`  [INFERRED]
  public/robots.txt → index.html
- `Tauri App Icon 128x128@2x (256x256 PNG)` --semantically_similar_to--> `Cartograph Master App Icon (512x512 PNG)`  [INFERRED] [semantically similar]
  src-tauri/icons/128x128@2x.png → src-tauri/icons/icon.png
- `Tauri App Icon 128x128 PNG` --semantically_similar_to--> `Cartograph Master App Icon (512x512 PNG)`  [INFERRED] [semantically similar]
  src-tauri/icons/128x128.png → src-tauri/icons/icon.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cartograph Hybrid Runtime & OS Integration Layer** — agents_cartograph, agents_node_local_bridge, agents_tauri_desktop_architecture, agents_serverless_proxies [EXTRACTED 1.00]
- **Cartograph Deterministic Metasearch & PRISMA Pipeline** — agents_boolean_query_engine, agents_federated_aggregator, agents_platform_catalog, agents_deterministic_pro_pipeline [EXTRACTED 1.00]
- **Cartograph Public Web Entry, SEO & Fallback Surface** — index_spa_entry, index_schema_org_graph, public_404_error_page, public_robots_crawler_policy [INFERRED 0.85]

## Communities (36 total, 12 thin omitted)

### Community 0 - "Main App & Navigation UI"
Cohesion: 0.06
Nodes (59): lucide-react, react, AboutView, AcademicCommandCenter(), BooleanBuilderDrawer, FeedbackView, renderAreaIcon(), SavedLiteratureDrawer (+51 more)

### Community 1 - "Federated Results & PRISMA Views"
Cohesion: 0.08
Nodes (52): FederatedResultsPanel(), FederatedResultsPanelProps, FederatedSidebarSectionKey, PrismaFlowDiagram(), PrismaFlowDiagramProps, GROUP_COLORS, LibrarySlotView, SavedLiteratureDrawer() (+44 more)

### Community 2 - "Tauri Multi-Platform App Icons"
Cohesion: 0.07
Nodes (56): Tauri App Icon 128x128@2x (256x256 PNG), Tauri App Icon 128x128 PNG, Tauri App Icon 32x32 PNG, Tauri App Icon 64x64 PNG, Android Adaptive Foreground Icon Variant (ic_launcher_foreground), Android Round Launcher Icon Variant (ic_launcher_round), Android Launcher Icon Variant (ic_launcher), Android HDPI Density Bucket (mipmap-hdpi) (+48 more)

### Community 3 - "Federated Academic Search Aggregator"
Cohesion: 0.11
Nodes (37): cleanDoi(), crossPlatformFetch(), deduplicatePapers(), diagnoseSourceError(), federatedSearchCache, isTauriRuntime(), PROXY_SOURCES, reconstructOpenAlexAbstract() (+29 more)

### Community 4 - "Tauri Desktop Window Configuration"
Cohesion: 0.10
Nodes (19): debugApplicationIdSuffix, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 5 - "Architecture Docs & HTML Shell"
Cohesion: 0.13
Nodes (16): Boolean Query Builder & PT-EN Technical Dictionary, Cartograph (Scientific Metasearch Hub), Federated Academic Aggregator (15 Open APIs), Reactive Multilingual i18n Layer (PT, EN, ES, FR), Node Local Bridge (launcher-bridge.mjs), Curated Academic Platform Catalog (111 Platforms & 20 Presets), Serverless CORS & Remote API Proxies (api/), Tauri v2 Standalone Desktop Architecture (+8 more)

### Community 6 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 7 - "Runtime & Tauri Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, @tauri-apps/plugin-http@^2.9.0, @tauri-apps/plugin-opener@^2.7.3, @tauri-apps/plugin-shell@^2.6.0, @vercel/analytics@^2.0.1 (+7 more)

### Community 8 - "Build & Type DevDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, tailwindcss@^4.0.6, @tauri-apps/cli@^2.12.4, @types/node@^22.10.2, @types/react@^18.3.18, @types/react-dom@^18.3.5, typescript@~5.6.2, tailwindcss (+5 more)

### Community 9 - "Local Node Launcher Bridge"
Cohesion: 0.20
Nodes (6): args, BRIDGE_PORT, MIME_TYPES, openUrlNative(), sendJson(), server

### Community 10 - "GitHub Pages Deploy Job"
Cohesion: 0.18
Nodes (11): environment, if, name, needs, permissions, runs-on, name, url (+3 more)

### Community 11 - "CI Release Action Inputs"
Cohesion: 0.18
Nodes (11): with, args, cache, node-version, path, prerelease, releaseBody, releaseDraft (+3 more)

### Community 12 - "CI Workflow Build Steps"
Cohesion: 0.29
Nodes (10): steps, steps, GITHUB_TOKEN, env, id, if, name, run (+2 more)

### Community 13 - "NPM Workspace Scripts"
Cohesion: 0.20
Nodes (10): scripts, bridge, build, desktop, desktop:build, dev, preview, start (+2 more)

### Community 14 - "Railway Deployment Configuration"
Cohesion: 0.22
Nodes (8): build, buildCommand, builder, deploy, restartPolicyMaxRetries, restartPolicyType, startCommand, $schema

### Community 15 - "Package Manifest Metadata"
Cohesion: 0.25
Nodes (7): @tauri-apps/api@^2.12.4, description, name, private, type, version, @tauri-apps/api

### Community 16 - "Vite & Tailwind Build Config"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.0.6, vite@^6.0.5, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite, vite, @vitejs/plugin-react

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

## Knowledge Gaps
- **21 isolated node(s):** `cartograph`, `Curated Academic Platform Catalog (111 Platforms & 20 Presets)`, `Reactive Multilingual i18n Layer (PT, EN, ES, FR)`, `Prism (Prism Labs)`, `HTTP 404 Static Fallback Page` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Main App & Navigation UI` to `Federated Results & PRISMA Views`, `Runtime & Tauri Dependencies`, `Package Manifest Metadata`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `Cartograph Master App Icon (512x512 PNG)` (e.g. with `Tauri App Icon 128x128@2x (256x256 PNG)` and `Tauri App Icon 128x128 PNG`) actually correct?**
  _`Cartograph Master App Icon (512x512 PNG)` has 55 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cartograph`, `Curated Academic Platform Catalog (111 Platforms & 20 Presets)`, `Reactive Multilingual i18n Layer (PT, EN, ES, FR)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Main App & Navigation UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06430745814307458 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Main App & Navigation UI` to `Federated Results & PRISMA Views`, `Runtime & Tauri Dependencies`, `Package Manifest Metadata`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `runFederatedSearch()` (e.g. with `searchArxiv()` and `searchCrossref()`) actually correct?**
  _`runFederatedSearch()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Should `Federated Results & PRISMA Views` be split into smaller, more focused modules?**
  _Cohesion score 0.07759562841530054 - nodes in this community are weakly interconnected._