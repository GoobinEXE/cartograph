import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRelevanceQuery,
  computePaperRelevance,
  rankPapersByRelevance,
} from '../src/utils/relevanceRanker.ts';
import { deduplicatePapersAdvanced } from '../src/utils/deduplication.ts';
import type { NormalizedPaper } from '../src/types/academic.ts';

const REF_YEAR = 2026;

function makePaper(overrides: Partial<NormalizedPaper> = {}): NormalizedPaper {
  return {
    id: 'paper-1',
    title: 'Sample Paper Title',
    authors: ['Ana Silva', 'Carlos Souza'],
    year: 2024,
    venue: 'Journal of Scientific Research',
    doi: '10.1000/test.2024.01',
    url: 'https://example.org/paper-1',
    pdfUrl: null,
    isOpenAccess: false,
    citationCount: 10,
    abstractText:
      'This study investigates structured empirical evaluation methods with reproducible benchmarks across cohorts.',
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    ...overrides,
  };
}

test('parseRelevanceQuery extracts exact phrases, positive terms, NOT exclusions, and PT-EN glossary synonyms', () => {
  const parsed = parseRelevanceQuery(
    '"aprendizado de máquina" AND saúde pública NOT pediatria -animal'
  );

  assert.deepEqual(parsed.positivePhrases, ['aprendizado de maquina']);
  assert.ok(parsed.positiveTerms.includes('aprendizado'));
  assert.ok(parsed.positiveTerms.includes('maquina'));
  assert.ok(parsed.positiveTerms.includes('saude'));
  assert.ok(parsed.positiveTerms.includes('publica'));
  assert.ok(!parsed.positiveTerms.includes('AND'));
  assert.ok(parsed.excludedTerms.includes('pediatria'));
  assert.ok(parsed.excludedTerms.includes('animal'));
  assert.ok(parsed.synonymPhrases.includes('machine learning'));
  assert.ok(parsed.synonymPhrases.includes('public health'));
});

test('topical gate prevents off-topic citation giants from outranking exact on-topic papers', () => {
  const onTopic = makePaper({
    id: 'on-topic',
    title: 'Causal Forests for Heterogeneous Treatment Effects in Primary Care',
    abstractText:
      'We apply causal forests to estimate heterogeneous treatment effects across primary care clinics.',
    year: 2025,
    citationCount: 3,
    source: 'openalex',
    sourceRanks: { openalex: 2 },
  });

  const offTopicGiant = makePaper({
    id: 'off-topic',
    title: 'Deep Residual Learning for Image Recognition',
    abstractText:
      'Convolutional neural networks on ImageNet classification benchmarks achieve state-of-the-art accuracy.',
    year: 2016,
    citationCount: 180000,
    pdfUrl: 'https://example.org/resnet.pdf',
    isOpenAccess: true,
    sources: ['openalex', 'semanticscholar', 'crossref'],
    sourceRanks: { openalex: 1, semanticscholar: 1, crossref: 1 },
  });

  const ranked = rankPapersByRelevance(
    [offTopicGiant, onTopic],
    'causal forests heterogeneous treatment effects',
    { referenceYear: REF_YEAR }
  );

  assert.equal(ranked[0].paper.id, 'on-topic');
  assert.ok(ranked[0].breakdown.totalScore > ranked[1].breakdown.totalScore);
  assert.equal(ranked[1].breakdown.lexicalScore, 0);
});

test('title and exact phrase matches outrank incidental abstract-only mentions', () => {
  const titleMatch = makePaper({
    id: 'title-match',
    title: 'Systematic Review of Federated Learning in Clinical Triage',
    abstractText: 'A comprehensive synthesis of clinical triage algorithms.',
    year: 2024,
    citationCount: 15,
    sourceRanks: { openalex: 4 },
  });

  const abstractMention = makePaper({
    id: 'abstract-mention',
    title: 'Hospital Emergency Department Workflow Optimization',
    abstractText:
      'We discuss scheduling heuristics and briefly mention federated learning as future work.',
    year: 2024,
    citationCount: 15,
    sourceRanks: { openalex: 4 },
  });

  const ranked = rankPapersByRelevance(
    [abstractMention, titleMatch],
    '"federated learning" clinical triage',
    { referenceYear: REF_YEAR }
  );

  assert.equal(ranked[0].paper.id, 'title-match');
  assert.equal(ranked[0].breakdown.hasExactPhraseMatch, true);
  assert.ok(ranked[0].breakdown.lexicalScore > ranked[1].breakdown.lexicalScore);
});

test('Reciprocal Rank Fusion (RRF) rewards multi-database corroboration over single-source fast arrivals', () => {
  const corroborated = makePaper({
    id: 'corroborated',
    title: 'Large Language Models in Systematic Literature Screening',
    abstractText:
      'Evaluation of large language models for title and abstract screening in systematic reviews.',
    year: 2025,
    citationCount: 22,
    source: 'pubmed',
    sources: ['pubmed', 'openalex', 'semanticscholar'],
    sourceRanks: { pubmed: 2, openalex: 1, semanticscholar: 3 },
  });

  const singleSource = makePaper({
    id: 'single-source',
    title: 'Large Language Models in Systematic Literature Screening',
    abstractText:
      'Evaluation of large language models for title and abstract screening in systematic reviews.',
    year: 2025,
    citationCount: 22,
    source: 'figshare',
    sources: ['figshare'],
    sourceRanks: { figshare: 7 },
  });

  const ranked = rankPapersByRelevance(
    [singleSource, corroborated],
    'large language models systematic literature screening',
    { referenceYear: REF_YEAR }
  );

  assert.equal(ranked[0].paper.id, 'corroborated');
  assert.equal(ranked[0].breakdown.sourcesCount, 3);
  assert.ok(ranked[0].breakdown.consensusScore > ranked[1].breakdown.consensusScore);
});

test('age-normalized citation velocity and recency protect recent impactful papers against old papers', () => {
  const recentHighVelocity = makePaper({
    id: 'recent-fast',
    title: 'Retrieval-Augmented Generation for Biomedical Evidence Synthesis',
    abstractText:
      'Retrieval-augmented generation improves biomedical evidence synthesis accuracy.',
    year: 2025,
    citationCount: 80,
    sourceRanks: { openalex: 2 },
  });

  const olderStagnant = makePaper({
    id: 'old-stagnant',
    title: 'Retrieval-Augmented Generation for Biomedical Evidence Synthesis',
    abstractText:
      'Retrieval-augmented generation improves biomedical evidence synthesis accuracy.',
    year: 2008,
    citationCount: 80,
    sourceRanks: { openalex: 2 },
  });

  const ranked = rankPapersByRelevance(
    [olderStagnant, recentHighVelocity],
    'retrieval augmented generation biomedical evidence synthesis',
    { referenceYear: REF_YEAR }
  );

  assert.equal(ranked[0].paper.id, 'recent-fast');
  assert.ok(ranked[0].breakdown.citationVelocity > ranked[1].breakdown.citationVelocity);
  assert.ok(
    ranked[0].breakdown.impactRecencyScore > ranked[1].breakdown.impactRecencyScore
  );
});

test('Boolean NOT exclusion penalizes papers containing excluded terms', () => {
  const cleanPaper = makePaper({
    id: 'clean',
    title: 'Machine Learning for Adult Sepsis Prediction',
    abstractText: 'Prospective adult ICU cohort validation.',
  });

  const excludedPaper = makePaper({
    id: 'excluded',
    title: 'Machine Learning for Pediatric Sepsis Prediction',
    abstractText: 'Retrospective pediatric cohort validation.',
  });

  const ranked = rankPapersByRelevance(
    [excludedPaper, cleanPaper],
    'machine learning sepsis prediction NOT pediatric',
    { referenceYear: REF_YEAR }
  );

  assert.equal(ranked[0].paper.id, 'clean');
  assert.equal(ranked[1].breakdown.hasExcludedTermHit, true);
  assert.ok(ranked[0].breakdown.totalScore > ranked[1].breakdown.totalScore);
});

test('evidence hierarchy, metadata completeness, and Open Access PDF act as quality tie-breakers', () => {
  const highEvidence = makePaper({
    id: 'sr-oa',
    title: 'Telemedicine Interventions for Hypertension Control',
    abstractText:
      'Background: A systematic review and meta-analysis of randomized controlled trials evaluating telemedicine interventions for hypertension control across 4,200 patients.',
    doi: '10.1001/jama.2025.001',
    pdfUrl: 'https://example.org/hypertension-sr.pdf',
    isOpenAccess: true,
    publicationType: 'journal-article',
  });

  const sparseStub = makePaper({
    id: 'stub',
    title: 'Telemedicine Interventions for Hypertension Control',
    abstractText: null,
    doi: null,
    authors: [],
    pdfUrl: null,
    isOpenAccess: false,
    source: 'datacite',
    publicationType: 'dataset',
  });

  const ranked = rankPapersByRelevance(
    [sparseStub, highEvidence],
    'telemedicine hypertension control',
    { referenceYear: REF_YEAR }
  );

  assert.equal(ranked[0].paper.id, 'sr-oa');
  assert.ok(
    ranked[0].breakdown.qualityAccessScore > ranked[1].breakdown.qualityAccessScore
  );
});

test('PT->EN glossary bridge scores English papers for Portuguese academic queries', () => {
  const englishPaper = makePaper({
    id: 'en-ml',
    title: 'Machine Learning Approaches in Public Health Surveillance',
    abstractText: 'Systematic evaluation of machine learning pipelines in public health.',
  });

  const breakdown = computePaperRelevance(
    englishPaper,
    'aprendizado de máquina em saúde pública',
    { referenceYear: REF_YEAR }
  );

  assert.ok(breakdown.lexicalScore >= 50);
  assert.ok(breakdown.totalScore >= 40);
});

test('deduplicatePapersAdvanced preserves and merges sourceRanks across duplicate records', () => {
  const p1 = makePaper({
    id: 'oa-1',
    doi: '10.1038/s41586-025-0001-1',
    source: 'openalex',
    sourceRanks: { openalex: 3 },
  });
  const p2 = makePaper({
    id: 'pm-1',
    doi: '10.1038/s41586-025-0001-1',
    source: 'pubmed',
    sourceRanks: { pubmed: 1 },
  });

  const { papers } = deduplicatePapersAdvanced([p1, p2]);
  assert.equal(papers.length, 1);
  assert.deepEqual(papers[0].sources, ['openalex', 'pubmed']);
  assert.deepEqual(papers[0].sourceRanks, { openalex: 3, pubmed: 1 });
});
