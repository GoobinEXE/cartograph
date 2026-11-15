import {
  applyCorsHeaders,
  CARTOGRAPH_USER_AGENT,
  enforceRateLimit,
  type MinimalRequest,
  type MinimalResponse,
  setEdgeCacheHeaders,
  validateSearchParams,
} from './_security';

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
    limitKey: 'max_results',
    defaultLimit: 12,
    maxLimit: 25,
    maxQueryLength: 300,
  });
  if (!params) return;

  try {
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      params.query
    )}&start=0&max_results=${params.limit}&sortBy=relevance&sortOrder=descending`;

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
