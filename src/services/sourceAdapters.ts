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
  stableHashId,
} from '../utils/json';
import {
  UNTITLED_PAPER_TITLE,
  extractYear,
  filterByYear,
  nonNegativeCount,
  pdfUrlOrNull,
} from './adapterUtils';
import { fetchFreeProxyJson, fetchViaByokProxy } from './httpClient';
import { normalizeDoi } from '../utils/deduplication';

// ---------------------------------------------------------------------------
// Pure parsers and search adapters for open sources behind the academic proxy
// ---------------------------------------------------------------------------

export function parseOpenAireResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped: NormalizedPaper[] = [];
  for (const item of asRecords(asRecord(data).results)) {
    const doiPid = asRecords(item.pids).find((p) => asString(p.scheme)?.toLowerCase() === 'doi');
    const doi = normalizeDoi(asString(doiPid?.value));
    const instances = asRecords(item.instances);
    const firstUrl = instances.map((inst) => asString(asArray(inst.urls)[0])).find(Boolean);
    const oaInstanceUrl = instances
      .filter((inst) => asString(asRecord(inst.accessRight).label)?.toUpperCase() === 'OPEN')
      .map((inst) => asString(asArray(inst.urls)[0]))
      .find(Boolean);
    const isOa =
      asString(asRecord(item.bestAccessRight).label)?.toUpperCase() === 'OPEN' ||
      Boolean(item.isGreen) ||
      Boolean(item.isInDiamondJournal);
    const cleanDesc = asStringList(item.descriptions).find(
      (d) => d.length > 25 && !/^(WOS:|PMID:|DOI:)/i.test(d)
    );
    const authors = asRecords(item.authors)
      .map((a) => asString(a.fullName))
      .filter((a): a is string => Boolean(a))
      .slice(0, 8);

    const idStr = asString(item.id) ?? doi ?? String(mapped.length);
    const fallbackUrl = `https://explore.openaire.eu/search/publication?articleId=${encodeURIComponent(idStr)}`;

    mapped.push({
      id: `openaire-${idStr}`,
      title: asString(item.mainTitle) ?? UNTITLED_PAPER_TITLE,
      authors,
      year: extractYear(item.publicationDate),
      venue: firstString(asRecord(item.container).name, item.publisher) ?? 'OpenAIRE Graph',
      doi,
      url: doi ? `https://doi.org/${doi}` : firstUrl ?? fallbackUrl,
      pdfUrl: pdfUrlOrNull(oaInstanceUrl),
      isOpenAccess: isOa,
      citationCount: nonNegativeCount(asRecord(asRecord(item.indicators).citationImpact).citationCount),
      abstractText: cleanDesc ?? null,
      source: 'openaire',
      sourceLabel: 'OpenAIRE Graph',
      publicationType: asString(item.type),
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
  const mapped: NormalizedPaper[] = [];
  for (const item of asRecords(asRecord(data).data)) {
    const attrs = asRecord(item.attributes);
    const links = asRecord(item.links);
    const itemId = asString(item.id);
    const title = asString(attrs.title) ?? UNTITLED_PAPER_TITLE;
    mapped.push({
      id: `${sourceId}-${itemId ?? stableHashId(title, mapped.length)}`,
      title,
      authors: [],
      year: extractYear(
        firstString(attrs.date_published, attrs.original_publication_date, attrs.date_created)
      ),
      venue: sourceId === 'socarxiv' ? 'SocArXiv' : 'OSF Preprints',
      doi: normalizeDoi(firstString(attrs.doi, links.preprint_doi)),
      url:
        asString(links.html) ??
        `https://osf.io/preprints/${sourceId === 'socarxiv' ? 'socarxiv/' : ''}${itemId ?? ''}`,
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: asString(attrs.description) ?? null,
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
  const docs = asRecords(asRecord(asRecord(data).response).docs);
  const mapped: NormalizedPaper[] = docs.map((doc, idx) => {
    const idStr = asString(doc.id) ?? '';
    const title = asString(doc.title) ?? UNTITLED_PAPER_TITLE;
    const hasFullText = asNumber(doc.e_fulltextauth) === 1;
    return {
      id: `eric-${idStr || stableHashId(title, idx)}`,
      title,
      authors: asStringList(doc.author, 8),
      year: extractYear(doc.publicationdateyear),
      venue: firstString(doc.source, doc.publisher) ?? 'ERIC (IES)',
      doi: null,
      url: `https://eric.ed.gov/?id=${encodeURIComponent(idStr)}`,
      pdfUrl:
        hasFullText && idStr.startsWith('ED')
          ? `https://files.eric.ed.gov/fulltext/${encodeURIComponent(idStr)}.pdf`
          : null,
      isOpenAccess: hasFullText,
      citationCount: 0,
      abstractText: asString(doc.description) ?? null,
      source: 'eric',
      sourceLabel: 'ERIC (IES)',
      publicationType: asString(asArray(doc.publicationtype)[0]),
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
  const docs = asRecords(asRecord(asRecord(data).response).docs);
  const mapped: NormalizedPaper[] = docs.map((doc, idx) => {
    const doi = normalizeDoi(asString(doc.id));
    const abstractText = Array.isArray(doc.abstract)
      ? asStringList(doc.abstract).join(' ')
      : asString(doc.abstract);
    const title =
      (Array.isArray(doc.title_display) ? asString(doc.title_display[0]) : asString(doc.title_display)) ??
      UNTITLED_PAPER_TITLE;
    return {
      id: `plos-${doi ?? stableHashId(title, idx)}`,
      title,
      authors: asStringList(doc.author_display, 8),
      year: extractYear(doc.publication_date),
      venue: asString(doc.journal) ?? 'PLOS',
      doi,
      url: doi ? `https://journals.plos.org/plosone/article?id=${encodeURIComponent(doi)}` : 'https://plos.org/',
      pdfUrl: doi
        ? `https://journals.plos.org/plosone/article/file?id=${encodeURIComponent(doi)}&type=printable`
        : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: abstractText || null,
      source: 'plos',
      sourceLabel: 'PLOS Open Access',
      publicationType: asString(doc.article_type) ?? 'Journal Article',
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
  const records = asRecords(asRecord(data).records);
  const mapped: NormalizedPaper[] = records.map((rec, idx) => {
    const primary = asRecord(asRecord(rec.authors).primary);
    const rawUrl = asString(asRecord(asArray(rec.urls)[0]).url);
    const summary = asStringList(rec.summary)
      .filter((s) => s !== 'Não há resumo.')
      .join(' ')
      .trim();
    const recId = asString(rec.id);
    const title = asString(rec.title) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `oasisbr-${recId ?? stableHashId(title, idx)}`,
      title,
      authors: Object.keys(primary).slice(0, 8),
      year: extractYear(asArray(rec.publicationDates)[0]),
      venue: 'Oasisbr (IBICT)',
      doi: null,
      url: rawUrl ?? `https://oasisbr.ibict.br/vufind/Record/${encodeURIComponent(recId ?? '')}`,
      pdfUrl: pdfUrlOrNull(rawUrl),
      isOpenAccess: true,
      citationCount: 0,
      abstractText: summary || null,
      source: 'oasisbr',
      sourceLabel: 'Oasisbr (IBICT)',
      publicationType: asString(asArray(rec.formats)[0]),
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
  const items = asRecords(asRecord(asRecord(data).data).items);
  const mapped: NormalizedPaper[] = items.map((item, idx) => {
    const doi = normalizeDoi(asString(item.global_id));
    const title = asString(item.name) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `dataverse-${doi ?? stableHashId(title, idx)}`,
      title,
      authors: asStringList(item.authors, 8),
      year: extractYear(item.published_at),
      venue: asString(item.publisher) ?? 'Harvard Dataverse',
      doi,
      url: asString(item.url) ?? (doi ? `https://doi.org/${doi}` : 'https://dataverse.harvard.edu/'),
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: asString(item.description) ?? null,
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
  const results = asRecords(asRecord(data).results);
  const mapped: NormalizedPaper[] = results.map((item, idx) => {
    const doi = normalizeDoi(asString(item.doi));
    const authors = asArray(item.authors)
      .map((a) => asString(a) ?? asString(asRecord(a).name))
      .filter((a): a is string => Boolean(a))
      .slice(0, 8);
    const links = asRecords(item.links);
    const displayUrl = asString(links.find((l) => l.type === 'display')?.url);
    const downloadUrl = firstString(item.downloadUrl, links.find((l) => l.type === 'download')?.url);
    const itemId = asString(item.id);
    const title = asString(item.title) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `core-${itemId ?? doi ?? stableHashId(title, idx)}`,
      title,
      authors,
      year: extractYear(item.yearPublished ?? item.publishedDate),
      venue:
        firstString(
          asRecord(asArray(item.journals)[0]).title,
          item.publisher,
          asRecord(asArray(item.dataProviders)[0]).name
        ) ?? 'CORE Repository',
      doi,
      url:
        displayUrl ??
        (doi ? `https://doi.org/${doi}` : `https://core.ac.uk/works/${encodeURIComponent(itemId ?? '')}`),
      pdfUrl: downloadUrl ?? null,
      isOpenAccess: true,
      citationCount: nonNegativeCount(item.citationCount),
      abstractText: asString(item.abstract) ?? null,
      source: 'core',
      sourceLabel: 'CORE.ac.uk',
      publicationType: asString(item.documentType),
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
  const docsObj = asRecord(data).documents;
  if (!isRecord(docsObj)) return [];

  const mapped: NormalizedPaper[] = [];
  for (const doc of Object.values(docsObj)) {
    if (!isRecord(doc)) continue;
    const docId = asString(doc.id);
    if (!docId) continue;
    const title = firstString(doc.display_title, asRecord(asRecord(doc.docna)['0']).docna);
    if (!title) continue;

    const authors = Object.values(asRecord(doc.authors))
      .map((a) => asString(asRecord(a).author))
      .filter((a): a is string => Boolean(a))
      .slice(0, 8);
    const abstractText = firstString(doc.abstracts, asRecord(doc.abstracts)['cdata!']);

    mapped.push({
      id: `wbwds-${docId}`,
      title,
      authors: authors.length > 0 ? authors : ['World Bank'],
      year: extractYear(doc.docdt),
      venue: firstString(doc.repnme, doc.docty) ?? 'World Bank Reports',
      doi: null,
      url:
        asString(doc.url) ??
        `https://documents.worldbank.org/en/publication/documents-reports/documentdetail/${encodeURIComponent(docId)}`,
      pdfUrl: asString(doc.pdfurl) ?? null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: abstractText ?? null,
      source: 'worldbank_wds',
      sourceLabel: 'World Bank Reports',
      publicationType: asString(doc.docty) ?? 'Working Paper',
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
  const objects = asRecords(
    asRecord(asRecord(asRecord(asRecord(data)._embedded).searchResult)._embedded).objects
  );

  const mapped: NormalizedPaper[] = [];
  for (const obj of objects) {
    const item = asRecord(asRecord(obj._embedded).indexableObject);
    const meta = asRecord(item.metadata);
    const metaValues = (key: string): string[] =>
      asRecords(meta[key])
        .map((entry) => asString(entry.value))
        .filter((value): value is string => Boolean(value));
    const firstMeta = (key: string): string | undefined => metaValues(key)[0];

    const title = firstMeta('dc.title') ?? asString(item.name);
    if (!title) continue;

    const uuid = asString(item.uuid);
    const uri = firstMeta('dc.identifier.uri');
    mapped.push({
      id: `${sourceId}-${uuid ?? asString(item.id) ?? mapped.length}`,
      title,
      authors: metaValues('dc.contributor.author').slice(0, 8),
      year: extractYear(firstMeta('dc.date.issued') ?? firstMeta('dc.date.available')),
      venue: firstMeta('dc.publisher') ?? sourceLabel,
      doi: normalizeDoi(firstMeta('dc.identifier.doi') ?? firstMeta('okr.identifier.doi')),
      url: uri && /^https?:\/\//i.test(uri) ? uri : uuid ? `${baseOrigin}/items/${uuid}` : baseOrigin,
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: firstMeta('dc.description.abstract') ?? null,
      source: sourceId,
      sourceLabel,
      publicationType: firstMeta('okr.doctype') ?? firstMeta('dc.type'),
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
  return parseDspace7Results(data, 'https://openknowledge.worldbank.org', 'worldbank_okr', 'World Bank OKR', yearFrom);
}

export async function searchIpeaRcipea(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const data = await fetchFreeProxyJson('ipea', query, 8, yearFrom, signal);
  return parseDspace7Results(data, 'https://repositorio.ipea.gov.br', 'ipea', 'IPEA (RCIpea)', yearFrom);
}

export function parseUndlResults(data: unknown, yearFrom?: number): NormalizedPaper[] {
  const mapped: NormalizedPaper[] = [];
  for (const rec of asRecords(data)) {
    const titleObj = asRecord(rec.title);
    const title =
      asString(rec.title) ??
      ([asString(titleObj.title), asString(titleObj.subtitle)].filter(Boolean).join(' ') || undefined);
    if (!title) continue;

    const authors = asRecords(rec.authors)
      .map((a) => firstString(a.full_name, a.name))
      .filter((a): a is string => Boolean(a))
      .slice(0, 8);
    const corporateName = asString(asRecord(rec.corporate_name).name);
    if (authors.length === 0 && corporateName) authors.push(corporateName);

    const pdfFiles = asRecords(rec.files).filter((f) => asString(f.eformat)?.toLowerCase() === '.pdf');
    const preferredPdf = pdfFiles.find((f) => /english|portugu/i.test(asString(f.description) ?? ''));
    const imprint = asRecord(rec.imprint);
    const recid = asString(rec.recid);

    mapped.push({
      id: `undl-${recid ?? mapped.length}`,
      title,
      authors: authors.length > 0 ? authors : ['United Nations'],
      year: extractYear(imprint.date),
      venue: asString(imprint.publisher_name) ?? 'UN Digital Library',
      doi: normalizeDoi(asString(rec.doi)),
      url: `https://digitallibrary.un.org/record/${encodeURIComponent(recid ?? '')}`,
      pdfUrl: firstString(preferredPdf?.url, pdfFiles[0]?.url) ?? null,
      isOpenAccess: true,
      citationCount: nonNegativeCount(rec.number_of_citations),
      abstractText: asString(rec.abstract) ?? null,
      source: 'undl',
      sourceLabel: 'UN Digital Library',
      publicationType: asString(asRecord(rec.collection).primary),
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
// Pure parsers and search adapters for BYOK sources (researcher-supplied keys)
// ---------------------------------------------------------------------------

export function parseElsevierResults(
  data: unknown,
  sourceId: 'scopus' | 'sciencedirect',
  sourceLabel: string,
  yearFrom?: number
): NormalizedPaper[] {
  const mapped: NormalizedPaper[] = [];
  for (const entry of asRecords(asRecord(asRecord(data)['search-results']).entry)) {
    if (entry.error) continue;
    const title = asString(entry['dc:title']);
    if (!title) continue;
    const doi = normalizeDoi(asString(entry['prism:doi']));
    const link = asRecords(entry.link).find((l) => l['@ref'] === 'scopus' || l['@ref'] === 'self');
    const creator = asString(entry['dc:creator']);
    const listedAuthors = asRecords(asRecord(entry.authors).author)
      .map((a) => firstString(a['$'], a.name))
      .filter((a): a is string => Boolean(a));
    const authors = listedAuthors.length > 0 ? listedAuthors : creator ? [creator] : [];

    mapped.push({
      id: `${sourceId}-${asString(entry['dc:identifier']) ?? doi ?? mapped.length}`,
      title,
      authors: authors.slice(0, 8),
      year: extractYear(entry['prism:coverDate']),
      venue: asString(entry['prism:publicationName']) ?? sourceLabel,
      doi,
      url: asString(link?.['@href']) ?? (doi ? `https://doi.org/${doi}` : 'https://www.scopus.com/'),
      pdfUrl: null,
      isOpenAccess:
        asString(entry.openaccessFlag)?.toLowerCase() === 'true' || asNumber(entry.openaccess) === 1,
      citationCount: nonNegativeCount(entry['citedby-count']),
      abstractText: asString(entry['dc:description']) ?? null,
      source: sourceId,
      sourceLabel,
      publicationType: asString(entry.subtypeDescription),
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
  const articles = asRecords(asRecord(data).articles);
  const mapped: NormalizedPaper[] = articles.map((art, idx) => {
    const doi = normalizeDoi(asString(art.doi));
    const isOa = asString(art.access_type)?.toUpperCase() === 'OPEN_ACCESS';
    const title = firstString(art.title, art.article_title) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `ieee-${asString(art.article_number) ?? doi ?? stableHashId(title, idx)}`,
      title,
      authors: asRecords(asRecord(art.authors).authors)
        .map((a) => asString(a.full_name))
        .filter((a): a is string => Boolean(a))
        .slice(0, 8),
      year: extractYear(art.publication_year),
      venue: asString(art.publication_title) ?? 'IEEE Xplore',
      doi,
      url:
        firstString(art.html_url, art.abstract_url) ??
        (doi ? `https://doi.org/${doi}` : 'https://ieeexplore.ieee.org/'),
      pdfUrl: isOa ? asString(art.pdf_url) ?? null : null,
      isOpenAccess: isOa,
      citationCount: nonNegativeCount(art.citing_paper_count),
      abstractText: asString(art.abstract) ?? null,
      source: 'ieeexplore',
      sourceLabel: 'IEEE Xplore',
      publicationType: asString(art.content_type),
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
  const records = asRecords(asRecord(data).records);
  const mapped: NormalizedPaper[] = records.map((rec, idx) => {
    const doi = normalizeDoi(asString(rec.doi));
    const urls = asRecords(rec.url);
    const byFormat = (format: string) =>
      asString(urls.find((u) => asString(u.format)?.toLowerCase() === format)?.value);
    const title = asString(rec.title) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `springer-${doi ?? stableHashId(title, idx)}`,
      title,
      authors: asRecords(rec.creators)
        .map((c) => asString(c.creator))
        .filter((c): c is string => Boolean(c))
        .slice(0, 8),
      year: extractYear(rec.publicationDate),
      venue: firstString(rec.publicationName, rec.publisher) ?? 'Springer Nature',
      doi,
      url:
        byFormat('html') ??
        asString(urls[0]?.value) ??
        (doi ? `https://doi.org/${doi}` : 'https://link.springer.com/'),
      pdfUrl: byFormat('pdf') ?? null,
      isOpenAccess: asString(rec.openaccess)?.toLowerCase() === 'true',
      citationCount: 0,
      abstractText: asString(rec.abstract) ?? null,
      source: 'springer',
      sourceLabel: 'Springer Nature',
      publicationType: asString(rec.contentType),
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
  const items = asRecords(asRecord(data).data);
  const mapped: NormalizedPaper[] = items.map((item, idx) => {
    const doi = normalizeDoi(asString(asRecords(item.external_ids).find((e) => e.type === 'doi')?.value));
    const authors = asRecords(item.authors)
      .map(
        (a) =>
          asString(a.display_name) ??
          ([asString(a.first_name), asString(a.last_name)].filter(Boolean).join(' ') || undefined)
      )
      .filter((a): a is string => Boolean(a))
      .slice(0, 8);
    const lensId = asString(item.lens_id);
    const title = asString(item.title) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `lens-${lensId ?? doi ?? stableHashId(title, idx)}`,
      title,
      authors,
      year: extractYear(item.year_published),
      venue: asString(asRecord(item.source).title) ?? 'The Lens.org',
      doi,
      url: lensId ? `https://www.lens.org/lens/scholar/article/${lensId}/main` : 'https://www.lens.org/',
      pdfUrl: asString(asRecord(asArray(asRecord(item.open_access).locations)[0]).pdf_url) ?? null,
      isOpenAccess: Boolean(item.is_open_access),
      citationCount: nonNegativeCount(item.scholarly_citations_count),
      abstractText: asString(item.abstract) ?? null,
      source: 'lens',
      sourceLabel: 'The Lens.org',
      publicationType: asString(item.publication_type),
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
  const root = asRecord(data);
  const rawList = Array.isArray(data)
    ? asRecords(data)
    : Array.isArray(root.items)
    ? asRecords(root.items)
    : asRecords(root.results);

  const mapped: NormalizedPaper[] = rawList.map((item, idx) => {
    const fileUrl = Array.isArray(item.files) ? asRecord(item.files[0]).url : item.url;
    const title = asString(item.title) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `fedinprint-${asString(item.id) ?? stableHashId(title, idx)}`,
      title,
      authors: asArray(item.authors)
        .map((a) => asString(a) ?? asString(asRecord(a).name))
        .filter((a): a is string => Boolean(a))
        .slice(0, 8),
      year: extractYear(item.publication_date ?? item.date ?? item.year),
      venue: firstString(item.series, item.institution) ?? 'Federal Reserve (Fed in Print)',
      doi: normalizeDoi(asString(item.doi)),
      url: firstString(item.handle_url, item.url) ?? 'https://fedinprint.org/',
      pdfUrl: pdfUrlOrNull(fileUrl),
      isOpenAccess: true,
      citationCount: 0,
      abstractText: asString(item.abstract) ?? null,
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
  const root = asRecord(data);
  const bills = asRecords(Array.isArray(root.bills) ? root.bills : root.results);
  const mapped: NormalizedPaper[] = bills.map((item, idx) => {
    const chamber = asString(item.originChamber);
    const title = asString(item.title) ?? UNTITLED_PAPER_TITLE;
    return {
      id: `govinfo-${firstString(item.number, item.congress) ?? stableHashId(title, idx)}`,
      title,
      authors: chamber ? [`U.S. Congress (${chamber})`] : ['U.S. Congress'],
      year: extractYear(item.updateDate ?? item.introducedDate),
      venue: 'Congress.gov / GovInfo',
      doi: null,
      url: (asString(item.url) ?? 'https://www.congress.gov/').replace('api.congress.gov/v3', 'www.congress.gov'),
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: asString(asRecord(item.latestAction).text) ?? null,
      source: 'govinfo',
      sourceLabel: 'Congress.gov / GovInfo',
      publicationType: asString(item.type) ?? 'Legislation',
    };
  });
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
