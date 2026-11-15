import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
  formatInTextCitation,
  formatRisEntry,
  exportSavedPapersCsv,
  exportSavedPapersRis,
  exportSynthesisLatexTable,
  exportSynthesisMarkdown,
  escapeLatex,
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

test('formatInTextCitation emits ABNT and APA parenthetical and narrative styles', () => {
  const oneAuthor = makeSavedPaper({ authors: ['Ana Silva'], year: 2024 });
  const twoAuthors = makeSavedPaper({ authors: ['Ana Silva', 'Bruno Costa'], year: 2024 });
  const fourAuthors = makeSavedPaper({
    authors: ['Ana Silva', 'Bruno Costa', 'Carlos Souza', 'Davi Lima'],
    year: 2024,
  });

  assert.equal(formatInTextCitation(oneAuthor, 'abnt', 'parenthetical'), '(SILVA, 2024)');
  assert.equal(formatInTextCitation(twoAuthors, 'abnt', 'parenthetical'), '(SILVA; COSTA, 2024)');
  assert.equal(formatInTextCitation(fourAuthors, 'abnt', 'parenthetical'), '(SILVA et al., 2024)');
  assert.equal(formatInTextCitation(twoAuthors, 'abnt', 'narrative'), 'Silva e Costa (2024)');

  assert.equal(formatInTextCitation(oneAuthor, 'apa', 'parenthetical'), '(Silva, 2024)');
  assert.equal(formatInTextCitation(twoAuthors, 'apa', 'parenthetical'), '(Silva & Costa, 2024)');
  assert.equal(formatInTextCitation(fourAuthors, 'apa', 'parenthetical'), '(Silva et al., 2024)');
});

test('RIS, Markdown synthesis, and LaTeX exporters escape and format cleanly', () => {
  const paper = makeSavedPaper({
    title: 'Causal Effects & 100% Transparency in R_2 #1',
    extractedMetadata: {
      studyDesign: 'RCT',
      sampleSize: 'N = 240',
      hasStructuredAbstract: true,
    },
    researcherNotes: 'Robust estimates',
  });

  const ris = exportSavedPapersRis([paper]);
  assert.ok(ris.startsWith('TY  - JOUR'));
  assert.ok(ris.includes('AU  - Pessoa, Marcelo'));
  assert.ok(ris.includes('ER  - '));
  assert.equal(formatRisEntry(paper).includes('DO  - 10.1000/jis.2025.01'), true);

  const md = exportSynthesisMarkdown([paper], {}, 'en');
  assert.ok(md.includes('type: literature-synthesis'));
  assert.ok(md.includes('Causal Effects & 100% Transparency in R_2 #1'));

  assert.equal(escapeLatex('A & B % $ # _ { }'), 'A \\& B \\% \\$ \\# \\_ \\{ \\}');
  const tex = exportSynthesisLatexTable([paper], 'en');
  assert.ok(tex.includes('\\begin{table}'));
  assert.ok(tex.includes('Pessoa et al. (2025)'));
  assert.ok(tex.includes('N = 240'));

  const customPaper = {
    ...paper,
    customFields: { effect_size: '=CMD|calc', arm: 'Treatment A' },
    qualityAppraisal: {
      tool: 'rob2' as const,
      criteria: { d1_randomization: 'low' as const },
      overall: 'low' as const,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  };
  const cols = [
    { id: 'effect_size', label: 'Effect Size' },
    { id: 'arm', label: 'Study Arm' },
  ];
  const csvWithCustom = exportSavedPapersCsv([customPaper], {}, 'en', cols);
  assert.ok(csvWithCustom.includes('Quality_Overall,"Effect Size","Study Arm"'));
  assert.ok(csvWithCustom.includes('"\'=CMD|calc"'));
  assert.ok(csvWithCustom.includes('Treatment A'));

  const mdWithCustom = exportSynthesisMarkdown([customPaper], {}, 'en', cols);
  assert.ok(mdWithCustom.includes('Effect Size'));
  assert.ok(mdWithCustom.includes('ROB2: Low risk / Adequate'));
});
