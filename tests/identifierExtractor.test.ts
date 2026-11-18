import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAcademicIdentifiers } from '../src/utils/identifierExtractor.ts';

test('extractAcademicIdentifiers returns empty array for blank or identifier-free prose', () => {
  assert.deepEqual(extractAcademicIdentifiers(''), []);
  assert.deepEqual(extractAcademicIdentifiers('   \n\t  '), []);
  assert.deepEqual(
    extractAcademicIdentifiers('Reuniao as 14h para discutir revisao sistematica, telefone 99887766.'),
    []
  );
});

test('extractAcademicIdentifiers extracts and deduplicates DOIs, PMIDs, and arXiv IDs from noisy chat/email text', () => {
  const pasted = `
    Oi equipe, separei estes artigos no WhatsApp:
    1) Nature: https://doi.org/10.1038/s41586-021-03819-2, vale muito!
    2) Mesmo artigo em maiusculo: (DOI: 10.1038/S41586-021-03819-2).
    3) Science via dx: <http://dx.doi.org/10.1126/science.abc1234>;
    4) PubMed direto: PMID: 34265844 e link https://pubmed.ncbi.nlm.nih.gov/35123456/
    5) Preprint arXiv: https://arxiv.org/abs/2303.08774v2 e PDF https://arxiv.org/pdf/2303.08774.pdf
    6) Outro preprint: arXiv:2401.12345.
    38123456
    2405.00123v1
  `;

  assert.deepEqual(extractAcademicIdentifiers(pasted), [
    '10.1038/s41586-021-03819-2',
    '10.1126/science.abc1234',
    'PMID:34265844',
    'PMID:35123456',
    'arXiv:2303.08774',
    'arXiv:2401.12345',
    'PMID:38123456',
    'arXiv:2405.00123',
  ]);
});

test('extractAcademicIdentifiers avoids false PMID or arXiv hits inside DOI suffixes', () => {
  const text = `
    https://doi.org/10.1016/j.cell.2023.1234567
    https://doi.org/10.48550/arXiv.2303.08774
  `;

  assert.deepEqual(extractAcademicIdentifiers(text), [
    '10.1016/j.cell.2023.1234567',
    '10.48550/arxiv.2303.08774',
  ]);
});

test('extractAcademicIdentifiers preserves balanced parentheses inside DOIs and strips outer wrapper punctuation', () => {
  const text = `
    Lancet: (https://doi.org/10.1016/S0140-6736(20)30566-3).
    Markdown: [Study](https://doi.org/10.1000/xyz-123)
  `;

  assert.deepEqual(extractAcademicIdentifiers(text), [
    '10.1016/s0140-6736(20)30566-3',
    '10.1000/xyz-123',
  ]);
});
