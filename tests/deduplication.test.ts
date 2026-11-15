import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDoi,
  extractArxivId,
  extractPmid,
  makePairKey,
  deduplicatePapersAdvanced,
  partitionResultsAgainstLibrary,
} from '../src/utils/deduplication.ts';
import type { NormalizedPaper, SavedPaperItem } from '../src/types/academic.ts';

function makePaper(overrides: Partial<NormalizedPaper> = {}): NormalizedPaper {
  return {
    id: 'paper-1',
    title: 'Sample Study on Causal Forests',
    authors: ['Ana Silva', 'Bruno Costa'],
    year: 2024,
    venue: 'Journal of Computational Science',
    doi: null,
    url: 'https://example.org/paper-1',
    pdfUrl: null,
    isOpenAccess: false,
    citationCount: 10,
    abstractText: null,
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    ...overrides,
  };
}

test('identifier normalizers extract canonical DOI, arXiv ID, and PMID', () => {
  assert.equal(normalizeDoi('HTTPS://DX.DOI.ORG/10.1038/S41586-024-0001-X'), '10.1038/s41586-024-0001-x');
  assert.equal(normalizeDoi('doi: 10.1145/12345.67890'), '10.1145/12345.67890');
  assert.equal(extractArxivId('https://arxiv.org/abs/2401.12345v2'), '2401.12345');
  assert.equal(extractPmid('https://pubmed.ncbi.nlm.nih.gov/38901234/'), '38901234');
});

test('deduplicatePapersAdvanced merges by DOI, arXiv/PMID, and fuzzy title while enriching metadata', () => {
  const papers: NormalizedPaper[] = [
    makePaper({
      id: 'oa-1',
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani'],
      year: 2017,
      doi: 'https://doi.org/10.48550/arXiv.1706.03762',
      citationCount: 50000,
      source: 'openalex',
    }),
    makePaper({
      id: 'cr-1',
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani'],
      year: 2017,
      doi: '10.48550/arxiv.1706.03762',
      pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
      isOpenAccess: true,
      citationCount: 120000,
      source: 'crossref',
    }),
    makePaper({
      id: 'ax-1',
      title: 'Scaling Laws for Neural Language Models',
      authors: ['Jared Kaplan'],
      year: 2020,
      url: 'https://arxiv.org/abs/2001.08361v1',
      source: 'arxiv',
    }),
    makePaper({
      id: 'ss-1',
      title: 'Scaling Laws for Neural Language Models (Preprint)',
      authors: ['Jared Kaplan'],
      year: 2020,
      url: 'https://arxiv.org/pdf/2001.08361v2',
      source: 'semanticscholar',
    }),
    makePaper({
      id: 'eu-1',
      title: 'Clinical Evaluation of Sepsis Prediction Models in Intensive Care Units',
      authors: ['Maria Oliveira'],
      year: 2023,
      source: 'europepmc',
    }),
    makePaper({
      id: 'doaj-1',
      title: 'Clinical evaluation of sepsis prediction models in intensive care unit',
      authors: ['Maria Oliveira'],
      year: 2023,
      source: 'doaj',
    }),
  ];

  const { papers: unique, summary } = deduplicatePapersAdvanced(papers);

  assert.equal(summary.originalCount, 6);
  assert.equal(summary.uniqueCount, 3);
  assert.equal(summary.duplicatesRemoved, 3);
  assert.equal(summary.mergedByDoi, 1);
  assert.equal(summary.mergedByPmidOrArxiv, 1);
  assert.equal(summary.mergedByFuzzyTitle, 1);

  assert.equal(unique[0].citationCount, 120000);
  assert.equal(unique[0].isOpenAccess, true);
  assert.deepEqual(unique[0].sources, ['openalex', 'crossref']);
});

test('deduplicatePapersAdvanced exposes mergeClusters, preserves sourceRanks, and respects splitPairs', () => {
  const oa = makePaper({
    id: 'oa-10',
    title: 'Federated Causal Discovery',
    authors: ['Clara Mendes'],
    year: 2024,
    doi: '10.1000/causal-10',
    source: 'openalex',
    sourceRanks: { openalex: 2 },
  });
  const cr = makePaper({
    id: 'cr-10',
    title: 'Federated Causal Discovery',
    authors: ['Clara Mendes'],
    year: 2024,
    doi: '10.1000/causal-10',
    source: 'crossref',
    sourceRanks: { crossref: 1 },
  });

  const mergedRes = deduplicatePapersAdvanced([oa, cr]);
  assert.equal(mergedRes.papers.length, 1);
  assert.deepEqual(mergedRes.papers[0].sourceRanks, { openalex: 2, crossref: 1 });
  assert.equal(mergedRes.mergeClusters.length, 1);
  assert.equal(mergedRes.mergeClusters[0].ruleMatched, 'doi');
  assert.equal(mergedRes.mergeClusters[0].constituents.length, 2);

  const splitRes = deduplicatePapersAdvanced([oa, cr], {
    splitPairs: [makePairKey('oa-10', 'cr-10')],
  });
  assert.equal(splitRes.papers.length, 2);
  assert.equal(splitRes.mergeClusters.length, 0);
  assert.equal(splitRes.summary.duplicatesRemoved, 0);
});

test('partitionResultsAgainstLibrary separates unseen results from already saved items', () => {
  const saved: SavedPaperItem[] = [
    {
      ...makePaper({
        id: 'saved-1',
        title: 'Bayesian Structural Time Series for Policy Evaluation',
        doi: '10.1234/bsts.2024',
        url: 'https://arxiv.org/abs/2402.99999',
      }),
      savedAt: '2026-01-01T00:00:00.000Z',
      researcherNotes: '',
      relevanceTag: 'alta',
      screeningStatus: 'included',
    },
  ];

  const unseen = makePaper({
    id: 'res-new',
    title: 'Novel Synthetic Controls in Municipal Spending',
    doi: '10.9999/new-paper',
  });
  const matchedByDoi = makePaper({
    id: 'res-dup-doi',
    title: 'Different Title Wrapper',
    doi: 'https://doi.org/10.1234/BSTS.2024',
  });

  const partition = partitionResultsAgainstLibrary([unseen, matchedByDoi], saved);
  assert.equal(partition.unseen.length, 1);
  assert.equal(partition.unseen[0].id, 'res-new');
  assert.equal(partition.matched.length, 1);
  assert.equal(partition.matched[0].existingItem.id, 'saved-1');
  assert.equal(partition.matched[0].existingItem.screeningStatus, 'included');
});
