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

type FreeProxyProvider =
  | 'openaire'
  | 'osf'
  | 'socarxiv'
  | 'eric'
  | 'plos'
  | 'oasisbr'
  | 'dataverse'
  | 'core'
  | 'worldbank_wds'
  | 'worldbank_okr'
  | 'ipea'
  | 'undl';

function buildFreeUpstreamUrl(
  provider: FreeProxyProvider,
  query: string,
  limit: number,
  yearFrom?: number
): string {
  const enc = encodeURIComponent(query);
  switch (provider) {
    case 'openaire': {
      const yearParam =
        yearFrom && yearFrom > 1900 ? `&fromPublicationDate=${yearFrom}-01-01` : '';
      return `https://api.openaire.eu/graph/v2/researchProducts?search=${enc}&type=publication&page=1&pageSize=${limit}${yearParam}`;
    }
    case 'osf':
      return `https://api.osf.io/v2/preprints/?filter[title,description]=${enc}&page[size]=${limit}`;
    case 'socarxiv':
      return `https://api.osf.io/v2/preprints/?filter[provider]=socarxiv&filter[title,description]=${enc}&page[size]=${limit}`;
    case 'eric':
      return `https://api.ies.ed.gov/eric/?search=${enc}&format=json&rows=${limit}`;
    case 'plos':
      return `https://api.plos.org/search?q=${enc}&wt=json&rows=${limit}&fl=id,title_display,author_display,journal,publication_date,abstract`;
    case 'oasisbr':
      return `https://oasisbr.ibict.br/vufind/api/v1/search?lookfor=${enc}&type=AllFields&limit=${limit}&field[]=id&field[]=title&field[]=authors&field[]=publicationDates&field[]=urls&field[]=summary`;
    case 'dataverse':
      return `https://dataverse.harvard.edu/api/search?q=${enc}&type=dataset&per_page=${limit}`;
    case 'core': {
      const yearSuffix = yearFrom && yearFrom > 1900 ? ` AND yearPublished>=${yearFrom}` : '';
      return `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(
        query + yearSuffix
      )}&limit=${limit}`;
    }
    case 'worldbank_wds':
      return `https://search.worldbank.org/api/v3/wds?format=json&qterm=${enc}&rows=${limit}&fl=id,display_title,authors,docdt,pdfurl,url,abstracts,docty,repnme`;
    case 'worldbank_okr':
      return `https://openknowledge.worldbank.org/server/api/discover/search/objects?query=${enc}&size=${limit}`;
    case 'ipea':
      return `https://repositorio.ipea.gov.br/server/api/discover/search/objects?query=${enc}&size=${limit}`;
    case 'undl':
      return `https://digitallibrary.un.org/search?p=${enc}&of=recjson&rg=${limit}`;
  }
}

const VALID_PROVIDERS = new Set<FreeProxyProvider>([
  'openaire',
  'osf',
  'socarxiv',
  'eric',
  'plos',
  'oasisbr',
  'dataverse',
  'core',
  'worldbank_wds',
  'worldbank_okr',
  'ipea',
  'undl',
]);

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (applyCorsHeaders(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const providerRaw = getQueryStringParam(req, 'provider').trim().toLowerCase() as FreeProxyProvider;
  if (!VALID_PROVIDERS.has(providerRaw)) {
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

  const yearRaw = Number(getQueryStringParam(req, 'yearFrom'));
  const yearFrom = Number.isFinite(yearRaw) && yearRaw > 1900 ? Math.floor(yearRaw) : undefined;

  try {
    const upstreamUrl = buildFreeUpstreamUrl(providerRaw, params.query, params.limit, yearFrom);
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
