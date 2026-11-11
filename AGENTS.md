# AGENTS.md — Cartograph (Scientific Metasearch Hub)

Especificação arquitetural, diretrizes operacionais para agentes de IA e protocolo de navegação em grafo de conhecimento (`graphify`) para o **Cartograph (Hub de Metabusca Científica e Revisão de Literatura)**.

---

## 1. Protocolo de Otimização de Tokens via Graphify (`graphify-out/`)

Este repositório mantém um grafo de conhecimento persistente em `graphify-out/` (`graph.json`, `GRAPH_REPORT.md` e `graph.html`). Qualquer agente que opere neste repositório deve priorizar consultas estruturadas ao grafo antes de realizar leituras extensas de arquivos brutos.

### 1.1 Regras de Consulta (Query-First)
1. **Inspeção Inicial de Baixo Custo:** Quando `graphify-out/graph.json` existir, responda perguntas sobre arquitetura, fluxo de dados, dependências entre módulos ou localização de símbolos executando:
   ```bash
   $(cat graphify-out/.graphify_python) -m graphify.cli query "<pergunta ou termo técnico>" --budget 1500
   ```
2. **Rastreamento de Caminhos e Explicação de Nós:**
   - Para identificar o caminho mais curto entre dois componentes (ex.: `AcademicCommandCenter` e `searchOpenAlex`):
     ```bash
     $(cat graphify-out/.graphify_python) -m graphify.cli path "<Origem>" "<Destino>"
     ```
   - Para inspecionar vizinhança, grau de conexões e localização exata de um nó (`source_location`):
     ```bash
     $(cat graphify-out/.graphify_python) -m graphify.cli explain "<NomeDoNo>"
     ```
3. **Leitura Seletiva de Código:** Utilize o campo `source_location` retornado pelo grafo para ler exclusivamente as linhas necessárias com `read_file`, evitando varreduras completas de diretório. Consulte `graphify-out/GRAPH_REPORT.md` apenas quando precisar de visão macro das comunidades e dos *God Nodes*.
4. **Atualização Incremental Após Modificações:** Sempre que criar, refatorar ou remover módulos em `src/` ou `server/`, atualize o grafo incrementalmente via AST (custo zero de tokens LLM para código):
   ```bash
   /graphify . --update
   ```

---

## 2. Arquitetura do Sistema e Execução Multiplataforma (Windows, Linux, macOS)

O sistema adota uma arquitetura híbrida composta por **Frontend SPA Reativo (React 18 + TypeScript + Vite + Tailwind CSS)** acoplado a um **Bridge Local Multiplataforma em Node.js (`server/launcher-bridge.mjs`)**, além de configuração pronta para empacotamento nativo via **Tauri v2**.

### 2.1 Comparativo Técnico de Empacotamento Desktop (Windows, Linux e macOS)

| Arquitetura | Consumo de RAM | Tamanho do Binário | Bypass de Bloqueador de Pop-up | Manutenção Cross-Platform | Veredito Arquitetural |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vite + Node Local Bridge** | ~35 MB (processo Node) + navegador nativo | < 5 MB (sem duplicar Chromium) | Nativo via chamadas de SO (`start` no Windows, `xdg-open` no Linux, `open` no macOS) | Alta (launchers `.bat`, `.sh`, `.command`) | Execução em aba do navegador aproveitando sessões e cookies já ativos (CAPES CAFe, Zotero, Google Scholar). |
| **Tauri v2 (Rust + WebView Nativo - ATIVO)** | ~45–80 MB (usa WebView2 no Windows, WebKitGTK no Linux, WKWebView no macOS) | 8–18 MB (`.msi`/`.exe`, `.deb`/`.AppImage`, `.dmg`/`.app`) | Nativo via `@tauri-apps/plugin-opener` | Alta (integrado ao Vite + Rust) | **Modo Janela Nativa Standalone:** não roda em aba de navegador, possui janela própria com resolução 1280x860 e atalhos de SO. Comandos: `npm run desktop` e `npm run desktop:build`. |
| **Electron** | 250–450 MB (empacota Chromium + Node completos) | 120–180 MB | Nativo via `shell.openExternal` | Média | Desaconselhado para este escopo devido ao overhead desproporcional de memória e disco. |

> 💡 **Decisão de Engenharia:** Quando o pesquisador abre portais como Periódicos CAPES, Consensus, Elicit ou Google Scholar, ele precisa aproveitar os cookies, extensões de proxy institucional (EZProxy/CAFe) e gerenciadores de referência (Zotero Connector) já instalados em seu navegador padrão. O **Node Local Bridge (`/api/launch-urls`)** dispara a abertura das abas diretamente pelo sistema operacional no navegador padrão do usuário, contornando 100% dos bloqueadores de pop-up do navegador em Windows, Linux e macOS.

---

## 3. Topologia de Módulos do Projeto

- `src/types/academic.ts`: Contratos estritos de dados para plataformas (`PlatformConfig`), áreas especializadas (`ThematicArea`: `tecnologia`, `ia`, `saude`, `arte`, `games`, `software`, `hardware`, `multidisciplinar`), artigos normalizados (`NormalizedPaper`), estado do construtor booleano (`BooleanQueryState`), filtros de busca (`SearchFilters`), modelos de acesso (`AccessModel`: `gratuito`, `aberto-institucional`, `freemium`, `pago`) e itens de fichamento (`SavedPaperItem`).
- `src/data/platforms.ts`: Catálogo curado de **82 plataformas científicas** classificadas por nível de validação par-a-par, modelo de acesso (`gratuito`, `aberto-institucional`, `freemium`, `pago`), áreas temáticas disciplinares (`thematicAreas`), categoria operacional (`global-index`, `regional-latam`, `ai-synthesis`, `citation-graph`, `evidence-health`, `commercial-publishers`), 15 perfis de lançamento temático (`LAUNCH_PRESETS`) e geradores dinâmicos de URL de busca com suporte a autenticação institucional e paywalls acadêmicos internacionais.
- `src/utils/queryBuilder.ts`: Motor determinístico de construção de queries booleanas (`AND`, `OR`, `NOT`, termos exatos, recorte temporal, filtro de revisões sistemáticas/meta-análises) e dicionário técnico de expansão bilíngue Português ↔ Inglês para pesquisa acadêmica.
- `src/services/academicAggregator.ts`: Agregador federado assíncrono (`Promise.allSettled`) que consulta paralelamente **10 APIs científicas abertas e gratuitas**:
  1. **OpenAlex API** (`api.openalex.org/works`): 250M+ obras científicas com métricas de citação, conceitos e links diretos de PDF Open Access.
  2. **Semantic Scholar Graph API** (`api.semanticscholar.org/graph/v1/paper/search`): relevância semântica, TL;DR, contagem de citações influentes e PDFs abertos.
  3. **PubMed NCBI Entrez E-Utilities** (`eutils.ncbi.nlm.nih.gov/entrez/eutils/`): busca direta no índice oficial MEDLINE / National Library of Medicine (NIH) com resolução de PMID, DOI e PubMed Central PDF.
  4. **Europe PMC REST API** (`ebi.ac.uk/europepmc/webservices/rest/search`): literatura biomédica, clínica e ciências da vida com resumos completos e links de PDF aberto.
  5. **arXiv API** (`export.arxiv.org/api/query` via proxy/CORS): preprints de Ciência da Computação, Física, Matemática, Biologia Quantitativa, Estatística e Economia.
  6. **Crossref REST API** (`api.crossref.org/works`): registro oficial de DOIs e metadados editoriais de periódicos revisados por pares.
  7. **DOAJ REST API v4** (`doaj.org/api/search/articles/`): artigos publicados em periódicos científicos de Acesso Aberto auditados e revisados por pares.
  8. **Zenodo / CERN OpenAIRE API** (`zenodo.org/api/records` via proxy `/api/zenodo`): artigos, conjuntos de dados (datasets), pacotes de replicação e software científico hospedados no CERN.
  9. **HAL Open Science API** (`api.archives-ouvertes.fr/search/`): repositório nacional multi-institucional operado pelo CNRS (França) com mais de 3,5 milhões de documentos acadêmicos e textos completos.
  10. **DataCite Commons REST API** (`api.datacite.org/dois`): registro mundial de DOIs para conjuntos de dados empíricos, preprints (OSF, Figshare, Dryad) e relatórios técnicos.
  Inclui normalização de registros, deduplicação por DOI canônico e título normalizado, e ordenação multicritério (relevância, citações, ano, Open Access).
- `src/utils/citationExporter.ts`: Formatação determinística de referências segundo **ABNT NBR 6023:2018**, **APA 7ª Edição**, **BibTeX** e exportação de **Matriz de Revisão de Literatura em CSV** (UTF-8 com BOM para abertura direta no Excel/LibreOffice em Windows, Linux e macOS).
- `server/launcher-bridge.mjs`: Servidor HTTP local zero-dependência externa pesada (Node.js nativo `http` + `child_process`) que:
  - Dispara abertura nativa de múltiplas URLs no sistema operacional (`cmd /c start` em `win32`, `open` em `darwin`, `xdg-open` em `linux`) com controle de cadência (throttling de 120ms por aba para evitar travamento do navegador).
  - Provê proxy local para a API XML do `arXiv` e tradução gratuita de termos técnicos PT→EN.
- `src/i18n/context.tsx` e `src/i18n/translations.ts`: Camada reativa de internacionalização multilíngue com auto-detecção da língua do sistema operacional/navegador (`navigator.languages`), persistência em `localStorage` e suporte nativo a Português, Inglês, Espanhol e Francês.
- `src/utils/deduplication.ts`: Motor determinístico de deduplicação multicritério em 3 níveis (DOI canônico, identificadores exatos PMID/arXiv e proximidade textual Jaro-Winkler/Levenshtein) com fusão enriquecida de metadados.
- `src/utils/abstractParser.ts`: Parser determinístico de resumos estruturados (*Structured Abstracts*) e extração de metodologia, desenho de estudo e tamanho amostral ($N$) via regex heurístico e vocabulários controlados.
- `src/utils/prismaFlow.ts` e `src/components/PrismaFlowDiagram.tsx`: Motor de cálculo e renderização interativa do fluxograma oficial **PRISMA 2020** com exportação vetorial (SVG) e rastreamento de motivos de exclusão.
- `api/`: Funções Serverless (Vercel / Cloudflare) para proxy de CORS e APIs acadêmicas que exigem resolução remota (`/api/arxiv`, `/api/zenodo`, `/api/translate`).
- `src/App.tsx`: Interface principal com atalhos de teclado (`Ctrl/Cmd + K` para foco na busca, `Ctrl/Cmd + Enter` para busca federada, `Shift + Enter` para lançamento multi-abas), seletor visual de idioma, abas de operação (Metabuscador Integrado, Diretório de Plataformas, Construtor Booleano, Fichamento e Triagem PRISMA 2020).

---

## 4. Arquitetura de Deploy Web e Monetização sem Dependência de IA

O Cartograph opera em modelo híbrido (**Web First para democratização + Desktop Tauri v2 para Power Users**). As funcionalidades premium (*Plano Pro*) são construídas estritamente com **engenharia de software determinística**, garantindo 100% de reprodutibilidade científica, ausência de alucinações e margem de lucro de ~95% (custo fixo sem consumo de tokens de LLM):

### 4.1 Matriz de Funcionalidades Determinísticas (Plano Free vs Pro)

| Funcionalidade | Free / Básico | Pro / Pesquisador Avançado | Mecanismo Técnico |
| :--- | :--- | :--- | :--- |
| **Metabusca e Coleta** | 10 APIs abertas em paralelo | 10 APIs abertas + importação de arquivos BibTeX/RIS externos | Agregador federado assíncrono. |
| **Deduplicação de Artigos** | Deduplicação básica por DOI | Deduplicação multicritério com relatório de fusão e score de similaridade | `src/utils/deduplication.ts` (Jaro-Winkler + Levenshtein). |
| **Resumos e Metodologia** | Resumo bruto textual | Parser de resumos estruturados (Objetivo, Métodos, Amostra $N$, Conclusão) | `src/utils/abstractParser.ts` (regex e vocabulário MeSH). |
| **Triagem Sistemática** | Fichamento linear simples | Fluxo completo PRISMA 2020 com marcação cega de motivos de exclusão | `src/types/academic.ts` (`screeningStatus` e `exclusionReason`). |
| **Diagrama de Evidência** | Indisponível | Gerador dinâmico de Fluxograma PRISMA 2020 em SVG/PDF | `src/components/PrismaFlowDiagram.tsx`. |
| **Exportação de Dados** | CSV simples e BibTeX | Matriz completa de Revisão Sistemática (PRISMA Matrix) | `src/utils/citationExporter.ts`. |

### 4.2 Infraestrutura de Nuvem e Proxies Serverless

Para publicação em produção web (Vercel ou Cloudflare Pages):
1. O frontend React/Vite é servido em Edge CDN global com compressão Brotli.
2. As rotas `/api/arxiv`, `/api/zenodo` e `/api/translate` são executadas como funções Serverless Node.js na pasta `api/`.
3. O frontend detecta dinamicamente a presença do Tauri ou do Launcher Bridge local; caso esteja em ambiente web convencional, instrui o pesquisador sobre o bloqueador de pop-ups ou oferece lista com abertura sob demanda.

---

## 5. Diretrizes de Qualidade de Código e Escrita (WP:AISIGNS / Anti-Chatbotese)

1. **Tipagem Estrita:** Proibido uso de `any` implícito. Todas as respostas de APIs externas devem passar por funções *type-guard* ou mapeadores defensivos com *fallback* seguro.
2. **Resiliência de Rede:** Se uma API externa atingir *rate-limit* (ex.: Semantic Scholar HTTP 429), o agregador deve degradar graciosamente exibindo o status individual de cada fonte sem interromper os resultados das demais APIs.
3. **Padrão Editorial:** Toda documentação, interface textual e relatório gerado deve obedecer às regras Anti-Chatbotese (`WP:AISIGNS`): prosa direta, técnica, sem clichês promocionais, sem paralelismos negativos e sem adjetivação inflada.
