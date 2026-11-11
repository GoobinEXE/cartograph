import { ApiSourceId, DeduplicationSummary, NormalizedPaper, SourceFetchStatus } from '../types/academic';
import { deduplicatePapersAdvanced } from '../utils/deduplication';

function cleanDoi(rawDoi?: string | null): string | null {
  if (!rawDoi) return null;
  return rawDoi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .toLowerCase();
}

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
  yearFrom?: number
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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  const yearParam = yearFrom && yearFrom > 1900 ? `&year=${yearFrom}-` : '';
  const fields =
    'title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,externalIds,abstract,url';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
    query
  )}&limit=10&fields=${fields}${yearParam}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Semantic Scholar HTTP ${res.status}`);
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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  const filterParam =
    yearFrom && yearFrom > 1900 ? `&filter=from-pub-date:${yearFrom}-01-01` : '';
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(
    query
  )}&rows=10${filterParam}`;

  const res = await fetch(url);
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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  const fullQuery =
    yearFrom && yearFrom > 1900 ? `${query} AND (FIRST_PDATE:[${yearFrom}-01-01 TO 2030-12-31])` : query;
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
    fullQuery
  )}&format=json&pageSize=10&resultType=core`;

  const res = await fetch(url);
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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  let xmlText = '';
  try {
    const proxyRes = await fetch(`/api/arxiv?q=${encodeURIComponent(query)}&max_results=10`);
    if (proxyRes.ok) {
      xmlText = await proxyRes.text();
    }
  } catch {
    // Fallback to direct arXiv HTTPS request if bridge is offline
  }

  if (!xmlText) {
    const directRes = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
        query
      )}&start=0&max_results=10&sortBy=relevance&sortOrder=descending`
    );
    if (!directRes.ok) {
      throw new Error(`arXiv HTTP ${directRes.status}`);
    }
    xmlText = await directRes.text();
  }

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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  const term =
    yearFrom && yearFrom > 1900 ? `${query} AND ${yearFrom}:2030[dp]` : query;
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
    term
  )}&retmode=json&retmax=8&sort=relevance`;

  const searchRes = await fetch(searchUrl);
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
  const summaryRes = await fetch(summaryUrl);
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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(
    query
  )}?pageSize=8`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  let data: Record<string, any> | null = null;
  try {
    const proxyRes = await fetch(`/api/zenodo?q=${encodeURIComponent(query)}&size=8`);
    if (proxyRes.ok) {
      data = await proxyRes.json();
    }
  } catch {
    // Fallback to direct Zenodo API call
  }

  if (!data) {
    const directRes = await fetch(
      `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=8`,
      { headers: { Accept: 'application/json' } }
    );
    if (!directRes.ok) {
      throw new Error(`Zenodo HTTP ${directRes.status}`);
    }
    data = await directRes.json();
  }

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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  const fqParam =
    yearFrom && yearFrom > 1900 ? `&fq=producedDateY_i:[${yearFrom}%20TO%202030]` : '';
  const url = `https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(
    query
  )}${fqParam}&wt=json&rows=8&fl=docid,title_s,authFullName_s,producedDateY_i,journalTitle_s,doiId_s,uri_s,fileMain_s,abstract_s,openAccess_bool`;

  const res = await fetch(url);
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
  yearFrom?: number
): Promise<NormalizedPaper[]> {
  const url = `https://api.datacite.org/dois?query=${encodeURIComponent(
    query
  )}&page[size]=8`;

  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.api+json' },
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

export function deduplicatePapers(papers: NormalizedPaper[]): NormalizedPaper[] {
  return deduplicatePapersAdvanced(papers).papers;
}

export async function runFederatedSearch(
  query: string,
  yearFrom?: number,
  onSourceUpdate?: (statuses: SourceFetchStatus[]) => void
): Promise<{
  papers: NormalizedPaper[];
  statuses: SourceFetchStatus[];
  deduplicationSummary: DeduplicationSummary;
}> {
  const sources: Array<{
    id: ApiSourceId;
    label: string;
    fn: (q: string, y?: number) => Promise<NormalizedPaper[]>;
  }> = [
    { id: 'openalex', label: 'OpenAlex', fn: searchOpenAlex },
    { id: 'semanticscholar', label: 'Semantic Scholar', fn: searchSemanticScholar },
    { id: 'pubmed', label: 'PubMed (NIH)', fn: searchPubMedEntrez },
    { id: 'europepmc', label: 'Europe PMC', fn: searchEuropePmc },
    { id: 'arxiv', label: 'arXiv (Cornell)', fn: searchArxiv },
    { id: 'crossref', label: 'Crossref DOI', fn: searchCrossref },
    { id: 'doaj', label: 'DOAJ Open Access', fn: searchDoaj },
    { id: 'zenodo', label: 'Zenodo (CERN)', fn: searchZenodo },
    { id: 'hal', label: 'HAL Science (CNRS)', fn: searchHalOpenScience },
    { id: 'datacite', label: 'DataCite Commons', fn: searchDataCite },
  ];

  const statuses: SourceFetchStatus[] = sources.map((s) => ({
    source: s.id,
    label: s.label,
    status: 'loading',
    count: 0,
  }));

  onSourceUpdate?.([...statuses]);

  const allPapers: NormalizedPaper[] = [];

  await Promise.allSettled(
    sources.map(async (src, idx) => {
      const t0 = performance.now();
      try {
        const res = await src.fn(query, yearFrom);
        const latencyMs = Math.round(performance.now() - t0);
        statuses[idx] = {
          source: src.id,
          label: src.label,
          status: 'success',
          count: res.length,
          latencyMs,
        };
        allPapers.push(...res);
      } catch (err) {
        const latencyMs = Math.round(performance.now() - t0);
        statuses[idx] = {
          source: src.id,
          label: src.label,
          status: 'error',
          count: 0,
          latencyMs,
          errorMessage: err instanceof Error ? err.message : 'Indisponível',
        };
      }
      onSourceUpdate?.([...statuses]);
    })
  );

  const { papers: dedupedPapers, summary } = deduplicatePapersAdvanced(allPapers);

  return {
    papers: dedupedPapers,
    statuses,
    deduplicationSummary: summary,
  };
}

/**
 * Dispatches multiple URLs via the local cross-platform Node bridge (Windows/Linux/macOS)
 * so the OS opens tabs natively without browser pop-up blocking. Falls back to window.open if offline.
 */
export async function launchUrlsCrossPlatform(
  urls: string[]
): Promise<{ usedNativeBridge: boolean; launchedCount: number }> {
  if (urls.length === 0) return { usedNativeBridge: false, launchedCount: 0 };

  // 1. Detecção e execução em runtime nativo Tauri Desktop
  if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      let launched = 0;
      for (let i = 0; i < urls.length; i++) {
        await openUrl(urls[i]);
        launched++;
        if (i < urls.length - 1) {
          await new Promise((r) => setTimeout(r, 110));
        }
      }
      return { usedNativeBridge: true, launchedCount: launched };
    } catch (tauriErr) {
      console.warn('[Tauri Opener] Falha ao despachar URL pelo plugin:', tauriErr);
    }
  }

  // 2. Node.js Local Bridge (/api/launch-urls)
  try {
    const res = await fetch('/api/launch-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok) {
        return {
          usedNativeBridge: true,
          launchedCount: Number(data.launchedCount || urls.length),
        };
      }
    }
  } catch {
    // Fallback to browser window.open if running static build without bridge
  }

  // 3. Fallback Web Standard
  let opened = 0;
  urls.forEach((url) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) opened++;
  });

  return {
    usedNativeBridge: false,
    launchedCount: opened,
  };
}
