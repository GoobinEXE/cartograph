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
  tabFeedback: string;
  feedbackTitle: string;
  feedbackSubtitle: string;
  feedbackTypeLabel: string;
  feedbackTypeSuggestion: string;
  feedbackTypeCorrection: string;
  feedbackTypeFeature: string;
  feedbackTypeGeneral: string;
  feedbackSubjectLabel: string;
  feedbackSubjectPlaceholder: string;
  feedbackMessageLabel: string;
  feedbackMessagePlaceholder: string;
  feedbackUrlLabel: string;
  feedbackUrlPlaceholder: string;
  feedbackInstitutionLabel: string;
  feedbackInstitutionPlaceholder: string;
  feedbackEmailLabel: string;
  feedbackEmailPlaceholder: string;
  feedbackRatingLabel: string;
  feedbackSubmitBtn: string;
  feedbackSuccessBanner: string;
  feedbackHistoryTitle: string;
  feedbackHistoryEmpty: string;
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
  catCommercialPublishers: string;
  catCommercialPublishersSub: string;
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
  accessPago: string;

  presetCoreGold: string;
  presetCoreGoldDesc: string;
  presetGlobalPublishers: string;
  presetGlobalPublishersDesc: string;
  presetStemTech: string;
  presetStemTechDesc: string;
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
  presetAi: string;
  presetAiDesc: string;
  presetHealth: string;
  presetHealthDesc: string;
  presetGames: string;
  presetGamesDesc: string;
  presetArt: string;
  presetArtDesc: string;
  presetSoftware: string;
  presetSoftwareDesc: string;
  presetHardware: string;
  presetHardwareDesc: string;

  thematicAreasTitle: string;
  areaAll: string;
  areaTecnologia: string;
  areaIa: string;
  areaSaude: string;
  areaArte: string;
  areaGames: string;
  areaSoftware: string;
  areaHardware: string;
  areaMultidisciplinar: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  pt: {
    appName: 'CARTOGRAPH',
    appTagline: 'Metabusca Científica',
    systemBarSubtitle: 'Pesquisa integrada em periódicos científicos e repositórios acadêmicos',
    bridgeActive: 'Bridge nativo ativo ({osName})',
    bridgeOffline: 'Execução local no navegador',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Pesquisa Acadêmica Integrada',
    heroSubtitle:
      'Consulte artigos, preprints e periódicos em bases científicas abertas e institucionais.',
    searchPlaceholder: 'Pesquise por tema, autor, artigo ou termos de busca...',
    btnSearchApis: 'Buscar Artigos',
    btnLaunchTabs: 'Abrir nos Portais ({count})',
    btnTotalSearch: 'Busca Completa',
    translateBtn: 'Traduzir PT → EN',
    booleanBuilderBtn: 'Filtros Booleanos',
    platformsOpenedBridge: '{count} portais abertos no navegador.',
    platformsOpenedBrowser: '{count} abas abertas pelo navegador.',
    termTranslatedBanner: 'Termo traduzido para busca internacional: "{term}"',
    booleanAppliedBanner: 'Filtros booleanos aplicados à pesquisa.',

    presetsTitle: 'Perfis de Busca:',
    selectAll: 'Marcar Todas ({count})',
    clearSelection: 'Desmarcar Todas',

    tabPlatforms: 'Bases & Portais ({count})',
    tabFederated: 'Artigos Encontrados ({count})',
    tabSaved: 'Biblioteca ({count})',
    tabFeedback: 'Feedback & Sugestões',
    feedbackTitle: 'Contribuições & Avaliação',
    feedbackSubtitle:
      'Envie sugestões de novas fontes científicas, reporte inconsistências ou proponha aprimoramentos para o Cartograph.',
    feedbackTypeLabel: 'Tipo de Contribuição',
    feedbackTypeSuggestion: 'Sugerir Nova Base / Portal',
    feedbackTypeCorrection: 'Reportar Inconsistência ou Link',
    feedbackTypeFeature: 'Sugestão Funcional',
    feedbackTypeGeneral: 'Avaliação Geral',
    feedbackSubjectLabel: 'Título',
    feedbackSubjectPlaceholder: 'Ex: Adicionar repositório temático SciELO Livros',
    feedbackMessageLabel: 'Descrição',
    feedbackMessagePlaceholder: 'Descreva a sugestão, relato ou comentário com clareza...',
    feedbackUrlLabel: 'URL ou Base Relacionada (opcional)',
    feedbackUrlPlaceholder: 'https://exemplo.org ou nome da base',
    feedbackInstitutionLabel: 'Área ou Instituição (opcional)',
    feedbackInstitutionPlaceholder: 'Ex: USP / Ciência da Computação',
    feedbackEmailLabel: 'E-mail para Retorno (opcional)',
    feedbackEmailPlaceholder: 'seu.email@universidade.edu',
    feedbackRatingLabel: 'Avaliação da Experiência',
    feedbackSubmitBtn: 'Enviar Feedback',
    feedbackSuccessBanner: 'Feedback registrado com sucesso. Agradecemos sua contribuição.',
    feedbackHistoryTitle: 'Histórico de Contribuições',
    feedbackHistoryEmpty: 'Nenhum feedback enviado neste navegador ainda.',
    filterStrictlyFree: 'Apenas Acesso Aberto',
    allCategories: 'Todas as Categorias ({count})',

    platformSearchBtn: 'Pesquisar em {name}',
    enterTopicAbove: 'Digite um termo de pesquisa',
    coverageLabel: 'Área:',
    categoryLabel: 'Categoria:',

    federatedTitle: 'Artigos Científicos Encontrados',
    federatedCount: '{displayed} de {total} artigos',
    querying: 'Buscando artigos...',
    itemsLatency: '{count} artigos ({latency}ms)',
    unavailable: 'Sem resposta',
    filtersLabel: 'Filtros:',
    filterOnlyOa: 'Apenas texto completo (Open Access)',
    showAllSources: 'Mostrar todas as fontes ✕',
    sortByLabel: 'Classificar por:',
    sortRelevance: 'Relevância',
    sortCitations: 'Mais citados',
    sortYear: 'Mais recentes',
    savedInMatrix: 'Salvo na Biblioteca',
    savePaperBtn: 'Salvar Artigo',
    noAuthors: 'Autores não informados',
    collapseAbstract: 'Recolher resumo',
    readFullAbstract: 'Ler resumo completo',
    openPage: 'Ver página',
    freePdf: 'PDF Aberto',
    copyCitation: 'Copiar citação:',
    emptyFederatedTitle: 'Pesquisa em Bases Científicas',
    emptyFederatedDesc:
      'Digite termos de busca no campo superior para consultar repositórios abertos, visualizar resumos e acessar textos completos.',

    savedTitle: 'Artigos Salvos ({count} {label})',
    savedSubtitle: 'Artigos armazenados localmente para consulta e exportação de referências.',
    studySingular: 'artigo',
    studyPlural: 'artigos',
    downloadCsv: 'Exportar Tabela (CSV)',
    downloadBib: 'Exportar BibTeX (.bib)',
    copyAll: 'Copiar Referências ({format})',
    clearAll: 'Limpar Biblioteca',
    priorityHigh: 'Alta',
    priorityMedium: 'Média',
    priorityReview: 'Revisar',
    removeTooltip: 'Remover artigo',
    notesLabel: 'Notas da pesquisa:',
    notesPlaceholder: 'Anote observações, metodologia ou dados do estudo...',
    openSource: 'Ver Artigo',
    downloadFullPdf: 'Baixar PDF',
    emptySavedTitle: 'Nenhum artigo salvo',
    emptySavedDesc:
      'Clique em "Salvar Artigo" nos resultados de busca para organizar sua revisão e exportar citações em ABNT, APA ou BibTeX.',

    bbTitle: 'Construtor de Expressão Booleana',
    bbSubtitle: 'Combine palavras-chave para refinar os resultados.',
    bbClear: 'Limpar campos',
    bbMainConcept: 'Termo Principal',
    bbMainConceptPh: 'Tema central da pesquisa',
    bbAndTerms: 'Termos Obrigatórios (AND)',
    bbAndTermsPh: 'Palavras que também devem estar presentes',
    bbOrTerms: 'Termos Alternativos (OR)',
    bbOrTermsPh: 'Sinônimos ou variantes',
    bbExactPhrase: 'Frase Exata',
    bbExactPhrasePh: 'Expressão exata entre aspas',
    bbNotTerms: 'Excluir Termos (NOT)',
    bbNotTermsPh: 'Palavras a desconsiderar',
    bbStartYear: 'A Partir do Ano',
    bbAnyYear: 'Qualquer ano',
    bbFromYear: 'Desde {year}',
    bbStudyDesign: 'Tipo de Estudo',
    bbAllDesigns: 'Todos os estudos',
    bbSystematicReview: 'Revisão Sistemática',
    bbRct: 'Ensaio Clínico',
    bbEmpiricalCausal: 'Estudo Empírico',
    bbCompiledString: 'Expressão montada:',
    bbCompiledEmpty: 'Preencha os campos para compor a busca',
    bbApplyBtn: 'Aplicar na Busca',

    catGlobalIndex: 'Bases Globais & Repositórios',
    catGlobalIndexSub: 'Grandes índices acadêmicos mundiais e servidores de preprints.',
    catCommercialPublishers: 'Editoras Científicas',
    catCommercialPublishersSub: 'Periódicos com acesso via assinatura ou convênio institucional.',
    catRegionalLatam: 'América Latina & Península Ibérica',
    catRegionalLatamSub: 'Literatura científica regional, periódicos públicos e teses.',
    catAiSynthesis: 'Bases com Análise Semântica',
    catAiSynthesisSub: 'Ferramentas com sumarização de achados e contexto de citação.',
    catCitationGraph: 'Redes de Citação',
    catCitationGraphSub: 'Mapeamento visual de relações bibliográficas entre estudos.',
    catEvidenceHealth: 'Saúde & Medicina',
    catEvidenceHealthSub: 'Literatura biomédica, revisões de saúde e ensaios clínicos.',

    accessGratuito: 'Acesso Aberto',
    accessAbertoInst: 'Acesso Institucional',
    accessFreemium: 'Gratuito com Limite',
    accessPago: 'Assinatura',

    presetCoreGold: 'Núcleo Principal (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO e Consensus.',
    presetGlobalPublishers: 'Editoras Internacionais (8 Bases)',
    presetGlobalPublishersDesc: 'Web of Science, Scopus, ScienceDirect, IEEE Xplore, ACM, Springer, Wiley e JSTOR.',
    presetStemTech: 'Ciências Exatas & Tecnologia (6 Bases)',
    presetStemTechDesc: 'IEEE Xplore, ACM DL, arXiv, ScienceDirect, SpringerLink e DBLP.',
    preset100Free: 'Acesso Aberto (10 Bases)',
    preset100FreeDesc: 'Plataformas de acesso livre sem muros de pagamento.',
    presetBrasilLatam: 'Brasil & Ibero-América (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, Periódicos CAPES, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet e RCAAP.',
    presetEconPolicy: 'Ciências Sociais & Economia (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO e Google Scholar.',
    presetCsAi: 'Computação & Dados (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons e The Lens.',
    presetAiCitation: 'Síntese & Grafos (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers e Open Knowledge Maps.',
    presetBiomed: 'Saúde & Medicina (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv e LILACS.',
    presetAi: 'Inteligência Artificial & Machine Learning',
    presetAiDesc: 'Hugging Face Papers, Papers With Code, OpenReview, ACL Anthology e arXiv.',
    presetHealth: 'Saúde, Medicina & Farmacologia',
    presetHealthDesc: 'PubMed, Europe PMC, Cochrane Library, bioRxiv, medRxiv e ClinicalTrials.gov.',
    presetGames: 'Games, Ludologia & Mídias Interativas',
    presetGamesDesc: 'DiGRA Digital Library, Game Studies, GDC Vault e IEEE Transactions on Games.',
    presetArt: 'Arte, Design & Cultura Visual',
    presetArtDesc: 'Getty Research Portal, Smithsonian Open Access, Met Museum e AIGA Design Archives.',
    presetSoftware: 'Engenharia de Software & Desenvolvimento',
    presetSoftwareDesc: 'DBLP, GitHub Research, Software Heritage e ACM SIGSOFT.',
    presetHardware: 'Hardware, Semicondutores & Arquitetura',
    presetHardwareDesc: 'WikiChip, IEEE Micro, Hot Chips e arXiv Hardware Architecture.',

    thematicAreasTitle: 'Área Temática',
    areaAll: 'Todas as Áreas',
    areaTecnologia: 'Tecnologia & Inovação',
    areaIa: 'Inteligência Artificial',
    areaSaude: 'Saúde & Medicina',
    areaArte: 'Arte & Design',
    areaGames: 'Games & Jogos',
    areaSoftware: 'Desenvolvimento & Software',
    areaHardware: 'Hardware & Chips',
    areaMultidisciplinar: 'Multidisciplinar',
  },

  en: {
    appName: 'CARTOGRAPH',
    appTagline: 'Academic Metasearch',
    systemBarSubtitle: 'Unified search across scientific journals and open repositories',
    bridgeActive: 'Native Bridge Active ({osName})',
    bridgeOffline: 'Running in browser',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Unified Academic Search',
    heroSubtitle:
      'Search across open repositories, preprints, and scientific databases with a single query.',
    searchPlaceholder: 'Search by topic, author, paper title, or keywords...',
    btnSearchApis: 'Search Papers',
    btnLaunchTabs: 'Open in Portals ({count})',
    btnTotalSearch: 'Complete Search',
    translateBtn: 'Translate PT → EN',
    booleanBuilderBtn: 'Boolean Query Builder',
    platformsOpenedBridge: '{count} academic portals opened in browser.',
    platformsOpenedBrowser: '{count} tabs opened by browser.',
    termTranslatedBanner: 'Search term translated: "{term}"',
    booleanAppliedBanner: 'Boolean filters applied to search bar.',

    presetsTitle: 'Search Presets:',
    selectAll: 'Select All ({count})',
    clearSelection: 'Clear Selection',

    tabPlatforms: 'Portals & Databases ({count})',
    tabFederated: 'Papers Found ({count})',
    tabSaved: 'Library ({count})',
    tabFeedback: 'Feedback & Suggestions',
    feedbackTitle: 'Feedback & Contributions',
    feedbackSubtitle:
      'Suggest new scientific sources, report broken links or issues, and help improve Cartograph.',
    feedbackTypeLabel: 'Contribution Type',
    feedbackTypeSuggestion: 'Suggest New Database / Portal',
    feedbackTypeCorrection: 'Report Broken Link / Issue',
    feedbackTypeFeature: 'Feature Request',
    feedbackTypeGeneral: 'General Feedback',
    feedbackSubjectLabel: 'Title',
    feedbackSubjectPlaceholder: 'e.g. Add SciELO Books repository',
    feedbackMessageLabel: 'Details',
    feedbackMessagePlaceholder: 'Describe your suggestion or feedback clearly...',
    feedbackUrlLabel: 'URL or Related Portal (optional)',
    feedbackUrlPlaceholder: 'https://example.org or platform name',
    feedbackInstitutionLabel: 'Field or Institution (optional)',
    feedbackInstitutionPlaceholder: 'e.g. MIT / Computer Science',
    feedbackEmailLabel: 'Email for Follow-up (optional)',
    feedbackEmailPlaceholder: 'your.email@university.edu',
    feedbackRatingLabel: 'Experience Rating',
    feedbackSubmitBtn: 'Submit Feedback',
    feedbackSuccessBanner: 'Feedback recorded successfully. Thank you for your contribution.',
    feedbackHistoryTitle: 'Contribution History',
    feedbackHistoryEmpty: 'No feedback submitted in this browser yet.',
    filterStrictlyFree: 'Open Access Only',
    allCategories: 'All Categories ({count})',

    platformSearchBtn: 'Search on {name}',
    enterTopicAbove: 'Enter search terms above',
    coverageLabel: 'Field:',
    categoryLabel: 'Category:',

    federatedTitle: 'Scientific Papers Found',
    federatedCount: '{displayed} of {total} papers',
    querying: 'Searching papers...',
    itemsLatency: '{count} papers ({latency}ms)',
    unavailable: 'Unavailable',
    filtersLabel: 'Filters:',
    filterOnlyOa: 'Open Access only (PDF)',
    showAllSources: 'Show all sources ✕',
    sortByLabel: 'Sort by:',
    sortRelevance: 'Relevance',
    sortCitations: 'Most cited',
    sortYear: 'Most recent',
    savedInMatrix: 'Saved to Library',
    savePaperBtn: 'Save Paper',
    noAuthors: 'Authors not listed',
    collapseAbstract: 'Hide abstract',
    readFullAbstract: 'Read full abstract',
    openPage: 'View page',
    freePdf: 'Open PDF',
    copyCitation: 'Copy citation:',
    emptyFederatedTitle: 'Academic Search Ready',
    emptyFederatedDesc:
      'Enter search terms above to query open repositories, view abstracts, and access full-text papers.',

    savedTitle: 'Saved Papers ({count} {label})',
    savedSubtitle: 'Papers stored locally in this browser for review and citation export.',
    studySingular: 'paper',
    studyPlural: 'papers',
    downloadCsv: 'Export Spreadsheet (CSV)',
    downloadBib: 'Export BibTeX (.bib)',
    copyAll: 'Copy Citations ({format})',
    clearAll: 'Clear Library',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityReview: 'Review',
    removeTooltip: 'Remove paper',
    notesLabel: 'Research notes:',
    notesPlaceholder: 'Add findings, methodology notes, or comments...',
    openSource: 'View Paper',
    downloadFullPdf: 'Download PDF',
    emptySavedTitle: 'No papers saved yet',
    emptySavedDesc:
      'Click "Save Paper" in search results to organize your references and export citations in ABNT, APA, or BibTeX.',

    bbTitle: 'Boolean Expression Builder',
    bbSubtitle: 'Combine keywords to refine search results.',
    bbClear: 'Clear',
    bbMainConcept: 'Primary Topic',
    bbMainConceptPh: 'Central research topic',
    bbAndTerms: 'Required Terms (AND)',
    bbAndTermsPh: 'Words that must also be present',
    bbOrTerms: 'Alternative Terms (OR)',
    bbOrTermsPh: 'Synonyms or accepted variants',
    bbExactPhrase: 'Exact Phrase',
    bbExactPhrasePh: 'Exact phrase in quotes',
    bbNotTerms: 'Exclude Terms (NOT)',
    bbNotTermsPh: 'Words to exclude',
    bbStartYear: 'Starting Year',
    bbAnyYear: 'Any year',
    bbFromYear: 'Since {year}',
    bbStudyDesign: 'Study Type',
    bbAllDesigns: 'All study types',
    bbSystematicReview: 'Systematic Review',
    bbRct: 'Clinical Trial',
    bbEmpiricalCausal: 'Empirical Study',
    bbCompiledString: 'Generated expression:',
    bbCompiledEmpty: 'Fill fields above to compose the boolean search',
    bbApplyBtn: 'Apply to Search Bar',

    catGlobalIndex: 'Global Databases & Repositories',
    catGlobalIndexSub: 'Broad academic indexing services and preprint servers.',
    catCommercialPublishers: 'Academic Publishers',
    catCommercialPublishersSub: 'Journals accessed via subscription or institutional license.',
    catRegionalLatam: 'Latin America & Iberia',
    catRegionalLatamSub: 'Regional scientific literature, public journals, and dissertations.',
    catAiSynthesis: 'Semantic Analysis Engines',
    catAiSynthesisSub: 'Platforms providing evidence summaries and citation context.',
    catCitationGraph: 'Citation Networks',
    catCitationGraphSub: 'Visual mapping of bibliographic connections between studies.',
    catEvidenceHealth: 'Health & Medicine',
    catEvidenceHealthSub: 'Biomedical literature, systematic reviews, and clinical trials.',

    accessGratuito: 'Open Access',
    accessAbertoInst: 'Institutional Access',
    accessFreemium: 'Free with Limits',
    accessPago: 'Subscription',

    presetCoreGold: 'Core Standard (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO, and Consensus.',
    presetGlobalPublishers: 'Major Publishers (8 Bases)',
    presetGlobalPublishersDesc: 'Web of Science, Scopus, ScienceDirect, IEEE Xplore, ACM, Springer, Wiley, and JSTOR.',
    presetStemTech: 'STEM & Technology (6 Bases)',
    presetStemTechDesc: 'IEEE Xplore, ACM DL, arXiv, ScienceDirect, SpringerLink, and DBLP.',
    preset100Free: 'Open Access (10 Bases)',
    preset100FreeDesc: 'Freely accessible platforms without paywalls.',
    presetBrasilLatam: 'Iberia & Latin America (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, CAPES Periodicals, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet, and RCAAP.',
    presetEconPolicy: 'Social Sciences & Economics (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO, and Google Scholar.',
    presetCsAi: 'Computing & Data (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons, and The Lens.',
    presetAiCitation: 'Synthesis & Graphs (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers, and Open Knowledge Maps.',
    presetBiomed: 'Health & Medicine (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv, and LILACS.',
    presetAi: 'Artificial Intelligence & Machine Learning',
    presetAiDesc: 'Hugging Face Papers, Papers With Code, OpenReview, ACL Anthology, and arXiv.',
    presetHealth: 'Health, Medicine & Pharmacology',
    presetHealthDesc: 'PubMed, Europe PMC, Cochrane Library, bioRxiv, medRxiv, and ClinicalTrials.gov.',
    presetGames: 'Games, Ludology & Interactive Media',
    presetGamesDesc: 'DiGRA Digital Library, Game Studies, GDC Vault, and IEEE Transactions on Games.',
    presetArt: 'Art, Design & Visual Culture',
    presetArtDesc: 'Getty Research Portal, Smithsonian Open Access, Met Museum, and AIGA Design Archives.',
    presetSoftware: 'Software Engineering & Development',
    presetSoftwareDesc: 'DBLP, GitHub Research, Software Heritage, and ACM SIGSOFT.',
    presetHardware: 'Hardware, Semiconductors & Architecture',
    presetHardwareDesc: 'WikiChip, IEEE Micro, Hot Chips, and arXiv Hardware Architecture.',

    thematicAreasTitle: 'Thematic Field',
    areaAll: 'All Fields',
    areaTecnologia: 'Technology & Innovation',
    areaIa: 'Artificial Intelligence',
    areaSaude: 'Health & Medicine',
    areaArte: 'Art & Design',
    areaGames: 'Games & Play Studies',
    areaSoftware: 'Development & Software',
    areaHardware: 'Hardware & Chips',
    areaMultidisciplinar: 'Multidisciplinary',
  },

  es: {
    appName: 'CARTOGRAPH',
    appTagline: 'Metabúsqueda Académica',
    systemBarSubtitle: 'Búsqueda integrada en revistas científicas y repositorios abiertos',
    bridgeActive: 'Bridge nativo activo ({osName})',
    bridgeOffline: 'Ejecutando en navegador',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Búsqueda Académica Unificada',
    heroSubtitle:
      'Consulte artículos, preprints y publicaciones en bases científicas abiertas e institucionales.',
    searchPlaceholder: 'Buscar por tema, autor, artículo o palabras clave...',
    btnSearchApis: 'Buscar Artículos',
    btnLaunchTabs: 'Abrir Portales ({count})',
    btnTotalSearch: 'Búsqueda Completa',
    translateBtn: 'Traducir ES → EN',
    booleanBuilderBtn: 'Filtros Booleanos',
    platformsOpenedBridge: '{count} portales académicos abiertos en el navegador.',
    platformsOpenedBrowser: '{count} pestañas abiertas por el navegador.',
    termTranslatedBanner: 'Término traducido para búsqueda internacional: "{term}"',
    booleanAppliedBanner: 'Filtros booleanos aplicados a la búsqueda.',

    presetsTitle: 'Perfiles de Búsqueda:',
    selectAll: 'Marcar Todas ({count})',
    clearSelection: 'Desmarcar Todas',

    tabPlatforms: 'Bases & Portales ({count})',
    tabFederated: 'Artículos Encontrados ({count})',
    tabSaved: 'Biblioteca ({count})',
    tabFeedback: 'Comentarios & Sugerencias',
    feedbackTitle: 'Contribuciones & Valoración',
    feedbackSubtitle:
      'Sugiera nuevas fuentes científicas, reporte enlaces caídos o proponga mejoras para Cartograph.',
    feedbackTypeLabel: 'Tipo de Contribución',
    feedbackTypeSuggestion: 'Sugerir Nueva Base / Portal',
    feedbackTypeCorrection: 'Reportar Enlace Caído o Error',
    feedbackTypeFeature: 'Sugerencia Funcional',
    feedbackTypeGeneral: 'Valoración General',
    feedbackSubjectLabel: 'Título',
    feedbackSubjectPlaceholder: 'Ej: Añadir repositorio SciELO Libros',
    feedbackMessageLabel: 'Descripción',
    feedbackMessagePlaceholder: 'Describa su sugerencia o comentario con claridad...',
    feedbackUrlLabel: 'URL o Portal Relacionado (opcional)',
    feedbackUrlPlaceholder: 'https://ejemplo.org o nombre de la base',
    feedbackInstitutionLabel: 'Campo o Institución (opcional)',
    feedbackInstitutionPlaceholder: 'Ej: UBA / Ciencias de la Computación',
    feedbackEmailLabel: 'Correo Electrónico (opcional)',
    feedbackEmailPlaceholder: 'su.correo@universidad.edu',
    feedbackRatingLabel: 'Valoración de la Experiencia',
    feedbackSubmitBtn: 'Enviar Comentario',
    feedbackSuccessBanner: 'Comentario registrado con éxito. Gracias por su contribución.',
    feedbackHistoryTitle: 'Historial de Contribuciones',
    feedbackHistoryEmpty: 'No hay comentarios enviados en este navegador aún.',
    filterStrictlyFree: 'Solo Acceso Abierto',
    allCategories: 'Todas las Categorías ({count})',

    platformSearchBtn: 'Buscar en {name}',
    enterTopicAbove: 'Escriba un tema para buscar',
    coverageLabel: 'Campo:',
    categoryLabel: 'Categoría:',

    federatedTitle: 'Artículos Científicos Encontrados',
    federatedCount: '{displayed} de {total} artículos',
    querying: 'Buscando artículos...',
    itemsLatency: '{count} artículos ({latency}ms)',
    unavailable: 'No disponible',
    filtersLabel: 'Filtros:',
    filterOnlyOa: 'Solo texto completo (Open Access)',
    showAllSources: 'Mostrar todas las fuentes ✕',
    sortByLabel: 'Ordenar por:',
    sortRelevance: 'Relevancia',
    sortCitations: 'Más citados',
    sortYear: 'Más recientes',
    savedInMatrix: 'Guardado en Biblioteca',
    savePaperBtn: 'Guardar Artículo',
    noAuthors: 'Autores no informados',
    collapseAbstract: 'Plegar resumen',
    readFullAbstract: 'Leer resumen completo',
    openPage: 'Ver página',
    freePdf: 'PDF Abierto',
    copyCitation: 'Copiar cita:',
    emptyFederatedTitle: 'Búsqueda Académica Lista',
    emptyFederatedDesc:
      'Escriba términos de búsqueda arriba para consultar repositorios abiertos, ver resúmenes y acceder a textos completos.',

    savedTitle: 'Artículos Guardados ({count} {label})',
    savedSubtitle: 'Artículos guardados localmente para consulta y exportación de referencias.',
    studySingular: 'artículo',
    studyPlural: 'artículos',
    downloadCsv: 'Exportar Tabla (CSV)',
    downloadBib: 'Exportar BibTeX (.bib)',
    copyAll: 'Copiar Referencias ({format})',
    clearAll: 'Limpiar Biblioteca',
    priorityHigh: 'Alta',
    priorityMedium: 'Media',
    priorityReview: 'Revisar',
    removeTooltip: 'Eliminar artículo',
    notesLabel: 'Notas de investigación:',
    notesPlaceholder: 'Añada notas sobre metodología, hallazgos o comentarios...',
    openSource: 'Ver Artículo',
    downloadFullPdf: 'Descargar PDF',
    emptySavedTitle: 'Ningún artículo guardado',
    emptySavedDesc:
      'Haga clic en "Guardar Artículo" en los resultados para organizar su revisión y exportar citas en ABNT, APA o BibTeX.',

    bbTitle: 'Constructor de Expresión Booleana',
    bbSubtitle: 'Combine palabras clave para refinar los resultados.',
    bbClear: 'Limpiar',
    bbMainConcept: 'Tema Principal',
    bbMainConceptPh: 'Tema central de investigación',
    bbAndTerms: 'Términos Requeridos (AND)',
    bbAndTermsPh: 'Palabras que también deben estar presentes',
    bbOrTerms: 'Términos Alternativos (OR)',
    bbOrTermsPh: 'Sinónimos o variantes aceptadas',
    bbExactPhrase: 'Frase Exacta',
    bbExactPhrasePh: 'Frase exacta entre comillas',
    bbNotTerms: 'Excluir Términos (NOT)',
    bbNotTermsPh: 'Palabras a desestimar',
    bbStartYear: 'A Partir del Año',
    bbAnyYear: 'Cualquier año',
    bbFromYear: 'Desde {year}',
    bbStudyDesign: 'Tipo de Estudio',
    bbAllDesigns: 'Todos los estudios',
    bbSystematicReview: 'Revisión Sistemática',
    bbRct: 'Ensayo Clínico',
    bbEmpiricalCausal: 'Estudio Empírico',
    bbCompiledString: 'Expresión generada:',
    bbCompiledEmpty: 'Complete los campos para armar la búsqueda',
    bbApplyBtn: 'Aplicar en Búsqueda',

    catGlobalIndex: 'Bases Globales & Repositorios',
    catGlobalIndexSub: 'Grandes índices académicos mundiales y servidores de preprints.',
    catCommercialPublishers: 'Editoriales Científicas',
    catCommercialPublishersSub: 'Revistas con acceso por suscripción o convenio institucional.',
    catRegionalLatam: 'América Latina & Península Ibérica',
    catRegionalLatamSub: 'Literatura científica regional, revistas públicas y tesis.',
    catAiSynthesis: 'Bases con Análisis Semántico',
    catAiSynthesisSub: 'Plataformas con síntesis de evidencia y contexto de citas.',
    catCitationGraph: 'Redes de Citación',
    catCitationGraphSub: 'Mapeo visual de conexiones bibliográficas entre estudios.',
    catEvidenceHealth: 'Salud & Medicina',
    catEvidenceHealthSub: 'Literatura biomédica, revisiones de salud y ensayos clínicos.',

    accessGratuito: 'Acceso Abierto',
    accessAbertoInst: 'Acceso Institucional',
    accessFreemium: 'Gratuito con Límite',
    accessPago: 'Suscripción',

    presetCoreGold: 'Núcleo Principal (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO y Consensus.',
    presetGlobalPublishers: 'Editoriales Internacionales (8 Bases)',
    presetGlobalPublishersDesc: 'Web of Science, Scopus, ScienceDirect, IEEE Xplore, ACM, Springer, Wiley y JSTOR.',
    presetStemTech: 'Ciencias Exactas & Tecnología (6 Bases)',
    presetStemTechDesc: 'IEEE Xplore, ACM DL, arXiv, ScienceDirect, SpringerLink y DBLP.',
    preset100Free: 'Acceso Abierto (10 Bases)',
    preset100FreeDesc: 'Plataformas de libre acceso sin muros de pago.',
    presetBrasilLatam: 'Iberoamérica & LatAm (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, Periódicos CAPES, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet y RCAAP.',
    presetEconPolicy: 'Ciencias Sociales & Economía (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO y Google Scholar.',
    presetCsAi: 'Computación & Datos (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons y The Lens.',
    presetAiCitation: 'Síntesis & Grafos (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers y Open Knowledge Maps.',
    presetBiomed: 'Salud & Medicina (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv y LILACS.',
    presetAi: 'Inteligencia Artificial & Aprendizaje Automático',
    presetAiDesc: 'Hugging Face Papers, Papers With Code, OpenReview, ACL Anthology y arXiv.',
    presetHealth: 'Salud, Medicina & Farmacología',
    presetHealthDesc: 'PubMed, Europe PMC, Cochrane Library, bioRxiv, medRxiv y ClinicalTrials.gov.',
    presetGames: 'Juegos, Ludología & Medios Interactivos',
    presetGamesDesc: 'DiGRA Digital Library, Game Studies, GDC Vault e IEEE Transactions on Games.',
    presetArt: 'Arte, Diseño & Cultura Visual',
    presetArtDesc: 'Getty Research Portal, Smithsonian Open Access, Met Museum y AIGA Design Archives.',
    presetSoftware: 'Ingeniería de Software & Desarrollo',
    presetSoftwareDesc: 'DBLP, GitHub Research, Software Heritage y ACM SIGSOFT.',
    presetHardware: 'Hardware, Semiconductores & Arquitectura',
    presetHardwareDesc: 'WikiChip, IEEE Micro, Hot Chips y arXiv Hardware Architecture.',

    thematicAreasTitle: 'Área Temática',
    areaAll: 'Todas las Áreas',
    areaTecnologia: 'Tecnología & Innovación',
    areaIa: 'Inteligencia Artificial',
    areaSaude: 'Salud & Medicina',
    areaArte: 'Arte & Diseño',
    areaGames: 'Juegos & Game Studies',
    areaSoftware: 'Desarrollo & Software',
    areaHardware: 'Hardware & Chips',
    areaMultidisciplinar: 'Multidisciplinar',
  },

  fr: {
    appName: 'CARTOGRAPH',
    appTagline: 'Métarecherche Académique',
    systemBarSubtitle: 'Recherche unifiée dans les revues scientifiques et les archives ouvertes',
    bridgeActive: 'Bridge natif actif ({osName})',
    bridgeOffline: 'Exécution locale dans le navigateur',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Recherche Académique Unifiée',
    heroSubtitle:
      'Consultez articles, prépublications et revues scientifiques dans les bases ouvertes et institutionnelles.',
    searchPlaceholder: 'Rechercher par thème, auteur, titre ou mots-clés...',
    btnSearchApis: 'Rechercher des Articles',
    btnLaunchTabs: 'Ouvrir les Portails ({count})',
    btnTotalSearch: 'Recherche Complète',
    translateBtn: 'Traduire en Anglais',
    booleanBuilderBtn: 'Filtres Booléens',
    platformsOpenedBridge: '{count} portails ouverts dans le navigateur.',
    platformsOpenedBrowser: '{count} onglets ouverts par le navigateur.',
    termTranslatedBanner: 'Terme traduit pour la recherche : "{term}"',
    booleanAppliedBanner: 'Filtres booléens appliqués à la recherche.',

    presetsTitle: 'Profils de Recherche :',
    selectAll: 'Tout Sélectionner ({count})',
    clearSelection: 'Tout Désélectionner',

    tabPlatforms: 'Bases & Portails ({count})',
    tabFederated: 'Articles Trouvés ({count})',
    tabSaved: 'Bibliothèque ({count})',
    tabFeedback: 'Retours & Suggestions',
    feedbackTitle: 'Contributions & Avis',
    feedbackSubtitle:
      'Proposez de nouvelles sources scientifiques, signalez un lien brisé ou suggérez des améliorations.',
    feedbackTypeLabel: 'Type de Contribution',
    feedbackTypeSuggestion: 'Suggérer une Nouvelle Base / Portail',
    feedbackTypeCorrection: 'Signaler un Lien Brisé ou Problème',
    feedbackTypeFeature: 'Suggestion Fonctionnelle',
    feedbackTypeGeneral: 'Avis Général',
    feedbackSubjectLabel: 'Titre',
    feedbackSubjectPlaceholder: 'Ex : Ajouter le dépôt SciELO Livres',
    feedbackMessageLabel: 'Description',
    feedbackMessagePlaceholder: 'Décrivez clairement votre suggestion ou remarque...',
    feedbackUrlLabel: 'URL ou Portail Associé (facultatif)',
    feedbackUrlPlaceholder: 'https://exemple.org ou nom de la plateforme',
    feedbackInstitutionLabel: 'Discipline ou Établissement (facultatif)',
    feedbackInstitutionPlaceholder: 'Ex : Sorbonne / Informatique',
    feedbackEmailLabel: 'Courriel de Contact (facultatif)',
    feedbackEmailPlaceholder: 'votre.courriel@universite.edu',
    feedbackRatingLabel: "Évaluation de l'Expérience",
    feedbackSubmitBtn: 'Envoyer le Retour',
    feedbackSuccessBanner: 'Retour enregistré avec succès. Merci pour votre contribution.',
    feedbackHistoryTitle: 'Historique des Contributions',
    feedbackHistoryEmpty: 'Aucun retour envoyé dans ce navigateur pour le moment.',
    filterStrictlyFree: 'Accès Ouvert Uniquement',
    allCategories: 'Toutes les Catégories ({count})',

    platformSearchBtn: 'Rechercher sur {name}',
    enterTopicAbove: 'Saisissez un terme de recherche',
    coverageLabel: 'Domaine :',
    categoryLabel: 'Catégorie :',

    federatedTitle: 'Articles Scientifiques Trouvés',
    federatedCount: '{displayed} sur {total} articles',
    querying: "Recherche d'articles...",
    itemsLatency: '{count} articles ({latency}ms)',
    unavailable: 'Non disponible',
    filtersLabel: 'Filtres :',
    filterOnlyOa: 'Texte intégral uniquement (Open Access)',
    showAllSources: 'Afficher toutes les sources ✕',
    sortByLabel: 'Trier par :',
    sortRelevance: 'Pertinence',
    sortCitations: 'Plus cités',
    sortYear: 'Plus récents',
    savedInMatrix: 'Enregistré dans la Bibliothèque',
    savePaperBtn: "Enregistrer l'Article",
    noAuthors: 'Auteurs non précisés',
    collapseAbstract: 'Masquer le résumé',
    readFullAbstract: 'Lire le résumé complet',
    openPage: 'Voir la page',
    freePdf: 'PDF Ouvert',
    copyCitation: 'Copier la citation :',
    emptyFederatedTitle: 'Recherche Académique Prête',
    emptyFederatedDesc:
      'Saisissez des termes de recherche ci-dessus pour interroger les archives ouvertes, consulter les résumés et accéder aux textes intégraux.',

    savedTitle: 'Articles Enregistrés ({count} {label})',
    savedSubtitle: 'Articles conservés localement pour consultation et exportation de références.',
    studySingular: 'article',
    studyPlural: 'articles',
    downloadCsv: 'Exporter Tableau (CSV)',
    downloadBib: 'Exporter BibTeX (.bib)',
    copyAll: 'Copier Références ({format})',
    clearAll: 'Vider la Bibliothèque',
    priorityHigh: 'Haute',
    priorityMedium: 'Moyenne',
    priorityReview: 'À évaluer',
    removeTooltip: "Retirer l'article",
    notesLabel: 'Notes de recherche :',
    notesPlaceholder: "Ajoutez des observations, la méthodologie ou des notes d'analyse...",
    openSource: "Consulter l'Article",
    downloadFullPdf: 'Télécharger le PDF',
    emptySavedTitle: 'Aucun article enregistré',
    emptySavedDesc:
      "Cliquez sur \"Enregistrer l'Article\" dans les résultats pour organiser vos références et exporter en ABNT, APA ou BibTeX.",

    bbTitle: "Constructeur d'Expression Booléenne",
    bbSubtitle: 'Combinez des mots-clés pour affiner la recherche.',
    bbClear: 'Effacer',
    bbMainConcept: 'Thème Principal',
    bbMainConceptPh: 'Sujet central de recherche',
    bbAndTerms: 'Termes Requis (AND)',
    bbAndTermsPh: 'Termes qui doivent être présents',
    bbOrTerms: 'Termes Alternatifs (OR)',
    bbOrTermsPh: 'Synonymes ou variantes admises',
    bbExactPhrase: 'Expression Exacte',
    bbExactPhrasePh: 'Expression exacte entre guillemets',
    bbNotTerms: 'Exclure des Termes (NOT)',
    bbNotTermsPh: 'Mots à écarter',
    bbStartYear: "À Partir de l'Année",
    bbAnyYear: 'Toute année',
    bbFromYear: 'Depuis {year}',
    bbStudyDesign: "Type d'Étude",
    bbAllDesigns: "Tous les types d'étude",
    bbSystematicReview: 'Revue Systématique',
    bbRct: 'Essai Clinique',
    bbEmpiricalCausal: 'Étude Empirique',
    bbCompiledString: 'Expression générée :',
    bbCompiledEmpty: 'Remplissez les champs pour composer la recherche',
    bbApplyBtn: 'Appliquer à la Recherche',

    catGlobalIndex: 'Bases Mondiales & Archives',
    catGlobalIndexSub: 'Grands index universitaires et serveurs de prépublications.',
    catCommercialPublishers: 'Éditeurs Scientifiques',
    catCommercialPublishersSub: 'Revues accessibles par abonnement ou licence institutionnelle.',
    catRegionalLatam: 'Amérique Latine & Péninsule Ibérique',
    catRegionalLatamSub: 'Littérature scientifique régionale, revues publiques et thèses.',
    catAiSynthesis: 'Bases avec Analyse Sémantique',
    catAiSynthesisSub: 'Plateformes offrant des synthèses de résultats et le contexte des citations.',
    catCitationGraph: 'Réseaux de Citations',
    catCitationGraphSub: 'Représentation visuelle des liens bibliographiques entre études.',
    catEvidenceHealth: 'Santé & Médecine',
    catEvidenceHealthSub: 'Littérature biomédicale, revues en santé et essais cliniques.',

    accessGratuito: 'Accès Ouvert',
    accessAbertoInst: 'Accès Institutionnel',
    accessFreemium: 'Gratuit avec Limite',
    accessPago: 'Abonnement',

    presetCoreGold: 'Noyau Standard (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO et Consensus.',
    presetGlobalPublishers: 'Grands Éditeurs (8 Bases)',
    presetGlobalPublishersDesc: 'Web of Science, Scopus, ScienceDirect, IEEE Xplore, ACM, Springer, Wiley et JSTOR.',
    presetStemTech: 'Sciences Exactes & Technologie (6 Bases)',
    presetStemTechDesc: 'IEEE Xplore, ACM DL, arXiv, ScienceDirect, SpringerLink et DBLP.',
    preset100Free: 'Accès Ouvert (10 Bases)',
    preset100FreeDesc: 'Plateformes librement accessibles sans péage.',
    presetBrasilLatam: 'Ibéro-Amérique & LatAm (8 Bases)',
    presetBrasilLatamDesc: 'SciELO, CAPES, BDTD, Oasisbr, LA Referencia, Redalyc, Dialnet et RCAAP.',
    presetEconPolicy: 'Sciences Sociales & Économie (6 Bases)',
    presetEconPolicyDesc: 'IDEAS/RePEc, SSRN, SPELL, OpenAlex, SciELO et Google Scholar.',
    presetCsAi: 'Informatique & Données (6 Bases)',
    presetCsAiDesc: 'arXiv, DBLP, Semantic Scholar, Zenodo (CERN), DataCite Commons et The Lens.',
    presetAiCitation: 'Synthèse & Graphes (6 Bases)',
    presetAiCitationDesc: 'Consensus, Elicit, Scite, Perplexity Academic, Connected Papers et Open Knowledge Maps.',
    presetBiomed: 'Santé & Médecine (7 Bases)',
    presetBiomedDesc: 'PubMed, Europe PMC, Cochrane Library, Epistemonikos, ClinicalTrials.gov, medRxiv et LILACS.',
    presetAi: 'Intelligence Artificielle & Machine Learning',
    presetAiDesc: 'Hugging Face Papers, Papers With Code, OpenReview, ACL Anthology et arXiv.',
    presetHealth: 'Santé, Médecine & Pharmacologie',
    presetHealthDesc: 'PubMed, Europe PMC, Cochrane Library, bioRxiv, medRxiv et ClinicalTrials.gov.',
    presetGames: 'Jeux Vidéo & Études Ludiques',
    presetGamesDesc: 'DiGRA Digital Library, Game Studies, GDC Vault et IEEE Transactions on Games.',
    presetArt: 'Art, Design & Culture Visuelle',
    presetArtDesc: 'Getty Research Portal, Smithsonian Open Access, Met Museum et AIGA Design Archives.',
    presetSoftware: 'Génie Logiciel & Développement',
    presetSoftwareDesc: 'DBLP, GitHub Research, Software Heritage et ACM SIGSOFT.',
    presetHardware: 'Matériel, Semi-conducteurs & Architecture',
    presetHardwareDesc: 'WikiChip, IEEE Micro, Hot Chips et arXiv Hardware Architecture.',

    thematicAreasTitle: 'Domaine Thématique',
    areaAll: 'Tous les Domaines',
    areaTecnologia: 'Technologie & Innovation',
    areaIa: 'Intelligence Artificielle',
    areaSaude: 'Santé & Médecine',
    areaArte: 'Art & Design',
    areaGames: 'Jeux & Ludologie',
    areaSoftware: 'Développement & Logiciel',
    areaHardware: 'Matériel & Puces',
    areaMultidisciplinar: 'Multidisciplinaire',
  },
};
