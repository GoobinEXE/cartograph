import { NormalizedPaper, UserAccessConfig } from '../types/academic';
import { getActiveByokEntry } from '../utils/accessConfig';
import { deduplicatePapersAdvanced, normalizeDoi } from '../utils/deduplication';
import { asArray, asRecord, asRecords, asString, asStringList, firstString, isRecord, type JsonRecord } from '../utils/json';
import { UNTITLED_PAPER_TITLE, nonNegativeCount } from './adapterUtils';
import { HttpStatusError, fetchJsonDirect } from './httpClient';

export type CitationChaseDirection = 'references' | 'citations' | 'both';

export interface CitationChaseResult {
  seedTitle: string;
  references: NormalizedPaper[];
  citations: NormalizedPaper[];
  sourceUsed: 'openalex' | 'semanticscholar' | 'both';
  warnings: string[];
}

function isAbortError(err: unknown): boolean {
  return (err as { name?: unknown } | null)?.name === 'AbortError';
}

/**
 * JSON body of a CORS-enabled API, or null on a non-OK status. A missing graph edge is not
 * an error for citation chasing; network and abort errors still propagate to the caller.
 */
async function fetchJsonOrNull(url: string, label: string, init?: RequestInit): Promise<unknown> {
  try {
    return await fetchJsonDirect(url, label, init);
  } catch (err) {
    if (err instanceof HttpStatusError) return null;
    throw err;
  }
}

function reconstructAbstract(invertedIndex: unknown): string | null {
  if (!isRecord(invertedIndex)) return null;
  const tokens: Array<{ pos: number; word: string }> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of asArray(positions)) {
      if (typeof pos === 'number') tokens.push({ pos, word });
    }
  }
  if (tokens.length === 0) return null;
  tokens.sort((a, b) => a.pos - b.pos);
  return tokens.map((t) => t.word).join(' ').slice(0, 1400);
}

export function normalizeOpenAlexWork(raw: unknown, idx: number): NormalizedPaper {
  const item = asRecord(raw);
  const doi = normalizeDoi(asString(item.doi));
  const openAccess = asRecord(item.open_access);
  const primaryLocation = asRecord(item.primary_location);
  const pdfUrl =
    firstString(openAccess.oa_url, asRecord(item.best_oa_location).pdf_url, primaryLocation.pdf_url) ?? null;
  const landingUrl =
    asString(primaryLocation.landing_page_url) ??
    (doi ? `https://doi.org/${doi}` : asString(item.id) ?? 'https://openalex.org');

  return {
    id: `openalex-chase-${(asString(item.id) ?? String(idx)).replace(/[^a-zA-Z0-9_-]/g, '')}`,
    title: firstString(item.display_name, item.title) ?? UNTITLED_PAPER_TITLE,
    authors: asRecords(item.authorships)
      .slice(0, 5)
      .map((a) => asString(asRecord(a.author).display_name))
      .filter((n): n is string => Boolean(n)),
    year: typeof item.publication_year === 'number' ? item.publication_year : null,
    venue:
      firstString(asRecord(primaryLocation.source).display_name, asRecord(item.host_venue).display_name) ??
      'OpenAlex Indexed Venue',
    doi,
    url: landingUrl,
    pdfUrl,
    isOpenAccess: Boolean(openAccess.is_oa || pdfUrl),
    citationCount: nonNegativeCount(item.cited_by_count),
    abstractText: reconstructAbstract(item.abstract_inverted_index),
    source: 'openalex',
    sourceLabel: 'OpenAlex (Citation Graph)',
    publicationType: asString(item.type),
    isRetracted: Boolean(item.is_retracted),
  };
}

/** Semantic Scholar edge: `{ citedPaper }` (references), `{ citingPaper }` (citations) or a bare paper. */
function normalizeS2EdgePaper(raw: unknown, idx: number): NormalizedPaper | null {
  const edge = asRecord(raw);
  const p = isRecord(edge.citedPaper) ? edge.citedPaper : isRecord(edge.citingPaper) ? edge.citingPaper : edge;
  const title = asString(p.title);
  if (!title) return null;
  const doi = normalizeDoi(asString(asRecord(p.externalIds).DOI));
  const pdfUrl = asString(asRecord(p.openAccessPdf).url) ?? null;

  return {
    id: `s2-chase-${asString(p.paperId) ?? idx}`,
    title,
    authors: asRecords(p.authors)
      .slice(0, 5)
      .map((a) => asString(a.name))
      .filter((n): n is string => Boolean(n)),
    year: typeof p.year === 'number' ? p.year : null,
    venue: asString(p.venue) ?? 'Semantic Scholar',
    doi,
    url: asString(p.url) ?? (doi ? `https://doi.org/${doi}` : 'https://www.semanticscholar.org'),
    pdfUrl,
    isOpenAccess: Boolean(p.isOpenAccess || pdfUrl),
    citationCount: nonNegativeCount(p.citationCount),
    abstractText: asString(p.abstract) ?? null,
    source: 'semanticscholar',
    sourceLabel: 'Semantic Scholar (Graph)',
  };
}

function parseS2Edges(data: unknown): NormalizedPaper[] {
  return asArray(asRecord(data).data)
    .map(normalizeS2EdgePaper)
    .filter((x): x is NormalizedPaper => x !== null);
}

async function resolveOpenAlexWorkSeed(paper: NormalizedPaper, signal?: AbortSignal): Promise<JsonRecord | null> {
  const doi = normalizeDoi(paper.doi);
  if (doi) {
    const work = await fetchJsonOrNull(
      `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`,
      'OpenAlex',
      { signal }
    );
    if (isRecord(work)) return work;
  }

  const data = await fetchJsonOrNull(
    `https://api.openalex.org/works?search=${encodeURIComponent(paper.title)}&per-page=1`,
    'OpenAlex',
    { signal }
  );
  const first = asArray(asRecord(data).results)[0];
  return isRecord(first) ? first : null;
}

export async function chasePaperCitations(
  paper: NormalizedPaper,
  direction: CitationChaseDirection = 'both',
  options?: { accessConfig?: UserAccessConfig; signal?: AbortSignal; limit?: number }
): Promise<CitationChaseResult> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 5), 40);
  const signal = options?.signal;
  const warnings: string[] = [];
  let references: NormalizedPaper[] = [];
  let citations: NormalizedPaper[] = [];
  let usedOpenAlex = false;
  let usedS2 = false;

  try {
    const seedWork = await resolveOpenAlexWorkSeed(paper, signal);
    if (seedWork) {
      usedOpenAlex = true;

      if (direction === 'references' || direction === 'both') {
        const refIds = asStringList(seedWork.referenced_works, limit)
          .map((u) => u.replace('https://openalex.org/', ''))
          .filter(Boolean);
        if (refIds.length > 0) {
          const refUrl = `https://api.openalex.org/works?filter=openalex_id:${refIds.join('|')}&per-page=${refIds.length}`;
          const refData = await fetchJsonOrNull(refUrl, 'OpenAlex', { signal });
          references = asRecords(asRecord(refData).results).map(normalizeOpenAlexWork);
        }
      }

      const citedByApiUrl = asString(seedWork.cited_by_api_url);
      if ((direction === 'citations' || direction === 'both') && citedByApiUrl) {
        const citedUrl = `${citedByApiUrl}&per-page=${limit}&sort=cited_by_count:desc`;
        const citedData = await fetchJsonOrNull(citedUrl, 'OpenAlex', { signal });
        citations = asRecords(asRecord(citedData).results).map(normalizeOpenAlexWork);
      }
    }
  } catch (err) {
    if (isAbortError(err)) throw err;
    warnings.push(err instanceof Error ? err.message : 'OpenAlex graph query failed');
  }

  const s2Byok = getActiveByokEntry(options?.accessConfig, 'semanticscholar');
  const shouldFallbackS2 =
    (references.length === 0 && (direction === 'references' || direction === 'both')) ||
    (citations.length === 0 && (direction === 'citations' || direction === 'both'));

  const seedDoi = normalizeDoi(paper.doi);
  if (shouldFallbackS2 && seedDoi) {
    try {
      const s2PaperId = encodeURIComponent(`DOI:${seedDoi}`);
      const fields = 'title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,externalIds,url';
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (s2Byok?.apiKey) {
        headers['x-api-key'] = s2Byok.apiKey;
      }

      if (references.length === 0 && (direction === 'references' || direction === 'both')) {
        const parsed = parseS2Edges(
          await fetchJsonOrNull(
            `https://api.semanticscholar.org/graph/v1/paper/${s2PaperId}/references?fields=${fields}&limit=${limit}`,
            'Semantic Scholar',
            { headers, signal }
          )
        );
        if (parsed.length > 0) {
          references = parsed;
          usedS2 = true;
        }
      }

      if (citations.length === 0 && (direction === 'citations' || direction === 'both')) {
        const parsed = parseS2Edges(
          await fetchJsonOrNull(
            `https://api.semanticscholar.org/graph/v1/paper/${s2PaperId}/citations?fields=${fields}&limit=${limit}`,
            'Semantic Scholar',
            { headers, signal }
          )
        );
        if (parsed.length > 0) {
          citations = parsed;
          usedS2 = true;
        }
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      warnings.push(err instanceof Error ? err.message : 'Semantic Scholar graph fallback failed');
    }
  }

  return {
    seedTitle: paper.title,
    references: deduplicatePapersAdvanced(references).papers,
    citations: deduplicatePapersAdvanced(citations).papers,
    sourceUsed: usedOpenAlex && usedS2 ? 'both' : usedS2 ? 'semanticscholar' : 'openalex',
    warnings,
  };
}
