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

type UpstreamObject = Readonly<Record<string, unknown>>;

// Local narrowing: functions in api/ import only from shared/ and ./_security.js, not src/.
function asObject(value: unknown): UpstreamObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as UpstreamObject) : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

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

    const data = asObject(await response.json());
    const bestLoc = asObject(data.best_oa_location);
    setEdgeCacheHeaders(res, 3600);
    res.status(200).json({
      ok: true,
      doi: rawDoi,
      isOa: Boolean(data.is_oa),
      oaStatus: stringOrNull(data.oa_status) ?? 'unknown',
      bestPdfUrl: stringOrNull(bestLoc.url_for_pdf),
      bestLandingUrl: stringOrNull(bestLoc.url_for_landing_page),
      hostType: stringOrNull(bestLoc.host_type),
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unpaywall upstream error',
    });
  }
}
