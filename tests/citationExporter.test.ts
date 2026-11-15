import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
  exportSavedPapersCsv,
} from '../src/utils/citationExporter.ts';
import type { SavedPaperItem } from '../src/types/academic.ts';

function makeSavedPaper(overrides: Partial<SavedPaperItem> = {}): SavedPaperItem {
  return {
    id: 'saved-1',
    title: 'Federated Literature Review Engines',
    authors: ['Marcelo Pessoa', 'Carla Mendes'],
    year: 2025,
    venue: 'Journal of Information Systems',
    doi: '10.1000/jis.2025.01',
    url: 'https://example.org/paper',
    pdfUrl: 'https://example.org/paper.pdf',
    isOpenAccess: true,
    citationCount: 18,
    abstractText: 'Objective: Evaluate metasearch hubs.',
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    savedAt: '2026-01-10T12:00:00.000Z',
    researcherNotes: '=HYPERLINK("http://evil.example","Click")',
    relevanceTag: 'alta',
    screeningStatus: 'included',
    ...overrides,
  };
}

test('citation formatters generate ABNT, APA, and BibTeX strings cleanly', () => {
  const paper = makeSavedPaper();
  const abnt = formatAbntCitation(paper);
  const apa = formatApaCitation(paper);
  const bib = formatBibtexEntry(paper);

  assert.match(abnt, /PESSOA/);
  assert.match(abnt, /2025/);
  assert.match(apa, /\(2025\)/);
  assert.match(bib, /^@article\{/);
  assert.match(bib, /doi = \{10\.1000\/jis\.2025\.01\}/);
});

test('exportSavedPapersCsv prepends UTF-8 BOM and neutralizes CSV formula injection (CWE-1236)', () => {
  const maliciousPaper = makeSavedPaper({
    title: '=CMD|"/C calc"!A0',
    venue: '+1+1',
    researcherNotes: '@SUM(A1:A2)',
    groupId: 'grp-1',
  });

  const csv = exportSavedPapersCsv([maliciousPaper], { 'grp-1': 'Revisão Principal' });

  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
  assert.ok(csv.includes('"\'=CMD|""/C calc""!A0"'), 'Leading = must be neutralized');
  assert.ok(csv.includes('"\'+1+1"'), 'Leading + must be neutralized');
  assert.ok(csv.includes('"\'@SUM(A1:A2)"'), 'Leading @ must be neutralized');
  assert.ok(csv.includes('"Revisão Principal"'));
});
