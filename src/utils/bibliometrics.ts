import { SavedPaperItem } from '../types/academic';

export interface BibliometricsSummary {
  totalPapers: number;
  openAccessCount: number;
  openAccessPercent: number;
  totalCitations: number;
  medianCitations: number;
  yearRange: { min: number | null; max: number | null };
  yearHistogram: Array<{ year: number; count: number }>;
  topSources: Array<{ label: string; count: number }>;
  topVenues: Array<{ label: string; count: number }>;
  topAuthors: Array<{ label: string; count: number }>;
  topKeywords: Array<{ term: string; count: number }>;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were',
  'into', 'about', 'study', 'studies', 'analysis', 'review', 'systematic',
  'using', 'based', 'between', 'among', 'effect', 'effects', 'impact',
  'results', 'methods', 'conclusion', 'background', 'objective', 'clinical',
  'data', 'research', 'evidence', 'patient', 'patients', 'health',
  'para', 'como', 'sobre', 'entre', 'estudo', 'estudos', 'analise', 'análise',
  'revisao', 'revisão', 'sistematica', 'sistemática', 'dados', 'pesquisa',
  'resultados', 'metodos', 'métodos', 'saude', 'saúde', 'efeito', 'impacto',
]);

export function computeBibliometrics(items: SavedPaperItem[]): BibliometricsSummary {
  const yearCounts = new Map<number, number>();
  const sourceCounts = new Map<string, number>();
  const venueCounts = new Map<string, number>();
  const authorCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();
  const citations: number[] = [];

  let openAccessCount = 0;
  let totalCitations = 0;

  for (const item of items) {
    if (item.isOpenAccess || Boolean(item.pdfUrl)) {
      openAccessCount++;
    }

    const cit = typeof item.citationCount === 'number' && Number.isFinite(item.citationCount)
      ? Math.max(0, item.citationCount)
      : 0;
    citations.push(cit);
    totalCitations += cit;

    if (typeof item.year === 'number' && item.year >= 1800 && item.year <= 2100) {
      yearCounts.set(item.year, (yearCounts.get(item.year) ?? 0) + 1);
    }

    const srcLabels = item.sources && item.sources.length > 0
      ? item.sources
      : [item.sourceLabel || item.source];
    for (const rawSrc of srcLabels) {
      const label = String(rawSrc).trim();
      if (label) {
        sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
      }
    }

    const venue = item.venue?.trim();
    if (venue && venue.length > 2) {
      venueCounts.set(venue, (venueCounts.get(venue) ?? 0) + 1);
    }

    for (const author of item.authors) {
      const trimmed = author.trim();
      if (trimmed && trimmed.length > 1) {
        authorCounts.set(trimmed, (authorCounts.get(trimmed) ?? 0) + 1);
      }
    }

    const corpus = `${item.title} ${item.abstractText ?? ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const tokens = corpus.split(/[^a-z0-9-]+/).filter(
      (tok) => tok.length >= 4 && !STOPWORDS.has(tok) && !/^\d+$/.test(tok)
    );
    const seenInDoc = new Set<string>();
    for (const tok of tokens) {
      if (seenInDoc.has(tok)) continue;
      seenInDoc.add(tok);
      keywordCounts.set(tok, (keywordCounts.get(tok) ?? 0) + 1);
    }
  }

  citations.sort((a, b) => a - b);
  let medianCitations = 0;
  if (citations.length > 0) {
    const mid = Math.floor(citations.length / 2);
    medianCitations =
      citations.length % 2 === 0
        ? Math.round(((citations[mid - 1] + citations[mid]) / 2) * 10) / 10
        : citations[mid];
  }

  const yearHistogram = Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  const sortTop = (map: Map<string, number>, limit: number) =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit);

  const topKeywords = Array.from(keywordCounts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 14);

  return {
    totalPapers: items.length,
    openAccessCount,
    openAccessPercent:
      items.length > 0 ? Math.round((openAccessCount / items.length) * 100) : 0,
    totalCitations,
    medianCitations,
    yearRange: {
      min: yearHistogram.length > 0 ? yearHistogram[0].year : null,
      max: yearHistogram.length > 0 ? yearHistogram[yearHistogram.length - 1].year : null,
    },
    yearHistogram,
    topSources: sortTop(sourceCounts, 8),
    topVenues: sortTop(venueCounts, 8),
    topAuthors: sortTop(authorCounts, 10),
    topKeywords,
  };
}
