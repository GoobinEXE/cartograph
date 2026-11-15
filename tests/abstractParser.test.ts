import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSampleSize,
  detectStudyDesign,
  parseAbstractMetadata,
} from '../src/utils/abstractParser.ts';

test('parseAbstractMetadata extracts sections, sample size, and study design from structured abstracts', () => {
  const abstract =
    'Objective: Assess diagnostic accuracy of triage algorithms. Methods: A randomized controlled trial enrolled n = 1,450 patients across three hospitals. Results: Sensitivity reached 92.4%. Conclusion: Automated triage reduced wait times.';

  const parsed = parseAbstractMetadata(
    'Automated Triage in Emergency Care',
    abstract
  );

  assert.equal(parsed.hasStructuredAbstract, true);
  assert.match(parsed.objective || '', /diagnostic accuracy/i);
  assert.match(parsed.methods || '', /randomized controlled trial/i);
  assert.match(parsed.results || '', /92\.4%/);
  assert.match(parsed.conclusion || '', /wait times/i);
  assert.equal(parsed.sampleSize, 'N = 1,450');
  assert.ok(parsed.studyDesign, 'Study design should be detected');
});

test('extractSampleSize and detectStudyDesign handle unstructured abstracts', () => {
  assert.equal(extractSampleSize('A sample size of 240 participants was evaluated for 12 months.'), 'N = 240');
  assert.ok(detectStudyDesign('A systematic review and meta-analysis of LLM benchmarks'));
});
