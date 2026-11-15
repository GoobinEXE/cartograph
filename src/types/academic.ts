export type PlatformCategory =
  | 'global-index'
  | 'commercial-publishers'
  | 'regional-latam'
  | 'ai-synthesis'
  | 'citation-graph'
  | 'evidence-health'
  | 'tech-patents'
  | 'niche-science';

export type AccessModel = 'gratuito' | 'aberto-institucional' | 'freemium' | 'pago';

export type ThematicArea =
  | 'tecnologia'
  | 'ia'
  | 'saude'
  | 'arte'
  | 'games'
  | 'software'
  | 'hardware'
  | 'ciencias-exatas'
  | 'biociencias'
  | 'geociencias'
  | 'economia-politicas'
  | 'patentes-normas'
  | 'multidisciplinar';

export interface PlatformConfig {
  id: string;
  name: string;
  shortTag: string;
  category: PlatformCategory;
  accessModel: AccessModel;
  thematicAreas: ThematicArea[];
  trustScore: 1 | 2 | 3 | 4 | 5;
  supportsBoolean: boolean;
  hasDirectApi: boolean;
  description: string;
  coverageNote: string;
  accentColor: string;
  buildUrl: (encodedQuery: string, rawQuery: string, yearStart?: number) => string;
}

export type ApiSourceId =
  | 'openalex'
  | 'semanticscholar'
  | 'pubmed'
  | 'europepmc'
  | 'arxiv'
  | 'crossref'
  | 'doaj'
  | 'zenodo'
  | 'hal'
  | 'datacite'
  | 'inspire'
  | 'figshare'
  | 'gbif'
  | 'osti'
  | 'ntrs'
  | 'openaire'
  | 'osf'
  | 'eric'
  | 'plos'
  | 'oasisbr'
  | 'dataverse'
  | 'core'
  | 'worldbank_wds'
  | 'worldbank_okr'
  | 'socarxiv'
  | 'ipea'
  | 'undl'
  | 'scopus'
  | 'sciencedirect'
  | 'ieeexplore'
  | 'springer'
  | 'lens'
  | 'fedinprint'
  | 'govinfo';

export type SearchScopeId = 'all' | 'general' | 'econ-policy' | 'health' | 'exact-tech';

export type SourceCategoryTag = 'general' | 'econ-policy' | 'health' | 'exact-tech' | 'datasets';

export type ByokProviderId =
  | 'semanticscholar'
  | 'core'
  | 'springer'
  | 'scopus'
  | 'sciencedirect'
  | 'ieeexplore'
  | 'lens'
  | 'fedinprint'
  | 'govinfo';

export interface InstitutionalProxyConfig {
  enabled: boolean;
  mode: 'prefix' | 'suffix-domain';
  proxyTemplate: string;
  presetId: 'custom' | 'capes-cafe' | 'ezproxy-prefix';
  applyToModels: Array<'pago' | 'aberto-institucional' | 'freemium'>;
}

export interface ByokCredentialEntry {
  apiKey: string;
  secondaryToken?: string;
  enabled: boolean;
}

export type AccessSettingsTab = 'proxy' | 'byok' | 'subscriptions';

export interface UserAccessConfig {
  institutionalProxy: InstitutionalProxyConfig;
  ownedPlatformIds: string[];
  byokKeys: Partial<Record<ByokProviderId, ByokCredentialEntry>>;
  unpaywallEmail?: string;
}

export interface NormalizedPaper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  doi: string | null;
  url: string;
  pdfUrl: string | null;
  isOpenAccess: boolean;
  citationCount: number;
  abstractText: string | null;
  source: ApiSourceId;
  sourceLabel: string;
  /** All API sources that returned this record when merged during deduplication */
  sources?: ApiSourceId[];
  /** 1-based retrieval rank per API source, used for Reciprocal Rank Fusion (RRF) */
  sourceRanks?: Partial<Record<ApiSourceId, number>>;
  publicationType?: string;
  isRetracted?: boolean;
  retractionNoticeUrl?: string | null;
}

export interface RelevanceBreakdown {
  totalScore: number;
  lexicalScore: number;
  consensusScore: number;
  impactRecencyScore: number;
  qualityAccessScore: number;
  matchedTermsCount: number;
  totalQueryTerms: number;
  citationVelocity: number;
  sourcesCount: number;
  hasExactPhraseMatch: boolean;
  hasExcludedTermHit: boolean;
}

export interface RankedPaperResult {
  paper: NormalizedPaper;
  breakdown: RelevanceBreakdown;
}

export interface SourceFetchStatus {
  source: ApiSourceId;
  label: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  count: number;
  latencyMs?: number;
  errorMessage?: string;
  errorDetail?: string;
  rawError?: string;
}

export interface BooleanQueryState {
  mainConcept: string;
  andTerms: string;
  orTerms: string;
  notTerms: string;
  exactPhrase: string;
  yearFrom: string;
  studyDesign: 'any' | 'systematic-review' | 'rct' | 'empirical-causal' | 'open-access-only';
}

export type ScreeningStatus = 'unscreened' | 'included' | 'excluded';

export type ScreeningExclusionReason =
  | 'populacao_inadequada'
  | 'desenho_incompativel'
  | 'desfecho_irrelevante'
  | 'texto_completo_inacessivel'
  | 'duplicata_residual'
  | 'retracao_identificada'
  | 'outro';

export interface ExtractedPaperMetadata {
  objective?: string;
  methods?: string;
  sampleSize?: string;
  studyDesign?: string;
  results?: string;
  conclusion?: string;
  hasStructuredAbstract: boolean;
}

export interface LibraryGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

export interface RelatedPaperUrl {
  label: string;
  url: string;
  kind: 'preprint' | 'published' | 'supplementary';
}

export type QualityToolId = 'rob2' | 'jbi_quasi' | 'casp_qual';

export type QualityRating = 'low' | 'some_concerns' | 'high' | 'unclear';

export interface QualityAppraisalResult {
  tool: QualityToolId;
  criteria: Record<string, QualityRating>;
  overall: QualityRating;
  updatedAt: string;
}

export interface CustomExtractionColumn {
  id: string;
  label: string;
  placeholder?: string;
}

export interface SavedPaperItem extends NormalizedPaper {
  savedAt: string;
  researcherNotes: string;
  relevanceTag: 'alta' | 'media' | 'revisar';
  screeningStatus?: ScreeningStatus;
  exclusionReason?: string;
  extractedMetadata?: ExtractedPaperMetadata;
  groupId?: string | null;
  relatedUrls?: RelatedPaperUrl[];
  customFields?: Record<string, string>;
  qualityAppraisal?: QualityAppraisalResult;
}

export interface Prisma2020Counts {
  identifiedTotal: number;
  bySource: Record<string, number>;
  duplicatesRemoved: number;
  screenedTotal: number;
  excludedScreening: number;
  excludedReasons: Record<string, number>;
  fullTextAssessed: number;
  excludedFullText: number;
  includedStudies: number;
}

export type MergeRuleMatched = 'doi' | 'pmid-arxiv' | 'fuzzy-title';

export interface MergeClusterEntry {
  clusterId: string;
  mergedPaperId: string;
  ruleMatched: MergeRuleMatched;
  similarityScore: number;
  constituents: NormalizedPaper[];
}

export interface DedupOverrideRule {
  /** Lexicographically sorted "idA::idB" pairs explicitly excluded from merging */
  splitPairs: string[];
}

export interface DeduplicationSummary {
  originalCount: number;
  uniqueCount: number;
  duplicatesRemoved: number;
  mergedByDoi: number;
  mergedByPmidOrArxiv: number;
  mergedByFuzzyTitle: number;
}

export interface SearchLogSourceSnapshot {
  status: SourceFetchStatus['status'];
  count: number;
  latencyMs?: number;
}

export interface SearchLogEntry {
  id: string;
  executedAt: string;
  query: string;
  yearFrom: number | null;
  scope: SearchScopeId;
  dedupEnabled: boolean;
  totalRaw: number;
  totalUnique: number;
  bySource: Partial<Record<ApiSourceId, SearchLogSourceSnapshot>>;
}

export interface LaunchPreset {
  id: string;
  name: string;
  description: string;
  platformIds: string[];
}

export type FeedbackType = 'suggestion' | 'correction' | 'feature' | 'general';

export interface UserFeedbackItem {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  relatedUrl?: string;
  institution?: string;
  userEmail?: string;
  rating: number;
  createdAt: string;
}
