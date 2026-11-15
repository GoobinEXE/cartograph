import {
  ApiSourceId,
  ByokCredentialEntry,
  DeduplicationSummary,
  NormalizedPaper,
  SearchScopeId,
  SourceFetchStatus,
  UserAccessConfig,
} from '../types/academic';
import { deduplicatePapersAdvanced } from '../utils/deduplication';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { SupportedLanguage } from '../i18n/translations';
import { sourceMatchesScope } from '../data/apiSources';
import { buildByokCacheSignature, getActiveByokEntry } from '../utils/accessConfig';
import { cleanDoi, crossPlatformFetch, fetchViaByokProxy, isTauriRuntime } from './httpClient';
import {
  FREE_EXTENSION_SOURCE_RUNNERS,
  searchCore,
  searchFedInPrintByok,
  searchGovInfoByok,
  searchIeeeXploreByok,
  searchLensByok,
  searchScienceDirectByok,
  searchScopusByok,
  searchSpringerByok,
} from './sourceAdapters';

export { crossPlatformFetch, isTauriRuntime };

function reconstructOpenAlexAbstract(
  invertedIndex?: Record<string, number[]> | null
): string | null {
  if (!invertedIndex || typeof invertedIndex !== 'object') return null;
  const entries: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      for (const pos of positions) {
        entries.push([pos, word]);
      }
    }
  }
  if (entries.length === 0) return null;
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map((e) => e[1]).join(' ');
}

export async function searchOpenAlex(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const filterParts = [`default.search:${encodeURIComponent(query)}`];
  if (yearFrom && yearFrom > 1900) {
    filterParts.push(`from_publication_date:${yearFrom}-01-01`);
  }
  const url = `https://api.openalex.org/works?filter=${filterParts.join(
    ','
  )}&per-page=12&sort=relevance_score:desc`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`OpenAlex HTTP ${res.status}`);
  }
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  return results.map((item: Record<string, any>, idx: number): NormalizedPaper => {
    const doi = cleanDoi(item.doi);
    const authors = Array.isArray(item.authorships)
      ? item.authorships
          .slice(0, 5)
          .map((a: Record<string, any>) => a?.author?.display_name)
          .filter(Boolean)
      : [];
    const pdfUrl =
      item?.open_access?.oa_url ||
      item?.best_oa_location?.pdf_url ||
      item?.primary_location?.pdf_url ||
      null;
    const landingUrl =
      item?.primary_location?.landing_page_url ||
      (doi ? `https://doi.org/${doi}` : item.id || 'https://openalex.org');

    return {
      id: `openalex-${item.id || idx}`,
      title: String(item.display_name || item.title || 'Sem título'),
      authors,
      year: typeof item.publication_year === 'number' ? item.publication_year : null,
      venue:
        item?.primary_location?.source?.display_name ||
        item?.host_venue?.display_name ||
        'OpenAlex Indexed Venue',
      doi,
      url: landingUrl,
      pdfUrl,
      isOpenAccess: Boolean(item?.open_access?.is_oa || pdfUrl),
      citationCount: typeof item.cited_by_count === 'number' ? item.cited_by_count : 0,
      abstractText: reconstructOpenAlexAbstract(item.abstract_inverted_index),
      source: 'openalex',
      sourceLabel: 'OpenAlex',
      publicationType: item.type || undefined,
    };
  });
}

export async function searchSemanticScholar(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal,
  byokEntry?: ByokCredentialEntry | null
): Promise<NormalizedPaper[]> {
  let res: Response;
  if (byokEntry) {
    res = await fetchViaByokProxy('semanticscholar', query, 10, byokEntry, yearFrom, signal);
  } else {
    const yearParam = yearFrom && yearFrom > 1900 ? `&year=${yearFrom}-` : '';
    const fields =
      'title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,externalIds,abstract,url';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
      query
    )}&limit=10&fields=${fields}${yearParam}`;

    res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`Semantic Scholar HTTP ${res.status}`);
    }
  }
  const data = await res.json();
  const list = Array.isArray(data?.data) ? data.data : [];

  return list.map((item: Record<string, any>, idx: number): NormalizedPaper => {
    const doi = cleanDoi(item?.externalIds?.DOI);
    const pdfUrl = item?.openAccessPdf?.url || null;
    const authors = Array.isArray(item.authors)
      ? item.authors
          .slice(0, 5)
          .map((a: Record<string, any>) => a?.name)
          .filter(Boolean)
      : [];

    return {
      id: `s2-${item.paperId || idx}`,
      title: String(item.title || 'Sem título'),
      authors,
      year: typeof item.year === 'number' ? item.year : null,
      venue: String(item.venue || 'Semantic Scholar'),
      doi,
      url: item.url || (doi ? `https://doi.org/${doi}` : 'https://www.semanticscholar.org'),
      pdfUrl,
      isOpenAccess: Boolean(item.isOpenAccess || pdfUrl),
      citationCount: typeof item.citationCount === 'number' ? item.citationCount : 0,
      abstractText: typeof item.abstract === 'string' ? item.abstract : null,
      source: 'semanticscholar',
      sourceLabel: 'Semantic Scholar',
    };
  });
}

export async function searchCrossref(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const filterParam =
    yearFrom && yearFrom > 1900 ? `&filter=from-pub-date:${yearFrom}-01-01` : '';
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(
    query
  )}&rows=10${filterParam}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Crossref HTTP ${res.status}`);
  }
  const data = await res.json();
  const items = Array.isArray(data?.message?.items) ? data.message.items : [];

  return items.map((item: Record<string, any>, idx: number): NormalizedPaper => {
    const doi = cleanDoi(item.DOI);
    const title = Array.isArray(item.title) && item.title[0] ? String(item.title[0]) : 'Sem título';
    const authors = Array.isArray(item.author)
      ? item.author
          .slice(0, 5)
          .map((a: Record<string, any>) =>
            [a?.given, a?.family].filter(Boolean).join(' ')
          )
          .filter(Boolean)
      : [];
    const dateParts =
      item?.published?.['date-parts']?.[0] ||
      item?.issued?.['date-parts']?.[0] ||
      [];
    const year = typeof dateParts[0] === 'number' ? dateParts[0] : null;
    const venue =
      Array.isArray(item['container-title']) && item['container-title'][0]
        ? String(item['container-title'][0])
        : item.publisher || 'Crossref Registered Journal';

    const pdfLinkObj = Array.isArray(item.link)
      ? item.link.find(
          (l: Record<string, any>) =>
            l?.['content-type'] === 'application/pdf' ||
            String(l?.URL || '').endsWith('.pdf')
        )
      : null;

    const cleanAbstract =
      typeof item.abstract === 'string'
        ? item.abstract.replace(/<\/?[^>]+(>|$)/g, '').trim()
        : null;

    return {
      id: `crossref-${doi || idx}`,
      title,
      authors,
      year,
      venue,
      doi,
      url: item.URL || (doi ? `https://doi.org/${doi}` : 'https://search.crossref.org'),
      pdfUrl: pdfLinkObj?.URL || null,
      isOpenAccess: Boolean(pdfLinkObj?.URL),
      citationCount:
        typeof item['is-referenced-by-count'] === 'number'
          ? item['is-referenced-by-count']
          : 0,
      abstractText: cleanAbstract,
      source: 'crossref',
      sourceLabel: 'Crossref DOI',
      publicationType: item.type || undefined,
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

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Europe PMC HTTP ${res.status}`);
  }
  const data = await res.json();
  const list = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];

  return list.map((item: Record<string, any>, idx: number): NormalizedPaper => {
    const doi = cleanDoi(item.doi);
    const authors = String(item.authorString || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    const year = item.pubYear ? Number(item.pubYear) : null;
    const isOA = item.isOpenAccess === 'Y' || Boolean(item.pmcid);
    const pdfUrl = item.pmcid
      ? `https://europepmc.org/backend/ptpmcrender.fcgi?accid=${item.pmcid}&blobtype=pdf`
      : null;
    const landingUrl = item.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`
      : doi
      ? `https://doi.org/${doi}`
      : 'https://europepmc.org';

    return {
      id: `epmc-${item.id || idx}`,
      title: String(item.title || 'Sem título'),
      authors,
      year: Number.isNaN(year) ? null : year,
      venue: String(item.journalTitle || item.bookOrReportDetails?.publisher || 'PubMed / Europe PMC'),
      doi,
      url: landingUrl,
      pdfUrl,
      isOpenAccess: isOA,
      citationCount: typeof item.citedByCount === 'number' ? item.citedByCount : 0,
      abstractText: typeof item.abstractText === 'string' ? item.abstractText : null,
      source: 'europepmc',
      sourceLabel: 'PubMed / Europe PMC',
    };
  });
}

export async function searchArxiv(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await crossPlatformFetch(
    `/api/arxiv?q=${encodeURIComponent(query)}&max_results=10`,
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      query
    )}&start=0&max_results=10&sortBy=relevance&sortOrder=descending`,
    { signal }
  );
  if (!res.ok) {
    throw new Error(`arXiv HTTP ${res.status}`);
  }
  const xmlText = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const entries = Array.from(doc.querySelectorAll('entry'));

  const results: NormalizedPaper[] = [];
  entries.forEach((entry, idx) => {
    const idUrl = entry.querySelector('id')?.textContent?.trim() || '';
    const title = (entry.querySelector('title')?.textContent || 'Sem título')
      .replace(/\s+/g, ' ')
      .trim();
    const summary = (entry.querySelector('summary')?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
    const published = entry.querySelector('published')?.textContent?.trim() || '';
    const year = published ? Number(published.slice(0, 4)) : null;

    if (yearFrom && year && year < yearFrom) {
      return;
    }

    const authors = Array.from(entry.querySelectorAll('author > name'))
      .map((n) => n.textContent?.trim() || '')
      .filter(Boolean)
      .slice(0, 5);

    const doiNode = entry.getElementsByTagName('arxiv:doi')[0];
    const doi = cleanDoi(doiNode?.textContent);
    const pdfUrl = idUrl ? idUrl.replace('/abs/', '/pdf/') + '.pdf' : null;

    results.push({
      id: `arxiv-${idUrl || idx}`,
      title,
      authors,
      year,
      venue: 'arXiv Preprint Server (Cornell)',
      doi,
      url: idUrl || 'https://arxiv.org',
      pdfUrl,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: summary || null,
      source: 'arxiv',
      sourceLabel: 'arXiv.org',
      publicationType: 'preprint',
    });
  });

  return results;
}

export async function searchPubMedEntrez(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const term =
    yearFrom && yearFrom > 1900 ? `${query} AND ${yearFrom}:2030[dp]` : query;
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
    term
  )}&retmode=json&retmax=8&sort=relevance`;

  const searchRes = await fetch(searchUrl, { signal });
  if (!searchRes.ok) {
    throw new Error(`PubMed Entrez HTTP ${searchRes.status}`);
  }
  const searchData = await searchRes.json();
  const idList: string[] = Array.isArray(searchData?.esearchresult?.idlist)
    ? searchData.esearchresult.idlist
    : [];
  if (idList.length === 0) return [];

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(
    ','
  )}&retmode=json`;
  const summaryRes = await fetch(summaryUrl, { signal });
  if (!summaryRes.ok) {
    throw new Error(`PubMed Summary HTTP ${summaryRes.status}`);
  }
  const summaryData = await summaryRes.json();
  const resultObj = summaryData?.result || {};

  return idList
    .map((pmid): NormalizedPaper | null => {
      const doc = resultObj[pmid];
      if (!doc || typeof doc !== 'object') return null;

      const articleIds = Array.isArray(doc.articleids) ? doc.articleids : [];
      const doiEntry = articleIds.find((a: Record<string, any>) => a?.idtype === 'doi');
      const pmcEntry = articleIds.find((a: Record<string, any>) => a?.idtype === 'pmc');
      const doi = cleanDoi(doiEntry?.value);
      const pmcid = pmcEntry?.value || null;
      const yearMatch = String(doc.pubdate || '').match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? Number(yearMatch[0]) : null;
      const authors = Array.isArray(doc.authors)
        ? doc.authors
            .slice(0, 5)
            .map((a: Record<string, any>) => a?.name)
            .filter(Boolean)
        : [];

      return {
        id: `pubmed-${pmid}`,
        title: String(doc.title || 'Sem título').replace(/\.$/, ''),
        authors,
        year,
        venue: String(doc.fulljournalname || doc.source || 'PubMed / MEDLINE'),
        doi,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        pdfUrl: pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/pdf/` : null,
        isOpenAccess: Boolean(pmcid),
        citationCount: 0,
        abstractText: null,
        source: 'pubmed',
        sourceLabel: 'PubMed (NIH)',
      };
    })
    .filter((item): item is NormalizedPaper => item !== null);
}

export async function searchDoaj(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(
    query
  )}?pageSize=8`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`DOAJ HTTP ${res.status}`);
  }
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  const mapped: NormalizedPaper[] = [];
  results.forEach((item: Record<string, any>, idx: number) => {
    const bib = item?.bibjson || {};
    const year = bib.year ? Number(bib.year) : null;
    if (yearFrom && year && year < yearFrom) return;

    const identifiers = Array.isArray(bib.identifier) ? bib.identifier : [];
    const doiObj = identifiers.find((i: Record<string, any>) => i?.type === 'doi');
    const doi = cleanDoi(doiObj?.id);
    const links = Array.isArray(bib.link) ? bib.link : [];
    const fulltextLink =
      links.find((l: Record<string, any>) => l?.type === 'fulltext')?.url || null;
    const authors = Array.isArray(bib.author)
      ? bib.author
          .slice(0, 5)
          .map((a: Record<string, any>) => a?.name)
          .filter(Boolean)
      : [];

    mapped.push({
      id: `doaj-${item.id || idx}`,
      title: String(bib.title || 'Sem título'),
      authors,
      year: Number.isNaN(year) ? null : year,
      venue: String(bib?.journal?.title || 'DOAJ Open Access Journal'),
      doi,
      url: fulltextLink || (doi ? `https://doi.org/${doi}` : 'https://doaj.org'),
      pdfUrl: fulltextLink,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: typeof bib.abstract === 'string' ? bib.abstract : null,
      source: 'doaj',
      sourceLabel: 'DOAJ (Open Access)',
    });
  });

  return mapped;
}

export async function searchZenodo(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await crossPlatformFetch(
    `/api/zenodo?q=${encodeURIComponent(query)}&size=8`,
    `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=8`,
    { headers: { Accept: 'application/json' }, signal }
  );
  if (!res.ok) {
    throw new Error(`Zenodo HTTP ${res.status}`);
  }
  const data = await res.json();

  const hits = Array.isArray(data?.hits?.hits) ? data.hits.hits : [];
  const mapped: NormalizedPaper[] = [];

  hits.forEach((hit: Record<string, any>, idx: number) => {
    const meta = hit?.metadata || {};
    const pubDate = String(meta.publication_date || '');
    const year = pubDate ? Number(pubDate.slice(0, 4)) : null;
    if (yearFrom && year && year < yearFrom) return;

    const doi = cleanDoi(hit.doi || meta.doi);
    const authors = Array.isArray(meta.creators)
      ? meta.creators
          .slice(0, 5)
          .map((c: Record<string, any>) => c?.name)
          .filter(Boolean)
      : [];
    const firstFile = Array.isArray(hit.files) ? hit.files[0] : null;
    const pdfUrl = firstFile?.links?.self || null;
    const cleanDesc =
      typeof meta.description === 'string'
        ? meta.description.replace(/<\/?[^>]+(>|$)/g, '').trim()
        : null;

    mapped.push({
      id: `zenodo-${hit.id || idx}`,
      title: String(meta.title || 'Sem título'),
      authors,
      year: Number.isNaN(year) ? null : year,
      venue: String(meta?.journal?.title || 'Zenodo / CERN OpenAIRE'),
      doi,
      url: hit?.links?.self_html || (doi ? `https://doi.org/${doi}` : 'https://zenodo.org'),
      pdfUrl,
      isOpenAccess: meta.access_right === 'open' || Boolean(pdfUrl),
      citationCount: 0,
      abstractText: cleanDesc,
      source: 'zenodo',
      sourceLabel: 'Zenodo (CERN)',
      publicationType: meta?.resource_type?.type || undefined,
    });
  });

  return mapped;
}

export async function searchHalOpenScience(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const fqParam =
    yearFrom && yearFrom > 1900 ? `&fq=producedDateY_i:[${yearFrom}%20TO%202030]` : '';
  const url = `https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(
    query
  )}${fqParam}&wt=json&rows=8&fl=docid,title_s,authFullName_s,producedDateY_i,journalTitle_s,doiId_s,uri_s,fileMain_s,abstract_s,openAccess_bool`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HAL HTTP ${res.status}`);
  }
  const data = await res.json();
  const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];

  return docs.map((doc: Record<string, any>, idx: number): NormalizedPaper => {
    const title = Array.isArray(doc.title_s) && doc.title_s[0] ? String(doc.title_s[0]) : 'Sem título';
    const abstractText =
      Array.isArray(doc.abstract_s) && doc.abstract_s[0] ? String(doc.abstract_s[0]) : null;
    const authors = Array.isArray(doc.authFullName_s)
      ? doc.authFullName_s.slice(0, 5).map(String)
      : [];
    const doi = cleanDoi(doc.doiId_s);
    const pdfUrl = typeof doc.fileMain_s === 'string' ? doc.fileMain_s : null;

    return {
      id: `hal-${doc.docid || idx}`,
      title,
      authors,
      year: typeof doc.producedDateY_i === 'number' ? doc.producedDateY_i : null,
      venue: String(doc.journalTitle_s || 'HAL Open Science (CNRS)'),
      doi,
      url: doc.uri_s || (doi ? `https://doi.org/${doi}` : 'https://hal.science'),
      pdfUrl,
      isOpenAccess: Boolean(doc.openAccess_bool || pdfUrl),
      citationCount: 0,
      abstractText,
      source: 'hal',
      sourceLabel: 'HAL Science (CNRS)',
    };
  });
}

export async function searchDataCite(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://api.datacite.org/dois?query=${encodeURIComponent(
    query
  )}&page[size]=8`;

  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.api+json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`DataCite HTTP ${res.status}`);
  }
  const data = await res.json();
  const items = Array.isArray(data?.data) ? data.data : [];

  const mapped: NormalizedPaper[] = [];
  items.forEach((item: Record<string, any>, idx: number) => {
    const attr = item?.attributes || {};
    const year = typeof attr.publicationYear === 'number' ? attr.publicationYear : null;
    if (yearFrom && year && year < yearFrom) return;

    const doi = cleanDoi(attr.doi);
    const title =
      Array.isArray(attr.titles) && attr.titles[0]?.title
        ? String(attr.titles[0].title)
        : 'Sem título';
    const authors = Array.isArray(attr.creators)
      ? attr.creators
          .slice(0, 5)
          .map((c: Record<string, any>) => c?.name || [c?.givenName, c?.familyName].filter(Boolean).join(' '))
          .filter(Boolean)
      : [];
    const desc =
      Array.isArray(attr.descriptions) && attr.descriptions[0]?.description
        ? String(attr.descriptions[0].description)
        : null;

    mapped.push({
      id: `datacite-${doi || idx}`,
      title,
      authors,
      year,
      venue: String(attr.publisher || 'DataCite Commons Repository'),
      doi,
      url: attr.url || (doi ? `https://doi.org/${doi}` : 'https://commons.datacite.org'),
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: typeof attr.citationCount === 'number' ? attr.citationCount : 0,
      abstractText: desc,
      source: 'datacite',
      sourceLabel: 'DataCite Commons',
    });
  });

  return mapped;
}

export async function searchInspireHep(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://inspirehep.net/api/literature?q=${encodeURIComponent(
    query
  )}&size=8&sort=mostrecent`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`INSPIRE-HEP HTTP ${res.status}`);
  }
  const data = await res.json();
  const hits = Array.isArray(data?.hits?.hits) ? data.hits.hits : [];

  const mapped: NormalizedPaper[] = [];
  hits.forEach((hit: Record<string, any>, idx: number) => {
    const meta = hit?.metadata || {};
    const dateStr = typeof meta.earliest_date === 'string' ? meta.earliest_date : '';
    const yearMatch = dateStr.match(/\d{4}/);
    const year = yearMatch ? Number(yearMatch[0]) : null;
    if (yearFrom && year && year < yearFrom) return;

    const title =
      Array.isArray(meta.titles) && meta.titles[0]?.title
        ? String(meta.titles[0].title)
        : 'Sem título';
    const authors = Array.isArray(meta.authors)
      ? meta.authors
          .slice(0, 5)
          .map((a: Record<string, any>) => a?.full_name || [a?.first_name, a?.last_name].filter(Boolean).join(' '))
          .filter(Boolean)
      : [];
    const doiRaw = Array.isArray(meta.dois) && meta.dois[0]?.value ? String(meta.dois[0].value) : null;
    const doi = cleanDoi(doiRaw);
    const abstractText =
      Array.isArray(meta.abstracts) && meta.abstracts[0]?.value
        ? String(meta.abstracts[0].value)
        : null;
    const arxivId =
      Array.isArray(meta.arxiv_eprints) && meta.arxiv_eprints[0]?.value
        ? String(meta.arxiv_eprints[0].value)
        : null;
    const controlNumber = hit?.id || meta.control_number || idx;

    mapped.push({
      id: `inspire-${controlNumber}`,
      title,
      authors,
      year,
      venue:
        (Array.isArray(meta.publication_info) && meta.publication_info[0]?.journal_title) ||
        'INSPIRE-HEP (CERN)',
      doi,
      url: `https://inspirehep.net/literature/${controlNumber}`,
      pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null,
      isOpenAccess: true,
      citationCount: typeof meta.citation_count === 'number' ? meta.citation_count : 0,
      abstractText,
      source: 'inspire',
      sourceLabel: 'INSPIRE-HEP (CERN)',
    });
  });

  return mapped;
}

export async function searchFigshare(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await fetch('https://api.figshare.com/v2/articles/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ search_for: query, page_size: 8 }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Figshare HTTP ${res.status}`);
  }
  const items = await res.json();
  if (!Array.isArray(items)) return [];

  const mapped: NormalizedPaper[] = [];
  items.forEach((item: Record<string, any>, idx: number) => {
    const pubDate = typeof item?.published_date === 'string' ? item.published_date : '';
    const yearMatch = pubDate.match(/\d{4}/);
    const year = yearMatch ? Number(yearMatch[0]) : null;
    if (yearFrom && year && year < yearFrom) return;

    const doi = cleanDoi(item?.doi);
    const rawTitle = String(item?.title || 'Sem título').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    mapped.push({
      id: `figshare-${item?.id || idx}`,
      title: rawTitle,
      authors: [],
      year,
      venue: item?.defined_type_name ? `Figshare (${String(item.defined_type_name)})` : 'Figshare Repository',
      doi,
      url: String(item?.url_public_html || (doi ? `https://doi.org/${doi}` : 'https://figshare.com')),
      pdfUrl: null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: item?.resource_title ? `Recurso associado: ${String(item.resource_title)}` : null,
      source: 'figshare',
      sourceLabel: 'Figshare Data',
      publicationType: item?.defined_type_name ? String(item.defined_type_name) : undefined,
    });
  });

  return mapped;
}

export async function searchGbifLiterature(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const url = `https://api.gbif.org/v1/literature/search?q=${encodeURIComponent(
    query
  )}&limit=8`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`GBIF HTTP ${res.status}`);
  }
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  const mapped: NormalizedPaper[] = [];
  results.forEach((item: Record<string, any>, idx: number) => {
    const year = typeof item?.year === 'number' ? item.year : null;
    if (yearFrom && year && year < yearFrom) return;

    const doi = cleanDoi(item?.identifiers?.doi);
    const authors = Array.isArray(item?.authors)
      ? item.authors
          .slice(0, 5)
          .map((a: Record<string, any>) =>
            typeof a === 'string'
              ? a
              : [a?.firstName, a?.lastName].filter(Boolean).join(' ')
          )
          .filter(Boolean)
      : [];
    const websites = Array.isArray(item?.websites) ? item.websites : [];
    const primaryUrl =
      (websites[0] && String(websites[0])) ||
      (doi ? `https://doi.org/${doi}` : `https://www.gbif.org/resource/search?contentType=literature&q=${encodeURIComponent(query)}`);

    mapped.push({
      id: `gbif-${item?.id || doi || idx}`,
      title: String(item?.title || 'Sem título'),
      authors,
      year,
      venue: String(item?.source || item?.publisher || 'GBIF Literature'),
      doi,
      url: primaryUrl,
      pdfUrl: null,
      isOpenAccess: Boolean(item?.openAccess),
      citationCount: 0,
      abstractText: item?.abstract ? String(item.abstract) : null,
      source: 'gbif',
      sourceLabel: 'GBIF Biodiversity',
      publicationType: item?.literatureType ? String(item.literatureType) : undefined,
    });
  });

  return mapped;
}

export async function searchOstiGov(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await crossPlatformFetch(
    `/api/osti?q=${encodeURIComponent(query)}&rows=8`,
    `https://www.osti.gov/api/v1/records?q=${encodeURIComponent(query)}&rows=8`,
    { headers: { Accept: 'application/json' }, signal }
  );
  if (!res.ok) {
    throw new Error(`OSTI.GOV HTTP ${res.status}`);
  }
  const items = await res.json();
  if (!Array.isArray(items)) return [];

  const mapped: NormalizedPaper[] = [];
  items.forEach((item: Record<string, any>, idx: number) => {
    const dateStr = String(item?.publication_date || item?.entry_date || '');
    const yearMatch = dateStr.match(/\d{4}/);
    const year = yearMatch ? Number(yearMatch[0]) : null;
    if (yearFrom && year && year < yearFrom) return;

    const doi = cleanDoi(item?.doi);
    const authors = Array.isArray(item?.authors)
      ? item.authors.slice(0, 5).map((a: unknown) => String(a)).filter(Boolean)
      : [];
    const ostiId = item?.osti_id || idx;
    const links = Array.isArray(item?.links) ? item.links : [];
    const fullTextLink = links.find((l: Record<string, any>) => l?.rel === 'fulltext')?.href || null;

    mapped.push({
      id: `osti-${ostiId}`,
      title: String(item?.title || 'Sem título'),
      authors,
      year,
      venue: String(item?.research_orgs?.[0] || item?.sponsor_orgs?.[0] || 'OSTI.GOV (DOE)'),
      doi,
      url: `https://www.osti.gov/biblio/${ostiId}`,
      pdfUrl: fullTextLink,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: item?.description ? String(item.description) : null,
      source: 'osti',
      sourceLabel: 'OSTI.GOV (DOE)',
      publicationType: item?.product_type ? String(item.product_type) : undefined,
    });
  });

  return mapped;
}

export async function searchNasaNtrs(
  query: string,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<NormalizedPaper[]> {
  const res = await crossPlatformFetch(
    `/api/ntrs?q=${encodeURIComponent(query)}&size=8`,
    `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(query)}&page%5Bsize%5D=8`,
    { headers: { Accept: 'application/json' }, signal }
  );
  if (!res.ok) {
    throw new Error(`NASA NTRS HTTP ${res.status}`);
  }
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  const mapped: NormalizedPaper[] = [];
  results.forEach((item: Record<string, any>, idx: number) => {
    const pubDate = String(item?.distributionDate || item?.publications?.[0]?.publicationDate || '');
    const yearMatch = pubDate.match(/\d{4}/);
    const year = yearMatch ? Number(yearMatch[0]) : null;
    if (yearFrom && year && year < yearFrom) return;

    const authors = Array.isArray(item?.authorAffiliations)
      ? item.authorAffiliations
          .slice(0, 5)
          .map((a: Record<string, any>) => a?.meta?.author?.name)
          .filter(Boolean)
      : [];
    const ntrsId = item?.id || idx;
    const downloads = Array.isArray(item?.downloads) ? item.downloads : [];
    const pdfDownload = downloads.find((d: Record<string, any>) => d?.links?.pdf)?.links?.pdf || null;
    const doi = cleanDoi(item?.publications?.[0]?.doi);

    mapped.push({
      id: `ntrs-${ntrsId}`,
      title: String(item?.title || 'Sem título'),
      authors,
      year,
      venue: String(item?.center?.name || 'NASA Technical Reports Server'),
      doi,
      url: `https://ntrs.nasa.gov/citations/${ntrsId}`,
      pdfUrl: pdfDownload ? `https://ntrs.nasa.gov${pdfDownload}` : null,
      isOpenAccess: true,
      citationCount: 0,
      abstractText: item?.abstract ? String(item.abstract) : null,
      source: 'ntrs',
      sourceLabel: 'NASA NTRS',
      publicationType: item?.stiType ? String(item.stiType) : undefined,
    });
  });

  return mapped;
}

export function deduplicatePapers(papers: NormalizedPaper[]): NormalizedPaper[] {
  return deduplicatePapersAdvanced(papers).papers;
}

export interface FederatedSearchResult {
  papers: NormalizedPaper[];
  statuses: SourceFetchStatus[];
  deduplicationSummary: DeduplicationSummary;
}

export interface FederatedSearchProgress extends FederatedSearchResult {
  completedCount: number;
  totalCount: number;
}

export interface RunFederatedSearchOptions {
  signal?: AbortSignal;
  language?: SupportedLanguage;
  scope?: SearchScopeId;
  accessConfig?: UserAccessConfig;
  onProgress?: (progress: FederatedSearchProgress) => void;
}

const FEDERATED_CACHE_TTL_MS = 5 * 60 * 1000;
const FEDERATED_CACHE_MAX = 30;
const SOURCE_TIMEOUT_MS = 12_000;
const STREAM_COALESCE_MS = 60;
const federatedSearchCache = new Map<string, { timestamp: number; result: FederatedSearchResult }>();

const PROXY_SOURCES = new Set<ApiSourceId>([
  'arxiv',
  'zenodo',
  'osti',
  'ntrs',
  'eric',
  'oasisbr',
  'worldbank_okr',
  'ipea',
  'undl',
  'scopus',
  'sciencedirect',
  'ieeexplore',
  'springer',
  'lens',
  'fedinprint',
  'govinfo',
]);

const BYOK_ONLY_SOURCES = new Set<ApiSourceId>([
  'scopus',
  'sciencedirect',
  'ieeexplore',
  'springer',
  'lens',
  'fedinprint',
  'govinfo',
]);

function diagnoseSourceError(
  sourceId: ApiSourceId,
  label: string,
  err: unknown,
  language: SupportedLanguage = 'pt'
): { errorMessage: string; errorDetail: string; rawError: string } {
  const isEn = language === 'en';
  const rawError = err instanceof Error ? err.message : String(err || (isEn ? 'Unknown error' : 'Erro desconhecido'));
  const normalized = rawError.toLowerCase();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      errorMessage: isEn
        ? 'Internet connection unavailable on this device.'
        : 'Conexão com a internet indisponível no dispositivo.',
      errorDetail: isEn
        ? 'Restore network access and run the search again.'
        : 'Restabeleça o acesso à rede e execute a pesquisa novamente.',
      rawError,
    };
  }

  if (normalized.includes('timeout') || normalized.includes('12s')) {
    return {
      errorMessage: isEn
        ? `${label} exceeded the response timeout for this query.`
        : `${label} excedeu o tempo limite de resposta para esta consulta.`,
      errorDetail: isEn
        ? 'Query complexity or temporary repository slowness prevented records from returning. Reduce the number of keywords or retry in a few moments.'
        : 'O volume de termos pesquisados ou a lentidão momentânea da base impediu o retorno dos registros. Reduza o número de palavras-chave ou repita a operação em instantes.',
      rawError,
    };
  }

  const httpMatch = rawError.match(/\bHTTP\s+(\d{3})\b/i);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    if (status === 429) {
      return {
        errorMessage: isEn
          ? `${label} reached its temporary rate limit for consecutive queries.`
          : `${label} atingiu o limite temporário de consultas consecutivas.`,
        errorDetail: isEn
          ? 'The provider restricts consecutive request volume. Wait about 1 minute before querying this source again.'
          : 'O provedor restringe o volume de pesquisas enviadas em sequência. Aguarde aproximadamente 1 minuto antes de realizar uma nova consulta nesta fonte.',
        rawError,
      };
    }
    if (status === 400 || status === 422) {
      return {
        errorMessage: isEn
          ? `${label} rejected the query terms or filters provided.`
          : `${label} recusou os termos ou filtros informados nesta pesquisa.`,
        errorDetail: isEn
          ? 'Boolean operators (AND, OR, NOT), quotes, special symbols, or year filters may not be supported by this source. Try direct keywords.'
          : 'Operadores lógicos (AND, OR, NOT), aspas, símbolos especiais ou filtros de ano podem ser incompatíveis com esta base. Utilize apenas palavras-chave diretas.',
        rawError,
      };
    }
    if (status === 401 || status === 403) {
      if (BYOK_ONLY_SOURCES.has(sourceId) || sourceId === 'semanticscholar' || sourceId === 'core') {
        return {
          errorMessage: isEn
            ? `${label} rejected the configured API key or institutional token.`
            : `${label} recusou a chave de API ou token institucional configurado.`,
          errorDetail: isEn
            ? 'Review your key and optional InstToken in Institutional Access & API Keys settings.'
            : 'Verifique sua chave e o InstToken opcional nas configurações de Acesso Institucional & Chaves de API.',
          rawError,
        };
      }
      return {
        errorMessage: isEn
          ? `Automated access to ${label} is restricted by the origin portal.`
          : `O acesso automatizado ao ${label} encontra-se restrito pelo portal de origem.`,
        errorDetail: isEn
          ? 'Select another available source or open the portal directly in the "Platforms & Portals" tab.'
          : 'Selecione outra base disponível ou acesse o portal diretamente pela aba "Bases & Portais".',
        rawError,
      };
    }
    if (status === 404) {
      return {
        errorMessage: isEn
          ? `The ${label} search service is unavailable at the configured endpoint.`
          : `O serviço de pesquisa do ${label} encontra-se indisponível no endereço configurado.`,
        errorDetail: PROXY_SOURCES.has(sourceId)
          ? (isEn
              ? 'The proxy service for this source is currently inactive. Use the remaining sources while connectivity is restored.'
              : 'O serviço intermediário de acesso a esta base está inativo no momento. Utilize as demais fontes enquanto a conexão é restabelecida.')
          : (isEn
              ? 'The repository may be undergoing maintenance or its search endpoint may be temporarily disabled.'
              : 'A base pode estar em manutenção ou com o serviço de busca temporariamente desativado.'),
        rawError,
      };
    }
    if (status >= 500) {
      return {
        errorMessage: isEn
          ? `${label} experienced an internal error while processing the request.`
          : `${label} apresentou instabilidade interna ao processar a solicitação.`,
        errorDetail: isEn
          ? 'The failure occurred on the scientific database provider side. Wait a few minutes before retrying.'
          : 'A falha ocorreu no sistema do provedor da base científica. Aguarde alguns minutos antes de repetir a consulta.',
        rawError,
      };
    }
  }

  const isNetworkOrCors =
    normalized.includes('load failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('err_failed');

  if (isNetworkOrCors) {
    if (sourceId === 'semanticscholar') {
      return {
        errorMessage: isEn
          ? 'Semantic Scholar reached its public request limit or temporarily restricted access.'
          : 'O Semantic Scholar atingiu o limite de consultas públicas ou restringiu temporariamente o acesso.',
        errorDetail: isEn
          ? 'Under high load, Semantic Scholar throttles requests briefly without returning CORS details to the browser. Wait about 1 minute to retry or use the other sources.'
          : 'Sob alta demanda, o Semantic Scholar interrompe novas pesquisas por alguns instantes sem retornar detalhes ao navegador. Aguarde aproximadamente 1 minuto para consultar esta base novamente ou utilize as demais fontes.',
        rawError,
      };
    }

    if (PROXY_SOURCES.has(sourceId)) {
      return {
        errorMessage: isEn
          ? `Could not connect to ${label}.`
          : `Não foi possível estabelecer conexão com o ${label}.`,
        errorDetail: isEn
          ? 'The proxy service required for this source is unavailable or blocked right now. Retry later or select another source.'
          : 'O serviço intermediário necessário para consultar esta base está indisponível ou bloqueado no momento. Repita a operação mais tarde ou selecione outra fonte.',
        rawError,
      };
    }

    return {
      errorMessage: isEn
        ? `Communication with ${label} was blocked or interrupted during the query.`
        : `A comunicação com o ${label} foi bloqueada ou interrompida durante a consulta.`,
      errorDetail: isEn
        ? 'This may be caused by temporary origin rate limits or browser extensions/network tools such as VPNs, antivirus shields, or content blockers. Retry shortly.'
        : 'A restrição pode decorrer de limite temporário do portal de origem ou de bloqueios externos no navegador, como VPN, antivírus ou bloqueadores de conteúdo. Repita a pesquisa em instantes.',
      rawError,
    };
  }

  if (
    normalized.includes('json') ||
    normalized.includes('unexpected token') ||
    normalized.includes('syntaxerror') ||
    normalized.includes('xml') ||
    normalized.includes('domparser') ||
    normalized.includes('html')
  ) {
    return {
      errorMessage: isEn
        ? `${label} returned a notice or maintenance page instead of bibliographic records.`
        : `${label} retornou uma página de aviso ou manutenção em vez dos registros bibliográficos.`,
      errorDetail: isEn
        ? 'The portal may be undergoing scheduled updates. Try querying again later.'
        : 'O portal pode estar passando por atualização programada. Repita a consulta mais tarde.',
      rawError,
    };
  }

  return {
    errorMessage: isEn
      ? `Could not complete the search in ${label}.`
      : `Não foi possível concluir a pesquisa em ${label}.`,
    errorDetail: isEn
      ? 'Retry in a few moments or switch back to "All sources" to view results from the remaining databases.'
      : 'Repita a operação em alguns instantes ou retorne para "Todas as fontes" para visualizar os resultados das demais bases.',
    rawError,
  };
}

function runWithSourceAbortAndTimeout<T>(
  runner: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
  parentSignal?: AbortSignal
): Promise<T> {
  if (parentSignal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const controller = new AbortController();

  return new Promise<T>((resolve, reject) => {
    const onParentAbort = () => {
      clearTimeout(timer);
      controller.abort();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label}: timeout (${Math.round(timeoutMs / 1000)}s)`));
    }, timeoutMs);

    parentSignal?.addEventListener('abort', onParentAbort, { once: true });

    runner(controller.signal).then(
      (val) => {
        clearTimeout(timer);
        parentSignal?.removeEventListener('abort', onParentAbort);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        parentSignal?.removeEventListener('abort', onParentAbort);
        reject(err);
      }
    );
  });
}

export async function runFederatedSearch(
  query: string,
  yearFrom?: number,
  optionsOrCallback?: RunFederatedSearchOptions | ((statuses: SourceFetchStatus[]) => void)
): Promise<FederatedSearchResult> {
  const options: RunFederatedSearchOptions =
    typeof optionsOrCallback === 'function'
      ? { onProgress: (p) => optionsOrCallback(p.statuses) }
      : optionsOrCallback ?? {};
  const { signal, language = 'pt', scope = 'all', accessConfig, onProgress } = options;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const byokSig = buildByokCacheSignature(accessConfig);
  const cacheKey = `${query.trim().toLowerCase()}::${yearFrom ?? 'all'}::${language}::${scope}::${byokSig}`;
  const cached = federatedSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FEDERATED_CACHE_TTL_MS) {
    onProgress?.({
      ...cached.result,
      completedCount: cached.result.statuses.length,
      totalCount: cached.result.statuses.length,
    });
    return cached.result;
  }

  const s2Key = getActiveByokEntry(accessConfig, 'semanticscholar');
  const coreKey = getActiveByokEntry(accessConfig, 'core');

  const allFreeSources: Array<{
    id: ApiSourceId;
    label: string;
    fn: (q: string, y?: number, sig?: AbortSignal) => Promise<NormalizedPaper[]>;
  }> = [
    { id: 'openalex', label: 'OpenAlex', fn: searchOpenAlex },
    {
      id: 'semanticscholar',
      label: s2Key ? 'Semantic Scholar (Key)' : 'Semantic Scholar',
      fn: (q, y, sig) => searchSemanticScholar(q, y, sig, s2Key),
    },
    { id: 'pubmed', label: 'PubMed (NIH)', fn: searchPubMedEntrez },
    { id: 'europepmc', label: 'Europe PMC', fn: searchEuropePmc },
    { id: 'arxiv', label: 'arXiv (Cornell)', fn: searchArxiv },
    { id: 'crossref', label: 'Crossref DOI', fn: searchCrossref },
    { id: 'doaj', label: 'DOAJ Open Access', fn: searchDoaj },
    { id: 'zenodo', label: 'Zenodo (CERN)', fn: searchZenodo },
    { id: 'hal', label: 'HAL Science (CNRS)', fn: searchHalOpenScience },
    { id: 'datacite', label: 'DataCite Commons', fn: searchDataCite },
    { id: 'inspire', label: 'INSPIRE-HEP (CERN)', fn: searchInspireHep },
    { id: 'figshare', label: 'Figshare Data', fn: searchFigshare },
    { id: 'gbif', label: 'GBIF Biodiversity', fn: searchGbifLiterature },
    { id: 'osti', label: 'OSTI.GOV (DOE)', fn: searchOstiGov },
    { id: 'ntrs', label: 'NASA NTRS', fn: searchNasaNtrs },
    ...FREE_EXTENSION_SOURCE_RUNNERS.map((runner) =>
      runner.id === 'core'
        ? {
            id: 'core' as ApiSourceId,
            label: coreKey ? 'CORE.ac.uk (Key)' : 'CORE.ac.uk',
            fn: (q: string, y?: number, sig?: AbortSignal) => searchCore(q, y, sig, coreKey),
          }
        : runner
    ),
  ];

  const byokSources: Array<{
    id: ApiSourceId;
    label: string;
    fn: (q: string, y?: number, sig?: AbortSignal) => Promise<NormalizedPaper[]>;
  }> = [];

  const scopusKey = getActiveByokEntry(accessConfig, 'scopus');
  if (scopusKey) {
    byokSources.push({
      id: 'scopus',
      label: 'Scopus (Elsevier)',
      fn: (q, y, sig) => searchScopusByok(q, scopusKey, y, sig),
    });
  }
  const sdKey = getActiveByokEntry(accessConfig, 'sciencedirect');
  if (sdKey) {
    byokSources.push({
      id: 'sciencedirect',
      label: 'ScienceDirect (Elsevier)',
      fn: (q, y, sig) => searchScienceDirectByok(q, sdKey, y, sig),
    });
  }
  const ieeeKey = getActiveByokEntry(accessConfig, 'ieeexplore');
  if (ieeeKey) {
    byokSources.push({
      id: 'ieeexplore',
      label: 'IEEE Xplore',
      fn: (q, y, sig) => searchIeeeXploreByok(q, ieeeKey, y, sig),
    });
  }
  const springerKey = getActiveByokEntry(accessConfig, 'springer');
  if (springerKey) {
    byokSources.push({
      id: 'springer',
      label: 'Springer Nature',
      fn: (q, y, sig) => searchSpringerByok(q, springerKey, y, sig),
    });
  }
  const lensKey = getActiveByokEntry(accessConfig, 'lens');
  if (lensKey) {
    byokSources.push({
      id: 'lens',
      label: 'The Lens.org',
      fn: (q, y, sig) => searchLensByok(q, lensKey, y, sig),
    });
  }
  const fedKey = getActiveByokEntry(accessConfig, 'fedinprint');
  if (fedKey) {
    byokSources.push({
      id: 'fedinprint',
      label: 'Fed in Print (FED)',
      fn: (q, y, sig) => searchFedInPrintByok(q, fedKey, y, sig),
    });
  }
  const govKey = getActiveByokEntry(accessConfig, 'govinfo');
  if (govKey) {
    byokSources.push({
      id: 'govinfo',
      label: 'Congress.gov / GovInfo',
      fn: (q, y, sig) => searchGovInfoByok(q, govKey, y, sig),
    });
  }

  const sources = [...allFreeSources, ...byokSources].filter((s) =>
    sourceMatchesScope(s.id, scope)
  );

  const statuses: SourceFetchStatus[] = sources.map((s) => ({
    source: s.id,
    label: s.label,
    status: 'loading',
    count: 0,
  }));

  const allPapers: NormalizedPaper[] = [];
  let completedCount = 0;
  let hasEmittedFirstArticles = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const emitProgressSnapshot = () => {
    if (signal?.aborted || !onProgress) return;
    const { papers, summary } = deduplicatePapersAdvanced(allPapers);
    onProgress({
      papers,
      statuses: [...statuses],
      deduplicationSummary: summary,
      completedCount,
      totalCount: sources.length,
    });
  };

  // Emit initial loading state for all 15 sources immediately
  emitProgressSnapshot();

  const onAbortCleanup = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };
  signal?.addEventListener('abort', onAbortCleanup, { once: true });

  try {
    await Promise.allSettled(
      sources.map(async (src, idx) => {
        const t0 = performance.now();
        let addedPapers = false;
        try {
          const res = await runWithSourceAbortAndTimeout(
            (srcSignal) => src.fn(query, yearFrom, srcSignal),
            SOURCE_TIMEOUT_MS,
            src.label,
            signal
          );
          if (signal?.aborted) return;
          const latencyMs = Math.round(performance.now() - t0);
          statuses[idx] = {
            source: src.id,
            label: src.label,
            status: 'success',
            count: res.length,
            latencyMs,
          };
          if (res.length > 0) {
            const rankedRes = res.map((paper, rankIdx) => ({
              ...paper,
              title: language === 'en' && paper.title === 'Sem título' ? 'Untitled' : paper.title,
              sourceRanks: {
                ...(paper.sourceRanks ?? {}),
                [src.id]: paper.sourceRanks?.[src.id] ?? rankIdx + 1,
              },
            }));
            allPapers.push(...rankedRes);
            addedPapers = true;
          }
        } catch (err) {
          if (signal?.aborted || (err as Error)?.name === 'AbortError') return;
          const latencyMs = Math.round(performance.now() - t0);
          const diagnostic = diagnoseSourceError(src.id, src.label, err, language);
          statuses[idx] = {
            source: src.id,
            label: src.label,
            status: 'error',
            count: 0,
            latencyMs,
            errorMessage: diagnostic.errorMessage,
            errorDetail: diagnostic.errorDetail,
            rawError: diagnostic.rawError,
          };
        }

        if (signal?.aborted) return;
        completedCount += 1;

        const isFinal = completedCount === sources.length;
        const shouldFlushImmediately =
          isFinal || (addedPapers && !hasEmittedFirstArticles);

        if (addedPapers) {
          hasEmittedFirstArticles = true;
        }

        if (shouldFlushImmediately) {
          if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
          }
          emitProgressSnapshot();
        } else if (!flushTimer && onProgress) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            emitProgressSnapshot();
          }, STREAM_COALESCE_MS);
        }
      })
    );
  } finally {
    signal?.removeEventListener('abort', onAbortCleanup);
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const { papers: dedupedPapers, summary } = deduplicatePapersAdvanced(allPapers);
  const finalResult: FederatedSearchResult = {
    papers: dedupedPapers,
    statuses,
    deduplicationSummary: summary,
  };

  if (federatedSearchCache.size >= FEDERATED_CACHE_MAX) {
    const oldestKey = federatedSearchCache.keys().next().value;
    if (oldestKey) federatedSearchCache.delete(oldestKey);
  }
  federatedSearchCache.set(cacheKey, { timestamp: Date.now(), result: finalResult });

  return finalResult;
}

/**
 * Dispatches multiple URLs via the local cross-platform Node bridge (Windows/Linux/macOS)
 * so the OS opens tabs natively without browser pop-up blocking. Falls back to window.open if offline.
 */
export async function launchUrlsCrossPlatform(
  urls: string[]
): Promise<{ usedNativeBridge: boolean; launchedCount: number }> {
  const safeUrls = urls
    .map((u) => sanitizeExternalUrl(u))
    .filter((u): u is string => Boolean(u));
  if (safeUrls.length === 0) return { usedNativeBridge: false, launchedCount: 0 };

  // 1. Detecção e execução em runtime nativo Tauri Desktop
  if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      let launched = 0;
      for (let i = 0; i < safeUrls.length; i++) {
        await openUrl(safeUrls[i]);
        launched++;
        if (i < safeUrls.length - 1) {
          await new Promise((r) => setTimeout(r, 110));
        }
      }
      return { usedNativeBridge: true, launchedCount: launched };
    } catch (tauriErr) {
      console.warn('[Tauri Opener] Falha ao despachar URL pelo plugin:', tauriErr);
    }
  }

  // 2. Node.js Local Bridge (/api/launch-urls) — only attempt when running on localhost
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalHost) {
    try {
      const res = await fetch('/api/launch-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: safeUrls }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          return {
            usedNativeBridge: true,
            launchedCount: Number(data.launchedCount || safeUrls.length),
          };
        }
      }
    } catch {
      // Fallback to browser window.open if running static build without bridge
    }
  }

  // 3. Fallback Web Standard
  let opened = 0;
  safeUrls.forEach((url) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) opened++;
  });

  return {
    usedNativeBridge: false,
    launchedCount: opened,
  };
}
