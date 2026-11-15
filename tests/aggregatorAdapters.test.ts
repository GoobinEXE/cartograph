import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCoreResults,
  parseDataverseResults,
  parseDspace7Results,
  parseElsevierResults,
  parseEricResults,
  parseFedInPrintResults,
  parseGovInfoResults,
  parseIeeeXploreResults,
  parseLensResults,
  parseOasisbrResults,
  parseOpenAireResults,
  parseOsfPreprintsResults,
  parsePlosResults,
  parseSpringerResults,
  parseUndlResults,
  parseWorldBankWdsResults,
} from '../src/services/sourceAdapters.ts';

test('Phase 1 General API normalizers extract normalized paper metadata safely', () => {
  const openaire = parseOpenAireResults({
    results: [
      {
        id: 'oa-1',
        mainTitle: 'Open Science Graphs at Scale',
        publicationDate: '2024-03-10',
        authors: [{ fullName: 'Paolo Manghi' }],
        descriptions: ['We analyze scholarly graph infrastructures.'],
        pids: [{ scheme: 'doi', value: 'https://doi.org/10.1007/oa-graph' }],
        bestAccessRight: { code: 'OPEN' },
        instances: [{ urls: ['https://explore.openaire.eu/item/oa-1'], license: 'CC-BY' }],
      },
    ],
  });
  assert.equal(openaire.length, 1);
  assert.equal(openaire[0].doi, '10.1007/oa-graph');
  assert.equal(openaire[0].year, 2024);

  const osf = parseOsfPreprintsResults(
    {
      data: [
        {
          id: 'abc99',
          attributes: {
            title: 'Replication in Social Policy',
            description: 'Pre-registered analysis.',
            date_published: '2023-06-01T00:00:00Z',
            doi: '10.31235/osf.io/abc99',
          },
          links: { html: 'https://osf.io/preprints/socarxiv/abc99' },
        },
      ],
    },
    'socarxiv',
    'SocArXiv (OSF)'
  );
  assert.equal(osf.length, 1);
  assert.equal(osf[0].source, 'socarxiv');
  assert.equal(osf[0].doi, '10.31235/osf.io/abc99');

  const eric = parseEricResults({
    response: {
      docs: [
        {
          id: 'ED654321',
          title: 'Voucher Effects in Public Schools',
          author: ['Jane Doe', 'John Smith'],
          publicationdateyear: 2022,
          source: 'Education Policy Analysis',
          description: 'Quasi-experimental study.',
          e_fulltextauth: 1,
          url: 'https://eric.ed.gov/?id=ED654321',
        },
      ],
    },
  });
  assert.equal(eric.length, 1);
  assert.equal(eric[0].isOpenAccess, true);
  assert.equal(eric[0].year, 2022);

  const plos = parsePlosResults({
    response: {
      docs: [
        {
          id: '10.1371/journal.pone.00001',
          title_display: 'Epidemic Modeling on Urban Networks',
          author_display: ['Alice Brown'],
          publication_date: '2025-01-12T00:00:00Z',
          journal: 'PLOS ONE',
          abstract: ['Agent-based urban simulation.'],
        },
      ],
    },
  });
  assert.equal(plos.length, 1);
  assert.equal(plos[0].doi, '10.1371/journal.pone.00001');
  assert.ok(plos[0].pdfUrl?.includes('printable'));

  const oasisbr = parseOasisbrResults({
    records: [
      {
        id: 'oai-1',
        title: 'Política Fiscal no Brasil',
        authors: { primary: { 'Silva, João': {} } },
        publicationDates: ['2021'],
        urls: [{ url: 'https://repositorio.example.br/1' }],
      },
    ],
  });
  assert.equal(oasisbr.length, 1);
  assert.equal(oasisbr[0].authors[0], 'Silva, João');

  const dataverse = parseDataverseResults({
    data: {
      items: [
        {
          global_id: 'doi:10.7910/DVN/TEST1',
          name: 'Replication Data for Inflation Targeting',
          authors: ['Central Bank Team'],
          published_at: '2024-09-01T00:00:00Z',
          description: 'Panel dataset 1995-2023.',
          url: 'https://doi.org/10.7910/DVN/TEST1',
        },
      ],
    },
  });
  assert.equal(dataverse.length, 1);
  assert.equal(dataverse[0].doi, '10.7910/dvn/test1');

  const core = parseCoreResults({
    results: [
      {
        id: 777,
        title: 'University Institutional Repositories',
        authors: [{ name: 'Petr Knoth' }],
        yearPublished: 2023,
        doi: '10.1000/core777',
        downloadUrl: 'https://core.ac.uk/download/777.pdf',
      },
    ],
  });
  assert.equal(core.length, 1);
  assert.equal(core[0].pdfUrl, 'https://core.ac.uk/download/777.pdf');
});

test('Phase 1 Economics & Policy normalizers parse World Bank, DSpace 7, and UNDL payloads', () => {
  const wbWds = parseWorldBankWdsResults({
    documents: {
      facets: { facet: 'skip' },
      D12345: {
        id: '12345',
        display_title: 'Cash Transfers and Labor Supply',
        authors: { '0': { author: 'World Bank Staff' } },
        docdt: '2024-02-20T00:00:00Z',
        docty: 'Policy Research Working Paper',
        pdfurl: 'https://documents1.worldbank.org/curated/en/12345.pdf',
        url: 'https://documents.worldbank.org/en/publication/12345',
      },
    },
  });
  assert.equal(wbWds.length, 1);
  assert.equal(wbWds[0].authors[0], 'World Bank Staff');
  assert.equal(wbWds[0].pdfUrl, 'https://documents1.worldbank.org/curated/en/12345.pdf');

  const ipea = parseDspace7Results(
    {
      _embedded: {
        searchResult: {
          _embedded: {
            objects: [
              {
                _embedded: {
                  indexableObject: {
                    uuid: 'u-ipea-1',
                    metadata: {
                      'dc.title': [{ value: 'Mercado de Trabalho e Previdência' }],
                      'dc.contributor.author': [{ value: 'Corseuil, Carlos' }],
                      'dc.date.issued': [{ value: '2023-08' }],
                      'dc.identifier.uri': [{ value: 'https://repositorio.ipea.gov.br/handle/11058/1' }],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
    'https://repositorio.ipea.gov.br',
    'ipea',
    'IPEA (RCIpea)'
  );
  assert.equal(ipea.length, 1);
  assert.equal(ipea[0].year, 2023);
  assert.equal(ipea[0].source, 'ipea');

  const undl = parseUndlResults([
    {
      recid: 4001,
      title: { title: 'World Economic Situation and Prospects 2025' },
      corporate_name: { name: 'UN Department of Economic and Social Affairs' },
      imprint: { date: '2025-01-01' },
      files: [
        {
          eformat: '.pdf',
          description: 'English',
          url: 'https://digitallibrary.un.org/record/4001/files/wesp2025.pdf',
        },
      ],
    },
  ]);
  assert.equal(undl.length, 1);
  assert.equal(undl[0].year, 2025);
  assert.ok(undl[0].pdfUrl?.endsWith('wesp2025.pdf'));
});

test('Phase 3 BYOK normalizers parse Elsevier, IEEE, Springer, Lens, Fed in Print, and GovInfo', () => {
  const scopus = parseElsevierResults(
    {
      'search-results': {
        entry: [
          {
            'dc:identifier': 'SCOPUS_ID:851',
            'dc:title': 'Monetary Transmission in Emerging Markets',
            'dc:creator': 'Silva, L.',
            'prism:publicationName': 'Journal of Monetary Economics',
            'prism:coverDate': '2024-05-01',
            'prism:doi': '10.1016/j.jmoneco.2024.01',
            'citedby-count': '18',
            openaccessFlag: true,
          },
        ],
      },
    },
    'scopus',
    'Scopus (Elsevier)'
  );
  assert.equal(scopus.length, 1);
  assert.equal(scopus[0].citationCount, 18);

  const ieee = parseIeeeXploreResults({
    articles: [
      {
        article_number: '9988',
        title: 'Deterministic Consensus in Distributed Ledgers',
        authors: { authors: [{ full_name: 'K. Nakamoto' }] },
        publication_year: 2023,
        doi: '10.1109/TC.2023.9988',
        citing_paper_count: 11,
        access_type: 'OPEN_ACCESS',
        html_url: 'https://ieeexplore.ieee.org/document/9988/',
      },
    ],
  });
  assert.equal(ieee.length, 1);
  assert.equal(ieee[0].isOpenAccess, true);

  const springer = parseSpringerResults({
    records: [
      {
        title: 'Urban Fiscal Resilience',
        creators: [{ creator: 'Weber, M.' }],
        publicationDate: '2022-11-15',
        publicationName: 'Public Choice',
        doi: '10.1007/s11127-022-001',
        openaccess: 'true',
        url: [{ format: 'pdf', value: 'https://link.springer.com/content/pdf/test.pdf' }],
      },
    ],
  });
  assert.equal(springer.length, 1);
  assert.equal(springer[0].pdfUrl, 'https://link.springer.com/content/pdf/test.pdf');

  const lens = parseLensResults({
    data: [
      {
        lens_id: '001-222',
        title: 'AI Patenting and Productivity',
        authors: [{ display_name: 'Acemoglu, D.' }],
        year_published: 2024,
        scholarly_citations_count: 42,
        external_ids: [{ type: 'doi', value: '10.1257/aer.ai' }],
      },
    ],
  });
  assert.equal(lens.length, 1);
  assert.equal(lens[0].citationCount, 42);

  const fed = parseFedInPrintResults({
    items: [
      {
        id: 'fip-9',
        title: 'Federal Funds Rate Expectations',
        authors: ['Bernanke, B.'],
        publication_date: '2023-03-01',
        series: 'Finance and Economics Discussion Series',
        url: 'https://www.federalreserve.gov/fip-9.pdf',
      },
    ],
  });
  assert.equal(fed.length, 1);
  assert.equal(fed[0].year, 2023);

  const gov = parseGovInfoResults({
    bills: [
      {
        number: '4700',
        congress: 118,
        title: 'U.S. Trade Policy and Industrial Subsidies Act',
        originChamber: 'Senate',
        updateDate: '2024-04-12',
        url: 'https://api.congress.gov/v3/bill/118/s/4700',
        latestAction: { text: 'Referred to Finance Committee.' },
      },
    ],
  });
  assert.equal(gov.length, 1);
  assert.equal(gov[0].year, 2024);
});
