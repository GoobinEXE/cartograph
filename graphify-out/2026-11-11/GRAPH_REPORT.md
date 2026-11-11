# Graph Report - SUPER PESQUISADOR 2000  (2026-11-11)

## Corpus Check
- Corpus is ~13,360 words - fits in a single context window. You may not need a graph.

## Summary
- 129 nodes · 246 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Module Cluster 0
- Module Cluster 1
- Module Cluster 2
- Module Cluster 3
- Module Cluster 4
- Module Cluster 5
- Module Cluster 6
- Module Cluster 7
- Module Cluster 8

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `runFederatedSearch()` - 15 edges
3. `cleanDoi()` - 11 edges
4. `AcademicCommandCenter()` - 9 edges
5. `SavedLiteratureDrawer()` - 8 edges
6. `scripts` - 7 edges
7. `react` - 7 edges
8. `NormalizedPaper` - 7 edges
9. `formatAbntCitation()` - 7 edges
10. `lucide-react` - 6 edges

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

## Communities (9 total, 1 thin omitted)

### Community 0 - "Module Cluster 0"
Cohesion: 0.12
Nodes (22): description, devDependencies, tailwindcss@^4.0.6, @tailwindcss/vite@^4.0.6, @types/node@^22.10.2, @types/react@^18.3.18, @types/react-dom@^18.3.5, typescript@~5.6.2 (+14 more)

### Community 1 - "Module Cluster 1"
Cohesion: 0.17
Nodes (16): Especificação do Agregador Federado de 5 APIs Científicas, AcademicCommandCenter(), BooleanBuilderDrawer(), BooleanBuilderDrawerProps, ACCESS_BADGES, CATEGORY_META, LAUNCH_PRESETS, PLATFORMS (+8 more)

### Community 2 - "Module Cluster 2"
Cohesion: 0.26
Nodes (16): FederatedResultsPanel(), FederatedResultsPanelProps, SavedLiteratureDrawer(), SavedLiteratureDrawerProps, ApiSourceId, NormalizedPaper, SavedPaperItem, SourceFetchStatus (+8 more)

### Community 3 - "Module Cluster 3"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 4 - "Module Cluster 4"
Cohesion: 0.34
Nodes (14): cleanDoi(), deduplicatePapers(), reconstructOpenAlexAbstract(), runFederatedSearch(), searchArxiv(), searchCrossref(), searchDataCite(), searchDoaj() (+6 more)

### Community 5 - "Module Cluster 5"
Cohesion: 0.24
Nodes (6): args, BRIDGE_PORT, openUrlNative(), sendJson(), server, launchUrlsCrossPlatform()

### Community 6 - "Module Cluster 6"
Cohesion: 0.22
Nodes (8): HTML Entrypoint (#root / Nexus Acadêmico 2000), dependencies, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, lucide-react, react, react-dom

### Community 7 - "Module Cluster 7"
Cohesion: 0.29
Nodes (7): scripts, bridge, build, dev, preview, start, vite

## Knowledge Gaps
- **1 isolated node(s):** `HTML Entrypoint (#root / Nexus Acadêmico 2000)`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 40 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Module Cluster 6` to `Module Cluster 0`, `Module Cluster 1`, `Module Cluster 2`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `runFederatedSearch()` (e.g. with `searchArxiv()` and `searchCrossref()`) actually correct?**
  _`runFederatedSearch()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HTML Entrypoint (#root / Nexus Acadêmico 2000)` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Module Cluster 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Module Cluster 6` to `Module Cluster 0`, `Module Cluster 1`, `Module Cluster 2`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Should `Module Cluster 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `launchUrlsCrossPlatform()` connect `Module Cluster 5` to `Module Cluster 1`, `Module Cluster 4`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._