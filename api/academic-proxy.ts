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
import { buildFreeProxyUpstreamUrl, isFreeProxyProvider, normalizeYearFrom } from '../shared/upstreams.mjs';

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (applyCorsHeaders(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const providerRaw = getQueryStringParam(req, 'provider').trim().toLowerCase();
  if (!isFreeProxyProvider(providerRaw)) {
    return res.status(400).json({ ok: false, error: 'Provedor acadêmico inválido ou não permitido.' });
  }

  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: `academic-proxy-${providerRaw}`,
    maxRequests: 35,
    windowMs: 60_000,
  });
  if (!allowed) return;

  const params = validateSearchParams(req, res, {
    limitKey: 'limit',
    defaultLimit: 8,
    maxLimit: 15,
    maxQueryLength: 300,
  });
  if (!params) return;

  const yearFrom = normalizeYearFrom(getQueryStringParam(req, 'yearFrom'));

  try {
    const upstreamUrl = buildFreeProxyUpstreamUrl(providerRaw, params.query, params.limit, yearFrom);
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': CARTOGRAPH_USER_AGENT,
      },
      signal: AbortSignal.timeout(12_000),
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `${providerRaw} retornou HTTP ${response.status}`,
      });
    }

    setEdgeCacheHeaders(res, 300);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(text);
  } catch (err: unknown) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : `Falha ao consultar ${providerRaw}`,
    });
  }
}
