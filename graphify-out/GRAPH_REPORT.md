# Graph Report - SUPER PESQUISADOR 2000  (2026-11-11)

## Corpus Check
- 26 files · ~17,800 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 2, .command 2, .bat 2)

## Summary
- 192 nodes · 333 edges · 16 communities (10 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Package Metadata & Toolchain
- Academic Command Center & Boolean Builder
- Literature Matrix & Citation Exporters
- TypeScript Compiler Configuration
- Cross-Platform OS Launcher Bridge
- Federated Scientific API Aggregator
- context.tsx
- NPM Execution Scripts
- POSIX Launcher Script
- tauri.conf.json
- default.json
- iniciar-desktop-linux.sh
- app

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `runFederatedSearch()` - 15 edges
3. `AcademicCommandCenter()` - 13 edges
4. `cleanDoi()` - 11 edges
5. `scripts` - 10 edges
6. `SavedLiteratureDrawer()` - 9 edges
7. `useI18n()` - 9 edges
8. `react` - 8 edges
9. `FederatedResultsPanel()` - 7 edges
10. `NormalizedPaper` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Especificação do Agregador Federado de 5 APIs Científicas` --references--> `runFederatedSearch()`  [EXTRACTED]
  AGENTS.md → src/services/academicAggregator.ts
- `Protocolo Query-First Graphify (Otimização de Tokens)` --references--> `AcademicCommandCenter()`  [EXTRACTED]
  AGENTS.md → src/App.tsx
- `Arquitetura Híbrida Multiplataforma (Windows, Linux, macOS)` --references--> `launchUrlsCrossPlatform()`  [EXTRACTED]
  AGENTS.md → src/services/academicAggregator.ts
- `Arquitetura Híbrida Multiplataforma (Windows, Linux, macOS)` --rationale_for--> `openUrlNative()`  [EXTRACTED]
  AGENTS.md → server/launcher-bridge.mjs
- `Especificação do Agregador Federado de 5 APIs Científicas` --references--> `PLATFORMS`  [EXTRACTED]
  AGENTS.md → src/data/platforms.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de Metabusca Científica Paralela (5 APIs Abertas)** — src_services_academicaggregator_runfederatedsearch, src_services_academicaggregator_searchopenalex, src_services_academicaggregator_searchsemanticscholar, src_services_academicaggregator_searcheuropepmc, src_services_academicaggregator_searcharxiv, src_services_academicaggregator_searchcrossref, src_services_academicaggregator_deduplicatepapers [EXTRACTED 1.00]

## Communities (16 total, 6 thin omitted)

### Community 0 - "Package Metadata & Toolchain"
Cohesion: 0.07
Nodes (37): dependencies, lucide-react@^0.469.0, react-dom@^18.3.1, @tauri-apps/api@^2.12.4, @tauri-apps/plugin-http@^2.9.0, @tauri-apps/plugin-opener@^2.7.3, @tauri-apps/plugin-shell@^2.6.0, description (+29 more)

### Community 1 - "Academic Command Center & Boolean Builder"
Cohesion: 0.15
Nodes (18): Especificação do Agregador Federado de 5 APIs Científicas, AcademicCommandCenter(), BooleanBuilderDrawer(), BooleanBuilderDrawerProps, ACCESS_BADGES, CATEGORY_META, getLocalizedAccessBadges(), getLocalizedCategoryMeta() (+10 more)

### Community 2 - "Literature Matrix & Citation Exporters"
Cohesion: 0.24
Nodes (18): FederatedResultsPanel(), FederatedResultsPanelProps, SavedLiteratureDrawer(), SavedLiteratureDrawerProps, useI18n(), AccessModel, ApiSourceId, NormalizedPaper (+10 more)

### Community 3 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 4 - "Cross-Platform OS Launcher Bridge"
Cohesion: 0.31
Nodes (14): cleanDoi(), deduplicatePapers(), reconstructOpenAlexAbstract(), runFederatedSearch(), searchArxiv(), searchCrossref(), searchDataCite(), searchDoaj() (+6 more)

### Community 5 - "Federated Scientific API Aggregator"
Cohesion: 0.24
Nodes (6): args, BRIDGE_PORT, openUrlNative(), sendJson(), server, launchUrlsCrossPlatform()

### Community 6 - "context.tsx"
Cohesion: 0.21
Nodes (11): HTML Entrypoint (#root / Nexus Acadêmico 2000), react@^18.3.1, react, AVAILABLE_LANGUAGES, detectBrowserLanguage(), I18nContext, I18nContextType, I18nProvider() (+3 more)

### Community 7 - "NPM Execution Scripts"
Cohesion: 0.20
Nodes (10): scripts, bridge, build, desktop, desktop:build, dev, preview, start (+2 more)

### Community 9 - "tauri.conf.json"
Cohesion: 0.10
Nodes (19): debugApplicationIdSuffix, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 10 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

## Knowledge Gaps
- **2 isolated node(s):** `app`, `HTML Entrypoint (#root / Nexus Acadêmico 2000)`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 77 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `context.tsx` to `Package Metadata & Toolchain`, `Academic Command Center & Boolean Builder`, `Literature Matrix & Citation Exporters`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `runFederatedSearch()` (e.g. with `searchArxiv()` and `searchCrossref()`) actually correct?**
  _`runFederatedSearch()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `app`, `HTML Entrypoint (#root / Nexus Acadêmico 2000)` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Metadata & Toolchain` be split into smaller, more focused modules?**
  _Cohesion score 0.07422402159244265 - nodes in this community are weakly interconnected._
- **Why does `launchUrlsCrossPlatform()` connect `Federated Scientific API Aggregator` to `Package Metadata & Toolchain`, `Academic Command Center & Boolean Builder`, `Cross-Platform OS Launcher Bridge`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `Academic Command Center & Boolean Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Package Metadata & Toolchain` to `Academic Command Center & Boolean Builder`, `Literature Matrix & Citation Exporters`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._