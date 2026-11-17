import type { NormalizedPaper } from '../types/academic';
import { asNumber, asString } from '../utils/json';
import { translate } from '../i18n/translations';

/**
 * Stored title for records an API returns without one. Kept as a single constant because
 * saved libraries already persist it; services hand results to the UI through
 * localizeUntitledPapers(), which swaps it for the UI-language label.
 */
export const UNTITLED_PAPER_TITLE = 'Sem título';

/** Replaces the stored untitled sentinel with the UI-language label (pt, en, es, fr). */
export function localizeUntitledPapers<T extends { title: string }>(papers: T[], language?: string): T[] {
  if (!language) return papers;
  const label = translate(language, 'untitledPaperTitle');
  if (label === UNTITLED_PAPER_TITLE) return papers;
  return papers.map((paper) => (paper.title === UNTITLED_PAPER_TITLE ? { ...paper, title: label } : paper));
}

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
