import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_LOCAL_STORAGE_ALIASES,
  WORKSPACE_STORAGE_KEYS,
  createWorkspaceStorageEngine,
} from '../src/utils/storageEngine.ts';
import { createMemoryLocalStorage } from './_memoryStorage.ts';
import { createMemoryIdb } from './_memoryIdb.ts';

const LEGACY_SAVED_KEY = LEGACY_LOCAL_STORAGE_ALIASES.savedPapers?.[0] ?? '';
const LEGACY_PLATFORMS_KEY = LEGACY_LOCAL_STORAGE_ALIASES.selectedPlatformIds?.[0] ?? '';

test('migration copies pre-rename nexus_academico_* keys when the current key is absent', async () => {
  assert.equal(LEGACY_SAVED_KEY, 'nexus_academico_saved_papers_v2');
  assert.equal(LEGACY_PLATFORMS_KEY, 'nexus_academico_selected_platforms_v2');
  const ls = createMemoryLocalStorage({
    [LEGACY_SAVED_KEY]: JSON.stringify([{ id: 'old-1', title: 'Legacy Nexus paper' }]),
    [LEGACY_PLATFORMS_KEY]: JSON.stringify(['scielo']),
    [WORKSPACE_STORAGE_KEYS.libraryGroups]: JSON.stringify([{ id: 'g1', name: 'Current' }]),
  });
  const { idbFactory, backingStore } = createMemoryIdb();
  const engine = createWorkspaceStorageEngine({ idbFactory, localStorage: ls });

  const migration = await engine.initAndMigrate();
  assert.equal(migration.migratedKeys, 3);
  assert.deepEqual(backingStore.get('savedPapers'), [{ id: 'old-1', title: 'Legacy Nexus paper' }]);
  assert.deepEqual(backingStore.get('selectedPlatformIds'), ['scielo']);
});

test('the current key wins over its legacy alias', async () => {
  const ls = createMemoryLocalStorage({
    [WORKSPACE_STORAGE_KEYS.savedPapers]: JSON.stringify([{ id: 'new-1', title: 'Current' }]),
    [LEGACY_SAVED_KEY]: JSON.stringify([{ id: 'old-1', title: 'Legacy' }]),
  });
  const engine = createWorkspaceStorageEngine({ idbFactory: null, localStorage: ls });
  const papers = await engine.getItem<Array<{ id: string }>>('savedPapers', []);
  assert.equal(papers[0].id, 'new-1');
});

test('localStorage fallback reads legacy aliases when IndexedDB is unavailable', async () => {
  const ls = createMemoryLocalStorage({
    [LEGACY_PLATFORMS_KEY]: JSON.stringify(['openalex', 'scielo']),
  });
  const engine = createWorkspaceStorageEngine({ idbFactory: null, localStorage: ls });
  assert.deepEqual(await engine.getItem<string[]>('selectedPlatformIds', []), ['openalex', 'scielo']);
  const raw = await engine.exportAllRawRecords();
  assert.deepEqual(raw.selectedPlatformIds, ['openalex', 'scielo']);
});

test('a successful IndexedDB write no longer mirrors into localStorage and drops stale copies', async () => {
  const ls = createMemoryLocalStorage({
    [WORKSPACE_STORAGE_KEYS.savedPapers]: JSON.stringify([{ id: 'stale', title: 'Stale mirror' }]),
    [LEGACY_SAVED_KEY]: JSON.stringify([{ id: 'older', title: 'Older mirror' }]),
  });
  const { idbFactory, backingStore } = createMemoryIdb();
  const engine = createWorkspaceStorageEngine({ idbFactory, localStorage: ls });

  await engine.setItem('savedPapers', [{ id: 'fresh', title: 'Fresh' }]);
  await engine.setItem('activeSaveGroupId', 'grp-1');

  assert.deepEqual(backingStore.get('savedPapers'), [{ id: 'fresh', title: 'Fresh' }]);
  assert.equal(backingStore.get('activeSaveGroupId'), 'grp-1');
  assert.equal(ls.getItem(WORKSPACE_STORAGE_KEYS.savedPapers), null);
  assert.equal(ls.getItem(LEGACY_SAVED_KEY), null);
  assert.equal(ls.getItem(WORKSPACE_STORAGE_KEYS.activeSaveGroupId), null);
});

test('setItems writes every entry in one transaction opened synchronously after init', async () => {
  const { idbFactory, backingStore, stats } = createMemoryIdb();
  const engine = createWorkspaceStorageEngine({ idbFactory, localStorage: createMemoryLocalStorage() });
  await engine.initAndMigrate();
  const before = stats.readwriteTransactions;

  const pending = engine.setItems([
    ['savedPapers', [{ id: 'p1', title: 'One' }]],
    ['customColumns', [{ id: 'c1', label: 'Outcome' }]],
  ]);
  // No await yet: the transaction and its puts already happened inside the call.
  assert.equal(stats.readwriteTransactions, before + 1);
  assert.deepEqual(backingStore.get('customColumns'), [{ id: 'c1', label: 'Outcome' }]);
  await pending;
  assert.deepEqual(backingStore.get('savedPapers'), [{ id: 'p1', title: 'One' }]);
});

test('setItems falls back to localStorage when IndexedDB is unavailable', async () => {
  const ls = createMemoryLocalStorage();
  const engine = createWorkspaceStorageEngine({ idbFactory: null, localStorage: ls });
  await engine.setItems([
    ['searchLogs', [{ id: 'log-1', query: 'ml' }]],
    ['activeSaveGroupId', 'grp-2'],
  ]);
  assert.deepEqual(JSON.parse(ls.getItem(WORKSPACE_STORAGE_KEYS.searchLogs) ?? '[]'), [{ id: 'log-1', query: 'ml' }]);
  assert.equal(ls.getItem(WORKSPACE_STORAGE_KEYS.activeSaveGroupId), 'grp-2');
});
