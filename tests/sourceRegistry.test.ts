import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  API_SOURCE_REGISTRY,
  BYOK_FEDERATED_SOURCE_COUNT,
  OPEN_FEDERATED_SOURCE_COUNT,
  TOTAL_FEDERATED_SOURCE_COUNT,
} from '../src/data/apiSources.ts';
import { API_SOURCE_DOCS } from '../src/data/apiSourceDocs.ts';
import { BYOK_PROVIDERS } from '../src/data/byokProviders.ts';
import { SOURCE_RUNNERS } from '../src/services/sourceRunners.ts';
import { planFederatedSources } from '../src/services/academicAggregator.ts';
import {
  BYOK_UPSTREAM_PROVIDERS,
  DEDICATED_PROXY_ROUTES,
  FREE_PROXY_PROVIDERS,
} from '../shared/upstreams.mjs';
import type { ApiSourceId, UserAccessConfig } from '../src/types/academic.ts';

const registryIds = Object.keys(API_SOURCE_REGISTRY).sort();

test('every registry source has a runner and About documentation, and nothing else does', () => {
  assert.deepEqual(Object.keys(SOURCE_RUNNERS).sort(), registryIds);
  assert.deepEqual(Object.keys(API_SOURCE_DOCS).sort(), registryIds);
  for (const id of registryIds as ApiSourceId[]) {
    assert.equal(API_SOURCE_REGISTRY[id].id, id, `registry key/id mismatch: ${id}`);
  }
});

test('registry transport matches the proxy routes the server actually exposes', () => {
  const proxied = Object.values(API_SOURCE_REGISTRY)
    .filter((meta) => meta.transport === 'proxy')
    .map((meta) => meta.id)
    .sort();
  const served = [...FREE_PROXY_PROVIDERS, ...Object.keys(DEDICATED_PROXY_ROUTES)].sort();
  assert.deepEqual(proxied, served);
});

test('BYOK registry, credential providers and the BYOK proxy agree on one provider set', () => {
  const upstream = [...BYOK_UPSTREAM_PROVIDERS].sort();
  assert.deepEqual(BYOK_PROVIDERS.map((p) => p.id).sort(), upstream);
  for (const meta of Object.values(API_SOURCE_REGISTRY)) {
    if (meta.transport === 'byok') {
      assert.equal(meta.requiresByok, true, `${meta.id} is byok transport but not requiresByok`);
      assert.equal(meta.byokProviderId, meta.id);
    }
    if (meta.byokProviderId) {
      assert.ok(upstream.includes(meta.byokProviderId), `${meta.id} points to unknown BYOK provider`);
    }
  }
});

test('derived source counts add up', () => {
  assert.equal(OPEN_FEDERATED_SOURCE_COUNT + BYOK_FEDERATED_SOURCE_COUNT, TOTAL_FEDERATED_SOURCE_COUNT);
  assert.equal(TOTAL_FEDERATED_SOURCE_COUNT, registryIds.length);
});

function accessConfigWith(keys: UserAccessConfig['byokKeys']): UserAccessConfig {
  return {
    institutionalProxy: {
      enabled: false,
      mode: 'prefix',
      proxyTemplate: '',
      presetId: 'custom',
      applyToModels: ['pago'],
    },
    ownedPlatformIds: [],
    byokKeys: keys,
  };
}

test('planFederatedSources runs every open source without keys and no BYOK-only source', () => {
  const plan = planFederatedSources('all');
  assert.equal(plan.length, OPEN_FEDERATED_SOURCE_COUNT);
  assert.equal(plan.some((s) => API_SOURCE_REGISTRY[s.id].requiresByok), false);
  assert.equal(plan.every((s) => s.credential === null), true);
  assert.deepEqual(
    plan.map((s) => s.id),
    Object.values(API_SOURCE_REGISTRY)
      .filter((m) => !m.requiresByok)
      .map((m) => m.id),
    'plan must keep registry order'
  );
});

test('planFederatedSources adds BYOK sources only with an enabled key and labels optional keys', () => {
  const plan = planFederatedSources(
    'all',
    accessConfigWith({
      scopus: { apiKey: 'k-scopus', enabled: true },
      ieeexplore: { apiKey: 'k-ieee', enabled: false },
      semanticscholar: { apiKey: 'k-s2', enabled: true },
    })
  );
  const byId = new Map(plan.map((s) => [s.id, s]));
  assert.equal(byId.get('scopus')?.credential?.apiKey, 'k-scopus');
  assert.equal(byId.has('ieeexplore'), false, 'disabled key must not schedule the source');
  assert.equal(byId.get('semanticscholar')?.label, 'Semantic Scholar (Key)');
  assert.equal(byId.get('scopus')?.label, 'Scopus (Elsevier)');
});

test('planFederatedSources respects the thematic scope', () => {
  const health = planFederatedSources('health').map((s) => s.id);
  assert.ok(health.includes('pubmed'));
  assert.equal(health.includes('ipea'), false);
  const econ = planFederatedSources('econ-policy').map((s) => s.id);
  assert.ok(econ.includes('ipea'));
  assert.equal(econ.includes('pubmed'), false);
});

function listFiles(dir: string, pattern: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full, pattern);
    return pattern.test(name) ? [full] : [];
  });
}

test('no hardcoded source or platform totals remain in code or static files', () => {
  const root = process.cwd();
  const files = [
    ...listFiles(join(root, 'src'), /\.(ts|tsx)$/),
    join(root, 'index.html'),
    join(root, 'public', '404.html'),
    join(root, 'public', 'site.webmanifest'),
    join(root, 'public', 'og-image.svg'),
  ];
  const stale = /\b(15|111|128|27|34)\s+(APIs?|open|abertas|fontes|plataformas|platforms|Plataformas|Platforms)\b/;
  const offenders = files
    .filter((file) => stale.test(readFileSync(file, 'utf8')))
    .map((file) => relative(root, file));
  assert.deepEqual(offenders, []);
});
