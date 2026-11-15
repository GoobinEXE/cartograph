import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBibliometrics } from '../src/utils/bibliometrics.ts';
import type { SavedPaperItem } from '../src/types/academic.ts';

function makeItem(overrides: Partial<SavedPaperItem>): SavedPaperItem {
  return {
    id: overrides.id || 'p1',
    title: overrides.title || 'Telemedicine Care Model',
    authors: overrides.authors || ['Silva, A.'],
    year: overrides.year ?? 2024,
    venue: overrides.venue ?? 'Lancet Digital Health',
    abstractText: overrides.abstractText ?? 'Telemedicine intervention reduced mortality',
    url: 'https://example.org/p1',
    source: 'openalex',
    sourceLabel: overrides.sourceLabel ?? 'OpenAlex',
    isOpenAccess: overrides.isOpenAccess ?? true,
    citationCount: overrides.citationCount ?? 10,
    savedAt: '2026-01-01T00:00:00.000Z',
    researcherNotes: '',
    relevanceTag: 'alta',
    ...overrides,
  };
}

test('computeBibliometrics calculates year histogram, OA share, median citations, top authors, and keywords', () => {
  const items = [
    makeItem({
      id: '1',
      year: 2022,
      citationCount: 5,
      authors: ['Pessoa, M.', 'Costa, R.'],
      sources: ['openalex', 'pubmed'],
      venue: 'Nature Medicine',
      isOpenAccess: true,
    }),
    makeItem({
      id: '2',
      year: 2024,
      citationCount: 25,
      authors: ['Pessoa, M.'],
      sources: ['openalex'],
      venue: 'Nature Medicine',
      isOpenAccess: false,
      pdfUrl: undefined,
    }),
    makeItem({
      id: '3',
      year: 2024,
      citationCount: 15,
      authors: ['Almeida, L.'],
      sources: ['scielo'],
      venue: 'Revista de Saude Publica',
      isOpenAccess: true,
    }),
  ];

  const stats = computeBibliometrics(items);
  assert.equal(stats.totalPapers, 3);
  assert.equal(stats.openAccessCount, 2);
  assert.equal(stats.openAccessPercent, 67);
  assert.equal(stats.totalCitations, 45);
  assert.equal(stats.medianCitations, 15);
  assert.deepEqual(stats.yearRange, { min: 2022, max: 2024 });
  assert.deepEqual(stats.yearHistogram, [
    { year: 2022, count: 1 },
    { year: 2024, count: 2 },
  ]);
  assert.equal(stats.topAuthors[0].label, 'Pessoa, M.');
  assert.equal(stats.topAuthors[0].count, 2);
  assert.equal(stats.topVenues[0].label, 'Nature Medicine');
  assert.equal(stats.topVenues[0].count, 2);
  assert.ok(stats.topKeywords.some((k) => k.term === 'telemedicine'));
});

test('computeBibliometrics handles empty library without errors', () => {
  const stats = computeBibliometrics([]);
  assert.equal(stats.totalPapers, 0);
  assert.equal(stats.openAccessPercent, 0);
  assert.equal(stats.medianCitations, 0);
  assert.deepEqual(stats.yearHistogram, []);
});
