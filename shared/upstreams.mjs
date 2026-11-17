// @ts-check
/**
 * Single source for every upstream academic API URL used by Cartograph.
 *
 * Three runtimes consume this module and must agree byte-for-byte on what they request:
 * the browser/Tauri adapters (direct URLs and proxy paths), the Vercel functions in api/,
 * and the local launcher bridge (server/launcher-bridge.mjs). It is plain ESM with JSDoc
 * types because the bridge runs on bare Node without a TypeScript step; tsconfig enables
 * allowJs so the app type-checks against these signatures.
 */

export const CARTOGRAPH_USER_AGENT =
  'Cartograph/2.4 (Academic Metasearch Hub; https://cartographsearch.com)';

/**
 * Year filters below this value are ignored everywhere (UI, proxies, upstream URLs).
 * @param {unknown} raw
 * @returns {number | undefined}
 */
export function normalizeYearFrom(raw) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 1900 ? Math.floor(value) : undefined;
}

/**
 * @param {number | undefined} yearFrom
 * @returns {string}
 */
function yearFromParam(yearFrom) {
  const year = normalizeYearFrom(yearFrom);
  return year ? `&yearFrom=${year}` : '';
}

// ---------------------------------------------------------------------------
// Generic academic proxy (/api/academic-proxy?provider=...)
// ---------------------------------------------------------------------------

/** @typedef {'openaire' | 'osf' | 'socarxiv' | 'eric' | 'plos' | 'oasisbr' | 'dataverse' | 'core' | 'worldbank_wds' | 'worldbank_okr' | 'ipea' | 'undl'} FreeProxyProvider */

/** @type {readonly FreeProxyProvider[]} */
export const FREE_PROXY_PROVIDERS = Object.freeze([
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

/**
 * @param {unknown} value
 * @returns {value is FreeProxyProvider}
 */
export function isFreeProxyProvider(value) {
  return typeof value === 'string' && /** @type {readonly string[]} */ (FREE_PROXY_PROVIDERS).includes(value);
}

/**
 * @param {FreeProxyProvider} provider
 * @param {string} query
 * @param {number} limit
 * @param {number} [yearFrom]
 * @returns {string}
 */
export function buildFreeProxyUpstreamUrl(provider, query, limit, yearFrom) {
  const enc = encodeURIComponent(query);
  const year = normalizeYearFrom(yearFrom);
  switch (provider) {
    case 'openaire':
      return `https://api.openaire.eu/graph/v2/researchProducts?search=${enc}&type=publication&page=1&pageSize=${limit}${
        year ? `&fromPublicationDate=${year}-01-01` : ''
      }`;
    case 'osf':
      return `https://api.osf.io/v2/preprints/?filter[title,description]=${enc}&page[size]=${limit}`;
    case 'socarxiv':
      return `https://api.osf.io/v2/preprints/?filter[provider]=socarxiv&filter[title,description]=${enc}&page[size]=${limit}`;
    case 'eric':
      return `https://api.ies.ed.gov/eric/?search=${enc}&format=json&rows=${limit}`;
    case 'plos':
      return `https://api.plos.org/search?q=${enc}&wt=json&rows=${limit}&fl=id,title_display,author_display,journal,publication_date,abstract,article_type`;
    case 'oasisbr':
      return `https://oasisbr.ibict.br/vufind/api/v1/search?lookfor=${enc}&type=AllFields&limit=${limit}&field[]=id&field[]=title&field[]=authors&field[]=publicationDates&field[]=urls&field[]=summary&field[]=formats`;
    case 'dataverse':
      return `https://dataverse.harvard.edu/api/search?q=${enc}&type=dataset&per_page=${limit}`;
    case 'core':
      return `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(
        query + (year ? ` AND yearPublished>=${year}` : '')
      )}&limit=${limit}`;
    case 'worldbank_wds':
      return `https://search.worldbank.org/api/v3/wds?format=json&qterm=${enc}&rows=${limit}&fl=id,display_title,authors,docdt,pdfurl,url,abstracts,docty,repnme`;
    case 'worldbank_okr':
      return `https://openknowledge.worldbank.org/server/api/discover/search/objects?query=${enc}&size=${limit}`;
    case 'ipea':
      return `https://repositorio.ipea.gov.br/server/api/discover/search/objects?query=${enc}&size=${limit}`;
    case 'undl':
      return `https://digitallibrary.un.org/search?p=${enc}&of=recjson&rg=${limit}`;
    default:
      throw new Error(`Unknown academic proxy provider: ${String(provider)}`);
  }
}

/**
 * Same-origin path the browser calls; the proxy rebuilds the upstream URL with
 * buildFreeProxyUpstreamUrl, so both sides always request the same resource.
 * @param {FreeProxyProvider} provider
 * @param {string} query
 * @param {number} limit
 * @param {number} [yearFrom]
 * @returns {string}
 */
export function buildFreeProxyPath(provider, query, limit, yearFrom) {
  return `/api/academic-proxy?provider=${encodeURIComponent(provider)}&q=${encodeURIComponent(
    query
  )}&limit=${limit}${yearFromParam(yearFrom)}`;
}

// ---------------------------------------------------------------------------
// Dedicated proxies (/api/arxiv, /api/zenodo, /api/osti, /api/ntrs)
// ---------------------------------------------------------------------------

/** @typedef {'arxiv' | 'zenodo' | 'osti' | 'ntrs'} DedicatedProxySource */
/** @typedef {{ path: string, limitParam: string, defaultLimit: number, maxLimit: number }} DedicatedProxyRoute */

/** @type {Readonly<Record<DedicatedProxySource, DedicatedProxyRoute>>} */
export const DEDICATED_PROXY_ROUTES = Object.freeze({
  arxiv: { path: '/api/arxiv', limitParam: 'max_results', defaultLimit: 12, maxLimit: 25 },
  zenodo: { path: '/api/zenodo', limitParam: 'size', defaultLimit: 8, maxLimit: 20 },
  osti: { path: '/api/osti', limitParam: 'rows', defaultLimit: 8, maxLimit: 20 },
  ntrs: { path: '/api/ntrs', limitParam: 'size', defaultLimit: 8, maxLimit: 20 },
});

/**
 * @param {DedicatedProxySource} source
 * @param {string} query
 * @param {number} limit
 * @returns {string}
 */
export function buildDedicatedUpstreamUrl(source, query, limit) {
  const enc = encodeURIComponent(query.trim());
  switch (source) {
    case 'arxiv':
      return `https://export.arxiv.org/api/query?search_query=all:${enc}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`;
    case 'zenodo':
      return `https://zenodo.org/api/records?q=${enc}&size=${limit}&sort=bestmatch`;
    case 'osti':
      return `https://www.osti.gov/api/v1/records?q=${enc}&rows=${limit}`;
    case 'ntrs':
      return `https://ntrs.nasa.gov/api/citations/search?q=${enc}&page%5Bsize%5D=${limit}`;
    default:
      throw new Error(`Unknown dedicated proxy source: ${String(source)}`);
  }
}

/**
 * @param {DedicatedProxySource} source
 * @param {string} query
 * @param {number} limit
 * @returns {string}
 */
export function buildDedicatedProxyPath(source, query, limit) {
  const route = DEDICATED_PROXY_ROUTES[source];
  return `${route.path}?q=${encodeURIComponent(query)}&${route.limitParam}=${limit}`;
}

// ---------------------------------------------------------------------------
// BYOK proxy (/api/byok-proxy?provider=...) with the user's own credential
// ---------------------------------------------------------------------------

/** @typedef {'semanticscholar' | 'core' | 'springer' | 'scopus' | 'sciencedirect' | 'ieeexplore' | 'lens' | 'fedinprint' | 'govinfo'} ByokUpstreamProvider */
/** @typedef {{ url: string, method: 'GET' | 'POST', headers: Record<string, string>, body?: string }} UpstreamRequestSpec */

/** @type {readonly ByokUpstreamProvider[]} */
export const BYOK_UPSTREAM_PROVIDERS = Object.freeze([
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

/**
 * @param {unknown} value
 * @returns {value is ByokUpstreamProvider}
 */
export function isByokUpstreamProvider(value) {
  return typeof value === 'string' && /** @type {readonly string[]} */ (BYOK_UPSTREAM_PROVIDERS).includes(value);
}

/**
 * Builds the authenticated upstream request. `userAgent` is set by server runtimes only:
 * browsers forbid overriding it, while Tauri's native HTTP client accepts it.
 * @param {ByokUpstreamProvider} provider
 * @param {{ query: string, limit: number, apiKey: string, instToken?: string, yearFrom?: number, userAgent?: string }} params
 * @returns {UpstreamRequestSpec}
 */
export function buildByokUpstreamSpec(provider, params) {
  const { query, limit, apiKey, instToken, userAgent } = params;
  const year = normalizeYearFrom(params.yearFrom);
  const enc = encodeURIComponent(query);
  /** @type {Record<string, string>} */
  const baseHeaders = { Accept: 'application/json' };
  if (userAgent) baseHeaders['User-Agent'] = userAgent;

  switch (provider) {
    case 'semanticscholar':
      return {
        url: `https://api.semanticscholar.org/graph/v1/paper/search?query=${enc}&limit=${limit}${
          year ? `&year=${year}-` : ''
        }&fields=paperId,title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,abstract,externalIds,url`,
        method: 'GET',
        headers: { ...baseHeaders, 'x-api-key': apiKey },
      };
    case 'core':
      return {
        url: buildFreeProxyUpstreamUrl('core', query, limit, year),
        method: 'GET',
        headers: { ...baseHeaders, Authorization: `Bearer ${apiKey}` },
      };
    case 'springer':
      return {
        url: `https://api.springernature.com/openaccess/json?q=${encodeURIComponent(
          query + (year ? ` year:${year}` : '')
        )}&p=${limit}`,
        method: 'GET',
        headers: { ...baseHeaders, 'X-ApiKey': apiKey },
      };
    case 'scopus':
      return {
        url: `https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(
          `TITLE-ABS-KEY(${query})${year ? ` AND PUBYEAR > ${year - 1}` : ''}`
        )}&count=${limit}`,
        method: 'GET',
        headers: {
          ...baseHeaders,
          'X-ELS-APIKey': apiKey,
          ...(instToken ? { 'X-ELS-Insttoken': instToken } : {}),
        },
      };
    case 'sciencedirect':
      return {
        url: `https://api.elsevier.com/content/search/sciencedirect?query=${enc}&count=${limit}`,
        method: 'GET',
        headers: {
          ...baseHeaders,
          'X-ELS-APIKey': apiKey,
          ...(instToken ? { 'X-ELS-Insttoken': instToken } : {}),
        },
      };
    case 'ieeexplore':
      return {
        url: `https://ieeexploreapi.ieee.org/api/v1/search/articles?querytext=${enc}&max_records=${limit}${
          year ? `&start_year=${year}` : ''
        }&apikey=${encodeURIComponent(apiKey)}`,
        method: 'GET',
        headers: baseHeaders,
      };
    case 'lens': {
      const queryString = { query_string: { query } };
      const payload = {
        query: year
          ? { bool: { must: [queryString, { range: { year_published: { gte: year } } }] } }
          : queryString,
        size: limit,
      };
      return {
        url: 'https://api.lens.org/scholarly/search',
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
      };
    }
    case 'fedinprint':
      return {
        url: `https://fedinprint.org/api/item?q=${enc}&limit=${limit}`,
        method: 'GET',
        headers: { ...baseHeaders, 'X-API-Key': apiKey },
      };
    case 'govinfo':
      return {
        url: `https://api.congress.gov/v3/bill?query=${enc}&limit=${limit}&format=json`,
        method: 'GET',
        headers: { ...baseHeaders, 'X-Api-Key': apiKey },
      };
    default:
      throw new Error(`Unknown BYOK provider: ${String(provider)}`);
  }
}

/**
 * @param {ByokUpstreamProvider} provider
 * @param {string} query
 * @param {number} limit
 * @param {number} [yearFrom]
 * @returns {string}
 */
export function buildByokProxyPath(provider, query, limit, yearFrom) {
  return `/api/byok-proxy?provider=${encodeURIComponent(provider)}&q=${encodeURIComponent(
    query
  )}&limit=${limit}${yearFromParam(yearFrom)}`;
}

// ---------------------------------------------------------------------------
// Auxiliary services
// ---------------------------------------------------------------------------

/**
 * @param {string} doi bare DOI (no https://doi.org/ prefix)
 * @param {string} email polite-pool contact required by Unpaywall
 * @returns {string}
 */
export function buildUnpaywallUpstreamUrl(doi, email) {
  return `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;
}

/**
 * @param {string} text
 * @param {string} from
 * @param {string} to
 * @param {string} [contactEmail] MyMemory raises the daily quota when `de` is present
 * @returns {string}
 */
export function buildTranslateUpstreamUrl(text, from, to, contactEmail) {
  const email = contactEmail?.trim();
  return `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}${
    email ? `&de=${encodeURIComponent(email)}` : ''
  }`;
}
