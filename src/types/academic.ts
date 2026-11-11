export type PlatformCategory =
  | 'global-index'
  | 'commercial-publishers'
  | 'regional-latam'
  | 'ai-synthesis'
  | 'citation-graph'
  | 'evidence-health';

export type AccessModel = 'gratuito' | 'aberto-institucional' | 'freemium' | 'pago';

export type ThematicArea =
  | 'tecnologia'
  | 'ia'
  | 'saude'
  | 'arte'
  | 'games'
  | 'software'
  | 'hardware'
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
  | 'datacite';

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
  publicationType?: string;
}

export interface SourceFetchStatus {
  source: ApiSourceId;
  label: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  count: number;
  latencyMs?: number;
  errorMessage?: string;
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

export interface SavedPaperItem extends NormalizedPaper {
  savedAt: string;
  researcherNotes: string;
  relevanceTag: 'alta' | 'media' | 'revisar';
  screeningStatus?: ScreeningStatus;
  exclusionReason?: string;
  extractedMetadata?: ExtractedPaperMetadata;
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

export interface DeduplicationSummary {
  originalCount: number;
  uniqueCount: number;
  duplicatesRemoved: number;
  mergedByDoi: number;
  mergedByPmidOrArxiv: number;
  mergedByFuzzyTitle: number;
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
