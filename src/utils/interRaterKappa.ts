import { SavedPaperItem, ScreeningStatus } from '../types/academic';

export const CARTOGRAPH_BLIND_SCHEMA = 'cartograph-blind-v1' as const;

export interface BlindReviewItem {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  doi: string | null;
  abstractText: string | null;
  url: string;
  /** Decision recorded by the second reviewer when returning the blinded file */
  reviewer2Status?: ScreeningStatus;
  reviewer2Reason?: string;
}

export interface BlindReviewPackage {
  schema: typeof CARTOGRAPH_BLIND_SCHEMA;
  exportedAt: string;
  groupName: string;
  items: BlindReviewItem[];
}

export interface CohensKappaResult {
  overlappingCount: number;
  bothIncluded: number;
  onlyR1Included: number;
  onlyR2Included: number;
  bothExcluded: number;
  observedAgreement: number;
  expectedAgreement: number;
  kappa: number;
  interpretation: 'poor' | 'slight' | 'fair' | 'moderate' | 'substantial' | 'almost_perfect';
  conflicts: Array<{
    item: SavedPaperItem;
    r1Status: ScreeningStatus;
    r2Status: ScreeningStatus;
    r2Reason?: string;
  }>;
}

export function exportBlindReviewPackage(
  items: SavedPaperItem[],
  groupName = 'Review Group'
): string {
  // Intentionally strips R1 screeningStatus, exclusionReason, researcherNotes, and relevanceTag
  const blindedItems: BlindReviewItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    authors: item.authors,
    year: item.year,
    venue: item.venue,
    doi: item.doi,
    abstractText: item.abstractText,
    url: item.url,
  }));

  const payload: BlindReviewPackage = {
    schema: CARTOGRAPH_BLIND_SCHEMA,
    exportedAt: new Date().toISOString(),
    groupName,
    items: blindedItems,
  };

  return JSON.stringify(payload, null, 2);
}

export function parseBlindReviewPackage(
  rawJson: string
):
  | { ok: true; decisions: Record<string, { status: ScreeningStatus; reason?: string }>; totalItems: number }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    if (parsed?.schema !== CARTOGRAPH_BLIND_SCHEMA || !Array.isArray(parsed.items)) {
      return { ok: false, error: 'Invalid cartograph-blind-v1 schema' };
    }
    const decisions: Record<string, { status: ScreeningStatus; reason?: string }> = {};
    for (const rawItem of parsed.items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const obj = rawItem as Record<string, unknown>;
      const id = typeof obj.id === 'string' ? obj.id : '';
      if (!id) continue;
      const rawStatus = obj.reviewer2Status ?? obj.screeningStatus;
      const rawReason = obj.reviewer2Reason ?? obj.exclusionReason;
      if (rawStatus === 'included' || rawStatus === 'excluded' || rawStatus === 'unscreened') {
        decisions[id] = {
          status: rawStatus,
          reason: typeof rawReason === 'string' ? rawReason : undefined,
        };
      }
    }
    return { ok: true, decisions, totalItems: parsed.items.length };
  } catch {
    return { ok: false, error: 'Malformed JSON file' };
  }
}

export function computeCohensKappa(
  items: SavedPaperItem[],
  reviewer2Decisions: Record<string, { status: ScreeningStatus; reason?: string }>
): CohensKappaResult {
  let bothIncluded = 0;
  let onlyR1Included = 0;
  let onlyR2Included = 0;
  let bothExcluded = 0;
  const conflicts: CohensKappaResult['conflicts'] = [];

  for (const item of items) {
    const r1 = item.screeningStatus || 'unscreened';
    const r2Entry = reviewer2Decisions[item.id];
    const r2 = r2Entry?.status;
    if ((r1 !== 'included' && r1 !== 'excluded') || (r2 !== 'included' && r2 !== 'excluded')) {
      continue;
    }

    if (r1 === 'included' && r2 === 'included') {
      bothIncluded++;
    } else if (r1 === 'included' && r2 === 'excluded') {
      onlyR1Included++;
      conflicts.push({ item, r1Status: r1, r2Status: r2, r2Reason: r2Entry?.reason });
    } else if (r1 === 'excluded' && r2 === 'included') {
      onlyR2Included++;
      conflicts.push({ item, r1Status: r1, r2Status: r2, r2Reason: r2Entry?.reason });
    } else {
      bothExcluded++;
    }
  }

  const n = bothIncluded + onlyR1Included + onlyR2Included + bothExcluded;
  if (n === 0) {
    return {
      overlappingCount: 0,
      bothIncluded: 0,
      onlyR1Included: 0,
      onlyR2Included: 0,
      bothExcluded: 0,
      observedAgreement: 0,
      expectedAgreement: 0,
      kappa: 0,
      interpretation: 'poor',
      conflicts: [],
    };
  }

  const po = (bothIncluded + bothExcluded) / n;
  const r1Yes = (bothIncluded + onlyR1Included) / n;
  const r2Yes = (bothIncluded + onlyR2Included) / n;
  const r1No = 1 - r1Yes;
  const r2No = 1 - r2Yes;
  const pe = r1Yes * r2Yes + r1No * r2No;

  const kappa = pe >= 1 ? 1 : (po - pe) / (1 - pe);
  const roundedKappa = Math.round(kappa * 1000) / 1000;

  let interpretation: CohensKappaResult['interpretation'] = 'poor';
  if (roundedKappa > 0.8) interpretation = 'almost_perfect';
  else if (roundedKappa > 0.6) interpretation = 'substantial';
  else if (roundedKappa > 0.4) interpretation = 'moderate';
  else if (roundedKappa > 0.2) interpretation = 'fair';
  else if (roundedKappa >= 0) interpretation = 'slight';

  return {
    overlappingCount: n,
    bothIncluded,
    onlyR1Included,
    onlyR2Included,
    bothExcluded,
    observedAgreement: Math.round(po * 1000) / 1000,
    expectedAgreement: Math.round(pe * 1000) / 1000,
    kappa: roundedKappa,
    interpretation,
    conflicts,
  };
}
