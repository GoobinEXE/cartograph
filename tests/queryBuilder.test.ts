import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileBooleanQuery,
  translateAcademicQueryPtToEn,
} from '../src/utils/queryBuilder.ts';
import type { BooleanQueryState } from '../src/types/academic.ts';

function makeState(overrides: Partial<BooleanQueryState> = {}): BooleanQueryState {
  return {
    mainConcept: '',
    andTerms: '',
    orTerms: '',
    notTerms: '',
    exactPhrase: '',
    yearFrom: '',
    studyDesign: 'any',
    ...overrides,
  };
}

test('compileBooleanQuery builds multi-clause boolean expressions cleanly', () => {
  const compiled = compileBooleanQuery(
    makeState({
      mainConcept: 'machine learning',
      exactPhrase: 'causal inference',
      andTerms: 'healthcare, triage',
      orTerms: 'deep learning, neural networks',
      notTerms: 'pediatric, animal study',
      studyDesign: 'systematic-review',
    })
  );

  assert.match(compiled, /machine learning/);
  assert.match(compiled, /"causal inference"/);
  assert.match(compiled, /healthcare AND triage/);
  assert.match(compiled, /\("deep learning" OR "neural networks"\)/);
  assert.match(compiled, /\("systematic review" OR "meta-analysis"\)/);
  assert.match(compiled, /NOT pediatric NOT "animal study"/);
});

test('compileBooleanQuery avoids redundant quotes when exactPhrase is already quoted', () => {
  const compiled = compileBooleanQuery(
    makeState({ exactPhrase: '"large language models"' })
  );
  assert.equal(compiled, '"large language models"');
});

test('translateAcademicQueryPtToEn falls back to glossary when /api/translate fails or returns ok=false', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      ok: false,
      translated: 'inteligencia artificial e revisao sistematica em saude publica',
    }),
  })) as unknown as typeof fetch;

  try {
    const translated = await translateAcademicQueryPtToEn(
      'inteligência artificial e revisão sistemática em saúde pública'
    );
    assert.match(translated, /artificial intelligence/i);
    assert.match(translated, /systematic review/i);
    assert.match(translated, /public health/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
