import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileBooleanQuery,
  compilePicoQuery,
  translateAcademicQueryPtToEn,
  translateQueryToDialect,
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

test('compilePicoQuery compiles PICO, PECO, and PCC clauses with OR-grouped synonyms', () => {
  const pico = compilePicoQuery({
    framework: 'pico',
    population: 'older adults, elderly',
    interventionOrExposure: 'telehealth',
    comparison: 'usual care',
    outcomeOrContext: 'hospital readmission',
  });
  assert.equal(
    pico,
    '("older adults" OR elderly) AND telehealth AND "usual care" AND "hospital readmission"'
  );

  const pcc = compilePicoQuery({
    framework: 'pcc',
    population: 'nurses',
    interventionOrExposure: 'burnout',
    comparison: 'ignored in pcc',
    outcomeOrContext: 'intensive care',
  });
  assert.equal(pcc, 'nurses AND burnout AND "intensive care"');
});

test('translateQueryToDialect adapts queries to PubMed, Scopus, WoS, arXiv, and IEEE syntaxes', () => {
  const state = makeState({
    mainConcept: 'telehealth',
    orTerms: 'telemedicine',
    notTerms: 'pediatric',
    yearFrom: '2022',
  });

  const pubmed = translateQueryToDialect(state, 'pubmed');
  assert.match(pubmed, /\[Title\/Abstract\]/);
  assert.match(pubmed, /"2022\/01\/01"\[Date - Publication\] : "3000"\[Date - Publication\]/);

  const scopus = translateQueryToDialect(state, 'scopus');
  assert.match(scopus, /^TITLE-ABS-KEY\(/);
  assert.match(scopus, /AND PUBYEAR > 2021/);

  const wos = translateQueryToDialect(state, 'wos');
  assert.match(wos, /^TS=\(/);
  assert.match(wos, /AND PY=\(2022-2026\)/);

  const arxiv = translateQueryToDialect(state, 'arxiv');
  assert.match(arxiv, /ti:/);
  assert.match(arxiv, /abs:/);
  assert.match(arxiv, /ANDNOT/);

  const ieee = translateQueryToDialect(state, 'ieee');
  assert.match(ieee, /"Document Title":/);
});
