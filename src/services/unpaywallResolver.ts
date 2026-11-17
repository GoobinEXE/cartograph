import { crossPlatformFetch } from './httpClient';
import { normalizeDoi } from '../utils/deduplication';
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

    const data = (await res.json()) as Record<string, any>;
    const bestLoc = data?.best_oa_location;
    const rawPdf =
      typeof data.bestPdfUrl === 'string'
        ? data.bestPdfUrl
        : typeof bestLoc?.url_for_pdf === 'string'
        ? bestLoc.url_for_pdf
        : null;
    const rawLanding =
      typeof data.bestLandingUrl === 'string'
        ? data.bestLandingUrl
        : typeof bestLoc?.url_for_landing_page === 'string'
        ? bestLoc.url_for_landing_page
        : null;

    const result: UnpaywallResolution = {
      ok: true,
      doi,
      isOa: Boolean(data.isOa ?? data.is_oa),
      oaStatus: String(data.oaStatus || data.oa_status || 'unknown'),
      bestPdfUrl: sanitizeExternalUrl(rawPdf),
      bestLandingUrl: sanitizeExternalUrl(rawLanding),
      hostType:
        typeof data.hostType === 'string'
          ? data.hostType
          : typeof bestLoc?.host_type === 'string'
          ? bestLoc.host_type
          : null,
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
