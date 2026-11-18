import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  LAYOUT_STORAGE_KEYS,
  clearLayoutPreferences,
  syncThemeColorMeta,
} from '../src/utils/layoutPreferences.ts';
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

test('syncThemeColorMeta updates existing theme-color tags and removes media attribute', () => {
  interface MockMeta {
    attributes: Record<string, string>;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
  }

  function createMeta(initial: Record<string, string>): MockMeta {
    const attributes = { ...initial };
    return {
      attributes,
      getAttribute(name: string) {
        return name in attributes ? attributes[name] : null;
      },
      setAttribute(name: string, value: string) {
        attributes[name] = value;
      },
      removeAttribute(name: string) {
        delete attributes[name];
      },
    };
  }

  const darkTag = createMeta({ name: 'theme-color', content: '#090D16', media: '(prefers-color-scheme: dark)' });
  const lightTag = createMeta({ name: 'theme-color', content: '#F8FAFC', media: '(prefers-color-scheme: light)' });
  const appended: MockMeta[] = [];

  const originalDocument = globalThis.document;
  try {
    (globalThis as { document?: unknown }).document = {
      querySelectorAll(selector: string) {
        return selector === 'meta[name="theme-color"]' ? [darkTag, lightTag] : [];
      },
      head: {
        appendChild(node: MockMeta) {
          appended.push(node);
        },
      },
      createElement() {
        return createMeta({});
      },
    };

    syncThemeColorMeta('dark');
    assert.equal(darkTag.attributes.content, '#0E1015');
    assert.equal(lightTag.attributes.content, '#0E1015');
    assert.equal('media' in darkTag.attributes, false);
    assert.equal('media' in lightTag.attributes, false);
    assert.equal(appended.length, 0);

    syncThemeColorMeta('light');
    assert.equal(darkTag.attributes.content, '#FFFFFF');
    assert.equal(lightTag.attributes.content, '#FFFFFF');

    // When no meta[name="theme-color"] exists, creates and appends one.
    (globalThis as { document?: unknown }).document = {
      querySelectorAll() {
        return [];
      },
      head: {
        appendChild(node: MockMeta) {
          appended.push(node);
        },
      },
      createElement() {
        return createMeta({});
      },
    };
    syncThemeColorMeta('dark');
    assert.equal(appended.length, 1);
    assert.equal(appended[0].attributes.name, 'theme-color');
    assert.equal(appended[0].attributes.content, '#0E1015');
  } finally {
    (globalThis as { document?: unknown }).document = originalDocument;
  }
});
