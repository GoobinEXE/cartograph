import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCrossrefResults,
  parseDataCiteResults,
  parseDoajResults,
  parseEuropePmcResults,
  parseFigshareResults,
  parseGbifResults,
  parseHalResults,
  parseInspireResults,
  parseNtrsResults,
  parseOpenAlexResults,
  parseOstiResults,
  parsePubMedSummary,
  parseSemanticScholarResults,
  parseZenodoResults,
} from '../src/services/coreSourceAdapters.ts';
import { UNTITLED_PAPER_TITLE } from '../src/services/adapterUtils.ts';
import type { NormalizedPaper } from '../src/types/academic.ts';

type Parser = (data: unknown) => NormalizedPaper[];

const EMPTY_INPUTS: readonly unknown[] = [{}, null, undefined, 'x', 42, [], [null, 'x', 7]];

/** Invariants every parser output must satisfy, whatever the upstream sent. */
function assertPaperShape(paper: NormalizedPaper): void {
  assert.equal(typeof paper.id, 'string');
  assert.ok(paper.id.length > 0);
  assert.equal(typeof paper.title, 'string');
  assert.ok(paper.title.length > 0);
  assert.ok(Array.isArray(paper.authors));
  for (const author of paper.authors) assert.equal(typeof author, 'string');
  assert.ok(paper.year === null || typeof paper.year === 'number');
  assert.equal(typeof paper.venue, 'string');
  assert.ok(paper.doi === null || typeof paper.doi === 'string');
  assert.equal(typeof paper.url, 'string');
  assert.ok(paper.pdfUrl === null || typeof paper.pdfUrl === 'string');
  assert.equal(typeof paper.isOpenAccess, 'boolean');
  assert.ok(Number.isFinite(paper.citationCount) && paper.citationCount >= 0);
  assert.ok(paper.abstractText === null || typeof paper.abstractText === 'string');
}

/** `{}`, `null` and other non-payloads yield []; wrong-typed fields yield well-formed papers. */
function assertRobust(parse: Parser, wrongTyped: unknown, expectedLength = 1): NormalizedPaper[] {
  for (const input of EMPTY_INPUTS) {
    assert.deepEqual(parse(input), [], `input ${JSON.stringify(input)} should map to []`);
  }
  const papers = parse(wrongTyped);
  assert.equal(papers.length, expectedLength);
  papers.forEach(assertPaperShape);
  return papers;
}

function ids(papers: NormalizedPaper[]): string[] {
  return papers.map((p) => p.id);
}

// --- OpenAlex ---------------------------------------------------------------

test('parseOpenAlexResults maps a work record', () => {
  const [paper] = parseOpenAlexResults({
    results: [
      {
        id: 'https://openalex.org/W2741809807',
        doi: 'https://doi.org/10.7717/PEERJ.4375',
        display_name: 'The state of OA',
        publication_year: 2018,
        authorships: [{ author: { display_name: 'Heather Piwowar' } }, { author: { display_name: 'Jason Priem' } }],
        primary_location: {
          landing_page_url: 'https://peerj.com/articles/4375',
          pdf_url: null,
          source: { display_name: 'PeerJ' },
        },
        open_access: { is_oa: true, oa_url: 'https://peerj.com/articles/4375.pdf' },
        cited_by_count: 1234,
        abstract_inverted_index: { interest: [2], Despite: [0], growing: [1] },
        type: 'article',
        is_retracted: false,
      },
    ],
  });
  assert.equal(paper.id, 'openalex-https://openalex.org/W2741809807');
  assert.equal(paper.title, 'The state of OA');
  assert.deepEqual(paper.authors, ['Heather Piwowar', 'Jason Priem']);
  assert.equal(paper.year, 2018);
  assert.equal(paper.venue, 'PeerJ');
  assert.equal(paper.doi, '10.7717/peerj.4375');
  assert.equal(paper.url, 'https://peerj.com/articles/4375');
  assert.equal(paper.pdfUrl, 'https://peerj.com/articles/4375.pdf');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 1234);
  assert.equal(paper.abstractText, 'Despite growing interest');
  assert.equal(paper.source, 'openalex');
  assert.equal(paper.isRetracted, false);
});

test('parseOpenAlexResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseOpenAlexResults, {
    results: [{ title: 42, display_name: null, authorships: 'x', cited_by_count: 'many', open_access: 'yes' }],
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.citationCount, 0);
  assert.equal(paper.doi, null);
  assert.equal(paper.url, 'https://openalex.org');
});

// --- Semantic Scholar -------------------------------------------------------

test('parseSemanticScholarResults maps a paper record', () => {
  const [paper] = parseSemanticScholarResults({
    data: [
      {
        paperId: '649def34f8be52c8b66281af98ae884c09aef38b',
        title: 'Construction of the Literature Graph in Semantic Scholar',
        authors: [{ authorId: '1741101', name: 'Waleed Ammar' }, { name: 'Dirk Groeneveld' }],
        year: 2018,
        venue: 'NAACL',
        externalIds: { DOI: '10.18653/V1/N18-3011' },
        url: 'https://www.semanticscholar.org/paper/649def34f8be52c8b66281af98ae884c09aef38b',
        openAccessPdf: { url: 'https://aclanthology.org/N18-3011.pdf' },
        isOpenAccess: true,
        citationCount: 412,
        abstract: 'We describe a deployed scalable system.',
      },
    ],
  });
  assert.equal(paper.id, 's2-649def34f8be52c8b66281af98ae884c09aef38b');
  assert.equal(paper.title, 'Construction of the Literature Graph in Semantic Scholar');
  assert.deepEqual(paper.authors, ['Waleed Ammar', 'Dirk Groeneveld']);
  assert.equal(paper.year, 2018);
  assert.equal(paper.venue, 'NAACL');
  assert.equal(paper.doi, '10.18653/v1/n18-3011');
  assert.equal(paper.url, 'https://www.semanticscholar.org/paper/649def34f8be52c8b66281af98ae884c09aef38b');
  assert.equal(paper.pdfUrl, 'https://aclanthology.org/N18-3011.pdf');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 412);
  assert.equal(paper.abstractText, 'We describe a deployed scalable system.');
});

test('parseSemanticScholarResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseSemanticScholarResults, {
    data: [{ title: 42, authors: 'x', year: 'soon', externalIds: 'none', citationCount: -5 }],
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, null);
  assert.equal(paper.citationCount, 0);
  assert.equal(paper.url, 'https://www.semanticscholar.org');
});

// --- Crossref ---------------------------------------------------------------

test('parseCrossrefResults maps works, PDF links and retraction notices', () => {
  const papers = parseCrossrefResults({
    message: {
      items: [
        {
          DOI: '10.1038/S41586-020-2649-2',
          title: ['Array programming with NumPy'],
          author: [
            { given: 'Charles R.', family: 'Harris' },
            { given: 'K. Jarrod', family: 'Millman' },
          ],
          published: { 'date-parts': [[2020, 9, 16]] },
          'container-title': ['Nature'],
          publisher: 'Springer Science and Business Media LLC',
          URL: 'https://doi.org/10.1038/s41586-020-2649-2',
          link: [
            { URL: 'https://www.nature.com/articles/s41586-020-2649-2.pdf', 'content-type': 'application/pdf' },
          ],
          'is-referenced-by-count': 9000,
          abstract: '<jats:p>Array programming provides a powerful syntax.</jats:p>',
          type: 'journal-article',
        },
        {
          title: ['Retracted trial'],
          issued: { 'date-parts': [[2015]] },
          publisher: 'Elsevier',
          'update-to': [{ type: 'retraction', label: 'Retraction', DOI: '10.1000/RETRACT.1' }],
        },
      ],
    },
  });
  assert.equal(papers.length, 2);
  const [numpy, retracted] = papers;
  assert.equal(numpy.id, 'crossref-10.1038/s41586-020-2649-2');
  assert.equal(numpy.title, 'Array programming with NumPy');
  assert.deepEqual(numpy.authors, ['Charles R. Harris', 'K. Jarrod Millman']);
  assert.equal(numpy.year, 2020);
  assert.equal(numpy.venue, 'Nature');
  assert.equal(numpy.doi, '10.1038/s41586-020-2649-2');
  assert.equal(numpy.url, 'https://doi.org/10.1038/s41586-020-2649-2');
  assert.equal(numpy.pdfUrl, 'https://www.nature.com/articles/s41586-020-2649-2.pdf');
  assert.equal(numpy.isOpenAccess, true);
  assert.equal(numpy.citationCount, 9000);
  assert.equal(numpy.abstractText, 'Array programming provides a powerful syntax.');
  assert.equal(numpy.isRetracted, false);
  assert.equal(numpy.retractionNoticeUrl, null);

  assert.equal(retracted.id, 'crossref-1');
  assert.equal(retracted.year, 2015);
  assert.equal(retracted.venue, 'Elsevier');
  assert.equal(retracted.doi, null);
  assert.equal(retracted.url, 'https://search.crossref.org');
  assert.equal(retracted.pdfUrl, null);
  assert.equal(retracted.isOpenAccess, false);
  assert.equal(retracted.isRetracted, true);
  assert.equal(retracted.retractionNoticeUrl, 'https://doi.org/10.1000/retract.1');
});

test('parseCrossrefResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseCrossrefResults, {
    message: {
      items: [{ title: 42, author: 'x', published: { 'date-parts': 'bad' }, link: {}, 'update-to': 'y' }],
    },
  });
  assert.equal(paper.title, UNTITLED_PAPER_TITLE);
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, null);
  assert.equal(paper.isRetracted, false);
});

// --- Europe PMC -------------------------------------------------------------

test('parseEuropePmcResults maps a core result', () => {
  const [paper] = parseEuropePmcResults({
    resultList: {
      result: [
        {
          id: '33301246',
          pmid: '33301246',
          pmcid: 'PMC7745181',
          doi: '10.1056/NEJMOA2034577',
          title: 'Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine.',
          authorString: 'Polack FP, Thomas SJ, Kitchin N.',
          pubYear: '2020',
          journalTitle: 'N Engl J Med',
          isOpenAccess: 'Y',
          citedByCount: 8000,
          abstractText: 'Background: a vaccine trial.',
        },
      ],
    },
  });
  assert.equal(paper.id, 'epmc-33301246');
  assert.equal(paper.title, 'Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine.');
  assert.deepEqual(paper.authors, ['Polack FP', 'Thomas SJ', 'Kitchin N.']);
  assert.equal(paper.year, 2020);
  assert.equal(paper.venue, 'N Engl J Med');
  assert.equal(paper.doi, '10.1056/nejmoa2034577');
  assert.equal(paper.url, 'https://pubmed.ncbi.nlm.nih.gov/33301246/');
  assert.equal(paper.pdfUrl, 'https://europepmc.org/backend/ptpmcrender.fcgi?accid=PMC7745181&blobtype=pdf');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 8000);
  assert.equal(paper.abstractText, 'Background: a vaccine trial.');
});

test('parseEuropePmcResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseEuropePmcResults, {
    resultList: { result: [{ title: 42, authorString: ['x'], pubYear: 'n/a', citedByCount: null }] },
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, null);
  assert.equal(paper.url, 'https://europepmc.org');
  assert.equal(paper.isOpenAccess, false);
});

// --- PubMed -----------------------------------------------------------------

test('parsePubMedSummary maps esummary documents in idList order and skips missing ids', () => {
  const papers = parsePubMedSummary(['31452104', '99999999'], {
    result: {
      uids: ['31452104'],
      '31452104': {
        uid: '31452104',
        pubdate: '2019 Aug 26',
        source: 'Nat Med',
        fulljournalname: 'Nature medicine',
        title: 'A deep learning model for retinal disease.',
        authors: [{ name: 'Smith J', authtype: 'Author' }, { name: 'Doe A' }],
        articleids: [
          { idtype: 'pubmed', value: '31452104' },
          { idtype: 'doi', value: '10.1038/S41591-019-0548-6' },
          { idtype: 'pmc', value: 'PMC6800000' },
        ],
      },
    },
  });
  assert.equal(papers.length, 1);
  const [paper] = papers;
  assert.equal(paper.id, 'pubmed-31452104');
  assert.equal(paper.title, 'A deep learning model for retinal disease');
  assert.deepEqual(paper.authors, ['Smith J', 'Doe A']);
  assert.equal(paper.year, 2019);
  assert.equal(paper.venue, 'Nature medicine');
  assert.equal(paper.doi, '10.1038/s41591-019-0548-6');
  assert.equal(paper.url, 'https://pubmed.ncbi.nlm.nih.gov/31452104/');
  assert.equal(paper.pdfUrl, 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6800000/pdf/');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
});

test('parsePubMedSummary tolerates malformed payloads', () => {
  const [paper] = assertRobust((data) => parsePubMedSummary(['1'], data), {
    result: { '1': { title: 42, authors: 'x', articleids: 'y', pubdate: 2019 } },
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, 2019);
  assert.equal(paper.doi, null);
  assert.equal(paper.isOpenAccess, false);
});

// --- DOAJ -------------------------------------------------------------------

const DOAJ_FIXTURE = {
  results: [
    {
      id: 'b3f1c0',
      bibjson: {
        title: 'Open peer review: a systematic review',
        year: '2017',
        author: [{ name: 'Tony Ross-Hellauer' }],
        journal: { title: 'F1000Research' },
        identifier: [
          { type: 'eissn', id: '2046-1402' },
          { type: 'doi', id: '10.12688/F1000RESEARCH.11369.2' },
        ],
        link: [{ type: 'fulltext', url: 'https://f1000research.com/articles/6-588/pdf' }],
        abstract: 'Open peer review is an umbrella term.',
      },
    },
    { id: 'old', bibjson: { title: 'Old paper', year: '2005' } },
    { id: 'undated', bibjson: { title: 'Undated paper' } },
  ],
};

test('parseDoajResults maps bibjson records', () => {
  const papers = parseDoajResults(DOAJ_FIXTURE);
  assert.equal(papers.length, 3);
  const [paper] = papers;
  assert.equal(paper.id, 'doaj-b3f1c0');
  assert.equal(paper.title, 'Open peer review: a systematic review');
  assert.deepEqual(paper.authors, ['Tony Ross-Hellauer']);
  assert.equal(paper.year, 2017);
  assert.equal(paper.venue, 'F1000Research');
  assert.equal(paper.doi, '10.12688/f1000research.11369.2');
  assert.equal(paper.url, 'https://f1000research.com/articles/6-588/pdf');
  assert.equal(paper.pdfUrl, 'https://f1000research.com/articles/6-588/pdf');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
});

test('parseDoajResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseDoajResults(DOAJ_FIXTURE, 2010)), ['doaj-b3f1c0', 'doaj-undated']);
});

test('parseDoajResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseDoajResults, {
    results: [{ bibjson: { title: 42, author: 'x', identifier: 'y', link: 7, year: 'n/a' } }],
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.doi, null);
  assert.equal(paper.url, 'https://doaj.org');
});

// --- Zenodo -----------------------------------------------------------------

const ZENODO_FIXTURE = {
  hits: {
    hits: [
      {
        id: 1234567,
        doi: '10.5281/ZENODO.1234567',
        metadata: {
          title: 'Replication dataset',
          creators: [{ name: 'Doe, Jane' }, { name: 'Roe, Richard' }],
          publication_date: '2022-03-01',
          access_right: 'open',
          description: '<p>Data for <b>replication</b>.</p>',
          resource_type: { type: 'dataset' },
        },
        links: { self_html: 'https://zenodo.org/records/1234567' },
        files: [{ links: { self: 'https://zenodo.org/records/1234567/files/data.pdf' } }],
      },
      { id: 2, metadata: { title: 'Old upload', publication_date: '2001-01-01' } },
      { id: 3, metadata: { title: 'Undated upload' } },
    ],
  },
};

test('parseZenodoResults maps record hits', () => {
  const [paper] = parseZenodoResults(ZENODO_FIXTURE);
  assert.equal(paper.id, 'zenodo-1234567');
  assert.equal(paper.title, 'Replication dataset');
  assert.deepEqual(paper.authors, ['Doe, Jane', 'Roe, Richard']);
  assert.equal(paper.year, 2022);
  assert.equal(paper.doi, '10.5281/zenodo.1234567');
  assert.equal(paper.url, 'https://zenodo.org/records/1234567');
  assert.equal(paper.pdfUrl, 'https://zenodo.org/records/1234567/files/data.pdf');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
  assert.equal(paper.abstractText, 'Data for replication.');
  assert.equal(paper.publicationType, 'dataset');
});

test('parseZenodoResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseZenodoResults(ZENODO_FIXTURE, 2010)), ['zenodo-1234567', 'zenodo-3']);
});

test('parseZenodoResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseZenodoResults, {
    hits: { hits: [{ metadata: { title: 42, creators: 'x', publication_date: 5 }, files: 'y', links: [] }] },
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.pdfUrl, null);
  assert.equal(paper.url, 'https://zenodo.org');
});

// --- HAL --------------------------------------------------------------------

test('parseHalResults maps Solr documents', () => {
  const [paper] = parseHalResults({
    response: {
      docs: [
        {
          docid: 4567890,
          title_s: ['Apprentissage profond pour la vision'],
          authFullName_s: ['Marie Curie', 'Pierre Curie'],
          producedDateY_i: 2020,
          journalTitle_s: 'Revue Française de Physique',
          doiId_s: '10.1000/HAL.123',
          uri_s: 'https://hal.science/hal-04567890',
          fileMain_s: 'https://hal.science/hal-04567890/document',
          abstract_s: ['Nous proposons une méthode.'],
          openAccess_bool: true,
        },
      ],
    },
  });
  assert.equal(paper.id, 'hal-4567890');
  assert.equal(paper.title, 'Apprentissage profond pour la vision');
  assert.deepEqual(paper.authors, ['Marie Curie', 'Pierre Curie']);
  assert.equal(paper.year, 2020);
  assert.equal(paper.venue, 'Revue Française de Physique');
  assert.equal(paper.doi, '10.1000/hal.123');
  assert.equal(paper.url, 'https://hal.science/hal-04567890');
  assert.equal(paper.pdfUrl, 'https://hal.science/hal-04567890/document');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
  assert.equal(paper.abstractText, 'Nous proposons une méthode.');
});

test('parseHalResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseHalResults, {
    response: { docs: [{ title_s: 42, authFullName_s: 'x', producedDateY_i: 'n/a', abstract_s: {} }] },
  });
  assert.equal(paper.title, UNTITLED_PAPER_TITLE);
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, null);
  assert.equal(paper.url, 'https://hal.science');
});

// --- DataCite ---------------------------------------------------------------

const DATACITE_FIXTURE = {
  data: [
    {
      id: '10.5061/dryad.abc',
      attributes: {
        doi: '10.5061/DRYAD.ABC',
        titles: [{ title: 'Field survey data' }],
        creators: [{ name: 'Ecology Lab' }, { givenName: 'Ana', familyName: 'Silva' }],
        publicationYear: 2019,
        publisher: 'Dryad',
        url: 'https://datadryad.org/stash/dataset/doi:10.5061/dryad.abc',
        citationCount: 7,
        descriptions: [{ description: 'Survey data.' }],
      },
    },
    { attributes: { doi: '10.1000/old', titles: [{ title: 'Old' }], publicationYear: 1999 } },
    { attributes: { titles: [{ title: 'Undated' }] } },
  ],
};

test('parseDataCiteResults maps DOI records', () => {
  const [paper] = parseDataCiteResults(DATACITE_FIXTURE);
  assert.equal(paper.id, 'datacite-10.5061/dryad.abc');
  assert.equal(paper.title, 'Field survey data');
  assert.deepEqual(paper.authors, ['Ecology Lab', 'Ana Silva']);
  assert.equal(paper.year, 2019);
  assert.equal(paper.venue, 'Dryad');
  assert.equal(paper.doi, '10.5061/dryad.abc');
  assert.equal(paper.url, 'https://datadryad.org/stash/dataset/doi:10.5061/dryad.abc');
  assert.equal(paper.pdfUrl, null);
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 7);
  assert.equal(paper.abstractText, 'Survey data.');
});

test('parseDataCiteResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseDataCiteResults(DATACITE_FIXTURE, 2010)), ['datacite-10.5061/dryad.abc', 'datacite-2']);
});

test('parseDataCiteResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseDataCiteResults, {
    data: [{ attributes: { titles: 'x', creators: 42, publicationYear: 'soon', citationCount: 'many' } }],
  });
  assert.equal(paper.title, UNTITLED_PAPER_TITLE);
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, null);
  assert.equal(paper.citationCount, 0);
});

// --- INSPIRE-HEP ------------------------------------------------------------

const INSPIRE_FIXTURE = {
  hits: {
    hits: [
      {
        id: '1648958',
        metadata: {
          control_number: 1648958,
          titles: [{ title: 'Quantum Computing in the NISQ era and beyond' }],
          authors: [{ full_name: 'Preskill, John' }, { first_name: 'Alexei', last_name: 'Kitaev' }],
          earliest_date: '2018-01-02',
          publication_info: [{ journal_title: 'Quantum' }],
          dois: [{ value: '10.22331/Q-2018-08-06-79' }],
          arxiv_eprints: [{ value: '1801.00862' }],
          citation_count: 3000,
          abstracts: [{ value: 'Noisy Intermediate-Scale Quantum technology.' }],
        },
      },
      { id: '5', metadata: { titles: [{ title: 'Old' }], earliest_date: '1995' } },
      { id: '6', metadata: { titles: [{ title: 'Undated' }] } },
    ],
  },
};

test('parseInspireResults maps literature hits', () => {
  const [paper] = parseInspireResults(INSPIRE_FIXTURE);
  assert.equal(paper.id, 'inspire-1648958');
  assert.equal(paper.title, 'Quantum Computing in the NISQ era and beyond');
  assert.deepEqual(paper.authors, ['Preskill, John', 'Alexei Kitaev']);
  assert.equal(paper.year, 2018);
  assert.equal(paper.venue, 'Quantum');
  assert.equal(paper.doi, '10.22331/q-2018-08-06-79');
  assert.equal(paper.url, 'https://inspirehep.net/literature/1648958');
  assert.equal(paper.pdfUrl, 'https://arxiv.org/pdf/1801.00862.pdf');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 3000);
});

test('parseInspireResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseInspireResults(INSPIRE_FIXTURE, 2010)), ['inspire-1648958', 'inspire-6']);
});

test('parseInspireResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseInspireResults, {
    hits: { hits: [{ metadata: { titles: 42, authors: 'x', dois: {}, arxiv_eprints: 'y', citation_count: -1 } }] },
  });
  assert.equal(paper.title, UNTITLED_PAPER_TITLE);
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.id, 'inspire-0');
  assert.equal(paper.pdfUrl, null);
  assert.equal(paper.citationCount, 0);
});

// --- Figshare ---------------------------------------------------------------

const FIGSHARE_FIXTURE = [
  {
    id: 9876543,
    title: 'Supplementary <i>tables</i>',
    doi: '10.6084/M9.FIGSHARE.9876543.V1',
    published_date: '2021-05-04T10:00:00Z',
    url_public_html: 'https://figshare.com/articles/dataset/tables/9876543',
    defined_type_name: 'dataset',
    resource_title: 'Main article',
  },
  { id: 2, title: 'Old', published_date: '2003-01-01T00:00:00Z' },
  { id: 3, title: 'Undated' },
];

test('parseFigshareResults maps article search results', () => {
  const [paper] = parseFigshareResults(FIGSHARE_FIXTURE);
  assert.equal(paper.id, 'figshare-9876543');
  assert.equal(paper.title, 'Supplementary tables');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, 2021);
  assert.equal(paper.venue, 'Figshare (dataset)');
  assert.equal(paper.doi, '10.6084/m9.figshare.9876543.v1');
  assert.equal(paper.url, 'https://figshare.com/articles/dataset/tables/9876543');
  assert.equal(paper.pdfUrl, null);
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
  assert.equal(paper.abstractText, 'Recurso associado: Main article');
});

test('parseFigshareResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseFigshareResults(FIGSHARE_FIXTURE, 2010)), ['figshare-9876543', 'figshare-3']);
});

test('parseFigshareResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseFigshareResults, [{ title: 42, published_date: {}, doi: ['10.1/x'] }]);
  assert.equal(paper.title, '42');
  assert.equal(paper.year, null);
  assert.equal(paper.doi, null);
  assert.equal(paper.url, 'https://figshare.com');
});

// --- GBIF -------------------------------------------------------------------

const GBIF_QUERY = 'species distribution';
const GBIF_FIXTURE = {
  results: [
    {
      id: 'a1b2',
      title: 'Species distribution models under climate change',
      authors: [{ firstName: 'Ana', lastName: 'Lima' }, 'Carlos Souza'],
      year: 2022,
      source: 'Ecography',
      identifiers: { doi: '10.1111/ECOG.06000' },
      websites: ['https://onlinelibrary.wiley.com/doi/10.1111/ecog.06000'],
      openAccess: true,
      abstract: 'We compare SDM algorithms.',
      literatureType: 'JOURNAL',
    },
    { title: 'Old survey', year: 2000 },
    { title: 'Undated survey' },
  ],
};

test('parseGbifResults maps literature records', () => {
  const papers = parseGbifResults(GBIF_FIXTURE, GBIF_QUERY);
  const [paper] = papers;
  assert.equal(paper.id, 'gbif-a1b2');
  assert.equal(paper.title, 'Species distribution models under climate change');
  assert.deepEqual(paper.authors, ['Ana Lima', 'Carlos Souza']);
  assert.equal(paper.year, 2022);
  assert.equal(paper.venue, 'Ecography');
  assert.equal(paper.doi, '10.1111/ecog.06000');
  assert.equal(paper.url, 'https://onlinelibrary.wiley.com/doi/10.1111/ecog.06000');
  assert.equal(paper.pdfUrl, null);
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
  assert.equal(
    papers[2].url,
    'https://www.gbif.org/resource/search?contentType=literature&q=species%20distribution'
  );
});

test('parseGbifResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseGbifResults(GBIF_FIXTURE, GBIF_QUERY, 2010)), ['gbif-a1b2', 'gbif-2']);
});

test('parseGbifResults tolerates malformed payloads', () => {
  const [paper] = assertRobust((data) => parseGbifResults(data, GBIF_QUERY), {
    results: [{ title: 42, authors: 'x', identifiers: 'y', websites: {}, year: 'n/a' }],
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.year, null);
  assert.equal(paper.isOpenAccess, false);
});

// --- OSTI.GOV ---------------------------------------------------------------

const OSTI_FIXTURE = [
  {
    osti_id: '1890123',
    title: 'Grid-scale storage assessment',
    authors: ['Smith, A.', 'Jones, B.'],
    publication_date: '2022-10-01T00:00:00Z',
    research_orgs: ['National Renewable Energy Laboratory (NREL)'],
    doi: '10.2172/1890123',
    links: [
      { rel: 'citation', href: 'https://www.osti.gov/biblio/1890123' },
      { rel: 'fulltext', href: 'https://www.osti.gov/servlets/purl/1890123' },
    ],
    description: 'Technical assessment.',
    product_type: 'Technical Report',
  },
  { osti_id: '2', title: 'Old report', publication_date: '1998-01-01T00:00:00Z' },
  { osti_id: '3', title: 'Undated report' },
];

test('parseOstiResults maps records', () => {
  const [paper] = parseOstiResults(OSTI_FIXTURE);
  assert.equal(paper.id, 'osti-1890123');
  assert.equal(paper.title, 'Grid-scale storage assessment');
  assert.deepEqual(paper.authors, ['Smith, A.', 'Jones, B.']);
  assert.equal(paper.year, 2022);
  assert.equal(paper.venue, 'National Renewable Energy Laboratory (NREL)');
  assert.equal(paper.doi, '10.2172/1890123');
  assert.equal(paper.url, 'https://www.osti.gov/biblio/1890123');
  assert.equal(paper.pdfUrl, 'https://www.osti.gov/servlets/purl/1890123');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
  assert.equal(paper.publicationType, 'Technical Report');
});

test('parseOstiResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseOstiResults(OSTI_FIXTURE, 2010)), ['osti-1890123', 'osti-3']);
});

test('parseOstiResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseOstiResults, [{ title: 42, authors: 'x', links: 'y', research_orgs: {} }]);
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.id, 'osti-0');
  assert.equal(paper.pdfUrl, null);
});

// --- NASA NTRS --------------------------------------------------------------

const NTRS_FIXTURE = {
  results: [
    {
      id: 20230001234,
      title: 'Lunar regolith excavation',
      authorAffiliations: [{ meta: { author: { name: 'Neil Armstrong' } } }],
      distributionDate: '2023-02-15T00:00:00.0000000+00:00',
      center: { name: 'Johnson Space Center' },
      publications: [{ doi: '10.2514/6.2023-0001', publicationDate: '2023-01-01' }],
      downloads: [{ links: { pdf: '/api/citations/20230001234/downloads/paper.pdf' } }],
      abstract: 'Regolith handling.',
      stiType: 'CONFERENCE_PAPER',
    },
    { id: 2, title: 'Old memo', distributionDate: '1970-01-01T00:00:00Z' },
    { id: 3, title: 'Undated memo' },
  ],
};

test('parseNtrsResults maps citation records', () => {
  const [paper] = parseNtrsResults(NTRS_FIXTURE);
  assert.equal(paper.id, 'ntrs-20230001234');
  assert.equal(paper.title, 'Lunar regolith excavation');
  assert.deepEqual(paper.authors, ['Neil Armstrong']);
  assert.equal(paper.year, 2023);
  assert.equal(paper.venue, 'Johnson Space Center');
  assert.equal(paper.doi, '10.2514/6.2023-0001');
  assert.equal(paper.url, 'https://ntrs.nasa.gov/citations/20230001234');
  assert.equal(paper.pdfUrl, 'https://ntrs.nasa.gov/api/citations/20230001234/downloads/paper.pdf');
  assert.equal(paper.isOpenAccess, true);
  assert.equal(paper.citationCount, 0);
});

test('parseNtrsResults drops records older than yearFrom and keeps undated ones', () => {
  assert.deepEqual(ids(parseNtrsResults(NTRS_FIXTURE, 2010)), ['ntrs-20230001234', 'ntrs-3']);
});

test('parseNtrsResults tolerates malformed payloads', () => {
  const [paper] = assertRobust(parseNtrsResults, {
    results: [{ title: 42, authorAffiliations: 'x', publications: {}, downloads: 'y', center: [] }],
  });
  assert.equal(paper.title, '42');
  assert.deepEqual(paper.authors, []);
  assert.equal(paper.pdfUrl, null);
  assert.equal(paper.venue, 'NASA Technical Reports Server');
});
