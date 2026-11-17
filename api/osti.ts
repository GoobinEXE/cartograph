import {
  applyCorsHeaders,
  CARTOGRAPH_USER_AGENT,
  enforceRateLimit,
  type MinimalRequest,
  type MinimalResponse,
  setEdgeCacheHeaders,
  validateSearchParams,
} from './_security.js';
import { DEDICATED_PROXY_ROUTES, buildDedicatedUpstreamUrl } from '../shared/upstreams.mjs';

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (applyCorsHeaders(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: 'osti',
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!allowed) return;

  const params = validateSearchParams(req, res, {
    limitKey: DEDICATED_PROXY_ROUTES.osti.limitParam,
    defaultLimit: DEDICATED_PROXY_ROUTES.osti.defaultLimit,
    maxLimit: DEDICATED_PROXY_ROUTES.osti.maxLimit,
    maxQueryLength: 300,
  });
  if (!params) return;

  try {
    const ostiUrl = buildDedicatedUpstreamUrl('osti', params.query, params.limit);

    const response = await fetch(ostiUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': CARTOGRAPH_USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    if (response.ok) {
      setEdgeCacheHeaders(res, 300);
    }
    return res.status(response.status).json(data);
  } catch (err: unknown) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao consultar OSTI.GOV API',
    });
  }
}
