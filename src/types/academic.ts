export type PlatformCategory =
  | 'global-index'
  | 'regional-latam'
  | 'ai-synthesis'
  | 'citation-graph'
  | 'evidence-health';

export type AccessModel = 'gratuito' | 'aberto-institucional' | 'freemium';

export interface PlatformConfig {
  id: string;
  name: string;
  shortTag: string;
  category: PlatformCategory;
  accessModel: AccessModel;
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

export interface SavedPaperItem extends NormalizedPaper {
  savedAt: string;
  researcherNotes: string;
  relevanceTag: 'alta' | 'media' | 'revisar';
}

export interface LaunchPreset {
  id: string;
  name: string;
  description: string;
  platformIds: string[];
}
