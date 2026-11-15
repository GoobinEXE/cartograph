import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARTOGRAPH_BLIND_SCHEMA,
  computeCohensKappa,
  exportBlindReviewPackage,
  parseBlindReviewPackage,
} from '../src/utils/interRaterKappa.ts';
import type { SavedPaperItem } from '../src/types/academic.ts';

function makeSavedPaper(
  id: string,
  status: SavedPaperItem['screeningStatus'] = 'included',
  notes = 'Secret Reviewer 1 note'
): SavedPaperItem {
  return {
    id,
    title: `Study ${id}`,
    authors: ['Silva, A.'],
    year: 2024,
    abstractText: 'Abstract text for blind review.',
    url: `https://example.org/${id}`,
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    isOpenAccess: true,
    savedAt: '2026-01-01T00:00:00.000Z',
    researcherNotes: notes,
    relevanceTag: 'alta',
    screeningStatus: status,
    exclusionReason: status === 'excluded' ? 'populacao_inadequada' : undefined,
  };
}

test('exportBlindReviewPackage strips Reviewer 1 decisions, notes, and tags before sending to Reviewer 2', () => {
  const items = [makeSavedPaper('p1', 'included', 'Confidential R1 judgment')];
  const raw = exportBlindReviewPackage(items, 'Cardiology');
  const parsed = JSON.parse(raw) as {
    schema: string;
    groupName?: string;
    items: Array<Record<string, unknown>>;
  };

  assert.equal(parsed.schema, CARTOGRAPH_BLIND_SCHEMA);
  assert.equal(parsed.groupName, 'Cardiology');
  assert.equal(parsed.items.length, 1);
  assert.equal('screeningStatus' in parsed.items[0], false);
  assert.equal('exclusionReason' in parsed.items[0], false);
  assert.equal('researcherNotes' in parsed.items[0], false);
  assert.equal('relevanceTag' in parsed.items[0], false);
  assert.equal(raw.includes('Confidential R1 judgment'), false);
});

test('parseBlindReviewPackage round-trips Reviewer 2 decisions and rejects invalid schema', () => {
  const items = [makeSavedPaper('p1', 'included'), makeSavedPaper('p2', 'excluded')];
  const raw = exportBlindReviewPackage(items);
  const pkg = JSON.parse(raw) as {
    schema: string;
    exportedAt: string;
    items: Array<{ id: string; reviewer2Status?: string; reviewer2Reason?: string }>;
  };

  pkg.items[0].reviewer2Status = 'included';
  pkg.items[1].reviewer2Status = 'excluded';
  pkg.items[1].reviewer2Reason = 'desfecho_incompativel';

  const parsed = parseBlindReviewPackage(JSON.stringify(pkg));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.totalItems, 2);
    assert.equal(parsed.decisions.p1.status, 'included');
    assert.equal(parsed.decisions.p2.status, 'excluded');
    assert.equal(parsed.decisions.p2.reason, 'desfecho_incompativel');
  }

  const bad = parseBlindReviewPackage(JSON.stringify({ schema: 'wrong', items: [] }));
  assert.equal(bad.ok, false);
});

test("computeCohensKappa computes exact Cohen's kappa and disagreement pairs", () => {
  const items = [
    makeSavedPaper('p1', 'included'),
    makeSavedPaper('p2', 'included'),
    makeSavedPaper('p3', 'included'),
    makeSavedPaper('p4', 'excluded'),
    makeSavedPaper('p5', 'excluded'),
    makeSavedPaper('p6', 'included'),
    makeSavedPaper('p7', 'unscreened'), // ignored in paired kappa
  ];

  // Paired:
  // bothIncluded = 3 (p1, p2, p3)
  // bothExcluded = 2 (p4, p5)
  // onlyR1Included = 1 (p6)
  // onlyR2Included = 0
  // N = 6, po = 5/6, pR1Inc = 4/6, pR2Inc = 3/6, pR1Exc = 2/6, pR2Exc = 3/6
  // pe = (4/6)*(3/6) + (2/6)*(3/6) = 18/36 = 0.5
  // kappa = (5/6 - 0.5) / (1 - 0.5) = (2/6) / 0.5 = 2/3 ≈ 0.6667
  const res = computeCohensKappa(items, {
    p1: { status: 'included' },
    p2: { status: 'included' },
    p3: { status: 'included' },
    p4: { status: 'excluded' },
    p5: { status: 'excluded' },
    p6: { status: 'excluded', reason: 'sem_texto_completo' },
    p7: { status: 'included' },
  });

  assert.equal(res.overlappingCount, 6);
  assert.equal(res.bothIncluded, 3);
  assert.equal(res.bothExcluded, 2);
  assert.equal(res.onlyR1Included, 1);
  assert.equal(res.onlyR2Included, 0);
  assert.equal(res.observedAgreement, 0.833);
  assert.ok(Math.abs(res.kappa - 2 / 3) < 1e-3);
  assert.equal(res.conflicts.length, 1);
  assert.equal(res.conflicts[0].item.id, 'p6');
});

test('computeCohensKappa handles unanimous edge case where pe === 1 without NaN', () => {
  const items = [makeSavedPaper('p1', 'included'), makeSavedPaper('p2', 'included')];
  const res = computeCohensKappa(items, {
    p1: { status: 'included' },
    p2: { status: 'included' },
  });
  assert.equal(res.overlappingCount, 2);
  assert.equal(res.kappa, 1);
  assert.equal(res.conflicts.length, 0);
});
