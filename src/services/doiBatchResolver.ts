import { NormalizedPaper } from '../types/academic';
import { extractArxivId, extractPmid, normalizeDoi } from '../utils/deduplication';
import { asArray, asRecord, asRecords, asString, firstString, isRecord } from '../utils/json';
import { extractYear, nonNegativeCount } from './adapterUtils';
import { normalizeOpenAlexWork } from './citationChaser';
import { fetchJsonDirect } from './httpClient';

function isAbortError(err: unknown): boolean {
  return (err as { name?: unknown } | null)?.name === 'AbortError';
}

export interface ParsedIdentifierToken {
  kind: 'doi' | 'arxiv' | 'pmid';
  value: string;
  raw: string;
}

export interface BatchResolveResult {
  papers: NormalizedPaper[];
  unresolved: string[];
  totalTokens: number;
}

export function parseIdentifierBatch(rawText: string): ParsedIdentifierToken[] {
  const seen = new Set<string>();
  const tokens: ParsedIdentifierToken[] = [];

  const chunks = rawText
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of chunks) {
    const cleanToken = raw.replace(/[).,;]+$/g, '');
    const normalizedDoi = normalizeDoi(cleanToken);
    if (normalizedDoi && /^10\.\d{4,9}\/[^\s]+$/i.test(normalizedDoi)) {
      const key = `doi:${normalizedDoi}`;
      if (!seen.has(key)) {
        seen.add(key);
        tokens.push({ kind: 'doi', value: normalizedDoi, raw });
      }
      continue;
    }

    const arxiv = extractArxivId(cleanToken) || (/^\d{4}\.\d{4,5}(?:v\d+)?$/i.test(cleanToken) ? cleanToken.replace(/v\d+$/i, '') : null);
    if (arxiv) {
      const key = `arxiv:${arxiv}`;
      if (!seen.has(key)) {
        seen.add(key);
        tokens.push({ kind: 'arxiv', value: arxiv, raw });
      }
      continue;
    }

    const pmid = extractPmid(cleanToken) || (/^(?:pmid:)?(\d{6,9})$/i.exec(cleanToken)?.[1] ?? null);
    if (pmid) {
      const key = `pmid:${pmid}`;
      if (!seen.has(key)) {
        seen.add(key);
        tokens.push({ kind: 'pmid', value: pmid, raw });
      }
    }
  }

  return tokens.slice(0, 50);
}

/** Crossref `/works/{doi}` payload mapped to a paper; null when `message` is missing. */
function parseCrossrefWork(data: unknown, doi: string): NormalizedPaper | null {
  const item = asRecord(data).message;
  if (!isRecord(item)) return null;

  const dateParts = asArray(
    asArray(asRecord(item.published)['date-parts'])[0] ?? asArray(asRecord(item.issued)['date-parts'])[0]
  );
  const retractionEntry = asRecords(item['update-to']).find(
    (u) =>
      asString(u.type)?.toLowerCase() === 'retraction' ||
      (asString(u.label)?.toLowerCase() ?? '').includes('retract')
  );
  const retractionDoi = asString(retractionEntry?.DOI);
  const abstract = asString(item.abstract);
  const firstDatePart = dateParts[0];

  return {
    id: `batch-doi-${doi}`,
    title: asString(asArray(item.title)[0]) ?? doi,
    authors: asRecords(item.author)
      .slice(0, 5)
      .map((a) => [asString(a.given), asString(a.family)].filter(Boolean).join(' '))
      .filter(Boolean),
    year: typeof firstDatePart === 'number' ? firstDatePart : null,
    venue: firstString(asArray(item['container-title'])[0], item.publisher) ?? 'Crossref DOI',
    doi,
    url: asString(item.URL) ?? `https://doi.org/${doi}`,
    pdfUrl: null,
    isOpenAccess: false,
    citationCount: nonNegativeCount(item['is-referenced-by-count']),
    abstractText: abstract ? abstract.replace(/<\/?[^>]+(>|$)/g, '').trim() : null,
    source: 'crossref',
    sourceLabel: 'Crossref DOI',
    isRetracted: Boolean(retractionEntry),
    retractionNoticeUrl: retractionDoi ? `https://doi.org/${normalizeDoi(retractionDoi) ?? retractionDoi}` : null,
  };
}

/** NCBI esummary (`retmode=json`) entry for one PMID; null when absent or flagged with `error`. */
function parsePubMedEsummary(data: unknown, pmid: string): NormalizedPaper | null {
  const doc = asRecord(asRecord(data).result)[pmid];
  if (!isRecord(doc) || doc.error) return null;

  const doiEntry = asRecords(doc.articleids).find((a) => a.idtype === 'doi');
  return {
    id: `batch-pmid-${pmid}`,
    title: (asString(doc.title) ?? `PMID ${pmid}`).replace(/\.$/, ''),
    authors: asRecords(doc.authors)
      .slice(0, 5)
      .map((a) => asString(a.name))
      .filter((n): n is string => Boolean(n)),
    year: extractYear(doc.pubdate),
    venue: firstString(doc.fulljournalname, doc.source) ?? 'PubMed',
    doi: normalizeDoi(asString(doiEntry?.value)),
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    pdfUrl: null,
    isOpenAccess: false,
    citationCount: 0,
    abstractText: null,
    source: 'pubmed',
    sourceLabel: 'PubMed',
  };
}

async function resolveSingleDoi(doi: string, signal?: AbortSignal): Promise<NormalizedPaper | null> {
  // OpenAlex first (retraction flag and OA location), Crossref as fallback.
  try {
    const work = await fetchJsonDirect(
      `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`,
      'OpenAlex',
      { signal }
    );
    if (isRecord(work)) {
      return {
        ...normalizeOpenAlexWork(work, 0),
        id: `batch-doi-${doi}`,
      };
    }
  } catch (err) {
    if (isAbortError(err)) throw err;
  }

  try {
    const data = await fetchJsonDirect(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, 'Crossref', {
      signal,
    });
    return parseCrossrefWork(data, doi);
  } catch (err) {
    if (isAbortError(err)) throw err;
    return null;
  }
}

async function resolveSinglePmid(pmid: string, signal?: AbortSignal): Promise<NormalizedPaper | null> {
  try {
    const data = await fetchJsonDirect(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(
        pmid
      )}&retmode=json`,
      'PubMed Summary',
      { signal }
    );
    return parsePubMedEsummary(data, pmid);
  } catch (err) {
    if (isAbortError(err)) throw err;
    return null;
  }
}

async function resolveSingleArxiv(arxivId: string, signal?: AbortSignal): Promise<NormalizedPaper | null> {
  try {
    const work = await fetchJsonDirect(
      `https://api.openalex.org/works/https://doi.org/10.48550/arXiv.${encodeURIComponent(arxivId)}`,
      'OpenAlex',
      { signal }
    );
    if (isRecord(work)) {
      return {
        ...normalizeOpenAlexWork(work, 0),
        id: `batch-arxiv-${arxivId}`,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        isOpenAccess: true,
      };
    }
  } catch (err) {
    if (isAbortError(err)) throw err;
  }
  return null;
}

export async function resolveIdentifierBatch(
  rawText: string,
  signal?: AbortSignal
): Promise<BatchResolveResult> {
  const tokens = parseIdentifierBatch(rawText);
  const papers: NormalizedPaper[] = [];
  const unresolved: string[] = [];

  const CONCURRENCY = 3;
  for (let i = 0; i < tokens.length; i += CONCURRENCY) {
    if (signal?.aborted) break;
    const slice = tokens.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      slice.map(async (tok) => {
        if (tok.kind === 'doi') return resolveSingleDoi(tok.value, signal);
        if (tok.kind === 'pmid') return resolveSinglePmid(tok.value, signal);
        return resolveSingleArxiv(tok.value, signal);
      })
    );
    settled.forEach((paper, idx) => {
      if (paper) {
        papers.push(paper);
      } else {
        unresolved.push(slice[idx].raw);
      }
    });
  }

  return {
    papers,
    unresolved,
    totalTokens: tokens.length,
  };
}
