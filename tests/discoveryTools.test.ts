import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIdentifierBatch } from '../src/services/doiBatchResolver.ts';
import { normalizeOpenAlexWork } from '../src/services/citationChaser.ts';
import { resolveUnpaywallPdf } from '../src/services/unpaywallResolver.ts';
import { deduplicatePapersAdvanced } from '../src/utils/deduplication.ts';
import { sanitizeUserAccessConfig } from '../src/utils/accessConfig.ts';

test('parseIdentifierBatch deduplicates and classifies DOIs, PMIDs, and arXiv IDs', () => {
  const input = `
    https://doi.org/10.1038/s41586-024-0001-x
    doi:10.1038/S41586-024-0001-X,
    2401.12345v2
    PMID:38901234
    https://arxiv.org/abs/2401.12345
  `;
  const tokens = parseIdentifierBatch(input);
  assert.equal(tokens.length, 3);
  assert.deepEqual(
    tokens.map((t) => [t.kind, t.value]),
    [
      ['doi', '10.1038/s41586-024-0001-x'],
      ['arxiv', '2401.12345'],
      ['pmid', '38901234'],
    ]
  );
});

test('normalizeOpenAlexWork maps is_retracted flag and deduplication propagates retraction across sources', () => {
  const retracted = normalizeOpenAlexWork(
    {
      id: 'https://openalex.org/W123',
      display_name: 'Flawed Trial Study',
      doi: 'https://doi.org/10.1000/retracted.1',
      publication_year: 2022,
      cited_by_count: 15,
      is_retracted: true,
    },
    0
  );
  assert.equal(retracted.isRetracted, true);

  const unretractedDuplicate = {
    ...retracted,
    id: 'cr-copy',
    source: 'crossref' as const,
    isRetracted: false,
    retractionNoticeUrl: 'https://doi.org/10.1000/notice',
  };

  const merged = deduplicatePapersAdvanced([unretractedDuplicate, retracted]);
  assert.equal(merged.papers.length, 1);
  assert.equal(merged.papers[0].isRetracted, true);
  assert.equal(merged.papers[0].retractionNoticeUrl, 'https://doi.org/10.1000/notice');
});

test('resolveUnpaywallPdf validates DOI and resolves Open Access PDF cleanly via fetch', async () => {
  const invalid = await resolveUnpaywallPdf('not-a-doi');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.bestPdfUrl, null);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        ok: true,
        isOa: true,
        oaStatus: 'green',
        bestPdfUrl: 'https://repo.university.edu/paper.pdf',
        bestLandingUrl: 'https://repo.university.edu/paper',
        hostType: 'repository',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  try {
    const resolved = await resolveUnpaywallPdf('10.1234/oa.example', 'researcher@uni.edu');
    assert.equal(resolved.ok, true);
    assert.equal(resolved.isOa, true);
    assert.equal(resolved.bestPdfUrl, 'https://repo.university.edu/paper.pdf');
    assert.equal(resolved.oaStatus, 'green');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sanitizeUserAccessConfig accepts valid unpaywallEmail and drops invalid emails', () => {
  const valid = sanitizeUserAccessConfig({ unpaywallEmail: 'lab@usp.br' });
  assert.equal(valid.unpaywallEmail, 'lab@usp.br');

  const invalid = sanitizeUserAccessConfig({ unpaywallEmail: 'not-an-email' });
  assert.equal(invalid.unpaywallEmail, undefined);
});
