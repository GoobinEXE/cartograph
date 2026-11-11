export type SupportedLanguage = 'pt' | 'en' | 'es' | 'fr';

export interface Translations {
  appName: string;
  appTagline: string;
  systemBarSubtitle: string;
  bridgeActive: string;
  bridgeOffline: string;
  keyboardShortcut: string;

  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  btnSearchApis: string;
  btnLaunchTabs: string;
  btnTotalSearch: string;
  translateBtn: string;
  booleanBuilderBtn: string;
  platformsOpenedBridge: string;
  platformsOpenedBrowser: string;
  termTranslatedBanner: string;
  booleanAppliedBanner: string;

  presetsTitle: string;
  selectAll: string;
  clearSelection: string;

  tabPlatforms: string;
  tabFederated: string;
  tabSaved: string;
  filterStrictlyFree: string;
  allCategories: string;

  platformSearchBtn: string;
  enterTopicAbove: string;
  coverageLabel: string;
  categoryLabel: string;

  federatedTitle: string;
  federatedCount: string;
  querying: string;
  itemsLatency: string;
  unavailable: string;
  filtersLabel: string;
  filterOnlyOa: string;
  showAllSources: string;
  sortByLabel: string;
  sortRelevance: string;
  sortCitations: string;
  sortYear: string;
  savedInMatrix: string;
  savePaperBtn: string;
  noAuthors: string;
  collapseAbstract: string;
  readFullAbstract: string;
  openPage: string;
  freePdf: string;
  copyCitation: string;
  emptyFederatedTitle: string;
  emptyFederatedDesc: string;

  savedTitle: string;
  savedSubtitle: string;
  studySingular: string;
  studyPlural: string;
  downloadCsv: string;
  downloadBib: string;
  copyAll: string;
  clearAll: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityReview: string;
  removeTooltip: string;
  notesLabel: string;
  notesPlaceholder: string;
  openSource: string;
  downloadFullPdf: string;
  emptySavedTitle: string;
  emptySavedDesc: string;

  bbTitle: string;
  bbSubtitle: string;
  bbClear: string;
  bbMainConcept: string;
  bbMainConceptPh: string;
  bbAndTerms: string;
  bbAndTermsPh: string;
  bbOrTerms: string;
  bbOrTermsPh: string;
  bbExactPhrase: string;
  bbExactPhrasePh: string;
  bbNotTerms: string;
  bbNotTermsPh: string;
  bbStartYear: string;
  bbAnyYear: string;
  bbFromYear: string;
  bbStudyDesign: string;
  bbAllDesigns: string;
  bbSystematicReview: string;
  bbRct: string;
  bbEmpiricalCausal: string;
  bbCompiledString: string;
  bbCompiledEmpty: string;
  bbApplyBtn: string;

  catGlobalIndex: string;
  catGlobalIndexSub: string;
  catRegionalLatam: string;
  catRegionalLatamSub: string;
  catAiSynthesis: string;
  catAiSynthesisSub: string;
  catCitationGraph: string;
  catCitationGraphSub: string;
  catEvidenceHealth: string;
  catEvidenceHealthSub: string;

  accessGratuito: string;
  accessAbertoInst: string;
  accessFreemium: string;

  presetCoreGold: string;
  presetCoreGoldDesc: string;
  preset100Free: string;
  preset100FreeDesc: string;
  presetBrasilLatam: string;
  presetBrasilLatamDesc: string;
  presetEconPolicy: string;
  presetEconPolicyDesc: string;
  presetCsAi: string;
  presetCsAiDesc: string;
  presetAiCitation: string;
  presetAiCitationDesc: string;
  presetBiomed: string;
  presetBiomedDesc: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  pt: {
    appName: 'CARTOGRAPH',
    appTagline: 'Hub Científico & Metabusca Acadêmica',
    systemBarSubtitle: '38 Plataformas Científicas Verificadas + 10 APIs Abertas em Tempo Real',
    bridgeActive: 'Bridge Nativo Ativo ({osName})',
    bridgeOffline: 'Modo Web Local (Sem Bridge OS)',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Central de Metabusca Científica & Descoberta de Literatura',
    heroSubtitle:
      'Consulte simultaneamente 10 APIs científicas abertas (OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo/CERN, HAL e DataCite) e dispare buscas em 38 bases verificadas.',
    searchPlaceholder: 'Digite o tema ou expressão booleana (ex: "machine learning" AND "public policy")...',
    btnSearchApis: 'Buscar Artigos Aqui (10 APIs)',
    btnLaunchTabs: 'Lançar Abas ({count})',
    btnTotalSearch: 'Busca Total (APIs + Abas)',
    translateBtn: 'Traduzir PT → EN',
    booleanBuilderBtn: 'Construtor Booleano (AND/OR/NOT)',
    platformsOpenedBridge: '{count} plataformas abertas via Bridge Nativo ({osName}) sem bloqueio de pop-up.',
    platformsOpenedBrowser: '{count} abas disparadas pelo navegador.',
    termTranslatedBanner: 'Termo traduzido para busca internacional: "{term}"',
    booleanAppliedBanner: 'Expressão booleana aplicada na barra de pesquisa principal.',

    presetsTitle: 'Perfis de Lançamento (Multi-seleção):',
    selectAll: 'Selecionar Todas ({count})',
    clearSelection: 'Limpar Seleção',

    tabPlatforms: 'Diretório de Plataformas ({count})',
    tabFederated: 'Metabuscador Integrado ({count})',
    tabSaved: 'Matriz de Fichamento & ABNT ({count})',
    filterStrictlyFree: 'Exibir Apenas 100% Gratuitas / Sem Cota',
    allCategories: 'Todas as Categorias ({count})',

    platformSearchBtn: 'Pesquisar em {name}',
    enterTopicAbove: 'Digite um tema acima',
    coverageLabel: 'Cobertura:',
    categoryLabel: 'Categoria:',

    federatedTitle: 'Status em Tempo Real das APIs Científicas (Deduplicação por DOI/Título)',
    federatedCount: '{displayed} de {total} artigos únicos exibidos',
    querying: 'Consultando...',
    itemsLatency: '{count} itens ({latency}ms)',
    unavailable: 'Indisponível',
    filtersLabel: 'Filtros:',
    filterOnlyOa: 'Somente Open Access / PDF Gratuito',
    showAllSources: 'Mostrar todas as fontes ✕',
    sortByLabel: 'Ordenar por:',
    sortRelevance: 'Relevância Combinada',
    sortCitations: 'Maior Número de Citações',
    sortYear: 'Mais Recentes (Ano)',
    savedInMatrix: 'Salvo no Fichamento',
    savePaperBtn: 'Fichar Artigo',
    noAuthors: 'Autores não listados',
    collapseAbstract: 'Recolher resumo',
    readFullAbstract: 'Ler resumo completo',
    openPage: 'Abrir Página',
    freePdf: 'PDF Gratuito',
    copyCitation: 'Copiar citação:',
    emptyFederatedTitle: 'Metabuscador Acadêmico Federado Pronto',
    emptyFederatedDesc:
      'Digite sua consulta acima e clique em "Buscar Artigos Aqui (10 APIs)" para consultar simultaneamente OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo, HAL e DataCite com links diretos de PDF gratuito e formatação de citação.',

    savedTitle: 'Matriz de Revisão de Literatura ({count} {label})',
    savedSubtitle: 'Os dados permanecem salvos localmente neste computador (localStorage) entre sessões.',
    studySingular: 'estudo fichado',
    studyPlural: 'estudos fichados',
    downloadCsv: 'Baixar Matriz CSV (Excel / LibreOffice)',
    downloadBib: 'Baixar .BIB (Zotero / Overleaf)',
    copyAll: 'Copiar Todas ({format})',
    clearAll: 'Limpar',
    priorityHigh: 'Prioridade Alta',
    priorityMedium: 'Prioridade Média',
    priorityReview: 'Para Revisar',
    removeTooltip: 'Remover do fichamento',
    notesLabel: 'Notas de Síntese / Metodologia / Achados Quantitativos:',
    notesPlaceholder: 'Anote amostra (N), método empírico, efeito estimado ou limitações para exportar na Matriz CSV...',
    openSource: 'Abrir Fonte',
    downloadFullPdf: 'Baixar PDF Completo',
    emptySavedTitle: 'Sua Matriz de Fichamento Está Vazia',
    emptySavedDesc:
      'Na aba Metabuscador Integrado, clique em "Fichar Artigo" nos estudos relevantes para construir sua matriz comparativa, anotar achados e exportar citações em ABNT, APA, BibTeX ou planilha CSV.',

    bbTitle: 'Construtor Booleano & Filtros Metodológicos',
    bbSubtitle:
      'Estruture operadores lógicos (AND, OR, NOT) e recortes de desenho de estudo compatíveis com Scholar, PubMed, SciELO e OpenAlex.',
    bbClear: 'Limpar Construtor',
    bbMainConcept: 'Conceito Central',
    bbMainConceptPh: 'Ex: machine learning',
    bbAndTerms: 'Termos Obrigatórios (AND) — sep. por vírgula',
    bbAndTermsPh: 'Ex: public policy, primary care',
    bbOrTerms: 'Sinônimos Alternativos (OR) — sep. por vírgula',
    bbOrTermsPh: 'Ex: deep learning, neural network',
    bbExactPhrase: 'Expressão Exata ("...")',
    bbExactPhrasePh: 'Ex: causal inference',
    bbNotTerms: 'Excluir Termos (NOT) — sep. por vírgula',
    bbNotTermsPh: 'Ex: review, editorial',
    bbStartYear: 'Ano Inicial',
    bbAnyYear: 'Qualquer ano',
    bbFromYear: 'Desde {year}',
    bbStudyDesign: 'Desenho Metodológico',
    bbAllDesigns: 'Todos os desenhos',
    bbSystematicReview: 'Revisão Sistemática / Meta-Análise',
    bbRct: 'Ensaio Clínico (RCT)',
    bbEmpiricalCausal: 'Inferência Causal / Econometria',
    bbCompiledString: 'String compilada:',
    bbCompiledEmpty: '(preencha os campos acima para gerar a expressão booleana)',
    bbApplyBtn: 'Aplicar na Barra de Pesquisa',

    catGlobalIndex: 'Grandes Bases Globais & Preprints',
    catGlobalIndexSub: 'Indexadores bibliográficos mundiais, registros de DOI e repositórios de acesso aberto.',
    catRegionalLatam: 'Bases Brasileiras & Ibero-Americanas',
    catRegionalLatamSub: 'Literatura arbitrada nacional, teses, dissertações e portais públicos de acesso diamante.',
    catAiSynthesis: 'IAs Acadêmicas & Síntese de Evidências',
    catAiSynthesisSub: 'Extração estruturada de achados, consenso empírico e classificação semântica de citações.',
    catCitationGraph: 'Grafos de Citação & Mapeamento Visual',
    catCitationGraphSub: 'Redes de co-citação, acoplamento bibliográfico e descoberta visual por topologia.',
    catEvidenceHealth: 'Biomédicas, Saúde & Revisão Sistemática',
    catEvidenceHealthSub: 'Literatura médica indexada (MEDLINE/NIH), ensaios clínicos e sínteses Cochrane.',

    accessGratuito: '100% Gratuito / Open',
    accessAbertoInst: 'Acesso Aberto + CAFe',
    accessFreemium: 'Gratuito c/ Cota IA',

    presetCoreGold: 'Núcleo Padrão-Ouro (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO e Consensus.',
    preset100Free: '100% Gratuitas & Open Access (10 Bases)',
    preset100FreeDesc: 'Apenas plataformas abertas sem paywall ou limite de créditos.',
    presetBrasilLatam: 'Brasil, Portugal & LatAm (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, Periódicos CAPES, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet e RCAAP.',
    presetEconPolicy: 'Economia, Direito & Políticas Públicas (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO e Google Scholar.',
    presetCsAi: 'Computação, IA & Dados Abertos (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons e The Lens.',
    presetAiCitation: 'IAs Acadêmicas & Grafos (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers e Open Knowledge Maps.',
    presetBiomed: 'Saúde & Revisão Sistemática (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv e LILACS.',
  },

  en: {
    appName: 'CARTOGRAPH',
    appTagline: 'Scientific Hub & Academic Metasearch',
    systemBarSubtitle: '38 Verified Scientific Platforms + 10 Open APIs in Real-Time',
    bridgeActive: 'Native Bridge Active ({osName})',
    bridgeOffline: 'Web Local Mode (No OS Bridge)',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Scientific Metasearch & Literature Discovery Hub',
    heroSubtitle:
      'Simultaneously search 10 open scientific APIs (OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo/CERN, HAL and DataCite) and launch queries across 38 verified databases.',
    searchPlaceholder: 'Enter search topic or boolean expression (e.g. "machine learning" AND "public policy")...',
    btnSearchApis: 'Search Papers Here (10 APIs)',
    btnLaunchTabs: 'Launch Tabs ({count})',
    btnTotalSearch: 'Total Search (APIs + Tabs)',
    translateBtn: 'Translate PT → EN',
    booleanBuilderBtn: 'Boolean Query Builder (AND/OR/NOT)',
    platformsOpenedBridge: '{count} platforms launched via Native Bridge ({osName}) without pop-up blocking.',
    platformsOpenedBrowser: '{count} tabs launched by browser.',
    termTranslatedBanner: 'Query translated for international search: "{term}"',
    booleanAppliedBanner: 'Boolean expression applied to main search bar.',

    presetsTitle: 'Launch Profiles (Multi-select):',
    selectAll: 'Select All ({count})',
    clearSelection: 'Clear Selection',

    tabPlatforms: 'Platforms Directory ({count})',
    tabFederated: 'Integrated Metasearch ({count})',
    tabSaved: 'Literature Matrix & Citations ({count})',
    filterStrictlyFree: 'Show Only 100% Free / No Paywall',
    allCategories: 'All Categories ({count})',

    platformSearchBtn: 'Search on {name}',
    enterTopicAbove: 'Enter a topic above',
    coverageLabel: 'Coverage:',
    categoryLabel: 'Category:',

    federatedTitle: 'Real-Time Scientific APIs Status (Deduplication by DOI/Title)',
    federatedCount: '{displayed} of {total} unique papers displayed',
    querying: 'Searching...',
    itemsLatency: '{count} items ({latency}ms)',
    unavailable: 'Unavailable',
    filtersLabel: 'Filters:',
    filterOnlyOa: 'Only Open Access / Free PDF',
    showAllSources: 'Show all sources ✕',
    sortByLabel: 'Sort by:',
    sortRelevance: 'Combined Relevance',
    sortCitations: 'Highest Citation Count',
    sortYear: 'Most Recent (Year)',
    savedInMatrix: 'Saved in Matrix',
    savePaperBtn: 'Save Paper',
    noAuthors: 'Authors not listed',
    collapseAbstract: 'Collapse abstract',
    readFullAbstract: 'Read full abstract',
    openPage: 'Open Page',
    freePdf: 'Free PDF',
    copyCitation: 'Copy citation:',
    emptyFederatedTitle: 'Federated Academic Metasearch Ready',
    emptyFederatedDesc:
      'Enter your query above and click "Search Papers Here (10 APIs)" to simultaneously query OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo, HAL, and DataCite with direct free PDF links and citation formatting.',

    savedTitle: 'Literature Review Matrix ({count} {label})',
    savedSubtitle: 'Data remains saved locally on this computer (localStorage) between sessions.',
    studySingular: 'study saved',
    studyPlural: 'studies saved',
    downloadCsv: 'Download CSV Matrix (Excel / LibreOffice)',
    downloadBib: 'Download .BIB (Zotero / Overleaf)',
    copyAll: 'Copy All ({format})',
    clearAll: 'Clear All',
    priorityHigh: 'High Priority',
    priorityMedium: 'Medium Priority',
    priorityReview: 'To Review',
    removeTooltip: 'Remove from matrix',
    notesLabel: 'Synthesis Notes / Methodology / Quantitative Findings:',
    notesPlaceholder: 'Note sample size (N), empirical methods, estimated effects or limitations for CSV export...',
    openSource: 'Open Source',
    downloadFullPdf: 'Download Full PDF',
    emptySavedTitle: 'Your Literature Matrix is Empty',
    emptySavedDesc:
      'In the Integrated Metasearch tab, click "Save Paper" on relevant studies to build your comparative matrix, note findings, and export citations in ABNT, APA, BibTeX, or CSV spreadsheet.',

    bbTitle: 'Boolean Query Builder & Methodological Filters',
    bbSubtitle:
      'Structure logical operators (AND, OR, NOT) and study design filters compatible with Scholar, PubMed, SciELO, and OpenAlex.',
    bbClear: 'Clear Builder',
    bbMainConcept: 'Core Concept',
    bbMainConceptPh: 'e.g. machine learning',
    bbAndTerms: 'Mandatory Terms (AND) — comma-separated',
    bbAndTermsPh: 'e.g. public policy, primary care',
    bbOrTerms: 'Alternative Synonyms (OR) — comma-separated',
    bbOrTermsPh: 'e.g. deep learning, neural network',
    bbExactPhrase: 'Exact Phrase ("...")',
    bbExactPhrasePh: 'e.g. causal inference',
    bbNotTerms: 'Exclude Terms (NOT) — comma-separated',
    bbNotTermsPh: 'e.g. review, editorial',
    bbStartYear: 'Start Year',
    bbAnyYear: 'Any year',
    bbFromYear: 'Since {year}',
    bbStudyDesign: 'Study Design',
    bbAllDesigns: 'All study designs',
    bbSystematicReview: 'Systematic Review / Meta-Analysis',
    bbRct: 'Clinical Trial (RCT)',
    bbEmpiricalCausal: 'Causal Inference / Econometrics',
    bbCompiledString: 'Compiled string:',
    bbCompiledEmpty: '(fill fields above to generate boolean expression)',
    bbApplyBtn: 'Apply to Search Bar',

    catGlobalIndex: 'Global Indexes & Preprints',
    catGlobalIndexSub: 'Worldwide bibliographic indexes, DOI registries, and open-access repositories.',
    catRegionalLatam: 'Regional & Latin American Databases',
    catRegionalLatamSub: 'Peer-reviewed regional literature, theses, dissertations, and diamond open-access portals.',
    catAiSynthesis: 'Academic AIs & Evidence Synthesis',
    catAiSynthesisSub: 'Structured findings extraction, empirical consensus, and semantic citation classification.',
    catCitationGraph: 'Citation Graphs & Visual Mapping',
    catCitationGraphSub: 'Co-citation networks, bibliographic coupling, and topological discovery.',
    catEvidenceHealth: 'Biomedical, Health & Systematic Reviews',
    catEvidenceHealthSub: 'Indexed medical literature (MEDLINE/NIH), clinical trials, and Cochrane systematic reviews.',

    accessGratuito: '100% Free / Open',
    accessAbertoInst: 'Open Access + Institutional',
    accessFreemium: 'Free with AI Quota',

    presetCoreGold: 'Gold Standard Core (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO, and Consensus.',
    preset100Free: '100% Free & Open Access (10 Bases)',
    preset100FreeDesc: 'Strictly open platforms without paywalls or credit limits.',
    presetBrasilLatam: 'Brazil, Portugal & LatAm (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, CAPES Periodicals, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet, and RCAAP.',
    presetEconPolicy: 'Economics, Law & Public Policy (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO, and Google Scholar.',
    presetCsAi: 'Computer Science, AI & Open Data (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons, and The Lens.',
    presetAiCitation: 'Academic AIs & Graphs (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers, and Open Knowledge Maps.',
    presetBiomed: 'Health & Systematic Reviews (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv, and LILACS.',
  },

  es: {
    appName: 'CARTOGRAPH',
    appTagline: 'Hub Científico & Metabúsqueda Académica',
    systemBarSubtitle: '38 Plataformas Científicas Verificadas + 10 APIs Abiertas en Tiempo Real',
    bridgeActive: 'Bridge Nativo Activo ({osName})',
    bridgeOffline: 'Modo Web Local (Sin Bridge OS)',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Central de Metabúsqueda Científica & Descubrimiento de Literatura',
    heroSubtitle:
      'Consulte simultáneamente 10 APIs científicas abiertas (OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo/CERN, HAL y DataCite) y lance búsquedas en 38 bases verificadas.',
    searchPlaceholder: 'Escriba el tema o expresión booleana (ej: "machine learning" AND "public policy")...',
    btnSearchApis: 'Buscar Artículos Aquí (10 APIs)',
    btnLaunchTabs: 'Lanzar Pestañas ({count})',
    btnTotalSearch: 'Búsqueda Total (APIs + Pestañas)',
    translateBtn: 'Traducir ES → EN',
    booleanBuilderBtn: 'Constructor Booleano (AND/OR/NOT)',
    platformsOpenedBridge: '{count} plataformas abiertas vía Bridge Nativo ({osName}) sin bloqueo de ventanas emergentes.',
    platformsOpenedBrowser: '{count} pestañas lanzadas por el navegador.',
    termTranslatedBanner: 'Término traducido para búsqueda internacional: "{term}"',
    booleanAppliedBanner: 'Expresión booleana aplicada en la barra de búsqueda principal.',

    presetsTitle: 'Perfiles de Lanzamiento (Multiselección):',
    selectAll: 'Seleccionar Todas ({count})',
    clearSelection: 'Limpiar Selección',

    tabPlatforms: 'Directorio de Plataformas ({count})',
    tabFederated: 'Metabuscador Integrado ({count})',
    tabSaved: 'Matriz de Fichaje & Citas ({count})',
    filterStrictlyFree: 'Mostrar Solo 100% Gratuitas / Sin Pago',
    allCategories: 'Todas las Categorías ({count})',

    platformSearchBtn: 'Buscar en {name}',
    enterTopicAbove: 'Escriba un tema arriba',
    coverageLabel: 'Cobertura:',
    categoryLabel: 'Categoría:',

    federatedTitle: 'Estado en Tiempo Real de las APIs Científicas (Deduplicación por DOI/Título)',
    federatedCount: '{displayed} de {total} artículos únicos mostrados',
    querying: 'Consultando...',
    itemsLatency: '{count} artículos ({latency}ms)',
    unavailable: 'No disponible',
    filtersLabel: 'Filtros:',
    filterOnlyOa: 'Solo Open Access / PDF Gratuito',
    showAllSources: 'Mostrar todas las fuentes ✕',
    sortByLabel: 'Ordenar por:',
    sortRelevance: 'Relevancia Combinada',
    sortCitations: 'Mayor Número de Citas',
    sortYear: 'Más Recientes (Año)',
    savedInMatrix: 'Guardado en Matriz',
    savePaperBtn: 'Fichar Artículo',
    noAuthors: 'Autores no listados',
    collapseAbstract: 'Plegar resumen',
    readFullAbstract: 'Leer resumen completo',
    openPage: 'Abrir Página',
    freePdf: 'PDF Gratuito',
    copyCitation: 'Copiar cita:',
    emptyFederatedTitle: 'Metabuscador Académico Federado Listo',
    emptyFederatedDesc:
      'Escriba su consulta arriba y haga clic en "Buscar Artículos Aquí (10 APIs)" para consultar simultáneamente OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo, HAL y DataCite con enlaces directos a PDF gratuito y citas formateadas.',

    savedTitle: 'Matriz de Revisión de Literatura ({count} {label})',
    savedSubtitle: 'Los datos permanecen guardados localmente en esta computadora (localStorage) entre sesiones.',
    studySingular: 'estudio fichado',
    studyPlural: 'estudios fichados',
    downloadCsv: 'Descargar Matriz CSV (Excel / LibreOffice)',
    downloadBib: 'Descargar .BIB (Zotero / Overleaf)',
    copyAll: 'Copiar Todas ({format})',
    clearAll: 'Limpiar',
    priorityHigh: 'Prioridad Alta',
    priorityMedium: 'Prioridad Media',
    priorityReview: 'Para Revisar',
    removeTooltip: 'Eliminar del fichaje',
    notesLabel: 'Notas de Síntesis / Metodología / Hallazgos Cuantitativos:',
    notesPlaceholder: 'Anote muestra (N), método empírico, efecto estimado o limitaciones para exportar en Matriz CSV...',
    openSource: 'Abrir Fuente',
    downloadFullPdf: 'Descargar PDF Completo',
    emptySavedTitle: 'Su Matriz de Fichaje Está Vacía',
    emptySavedDesc:
      'En la pestaña Metabuscador Integrado, haga clic en "Fichar Artículo" en los estudios relevantes para construir su matriz comparativa, anotar hallazgos y exportar citas en ABNT, APA, BibTeX o planilla CSV.',

    bbTitle: 'Constructor Booleano & Filtros Metodológicos',
    bbSubtitle:
      'Estructure operadores lógicos (AND, OR, NOT) y filtros de diseño de estudio compatibles con Scholar, PubMed, SciELO y OpenAlex.',
    bbClear: 'Limpiar Constructor',
    bbMainConcept: 'Concepto Central',
    bbMainConceptPh: 'Ej: machine learning',
    bbAndTerms: 'Términos Obligatorios (AND) — sep. por coma',
    bbAndTermsPh: 'Ej: public policy, primary care',
    bbOrTerms: 'Sinónimos Alternativos (OR) — sep. por coma',
    bbOrTermsPh: 'Ej: deep learning, neural network',
    bbExactPhrase: 'Frase Exacta ("...")',
    bbExactPhrasePh: 'Ej: causal inference',
    bbNotTerms: 'Excluir Términos (NOT) — sep. por coma',
    bbNotTermsPh: 'Ej: review, editorial',
    bbStartYear: 'Año Inicial',
    bbAnyYear: 'Cualquier año',
    bbFromYear: 'Desde {year}',
    bbStudyDesign: 'Diseño Metodológico',
    bbAllDesigns: 'Todos los diseños',
    bbSystematicReview: 'Revisión Sistemática / Meta-Análisis',
    bbRct: 'Ensayo Clínico (RCT)',
    bbEmpiricalCausal: 'Inferencia Causal / Econometría',
    bbCompiledString: 'Cadena compilada:',
    bbCompiledEmpty: '(complete los campos arriba para generar la expresión booleana)',
    bbApplyBtn: 'Aplicar en Barra de Búsqueda',

    catGlobalIndex: 'Grandes Bases Globales & Preprints',
    catGlobalIndexSub: 'Indexadores bibliográficos mundiales, registros de DOI y repositorios de acceso abierto.',
    catRegionalLatam: 'Bases Iberoamericanas & Regionales',
    catRegionalLatamSub: 'Literatura arbitrada regional, tesis, disertaciones y portales públicos de acceso diamante.',
    catAiSynthesis: 'IAs Académicas & Síntesis de Evidencia',
    catAiSynthesisSub: 'Extracción estructurada de hallazgos, consenso empírico y clasificación semántica de citas.',
    catCitationGraph: 'Grafos de Citas & Mapeo Visual',
    catCitationGraphSub: 'Redes de cocitación, acoplamiento bibliográfico y descubrimiento topológico.',
    catEvidenceHealth: 'Biomédicas, Salud & Revisión Sistemática',
    catEvidenceHealthSub: 'Literatura médica indexada (MEDLINE/NIH), ensayos clínicos y revisiones Cochrane.',

    accessGratuito: '100% Gratuito / Open',
    accessAbertoInst: 'Acceso Abierto + Institucional',
    accessFreemium: 'Gratuito c/ Cuota IA',

    presetCoreGold: 'Núcleo Estándar de Oro (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO y Consensus.',
    preset100Free: '100% Gratuitas & Open Access (10 Bases)',
    preset100FreeDesc: 'Plataformas estrictamente abiertas sin muros de pago ni límites de crédito.',
    presetBrasilLatam: 'Iberoamérica & LatAm (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, Periódicos CAPES, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet y RCAAP.',
    presetEconPolicy: 'Economía, Derecho & Políticas Públicas (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO y Google Scholar.',
    presetCsAi: 'Computación, IA & Datos Abiertos (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons y The Lens.',
    presetAiCitation: 'IAs Académicas & Grafos (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers y Open Knowledge Maps.',
    presetBiomed: 'Salud & Revisiones Sistemáticas (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv y LILACS.',
  },

  fr: {
    appName: 'CARTOGRAPH',
    appTagline: 'Hub Scientifique & Métarecherche Académique',
    systemBarSubtitle: '38 Plateformes Scientifiques Vérifiées + 10 APIs Ouvertes en Temps Réel',
    bridgeActive: 'Bridge Natif Actif ({osName})',
    bridgeOffline: 'Mode Web Local (Sans Bridge OS)',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Plateforme de Métarecherche Scientifique & Découverte de Littérature',
    heroSubtitle:
      'Interrogez simultanément 10 APIs scientifiques ouvertes (OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo/CERN, HAL et DataCite) et lancez des recherches sur 38 bases vérifiées.',
    searchPlaceholder: 'Entrez un sujet ou une expression booléenne (ex: "machine learning" AND "public policy")...',
    btnSearchApis: 'Rechercher des Articles Ici (10 APIs)',
    btnLaunchTabs: 'Ouvrir les Onglets ({count})',
    btnTotalSearch: 'Recherche Totale (APIs + Onglets)',
    translateBtn: 'Traduire vers l\'Anglais',
    booleanBuilderBtn: 'Générateur Booléen (AND/OR/NOT)',
    platformsOpenedBridge: '{count} plateformes ouvertes via le Bridge Natif ({osName}) sans blocage de pop-up.',
    platformsOpenedBrowser: '{count} onglets ouverts par le navigateur.',
    termTranslatedBanner: 'Terme traduit pour recherche internationale: "{term}"',
    booleanAppliedBanner: 'Expression booléenne appliquée dans la barre de recherche.',

    presetsTitle: 'Profils de Lancement (Multi-sélection):',
    selectAll: 'Tout Sélectionner ({count})',
    clearSelection: 'Effacer la Sélection',

    tabPlatforms: 'Répertoire des Plateformes ({count})',
    tabFederated: 'Métarecherche Intégrée ({count})',
    tabSaved: 'Matrice de Synthèse & Citations ({count})',
    filterStrictlyFree: 'Afficher Uniquement 100% Gratuit / Sans Paywall',
    allCategories: 'Toutes les Catégories ({count})',

    platformSearchBtn: 'Rechercher sur {name}',
    enterTopicAbove: 'Entrez un sujet ci-dessus',
    coverageLabel: 'Couverture:',
    categoryLabel: 'Catégorie:',

    federatedTitle: 'État en Temps Réel des APIs Scientifiques (Déduplication par DOI/Titre)',
    federatedCount: '{displayed} sur {total} articles uniques affichés',
    querying: 'Recherche en cours...',
    itemsLatency: '{count} articles ({latency}ms)',
    unavailable: 'Indisponible',
    filtersLabel: 'Filtres:',
    filterOnlyOa: 'Uniquement Open Access / PDF Gratuit',
    showAllSources: 'Afficher toutes les sources ✕',
    sortByLabel: 'Trier par:',
    sortRelevance: 'Pertinence Combinée',
    sortCitations: 'Nombre de Citations le Plus Élevé',
    sortYear: 'Plus Récents (Année)',
    savedInMatrix: 'Enregistré dans la Matrice',
    savePaperBtn: 'Enregistrer l\'Article',
    noAuthors: 'Auteurs non listés',
    collapseAbstract: 'Réduire le résumé',
    readFullAbstract: 'Lire le résumé complet',
    openPage: 'Ouvrir la Page',
    freePdf: 'PDF Gratuit',
    copyCitation: 'Copier la citation:',
    emptyFederatedTitle: 'Métarecherche Académique Fédérée Prête',
    emptyFederatedDesc:
      'Entrez votre requête ci-dessus et cliquez sur "Rechercher des Articles Ici (10 APIs)" pour interroger simultanément OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, Zenodo, HAL et DataCite avec liens PDF gratuits et citations formatées.',

    savedTitle: 'Matrice de Revue de Littérature ({count} {label})',
    savedSubtitle: 'Les données sont conservées localement sur cet ordinateur (localStorage) entre les sessions.',
    studySingular: 'étude enregistrée',
    studyPlural: 'études enregistrées',
    downloadCsv: 'Télécharger Matrice CSV (Excel / LibreOffice)',
    downloadBib: 'Télécharger .BIB (Zotero / Overleaf)',
    copyAll: 'Tout Copier ({format})',
    clearAll: 'Tout Effacer',
    priorityHigh: 'Haute Priorité',
    priorityMedium: 'Priorité Moyenne',
    priorityReview: 'À Réviser',
    removeTooltip: 'Retirer de la matrice',
    notesLabel: 'Notes de Synthèse / Méthodologie / Résultats Quantitatifs:',
    notesPlaceholder: 'Notez taille d\'échantillon (N), méthode empirique, effet estimé ou limites pour export CSV...',
    openSource: 'Ouvrir la Source',
    downloadFullPdf: 'Télécharger le PDF Complet',
    emptySavedTitle: 'Votre Matrice de Synthèse est Vide',
    emptySavedDesc:
      'Dans l\'onglet Métarecherche Intégrée, cliquez sur "Enregistrer l\'Article" sur les études pertinentes pour constituer votre matrice comparative et exporter en ABNT, APA, BibTeX ou CSV.',

    bbTitle: 'Générateur Booléen & Filtres Méthodologiques',
    bbSubtitle:
      'Structurez les opérateurs logiques (AND, OR, NOT) et filtres de recherche compatibles avec Scholar, PubMed, SciELO et OpenAlex.',
    bbClear: 'Effacer',
    bbMainConcept: 'Concept Central',
    bbMainConceptPh: 'Ex: machine learning',
    bbAndTerms: 'Termes Obligatoires (AND) — séparés par virgule',
    bbAndTermsPh: 'Ex: public policy, primary care',
    bbOrTerms: 'Synonymes Alternatifs (OR) — séparés par virgule',
    bbOrTermsPh: 'Ex: deep learning, neural network',
    bbExactPhrase: 'Expression Exacte ("...")',
    bbExactPhrasePh: 'Ex: causal inference',
    bbNotTerms: 'Exclure Termes (NOT) — séparés par virgule',
    bbNotTermsPh: 'Ex: review, editorial',
    bbStartYear: 'Année Initiale',
    bbAnyYear: 'Toute année',
    bbFromYear: 'Depuis {year}',
    bbStudyDesign: 'Méthodologie d\'Étude',
    bbAllDesigns: 'Toutes les méthodologies',
    bbSystematicReview: 'Revue Systématique / Méta-Analyse',
    bbRct: 'Essai Clinique Contrôlé (RCT)',
    bbEmpiricalCausal: 'Inférence Causale / Économétrie',
    bbCompiledString: 'Requête compilée:',
    bbCompiledEmpty: '(remplissez les champs ci-dessus pour générer l\'expression booléenne)',
    bbApplyBtn: 'Appliquer dans la Barre de Recherche',

    catGlobalIndex: 'Grands Index Globaux & Prépublications',
    catGlobalIndexSub: 'Index bibliographiques mondiaux, registres de DOI et dépôts en accès ouvert.',
    catRegionalLatam: 'Bases Régionales & Ibéro-Américaines',
    catRegionalLatamSub: 'Littérature évaluée par les pairs, thèses, mémoires et portails diamant en libre accès.',
    catAiSynthesis: 'IAs Académiques & Synthèse de Preuves',
    catAiSynthesisSub: 'Extraction structurée de résultats, consensus empirique et classification sémantique.',
    catCitationGraph: 'Graphes de Citations & Cartographie Visuelle',
    catCitationGraphSub: 'Réseaux de co-citations, couplage bibliographique et découverte topologique.',
    catEvidenceHealth: 'Biomédical, Santé & Revues Systématiques',
    catEvidenceHealthSub: 'Littérature médicale indexée (MEDLINE/NIH), essais cliniques et revues Cochrane.',

    accessGratuito: '100% Gratuit / Open',
    accessAbertoInst: 'Accès Ouvert + Institutionnel',
    accessFreemium: 'Gratuit avec Quota IA',

    presetCoreGold: 'Cœur Standard d\'Or (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO et Consensus.',
    preset100Free: '100% Gratuit & Open Access (10 Bases)',
    preset100FreeDesc: 'Plateformes strictement ouvertes sans abonnement ni limite de crédits.',
    presetBrasilLatam: 'Ibéro-Amérique & LatAm (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, CAPES, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet et RCAAP.',
    presetEconPolicy: 'Économie, Droit & Politiques Publiques (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO et Google Scholar.',
    presetCsAi: 'Informatique, IA & Données Ouvertes (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons et The Lens.',
    presetAiCitation: 'IAs Académiques & Graphes (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers et Open Knowledge Maps.',
    presetBiomed: 'Santé & Revues Systématiques (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv et LILACS.',
  },
};
