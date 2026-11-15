import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDoiProxyUrl,
  DEFAULT_INSTITUTIONAL_PROXY,
  rewriteUrlWithInstitutionalProxy,
} from '../src/utils/institutionalProxy.ts';
import type { InstitutionalProxyConfig } from '../src/types/academic.ts';

test('rewriteUrlWithInstitutionalProxy leaves URL untouched when disabled or model excluded', () => {
  const target = 'https://www.sciencedirect.com/search?qs=inflation';
  assert.equal(
    rewriteUrlWithInstitutionalProxy(target, DEFAULT_INSTITUTIONAL_PROXY, 'pago'),
    target
  );

  const enabled: InstitutionalProxyConfig = {
    enabled: true,
    mode: 'prefix',
    proxyTemplate: 'https://ezproxy.unicamp.br/login?url={url}',
    presetId: 'ezproxy-prefix',
    applyToModels: ['pago', 'aberto-institucional'],
  };

  assert.equal(
    rewriteUrlWithInstitutionalProxy(target, enabled, 'gratuito'),
    target
  );
  assert.equal(
    rewriteUrlWithInstitutionalProxy(target, enabled, 'freemium'),
    target
  );
});

test('rewriteUrlWithInstitutionalProxy handles EZProxy {url} template, simple prefix, and anti-double-proxy', () => {
  const target = 'https://www.scopus.com/results/results.uri?s=TITLE-ABS-KEY(gdp)';

  const templateConfig: InstitutionalProxyConfig = {
    enabled: true,
    mode: 'prefix',
    proxyTemplate: 'https://ezproxy.usp.br/login?url={url}',
    presetId: 'ezproxy-prefix',
    applyToModels: ['pago'],
  };

  const rewritten = rewriteUrlWithInstitutionalProxy(target, templateConfig, 'pago');
  assert.equal(
    rewritten,
    `https://ezproxy.usp.br/login?url=${encodeURIComponent(target)}`
  );

  // Already proxied URL must not be double-wrapped
  assert.equal(
    rewriteUrlWithInstitutionalProxy(rewritten, templateConfig, 'pago'),
    rewritten
  );

  const barePrefixConfig: InstitutionalProxyConfig = {
    enabled: true,
    mode: 'prefix',
    proxyTemplate: 'https://ezproxy.ufrj.br/login?qurl=',
    presetId: 'custom',
    applyToModels: ['pago'],
  };
  assert.equal(
    rewriteUrlWithInstitutionalProxy(target, barePrefixConfig, 'pago'),
    `https://ezproxy.ufrj.br/login?qurl=${encodeURIComponent(target)}`
  );
});

test('rewriteUrlWithInstitutionalProxy converts hostnames in CAPES CAFe suffix-domain mode', () => {
  const config: InstitutionalProxyConfig = {
    enabled: true,
    mode: 'suffix-domain',
    proxyTemplate: '.ez27.periodicos.capes.gov.br',
    presetId: 'capes-cafe',
    applyToModels: ['pago', 'aberto-institucional'],
  };

  const rewritten = rewriteUrlWithInstitutionalProxy(
    'https://www.sciencedirect.com/science/article/pii/S001',
    config,
    'pago'
  );
  assert.equal(
    rewritten,
    'https://www-sciencedirect-com.ez27.periodicos.capes.gov.br/science/article/pii/S001'
  );

  // Idempotent on already suffixed host
  assert.equal(rewriteUrlWithInstitutionalProxy(rewritten, config, 'pago'), rewritten);
});

test('rewriteUrlWithInstitutionalProxy blocks unsafe protocols and buildDoiProxyUrl normalizes DOI', () => {
  const config: InstitutionalProxyConfig = {
    enabled: true,
    mode: 'prefix',
    proxyTemplate: 'https://ezproxy.univ.edu/login?url={url}',
    presetId: 'ezproxy-prefix',
    applyToModels: ['pago'],
  };

  assert.equal(
    rewriteUrlWithInstitutionalProxy('javascript:alert(1)', config, 'pago'),
    'javascript:alert(1)'
  );

  const doiProxy = buildDoiProxyUrl('doi:10.1257/aer.20201234', config);
  assert.equal(
    doiProxy,
    'https://ezproxy.univ.edu/login?url=https%3A%2F%2Fdoi.org%2F10.1257%2Faer.20201234'
  );
  assert.equal(buildDoiProxyUrl(null, config), null);
});
