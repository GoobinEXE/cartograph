import { ApiSourceId, ByokProviderId, SearchScopeId, SourceCategoryTag } from '../types/academic';

export interface ApiSourceMetadata {
  id: ApiSourceId;
  label: string;
  categories: SourceCategoryTag[];
  authorityWeight: number;
  requiresByok: boolean;
  byokProviderId?: ByokProviderId;
}

export const API_SOURCE_REGISTRY: Record<ApiSourceId, ApiSourceMetadata> = {
  // Original 15 open sources
  openalex: {
    id: 'openalex',
    label: 'OpenAlex',
    categories: ['general', 'econ-policy', 'health', 'exact-tech'],
    authorityWeight: 1.12,
    requiresByok: false,
  },
  semanticscholar: {
    id: 'semanticscholar',
    label: 'Semantic Scholar',
    categories: ['general', 'econ-policy', 'health', 'exact-tech'],
    authorityWeight: 1.12,
    requiresByok: false,
    byokProviderId: 'semanticscholar',
  },
  pubmed: {
    id: 'pubmed',
    label: 'PubMed (NIH)',
    categories: ['health'],
    authorityWeight: 1.15,
    requiresByok: false,
  },
  europepmc: {
    id: 'europepmc',
    label: 'Europe PMC',
    categories: ['health'],
    authorityWeight: 1.12,
    requiresByok: false,
  },
  arxiv: {
    id: 'arxiv',
    label: 'arXiv (Cornell)',
    categories: ['general', 'exact-tech', 'econ-policy'],
    authorityWeight: 1.0,
    requiresByok: false,
  },
  crossref: {
    id: 'crossref',
    label: 'Crossref DOI',
    categories: ['general', 'econ-policy', 'health', 'exact-tech'],
    authorityWeight: 1.05,
    requiresByok: false,
  },
  doaj: {
    id: 'doaj',
    label: 'DOAJ Open Access',
    categories: ['general', 'econ-policy', 'health'],
    authorityWeight: 1.05,
    requiresByok: false,
  },
  zenodo: {
    id: 'zenodo',
    label: 'Zenodo (CERN)',
    categories: ['general', 'exact-tech', 'datasets'],
    authorityWeight: 0.85,
    requiresByok: false,
  },
  hal: {
    id: 'hal',
    label: 'HAL Science (CNRS)',
    categories: ['general', 'econ-policy', 'exact-tech'],
    authorityWeight: 0.98,
    requiresByok: false,
  },
  datacite: {
    id: 'datacite',
    label: 'DataCite Commons',
    categories: ['general', 'datasets', 'exact-tech'],
    authorityWeight: 0.8,
    requiresByok: false,
  },
  inspire: {
    id: 'inspire',
    label: 'INSPIRE-HEP (CERN)',
    categories: ['exact-tech'],
    authorityWeight: 0.95,
    requiresByok: false,
  },
  figshare: {
    id: 'figshare',
    label: 'Figshare Data',
    categories: ['datasets', 'general'],
    authorityWeight: 0.78,
    requiresByok: false,
  },
  gbif: {
    id: 'gbif',
    label: 'GBIF Biodiversity',
    categories: ['health', 'datasets'],
    authorityWeight: 0.95,
    requiresByok: false,
  },
  osti: {
    id: 'osti',
    label: 'OSTI.GOV (DOE)',
    categories: ['exact-tech'],
    authorityWeight: 0.92,
    requiresByok: false,
  },
  ntrs: {
    id: 'ntrs',
    label: 'NASA NTRS',
    categories: ['exact-tech'],
    authorityWeight: 0.92,
    requiresByok: false,
  },

  // Phase 1: New free no-key General sources
  openaire: {
    id: 'openaire',
    label: 'OpenAIRE Graph',
    categories: ['general', 'econ-policy', 'exact-tech'],
    authorityWeight: 1.1,
    requiresByok: false,
  },
  osf: {
    id: 'osf',
    label: 'OSF Preprints',
    categories: ['general', 'econ-policy'],
    authorityWeight: 0.95,
    requiresByok: false,
  },
  eric: {
    id: 'eric',
    label: 'ERIC (IES)',
    categories: ['general', 'econ-policy'],
    authorityWeight: 1.02,
    requiresByok: false,
  },
  plos: {
    id: 'plos',
    label: 'PLOS Open Access',
    categories: ['general', 'health'],
    authorityWeight: 1.04,
    requiresByok: false,
  },
  oasisbr: {
    id: 'oasisbr',
    label: 'Oasisbr (IBICT)',
    categories: ['general', 'econ-policy'],
    authorityWeight: 0.96,
    requiresByok: false,
  },
  dataverse: {
    id: 'dataverse',
    label: 'Harvard Dataverse',
    categories: ['general', 'econ-policy', 'datasets'],
    authorityWeight: 0.88,
    requiresByok: false,
  },
  core: {
    id: 'core',
    label: 'CORE.ac.uk',
    categories: ['general', 'econ-policy', 'exact-tech'],
    authorityWeight: 1.06,
    requiresByok: false,
    byokProviderId: 'core',
  },

  // Phase 1: New free no-key Economics & Policy sources
  worldbank_wds: {
    id: 'worldbank_wds',
    label: 'World Bank Reports',
    categories: ['econ-policy'],
    authorityWeight: 1.08,
    requiresByok: false,
  },
  worldbank_okr: {
    id: 'worldbank_okr',
    label: 'World Bank OKR',
    categories: ['econ-policy', 'general'],
    authorityWeight: 1.06,
    requiresByok: false,
  },
  socarxiv: {
    id: 'socarxiv',
    label: 'SocArXiv (OSF)',
    categories: ['econ-policy', 'general'],
    authorityWeight: 0.98,
    requiresByok: false,
  },
  ipea: {
    id: 'ipea',
    label: 'IPEA (RCIpea)',
    categories: ['econ-policy'],
    authorityWeight: 1.0,
    requiresByok: false,
  },
  undl: {
    id: 'undl',
    label: 'UN Digital Library',
    categories: ['econ-policy', 'general'],
    authorityWeight: 1.02,
    requiresByok: false,
  },

  // Phase 3: BYOK Paid / Keyed sources
  scopus: {
    id: 'scopus',
    label: 'Scopus (Elsevier)',
    categories: ['general', 'econ-policy', 'health', 'exact-tech'],
    authorityWeight: 1.18,
    requiresByok: true,
    byokProviderId: 'scopus',
  },
  sciencedirect: {
    id: 'sciencedirect',
    label: 'ScienceDirect (Elsevier)',
    categories: ['general', 'econ-policy', 'health', 'exact-tech'],
    authorityWeight: 1.15,
    requiresByok: true,
    byokProviderId: 'sciencedirect',
  },
  ieeexplore: {
    id: 'ieeexplore',
    label: 'IEEE Xplore',
    categories: ['exact-tech', 'general'],
    authorityWeight: 1.16,
    requiresByok: true,
    byokProviderId: 'ieeexplore',
  },
  springer: {
    id: 'springer',
    label: 'Springer Nature',
    categories: ['general', 'health', 'exact-tech', 'econ-policy'],
    authorityWeight: 1.14,
    requiresByok: true,
    byokProviderId: 'springer',
  },
  lens: {
    id: 'lens',
    label: 'The Lens.org',
    categories: ['general', 'exact-tech', 'econ-policy'],
    authorityWeight: 1.08,
    requiresByok: true,
    byokProviderId: 'lens',
  },
  fedinprint: {
    id: 'fedinprint',
    label: 'Fed in Print (FED)',
    categories: ['econ-policy'],
    authorityWeight: 1.08,
    requiresByok: true,
    byokProviderId: 'fedinprint',
  },
  govinfo: {
    id: 'govinfo',
    label: 'Congress.gov / GovInfo',
    categories: ['econ-policy'],
    authorityWeight: 1.04,
    requiresByok: true,
    byokProviderId: 'govinfo',
  },
};

export const API_SOURCE_AUTHORITY_WEIGHTS: Record<ApiSourceId, number> = Object.fromEntries(
  Object.values(API_SOURCE_REGISTRY).map((s) => [s.id, s.authorityWeight])
) as Record<ApiSourceId, number>;

export function sourceMatchesScope(sourceId: ApiSourceId, scope: SearchScopeId): boolean {
  if (scope === 'all') return true;
  const meta = API_SOURCE_REGISTRY[sourceId];
  if (!meta) return true;
  if (scope === 'general') return meta.categories.includes('general');
  if (scope === 'econ-policy') return meta.categories.includes('econ-policy');
  if (scope === 'health') return meta.categories.includes('health');
  if (scope === 'exact-tech') {
    return meta.categories.includes('exact-tech') || meta.categories.includes('datasets');
  }
  return true;
}
