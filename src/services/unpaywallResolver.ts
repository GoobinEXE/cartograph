import { crossPlatformFetch } from './httpClient';
import { normalizeDoi } from '../utils/deduplication';
import { asRecord, firstString, isRecord } from '../utils/json';
import { sanitizeExternalUrl } from '../utils/urlSafety';

export interface UnpaywallResolution {
  ok: boolean;
  doi: string;
  isOa: boolean;
  oaStatus: string;
  bestPdfUrl: string | null;
  bestLandingUrl: string | null;
  hostType: string | null;
  error?: string;
}

const unpaywallCache = new Map<string, UnpaywallResolution>();

/** First argument whose type is string, returned unchanged (sanitizeExternalUrl validates it). */
function firstStringValue(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === 'string') ?? null;
}

export async function resolveUnpaywallPdf(
  rawDoi: string | null | undefined,
  politeEmail?: string,
  signal?: AbortSignal
): Promise<UnpaywallResolution> {
  const doi = normalizeDoi(rawDoi);
  if (!doi || !/^10\.\d{4,9}\/[^\s]+$/i.test(doi)) {
    return {
      ok: false,
      doi: '',
      isOa: false,
      oaStatus: 'unknown',
      bestPdfUrl: null,
      bestLandingUrl: null,
      hostType: null,
      error: 'Missing or invalid DOI',
    };
  }

  const cacheKey = `${doi}:${politeEmail || ''}`;
  const cached = unpaywallCache.get(cacheKey);
  if (cached) return cached;

  const emailQuery = politeEmail?.trim() ? `&email=${encodeURIComponent(politeEmail.trim())}` : '';
  const path = `/api/unpaywall?doi=${encodeURIComponent(doi)}${emailQuery}`;
  const directEmail = politeEmail?.trim() || 'researcher@cartographsearch.com';
  const directUrl = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(directEmail)}`;

  try {
    const res = await crossPlatformFetch(path, directUrl, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        doi,
        isOa: false,
        oaStatus: 'error',
        bestPdfUrl: null,
        bestLandingUrl: null,
        hostType: null,
        error: `HTTP ${res.status}`,
      };
    }

    // Accepts both the proxy shape (camelCase) and the raw Unpaywall v2 shape (direct fallback).
    const payload: unknown = await res.json();
    if (!isRecord(payload)) {
      return {
        ok: false,
        doi,
        isOa: false,
        oaStatus: 'error',
        bestPdfUrl: null,
        bestLandingUrl: null,
        hostType: null,
        error: 'Malformed Unpaywall response',
      };
    }
    const bestLoc = asRecord(payload.best_oa_location);

    const result: UnpaywallResolution = {
      ok: true,
      doi,
      isOa: Boolean(payload.isOa ?? payload.is_oa),
      oaStatus: firstString(payload.oaStatus, payload.oa_status) ?? 'unknown',
      bestPdfUrl: sanitizeExternalUrl(firstStringValue(payload.bestPdfUrl, bestLoc.url_for_pdf)),
      bestLandingUrl: sanitizeExternalUrl(firstStringValue(payload.bestLandingUrl, bestLoc.url_for_landing_page)),
      hostType: firstStringValue(payload.hostType, bestLoc.host_type),
    };

    if (unpaywallCache.size > 200) {
      const oldest = unpaywallCache.keys().next().value;
      if (oldest) unpaywallCache.delete(oldest);
    }
    unpaywallCache.set(cacheKey, result);
    return result;
  } catch (err) {
    return {
      ok: false,
      doi,
      isOa: false,
      oaStatus: 'error',
      bestPdfUrl: null,
      bestLandingUrl: null,
      hostType: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
