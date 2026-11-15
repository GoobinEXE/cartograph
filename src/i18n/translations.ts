export type SupportedLanguage = 'pt' | 'en';
export type LanguageCode = SupportedLanguage;

export interface Translations {
  appName: string;
  appTagline: string;
  brandTitle: string;
  systemBarSubtitle: string;
  bridgeActive: string;
  bridgeOffline: string;
  keyboardShortcut: string;

  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  clearSearchTitle: string;
  shareSearchTitle: string;
  shareLinkCopied: string;
  shareLinkError: string;
  translateTitle: string;
  searchBtn: string;
  btnSearchApis: string;
  btnLaunchTabs: string;
  openPortalsCount: string;
  openPortalsTitle: string;
  btnTotalSearch: string;
  translateBtn: string;
  booleanBuilderBtn: string;
  toggleThemeTitle: string;
  languageAutoSystem: string;
  languageSystemHint: string;
  languageMenuLabel: string;
  platformsOpenedBridge: string;
  platformsOpenedBrowser: string;
  assistedLaunchNotice: string;
  termTranslatedBanner: string;
  booleanAppliedBanner: string;

  presetsTitle: string;
  selectAll: string;
  clearSelection: string;

  tabPlatforms: string;
  tabFederated: string;
  tabSaved: string;
  tabFeedback: string;
  tabAbout: string;
  feedbackTitle: string;
  feedbackSubtitle: string;
  feedbackBadge: string;
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
  feedbackRatingOutOf: string;
  feedbackFooterHint: string;
  feedbackSubmitBtn: string;
  feedbackSubmittingBtn: string;
  feedbackSuccessBanner: string;
  feedbackLocalNotice: string;
  feedbackHistoryTitle: string;
  feedbackHistoryEmpty: string;
  feedbackCopyMarkdownTitle: string;
  feedbackCopyBtn: string;
  feedbackRemoveHistoryTitle: string;
  feedbackInstitutionPrefix: string;
  feedbackFooterNote: string;
  feedbackMarkdownHeader: string;
  feedbackMarkdownType: string;
  feedbackMarkdownRating: string;
  feedbackMarkdownDate: string;
  feedbackMarkdownInstitution: string;
  feedbackMarkdownUrl: string;
  feedbackMarkdownContact: string;

  filterStrictlyFree: string;
  allCategories: string;

  sidebarAriaLabel: string;
  filtersNavTitle: string;
  collapseAll: string;
  expandAll: string;
  collapseAllTitle: string;
  expandAllTitle: string;
  clearFilter: string;
  accessModelTitle: string;
  accessModelAll: string;
  accessModelFree: string;
  accessModelPaid: string;
  accessModelInstitutional: string;
  accessModelFreemium: string;
  accessShortFree: string;
  accessShortPaid: string;
  accessShortInst: string;
  accessShortFreemium: string;
  quickSelectionTitle: string;
  quickSelectionTitleAttr: string;
  quickSelectionActiveCount: string;
  quickSelectionAllBtn: string;
  platformTypeTitle: string;
  platformTypeAll: string;
  directoryResultsSummary: string;
  gridViewTitle: string;
  listViewTitle: string;
  includeInBatchTitle: string;
  cardSearchAction: string;
  cardOpenAction: string;
  cardOpenPortalAction: string;

  platformSearchBtn: string;
  enterTopicAbove: string;
  coverageLabel: string;
  categoryLabel: string;

  federatedTitle: string;
  federatedCount: string;
  federatedSidebarAria: string;
  saveToSlotTitle: string;
  createNewSlotTitle: string;
  newBtn: string;
  ungroupedOption: string;
  slotPrefix: string;
  slotPlaceholder: string;
  cancelBtn: string;
  createSlotBtn: string;
  slotHelperPrefix: string;
  slotHelperUngrouped: string;
  sortShortCitations: string;
  sortShortYear: string;
  availabilityTitle: string;
  availabilityOpenAccessOnly: string;
  queriedSourcesTitle: string;
  allSourcesOption: string;
  progressAriaLabel: string;
  queryingAllProgress: string;
  queryingSourceProgress: string;
  papersDisplayedSuffix: string;
  showingResultsSummary: string;
  duplicatesMergedCount: string;
  duplicatesMergedTitle: string;
  loadingResultsAria: string;
  sourceErrorTitle: string;
  sourceTimeoutFallback: string;
  backToAllSources: string;
  noPapersInViewTitle: string;
  noOpenAccessMatchDesc: string;
  noSourceMatchDesc: string;
  noSourceFallbackName: string;
  noAllSourcesMatchDesc: string;
  hideStructuredSections: string;
  viewStructuredAbstract: string;
  labelObjective: string;
  labelMethodsSample: string;
  labelMethodsDesign: string;
  labelSampleParticipants: string;
  labelResults: string;
  labelConclusion: string;
  savedShort: string;
  saveShort: string;
  saveIntoGroup: string;
  changePaperGroupTitle: string;
  ungroupedShort: string;
  citedByCount: string;
  citePrefix: string;
  waitingMoreSourcesSingular: string;
  waitingMoreSourcesPlural: string;

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
  relevanceMethodCaption: string;
  relevanceScoreBadge: string;
  relevanceBreakdownTitle: string;
  sourceCountSingular: string;
  sourceCountPlural: string;
  corroboratedSourcesBadge: string;
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
  clearSlot: string;
  clearAllTitle: string;
  clearSlotTitle: string;
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

  savedSidebarAria: string;
  newResearchGroupTitle: string;
  groupColorAria: string;
  colorPrefix: string;
  createSlotPlusBtn: string;
  defaultSaveTargetTitle: string;
  defaultSaveTargetDescPrefix: string;
  defaultSaveTargetDescSuffix: string;
  librarySlotsTitle: string;
  allPapersSlot: string;
  activeBadge: string;
  researchGroupsCount: string;
  noGroupsHint: string;
  saveNameTitle: string;
  renameGroupTitle: string;
  deleteGroupTitle: string;
  localBackupTitle: string;
  localBackupDesc: string;
  restoreModeLabel: string;
  restoreModeMerge: string;
  restoreModeReplace: string;
  importBtn: string;
  backupJsonBtn: string;
  backupJsonTitle: string;
  backupExportedFeedback: string;
  backupFailedFeedback: string;
  backupRestoredFeedback: string;
  backupMergedFeedback: string;
  importInvalidFeedback: string;
  importSuccessFeedback: string;
  importReadErrorFeedback: string;
  allLibraryPapersTitle: string;
  groupFallbackName: string;
  slotAllDesc: string;
  slotUngroupedDesc: string;
  slotGroupDesc: string;
  exportCsvCount: string;
  exportCsvTitle: string;
  subTabMatrix: string;
  subTabPrisma: string;
  emptyUngroupedTitle: string;
  emptyGroupTitle: string;
  emptySlotDesc: string;
  systematicScreeningLabel: string;
  filterAllCount: string;
  filterIncludedCount: string;
  filterExcludedCount: string;
  filterPendingCount: string;
  movePaperGroupTitle: string;
  prismaDecisionLabel: string;
  decisionInclude: string;
  decisionExclude: string;
  decisionPending: string;
  hideExtractedVars: string;
  showExtractedVars: string;
  noStructuredSectionsNotice: string;

  webLaunchTitle: string;
  webLaunchBlockedDesc: string;
  webLaunchDirectDesc: string;
  webLaunchCloseAria: string;
  webLaunchQueryLabel: string;
  webLaunchCopiedAll: string;
  webLaunchCopyAll: string;
  webLaunchOpenedBadge: string;
  webLaunchOpenBtn: string;
  webLaunchTip: string;
  webLaunchCloseBtn: string;

  footerBrandTitle: string;
  footerNavAria: string;
  footerAbout: string;
  footerApis: string;
  footerCitation: string;
  footerCopyright: string;
  footerPrivacy: string;
  footerRightsReserved: string;
  footerEngineeringNote: string;
  analyticsConsentAria: string;
  analyticsConsentText: string;
  analyticsDeclineBtn: string;
  analyticsAcceptBtn: string;

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
  catTechPatents: string;
  catTechPatentsSub: string;
  catNicheScience: string;
  catNicheScienceSub: string;

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
  presetTechPatents: string;
  presetTechPatentsDesc: string;
  presetAppliedLabs: string;
  presetAppliedLabsDesc: string;
  presetBioClimate: string;
  presetBioClimateDesc: string;
  presetGeoClimate: string;
  presetGeoClimateDesc: string;
  presetGenomicsMaterials: string;
  presetGenomicsMaterialsDesc: string;
  presetEconEmpirical: string;
  presetEconEmpiricalDesc: string;
  presetEconGlobalPolicy: string;
  presetEconGlobalPolicyDesc: string;
  presetEconPoliticalScience: string;
  presetEconPoliticalScienceDesc: string;

  scopeLabel: string;
  scopeAll: string;
  scopeGeneral: string;
  scopeEconPolicy: string;
  scopeHealth: string;
  scopeExactTech: string;

  proxyDoiButton: string;
  activeSubscriptionBadge: string;
  filterOwnedOnly: string;

  accessSettingsBtn: string;
  accessModalTitle: string;
  accessModalSubtitle: string;
  accessTabProxy: string;
  accessTabByok: string;
  accessTabSubscriptions: string;
  proxyEnableLabel: string;
  proxyModeLabel: string;
  proxyModePrefix: string;
  proxyModeCapesCafe: string;
  proxyTemplateLabel: string;
  proxyTemplatePlaceholder: string;
  proxyPresetsLabel: string;
  proxyPresetCapes: string;
  proxyPresetEzproxy: string;
  proxyPreviewLabel: string;
  proxyApplyToLabel: string;
  proxyLocalNotice: string;
  byokIntro: string;
  byokKeyLabel: string;
  byokInstTokenLabel: string;
  byokGetKeyLink: string;
  byokStatusActive: string;
  byokStatusInactive: string;
  byokClearBtn: string;
  byokToggleEnable: string;
  subsIntro: string;
  subsSelectCapesBtn: string;
  subsClearAllBtn: string;
  subsCountLabel: string;
  closeModalBtn: string;

  thematicAreasTitle: string;
  areaAll: string;
  areaTecnologia: string;
  areaIa: string;
  areaSaude: string;
  areaArte: string;
  areaGames: string;
  areaSoftware: string;
  areaHardware: string;
  areaCienciasExatas: string;
  areaBiociencias: string;
  areaGeociencias: string;
  areaEconomiaPoliticas: string;
  areaPatentesNormas: string;
  areaMultidisciplinar: string;

  areaShortMulti: string;
  areaShortTech: string;
  areaShortIa: string;
  areaShortSaude: string;
  areaShortExatas: string;
  areaShortBio: string;
  areaShortGeo: string;
  areaShortEcon: string;
  areaShortPatentes: string;
  areaShortArte: string;
  areaShortGames: string;
  areaShortSoftware: string;
  areaShortHardware: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  pt: {
    appName: 'CARTOGRAPH',
    appTagline: 'Metabusca Científica',
    brandTitle: 'Cartograph — Hub de Metabusca Científica',
    systemBarSubtitle: 'Pesquisa integrada em periódicos científicos e repositórios acadêmicos',
    bridgeActive: 'Bridge nativo ativo ({osName})',
    bridgeOffline: 'Execução local no navegador',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Pesquisa Acadêmica Integrada',
    heroSubtitle:
      'Consulte artigos, preprints e periódicos em bases científicas abertas e institucionais.',
    searchPlaceholder: 'Pesquise por tema, autor, artigo ou termos de busca...',
    clearSearchTitle: 'Limpar busca',
    shareSearchTitle: 'Copiar link compartilhável desta busca',
    shareLinkCopied: 'Link compartilhável da busca copiado para a área de transferência.',
    shareLinkError: 'Não foi possível copiar o link automaticamente.',
    translateTitle: 'Traduzir termos para inglês acadêmico',
    searchBtn: 'Buscar',
    btnSearchApis: 'Buscar Artigos',
    btnLaunchTabs: 'Abrir nos Portais ({count})',
    openPortalsCount: 'Abrir {count} portais',
    openPortalsTitle: 'Abrir pesquisa em abas nos portais selecionados (Shift + Enter)',
    btnTotalSearch: 'Busca Completa',
    translateBtn: 'Traduzir PT → EN',
    booleanBuilderBtn: 'Filtros Booleanos',
    toggleThemeTitle: 'Alternar modo Claro / Escuro',
    languageAutoSystem: 'Automático (Sistema)',
    languageSystemHint: 'Detectado pelo sistema',
    languageMenuLabel: 'Idioma da interface',
    platformsOpenedBridge: '{count} portais abertos no navegador.',
    platformsOpenedBrowser: '{count} abas abertas pelo navegador.',
    assistedLaunchNotice: '• Painel de abertura assistida exibido para contornar bloqueio de pop-ups.',
    termTranslatedBanner: 'Termo traduzido para busca internacional: "{term}"',
    booleanAppliedBanner: 'Filtros booleanos aplicados à pesquisa.',

    presetsTitle: 'Perfis de Busca:',
    selectAll: 'Marcar Todas ({count})',
    clearSelection: 'Desmarcar Todas',

    tabPlatforms: 'Bases & Portais ({count})',
    tabFederated: 'Artigos Encontrados ({count})',
    tabSaved: 'Biblioteca ({count})',
    tabFeedback: 'Feedback & Sugestões',
    tabAbout: 'Sobre & Legal',
    feedbackTitle: 'Contribuições & Avaliação',
    feedbackSubtitle:
      'Envie sugestões de novas fontes científicas, reporte inconsistências ou proponha aprimoramentos para o Cartograph.',
    feedbackBadge: 'Cartograph · Ciência Aberta',
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
    feedbackRatingOutOf: '{star} de 5',
    feedbackFooterHint: 'Seus comentários ajudam a aprimorar o catálogo e a precisão do Cartograph.',
    feedbackSubmitBtn: 'Enviar Feedback',
    feedbackSubmittingBtn: 'Registrando...',
    feedbackSuccessBanner: 'Feedback registrado com sucesso. Agradecemos sua contribuição.',
    feedbackLocalNotice:
      '(salvo no histórico local deste navegador — copie em Markdown para envio manual se desejar).',
    feedbackHistoryTitle: 'Histórico de Contribuições',
    feedbackHistoryEmpty: 'Nenhum feedback enviado neste navegador ainda.',
    feedbackCopyMarkdownTitle: 'Copiar em Markdown',
    feedbackCopyBtn: 'Copiar',
    feedbackRemoveHistoryTitle: 'Remover do histórico',
    feedbackInstitutionPrefix: 'Instituição:',
    feedbackFooterNote: 'Metabusca científica e revisão sistemática em ciência aberta.',
    feedbackMarkdownHeader: '### [Feedback Cartograph]',
    feedbackMarkdownType: 'Tipo:',
    feedbackMarkdownRating: 'Avaliação:',
    feedbackMarkdownDate: 'Data:',
    feedbackMarkdownInstitution: 'Instituição:',
    feedbackMarkdownUrl: 'URL/Base:',
    feedbackMarkdownContact: 'Contato:',

    filterStrictlyFree: 'Apenas Acesso Aberto',
    allCategories: 'Todas as Categorias ({count})',

    sidebarAriaLabel: 'Filtros e navegação de plataformas',
    filtersNavTitle: 'Filtros & Navegação',
    collapseAll: 'Recolher tudo',
    expandAll: 'Expandir tudo',
    collapseAllTitle: 'Recolher todas as gavetas',
    expandAllTitle: 'Expandir todas as gavetas',
    clearFilter: 'Limpar',
    accessModelTitle: 'Modelo de Acesso',
    accessModelAll: 'Todos os modelos',
    accessModelFree: '100% Gratuitas & Open',
    accessModelPaid: 'Pagas / Assinatura',
    accessModelInstitutional: 'Acesso Aberto + CAFe',
    accessModelFreemium: 'Gratuito c/ Cota IA',
    accessShortFree: 'Gratuito',
    accessShortPaid: 'Assinatura',
    accessShortInst: 'Institucional',
    accessShortFreemium: 'Freemium',
    quickSelectionTitle: 'Seleção Rápida',
    quickSelectionTitleAttr: '{selected} de {total} plataformas selecionadas',
    quickSelectionActiveCount: '{selected} de {total} ativas',
    quickSelectionAllBtn: 'Todas',
    platformTypeTitle: 'Tipo de Plataforma',
    platformTypeAll: 'Todas as categorias',
    directoryResultsSummary: '{visible} portais correspondentes · {selected} marcados para abertura simultânea',
    gridViewTitle: 'Visualização em blocos',
    listViewTitle: 'Visualização em lista acadêmica',
    includeInBatchTitle: 'Incluir na abertura em lote',
    cardSearchAction: 'Pesquisar ↗',
    cardOpenAction: 'Abrir ↗',
    cardOpenPortalAction: 'Abrir portal ↗',

    platformSearchBtn: 'Pesquisar em {name}',
    enterTopicAbove: 'Digite um termo de pesquisa',
    coverageLabel: 'Área:',
    categoryLabel: 'Categoria:',

    federatedTitle: 'Artigos Científicos Encontrados',
    federatedCount: '{displayed} de {total} artigos',
    federatedSidebarAria: 'Filtros e navegação de artigos encontrados',
    saveToSlotTitle: 'Salvar no Slot / Grupo',
    createNewSlotTitle: 'Criar novo slot de pesquisa',
    newBtn: 'Novo',
    ungroupedOption: 'Sem grupo (Geral)',
    slotPrefix: 'Slot:',
    slotPlaceholder: 'Ex: Jogos de IA, Medicamentos...',
    cancelBtn: 'Cancelar',
    createSlotBtn: 'Criar Slot',
    slotHelperPrefix: 'Escolha um grupo para organizar esta pesquisa ou mantenha em',
    slotHelperUngrouped: 'Sem grupo',
    sortShortCitations: 'Citações',
    sortShortYear: 'Ano',
    availabilityTitle: 'Disponibilidade',
    availabilityOpenAccessOnly: 'Somente Open Access',
    queriedSourcesTitle: 'Bases Consultadas',
    allSourcesOption: 'Todas as fontes',
    progressAriaLabel: 'Progresso da metabusca nas fontes científicas',
    queryingAllProgress: 'Consultando bases ({completed} de {total})',
    queryingSourceProgress: 'Consultando {label}... ({completed} de {total} bases)',
    papersDisplayedSuffix: '· {count} artigos exibidos',
    showingResultsSummary: 'Exibindo {displayed} de {total} artigos científicos encontrados',
    duplicatesMergedCount: '{count} duplicatas mescladas',
    duplicatesMergedTitle:
      '{doi} por DOI canônico, {ids} por ID persistente (PMID/arXiv), {fuzzy} por título (Jaro-Winkler)',
    loadingResultsAria: 'Carregando resultados',
    sourceErrorTitle: 'Consulta não concluída em {label}',
    sourceTimeoutFallback: 'O tempo limite de resposta da base foi atingido.',
    backToAllSources: 'Voltar para "Todas as fontes"',
    noPapersInViewTitle: 'Nenhum artigo encontrado nesta visualização',
    noOpenAccessMatchDesc:
      'Nenhum artigo com acesso aberto direto corresponde aos filtros atuais. Desmarque "Somente Open Access" para ampliar.',
    noSourceMatchDesc: '{label} concluiu sem correspondências para esta consulta.',
    noSourceFallbackName: 'Esta base',
    noAllSourcesMatchDesc:
      'Nenhuma das bases consultadas retornou correspondências para os termos informados.',
    hideStructuredSections: 'Ocultar Seções Estruturadas',
    viewStructuredAbstract: 'Ver Resumo Estruturado',
    labelObjective: 'Objetivo:',
    labelMethodsSample: 'Métodos / Casuística:',
    labelMethodsDesign: 'Métodos / Delineamento:',
    labelSampleParticipants: 'Amostra / Participantes:',
    labelResults: 'Resultados:',
    labelConclusion: 'Conclusão:',
    savedShort: 'Salvo',
    saveShort: 'Salvar',
    saveIntoGroup: 'Salvar em "{name}"',
    changePaperGroupTitle: 'Alterar grupo / slot deste artigo',
    ungroupedShort: 'Sem grupo',
    citedByCount: 'Citado por {count}',
    citePrefix: 'Citar:',
    waitingMoreSourcesSingular: 'Aguardando mais 1 base científica...',
    waitingMoreSourcesPlural: 'Aguardando mais {count} bases científicas...',

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
    relevanceMethodCaption: 'BM25F textual + consenso RRF + citações/ano + recência',
    relevanceScoreBadge: 'Relevância {score}%',
    relevanceBreakdownTitle:
      'Textual (BM25F): {lexical}% · Consenso RRF ({sources} {sourcesLabel}): {consensus}% · Impacto/Recência: {impact}% · Evidência/Acesso: {quality}%',
    sourceCountSingular: 'base',
    sourceCountPlural: 'bases',
    corroboratedSourcesBadge: '{count} bases',
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
    downloadCsv: 'Exportar Planilha (CSV)',
    downloadBib: 'Exportar BibTeX (.bib)',
    copyAll: 'Copiar Citações ({format})',
    clearAll: 'Limpar Biblioteca',
    clearSlot: 'Limpar Slot',
    clearAllTitle: 'Remover todos os artigos da biblioteca',
    clearSlotTitle: 'Remover os artigos deste slot',
    priorityHigh: 'Alta',
    priorityMedium: 'Média',
    priorityReview: 'Revisar',
    removeTooltip: 'Remover artigo',
    notesLabel: 'Notas de fichamento:',
    notesPlaceholder: 'Registre observações, metodologia, achados ou comentários sobre o artigo...',
    openSource: 'Abrir Artigo',
    downloadFullPdf: 'Baixar PDF',
    emptySavedTitle: 'Nenhum artigo salvo na biblioteca',
    emptySavedDesc:
      'Use o botão "Salvar" nos resultados de busca para organizar sua biblioteca e exportar referências em ABNT, APA ou BibTeX.',

    savedSidebarAria: 'Gerenciamento de grupos e slots de pesquisa',
    newResearchGroupTitle: 'Novo Slot / Grupo de Pesquisa',
    groupColorAria: 'Cor do grupo',
    colorPrefix: 'Cor:',
    createSlotPlusBtn: '+ Criar Slot',
    defaultSaveTargetTitle: 'Destino Padrão ao Salvar Artigos',
    defaultSaveTargetDescPrefix: 'Artigos salvos na aba',
    defaultSaveTargetDescSuffix: 'irão automaticamente para este destino.',
    librarySlotsTitle: 'Slots da Biblioteca',
    allPapersSlot: 'Todos os Artigos',
    activeBadge: 'Ativo',
    researchGroupsCount: 'Grupos de Pesquisa ({count})',
    noGroupsHint:
      'Nenhum grupo criado ainda. Crie slots acima (ex.: Jogos de IA, Medicamentos) para separar suas pesquisas.',
    saveNameTitle: 'Salvar nome',
    renameGroupTitle: 'Renomear grupo',
    deleteGroupTitle: 'Excluir grupo (os artigos são mantidos em Sem Grupo)',
    localBackupTitle: 'Backup & Importação Local',
    localBackupDesc:
      'Exporte toda a biblioteca em JSON ou importe arquivos .bib, .ris (Zotero/Mendeley) ou backups anteriores.',
    restoreModeLabel: 'Ao restaurar JSON:',
    restoreModeMerge: 'Mesclar com atual',
    restoreModeReplace: 'Substituir tudo',
    importBtn: 'Importar',
    backupJsonBtn: 'Backup JSON',
    backupJsonTitle: 'Exportar biblioteca, grupos e plataformas selecionadas em JSON',
    backupExportedFeedback: 'Backup JSON exportado com grupos, artigos e seleção de plataformas.',
    backupFailedFeedback: 'Falha no backup JSON: {error}',
    backupRestoredFeedback: 'Sessão restaurada: {papers} artigos e {groups} grupos.',
    backupMergedFeedback: 'Backup mesclado: +{papers} artigos e +{groups} grupos.',
    importInvalidFeedback:
      'Nenhuma referência válida encontrada. Use arquivos .bib (BibTeX), .ris ou backup .json.',
    importSuccessFeedback:
      'Importação {format}: +{added} artigos adicionados ({skipped} duplicatas ignoradas).',
    importReadErrorFeedback: 'Não foi possível ler o arquivo selecionado.',
    allLibraryPapersTitle: 'Todos os Artigos da Biblioteca',
    groupFallbackName: 'Grupo',
    slotAllDesc: 'Exibindo todos os artigos salvos em todos os grupos e itens sem grupo.',
    slotUngroupedDesc: 'Exibindo artigos salvos de forma avulsa, sem vínculo a nenhum grupo específico.',
    slotGroupDesc: 'Revisão de literatura e matriz PRISMA 2020 isolada para o grupo "{name}".',
    exportCsvCount: 'Exportar CSV ({count})',
    exportCsvTitle: 'Baixar planilha CSV dos artigos deste slot',
    subTabMatrix: 'Matriz de Fichamento ({count})',
    subTabPrisma: 'Fluxograma PRISMA 2020',
    emptyUngroupedTitle: 'Nenhum artigo salvo sem grupo',
    emptyGroupTitle: 'O grupo "{name}" ainda não possui artigos',
    emptySlotDesc:
      'Realize uma busca na aba "Artigos Encontrados" para salvar novos estudos diretamente neste slot, ou mova artigos já existentes usando o seletor de grupo em cada card.',
    systematicScreeningLabel: 'Triagem Sistemática ({title}):',
    filterAllCount: 'Todos ({count})',
    filterIncludedCount: 'Incluídos ({count})',
    filterExcludedCount: 'Excluídos ({count})',
    filterPendingCount: 'Pendentes ({count})',
    movePaperGroupTitle: 'Mover artigo para outro slot ou deixar sem grupo',
    prismaDecisionLabel: 'Decisão PRISMA:',
    decisionInclude: 'Incluir',
    decisionExclude: 'Excluir',
    decisionPending: 'Pendente',
    hideExtractedVars: 'Ocultar Variáveis Metodológicas Extraídas',
    showExtractedVars: 'Ver Variáveis Metodológicas Extraídas (Objetivo, Métodos, Resultados)',
    noStructuredSectionsNotice: 'Resumo sem marcações canônicas de seções estruturadas.',

    webLaunchTitle: 'Abertura Assistida de Portais ({count})',
    webLaunchBlockedDesc:
      'Navegadores bloqueiam múltiplas abas simultâneas sem Bridge local. Clique em cada portal abaixo para abrir diretamente com a sua busca:',
    webLaunchDirectDesc: 'Acesso direto aos portais selecionados para a busca atual:',
    webLaunchCloseAria: 'Fechar painel',
    webLaunchQueryLabel: 'Query:',
    webLaunchCopiedAll: 'URLs copiadas',
    webLaunchCopyAll: 'Copiar todas as URLs',
    webLaunchOpenedBadge: 'Aberto',
    webLaunchOpenBtn: 'Abrir',
    webLaunchTip:
      'Dica: permita pop-ups para cartographsearch.com ou use o app desktop Tauri para abrir tudo de uma vez.',
    webLaunchCloseBtn: 'Fechar',

    footerBrandTitle: 'Sobre o Cartograph — Arquitetura e Metodologia',
    footerNavAria: 'Links institucionais e legais do rodapé',
    footerAbout: 'Sobre o Cartograph',
    footerApis: '15 APIs Abertas',
    footerCitation: 'Como Citar',
    footerCopyright: 'Direitos Autorais & Licenças',
    footerPrivacy: 'Privacidade (LGPD) & Termos',
    footerRightsReserved: 'v2.4. Todos os direitos reservados.',
    footerEngineeringNote: 'Engenharia determinística · Local-First · PRISMA 2020',
    analyticsConsentAria: 'Preferência de telemetria anônima',
    analyticsConsentText:
      'O Cartograph utiliza métricas agregadas opcionais (sem termos de busca ou dados pessoais) para aprimorar as fontes científicas.',
    analyticsDeclineBtn: 'Recusar',
    analyticsAcceptBtn: 'Aceitar anônimo',

    bbTitle: 'Construtor de Expressão Booleana',
    bbSubtitle: 'Combine termos e operadores para refinar a consulta.',
    bbClear: 'Limpar',
    bbMainConcept: 'Tema Principal',
    bbMainConceptPh: 'Assunto central da pesquisa',
    bbAndTerms: 'Termos Obrigatórios',
    bbAndTermsPh: 'Palavras que também devem aparecer',
    bbOrTerms: 'Termos Alternativos',
    bbOrTermsPh: 'Sinônimos ou variantes aceitas',
    bbExactPhrase: 'Expressão Exata',
    bbExactPhrasePh: 'Frase exata entre aspas',
    bbNotTerms: 'Excluir Termos',
    bbNotTermsPh: 'Palavras que deseja ignorar',
    bbStartYear: 'A Partir do Ano',
    bbAnyYear: 'Qualquer ano',
    bbFromYear: 'Desde {year}',
    bbStudyDesign: 'Tipo de Estudo',
    bbAllDesigns: 'Todos os estudos',
    bbSystematicReview: 'Revisão Sistemática',
    bbRct: 'Ensaio Clínico',
    bbEmpiricalCausal: 'Estudo Empírico',
    bbCompiledString: 'Expressão gerada:',
    bbCompiledEmpty: 'Preencha os campos acima para montar a pesquisa',
    bbApplyBtn: 'Aplicar na Busca',

    catGlobalIndex: 'Bases Globais & Repositórios',
    catGlobalIndexSub: 'Grandes indexadores acadêmicos mundiais e servidores de preprints.',
    catCommercialPublishers: 'Editoras Científicas',
    catCommercialPublishersSub: 'Revistas com acesso via assinatura ou convênio institucional.',
    catRegionalLatam: 'América Latina & Ibero-América',
    catRegionalLatamSub: 'Literatura científica regional, periódicos públicos e teses.',
    catAiSynthesis: 'Bases com Análise Semântica',
    catAiSynthesisSub: 'Plataformas que oferecem resumos de evidência e contexto de citações.',
    catCitationGraph: 'Redes de Citação',
    catCitationGraphSub: 'Mapeamento visual de conexões bibliográficas entre estudos.',
    catEvidenceHealth: 'Saúde & Medicina',
    catEvidenceHealthSub: 'Literatura biomédica, revisões em saúde e ensaios clínicos.',
    catTechPatents: 'Patentes, Normas & Engenharia',
    catTechPatentsSub: 'Propriedade intelectual, RFCs, padrões técnicos, cibersegurança e P&D industrial.',
    catNicheScience: 'Ciência Aplicada & Nichos',
    catNicheScienceSub: 'Laboratórios nacionais, física, espaço, química, biodiversidade e dados empíricos.',

    accessGratuito: 'Acesso Aberto',
    accessAbertoInst: 'Acesso Institucional',
    accessFreemium: 'Gratuito com Limite',
    accessPago: 'Assinatura',

    presetCoreGold: 'Núcleo Principal (6 Bases)',
    presetCoreGoldDesc: 'Google Scholar, OpenAlex, Semantic Scholar, PubMed, SciELO e Consensus.',
    presetGlobalPublishers: 'Editoras Internacionais (8 Bases)',
    presetGlobalPublishersDesc: 'Web of Science, Scopus, ScienceDirect, IEEE Xplore, ACM, Springer, Wiley e JSTOR.',
    presetStemTech: 'Exatas & Tecnologia (6 Bases)',
    presetStemTechDesc: 'IEEE Xplore, ACM DL, arXiv, ScienceDirect, SpringerLink e DBLP.',
    preset100Free: 'Acesso Aberto (10 Bases)',
    preset100FreeDesc: 'Plataformas de acesso livre sem barreiras de pagamento.',
    presetBrasilLatam: 'Ibero-América & LatAm (8 Bases)',
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
    presetTechPatents: 'Patentes, Normas & Cibersegurança',
    presetTechPatentsDesc: 'Google Patents, Espacenet, USPTO, INPI, IETF RFCs e NIST/NVD.',
    presetAppliedLabs: 'Laboratórios, Física & Espaço',
    presetAppliedLabsDesc: 'OSTI.GOV, NASA NTRS, NASA ADS, INSPIRE-HEP, arXiv e Zenodo.',
    presetBioClimate: 'Química, Biodiversidade & Agro',
    presetBioClimateDesc: 'PubChem, ChEMBL, GBIF, BDPA Embrapa, Figshare e Dryad.',
    presetGeoClimate: 'Geociências, Clima & Materiais',
    presetGeoClimateDesc: 'PANGAEA, NOAA IR, EarthArXiv, Materials Project, IAEA INIS e OSTI.GOV.',
    presetGenomicsMaterials: 'Genômica, Proteômica & Bioinformática',
    presetGenomicsMaterialsDesc: 'NCBI GEO, UniProt, RCSB PDB, PubMed, Europe PMC e bioRxiv.',
    presetEconEmpirical: 'Economia Empírica & Working Papers',
    presetEconEmpiricalDesc: 'NBER, IDEAS/RePEc, SSRN, World Bank WDS, BIS Working Papers e EconStor.',
    presetEconGlobalPolicy: 'Políticas Públicas & Organismos Globais',
    presetEconGlobalPolicyDesc: 'World Bank OKR, IPEA, CEPAL, OECD iLibrary, IMF eLibrary, UNDL e J-PAL.',
    presetEconPoliticalScience: 'Ciência Política & Governança',
    presetEconPoliticalScienceDesc: 'SocArXiv, APSA Preprints, JSTOR, Brookings, GovInfo e SPELL.',

    scopeLabel: 'Escopo da Metabusca',
    scopeAll: 'Todas as Fontes',
    scopeGeneral: 'Geral & Multi',
    scopeEconPolicy: 'Economia & Política',
    scopeHealth: 'Saúde & Bio',
    scopeExactTech: 'Exatas, Tech & Dados',

    proxyDoiButton: '[Proxy Institucional]',
    activeSubscriptionBadge: 'Assinatura Ativa',
    filterOwnedOnly: 'Somente minhas assinaturas',

    accessSettingsBtn: 'Meu Acesso & APIs',
    accessModalTitle: 'Acesso Institucional, Chaves BYOK & Assinaturas',
    accessModalSubtitle: 'Configuração 100% local no navegador para usar suas assinaturas e chaves próprias sem cobranças ou limites do Cartograph.',
    accessTabProxy: 'Proxy Institucional',
    accessTabByok: 'Chaves de API (BYOK)',
    accessTabSubscriptions: 'Minhas Assinaturas',
    proxyEnableLabel: 'Ativar reescrita automática por Proxy Institucional (EZProxy / CAPES CAFe)',
    proxyModeLabel: 'Modo de reescrita',
    proxyModePrefix: 'Prefixo / Template {url} (EZProxy / OpenAthens)',
    proxyModeCapesCafe: 'Sufixo de domínio (CAPES CAFe .ezXX)',
    proxyTemplateLabel: 'URL ou sufixo do proxy da universidade',
    proxyTemplatePlaceholder: 'Ex: https://ezproxy.universidade.br/login?url={url}',
    proxyPresetsLabel: 'Modelos rápidos',
    proxyPresetCapes: 'Modelo CAPES CAFe',
    proxyPresetEzproxy: 'Modelo EZProxy Padrão',
    proxyPreviewLabel: 'Prévia de abertura (ScienceDirect)',
    proxyApplyToLabel: 'Aplicar proxy aos modelos de acesso',
    proxyLocalNotice: 'Suas credenciais e URLs de proxy nunca saem deste navegador nem entram em arquivos de backup.',
    byokIntro: 'Informe suas chaves pessoais ou institucionais para habilitar bases pagas (Scopus, ScienceDirect, IEEE) ou ampliar cotas gratuitas (Semantic Scholar, CORE, Springer, Lens, Fed in Print, Congress/GovInfo).',
    byokKeyLabel: 'Chave de API',
    byokInstTokenLabel: 'InstToken (opcional fora do campus)',
    byokGetKeyLink: 'Obter / gerenciar chave',
    byokStatusActive: 'Ativa',
    byokStatusInactive: 'Inativa',
    byokClearBtn: 'Limpar',
    byokToggleEnable: 'Habilitar na metabusca',
    subsIntro: 'Marque as bases às quais você já possui acesso pela universidade ou assinatura pessoal para destacá-las e filtrá-las no diretório.',
    subsSelectCapesBtn: 'Marcar pacote CAPES CAFe',
    subsClearAllBtn: 'Limpar seleções',
    subsCountLabel: 'assinaturas marcadas',
    closeModalBtn: 'Fechar',

    thematicAreasTitle: 'Área Temática',
    areaAll: 'Todas as Áreas',
    areaTecnologia: 'Tecnologia & Inovação',
    areaIa: 'Inteligência Artificial',
    areaSaude: 'Saúde & Medicina',
    areaArte: 'Arte & Design',
    areaGames: 'Games & Jogos',
    areaSoftware: 'Desenvolvimento & Software',
    areaHardware: 'Hardware & Chips',
    areaCienciasExatas: 'Física, Química & Espaço',
    areaBiociencias: 'Biociências, Agro & Clima',
    areaGeociencias: 'Geociências & Oceanografia',
    areaEconomiaPoliticas: 'Economia & Políticas Públicas',
    areaPatentesNormas: 'Patentes & Normas Técnicas',
    areaMultidisciplinar: 'Multidisciplinar',

    areaShortMulti: 'Multi',
    areaShortTech: 'Tech',
    areaShortIa: 'IA',
    areaShortSaude: 'Saúde',
    areaShortExatas: 'Exatas',
    areaShortBio: 'Bio/Agro',
    areaShortGeo: 'Geo',
    areaShortEcon: 'Econ',
    areaShortPatentes: 'Patentes',
    areaShortArte: 'Arte',
    areaShortGames: 'Games',
    areaShortSoftware: 'Software',
    areaShortHardware: 'Hardware',
  },

  en: {
    appName: 'CARTOGRAPH',
    appTagline: 'Academic Metasearch',
    brandTitle: 'Cartograph — Scientific Metasearch Hub',
    systemBarSubtitle: 'Unified search across scientific journals and open repositories',
    bridgeActive: 'Native Bridge Active ({osName})',
    bridgeOffline: 'Running in browser',
    keyboardShortcut: 'Ctrl/Cmd + K',

    heroTitle: 'Unified Academic Search',
    heroSubtitle:
      'Search across open repositories, preprints, and scientific databases with a single query.',
    searchPlaceholder: 'Search by topic, author, paper title, or keywords...',
    clearSearchTitle: 'Clear search',
    shareSearchTitle: 'Copy shareable search link',
    shareLinkCopied: 'Shareable search link copied to clipboard.',
    shareLinkError: 'Could not copy link automatically.',
    translateTitle: 'Translate Portuguese terms to academic English',
    searchBtn: 'Search',
    btnSearchApis: 'Search Papers',
    btnLaunchTabs: 'Open in Portals ({count})',
    openPortalsCount: 'Open {count} portals',
    openPortalsTitle: 'Open search in tabs across selected portals (Shift + Enter)',
    btnTotalSearch: 'Complete Search',
    translateBtn: 'Translate PT → EN',
    booleanBuilderBtn: 'Boolean Query Builder',
    toggleThemeTitle: 'Switch Light / Dark mode',
    languageAutoSystem: 'Auto (System)',
    languageSystemHint: 'Detected from system',
    languageMenuLabel: 'Interface language',
    platformsOpenedBridge: '{count} academic portals opened in browser.',
    platformsOpenedBrowser: '{count} tabs opened by browser.',
    assistedLaunchNotice: '• Assisted launch panel shown to bypass browser pop-up limits.',
    termTranslatedBanner: 'Search term translated: "{term}"',
    booleanAppliedBanner: 'Boolean filters applied to search bar.',

    presetsTitle: 'Search Presets:',
    selectAll: 'Select All ({count})',
    clearSelection: 'Clear Selection',

    tabPlatforms: 'Portals & Databases ({count})',
    tabFederated: 'Papers Found ({count})',
    tabSaved: 'Library ({count})',
    tabFeedback: 'Feedback & Suggestions',
    tabAbout: 'About & Legal',
    feedbackTitle: 'Feedback & Contributions',
    feedbackSubtitle:
      'Suggest new scientific sources, report broken links or issues, and help improve Cartograph.',
    feedbackBadge: 'Cartograph · Open Science',
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
    feedbackRatingOutOf: '{star} of 5',
    feedbackFooterHint: 'Your feedback helps improve the catalog and precision of Cartograph.',
    feedbackSubmitBtn: 'Submit Feedback',
    feedbackSubmittingBtn: 'Submitting...',
    feedbackSuccessBanner: 'Feedback recorded successfully. Thank you for your contribution.',
    feedbackLocalNotice:
      '(saved to local browser history — copy as Markdown for manual submission if needed).',
    feedbackHistoryTitle: 'Contribution History',
    feedbackHistoryEmpty: 'No feedback submitted in this browser yet.',
    feedbackCopyMarkdownTitle: 'Copy as Markdown',
    feedbackCopyBtn: 'Copy',
    feedbackRemoveHistoryTitle: 'Remove from history',
    feedbackInstitutionPrefix: 'Institution:',
    feedbackFooterNote: 'Scientific metasearch and systematic literature review in open science.',
    feedbackMarkdownHeader: '### [Cartograph Feedback]',
    feedbackMarkdownType: 'Type:',
    feedbackMarkdownRating: 'Rating:',
    feedbackMarkdownDate: 'Date:',
    feedbackMarkdownInstitution: 'Institution:',
    feedbackMarkdownUrl: 'URL/Portal:',
    feedbackMarkdownContact: 'Contact:',

    filterStrictlyFree: 'Open Access Only',
    allCategories: 'All Categories ({count})',

    sidebarAriaLabel: 'Platform filters and navigation',
    filtersNavTitle: 'Filters & Navigation',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    collapseAllTitle: 'Collapse all sections',
    expandAllTitle: 'Expand all sections',
    clearFilter: 'Clear',
    accessModelTitle: 'Access Model',
    accessModelAll: 'All models',
    accessModelFree: '100% Free & Open',
    accessModelPaid: 'Paid / Subscription',
    accessModelInstitutional: 'Open Access + Institutional',
    accessModelFreemium: 'Free w/ AI Quota',
    accessShortFree: 'Free',
    accessShortPaid: 'Subscription',
    accessShortInst: 'Institutional',
    accessShortFreemium: 'Freemium',
    quickSelectionTitle: 'Quick Selection',
    quickSelectionTitleAttr: '{selected} of {total} platforms selected',
    quickSelectionActiveCount: '{selected} of {total} active',
    quickSelectionAllBtn: 'All',
    platformTypeTitle: 'Platform Type',
    platformTypeAll: 'All categories',
    directoryResultsSummary: '{visible} matching portals · {selected} selected for batch launch',
    gridViewTitle: 'Grid view',
    listViewTitle: 'Academic list view',
    includeInBatchTitle: 'Include in batch launch',
    cardSearchAction: 'Search ↗',
    cardOpenAction: 'Open ↗',
    cardOpenPortalAction: 'Open portal ↗',

    platformSearchBtn: 'Search on {name}',
    enterTopicAbove: 'Enter search terms above',
    coverageLabel: 'Field:',
    categoryLabel: 'Category:',

    federatedTitle: 'Scientific Papers Found',
    federatedCount: '{displayed} of {total} papers',
    federatedSidebarAria: 'Found papers filters and navigation',
    saveToSlotTitle: 'Save to Slot / Group',
    createNewSlotTitle: 'Create new research slot',
    newBtn: 'New',
    ungroupedOption: 'Ungrouped (General)',
    slotPrefix: 'Slot:',
    slotPlaceholder: 'e.g. AI Games, Pharmacology...',
    cancelBtn: 'Cancel',
    createSlotBtn: 'Create Slot',
    slotHelperPrefix: 'Choose a group to organize this search or keep in',
    slotHelperUngrouped: 'Ungrouped',
    sortShortCitations: 'Citations',
    sortShortYear: 'Year',
    availabilityTitle: 'Availability',
    availabilityOpenAccessOnly: 'Open Access only',
    queriedSourcesTitle: 'Queried Databases',
    allSourcesOption: 'All sources',
    progressAriaLabel: 'Federated metasearch progress across scientific sources',
    queryingAllProgress: 'Querying databases ({completed} of {total})',
    queryingSourceProgress: 'Querying {label}... ({completed} of {total} sources)',
    papersDisplayedSuffix: '· {count} papers displayed',
    showingResultsSummary: 'Showing {displayed} of {total} scientific papers found',
    duplicatesMergedCount: '{count} duplicates merged',
    duplicatesMergedTitle:
      '{doi} by canonical DOI, {ids} by persistent ID (PMID/arXiv), {fuzzy} by title (Jaro-Winkler)',
    loadingResultsAria: 'Loading results',
    sourceErrorTitle: 'Query did not complete on {label}',
    sourceTimeoutFallback: 'The database response timeout was reached.',
    backToAllSources: 'Back to "All sources"',
    noPapersInViewTitle: 'No papers found in this view',
    noOpenAccessMatchDesc:
      'No papers with direct open access match the current filters. Uncheck "Open Access only" to expand results.',
    noSourceMatchDesc: '{label} completed with no matches for this query.',
    noSourceFallbackName: 'This database',
    noAllSourcesMatchDesc: 'None of the queried databases returned matches for the entered terms.',
    hideStructuredSections: 'Hide Structured Sections',
    viewStructuredAbstract: 'View Structured Abstract',
    labelObjective: 'Objective:',
    labelMethodsSample: 'Methods / Sample:',
    labelMethodsDesign: 'Methods / Study Design:',
    labelSampleParticipants: 'Sample / Participants:',
    labelResults: 'Results:',
    labelConclusion: 'Conclusion:',
    savedShort: 'Saved',
    saveShort: 'Save',
    saveIntoGroup: 'Save to "{name}"',
    changePaperGroupTitle: 'Change group / slot for this paper',
    ungroupedShort: 'Ungrouped',
    citedByCount: 'Cited by {count}',
    citePrefix: 'Cite:',
    waitingMoreSourcesSingular: 'Waiting for 1 more scientific source...',
    waitingMoreSourcesPlural: 'Waiting for {count} more scientific sources...',

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
    relevanceMethodCaption: 'BM25F text + RRF consensus + citations/yr + recency',
    relevanceScoreBadge: 'Relevance {score}%',
    relevanceBreakdownTitle:
      'Text (BM25F): {lexical}% · RRF Consensus ({sources} {sourcesLabel}): {consensus}% · Impact/Recency: {impact}% · Evidence/Access: {quality}%',
    sourceCountSingular: 'source',
    sourceCountPlural: 'sources',
    corroboratedSourcesBadge: '{count} sources',
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
    clearSlot: 'Clear Slot',
    clearAllTitle: 'Remove all papers from the library',
    clearSlotTitle: 'Remove papers from this slot',
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
      'Click "Save" in search results to organize your references and export citations in ABNT, APA, or BibTeX.',

    savedSidebarAria: 'Research groups and slots management',
    newResearchGroupTitle: 'New Research Slot / Group',
    groupColorAria: 'Group color',
    colorPrefix: 'Color:',
    createSlotPlusBtn: '+ Create Slot',
    defaultSaveTargetTitle: 'Default Save Destination',
    defaultSaveTargetDescPrefix: 'Papers saved in the',
    defaultSaveTargetDescSuffix: 'tab will automatically go to this destination.',
    librarySlotsTitle: 'Library Slots',
    allPapersSlot: 'All Papers',
    activeBadge: 'Active',
    researchGroupsCount: 'Research Groups ({count})',
    noGroupsHint:
      'No groups created yet. Create slots above (e.g., AI Games, Drugs) to organize your reviews.',
    saveNameTitle: 'Save name',
    renameGroupTitle: 'Rename group',
    deleteGroupTitle: 'Delete group (papers are kept in Ungrouped)',
    localBackupTitle: 'Local Backup & Import',
    localBackupDesc:
      'Export the entire library to JSON or import .bib, .ris (Zotero/Mendeley) files, or previous backups.',
    restoreModeLabel: 'On JSON restore:',
    restoreModeMerge: 'Merge with current',
    restoreModeReplace: 'Replace all',
    importBtn: 'Import',
    backupJsonBtn: 'JSON Backup',
    backupJsonTitle: 'Export library, groups, and selected platforms to JSON',
    backupExportedFeedback: 'JSON backup exported with groups, papers, and platform selection.',
    backupFailedFeedback: 'JSON backup failed: {error}',
    backupRestoredFeedback: 'Session restored: {papers} papers and {groups} groups.',
    backupMergedFeedback: 'Backup merged: +{papers} papers and +{groups} groups.',
    importInvalidFeedback:
      'No valid references found. Use .bib (BibTeX), .ris, or .json backup files.',
    importSuccessFeedback:
      '{format} import: +{added} papers added ({skipped} duplicates skipped).',
    importReadErrorFeedback: 'Could not read the selected file.',
    allLibraryPapersTitle: 'All Library Papers',
    groupFallbackName: 'Group',
    slotAllDesc: 'Showing all saved papers across all groups and ungrouped items.',
    slotUngroupedDesc: 'Showing ungrouped papers not assigned to any specific research slot.',
    slotGroupDesc: 'Isolated literature review and PRISMA 2020 matrix for group "{name}".',
    exportCsvCount: 'Export CSV ({count})',
    exportCsvTitle: 'Download CSV spreadsheet for this slot',
    subTabMatrix: 'Screening Matrix ({count})',
    subTabPrisma: 'PRISMA 2020 Flow Diagram',
    emptyUngroupedTitle: 'No ungrouped papers saved',
    emptyGroupTitle: 'Group "{name}" has no papers yet',
    emptySlotDesc:
      'Run a search in the "Papers Found" tab to save new studies directly to this slot, or move existing papers using the group selector on each card.',
    systematicScreeningLabel: 'Systematic Screening ({title}):',
    filterAllCount: 'All ({count})',
    filterIncludedCount: 'Included ({count})',
    filterExcludedCount: 'Excluded ({count})',
    filterPendingCount: 'Pending ({count})',
    movePaperGroupTitle: 'Move paper to another slot or keep ungrouped',
    prismaDecisionLabel: 'PRISMA Decision:',
    decisionInclude: 'Include',
    decisionExclude: 'Exclude',
    decisionPending: 'Pending',
    hideExtractedVars: 'Hide Extracted Methodological Variables',
    showExtractedVars: 'View Extracted Methodological Variables (Objective, Methods, Results)',
    noStructuredSectionsNotice: 'No canonical structured abstract section markers detected.',

    webLaunchTitle: 'Assisted Portal Launch ({count})',
    webLaunchBlockedDesc:
      'Browsers block multiple simultaneous tabs without the local Bridge. Click each portal below to open directly with your search:',
    webLaunchDirectDesc: 'Direct access to selected portals for the current query:',
    webLaunchCloseAria: 'Close panel',
    webLaunchQueryLabel: 'Query:',
    webLaunchCopiedAll: 'URLs copied',
    webLaunchCopyAll: 'Copy all URLs',
    webLaunchOpenedBadge: 'Opened',
    webLaunchOpenBtn: 'Open',
    webLaunchTip:
      'Tip: allow pop-ups for cartographsearch.com or use the Tauri desktop app to open all at once.',
    webLaunchCloseBtn: 'Close',

    footerBrandTitle: 'About Cartograph — Architecture & Methodology',
    footerNavAria: 'Footer institutional and legal links',
    footerAbout: 'About Cartograph',
    footerApis: '15 Open APIs',
    footerCitation: 'How to Cite',
    footerCopyright: 'Copyright & Licenses',
    footerPrivacy: 'Privacy (GDPR / LGPD) & Terms',
    footerRightsReserved: 'v2.4. All rights reserved.',
    footerEngineeringNote: 'Deterministic engineering · Local-First · PRISMA 2020',
    analyticsConsentAria: 'Anonymous telemetry preference',
    analyticsConsentText:
      'Cartograph uses optional aggregated metrics (without search terms or personal data) to improve scientific sources.',
    analyticsDeclineBtn: 'Decline',
    analyticsAcceptBtn: 'Accept anonymous',

    bbTitle: 'Boolean Expression Builder',
    bbSubtitle: 'Combine keywords to refine search results.',
    bbClear: 'Clear',
    bbMainConcept: 'Primary Topic',
    bbMainConceptPh: 'Central research topic',
    bbAndTerms: 'Required Terms',
    bbAndTermsPh: 'Words that must also be present',
    bbOrTerms: 'Alternative Terms',
    bbOrTermsPh: 'Synonyms or accepted variants',
    bbExactPhrase: 'Exact Phrase',
    bbExactPhrasePh: 'Exact phrase in quotes',
    bbNotTerms: 'Exclude Terms',
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
    catTechPatents: 'Patents, Standards & Engineering',
    catTechPatentsSub: 'Intellectual property, RFCs, technical standards, cybersecurity, and industrial R&D.',
    catNicheScience: 'Applied Science & Niche Fields',
    catNicheScienceSub: 'National labs, physics, aerospace, chemistry, biodiversity, and empirical data.',

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
    presetTechPatents: 'Patents, Standards & Cybersecurity',
    presetTechPatentsDesc: 'Google Patents, Espacenet, USPTO, INPI, IETF RFCs, and NIST/NVD.',
    presetAppliedLabs: 'National Labs, Physics & Aerospace',
    presetAppliedLabsDesc: 'OSTI.GOV, NASA NTRS, NASA ADS, INSPIRE-HEP, arXiv, and Zenodo.',
    presetBioClimate: 'Chemistry, Biodiversity & Agri-Tech',
    presetBioClimateDesc: 'PubChem, ChEMBL, GBIF, BDPA Embrapa, Figshare, and Dryad.',
    presetGeoClimate: 'Geosciences, Climate & Materials',
    presetGeoClimateDesc: 'PANGAEA, NOAA IR, EarthArXiv, Materials Project, IAEA INIS, and OSTI.GOV.',
    presetGenomicsMaterials: 'Genomics, Proteomics & Bioinformatics',
    presetGenomicsMaterialsDesc: 'NCBI GEO, UniProt, RCSB PDB, PubMed, Europe PMC, and bioRxiv.',
    presetEconEmpirical: 'Empirical Economics & Working Papers',
    presetEconEmpiricalDesc: 'NBER, IDEAS/RePEc, SSRN, World Bank WDS, BIS Working Papers, and EconStor.',
    presetEconGlobalPolicy: 'Public Policy & Global IGOs',
    presetEconGlobalPolicyDesc: 'World Bank OKR, IPEA, CEPAL, OECD iLibrary, IMF eLibrary, UNDL, and J-PAL.',
    presetEconPoliticalScience: 'Political Science & Governance',
    presetEconPoliticalScienceDesc: 'SocArXiv, APSA Preprints, JSTOR, Brookings, GovInfo, and SPELL.',

    scopeLabel: 'Metasearch Scope',
    scopeAll: 'All Sources',
    scopeGeneral: 'General & Multi',
    scopeEconPolicy: 'Economics & Policy',
    scopeHealth: 'Health & Life Sci',
    scopeExactTech: 'Exact, Tech & Data',

    proxyDoiButton: '[Institutional Proxy]',
    activeSubscriptionBadge: 'Active Subscription',
    filterOwnedOnly: 'Only my subscriptions',

    accessSettingsBtn: 'My Access & APIs',
    accessModalTitle: 'Institutional Access, BYOK Keys & Subscriptions',
    accessModalSubtitle: 'Stored strictly locally in your browser so you can use existing university access and API keys without Cartograph limits.',
    accessTabProxy: 'Institutional Proxy',
    accessTabByok: 'API Keys (BYOK)',
    accessTabSubscriptions: 'My Subscriptions',
    proxyEnableLabel: 'Enable automatic Institutional Proxy rewriting (EZProxy / CAPES CAFe)',
    proxyModeLabel: 'Rewrite mode',
    proxyModePrefix: 'Prefix / {url} Template (EZProxy / OpenAthens)',
    proxyModeCapesCafe: 'Domain suffix (CAPES CAFe .ezXX)',
    proxyTemplateLabel: 'University proxy URL or domain suffix',
    proxyTemplatePlaceholder: 'e.g. https://ezproxy.university.edu/login?url={url}',
    proxyPresetsLabel: 'Quick templates',
    proxyPresetCapes: 'CAPES CAFe Template',
    proxyPresetEzproxy: 'Standard EZProxy Template',
    proxyPreviewLabel: 'Live link preview (ScienceDirect)',
    proxyApplyToLabel: 'Apply proxy to access tiers',
    proxyLocalNotice: 'Proxy settings and API keys never leave this browser and are excluded from exported backup files.',
    byokIntro: 'Add personal or institutional API keys to unlock subscribed databases (Scopus, ScienceDirect, IEEE) or raise free rate quotas (Semantic Scholar, CORE, Springer, Lens, Fed in Print, GovInfo).',
    byokKeyLabel: 'API Key',
    byokInstTokenLabel: 'InstToken (optional off-campus)',
    byokGetKeyLink: 'Get / manage key',
    byokStatusActive: 'Active',
    byokStatusInactive: 'Inactive',
    byokClearBtn: 'Clear',
    byokToggleEnable: 'Enable in metasearch',
    subsIntro: 'Mark platforms covered by your university or personal subscription to highlight them with an active badge and filter quickly.',
    subsSelectCapesBtn: 'Select CAPES CAFe bundle',
    subsClearAllBtn: 'Clear all',
    subsCountLabel: 'active subscriptions',
    closeModalBtn: 'Close',

    thematicAreasTitle: 'Thematic Field',
    areaAll: 'All Fields',
    areaTecnologia: 'Technology & Innovation',
    areaIa: 'Artificial Intelligence',
    areaSaude: 'Health & Medicine',
    areaArte: 'Art & Design',
    areaGames: 'Games & Play Studies',
    areaSoftware: 'Development & Software',
    areaHardware: 'Hardware & Chips',
    areaCienciasExatas: 'Physics, Chemistry & Space',
    areaBiociencias: 'Biosciences, Agri & Climate',
    areaGeociencias: 'Geosciences & Oceanography',
    areaEconomiaPoliticas: 'Economics & Public Policy',
    areaPatentesNormas: 'Patents & Tech Standards',
    areaMultidisciplinar: 'Multidisciplinary',

    areaShortMulti: 'Multi',
    areaShortTech: 'Tech',
    areaShortIa: 'AI',
    areaShortSaude: 'Health',
    areaShortExatas: 'STEM',
    areaShortBio: 'Bio/Agri',
    areaShortGeo: 'Geo',
    areaShortEcon: 'Econ',
    areaShortPatentes: 'Patents',
    areaShortArte: 'Art',
    areaShortGames: 'Games',
    areaShortSoftware: 'Software',
    areaShortHardware: 'Hardware',
  },
};
