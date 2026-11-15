import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMeshInsertionTerm,
  suggestMeshTerms,
} from '../src/services/meshSuggest.ts';

test('suggestMeshTerms fetches esearch + esummary and normalizes headings gracefully', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    if (url.includes('esearch.fcgi')) {
      return {
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['68017211', '68000123'] } }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        result: {
          '68017211': {
            ds_meshterms: ['Telemedicine'],
            ds_scopenote: 'Delivery of health services via telecommunications.',
          },
          '68000123': {
            title: 'Remote Consultation',
            ds_scopenote: 'Consultation carried out remotely.',
          },
        },
      }),
    };
  }) as unknown as typeof fetch;

  try {
    const shortRes = await suggestMeshTerms('a');
    assert.equal(shortRes.ok, true);
    assert.equal(shortRes.terms.length, 0);

    const res = await suggestMeshTerms('telemedicine');
    assert.equal(res.ok, true);
    assert.equal(res.terms.length, 2);
    assert.equal(res.terms[0].heading, 'Telemedicine');
    assert.equal(res.terms[1].heading, 'Remote Consultation');
    assert.equal(formatMeshInsertionTerm('Tele "Health"'), '"Tele Health"');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('suggestMeshTerms degrades gracefully on HTTP failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    status: 503,
  })) as unknown as typeof fetch;

  try {
    const res = await suggestMeshTerms('hypertension');
    assert.equal(res.ok, false);
    assert.equal(res.terms.length, 0);
    assert.match(res.error || '', /503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
