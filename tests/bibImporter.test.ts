import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBibtexEntries,
  parseRisEntries,
  parseImportedReferences,
} from '../src/utils/bibImporter.ts';
import { exportSavedPapersRis } from '../src/utils/citationExporter.ts';
import type { SavedPaperItem } from '../src/types/academic.ts';

test('parseBibtexEntries extracts authors, title, nested braces, year, DOI, and abstract', () => {
  const bib = `
@article{vaswani2017attention,
  title = {Attention Is All {You} Need},
  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  journal = {Advances in Neural Information Processing Systems},
  year = {2017},
  doi = {https://doi.org/10.48550/arXiv.1706.03762},
  abstract = {Objective: Introduce Transformer architecture. Conclusion: State-of-the-art translation.}
}
`;

  const items = parseBibtexEntries(bib);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Attention Is All You Need');
  assert.deepEqual(items[0].authors, ['Vaswani, Ashish', 'Shazeer, Noam', 'Parmar, Niki']);
  assert.equal(items[0].year, 2017);
  assert.equal(items[0].doi, '10.48550/arxiv.1706.03762');
  assert.equal(items[0].url, 'https://doi.org/10.48550/arxiv.1706.03762');
});

test('parseRisEntries extracts Zotero/Mendeley RIS records accurately', () => {
  const ris = [
    'TY  - JOUR',
    'TI  - Systematic Review of Federated Search Engines',
    'AU  - Silva, Maria',
    'AU  - Costa, Joao',
    'PY  - 2024/05/12',
    'JO  - Scientometrics',
    'DO  - 10.1007/s11192-024-0001',
    'UR  - https://link.springer.com/article/test',
    'AB  - Methods: We evaluated 15 open scientific APIs across 500 queries.',
    'ER  - ',
  ].join('\n');

  const items = parseRisEntries(ris);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Systematic Review of Federated Search Engines');
  assert.deepEqual(items[0].authors, ['Silva, Maria', 'Costa, Joao']);
  assert.equal(items[0].year, 2024);
  assert.equal(items[0].venue, 'Scientometrics');
  assert.equal(items[0].url, 'https://link.springer.com/article/test');

  const detected = parseImportedReferences('references.ris', ris);
  assert.equal(detected.format, 'ris');
  assert.equal(detected.items.length, 1);
});

test('exportSavedPapersRis round-trips cleanly through parseRisEntries', () => {
  const original: SavedPaperItem = {
    id: 'rt-1',
    title: 'Round-Trip RIS Persistence Study',
    authors: ['Marcelo Pessoa', 'Ana Clara Silva'],
    year: 2025,
    venue: 'Scientometrics',
    doi: '10.1000/ris.rt.2025',
    url: 'https://example.org/ris-rt',
    pdfUrl: 'https://example.org/ris-rt.pdf',
    isOpenAccess: true,
    citationCount: 7,
    abstractText: 'Objective: Verify lossless RIS export and re-import.',
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    savedAt: '2026-01-01T00:00:00.000Z',
    researcherNotes: '',
    relevanceTag: 'alta',
    screeningStatus: 'included',
  };

  const exported = exportSavedPapersRis([original]);
  const reimported = parseRisEntries(exported);
  assert.equal(reimported.length, 1);
  assert.equal(reimported[0].title, original.title);
  assert.equal(reimported[0].year, 2025);
  assert.equal(reimported[0].doi, '10.1000/ris.rt.2025');
  assert.equal(reimported[0].url, original.url);
  assert.equal(reimported[0].authors.length, 2);
});
