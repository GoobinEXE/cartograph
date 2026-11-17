import { ByokCredentialEntry, NormalizedPaper } from '../types/academic';
import {
  asArray,
  asNumber,
  asRecord,
  asRecords,
  asString,
  asStringList,
  firstString,
  isRecord,
} from '../utils/json';
import { UNTITLED_PAPER_TITLE, extractYear, filterByYear, nonNegativeCount } from './adapterUtils';
import { fetchDedicatedSource, fetchJsonDirect, fetchViaByokProxy } from './httpClient';
import { normalizeDoi } from '../utils/deduplication';

/**
 * Adapters for the 15 original open sources (OpenAlex through NASA NTRS). Each source has a
 * pure `parse*` function (unit-testable with fixtures) and a `search*` function that only
 * fetches. Orchestration lives in academicAggregator.ts; per-source wiring in sourceRunners.ts.
 */

const stripTags = (value: string): string => value.replace(/<\/?[^>]+(>|$)/g, '').trim();

function joinName(...parts: unknown[]): string | undefined {
  const joined = parts
    .map((part) => asString(part))
    .filter(Boolean)
    .join(' ');
  return joined || undefined;
}

function reconstructOpenAlexAbstract(invertedIndex: unknown): string | null {
  if (!isRecord(invertedIndex)) return null;
  const entries: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of asArray(positions)) {
      if (typeof pos === 'number') entries.push([pos, word]);
    }
  }
  if (entries.length === 0) return null;
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map((e) => e[1]).join(' ');
}

// --- OpenAlex ---------------------------------------------------------------

export function parseOpenAlexResults(data: unknown): NormalizedPaper[] {
  return asRecords(asRecord(data).results).map((item, idx): NormalizedPaper => {
    const doi = normalizeDoi(asString(item.doi));
    const openAccess = asRecord(item.open_access);
    const primaryLocation = asRecord(item.primary_location);
    const pdfUrl =
      firstString(openAccess.oa_url, asRecord(item.best_oa_location).pdf_url, primaryLocation.pdf_url) ?? null;
    return {
      id: `openalex-${asString(item.id) ?? idx}`,
      title: firstString(item.display_name, item.title) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(item.authorships)
        .slice(0, 5)
        .map((a) => asString(asRecord(a.author).display_name))
        .filter((a): a is string => Boolean(a)),
      year: asNumber(item.publication_year) ?? null,
      venue:
        firstString(asRecord(primaryLocation.source).display_name, asRecord(item.host_venue).display_name) ??
        'OpenAlex Indexed Venue',
      doi,
      url:
        asString(primaryLocation.landing_page_url) ??
        (doi ? `https://doi.org/${doi}` : asString(item.id) ?? 'https://openalex.org'),
      pdfUrl,
      isOpenAccess: Boolean(openAccess.is_oa || pdfUrl),
      citationCount: nonNegativeCount(item.cited_by_count),
      abstractText: reconstructOpenAlexAbstract(item.abstract_inverted_index),
      source: 'openalex',
      sourceLabel: 'OpenAlex',
      publicationType: asString(item.type),
      isRetracted: Boolean(item.is_retracted),
    };
  });
}

export async function searchOpenAlex(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const filterParts = [`default.search:${encodeURIComponent(query)}`];
  if (yearFrom && yearFrom > 1900) filterParts.push(`from_publication_date:${yearFrom}-01-01`);
  const url = `https://api.openalex.org/works?filter=${filterParts.join(',')}&per-page=12&sort=relevance_score:desc`;
  return parseOpenAlexResults(await fetchJsonDirect(url, 'OpenAlex', { signal }));
}

// --- Semantic Scholar -------------------------------------------------------

export function parseSemanticScholarResults(data: unknown): NormalizedPaper[] {
  return asRecords(asRecord(data).data).map((item, idx): NormalizedPaper => {
    const doi = normalizeDoi(asString(asRecord(item.externalIds).DOI));
    const pdfUrl = asString(asRecord(item.openAccessPdf).url) ?? null;
    return {
      id: `s2-${asString(item.paperId) ?? idx}`,
      title: asString(item.title) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(item.authors)
        .slice(0, 5)
        .map((a) => asString(a.name))
        .filter((a): a is string => Boolean(a)),
      year: asNumber(item.year) ?? null,
      venue: asString(item.venue) ?? 'Semantic Scholar',
      doi,
      url: asString(item.url) ?? (doi ? `https://doi.org/${doi}` : 'https://www.semanticscholar.org'),
      pdfUrl,
      isOpenAccess: Boolean(item.isOpenAccess || pdfUrl),
      citationCount: nonNegativeCount(item.citationCount),
      abstractText: asString(item.abstract) ?? null,
      source: 'semanticscholar',
      sourceLabel: 'Semantic Scholar',
    };
  });
}

export async function searchSemanticScholar(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal,
  byokEntry?: ByokCredentialEntry | null
): Promise<NormalizedPaper[]> {
  if (byokEntry) {
    const res = await fetchViaByokProxy('semanticscholar', query, 10, byokEntry, yearFrom, signal);
    return parseSemanticScholarResults(await res.json());
  }
  const yearParam = yearFrom && yearFrom > 1900 ? `&year=${yearFrom}-` : '';
  const fields = 'title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,externalIds,abstract,url';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
    query
  )}&limit=10&fields=${fields}${yearParam}`;
  return parseSemanticScholarResults(await fetchJsonDirect(url, 'Semantic Scholar', { signal }));
}

// --- Crossref ---------------------------------------------------------------

export function parseCrossrefResults(data: unknown): NormalizedPaper[] {
  return asRecords(asRecord(asRecord(data).message).items).map((item, idx): NormalizedPaper => {
    const doi = normalizeDoi(asString(item.DOI));
    const dateParts = asArray(
      asArray(asRecord(item.published)['date-parts'])[0] ?? asArray(asRecord(item.issued)['date-parts'])[0]
    );
    const pdfLink = asRecords(item.link).find(
      (l) => l['content-type'] === 'application/pdf' || (asString(l.URL) ?? '').endsWith('.pdf')
    );
    const pdfUrl = asString(pdfLink?.URL) ?? null;
    const retraction = asRecords(item['update-to']).find(
      (u) =>
        asString(u.type)?.toLowerCase() === 'retraction' ||
        (asString(u.label)?.toLowerCase() ?? '').includes('retract')
    );
    const retractionDoi = asString(retraction?.DOI);
    const abstract = asString(item.abstract);

    return {
      id: `crossref-${doi ?? idx}`,
      title: asString(asArray(item.title)[0]) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(item.author)
        .slice(0, 5)
        .map((a) => joinName(a.given, a.family))
        .filter((a): a is string => Boolean(a)),
      year: asNumber(dateParts[0]) ?? null,
      venue:
        firstString(asArray(item['container-title'])[0], item.publisher) ?? 'Crossref Registered Journal',
      doi,
      url: asString(item.URL) ?? (doi ? `https://doi.org/${doi}` : 'https://search.crossref.org'),
      pdfUrl,
      isOpenAccess: Boolean(pdfUrl),
      citationCount: nonNegativeCount(item['is-referenced-by-count']),
      abstractText: abstract ? stripTags(abstract) : null,
      source: 'crossref',
      sourceLabel: 'Crossref DOI',
      publicationType: asString(item.type),
      isRetracted: Boolean(retraction),
      retractionNoticeUrl: retractionDoi ? `https://doi.org/${normalizeDoi(retractionDoi) ?? retractionDoi}` : null,
    };
  });
}

export async function searchCrossref(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const filterParam = yearFrom && yearFrom > 1900 ? `&filter=from-pub-date:${yearFrom}-01-01` : '';
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10${filterParam}`;
  return parseCrossrefResults(await fetchJsonDirect(url, 'Crossref', { signal }));
}

// --- Europe PMC -------------------------------------------------------------

export function parseEuropePmcResults(data: unknown): NormalizedPaper[] {
  return asRecords(asRecord(asRecord(data).resultList).result).map((item, idx): NormalizedPaper => {
    const doi = normalizeDoi(asString(item.doi));
    const pmcid = asString(item.pmcid);
    const pmid = asString(item.pmid);
    return {
      id: `epmc-${asString(item.id) ?? idx}`,
      title: asString(item.title) ?? UNTITLED_PAPER_TITLE,
      authors: (asString(item.authorString) ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
      year: asNumber(item.pubYear) ?? null,
      venue:
        firstString(item.journalTitle, asRecord(item.bookOrReportDetails).publisher) ?? 'PubMed / Europe PMC',
      doi,
      url: pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        : doi
        ? `https://doi.org/${doi}`
        : 'https://europepmc.org',
      pdfUrl: pmcid ? `https://europepmc.org/backend/ptpmcrender.fcgi?accid=${pmcid}&blobtype=pdf` : null,
      isOpenAccess: item.isOpenAccess === 'Y' || Boolean(pmcid),
      citationCount: nonNegativeCount(item.citedByCount),
      abstractText: asString(item.abstractText) ?? null,
      source: 'europepmc',
      sourceLabel: 'PubMed / Europe PMC',
    };
  });
}

export async function searchEuropePmc(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const fullQuery =
    yearFrom && yearFrom > 1900 ? `${query} AND (FIRST_PDATE:[${yearFrom}-01-01 TO 2030-12-31])` : query;
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
    fullQuery
  )}&format=json&pageSize=10&resultType=core`;
  return parseEuropePmcResults(await fetchJsonDirect(url, 'Europe PMC', { signal }));
}

// --- arXiv (Atom XML through the dedicated proxy) ---------------------------

export function parseArxivAtom(xmlText: string, yearFrom?: number): NormalizedPaper[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const results: NormalizedPaper[] = [];
  Array.from(doc.querySelectorAll('entry')).forEach((entry, idx) => {
    const text = (selector: string) => (entry.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const idUrl = text('id');
    const published = text('published');
    const year = published ? Number(published.slice(0, 4)) : null;
    if (yearFrom && year && year < yearFrom) return;

    results.push({
      id: `arxiv-${idUrl || idx}`,
      title: text('title') || UNTITLED_PAPER_TITLE,
      authors: Array.from(entry.querySelectorAll('author > name'))
        .map((n) => n.textContent?.trim() ?? '')
        .filter(Boolean)
        .slice(0, 5),
      year,
      venue: 'arXiv Preprint Server (Cornell)',
      doi: normalizeDoi(entry.getElementsByTagName('arxiv:doi')[0]?.textContent),
      url: idUrl || 'https://arxiv.org',
      pdfUrl: idUrl ? `${idUrl.replace('/abs/', '/pdf/')}.pdf` : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: text('summary') || null,
      source: 'arxiv',
      sourceLabel: 'arXiv.org',
      publicationType: 'preprint',
    });
  });
  return results;
}

export async function searchArxiv(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchDedicatedSource('arxiv', query, 10, { signal });
  return parseArxivAtom(await res.text(), yearFrom);
}

// --- PubMed (NCBI Entrez: esearch + esummary) -------------------------------

export function parsePubMedSummary(idList: readonly string[], summaryData: unknown): NormalizedPaper[] {
  const resultObj = asRecord(asRecord(summaryData).result);
  return idList.flatMap((pmid): NormalizedPaper[] => {
    const doc = resultObj[pmid];
    if (!isRecord(doc)) return [];
    const articleIds = asRecords(doc.articleids);
    const doi = normalizeDoi(asString(articleIds.find((a) => a.idtype === 'doi')?.value));
    const pmcid = asString(articleIds.find((a) => a.idtype === 'pmc')?.value);
    return [
      {
        id: `pubmed-${pmid}`,
        title: (asString(doc.title) ?? UNTITLED_PAPER_TITLE).replace(/\.$/, ''),
        authors: asRecords(doc.authors)
          .slice(0, 5)
          .map((a) => asString(a.name))
          .filter((a): a is string => Boolean(a)),
        year: extractYear(doc.pubdate),
        venue: firstString(doc.fulljournalname, doc.source) ?? 'PubMed / MEDLINE',
        doi,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        pdfUrl: pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/pdf/` : null,
        isOpenAccess: Boolean(pmcid),
        citationCount: 0,
        abstractText: null,
        source: 'pubmed',
        sourceLabel: 'PubMed (NIH)',
      },
    ];
  });
}

export async function searchPubMedEntrez(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const term = yearFrom && yearFrom > 1900 ? `${query} AND ${yearFrom}:2030[dp]` : query;
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
    term
  )}&retmode=json&retmax=8&sort=relevance`;
  const searchData = await fetchJsonDirect(searchUrl, 'PubMed Entrez', { signal });
  const idList = asStringList(asRecord(asRecord(searchData).esearchresult).idlist);
  if (idList.length === 0) return [];

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(
    ','
  )}&retmode=json`;
  return parsePubMedSummary(idList, await fetchJsonDirect(summaryUrl, 'PubMed Summary', { signal }));
}

// --- DOAJ -------------------------------------------------------------------

export function parseDoajResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(asRecord(data).results).map((item, idx): NormalizedPaper => {
    const bib = asRecord(item.bibjson);
    const doi = normalizeDoi(asString(asRecords(bib.identifier).find((i) => i.type === 'doi')?.id));
    const fulltextLink = asString(asRecords(bib.link).find((l) => l.type === 'fulltext')?.url) ?? null;
    return {
      id: `doaj-${asString(item.id) ?? idx}`,
      title: asString(bib.title) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(bib.author)
        .slice(0, 5)
        .map((a) => asString(a.name))
        .filter((a): a is string => Boolean(a)),
      year: asNumber(bib.year) ?? null,
      venue: asString(asRecord(bib.journal).title) ?? 'DOAJ Open Access Journal',
      doi,
      url: fulltextLink ?? (doi ? `https://doi.org/${doi}` : 'https://doaj.org'),
      pdfUrl: fulltextLink,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: asString(bib.abstract) ?? null,
      source: 'doaj',
      sourceLabel: 'DOAJ (Open Access)',
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchDoaj(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(query)}?pageSize=8`;
  return parseDoajResults(await fetchJsonDirect(url, 'DOAJ', { signal }), yearFrom);
}

// --- Zenodo (dedicated proxy) -----------------------------------------------

export function parseZenodoResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(asRecord(asRecord(data).hits).hits).map((hit, idx): NormalizedPaper => {
    const meta = asRecord(hit.metadata);
    const doi = normalizeDoi(firstString(hit.doi, meta.doi));
    const pdfUrl = asString(asRecord(asRecord(asArray(hit.files)[0]).links).self) ?? null;
    const description = asString(meta.description);
    return {
      id: `zenodo-${asString(hit.id) ?? idx}`,
      title: asString(meta.title) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(meta.creators)
        .slice(0, 5)
        .map((c) => asString(c.name))
        .filter((c): c is string => Boolean(c)),
      year: extractYear(meta.publication_date),
      venue: asString(asRecord(meta.journal).title) ?? 'Zenodo / CERN OpenAIRE',
      doi,
      url: asString(asRecord(hit.links).self_html) ?? (doi ? `https://doi.org/${doi}` : 'https://zenodo.org'),
      pdfUrl,
      isOpenAccess: meta.access_right === 'open' || Boolean(pdfUrl),
      citationCount: 0,
      abstractText: description ? stripTags(description) : null,
      source: 'zenodo',
      sourceLabel: 'Zenodo (CERN)',
      publicationType: asString(asRecord(meta.resource_type).type),
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchZenodo(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchDedicatedSource('zenodo', query, 8, { headers: { Accept: 'application/json' }, signal });
  return parseZenodoResults(await res.json(), yearFrom);
}

// --- HAL Open Science -------------------------------------------------------

export function parseHalResults(data: unknown): NormalizedPaper[] {
  return asRecords(asRecord(asRecord(data).response).docs).map((doc, idx): NormalizedPaper => {
    const doi = normalizeDoi(asString(doc.doiId_s));
    const pdfUrl = asString(doc.fileMain_s) ?? null;
    return {
      id: `hal-${asString(doc.docid) ?? idx}`,
      title: asString(asArray(doc.title_s)[0]) ?? UNTITLED_PAPER_TITLE,
      authors: asStringList(doc.authFullName_s, 5),
      year: asNumber(doc.producedDateY_i) ?? null,
      venue: asString(doc.journalTitle_s) ?? 'HAL Open Science (CNRS)',
      doi,
      url: asString(doc.uri_s) ?? (doi ? `https://doi.org/${doi}` : 'https://hal.science'),
      pdfUrl,
      isOpenAccess: Boolean(doc.openAccess_bool || pdfUrl),
      citationCount: 0,
      abstractText: asString(asArray(doc.abstract_s)[0]) ?? null,
      source: 'hal',
      sourceLabel: 'HAL Science (CNRS)',
    };
  });
}

export async function searchHalOpenScience(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const fqParam = yearFrom && yearFrom > 1900 ? `&fq=producedDateY_i:[${yearFrom}%20TO%202030]` : '';
  const url = `https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(
    query
  )}${fqParam}&wt=json&rows=8&fl=docid,title_s,authFullName_s,producedDateY_i,journalTitle_s,doiId_s,uri_s,fileMain_s,abstract_s,openAccess_bool`;
  return parseHalResults(await fetchJsonDirect(url, 'HAL', { signal }));
}

// --- DataCite ---------------------------------------------------------------

export function parseDataCiteResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(asRecord(data).data).map((item, idx): NormalizedPaper => {
    const attr = asRecord(item.attributes);
    const doi = normalizeDoi(asString(attr.doi));
    return {
      id: `datacite-${doi ?? idx}`,
      title: asString(asRecord(asArray(attr.titles)[0]).title) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(attr.creators)
        .slice(0, 5)
        .map((c) => asString(c.name) ?? joinName(c.givenName, c.familyName))
        .filter((c): c is string => Boolean(c)),
      year: asNumber(attr.publicationYear) ?? null,
      venue: asString(attr.publisher) ?? 'DataCite Commons Repository',
      doi,
      url: asString(attr.url) ?? (doi ? `https://doi.org/${doi}` : 'https://commons.datacite.org'),
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: nonNegativeCount(attr.citationCount),
      abstractText: asString(asRecord(asArray(attr.descriptions)[0]).description) ?? null,
      source: 'datacite',
      sourceLabel: 'DataCite Commons',
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchDataCite(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://api.datacite.org/dois?query=${encodeURIComponent(query)}&page[size]=8`;
  const data = await fetchJsonDirect(url, 'DataCite', {
    headers: { Accept: 'application/vnd.api+json' },
    signal,
  });
  return parseDataCiteResults(data, yearFrom);
}

// --- INSPIRE-HEP ------------------------------------------------------------

export function parseInspireResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(asRecord(asRecord(data).hits).hits).map((hit, idx): NormalizedPaper => {
    const meta = asRecord(hit.metadata);
    const arxivId = asString(asRecord(asArray(meta.arxiv_eprints)[0]).value);
    const controlNumber = firstString(hit.id, meta.control_number) ?? String(idx);
    return {
      id: `inspire-${controlNumber}`,
      title: asString(asRecord(asArray(meta.titles)[0]).title) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(meta.authors)
        .slice(0, 5)
        .map((a) => asString(a.full_name) ?? joinName(a.first_name, a.last_name))
        .filter((a): a is string => Boolean(a)),
      year: extractYear(meta.earliest_date),
      venue: asString(asRecord(asArray(meta.publication_info)[0]).journal_title) ?? 'INSPIRE-HEP (CERN)',
      doi: normalizeDoi(asString(asRecord(asArray(meta.dois)[0]).value)),
      url: `https://inspirehep.net/literature/${controlNumber}`,
      pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null,
      isOpenAccess: true,
      citationCount: nonNegativeCount(meta.citation_count),
      abstractText: asString(asRecord(asArray(meta.abstracts)[0]).value) ?? null,
      source: 'inspire',
      sourceLabel: 'INSPIRE-HEP (CERN)',
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchInspireHep(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://inspirehep.net/api/literature?q=${encodeURIComponent(query)}&size=8&sort=mostrecent`;
  return parseInspireResults(await fetchJsonDirect(url, 'INSPIRE-HEP', { signal }), yearFrom);
}

// --- Figshare ---------------------------------------------------------------

export function parseFigshareResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(data).map((item, idx): NormalizedPaper => {
    const doi = normalizeDoi(asString(item.doi));
    const typeName = asString(item.defined_type_name);
    const resourceTitle = asString(item.resource_title);
    return {
      id: `figshare-${asString(item.id) ?? idx}`,
      title: stripTags(asString(item.title) ?? UNTITLED_PAPER_TITLE).replace(/\s+/g, ' '),
      authors: [],
      year: extractYear(item.published_date),
      venue: typeName ? `Figshare (${typeName})` : 'Figshare Repository',
      doi,
      url: asString(item.url_public_html) ?? (doi ? `https://doi.org/${doi}` : 'https://figshare.com'),
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: resourceTitle ? `Recurso associado: ${resourceTitle}` : null,
      source: 'figshare',
      sourceLabel: 'Figshare Data',
      publicationType: typeName,
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchFigshare(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchJsonDirect('https://api.figshare.com/v2/articles/search', 'Figshare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ search_for: query, page_size: 8 }),
    signal,
  });
  return parseFigshareResults(data, yearFrom);
}

// --- GBIF literature --------------------------------------------------------

export function parseGbifResults(data: unknown, query: string, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(asRecord(data).results).map((item, idx): NormalizedPaper => {
    const doi = normalizeDoi(asString(asRecord(item.identifiers).doi));
    return {
      id: `gbif-${asString(item.id) ?? doi ?? idx}`,
      title: asString(item.title) ?? UNTITLED_PAPER_TITLE,
      authors: asArray(item.authors)
        .slice(0, 5)
        .map((a) => asString(a) ?? joinName(asRecord(a).firstName, asRecord(a).lastName))
        .filter((a): a is string => Boolean(a)),
      year: asNumber(item.year) ?? null,
      venue: firstString(item.source, item.publisher) ?? 'GBIF Literature',
      doi,
      url:
        asString(asArray(item.websites)[0]) ??
        (doi
          ? `https://doi.org/${doi}`
          : `https://www.gbif.org/resource/search?contentType=literature&q=${encodeURIComponent(query)}`),
      pdfUrl: null,
      isOpenAccess: Boolean(item.openAccess),
      citationCount: 0,
      abstractText: asString(item.abstract) ?? null,
      source: 'gbif',
      sourceLabel: 'GBIF Biodiversity',
      publicationType: asString(item.literatureType),
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchGbifLiterature(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://api.gbif.org/v1/literature/search?q=${encodeURIComponent(query)}&limit=8`;
  return parseGbifResults(await fetchJsonDirect(url, 'GBIF', { signal }), query, yearFrom);
}

// --- OSTI.GOV (dedicated proxy) ---------------------------------------------

export function parseOstiResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(data).map((item, idx): NormalizedPaper => {
    const ostiId = asString(item.osti_id) ?? String(idx);
    return {
      id: `osti-${ostiId}`,
      title: asString(item.title) ?? UNTITLED_PAPER_TITLE,
      authors: asStringList(item.authors, 5),
      year: extractYear(firstString(item.publication_date, item.entry_date)),
      venue:
        firstString(asArray(item.research_orgs)[0], asArray(item.sponsor_orgs)[0]) ?? 'OSTI.GOV (DOE)',
      doi: normalizeDoi(asString(item.doi)),
      url: `https://www.osti.gov/biblio/${ostiId}`,
      pdfUrl: asString(asRecords(item.links).find((l) => l.rel === 'fulltext')?.href) ?? null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: asString(item.description) ?? null,
      source: 'osti',
      sourceLabel: 'OSTI.GOV (DOE)',
      publicationType: asString(item.product_type),
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchOstiGov(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchDedicatedSource('osti', query, 8, { headers: { Accept: 'application/json' }, signal });
  return parseOstiResults(await res.json(), yearFrom);
}

// --- NASA NTRS (dedicated proxy) --------------------------------------------

export function parseNtrsResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped = asRecords(asRecord(data).results).map((item, idx): NormalizedPaper => {
    const firstPublication = asRecord(asArray(item.publications)[0]);
    const ntrsId = asString(item.id) ?? String(idx);
    const pdfPath = asRecords(item.downloads)
      .map((d) => asString(asRecord(d.links).pdf))
      .find(Boolean);
    return {
      id: `ntrs-${ntrsId}`,
      title: asString(item.title) ?? UNTITLED_PAPER_TITLE,
      authors: asRecords(item.authorAffiliations)
        .slice(0, 5)
        .map((a) => asString(asRecord(asRecord(a.meta).author).name))
        .filter((a): a is string => Boolean(a)),
      year: extractYear(firstString(item.distributionDate, firstPublication.publicationDate)),
      venue: asString(asRecord(item.center).name) ?? 'NASA Technical Reports Server',
      doi: normalizeDoi(asString(firstPublication.doi)),
      url: `https://ntrs.nasa.gov/citations/${ntrsId}`,
      pdfUrl: pdfPath ? `https://ntrs.nasa.gov${pdfPath}` : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: asString(item.abstract) ?? null,
      source: 'ntrs',
      sourceLabel: 'NASA NTRS',
      publicationType: asString(item.stiType),
    };
  });
  return filterByYear(mapped, yearFrom);
}

export async function searchNasaNtrs(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetchDedicatedSource('ntrs', query, 8, { headers: { Accept: 'application/json' }, signal });
  return parseNtrsResults(await res.json(), yearFrom);
}
