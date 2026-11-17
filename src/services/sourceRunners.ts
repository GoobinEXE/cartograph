import type { ApiSourceId, ByokCredentialEntry, NormalizedPaper } from '../types/academic';
import {
  searchArxiv,
  searchCrossref,
  searchDataCite,
  searchDoaj,
  searchEuropePmc,
  searchFigshare,
  searchGbifLiterature,
  searchHalOpenScience,
  searchInspireHep,
  searchNasaNtrs,
  searchOpenAlex,
  searchOstiGov,
  searchPubMedEntrez,
  searchSemanticScholar,
  searchZenodo,
} from './coreSourceAdapters';
import {
  searchCore,
  searchEric,
  searchFedInPrintByok,
  searchGovInfoByok,
  searchHarvardDataverse,
  searchIeeeXploreByok,
  searchIpeaRcipea,
  searchLensByok,
  searchOasisbr,
  searchOpenAire,
  searchOsfPreprints,
  searchPlos,
  searchScienceDirectByok,
  searchScopusByok,
  searchSocArxiv,
  searchSpringerByok,
  searchUnDigitalLibrary,
  searchWorldBankOkr,
  searchWorldBankWds,
} from './sourceAdapters';

export interface SourceRunContext {
  query: string;
  yearFrom?: number;
  signal: AbortSignal;
  /** Active BYOK credential for the source's byokProviderId, or null. */
  credential: ByokCredentialEntry | null;
}

export type FederatedSourceRunner = (ctx: SourceRunContext) => Promise<NormalizedPaper[]>;

function requireCredential(source: ApiSourceId, ctx: SourceRunContext): ByokCredentialEntry {
  if (!ctx.credential) {
    // The aggregator never schedules a BYOK-only source without a key; this guards misuse.
    throw new Error(`${source}: BYOK credential required`);
  }
  return ctx.credential;
}

/**
 * One runner per API_SOURCE_REGISTRY entry. Typed as a total Record so adding a source id
 * without wiring its adapter is a compile error instead of a silently missing source.
 */
export const SOURCE_RUNNERS: Record<ApiSourceId, FederatedSourceRunner> = {
  openalex: ({ query, yearFrom, signal }) => searchOpenAlex(query, yearFrom, signal),
  semanticscholar: ({ query, yearFrom, signal, credential }) =>
    searchSemanticScholar(query, yearFrom, signal, credential),
  pubmed: ({ query, yearFrom, signal }) => searchPubMedEntrez(query, yearFrom, signal),
  europepmc: ({ query, yearFrom, signal }) => searchEuropePmc(query, yearFrom, signal),
  arxiv: ({ query, yearFrom, signal }) => searchArxiv(query, yearFrom, signal),
  crossref: ({ query, yearFrom, signal }) => searchCrossref(query, yearFrom, signal),
  doaj: ({ query, yearFrom, signal }) => searchDoaj(query, yearFrom, signal),
  zenodo: ({ query, yearFrom, signal }) => searchZenodo(query, yearFrom, signal),
  hal: ({ query, yearFrom, signal }) => searchHalOpenScience(query, yearFrom, signal),
  datacite: ({ query, yearFrom, signal }) => searchDataCite(query, yearFrom, signal),
  inspire: ({ query, yearFrom, signal }) => searchInspireHep(query, yearFrom, signal),
  figshare: ({ query, yearFrom, signal }) => searchFigshare(query, yearFrom, signal),
  gbif: ({ query, yearFrom, signal }) => searchGbifLiterature(query, yearFrom, signal),
  osti: ({ query, yearFrom, signal }) => searchOstiGov(query, yearFrom, signal),
  ntrs: ({ query, yearFrom, signal }) => searchNasaNtrs(query, yearFrom, signal),
  openaire: ({ query, yearFrom, signal }) => searchOpenAire(query, yearFrom, signal),
  osf: ({ query, yearFrom, signal }) => searchOsfPreprints(query, yearFrom, signal),
  eric: ({ query, yearFrom, signal }) => searchEric(query, yearFrom, signal),
  plos: ({ query, yearFrom, signal }) => searchPlos(query, yearFrom, signal),
  oasisbr: ({ query, yearFrom, signal }) => searchOasisbr(query, yearFrom, signal),
  dataverse: ({ query, yearFrom, signal }) => searchHarvardDataverse(query, yearFrom, signal),
  core: ({ query, yearFrom, signal, credential }) => searchCore(query, yearFrom, signal, credential),
  worldbank_wds: ({ query, yearFrom, signal }) => searchWorldBankWds(query, yearFrom, signal),
  worldbank_okr: ({ query, yearFrom, signal }) => searchWorldBankOkr(query, yearFrom, signal),
  socarxiv: ({ query, yearFrom, signal }) => searchSocArxiv(query, yearFrom, signal),
  ipea: ({ query, yearFrom, signal }) => searchIpeaRcipea(query, yearFrom, signal),
  undl: ({ query, yearFrom, signal }) => searchUnDigitalLibrary(query, yearFrom, signal),
  scopus: (ctx) => searchScopusByok(ctx.query, requireCredential('scopus', ctx), ctx.yearFrom, ctx.signal),
  sciencedirect: (ctx) =>
    searchScienceDirectByok(ctx.query, requireCredential('sciencedirect', ctx), ctx.yearFrom, ctx.signal),
  ieeexplore: (ctx) =>
    searchIeeeXploreByok(ctx.query, requireCredential('ieeexplore', ctx), ctx.yearFrom, ctx.signal),
  springer: (ctx) => searchSpringerByok(ctx.query, requireCredential('springer', ctx), ctx.yearFrom, ctx.signal),
  lens: (ctx) => searchLensByok(ctx.query, requireCredential('lens', ctx), ctx.yearFrom, ctx.signal),
  fedinprint: (ctx) =>
    searchFedInPrintByok(ctx.query, requireCredential('fedinprint', ctx), ctx.yearFrom, ctx.signal),
  govinfo: (ctx) => searchGovInfoByok(ctx.query, requireCredential('govinfo', ctx), ctx.yearFrom, ctx.signal),
};
