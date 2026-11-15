import { NormalizedPaper } from '../types/academic';
import { extractArxivId, extractPmid } from '../utils/deduplication';
import { cleanDoi } from './httpClient';
import { normalizeOpenAlexWork } from './citationChaser';

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
    const normalizedDoi = cleanDoi(cleanToken);
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

async function resolveSingleDoi(doi: string, signal?: AbortSignal): Promise<NormalizedPaper | null> {
  // Prefer Crossref primary + OpenAlex retraction/OA enrichment
  try {
    const oaRes = await fetch(
      `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`,
      { headers: { Accept: 'application/json' }, signal }
    );
    if (oaRes.ok) {
      const oaData = (await oaRes.json()) as Record<string, any>;
      return {
        ...normalizeOpenAlexWork(oaData, 0),
        id: `batch-doi-${doi}`,
      };
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
  }

  try {
    const crRes = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!crRes.ok) return null;
    const data = (await crRes.json()) as Record<string, any>;
    const item = data?.message;
    if (!item) return null;

    const title = Array.isArray(item.title) && item.title[0] ? String(item.title[0]) : doi;
    const authors = Array.isArray(item.author)
      ? item.author
          .slice(0, 5)
          .map((a: Record<string, any>) => [a?.given, a?.family].filter(Boolean).join(' '))
          .filter(Boolean)
      : [];
    const dateParts = item?.published?.['date-parts']?.[0] || item?.issued?.['date-parts']?.[0] || [];
    const updateList = Array.isArray(item['update-to']) ? item['update-to'] : [];
    const retractionEntry = updateList.find(
      (u: Record<string, unknown>) =>
        String(u?.type || '').toLowerCase() === 'retraction' ||
        String(u?.label || '').toLowerCase().includes('retract')
    );

    return {
      id: `batch-doi-${doi}`,
      title,
      authors,
      year: typeof dateParts[0] === 'number' ? dateParts[0] : null,
      venue:
        Array.isArray(item['container-title']) && item['container-title'][0]
          ? String(item['container-title'][0])
          : item.publisher || 'Crossref DOI',
      doi,
      url: item.URL || `https://doi.org/${doi}`,
      pdfUrl: null,
      isOpenAccess: false,
      citationCount: typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : 0,
      abstractText:
        typeof item.abstract === 'string'
          ? item.abstract.replace(/<\/?[^>]+(>|$)/g, '').trim()
          : null,
      source: 'crossref',
      sourceLabel: 'Crossref DOI',
      isRetracted: Boolean(retractionEntry),
      retractionNoticeUrl: retractionEntry?.DOI
        ? `https://doi.org/${cleanDoi(String(retractionEntry.DOI)) || retractionEntry.DOI}`
        : null,
    };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    return null;
  }
}

async function resolveSinglePmid(pmid: string, signal?: AbortSignal): Promise<NormalizedPaper | null> {
  try {
    const res = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(
        pmid
      )}&retmode=json`,
      { signal }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, any>;
    const doc = data?.result?.[pmid];
    if (!doc || doc.error) return null;

    const articleIds = Array.isArray(doc.articleids) ? doc.articleids : [];
    const doiObj = articleIds.find((a: Record<string, any>) => a?.idtype === 'doi');
    const doi = cleanDoi(doiObj?.value);
    const authors = Array.isArray(doc.authors)
      ? doc.authors.slice(0, 5).map((a: Record<string, any>) => a?.name).filter(Boolean)
      : [];
    const yearMatch = String(doc.pubdate || '').match(/\b(19|20)\d{2}\b/);

    return {
      id: `batch-pmid-${pmid}`,
      title: String(doc.title || `PMID ${pmid}`).replace(/\.$/, ''),
      authors,
      year: yearMatch ? Number(yearMatch[0]) : null,
      venue: String(doc.fulljournalname || doc.source || 'PubMed'),
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      pdfUrl: null,
      isOpenAccess: false,
      citationCount: 0,
      abstractText: null,
      source: 'pubmed',
      sourceLabel: 'PubMed',
    };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    return null;
  }
}

async function resolveSingleArxiv(arxivId: string, signal?: AbortSignal): Promise<NormalizedPaper | null> {
  try {
    const oaRes = await fetch(
      `https://api.openalex.org/works/https://doi.org/10.48550/arXiv.${encodeURIComponent(arxivId)}`,
      { headers: { Accept: 'application/json' }, signal }
    );
    if (oaRes.ok) {
      const oaData = (await oaRes.json()) as Record<string, any>;
      return {
        ...normalizeOpenAlexWork(oaData, 0),
        id: `batch-arxiv-${arxivId}`,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        isOpenAccess: true,
      };
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
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
