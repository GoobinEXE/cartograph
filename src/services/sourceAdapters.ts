import { ByokCredentialEntry, NormalizedPaper } from '../types/academic';
import { cleanDoi, fetchFreeProxyJson, fetchViaByokProxy } from './httpClient';

function extractYear(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 1800 && raw < 2100) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string') {
    const match = raw.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

function filterByYear(papers: NormalizedPaper[], yearFrom?: number): NormalizedPaper[] {
  if (!yearFrom || yearFrom <= 1900) return papers;
  return papers.filter((p) => !p.year || p.year >= yearFrom);
}

// ---------------------------------------------------------------------------
// Phase 1: Pure Parsers & Search Adapters for Free No-Key Sources
// ---------------------------------------------------------------------------

export function parseOpenAireResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const results = Array.isArray((data as Record<string, any>)?.results)
    ? (data as Record<string, any>).results
    : [];

  const mapped: NormalizedPaper[] = [];
  for (const item of results) {
    const pids = Array.isArray(item?.pids) ? item.pids : [];
    const doiObj = pids.find((p: Record<string, any>) => String(p?.scheme).toLowerCase() === 'doi');
    const doi = cleanDoi(doiObj?.value);
    const instances = Array.isArray(item?.instances) ? item.instances : [];
    const firstUrl = instances.find((inst: Record<string, any>) => Array.isArray(inst?.urls) && inst.urls[0])?.urls?.[0];
    const oaInstanceUrl = instances.find(
      (inst: Record<string, any>) =>
        String(inst?.accessRight?.label || '').toUpperCase() === 'OPEN' &&
        Array.isArray(inst?.urls) &&
        inst.urls[0]
    )?.urls?.[0];
    const isOa =
      String(item?.bestAccessRight?.label || '').toUpperCase() === 'OPEN' ||
      Boolean(item?.isGreen) ||
      Boolean(item?.isInDiamondJournal);

    const descriptions = Array.isArray(item?.descriptions) ? item.descriptions : [];
    const cleanDesc = descriptions.find(
      (d: unknown) => typeof d === 'string' && d.trim().length > 25 && !/^(WOS:|PMID:|DOI:)/i.test(d.trim())
    );
    const authors = Array.isArray(item?.authors)
      ? item.authors
          .map((a: Record<string, any>) => String(a?.fullName || '').trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    const idStr = String(item?.id || doi || mapped.length);
    const fallbackUrl = `https://explore.openaire.eu/search/publication?articleId=${encodeURIComponent(idStr)}`;
    const url = doi ? `https://doi.org/${doi}` : String(firstUrl || fallbackUrl);
    const pdfUrl =
      typeof oaInstanceUrl === 'string' && /\.pdf($|\?)/i.test(oaInstanceUrl) ? oaInstanceUrl : null;

    mapped.push({
      id: `openaire-${idStr}`,
      title: String(item?.mainTitle || 'Sem título').trim(),
      authors,
      year: extractYear(item?.publicationDate),
      venue: String(item?.container?.name || item?.publisher || 'OpenAIRE Graph'),
      doi,
      url,
      pdfUrl,
      isOpenAccess: isOa,
      citationCount: Math.max(0, Math.round(Number(item?.indicators?.citationImpact?.citationCount || 0))),
      abstractText: cleanDesc ? String(cleanDesc).trim() : null,
      source: 'openaire',
      sourceLabel: 'OpenAIRE Graph',
      publicationType: item?.type ? String(item.type) : undefined,
    });
  }

  return filterByYear(mapped, yearFrom);
}

export async function searchOpenAire(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('openaire', query, 8, yearFrom, signal);
  return parseOpenAireResults(data, yearFrom);
}

export function parseOsfPreprintsResults(
  data: unknown,
  sourceId: 'osf' | 'socarxiv',
  sourceLabel: string,
  yearFrom?: number
): NormalizedPaper[] {
  const items = Array.isArray((data as Record<string, any>)?.data)
    ? (data as Record<string, any>).data
    : [];

  const mapped: NormalizedPaper[] = [];
  for (const item of items) {
    const attrs = item?.attributes || {};
    const doi = cleanDoi(attrs?.doi || item?.links?.preprint_doi);
    const rawHtml = item?.links?.html;
    const basePage =
      typeof rawHtml === 'string' && rawHtml
        ? rawHtml
        : `https://osf.io/preprints/${sourceId === 'socarxiv' ? 'socarxiv/' : ''}${item?.id}`;

    mapped.push({
      id: `${sourceId}-${item?.id || mapped.length}`,
      title: String(attrs?.title || 'Sem título').trim(),
      authors: [],
      year: extractYear(attrs?.date_published || attrs?.original_publication_date || attrs?.date_created),
      venue: sourceId === 'socarxiv' ? 'SocArXiv' : 'OSF Preprints',
      doi,
      url: basePage,
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: attrs?.description ? String(attrs.description).trim() : null,
      source: sourceId,
      sourceLabel,
      publicationType: 'Preprint',
    });
  }

  return filterByYear(mapped, yearFrom);
}

export async function searchOsfPreprints(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('osf', query, 8, yearFrom, signal);
  return parseOsfPreprintsResults(data, 'osf', 'OSF Preprints', yearFrom);
}

export async function searchSocArxiv(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('socarxiv', query, 8, yearFrom, signal);
  return parseOsfPreprintsResults(data, 'socarxiv', 'SocArXiv (OSF)', yearFrom);
}

export function parseEricResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const docs = Array.isArray((data as Record<string, any>)?.response?.docs)
    ? (data as Record<string, any>).response.docs
    : [];

  const mapped: NormalizedPaper[] = docs.map((doc: Record<string, any>) => {
    const idStr = String(doc?.id || '');
    const isDirectPdf = Number(doc?.e_fulltextauth) === 1 && idStr.startsWith('ED');
    return {
      id: `eric-${idStr || Math.random().toString(36).slice(2)}`,
      title: String(doc?.title || 'Sem título').trim(),
      authors: Array.isArray(doc?.author) ? doc.author.map(String).slice(0, 8) : [],
      year: extractYear(doc?.publicationdateyear),
      venue: String(doc?.source || doc?.publisher || 'ERIC (IES)'),
      doi: null,
      url: `https://eric.ed.gov/?id=${encodeURIComponent(idStr)}`,
      pdfUrl: isDirectPdf ? `https://files.eric.ed.gov/fulltext/${encodeURIComponent(idStr)}.pdf` : null,
      isOpenAccess: Number(doc?.e_fulltextauth) === 1,
      citationCount: 0,
      abstractText: doc?.description ? String(doc.description).trim() : null,
      source: 'eric',
      sourceLabel: 'ERIC (IES)',
      publicationType: Array.isArray(doc?.publicationtype) ? String(doc.publicationtype[0]) : undefined,
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchEric(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('eric', query, 8, yearFrom, signal);
  return parseEricResults(data, yearFrom);
}

export function parsePlosResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const docs = Array.isArray((data as Record<string, any>)?.response?.docs)
    ? (data as Record<string, any>).response.docs
    : [];

  const mapped: NormalizedPaper[] = docs.map((doc: Record<string, any>) => {
    const doi = cleanDoi(doc?.id);
    const absRaw = Array.isArray(doc?.abstract) ? doc.abstract.join(' ') : doc?.abstract;
    const rawTitle = Array.isArray(doc?.title_display) ? doc.title_display[0] : doc?.title_display;
    return {
      id: `plos-${doi || Math.random().toString(36).slice(2)}`,
      title: String(rawTitle || 'Sem título').trim(),
      authors: Array.isArray(doc?.author_display) ? doc.author_display.map(String).slice(0, 8) : [],
      year: extractYear(doc?.publication_date),
      venue: String(doc?.journal || 'PLOS'),
      doi,
      url: doi
        ? `https://journals.plos.org/plosone/article?id=${encodeURIComponent(doi)}`
        : 'https://plos.org/',
      pdfUrl: doi
        ? `https://journals.plos.org/plosone/article/file?id=${encodeURIComponent(doi)}&type=printable`
        : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: absRaw ? String(absRaw).trim() : null,
      source: 'plos',
      sourceLabel: 'PLOS Open Access',
      publicationType: doc?.article_type ? String(doc.article_type) : 'Journal Article',
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchPlos(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('plos', query, 8, yearFrom, signal);
  return parsePlosResults(data, yearFrom);
}

export function parseOasisbrResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const records = Array.isArray((data as Record<string, any>)?.records)
    ? (data as Record<string, any>).records
    : [];

  const mapped: NormalizedPaper[] = records.map((rec: Record<string, any>) => {
    const primaryAuthors =
      rec?.authors?.primary && typeof rec.authors.primary === 'object'
        ? Object.keys(rec.authors.primary)
        : [];
    const rawUrl = Array.isArray(rec?.urls) ? rec.urls[0]?.url : null;
    const summaryArr = Array.isArray(rec?.summary) ? rec.summary : [];
    const cleanSummary = summaryArr
      .map(String)
      .filter((s: string) => s.trim() && s.trim() !== 'Não há resumo.')
      .join(' ')
      .trim();

    return {
      id: `oasisbr-${rec?.id || Math.random().toString(36).slice(2)}`,
      title: String(rec?.title || 'Sem título').trim(),
      authors: primaryAuthors.slice(0, 8),
      year: extractYear(Array.isArray(rec?.publicationDates) ? rec.publicationDates[0] : null),
      venue: 'Oasisbr (IBICT)',
      doi: null,
      url: rawUrl || `https://oasisbr.ibict.br/vufind/Record/${encodeURIComponent(String(rec?.id || ''))}`,
      pdfUrl: typeof rawUrl === 'string' && /\.pdf($|\?)/i.test(rawUrl) ? rawUrl : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: cleanSummary || null,
      source: 'oasisbr',
      sourceLabel: 'Oasisbr (IBICT)',
      publicationType: Array.isArray(rec?.formats) ? String(rec.formats[0]) : undefined,
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchOasisbr(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('oasisbr', query, 8, yearFrom, signal);
  return parseOasisbrResults(data, yearFrom);
}

export function parseDataverseResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const items = Array.isArray((data as Record<string, any>)?.data?.items)
    ? (data as Record<string, any>).data.items
    : [];

  const mapped: NormalizedPaper[] = items.map((item: Record<string, any>) => {
    const doi = cleanDoi(item?.global_id);
    return {
      id: `dataverse-${doi || Math.random().toString(36).slice(2)}`,
      title: String(item?.name || 'Sem título').trim(),
      authors: Array.isArray(item?.authors) ? item.authors.map(String).slice(0, 8) : [],
      year: extractYear(item?.published_at),
      venue: String(item?.publisher || 'Harvard Dataverse'),
      doi,
      url: item?.url || (doi ? `https://doi.org/${doi}` : 'https://dataverse.harvard.edu/'),
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: item?.description ? String(item.description).trim() : null,
      source: 'dataverse',
      sourceLabel: 'Harvard Dataverse',
      publicationType: 'Dataset',
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchHarvardDataverse(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('dataverse', query, 8, yearFrom, signal);
  return parseDataverseResults(data, yearFrom);
}

export function parseCoreResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const results = Array.isArray((data as Record<string, any>)?.results)
    ? (data as Record<string, any>).results
    : [];

  const mapped: NormalizedPaper[] = results.map((item: Record<string, any>) => {
    const doi = cleanDoi(item?.doi);
    const authors = Array.isArray(item?.authors)
      ? item.authors
          .map((a: unknown) => (typeof a === 'string' ? a : String((a as Record<string, any>)?.name || '')))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const links = Array.isArray(item?.links) ? item.links : [];
    const displayUrl = links.find((l: Record<string, any>) => l?.type === 'display')?.url;
    const downloadUrl =
      item?.downloadUrl ||
      links.find((l: Record<string, any>) => l?.type === 'download')?.url ||
      null;
    const journalTitle = Array.isArray(item?.journals) ? item.journals[0]?.title : null;
    const providerName = Array.isArray(item?.dataProviders) ? item.dataProviders[0]?.name : null;

    return {
      id: `core-${item?.id || doi || Math.random().toString(36).slice(2)}`,
      title: String(item?.title || 'Sem título').trim(),
      authors,
      year: extractYear(item?.yearPublished || item?.publishedDate),
      venue: String(journalTitle || item?.publisher || providerName || 'CORE Repository'),
      doi,
      url:
        displayUrl ||
        (doi ? `https://doi.org/${doi}` : `https://core.ac.uk/works/${encodeURIComponent(String(item?.id || ''))}`),
      pdfUrl: downloadUrl ? String(downloadUrl) : null,
      isOpenAccess: true,
      citationCount: Math.max(0, Number(item?.citationCount || 0)),
      abstractText: item?.abstract ? String(item.abstract).trim() : null,
      source: 'core',
      sourceLabel: 'CORE.ac.uk',
      publicationType: item?.documentType ? String(item.documentType) : undefined,
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchCore(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal,
  byokEntry?: ByokCredentialEntry | null
): Promise<NormalizedPaper[]> {
  if (byokEntry) {
    const res = await fetchViaByokProxy('core', query, 8, byokEntry, yearFrom, signal);
    return parseCoreResults(await res.json(), yearFrom);
  }
  return parseCoreResults(await fetchFreeProxyJson('core', query, 8, yearFrom, signal), yearFrom);
}

export function parseWorldBankWdsResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const docsObj = (data as Record<string, any>)?.documents;
  if (!docsObj || typeof docsObj !== 'object') return [];

  const mapped: NormalizedPaper[] = [];
  for (const doc of Object.values(docsObj) as Array<Record<string, any>>) {
    if (!doc || typeof doc !== 'object' || !doc.id) continue;
    const title = doc.display_title || doc.docna?.['0']?.docna;
    if (!title) continue;

    const authors =
      doc.authors && typeof doc.authors === 'object'
        ? Object.values(doc.authors)
            .map((a: any) => String(a?.author || '').trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];
    const absObj = doc.abstracts;
    const abstractText =
      typeof absObj === 'string'
        ? absObj
        : typeof absObj?.['cdata!'] === 'string'
        ? absObj['cdata!']
        : null;

    mapped.push({
      id: `wbwds-${doc.id}`,
      title: String(title).trim(),
      authors: authors.length > 0 ? authors : ['World Bank'],
      year: extractYear(doc.docdt),
      venue: String(doc.repnme || doc.docty || 'World Bank Reports'),
      doi: null,
      url:
        doc.url ||
        `https://documents.worldbank.org/en/publication/documents-reports/documentdetail/${encodeURIComponent(
          String(doc.id)
        )}`,
      pdfUrl: doc.pdfurl ? String(doc.pdfurl) : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: abstractText ? abstractText.trim() : null,
      source: 'worldbank_wds',
      sourceLabel: 'World Bank Reports',
      publicationType: doc.docty ? String(doc.docty) : 'Working Paper',
    });
  }

  return filterByYear(mapped, yearFrom);
}

export async function searchWorldBankWds(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('worldbank_wds', query, 8, yearFrom, signal);
  return parseWorldBankWdsResults(data, yearFrom);
}

export function parseDspace7Results(
  data: unknown,
  baseOrigin: string,
  sourceId: 'worldbank_okr' | 'ipea',
  sourceLabel: string,
  yearFrom?: number
): NormalizedPaper[] {
  const objects = (data as Record<string, any>)?._embedded?.searchResult?._embedded?.objects;
  if (!Array.isArray(objects)) return [];

  const mapped: NormalizedPaper[] = [];
  for (const obj of objects) {
    const item = obj?._embedded?.indexableObject;
    if (!item) continue;
    const meta = (item.metadata || {}) as Record<string, Array<{ value?: string }>>;
    const firstMeta = (key: string): string => String(meta[key]?.[0]?.value || '').trim();

    const title = firstMeta('dc.title') || String(item.name || '').trim();
    if (!title) continue;

    const authors = (meta['dc.contributor.author'] || [])
      .map((a) => String(a?.value || '').trim())
      .filter(Boolean)
      .slice(0, 8);
    const doi = cleanDoi(firstMeta('dc.identifier.doi') || firstMeta('okr.identifier.doi'));
    const uri = firstMeta('dc.identifier.uri');
    const url =
      uri && /^https?:\/\//i.test(uri)
        ? uri
        : item.uuid
        ? `${baseOrigin}/items/${item.uuid}`
        : baseOrigin;

    mapped.push({
      id: `${sourceId}-${item.uuid || item.id || mapped.length}`,
      title,
      authors,
      year: extractYear(firstMeta('dc.date.issued') || firstMeta('dc.date.available')),
      venue: firstMeta('dc.publisher') || sourceLabel,
      doi,
      url,
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: firstMeta('dc.description.abstract') || null,
      source: sourceId,
      sourceLabel,
      publicationType: firstMeta('okr.doctype') || firstMeta('dc.type') || undefined,
    });
  }

  return filterByYear(mapped, yearFrom);
}

export async function searchWorldBankOkr(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('worldbank_okr', query, 8, yearFrom, signal);
  return parseDspace7Results(
    data,
    'https://openknowledge.worldbank.org',
    'worldbank_okr',
    'World Bank OKR',
    yearFrom
  );
}

export async function searchIpeaRcipea(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('ipea', query, 8, yearFrom, signal);
  return parseDspace7Results(
    data,
    'https://repositorio.ipea.gov.br',
    'ipea',
    'IPEA (RCIpea)',
    yearFrom
  );
}

export function parseUndlResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  if (!Array.isArray(data)) return [];
  const mapped: NormalizedPaper[] = [];

  for (const rec of data as Array<Record<string, any>>) {
    if (!rec || typeof rec !== 'object') continue;
    const titleObj = rec.title;
    const title =
      typeof titleObj === 'string'
        ? titleObj
        : [titleObj?.title, titleObj?.subtitle].filter(Boolean).join(' ');
    if (!title) continue;

    const rawAuthors = Array.isArray(rec.authors) ? rec.authors : [];
    const authors = rawAuthors
      .map((a: Record<string, any>) => String(a?.full_name || a?.name || '').trim())
      .filter(Boolean)
      .slice(0, 8);
    if (authors.length === 0 && rec.corporate_name?.name) {
      authors.push(String(rec.corporate_name.name));
    }

    const files = Array.isArray(rec.files) ? rec.files : [];
    const enPdf = files.find(
      (f: Record<string, any>) =>
        String(f?.eformat || '').toLowerCase() === '.pdf' &&
        /english|portugu/i.test(String(f?.description || ''))
    );
    const anyPdf = files.find((f: Record<string, any>) => String(f?.eformat || '').toLowerCase() === '.pdf');

    mapped.push({
      id: `undl-${rec.recid || mapped.length}`,
      title: String(title).trim(),
      authors: authors.length > 0 ? authors : ['United Nations'],
      year: extractYear(rec.imprint?.date),
      venue: String(rec.imprint?.publisher_name || 'UN Digital Library'),
      doi: cleanDoi(rec.doi),
      url: `https://digitallibrary.un.org/record/${encodeURIComponent(String(rec.recid || ''))}`,
      pdfUrl: (enPdf?.url || anyPdf?.url) ? String(enPdf?.url || anyPdf?.url) : null,
      isOpenAccess: true,
      citationCount: Math.max(0, Number(rec.number_of_citations || 0)),
      abstractText: rec.abstract ? String(rec.abstract).trim() : null,
      source: 'undl',
      sourceLabel: 'UN Digital Library',
      publicationType: rec.collection?.primary ? String(rec.collection.primary) : undefined,
    });
  }

  return filterByYear(mapped, yearFrom);
}

export async function searchUnDigitalLibrary(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('undl', query, 8, yearFrom, signal);
  return parseUndlResults(data, yearFrom);
}

// ---------------------------------------------------------------------------
// Phase 3: Pure Parsers & Search Adapters for BYOK / Paid / Keyed Sources
// ---------------------------------------------------------------------------

export function parseElsevierResults(
  data: unknown,
  sourceId: 'scopus' | 'sciencedirect',
  sourceLabel: string,
  yearFrom?: number
): NormalizedPaper[] {
  const entries = (data as Record<string, any>)?.['search-results']?.entry;
  if (!Array.isArray(entries)) return [];

  const mapped: NormalizedPaper[] = [];
  for (const entry of entries as Array<Record<string, any>>) {
    if (entry?.error) continue;
    const title = String(entry?.['dc:title'] || '').trim();
    if (!title) continue;
    const doi = cleanDoi(entry?.['prism:doi']);
    const links = Array.isArray(entry?.link) ? entry.link : [];
    const scopusOrSdLink =
      links.find((l: Record<string, any>) => l?.['@ref'] === 'scopus' || l?.['@ref'] === 'self')?.[
        '@href'
      ] || (doi ? `https://doi.org/${doi}` : 'https://www.scopus.com/');

    const creator = entry?.['dc:creator'] ? [String(entry['dc:creator'])] : [];
    const authors = Array.isArray(entry?.authors?.author)
      ? entry.authors.author.map((a: Record<string, any>) => String(a?.['$'] || a?.name || '')).filter(Boolean)
      : creator;

    mapped.push({
      id: `${sourceId}-${entry?.['dc:identifier'] || doi || mapped.length}`,
      title,
      authors: authors.slice(0, 8),
      year: extractYear(entry?.['prism:coverDate']),
      venue: String(entry?.['prism:publicationName'] || sourceLabel),
      doi,
      url: String(scopusOrSdLink),
      pdfUrl: null,
      isOpenAccess: String(entry?.openaccessFlag || '').toLowerCase() === 'true' || Number(entry?.openaccess) === 1,
      citationCount: Math.max(0, Number(entry?.['citedby-count'] || 0)),
      abstractText: entry?.['dc:description'] ? String(entry['dc:description']).trim() : null,
      source: sourceId,
      sourceLabel,
      publicationType: entry?.subtypeDescription ? String(entry.subtypeDescription) : undefined,
    });
  }

  return filterByYear(mapped, yearFrom);
}

export async function searchScopusByok(
  query: string,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchViaByokProxy('scopus', query, 8, credential, yearFrom, signal);
  return parseElsevierResults(await res.json(), 'scopus', 'Scopus (Elsevier)', yearFrom);
}

export async function searchScienceDirectByok(
  query: string,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchViaByokProxy('sciencedirect', query, 8, credential, yearFrom, signal);
  return parseElsevierResults(await res.json(), 'sciencedirect', 'ScienceDirect (Elsevier)', yearFrom);
}

export function parseIeeeXploreResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const articles = (data as Record<string, any>)?.articles;
  if (!Array.isArray(articles)) return [];

  const mapped: NormalizedPaper[] = articles.map((art: Record<string, any>) => {
    const doi = cleanDoi(art?.doi);
    const authors = Array.isArray(art?.authors?.authors)
      ? art.authors.authors.map((a: Record<string, any>) => String(a?.full_name || '')).filter(Boolean).slice(0, 8)
      : [];
    const isOa = String(art?.access_type || '').toUpperCase() === 'OPEN_ACCESS';

    return {
      id: `ieee-${art?.article_number || doi || Math.random().toString(36).slice(2)}`,
      title: String(art?.title || art?.article_title || 'Sem título').trim(),
      authors,
      year: extractYear(art?.publication_year),
      venue: String(art?.publication_title || 'IEEE Xplore'),
      doi,
      url: String(art?.html_url || art?.abstract_url || (doi ? `https://doi.org/${doi}` : 'https://ieeexplore.ieee.org/')),
      pdfUrl: isOa && art?.pdf_url ? String(art.pdf_url) : null,
      isOpenAccess: isOa,
      citationCount: Math.max(0, Number(art?.citing_paper_count || 0)),
      abstractText: art?.abstract ? String(art.abstract).trim() : null,
      source: 'ieeexplore',
      sourceLabel: 'IEEE Xplore',
      publicationType: art?.content_type ? String(art.content_type) : undefined,
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchIeeeXploreByok(
  query: string,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchViaByokProxy('ieeexplore', query, 8, credential, yearFrom, signal);
  return parseIeeeXploreResults(await res.json(), yearFrom);
}

export function parseSpringerResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const records = (data as Record<string, any>)?.records;
  if (!Array.isArray(records)) return [];

  const mapped: NormalizedPaper[] = records.map((rec: Record<string, any>) => {
    const doi = cleanDoi(rec?.doi);
    const authors = Array.isArray(rec?.creators)
      ? rec.creators.map((c: Record<string, any>) => String(c?.creator || '')).filter(Boolean).slice(0, 8)
      : [];
    const urls = Array.isArray(rec?.url) ? rec.url : [];
    const pdfEntry = urls.find((u: Record<string, any>) => String(u?.format).toLowerCase() === 'pdf')?.value;
    const htmlEntry = urls.find((u: Record<string, any>) => String(u?.format).toLowerCase() === 'html')?.value || urls[0]?.value;

    return {
      id: `springer-${doi || Math.random().toString(36).slice(2)}`,
      title: String(rec?.title || 'Sem título').trim(),
      authors,
      year: extractYear(rec?.publicationDate),
      venue: String(rec?.publicationName || rec?.publisher || 'Springer Nature'),
      doi,
      url: String(htmlEntry || (doi ? `https://doi.org/${doi}` : 'https://link.springer.com/')),
      pdfUrl: pdfEntry ? String(pdfEntry) : null,
      isOpenAccess: String(rec?.openaccess || '').toLowerCase() === 'true',
      citationCount: 0,
      abstractText: rec?.abstract ? String(rec.abstract).trim() : null,
      source: 'springer',
      sourceLabel: 'Springer Nature',
      publicationType: rec?.contentType ? String(rec.contentType) : undefined,
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchSpringerByok(
  query: string,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchViaByokProxy('springer', query, 8, credential, yearFrom, signal);
  return parseSpringerResults(await res.json(), yearFrom);
}

export function parseLensResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const items = (data as Record<string, any>)?.data;
  if (!Array.isArray(items)) return [];

  const mapped: NormalizedPaper[] = items.map((item: Record<string, any>) => {
    const extIds = Array.isArray(item?.external_ids) ? item.external_ids : [];
    const doi = cleanDoi(extIds.find((e: Record<string, any>) => e?.type === 'doi')?.value);
    const authors = Array.isArray(item?.authors)
      ? item.authors
          .map((a: Record<string, any>) => a?.display_name || [a?.first_name, a?.last_name].filter(Boolean).join(' '))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const pdfUrl = item?.open_access?.locations?.[0]?.pdf_url || null;

    return {
      id: `lens-${item?.lens_id || doi || Math.random().toString(36).slice(2)}`,
      title: String(item?.title || 'Sem título').trim(),
      authors,
      year: extractYear(item?.year_published),
      venue: String(item?.source?.title || 'The Lens.org'),
      doi,
      url: item?.lens_id ? `https://www.lens.org/lens/scholar/article/${item.lens_id}/main` : 'https://www.lens.org/',
      pdfUrl: pdfUrl ? String(pdfUrl) : null,
      isOpenAccess: Boolean(item?.is_open_access),
      citationCount: Math.max(0, Number(item?.scholarly_citations_count || 0)),
      abstractText: item?.abstract ? String(item.abstract).trim() : null,
      source: 'lens',
      sourceLabel: 'The Lens.org',
      publicationType: item?.publication_type ? String(item.publication_type) : undefined,
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchLensByok(
  query: string,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchViaByokProxy('lens', query, 8, credential, yearFrom, signal);
  return parseLensResults(await res.json(), yearFrom);
}

export function parseFedInPrintResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const rawList = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, any>)?.items)
    ? (data as Record<string, any>).items
    : Array.isArray((data as Record<string, any>)?.results)
    ? (data as Record<string, any>).results
    : [];

  const mapped: NormalizedPaper[] = rawList.map((item: Record<string, any>) => {
    const authors = Array.isArray(item?.authors)
      ? item.authors.map((a: any) => (typeof a === 'string' ? a : String(a?.name || ''))).filter(Boolean).slice(0, 8)
      : [];
    const fileUrl = Array.isArray(item?.files) ? item.files[0]?.url : item?.url;

    return {
      id: `fedinprint-${item?.id || Math.random().toString(36).slice(2)}`,
      title: String(item?.title || 'Sem título').trim(),
      authors,
      year: extractYear(item?.publication_date || item?.date || item?.year),
      venue: String(item?.series || item?.institution || 'Federal Reserve (Fed in Print)'),
      doi: cleanDoi(item?.doi),
      url: String(item?.handle_url || item?.url || 'https://fedinprint.org/'),
      pdfUrl: typeof fileUrl === 'string' && /\.pdf($|\?)/i.test(fileUrl) ? fileUrl : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: item?.abstract ? String(item.abstract).trim() : null,
      source: 'fedinprint',
      sourceLabel: 'Fed in Print (FED)',
      publicationType: 'Working Paper',
    };
  });

  return filterByYear(mapped, yearFrom);
}

export async function searchFedInPrintByok(
  query: string,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchViaByokProxy('fedinprint', query, 8, credential, yearFrom, signal);
  return parseFedInPrintResults(await res.json(), yearFrom);
}

export function parseGovInfoResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const bills = (data as Record<string, any>)?.bills || (data as Record<string, any>)?.results;
  if (!Array.isArray(bills)) return [];

  const mapped: NormalizedPaper[] = bills.map((item: Record<string, any>) => ({
    id: `govinfo-${item?.number || item?.congress || Math.random().toString(36).slice(2)}`,
    title: String(item?.title || 'Sem título').trim(),
    authors: item?.originChamber ? [`U.S. Congress (${item.originChamber})`] : ['U.S. Congress'],
    year: extractYear(item?.updateDate || item?.introducedDate),
    venue: 'Congress.gov / GovInfo',
    doi: null,
    url: String(item?.url || 'https://www.congress.gov/').replace('api.congress.gov/v3', 'www.congress.gov'),
    pdfUrl: null,
    isOpenAccess: true,
    citationCount: 0,
    abstractText: item?.latestAction?.text ? String(item.latestAction.text).trim() : null,
    source: 'govinfo',
    sourceLabel: 'Congress.gov / GovInfo',
    publicationType: item?.type ? String(item.type) : 'Legislation',
  }));

  return filterByYear(mapped, yearFrom);
}

export async function searchGovInfoByok(
  query: string,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchViaByokProxy('govinfo', query, 8, credential, yearFrom, signal);
  return parseGovInfoResults(await res.json(), yearFrom);
}
