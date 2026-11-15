import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCREENING_REASON_LABELS,
  calculatePrisma2020Counts,
  generatePrismaMethodologyText,
} from '../src/utils/prismaFlow.ts';
import type { SavedPaperItem } from '../src/types/academic.ts';

function makeItem(id: string, status: SavedPaperItem['screeningStatus'], reason?: string): SavedPaperItem {
  return {
    id,
    title: `Study ${id}`,
    authors: ['Author Test'],
    year: 2024,
    venue: 'Test Journal',
    doi: null,
    url: `https://example.org/${id}`,
    pdfUrl: null,
    isOpenAccess: true,
    citationCount: 0,
    abstractText: null,
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    savedAt: '2026-01-01T00:00:00.000Z',
    researcherNotes: '',
    relevanceTag: 'media',
    screeningStatus: status,
    exclusionReason: reason,
  };
}

test('calculatePrisma2020Counts tallies identified, duplicates, excluded reasons, and included studies', () => {
  const items: SavedPaperItem[] = [
    makeItem('1', 'included'),
    makeItem('2', 'included'),
    makeItem('3', 'excluded', 'populacao_inadequada'),
    makeItem('4', 'excluded', 'desenho_incompativel'),
    makeItem('5', 'unscreened'),
  ];

  const counts = calculatePrisma2020Counts(items, 120, 30, {
    OpenAlex: 70,
    PubMed: 50,
  });

  assert.equal(counts.identifiedTotal, 120);
  assert.equal(counts.duplicatesRemoved, 30);
  assert.equal(counts.screenedTotal, 5);
  assert.equal(counts.excludedScreening, 2);
  assert.equal(counts.fullTextAssessed, 3);
  assert.equal(counts.includedStudies, 2);
  assert.equal(counts.excludedReasons[SCREENING_REASON_LABELS.populacao_inadequada], 1);

  const methodText = generatePrismaMethodologyText(counts);
  assert.match(methodText, /PRISMA 2020/);
  assert.match(methodText, /120 registros/);
  assert.match(methodText, /2 estudos atenderam/);
});
