import {
  applyCorsHeaders,
  CARTOGRAPH_USER_AGENT,
  enforceRateLimit,
  getQueryStringParam,
  type MinimalRequest,
  type MinimalResponse,
  setEdgeCacheHeaders,
  validateSearchParams,
} from './_security.js';
import { buildTranslateUpstreamUrl } from '../shared/upstreams.mjs';

const ALLOWED_LANGS = new Set(['pt', 'en', 'es', 'fr']);

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (applyCorsHeaders(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: 'translate',
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!allowed) return;

  const params = validateSearchParams(req, res, {
    limitKey: 'limit',
    defaultLimit: 1,
    maxLimit: 1,
    maxQueryLength: 300,
  });
  if (!params) return;

  const fromRaw = getQueryStringParam(req, 'from').trim().toLowerCase() || 'pt';
  const toRaw = getQueryStringParam(req, 'to').trim().toLowerCase() || 'en';
  const from = ALLOWED_LANGS.has(fromRaw) ? fromRaw : 'pt';
  const to = ALLOWED_LANGS.has(toRaw) ? toRaw : 'en';

  try {
    const apiUrl = buildTranslateUpstreamUrl(params.query, from, to, process.env.MYMEMORY_EMAIL);

    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': CARTOGRAPH_USER_AGENT },
      signal: AbortSignal.timeout(6_000),
    });

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        original: params.query,
        translated: params.query,
      });
    }

    const data = (await response.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const candidate = data?.responseData?.translatedText?.trim() || '';
    const isQuotaWarning = candidate.toUpperCase().includes('MYMEMORY WARNING');
    const translatedText = !candidate || isQuotaWarning ? params.query : candidate;

    if (!isQuotaWarning && candidate) {
      setEdgeCacheHeaders(res, 86_400);
    }

    return res.status(200).json({
      ok: Boolean(candidate && !isQuotaWarning),
      original: params.query,
      translated: translatedText,
    });
  } catch {
    return res.status(200).json({
      ok: false,
      original: params.query,
      translated: params.query,
    });
  }
}
