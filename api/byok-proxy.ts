import {
  applyCorsHeaders,
  CARTOGRAPH_USER_AGENT,
  enforceRateLimit,
  getQueryStringParam,
  type MinimalRequest,
  type MinimalResponse,
  validateSearchParams,
} from './_security.js';

type ByokUpstreamId =
  | 'semanticscholar'
  | 'core'
  | 'springer'
  | 'scopus'
  | 'sciencedirect'
  | 'ieeexplore'
  | 'lens'
  | 'fedinprint'
  | 'govinfo';

const VALID_BYOK_PROVIDERS = new Set<ByokUpstreamId>([
  'semanticscholar',
  'core',
  'springer',
  'scopus',
  'sciencedirect',
  'ieeexplore',
  'lens',
  'fedinprint',
  'govinfo',
]);

function readHeaderValue(req: MinimalRequest, name: string): string {
  const raw = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  if (Array.isArray(raw)) return (raw[0] || '').trim();
  return typeof raw === 'string' ? raw.trim() : '';
}

interface UpstreamSpec {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

function buildByokUpstreamSpec(
  provider: ByokUpstreamId,
  query: string,
  limit: number,
  apiKey: string,
  instToken?: string,
  yearFrom?: number
): UpstreamSpec {
  const enc = encodeURIComponent(query);
  const baseHeaders: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': CARTOGRAPH_USER_AGENT,
  };

  switch (provider) {
    case 'semanticscholar': {
      const yearParam = yearFrom && yearFrom > 1900 ? `&year=${yearFrom}-` : '';
      return {
        url: `https://api.semanticscholar.org/graph/v1/paper/search?query=${enc}&limit=${limit}${yearParam}&fields=paperId,title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,abstract,externalIds,url`,
        method: 'GET',
        headers: { ...baseHeaders, 'x-api-key': apiKey },
      };
    }
    case 'core': {
      const yearSuffix = yearFrom && yearFrom > 1900 ? ` AND yearPublished>=${yearFrom}` : '';
      return {
        url: `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(
          query + yearSuffix
        )}&limit=${limit}`,
        method: 'GET',
        headers: { ...baseHeaders, Authorization: `Bearer ${apiKey}` },
      };
    }
    case 'springer': {
      const yearSuffix = yearFrom && yearFrom > 1900 ? ` year:${yearFrom}` : '';
      return {
        url: `https://api.springernature.com/openaccess/json?q=${encodeURIComponent(
          query + yearSuffix
        )}&p=${limit}`,
        method: 'GET',
        headers: { ...baseHeaders, 'X-ApiKey': apiKey },
      };
    }
    case 'scopus': {
      const yearExpr = yearFrom && yearFrom > 1900 ? ` AND PUBYEAR > ${yearFrom - 1}` : '';
      const headers: Record<string, string> = {
        ...baseHeaders,
        'X-ELS-APIKey': apiKey,
      };
      if (instToken) headers['X-ELS-Insttoken'] = instToken;
      return {
        url: `https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(
          `TITLE-ABS-KEY(${query})${yearExpr}`
        )}&count=${limit}`,
        method: 'GET',
        headers,
      };
    }
    case 'sciencedirect': {
      const headers: Record<string, string> = {
        ...baseHeaders,
        'X-ELS-APIKey': apiKey,
      };
      if (instToken) headers['X-ELS-Insttoken'] = instToken;
      return {
        url: `https://api.elsevier.com/content/search/sciencedirect?query=${enc}&count=${limit}`,
        method: 'GET',
        headers,
      };
    }
    case 'ieeexplore': {
      const yearParam = yearFrom && yearFrom > 1900 ? `&start_year=${yearFrom}` : '';
      return {
        url: `https://ieeexploreapi.ieee.org/api/v1/search/articles?querytext=${enc}&max_records=${limit}${yearParam}&apikey=${encodeURIComponent(
          apiKey
        )}`,
        method: 'GET',
        headers: baseHeaders,
      };
    }
    case 'lens': {
      const payload: Record<string, unknown> = {
        query: {
          query_string: {
            query,
          },
        },
        size: limit,
      };
      if (yearFrom && yearFrom > 1900) {
        payload.query = {
          bool: {
            must: [
              { query_string: { query } },
              { range: { year_published: { gte: yearFrom } } },
            ],
          },
        };
      }
      return {
        url: 'https://api.lens.org/scholarly/search',
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      };
    }
    case 'fedinprint': {
      return {
        url: `https://fedinprint.org/api/item?q=${enc}&limit=${limit}`,
        method: 'GET',
        headers: { ...baseHeaders, 'X-API-Key': apiKey },
      };
    }
    case 'govinfo': {
      return {
        url: `https://api.congress.gov/v3/bill?query=${enc}&limit=${limit}&format=json`,
        method: 'GET',
        headers: { ...baseHeaders, 'X-Api-Key': apiKey },
      };
    }
  }
}

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (applyCorsHeaders(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const providerRaw = getQueryStringParam(req, 'provider').trim().toLowerCase() as ByokUpstreamId;
  if (!VALID_BYOK_PROVIDERS.has(providerRaw)) {
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
  const yearRaw = Number(getQueryStringParam(req, 'yearFrom'));
  const yearFrom = Number.isFinite(yearRaw) && yearRaw > 1900 ? Math.floor(yearRaw) : undefined;

  try {
    const spec = buildByokUpstreamSpec(
      providerRaw,
      params.query,
      params.limit,
      userKey,
      instToken,
      yearFrom
    );
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
