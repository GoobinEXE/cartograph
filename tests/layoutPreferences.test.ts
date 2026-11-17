import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LAYOUT_STORAGE_KEYS, clearLayoutPreferences } from '../src/utils/layoutPreferences.ts';
import { WORKSPACE_STORAGE_KEYS } from '../src/utils/storageEngine.ts';
import { STORAGE_KEY_USER_ACCESS_CONFIG } from '../src/utils/accessConfig.ts';
import { createMemoryLocalStorage } from './_memoryStorage.ts';

test('clearLayoutPreferences removes every layout key and keeps research data and access config', () => {
  const initial: Record<string, string> = {
    [WORKSPACE_STORAGE_KEYS.savedPapers]: '[]',
    [WORKSPACE_STORAGE_KEYS.libraryGroups]: '[]',
    [STORAGE_KEY_USER_ACCESS_CONFIG]: '{}',
  };
  for (const key of Object.values(LAYOUT_STORAGE_KEYS)) {
    initial[key] = '{"sort":false}';
  }
  const ls = createMemoryLocalStorage(initial);

  clearLayoutPreferences(ls);

  for (const key of Object.values(LAYOUT_STORAGE_KEYS)) {
    assert.equal(ls.getItem(key), null, `layout key survived reset: ${key}`);
  }
  assert.equal(ls.getItem(WORKSPACE_STORAGE_KEYS.savedPapers), '[]');
  assert.equal(ls.getItem(WORKSPACE_STORAGE_KEYS.libraryGroups), '[]');
  assert.equal(ls.getItem(STORAGE_KEY_USER_ACCESS_CONFIG), '{}');
});

test('clearLayoutPreferences tolerates missing or throwing storage', () => {
  clearLayoutPreferences(null);
  clearLayoutPreferences({
    removeItem() {
      throw new Error('SecurityError');
    },
  });
});

test('layout keys never collide with workspace or access-config keys', () => {
  const protectedKeys = new Set<string>([
    ...Object.values(WORKSPACE_STORAGE_KEYS),
    STORAGE_KEY_USER_ACCESS_CONFIG,
  ]);
  for (const key of Object.values(LAYOUT_STORAGE_KEYS)) {
    assert.equal(protectedKeys.has(key), false, `layout key collides with protected key: ${key}`);
  }
});

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

test('drawer and theme storage keys are declared only in layoutPreferences.ts', () => {
  const srcDir = join(process.cwd(), 'src');
  const literal = /['"`]cartograph_(?:[a-z]+_)*(?:drawers|theme)_v\d+['"`]/;
  const offenders = listSourceFiles(srcDir)
    .filter((file) => !file.endsWith(join('utils', 'layoutPreferences.ts')))
    .filter((file) => literal.test(readFileSync(file, 'utf8')))
    .map((file) => relative(process.cwd(), file));
  assert.deepEqual(offenders, []);
});
