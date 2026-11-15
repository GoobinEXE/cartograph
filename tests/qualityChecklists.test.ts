import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOverallQuality,
  createEmptyQualityAppraisal,
  getQualityChecklistDefinition,
  getQualityRatingLabel,
  QUALITY_CHECKLISTS,
} from '../src/utils/qualityChecklists.ts';

test('QUALITY_CHECKLISTS covers RoB 2, JBI Quasi-Experimental, and CASP Qualitative with 5 domains each', () => {
  assert.equal(QUALITY_CHECKLISTS.rob2.criteria.length, 5);
  assert.equal(QUALITY_CHECKLISTS.jbi_quasi.criteria.length, 5);
  assert.equal(QUALITY_CHECKLISTS.casp_qual.criteria.length, 5);

  const enDef = getQualityChecklistDefinition('jbi_quasi', 'en');
  assert.match(enDef.title, /JBI/i);
  assert.equal(enDef.criteria.length, 5);
});

test('computeOverallQuality enforces worst-case Cochrane RoB aggregation deterministically', () => {
  const empty = createEmptyQualityAppraisal('rob2');
  assert.equal(empty.overall, 'unclear');

  assert.equal(
    computeOverallQuality({ d1: 'low', d2: 'low', d3: 'low' }),
    'low'
  );
  assert.equal(
    computeOverallQuality({ d1: 'low', d2: 'some_concerns', d3: 'low' }),
    'some_concerns'
  );
  assert.equal(
    computeOverallQuality({ d1: 'low', d2: 'unclear' }),
    'some_concerns'
  );
  assert.equal(
    computeOverallQuality({ d1: 'low', d2: 'some_concerns', d3: 'high' }),
    'high'
  );

  assert.match(getQualityRatingLabel('high', 'pt'), /Alto risco/i);
  assert.match(getQualityRatingLabel('low', 'en'), /Low risk/i);
});
