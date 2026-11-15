import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDoi,
  extractArxivId,
  extractPmid,
  deduplicatePapersAdvanced,
} from '../src/utils/deduplication.ts';
import type { NormalizedPaper } from '../src/types/academic.ts';

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
