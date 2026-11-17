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
    keyPrefix: 'arxiv',
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!allowed) return;

  const params = validateSearchParams(req, res, {
    limitKey: DEDICATED_PROXY_ROUTES.arxiv.limitParam,
    defaultLimit: DEDICATED_PROXY_ROUTES.arxiv.defaultLimit,
    maxLimit: DEDICATED_PROXY_ROUTES.arxiv.maxLimit,
    maxQueryLength: 300,
  });
  if (!params) return;

  try {
    const arxivUrl = buildDedicatedUpstreamUrl('arxiv', params.query, params.limit);

    const response = await fetch(arxivUrl, {
      headers: {
        'User-Agent': CARTOGRAPH_USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const xmlText = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `arXiv API retornou HTTP ${response.status}`,
      });
    }

    setEdgeCacheHeaders(res, 300);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(xmlText);
  } catch (err: unknown) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao consultar arXiv API',
    });
  }
}
