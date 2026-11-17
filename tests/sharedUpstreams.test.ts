import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_PROXY_PROVIDERS,
  buildByokProxyPath,
  buildByokUpstreamSpec,
  buildDedicatedProxyPath,
  buildDedicatedUpstreamUrl,
  buildFreeProxyPath,
  buildFreeProxyUpstreamUrl,
  buildTranslateUpstreamUrl,
  isByokUpstreamProvider,
  isFreeProxyProvider,
  normalizeYearFrom,
} from '../shared/upstreams.mjs';

test('normalizeYearFrom ignores years at or below 1900 and non-numbers', () => {
  assert.equal(normalizeYearFrom('2020'), 2020);
  assert.equal(normalizeYearFrom(2019.7), 2019);
  assert.equal(normalizeYearFrom(1900), undefined);
  assert.equal(normalizeYearFrom('abc'), undefined);
  assert.equal(normalizeYearFrom(undefined), undefined);
});

test('every free proxy provider builds an https upstream URL carrying the query and limit', () => {
  for (const provider of FREE_PROXY_PROVIDERS) {
    const url = new URL(buildFreeProxyUpstreamUrl(provider, 'saúde & políticas', 8, 2021));
    assert.equal(url.protocol, 'https:');
    assert.ok(url.href.includes('8'), `${provider} lost the limit`);
    assert.ok(
      decodeURIComponent(url.href.replace(/\+/g, ' ')).includes('saúde & políticas'),
      `${provider} lost the query`
    );
    const path = buildFreeProxyPath(provider, 'saúde & políticas', 8, 2021);
    const params = new URL(path, 'https://cartographsearch.com').searchParams;
    assert.equal(params.get('provider'), provider);
    assert.equal(params.get('q'), 'saúde & políticas');
    assert.equal(params.get('yearFrom'), '2021');
  }
});

test('proxy and direct requests ask for the fields the parsers read (PLOS article_type, Oasisbr formats)', () => {
  assert.ok(buildFreeProxyUpstreamUrl('plos', 'x', 8).includes('article_type'));
  assert.ok(buildFreeProxyUpstreamUrl('oasisbr', 'x', 8).includes('field[]=formats'));
});

test('dedicated routes keep the parameter names their Vercel functions validate', () => {
  assert.equal(buildDedicatedProxyPath('arxiv', 'graph neural', 10), '/api/arxiv?q=graph%20neural&max_results=10');
  assert.equal(buildDedicatedProxyPath('osti', 'fusion', 8), '/api/osti?q=fusion&rows=8');
  assert.ok(buildDedicatedUpstreamUrl('zenodo', 'climate', 8).includes('sort=bestmatch'));
  assert.ok(buildDedicatedUpstreamUrl('ntrs', 'mars', 8).includes('page%5Bsize%5D=8'));
});

test('BYOK specs add User-Agent only when a server runtime asks for it', () => {
  const browser = buildByokUpstreamSpec('scopus', { query: 'ai', limit: 8, apiKey: 'k', instToken: 'tok' });
  assert.equal('User-Agent' in browser.headers, false);
  assert.equal(browser.headers['X-ELS-APIKey'], 'k');
  assert.equal(browser.headers['X-ELS-Insttoken'], 'tok');

  const server = buildByokUpstreamSpec('scopus', { query: 'ai', limit: 8, apiKey: 'k', userAgent: 'UA/1' });
  assert.equal(server.headers['User-Agent'], 'UA/1');
  assert.equal('X-ELS-Insttoken' in server.headers, false);
});

test('Lens BYOK request switches to a bool query when a year filter is present', () => {
  const plain = JSON.parse(buildByokUpstreamSpec('lens', { query: 'q', limit: 5, apiKey: 'k' }).body ?? '{}');
  assert.deepEqual(plain.query, { query_string: { query: 'q' } });
  const withYear = JSON.parse(
    buildByokUpstreamSpec('lens', { query: 'q', limit: 5, apiKey: 'k', yearFrom: 2020 }).body ?? '{}'
  );
  assert.deepEqual(withYear.query.bool.must[1], { range: { year_published: { gte: 2020 } } });
});

test('provider guards reject unknown names and path builders encode input', () => {
  assert.equal(isFreeProxyProvider('openaire'), true);
  assert.equal(isFreeProxyProvider('../../etc'), false);
  assert.equal(isByokUpstreamProvider('scopus'), true);
  assert.equal(isByokUpstreamProvider('openaire'), false);
  assert.equal(buildByokProxyPath('core', 'a&b', 8), '/api/byok-proxy?provider=core&q=a%26b&limit=8');
});

test('translate URL adds the MyMemory contact only when configured', () => {
  assert.equal(buildTranslateUpstreamUrl('olá', 'pt', 'en').includes('&de='), false);
  assert.ok(buildTranslateUpstreamUrl('olá', 'pt', 'en', ' ops@example.org ').includes('&de=ops%40example.org'));
});
