import type { NormalizedPaper } from '../types/academic';
import { asNumber, asString } from '../utils/json';

/**
 * Stored title for records an API returns without one. Kept as a single constant because
 * saved libraries already persist it; the UI localizes it at display time.
 */
export const UNTITLED_PAPER_TITLE = 'Sem título';

export function extractYear(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 1800 && raw < 2100) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string') {
    const match = raw.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

/** Client-side year filter for sources whose API ignores `yearFrom`; undated records are kept. */
export function filterByYear(papers: NormalizedPaper[], yearFrom?: number): NormalizedPaper[] {
  if (!yearFrom || yearFrom <= 1900) return papers;
  return papers.filter((p) => !p.year || p.year >= yearFrom);
}

export function nonNegativeCount(value: unknown): number {
  return Math.max(0, Math.round(asNumber(value) ?? 0));
}

export function pdfUrlOrNull(value: unknown): string | null {
  const url = asString(value);
  return url && /\.pdf($|\?)/i.test(url) ? url : null;
}
