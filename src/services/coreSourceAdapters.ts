import { ByokCredentialEntry, NormalizedPaper } from '../types/academic';
import { cleanDoi, fetchDedicatedSource, fetchViaByokProxy } from './httpClient';

/**
 * Adapters for the 15 original open sources (OpenAlex through NASA NTRS). Each one maps a
 * provider response to NormalizedPaper; orchestration lives in academicAggregator.ts and the
 * per-source wiring in sourceRunners.ts.
 */

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
      isRetracted: Boolean(item.is_retracted),
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

    const updateList = Array.isArray(item['update-to']) ? item['update-to'] : [];
    const retractionEntry = updateList.find(
      (u: Record<string, unknown>) =>
        String(u?.type || '').toLowerCase() === 'retraction' ||
        String(u?.label || '').toLowerCase().includes('retract')
    );

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
      isRetracted: Boolean(retractionEntry),
      retractionNoticeUrl: retractionEntry?.DOI
        ? `https://doi.org/${cleanDoi(String(retractionEntry.DOI)) || retractionEntry.DOI}`
        : null,
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
  const res = await fetchDedicatedSource('arxiv', query, 10, { signal });
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
  const res = await fetchDedicatedSource('zenodo', query, 8, {
    headers: { Accept: 'application/json' },
    signal,
  });
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
  const res = await fetchDedicatedSource('osti', query, 8, {
    headers: { Accept: 'application/json' },
    signal,
  });
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
  const res = await fetchDedicatedSource('ntrs', query, 8, {
    headers: { Accept: 'application/json' },
    signal,
  });
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
