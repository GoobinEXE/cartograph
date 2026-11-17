import {
  applyCorsHeaders,
  CARTOGRAPH_USER_AGENT,
  enforceRateLimit,
  getQueryStringParam,
  type MinimalRequest,
  type MinimalResponse,
  validateSearchParams,
} from './_security.js';
import { buildByokUpstreamSpec, isByokUpstreamProvider, normalizeYearFrom } from '../shared/upstreams.mjs';

function readHeaderValue(req: MinimalRequest, name: string): string {
  const raw = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  if (Array.isArray(raw)) return (raw[0] || '').trim();
  return typeof raw === 'string' ? raw.trim() : '';
}

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (applyCorsHeaders(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const providerRaw = getQueryStringParam(req, 'provider').trim().toLowerCase();
  if (!isByokUpstreamProvider(providerRaw)) {
    return res.status(400).json({ ok: false, error: 'Provedor BYOK inválido ou não permitido.' });
  }

  const userKey = readHeaderValue(req, 'x-cartograph-key');
  if (!userKey || userKey.length > 512) {
    return res.status(401).json({
      ok: false,
      error: 'Chave de API do usuário ausente (header X-Cartograph-Key).',
    });
  }

  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: `byok-proxy-${providerRaw}`,
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

  const instToken = readHeaderValue(req, 'x-cartograph-inst-token') || undefined;
  const yearFrom = normalizeYearFrom(getQueryStringParam(req, 'yearFrom'));

  try {
    const spec = buildByokUpstreamSpec(providerRaw, {
      query: params.query,
      limit: params.limit,
      apiKey: userKey,
      instToken,
      yearFrom,
      userAgent: CARTOGRAPH_USER_AGENT,
    });
    const response = await fetch(spec.url, {
      method: spec.method,
      headers: spec.headers,
      body: spec.body,
      signal: AbortSignal.timeout(12_000),
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `${providerRaw} retornou HTTP ${response.status}`,
      });
    }

    // Never edge-cache private/authenticated responses
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(text);
  } catch (err: unknown) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : `Falha ao consultar ${providerRaw}`,
    });
  }
}
