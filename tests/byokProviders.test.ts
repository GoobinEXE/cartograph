import test from 'node:test';
import assert from 'node:assert/strict';
import { BYOK_PROVIDERS, BYOK_PROVIDER_MAP } from '../src/data/byokProviders.ts';
import { API_SOURCE_REGISTRY, sourceMatchesScope } from '../src/data/apiSources.ts';
import {
  buildByokCacheSignature,
  createDefaultUserAccessConfig,
  getActiveByokEntry,
  sanitizeUserAccessConfig,
} from '../src/utils/accessConfig.ts';

test('BYOK_PROVIDERS map cleanly to valid ApiSourceId entries', () => {
  assert.equal(BYOK_PROVIDERS.length, 9);
  for (const spec of BYOK_PROVIDERS) {
    assert.ok(BYOK_PROVIDER_MAP[spec.id], `Missing provider map entry for ${spec.id}`);
    assert.ok(API_SOURCE_REGISTRY[spec.targetSourceId], `Unknown source ${spec.targetSourceId}`);
    assert.ok(spec.docsUrl.startsWith('https://'));
  }
});

test('sanitizeUserAccessConfig normalizes unknown keys, invalid modes, and disabled entries', () => {
  const sanitized = sanitizeUserAccessConfig({
    institutionalProxy: {
      enabled: true,
      mode: 'suffix-domain',
      proxyTemplate: '  .ez10.periodicos.capes.gov.br ',
      presetId: 'capes-cafe',
      applyToModels: ['pago', 'invalid-model'],
    },
    ownedPlatformIds: ['scopus', 'scopus', '', 123],
    byokKeys: {
      scopus: { apiKey: ' elsevier-key ', secondaryToken: ' inst-tok ', enabled: true },
      unknown_provider: { apiKey: 'hack', enabled: true },
      core: { apiKey: '   ', enabled: true },
    },
  });

  assert.equal(sanitized.institutionalProxy.enabled, true);
  assert.equal(sanitized.institutionalProxy.mode, 'suffix-domain');
  assert.equal(sanitized.institutionalProxy.proxyTemplate, '.ez10.periodicos.capes.gov.br');
  assert.deepEqual(sanitized.institutionalProxy.applyToModels, ['pago']);
  assert.deepEqual(sanitized.ownedPlatformIds, ['scopus']);
  assert.equal(sanitized.byokKeys.scopus?.apiKey, 'elsevier-key');
  assert.equal(sanitized.byokKeys.scopus?.secondaryToken, 'inst-tok');
  assert.equal('core' in sanitized.byokKeys, false);
});

test('buildByokCacheSignature changes when active BYOK keys change', () => {
  const base = createDefaultUserAccessConfig();
  assert.equal(buildByokCacheSignature(base), 'no-byok');
  assert.equal(getActiveByokEntry(base, 'scopus'), null);

  const withScopus = sanitizeUserAccessConfig({
    ...base,
    byokKeys: {
      scopus: { apiKey: 'abc12345', enabled: true },
    },
  });
  const sig1 = buildByokCacheSignature(withScopus);
  assert.notEqual(sig1, 'no-byok');

  const withScopusAndInst = sanitizeUserAccessConfig({
    ...base,
    byokKeys: {
      scopus: { apiKey: 'abc12345', secondaryToken: 'inst-99', enabled: true },
    },
  });
  assert.notEqual(buildByokCacheSignature(withScopusAndInst), sig1);
});

test('sourceMatchesScope routes econ-policy and health sources properly', () => {
  assert.equal(sourceMatchesScope('worldbank_wds', 'econ-policy'), true);
  assert.equal(sourceMatchesScope('ipea', 'econ-policy'), true);
  assert.equal(sourceMatchesScope('worldbank_wds', 'health'), false);
  assert.equal(sourceMatchesScope('pubmed', 'health'), true);
  assert.equal(sourceMatchesScope('openaire', 'general'), true);
  assert.equal(sourceMatchesScope('ieeexplore', 'exact-tech'), true);
});
