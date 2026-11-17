import {
  applyCorsHeaders,
  CARTOGRAPH_USER_AGENT,
  enforceRateLimit,
  getQueryStringParam,
  type MinimalRequest,
  type MinimalResponse,
  setEdgeCacheHeaders,
} from './_security.js';
import { buildUnpaywallUpstreamUrl } from '../shared/upstreams.mjs';
import { isBareDoi, normalizeDoi } from '../shared/identifiers.mjs';

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_POLITE_EMAIL = 'researcher@cartographsearch.com';

export default async function handler(
  req: MinimalRequest,
  res: MinimalResponse
): Promise<void> {
  if (applyCorsHeaders(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (
    !(await enforceRateLimit(req, res, {
      keyPrefix: 'unpaywall',
      maxRequests: 60,
      windowMs: 60_000,
    }))
  ) {
    return;
  }

  const rawDoi = normalizeDoi(getQueryStringParam(req, 'doi').slice(0, 220)) ?? '';

  if (!isBareDoi(rawDoi)) {
    res.status(400).json({ ok: false, error: 'Invalid DOI format' });
    return;
  }

  const rawEmail = getQueryStringParam(req, 'email').slice(0, 160).trim();
  const politeEmail = EMAIL_FORMAT_RE.test(rawEmail)
    ? rawEmail
    : process.env.UNPAYWALL_EMAIL || DEFAULT_POLITE_EMAIL;

  try {
    const upstreamUrl = buildUnpaywallUpstreamUrl(rawDoi, politeEmail);
    const response = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': CARTOGRAPH_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (response.status === 404) {
      res.status(200).json({
        ok: true,
        doi: rawDoi,
        isOa: false,
        oaStatus: 'closed',
        bestPdfUrl: null,
        bestLandingUrl: null,
        hostType: null,
      });
      return;
    }

    if (!response.ok) {
      res.status(response.status).json({
        ok: false,
        error: `Unpaywall HTTP ${response.status}`,
      });
      return;
    }

    const data = (await response.json()) as Record<string, any>;
    const bestLoc = data?.best_oa_location || null;
    setEdgeCacheHeaders(res, 3600);
    res.status(200).json({
      ok: true,
      doi: rawDoi,
      isOa: Boolean(data?.is_oa),
      oaStatus: typeof data?.oa_status === 'string' ? data.oa_status : 'unknown',
      bestPdfUrl: typeof bestLoc?.url_for_pdf === 'string' ? bestLoc.url_for_pdf : null,
      bestLandingUrl: typeof bestLoc?.url_for_landing_page === 'string' ? bestLoc.url_for_landing_page : null,
      hostType: typeof bestLoc?.host_type === 'string' ? bestLoc.host_type : null,
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unpaywall upstream error',
    });
  }
}
