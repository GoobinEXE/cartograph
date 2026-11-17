import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryMatcher, findLibraryMatch } from '../src/utils/deduplication.ts';
import type { NormalizedPaper, SavedPaperItem } from '../src/types/academic.ts';

function makePaper(overrides: Partial<NormalizedPaper> = {}): NormalizedPaper {
  return {
    id: 'paper-x',
    title: 'Untitled Placeholder',
    authors: ['Ana Silva'],
    year: 2024,
    venue: 'Journal',
    doi: null,
    url: 'https://example.org/paper-x',
    pdfUrl: null,
    isOpenAccess: false,
    citationCount: 0,
    abstractText: null,
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    ...overrides,
  };
}

function makeSaved(overrides: Partial<SavedPaperItem> = {}): SavedPaperItem {
  return {
    ...makePaper(overrides),
    savedAt: '2026-01-01T00:00:00.000Z',
    researcherNotes: '',
    relevanceTag: 'media',
    screeningStatus: 'unscreened',
    ...overrides,
  };
}

const library: SavedPaperItem[] = [
  makeSaved({
    id: 'lib-doi',
    title: 'Synthetic Control Methods for Municipal Policy',
    authors: ['Alberto Abadie'],
    year: 2021,
    doi: '10.1234/SCM.2021',
  }),
  makeSaved({
    id: 'lib-arxiv',
    title: 'Deep Learning for Causal Inference',
    authors: ['Maria Costa'],
    year: 2023,
    url: 'https://arxiv.org/abs/2305.01234v3',
  }),
  makeSaved({
    id: 'lib-pmid',
    title: 'Randomized Trial of Community Health Workers',
    authors: ['Joao Pereira'],
    year: 2019,
    url: 'https://pubmed.ncbi.nlm.nih.gov/31234567/',
  }),
  makeSaved({
    id: 'lib-fuzzy',
    title: 'Bayesian Structural Time Series for Policy Evaluation',
    authors: ['Kay Brodersen'],
    year: 2015,
  }),
];

test('findLibraryMatch resolves the record ID before any other level', () => {
  const hit = findLibraryMatch(makePaper({ id: 'lib-fuzzy', title: 'Completely different' }), library);
  assert.equal(hit?.id, 'lib-fuzzy');
});

test('findLibraryMatch matches the canonical DOI regardless of prefix and case', () => {
  const hit = findLibraryMatch(
    makePaper({ id: 'new-1', title: 'Another wrapper title', doi: 'https://doi.org/10.1234/scm.2021' }),
    library
  );
  assert.equal(hit?.id, 'lib-doi');
});

test('findLibraryMatch matches arXiv IDs without version suffix and PMIDs', () => {
  const arxivHit = findLibraryMatch(
    makePaper({ id: 'arxiv:2305.01234', title: 'Preprint copy', url: 'https://arxiv.org/pdf/2305.01234v1' }),
    library
  );
  assert.equal(arxivHit?.id, 'lib-arxiv');

  const pmidUrlHit = findLibraryMatch(
    makePaper({ id: 'pmid:31234567', title: 'Mirror record' }),
    library
  );
  assert.equal(pmidUrlHit?.id, 'lib-pmid');
});

test('findLibraryMatch fuzzy level tolerates punctuation and a one-year gap', () => {
  const hit = findLibraryMatch(
    makePaper({
      id: 'new-fuzzy',
      title: 'Bayesian structural time-series for policy evaluation.',
      authors: ['K. H. Brodersen'],
      year: 2016,
    }),
    library
  );
  assert.equal(hit?.id, 'lib-fuzzy');
});

test('findLibraryMatch fuzzy level rejects distant years and different first authors', () => {
  const distantYear = findLibraryMatch(
    makePaper({
      id: 'new-a',
      title: 'Bayesian Structural Time Series for Policy Evaluation',
      authors: ['Kay Brodersen'],
      year: 2019,
    }),
    library
  );
  assert.equal(distantYear, null);

  const otherAuthor = findLibraryMatch(
    makePaper({
      id: 'new-b',
      title: 'Bayesian Structural Time Series for Policy Evaluation',
      authors: ['Pedro Almeida'],
      year: 2015,
    }),
    library
  );
  assert.equal(otherAuthor, null);
});

test('findLibraryMatch keeps the earliest fuzzy entry and treats a missing year as compatible', () => {
  const twins = [
    makeSaved({ id: 'first', title: 'Mapping Open Science Repositories', year: null }),
    makeSaved({ id: 'second', title: 'Mapping Open Science Repositories', year: 2020 }),
  ];
  assert.equal(
    findLibraryMatch(makePaper({ id: 'c', title: 'Mapping open science repositories', year: 2020 }), twins)?.id,
    'first'
  );
  assert.equal(
    findLibraryMatch(makePaper({ id: 'd', title: 'Mapping open science repositories', year: null }), twins)?.id,
    'first'
  );
});

test('findLibraryMatch returns null for an unrelated record', () => {
  const miss = findLibraryMatch(
    makePaper({ id: 'unrelated', title: 'Coral Reef Bleaching Under Ocean Warming', year: 2022 }),
    library
  );
  assert.equal(miss, null);
});

test('createLibraryMatcher.add makes later candidates of the same batch match earlier ones', () => {
  const matcher = createLibraryMatcher<SavedPaperItem>([]);
  const first = makeSaved({ id: 'batch-1', title: 'Urban Heat Islands and Mortality', doi: '10.5555/uhi' });
  assert.equal(matcher.find(first), null);
  matcher.add(first);
  assert.equal(matcher.find(makePaper({ id: 'batch-2', title: 'x', doi: '10.5555/UHI' }))?.id, 'batch-1');
  assert.equal(
    matcher.find(makePaper({ id: 'batch-3', title: 'Urban heat islands and mortality', year: 2024 }))?.id,
    'batch-1'
  );
});
