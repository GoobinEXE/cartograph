import test from 'node:test';
import assert from 'node:assert/strict';
import { LAUNCH_PRESETS, PLATFORMS } from '../src/data/platforms.ts';
import { API_SOURCE_AUTHORITY_WEIGHTS, API_SOURCE_REGISTRY } from '../src/data/apiSources.ts';

test('PLATFORMS catalog maintains unique IDs, valid HTTPS/HTTP URLs, and broad economics coverage', () => {
  assert.equal(PLATFORMS.length, 128);

  const seenIds = new Set<string>();
  let econPolicyCount = 0;

  for (const platform of PLATFORMS) {
    assert.equal(seenIds.has(platform.id), false, `Duplicate platform id: ${platform.id}`);
    seenIds.add(platform.id);

    const sampleUrl = platform.buildUrl('monetary%20policy', 'monetary policy', 2020);
    assert.ok(
      sampleUrl.startsWith('https://') || sampleUrl.startsWith('http://'),
      `Invalid buildUrl output for ${platform.id}: ${sampleUrl}`
    );

    if (platform.thematicAreas.includes('economia-politicas')) {
      econPolicyCount++;
    }
  }

  assert.ok(econPolicyCount >= 25, `Expected expanded economia-politicas coverage, got ${econPolicyCount}`);
});

test('LAUNCH_PRESETS reference only valid platform IDs and include new economics presets', () => {
  const validIds = new Set(PLATFORMS.map((p) => p.id));
  const presetIds = new Set<string>();

  for (const preset of LAUNCH_PRESETS) {
    assert.equal(presetIds.has(preset.id), false, `Duplicate preset id: ${preset.id}`);
    presetIds.add(preset.id);
    assert.ok(preset.platformIds.length > 0, `Empty preset: ${preset.id}`);

    for (const pid of preset.platformIds) {
      assert.ok(validIds.has(pid), `Preset ${preset.id} references unknown platform ${pid}`);
    }
  }

  assert.equal(presetIds.has('econ-empirical'), true);
  assert.equal(presetIds.has('econ-global-policy'), true);
  assert.equal(presetIds.has('econ-political-science'), true);
});

test('API_SOURCE_REGISTRY and API_SOURCE_AUTHORITY_WEIGHTS cover all 34 federated sources', () => {
  const keys = Object.keys(API_SOURCE_REGISTRY);
  assert.equal(keys.length, 34);
  for (const key of keys) {
    const weight = API_SOURCE_AUTHORITY_WEIGHTS[key as keyof typeof API_SOURCE_AUTHORITY_WEIGHTS];
    assert.ok(typeof weight === 'number' && weight > 0, `Invalid authority weight for ${key}`);
  }
});
