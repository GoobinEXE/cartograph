import { NormalizedPaper, UserAccessConfig } from '../types/academic';
import { getActiveByokEntry } from '../utils/accessConfig';
import { deduplicatePapersAdvanced } from '../utils/deduplication';
import { cleanDoi } from './httpClient';

export type CitationChaseDirection = 'references' | 'citations' | 'both';

export interface CitationChaseResult {
  seedTitle: string;
  references: NormalizedPaper[];
  citations: NormalizedPaper[];
  sourceUsed: 'openalex' | 'semanticscholar' | 'both';
  warnings: string[];
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex || typeof invertedIndex !== 'object') return null;
  const tokens: Array<{ pos: number; word: string }> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      tokens.push({ pos, word });
    }
  }
  if (tokens.length === 0) return null;
  tokens.sort((a, b) => a.pos - b.pos);
  return tokens.map((t) => t.word).join(' ').slice(0, 1400);
}

export function normalizeOpenAlexWork(item: Record<string, any>, idx: number): NormalizedPaper {
  const doi = cleanDoi(item?.doi);
  const authors = Array.isArray(item?.authorships)
    ? item.authorships
        .slice(0, 5)
        .map((a: Record<string, any>) => a?.author?.display_name)
        .filter((n: unknown): n is string => typeof n === 'string' && Boolean(n.trim()))
    : [];
  const pdfUrl =
    item?.open_access?.oa_url ||
    item?.best_oa_location?.pdf_url ||
    item?.primary_location?.pdf_url ||
    null;
  const landingUrl =
    item?.primary_location?.landing_page_url ||
    (doi ? `https://doi.org/${doi}` : item?.id || 'https://openalex.org');

  return {
    id: `openalex-chase-${String(item?.id || idx).replace(/[^a-zA-Z0-9_-]/g, '')}`,
    title: String(item?.display_name || item?.title || 'Untitled'),
    authors,
    year: typeof item?.publication_year === 'number' ? item.publication_year : null,
    venue:
      item?.primary_location?.source?.display_name ||
      item?.host_venue?.display_name ||
      'OpenAlex Indexed Venue',
    doi,
    url: String(landingUrl),
    pdfUrl: typeof pdfUrl === 'string' ? pdfUrl : null,
    isOpenAccess: Boolean(item?.open_access?.is_oa || pdfUrl),
    citationCount: typeof item?.cited_by_count === 'number' ? item.cited_by_count : 0,
    abstractText: reconstructAbstract(item?.abstract_inverted_index),
    source: 'openalex',
    sourceLabel: 'OpenAlex (Citation Graph)',
    publicationType: typeof item?.type === 'string' ? item.type : undefined,
    isRetracted: Boolean(item?.is_retracted),
  };
}

function normalizeS2EdgePaper(raw: Record<string, any>, idx: number): NormalizedPaper | null {
  const p = raw?.citedPaper || raw?.citingPaper || raw;
  if (!p || !p.title) return null;
  const doi = cleanDoi(p?.externalIds?.DOI);
  const pdfUrl = p?.openAccessPdf?.url || null;
  const authors = Array.isArray(p?.authors)
    ? p.authors
        .slice(0, 5)
        .map((a: Record<string, any>) => a?.name)
        .filter((n: unknown): n is string => typeof n === 'string' && Boolean(n.trim()))
    : [];

  return {
    id: `s2-chase-${p.paperId || idx}`,
    title: String(p.title),
    authors,
    year: typeof p.year === 'number' ? p.year : null,
    venue: String(p.venue || 'Semantic Scholar'),
    doi,
    url: p.url || (doi ? `https://doi.org/${doi}` : 'https://www.semanticscholar.org'),
    pdfUrl,
    isOpenAccess: Boolean(p.isOpenAccess || pdfUrl),
    citationCount: typeof p.citationCount === 'number' ? p.citationCount : 0,
    abstractText: typeof p.abstract === 'string' ? p.abstract : null,
    source: 'semanticscholar',
    sourceLabel: 'Semantic Scholar (Graph)',
  };
}

async function resolveOpenAlexWorkSeed(paper: NormalizedPaper, signal?: AbortSignal): Promise<Record<string, any> | null> {
  const doi = cleanDoi(paper.doi);
  if (doi) {
    const res = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (res.ok) return (await res.json()) as Record<string, any>;
  }

  const res = await fetch(
    `https://api.openalex.org/works?search=${encodeURIComponent(paper.title)}&per-page=1`,
    { headers: { Accept: 'application/json' }, signal }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, any>;
  return Array.isArray(data?.results) && data.results.length > 0 ? data.results[0] : null;
}

export async function chasePaperCitations(
  paper: NormalizedPaper,
  direction: CitationChaseDirection = 'both',
  options?: { accessConfig?: UserAccessConfig; signal?: AbortSignal; limit?: number }
): Promise<CitationChaseResult> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 5), 40);
  const warnings: string[] = [];
  let references: NormalizedPaper[] = [];
  let citations: NormalizedPaper[] = [];
  let usedOpenAlex = false;
  let usedS2 = false;

  try {
    const seedWork = await resolveOpenAlexWorkSeed(paper, options?.signal);
    if (seedWork) {
      usedOpenAlex = true;

      if ((direction === 'references' || direction === 'both') && Array.isArray(seedWork.referenced_works)) {
        const refIds = (seedWork.referenced_works as string[])
          .slice(0, limit)
          .map((u) => u.replace('https://openalex.org/', ''))
          .filter(Boolean);
        if (refIds.length > 0) {
          const refUrl = `https://api.openalex.org/works?filter=openalex_id:${refIds.join('|')}&per-page=${refIds.length}`;
          const refRes = await fetch(refUrl, { headers: { Accept: 'application/json' }, signal: options?.signal });
          if (refRes.ok) {
            const refData = (await refRes.json()) as Record<string, any>;
            const list = Array.isArray(refData?.results) ? refData.results : [];
            references = list.map(normalizeOpenAlexWork);
          }
        }
      }

      if ((direction === 'citations' || direction === 'both') && typeof seedWork.cited_by_api_url === 'string') {
        const citedUrl = `${seedWork.cited_by_api_url}&per-page=${limit}&sort=cited_by_count:desc`;
        const citedRes = await fetch(citedUrl, { headers: { Accept: 'application/json' }, signal: options?.signal });
        if (citedRes.ok) {
          const citedData = (await citedRes.json()) as Record<string, any>;
          const list = Array.isArray(citedData?.results) ? citedData.results : [];
          citations = list.map(normalizeOpenAlexWork);
        }
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    warnings.push(err instanceof Error ? err.message : 'OpenAlex graph query failed');
  }

  const s2Byok = getActiveByokEntry(options?.accessConfig, 'semanticscholar');
  const shouldFallbackS2 =
    (references.length === 0 && (direction === 'references' || direction === 'both')) ||
    (citations.length === 0 && (direction === 'citations' || direction === 'both'));

  if (shouldFallbackS2 && cleanDoi(paper.doi)) {
    try {
      const s2PaperId = `DOI:${cleanDoi(paper.doi)}`;
      const fields = 'title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,externalIds,url';
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (s2Byok?.apiKey) {
        headers['x-api-key'] = s2Byok.apiKey;
      }

      if (references.length === 0 && (direction === 'references' || direction === 'both')) {
        const r = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(s2PaperId)}/references?fields=${fields}&limit=${limit}`,
          { headers, signal: options?.signal }
        );
        if (r.ok) {
          const d = (await r.json()) as Record<string, any>;
          const parsed = (Array.isArray(d?.data) ? d.data : [])
            .map(normalizeS2EdgePaper)
            .filter((x: NormalizedPaper | null): x is NormalizedPaper => x !== null);
          if (parsed.length > 0) {
            references = parsed;
            usedS2 = true;
          }
        }
      }

      if (citations.length === 0 && (direction === 'citations' || direction === 'both')) {
        const r = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(s2PaperId)}/citations?fields=${fields}&limit=${limit}`,
          { headers, signal: options?.signal }
        );
        if (r.ok) {
          const d = (await r.json()) as Record<string, any>;
          const parsed = (Array.isArray(d?.data) ? d.data : [])
            .map(normalizeS2EdgePaper)
            .filter((x: NormalizedPaper | null): x is NormalizedPaper => x !== null);
          if (parsed.length > 0) {
            citations = parsed;
            usedS2 = true;
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
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
