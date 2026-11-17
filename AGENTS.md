# AGENTS.md — Cartograph (Scientific Metasearch & PRISMA Systematic Review Hub)

Documento normativo e especificação arquitetural primária para qualquer agente de IA ou desenvolvedor operando no repositório **Cartograph / Super Pesquisador 2000**. Este arquivo define o padrão técnico, as diretrizes de escrita sem vícios de IA (`WP:AISIGNS`), as regras de navegação no grafo de conhecimento (`graphify`) e as restrições arquiteturais do sistema.

---

## 1. Protocolo de Navegação e Otimização via Graphify (`graphify-out/`)

O repositório mantém um grafo de conhecimento topológico persistente em `graphify-out/` (`graph.json`, `GRAPH_REPORT.md` e `graph.html`), compilado a partir de 77 arquivos-fonte, 677 nós e 1.614 arestas distribuídos em 34 comunidades. Todo agente deve seguir a diretriz **Query-First** para economizar tokens de contexto antes de realizar varreduras de arquivos brutos.

### 1.1 Comandos Canônicos do CLI Graphify
Para inspecionar o grafo sem consumir contexto com leituras integrais de código, execute os utilitários via interpretador Python dedicado:

```bash
# Identificar o caminho mais curto entre dois módulos ou nós:
/Users/marcelopessoa/.local/share/uv/tools/graphifyy/bin/graphify path "<Origem>" "<Destino>"

# Inspecionar nó, grau de conectividade, localização de código e vizinhança:
/Users/marcelopessoa/.local/share/uv/tools/graphifyy/bin/graphify explain "<NomeDoNo>"

# Diagnosticar riscos de colapso de arestas e integridade:
/Users/marcelopessoa/.local/share/uv/tools/graphifyy/bin/graphify diagnose multigraph

# Atualização incremental pós-modificação (obrigatória após criar/alterar arquivos em src/, server/ ou api/):
/Users/marcelopessoa/.local/share/uv/tools/graphifyy/bin/graphify update .
```

### 1.2 God Nodes do Repositório (Abstrações Centrais do Sistema)
O grafo identifica os seguintes pontos de acoplamento crítico que exigem máxima atenção durante refatorações (contagens de arestas do grafo de 15/11/2026; valores atuais em `graphify-out/GRAPH_REPORT.md`):
1. `Cartograph Master App Icon (512x512 PNG)` (55 arestas) — Nó central de assets de empacotamento multi-target.
2. `AcademicCommandCenter()` (36 arestas — `src/App.tsx:L141`) — Orquestrador visual de busca federada, injeção de estado, filtros e gavetas.
3. `runFederatedSearch()` (32 arestas — `src/services/academicAggregator.ts`) — Coordenador assíncrono da busca federada; as fontes de cada busca saem de `planFederatedSources()`, que lê `API_SOURCE_REGISTRY`.
4. `normalizeDoi()` (30 arestas — `shared/identifiers.mjs`, reexportado por `src/utils/deduplication.ts`) — Sanitizador canônico de DOI usado pelo cliente, pelas funções da Vercel, pelo bridge e pelos backups.
5. `useI18n()` (21 arestas — `src/i18n/context.tsx`) — Hook de internacionalização reativa em 4 idiomas (PT, EN, ES, FR).
6. `crossPlatformFetch()` (21 arestas — `src/services/httpClient.ts`) — Política de rede única: Tauri chama o upstream direto; na web, a resposta JSON/XML do proxy da mesma origem é final, e só uma resposta HTML ou falha de rede leva ao proxy em nuvem e depois à URL direta.
10. `shared/upstreams.mjs` — Fonte única de toda URL de API externa, caminho de proxy e requisição BYOK, importada por `src/`, `api/` e `server/`.
7. `sanitizeExternalUrl()` (21 arestas — `api/_security.ts` / `src/utils/urlSafety.ts`) — Barreira anti-SSRF e validação de URLs externas.
8. `applyCorsHeaders()` (20 arestas — `api/_security.ts`) — Controle rigoroso de origens permitidas em funções de borda.
9. `enforceRateLimit()` (18 arestas — `api/_security.ts`) — Mecanismo defensivo de limitação de requisições por IP em memória.

### 1.3 Regra de Atualização Contínua
Sempre que concluir uma tarefa de codificação que adicione, renomeie ou modifique métodos, interfaces ou rotas, execute:
```bash
/Users/marcelopessoa/.local/share/uv/tools/graphifyy/bin/graphify update .
```
Isso mantém o índice AST sincronizado, garante que futuros subagentes encontrem as definições atualizadas e previne regressões arquiteturais sem custo de tokens de IA.

---

## 2. Princípios Basilares e Padrão Editorial (WP:AISIGNS / Anti-Chatbotese)

Toda documentação, interface com o usuário, mensagem de commit e saída textual gerada deve aderir estritamente ao guia comunitário [Wikipedia:Signs of AI writing (`WP:AISIGNS`)](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) e ao protocolo PESQUISA SGSD.

### 2.1 Postura Arquitetural
- **Tom de Staff+ Engineer / Principal Architect:** Analítico, objetivo, cético e focado em trade-offs de engenharia. Proibido tom entusiasmado corporativo, retórica de marketing ou estilo de apresentação motivacional.
- **Prosa Densa e Assertiva:** Parágrafos coesos que explicam causa, mecanismo e consequência. Proibida a quebra contínua de frases curtas em listas telegráficas sem substância técnica.
- **Pontuação e Formatação Controladas:** Uso de travessões (`—`) restrito à pontuação gramatical legítima, sem repetição contínua como muleta estilística. Sem emojis decorativos (permitidos unicamente os callouts funcionais `📌`, `⚠️`, `💡`).

### 2.2 Proibições Sintáticas e Vocabulares Estritas
- **Sem Falsa Antítese ou Paralelismo Negativo (`WP:AIPARALLEL`):** Proibidas expressões como *"não se trata apenas de X, mas de Y"*, *"mais do que uma ferramenta, é uma solução"*.
- **Sem Orações Participiais/Gerundistas de Cauda (`WP:SUPERFICIAL`):** Proibido terminar frases com *"...destacando sua relevância"*, *"...garantindo assim maior eficácia"*.
- **Sem Evasão de Cópula (`WP:AINOCOPULA`):** Use verbos diretos (*é*, *possui*, *executa*). Proibido usar *"posiciona-se como"*, *"serve como um testamento de"*.
- **Sem Vocabulário Inflado (`WP:AIVOCAB`):** Proibidas palavras como *mergulho profundo*, *tapeçaria*, *divisor de águas*, *pivotal*, *crucial*, *cenário em constante evolução*, *no final do dia*.

---

## 3. Arquitetura de Execução Híbrida Multiplataforma

O Cartograph opera através de uma tríade de execução projetada para contornar bloqueadores de pop-up de navegadores e viabilizar acesso direto a repositórios autenticados (CAPES CAFe, EZProxy institucional, Zotero Connector, Google Scholar):

```
                        ┌────────────────────────────────────────────────────────┐
                        │              Cartograph Frontend (React 18)            │
                        └──────────┬───────────────────────────────┬─────────────┘
                                   │                               │
        Modo Desktop Nativo        │                               │ Modo Web + Local Bridge
    (Tauri v2 + Rust WebView)      │                               │ (Navegador do Usuário)
                                   ▼                               ▼
                     ┌───────────────────────────┐   ┌───────────────────────────┐
                     │   @tauri-apps/plugin      │   │  server/launcher-bridge   │
                     │  (opener / http nativo)   │   │  (Node.js / child_process)│
                     └─────────────┬─────────────┘   └─────────────┬─────────────┘
                                   │                               │
                                   ▼                               ▼
                     ┌───────────────────────────────────────────────────────────┐
                     │   Sistema Operacional (Windows / macOS / Linux Host)      │
                     │   start / open / xdg-open com cadência de 120ms por aba   │
                     └───────────────────────────────────────────────────────────┘
```

### 3.1 Comparativo das Camadas de Execução
1. **Web SPA (React 18 + Vite + Tailwind CSS):**
   - Servido via CDN global (Vercel) com compressão Brotli e cabeçalhos de segurança estritos.
   - Utiliza as Serverless Functions (`api/`) para contornar restrições de CORS e proxies upstream.
2. **Desktop Nativo Standalone (Tauri v2 + Rust):**
   - Binário ultra-leve (8–18 MB), baixo consumo de RAM (45–80 MB).
   - Comunicação via IPC nativo com `@tauri-apps/plugin-opener` para abertura de links e `@tauri-apps/plugin-http` (escopo `https://**`) para chamar os upstreams sem proxy, inclusive as fontes BYOK, cuja chave vai direto ao provedor.
3. **Local Launcher Bridge (`server/launcher-bridge.mjs`):**
   - Servidor HTTP leve em Node.js puro (`http` + `child_process`), na porta local 4789 (`BRIDGE_PORT`), que replica as rotas de `api/` usando os mesmos construtores de `shared/upstreams.mjs`.
   - Quando executado no navegador comum, abre múltiplas abas pelo sistema operacional (`open`, `xdg-open` e, no Windows, `rundll32 url.dll,FileProtocolHandler`; o `cmd /c start` foi removido porque o `cmd.exe` cortava a URL no primeiro `&`), com cadência de 110 ms entre abas. A montagem do comando fica em `server/nativeOpen.mjs`, coberta por testes.

---

## 4. Pipeline de Metabusca e Ranqueamento Determinístico

O motor de pesquisa científica do Cartograph é **100% determinístico**, rejeitando qualquer dependência de LLM ou chamadas pagas de IA na agregação, deduplicação, ranqueamento e triagem sistemática. Isso assegura reprodutibilidade metodológica estrita e custo operacional fixo.

### 4.1 Agregador Federado Orientado por Registro (`src/services/academicAggregator.ts`)
`API_SOURCE_REGISTRY` (`src/data/apiSources.ts`) é a fonte única das fontes federadas: rótulo, categorias temáticas, peso de autoridade, `transport` (`direct`, `proxy` ou `byok`) e vínculo com a credencial BYOK. `planFederatedSources()` deriva dele a lista de cada busca, `SOURCE_RUNNERS` (`src/services/sourceRunners.ts`) liga cada fonte ao seu adaptador e `API_SOURCE_DOCS` (`src/data/apiSourceDocs.ts`) alimenta a página Sobre › APIs. Os três são `Record<ApiSourceId, …>` totais, então uma fonte nova sem adaptador ou sem documentação não compila. Os totais exibidos (27 abertas e 7 BYOK em novembro de 2026) são derivados do registro em tempo de build. A busca executa chamadas paralelas (`Promise.allSettled`) com timeout de 12 s por fonte. As 15 fontes originais, em `src/services/coreSourceAdapters.ts`, são:
- **Índices Universais:** OpenAlex (250M+ obras, conceitos, citações, PDF aberto), Semantic Scholar (grafo acadêmico, TL;DR, citações influentes), Crossref (registro de DOIs e metadados de periódicos).
- **Ciências Biomédicas e da Vida:** PubMed NCBI Entrez (índice oficial MEDLINE, PMID, PMC full-text), Europe PMC (literatura biomédica e biociências com PDFs diretos).
- **Preprints e Ciências Exatas:** arXiv API (computação, física, matemática, estatística), INSPIRE-HEP (física de altas energias e computação quântica).
- **Acesso Aberto Auditado e Repositórios Nacionais:** DOAJ (revistas Open Access auditadas), HAL Open Science (CNRS França, 3.5M+ documentos acadêmicos).
- **Conjuntos de Dados e Repositórios Multidisciplinares:** DataCite Commons (DOIs para datasets, relatórios técnicos, OSF), Zenodo / CERN OpenAIRE (datasets, software, artigos), Figshare (materiais suplementares e replicação), GBIF (dados de biodiversidade e ecologia).
- **Agências Federais de Pesquisa e Tecnologia:** OSTI.gov (relatórios técnicos do Departamento de Energia dos EUA), NASA NTRS (pesquisas e relatórios aeroespaciais).
- **Extensões abertas (`src/services/sourceAdapters.ts`, via `/api/academic-proxy`):** OpenAIRE Graph, OSF Preprints, SocArXiv, ERIC, PLOS, Oasisbr (IBICT), Harvard Dataverse, CORE, World Bank Documents & Reports, World Bank OKR, RCIpea e UN Digital Library.
- **BYOK (chave do pesquisador, via `/api/byok-proxy` na web ou direto no Tauri):** Scopus, ScienceDirect, IEEE Xplore, Springer Nature, The Lens, Fed in Print e Congress.gov. Semantic Scholar e CORE aceitam chave opcional para cota maior.

Cada adaptador separa um `parse*` puro (testado com fixtures) do `search*` que só faz a requisição. Os parsers leem o JSON de terceiros com os acessores de `src/utils/json.ts` (`asRecord`, `asRecords`, `asString`…), que nunca lançam exceção, e registros sem identificador recebem ID estável por hash (`stableHashId`), nunca aleatório.

### 4.2 Algoritmo Multicritério de Ranqueamento de Relevância (`src/utils/relevanceRanker.ts`)
Cada artigo recuperado recebe uma pontuação $S_{\text{final}} \in [0, 1]$ através da equação:
$$S_{\text{final}} = 0.45 \cdot S_{\text{lexical}} + 0.25 \cdot S_{\text{consensus}} + 0.20 \cdot S_{\text{impact\_recency}} + 0.10 \cdot S_{\text{quality\_access}}$$

- **Componente Léxico ($S_{\text{lexical}}$ — Peso 0.45):**
  - Aplica Okapi BM25 modificado no título ($k_1 = 1.2$, $b = 0.5$, $\text{avg\_len} = 11$) e no resumo ($k_1 = 1.2$, $b = 0.35$, $\text{avg\_len} = 160$).
  - Incorpora bônus para correspondência exata de frase contígua e expansão semântica via glossário técnico bilíngue Português ↔ Inglês.
- **Componente de Consenso e Autoridade ($S_{\text{consensus}}$ — Peso 0.25):**
  - Bonifica artigos descobertos simultaneamente por múltiplas fontes independentes através de Reciprocal Rank Fusion ($k = 60$).
  - Pondera a autoridade de cada API conforme `authorityWeight` no registro, exposto como `API_SOURCE_AUTHORITY_WEIGHTS` (por exemplo PubMed 1.15, OpenAlex 1.12, Crossref 1.04, arXiv 1.0).
- **Componente de Impacto e Recência ($S_{\text{impact\_recency}}$ — Peso 0.20):**
  - Mede a velocidade de citações por ano de publicação: $v_{\text{cite}} = \frac{C}{\max(1, Y_{\text{atual}} - Y_{\text{pub}})}$.
  - Aplica decaimento temporal exponencial com constante de tempo $\tau = 8$ anos: $D(t) = \exp\left(-\frac{Y_{\text{atual}} - Y_{\text{pub}}}{\tau}\right)$.
- **Componente de Qualidade e Acesso Aberto ($S_{\text{quality\_access}}$ — Peso 0.10):**
  - Bonificação para desenhos de estudo prioritários na hierarquia PRISMA (Revisões Sistemáticas, Meta-análises, Ensaios Clínicos Randomizados - RCT).
  - Bônus para disponibilidade imediata de link direto para PDF em Acesso Aberto (`isOpenAccess: true`).

### 4.3 Motor Determinístico de Deduplicação em 3 Níveis (`src/utils/deduplication.ts`)
Para garantir a integridade da amostra em revisões sistemáticas, a deduplicação opera sequencialmente:
1. **Nível 1 (DOI Canônico):** Normalização de DOI (remoção de prefixos `https://doi.org/`, `dx.doi.org/`, caixa baixa e limpeza de pontuação).
2. **Nível 2 (Identificadores de Repositório Exatos):** Resolução exata de IDs proprietários normalizados (PubMed PMID numérico, arXiv ID sem sufixo de versão de revisão).
3. **Nível 3 (Similaridade Fonética e Ortográfica Híbrida):**
   - Comparação do sobrenome do primeiro autor normalizado (`getFirstAuthorSurname`).
   - Margem temporal de tolerância ($\le 1$ ano de diferença para acomodar ciclo entre preprint e publicação formal em periódico).
   - Cálculo de similaridade Jaro-Winkler sobre o título limpo de diacríticos e pontuação ($\text{threshold} \ge 0.92$).
4. **Fusão Enriquecida de Metadados:** Ao fundir dois registros, o sistema unifica resumos (preservando o mais longo e detalhado), soma contagens de citação, agrega URLs e registra o histórico de fusão no `MergeClusterEntry` inspecionável visualmente via `MergeInspectorModal.tsx`.

---

## 5. Extração Metodológica e Triagem Sistemática PRISMA 2020

O Cartograph implementa nativamente o fluxo metodológico das diretrizes **PRISMA 2020 (Preferred Reporting Items for Systematic Reviews and Meta-Analyses)**.

### 5.1 Parser Determinístico de Resumos Estruturados (`src/utils/abstractParser.ts`)
- Segmenta seções canônicas de resumos (*Background*, *Methods*, *Results*, *Conclusions*) sem o uso de LLM, utilizando análise léxica e padrões IMRAD.
- Identifica desenhos de estudo com base em vocabulário controlado MeSH (*Randomized Controlled Trial*, *Systematic Review*, *Cohort Study*, *Case-Control*, *Observational*, *In Vitro*, *Mathematical Model*).
- Extrai tamanho amostral empírico ($N = \dots$, participantes, espécimes ou casos) através de expressões regulares contextuais com validação de limites numéricos.

### 5.2 Fluxograma PRISMA 2020 Interativo (`src/components/PrismaFlowDiagram.tsx`)
- Renderização visual das quatro fases do fluxo PRISMA:
  1. **Identificação:** Total de registros obtidos via APIs abertas e importações manuais (BibTeX/RIS).
  2. **Triagem:** Registros após exclusão de duplicatas exatas e aproximadas.
  3. **Elegibilidade:** Artigos analisados na íntegra com marcação formal de motivos de exclusão estruturados (*Critério de inclusão não atendido*, *Desenho de estudo inadequado*, *Amostra insuficiente*, *Ausência de desfecho mensurável*, *Texto completo inacessível*).
  4. **Inclusão:** Amostra final consolidada para síntese qualitativa e quantitativa.
- Exportação nativa do diagrama em vetor SVG estandardizado para inclusão direta em teses e artigos acadêmicos.

### 5.3 Exportação Estandardizada de Dados (`src/utils/citationExporter.ts`)
- **ABNT NBR 6023:2018:** Formatação estrita para normas brasileiras (caixa alta para sobrenomes, títulos em destaque, DOI e paginação).
- **APA 7ª Edição:** Formatação internacional com resolução de autores múltiplos, ano entre parênteses e links https para DOI.
- **BibTeX:** Exportação estrita de chaves e campos (`@article`, `@inproceedings`, `@misc`) com escape adequado de caracteres especiais.
- **Matriz de Revisão Sistemática (CSV com BOM UTF-8):** Tabela multidimensional formatada para Excel, LibreOffice e R/Python, contendo identificadores, pontuações de relevância, seções estruturadas, tamanho amostral ($N$) e status PRISMA.

---

## 6. Segurança, Proxies e Infraestrutura de Nuvem (`api/`)

As funções Serverless em `api/` implementam camadas defensivas rigorosas para evitar exploração de proxies, SSRF e abusos de recursos:

### 6.1 Políticas de Segurança (`api/_security.ts`)
- **Sanitização de URLs Upstream (`sanitizeExternalUrl`):** Bloqueio estrito de IPs privados (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), endereços de loopback (`127.0.0.1`, `localhost`), interfaces de metadados de nuvem (`169.254.169.254`) e protocolos não-HTTP/HTTPS.
- **Rate Limiting em Memória (`enforceRateLimit`):** Algoritmo de token bucket / sliding window em memória para conter abusos por IP sem onerar latência com dependências de banco externas.
- **Restrição de Origens e CORS (`applyCorsHeaders`):** Permissão restrita aos domínios autorizados de produção (`cartographsearch.com`), subdomínios Vercel Preview oficiais do projeto e ambiente de desenvolvimento local.
- **Cabeçalhos de Isolamento:** Injeção sistemática de `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `User-Agent` canônico institucional (`CARTOGRAPH_USER_AGENT`, em `shared/upstreams.mjs`) para auditoria externa.
- **Lista fechada de provedores:** `academic-proxy` e `byok-proxy` só aceitam provedores de `FREE_PROXY_PROVIDERS` e `BYOK_UPSTREAM_PROVIDERS` e montam a URL no servidor; o cliente nunca envia uma URL arbitrária. Respostas BYOK usam `Cache-Control: no-store, private`.

---

## 7. Internacionalização (i18n) e Arquitetura de Estado

A aplicação oferece suporte multilíngue integral e sem recarga de página para quatro idiomas:
- **Idiomas Suportados:** Português (`pt`), Inglês (`en`), Espanhol (`es`) e Francês (`fr`), um arquivo por idioma em `src/i18n/locales/`, todos tipados pela interface `Translations` de `src/i18n/translations.ts`. O teste `tests/i18n.test.ts` exige o mesmo conjunto de chaves e os mesmos placeholders `{param}` em todos os locales.
- **Resolução de Idioma:** Os idiomas oferecidos, o `<html lang>` e a detecção a partir de `navigator.languages` derivam do mapa `TRANSLATIONS`; registrar um locale basta para habilitá-lo. A escolha manual persiste em `localStorage`, e uma chave ausente cai para o inglês.
- **Fora de componentes React:** `translate(language, key, params)` (puro, em `translations.ts`) localiza serviços, exportadores e a tela de erro sem depender do provider.
- **Conteúdo longo:** páginas Sobre, textos legais, cabeçalhos de exportação, diagrama PRISMA, checklists e descrições do catálogo existem em PT e EN; `proseLanguage()` (`src/i18n/localized.ts`) entrega o inglês aos demais idiomas. Datas usam `intlLocale()`. Comparações binárias do tipo `language === 'en'` são proibidas, porque mandam ES/FR para o português.
- **Gestão de Sessão e Backups:** `src/utils/workspaceBackup.ts` exporta e importa o estado da revisão em JSON (schema v2), sanitizando cada registro na leitura. O backup nunca inclui chaves BYOK, InstToken, template de proxy ou e-mail do Unpaywall. A tela de erro (`ErrorBoundary`) gera um backup de emergência no mesmo formato, reimportável pela Biblioteca, e guarda registros ilegíveis em `emergencyRecovery` em vez de descartá-los.
- **Preferências visuais:** as chaves de gavetas e tema ficam em `LAYOUT_STORAGE_KEYS` (`src/utils/layoutPreferences.ts`); um teste impede declará-las em outro arquivo.

---

## 8. Diretrizes de UI/UX Intelligence, Rigor Tipográfico e Integração Arquitetural

Toda e qualquer intervenção visual, estilística ou de interação no frontend do Cartograph deve seguir um processo de design assistido por inteligência técnica especializada, rejeitando soluções genéricas e garantindo acabamento artesanal.

### 8.1 Ativação Mandatória das Skills de Design
É estritamente proibido criar ou refatorar interfaces com base em palpites estéticos arbitrários ou componentes genéricos de modelos de IA. Qualquer tarefa que modifique telas, componentes React, folhas de estilo ou animações deve acionar a suíte de design:
- **Inteligência Central (`/ui-ux-pro-max`):** Consulta obrigatória de paletas, microinterações, espaçamentos e acessibilidade antes de codificar (`search.py --domain ux|style|color|typography|icons`). Aplicação irrestrita dos checklists de acabamento em `references/pro-rules.md`.
- **Suíte Complementar:** Uso de `frontend-design` para composições exclusivas e direção estética autêntica; `bencium-impact-designer` e `bencium-controlled-ux-designer` para validação de hierarquia e contraste; `emil-design-eng` e `apple-design` para física de movimento, sensação tátil e consistência espacial; `animate` para coreografia fluida; e `accesslint` / `web-design-guidelines` para conformidade com WCAG 2.2 AA.

### 8.2 Proibição de Estética Genérica e Padronização Tipográfica Estrita
O Cartograph rejeita designs genéricos de inteligência artificial ou modelos pré-fabricados sem identidade. A aplicação fundamenta-se na estética do ecossistema PRISM (Spectral Prism Design):
- **Títulos e Marca (`.font-heading`, `.font-brand`):** Exclusivamente `Plus Jakarta Sans` (pesos 500, 600, 700), `letter-spacing: -0.02em`. Proibidas fontes serifadas ou sans-serif genéricas de navegador sem estilização.
- **Corpo de Texto e Rótulos:** `Inter` e `Roboto` com fallbacks nativos (`-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`), altura de linha de 1.5 e renderização antialiased.
- **Código, DOIs, Queries Booleanas e Dados Numéricos:** `JetBrains Mono` ou `ui-monospace` (pesos 400, 500) com `font-variant-numeric: tabular-nums` para alinhamento vertical rigoroso de contagens de citação e matrizes.

### 8.3 Princípio de Integração Excepcional (Tolerância Zero a Soluções Provisórias)
Novos recursos nunca devem ser implementados como remendos, elementos visuais flutuantes descontextualizados ou atalhos técnicos ("gambiarras"). Cada funcionalidade deve nascer organicamente integrada:
- **Integração de Estado e Tipos:** Contratos de dados estritos em `src/types/academic.ts` sem recurso a `any` ou props anônimas.
- **Suporte Bitemático Universal:** Compatibilidade perfeita com `[data-theme="light"]` e `[data-theme="dark"]` através das variáveis semânticas CSS (`--bg-canvas`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--divider`, `--link-academic`, `--meta-green`). Proibidas cores hexadecimais dispersas e hardcoded em tags.
- **Internacionalização Completa (4 Idiomas):** Inclusão mandatória de todas as novas strings de interface na interface `Translations` e nos quatro arquivos de `src/i18n/locales/` (`pt`, `en`, `es`, `fr`).
- **Harmonia com os Orquestradores Principais:** Encaixe coerente no fluxo de `AcademicCommandCenter()` em `src/App.tsx`, com suporte aos atalhos de teclado globais, transições elegantes e ausência de travamentos de layout no desktop Tauri v2 e na web.

---

## 9. Checklist Obrigatório para Agentes de IA

Antes de considerar qualquer tarefa finalizada no repositório, o agente deve comprovar a execução dos seguintes itens:

1. **Validação de Tipagem:** Código TypeScript livre de erros de compilação (`npm run build` ou verificação via `tsc --noEmit`). É expressamente proibido o uso de `any` explícito ou implícito em novas declarações.
2. **Determinismo Algorítmico:** Não introduzir dependências de inferência de LLM ou APIs proprietárias no motor central de metabusca, ordenação ou triagem.
3. **Padrão de Design e Tipografia:** Validação de conformidade visual via `/ui-ux-pro-max`, fidelidade tipográfica às fontes oficiais (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`) e ausência de componentes genéricos de IA.
4. **Integração Completa:** Suporte a 4 idiomas (i18n), suporte bitemático (claro/escuro) e ausência de soluções provisórias ou remendos de interface.
5. **Auditoria Anti-Chatbotese:** O código, documentação e comentários não devem conter nenhum dos vícios de linguagem catalogados na Seção 2 (`WP:AISIGNS`).
6. **Atualização do Grafo de Conhecimento:** Executar obrigatoriamente a sincronização incremental via AST:
   ```bash
   /Users/marcelopessoa/.local/share/uv/tools/graphifyy/bin/graphify update .
   ```
7. **Preservação de Integridade:** Não deletar comentários técnicos contextuais ou assinaturas de tipos existentes sem justificativa arquitetural documentada.
8. **Testes:** `npm test` verde. Nova fonte federada exige entrada no registro, runner, documentação em `apiSourceDocs.ts`, construtor em `shared/upstreams.mjs` quando houver proxy e fixture de parser; o teste `tests/sourceRegistry.test.ts` falha se algum desses elos faltar ou se um total voltar a ser escrito à mão.
9. **Cartão de compartilhamento:** após mudar o catálogo, rode `npm run build && npm run og:render` para regenerar `public/og-image.png`.
