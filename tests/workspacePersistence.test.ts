import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHydratedWorkspaceState } from '../src/state/workspace/workspaceHydration.ts';
import {
  bindFlushToPageLifecycle,
  connectWorkspacePersistence,
} from '../src/state/workspace/workspacePersistence.ts';
import { DEFAULT_SELECTED_PLATFORM_IDS } from '../src/state/workspace/workspaceState.ts';
import type { WorkspaceStorageEntry, WorkspaceStorageKey } from '../src/utils/storageEngine.ts';
import { createManualTimers, createTestWorkspace, makePaper } from './_workspaceFixtures.ts';

function createFakeEngine(records: Partial<Record<WorkspaceStorageKey, unknown>> = {}) {
  const batches: WorkspaceStorageEntry[][] = [];
  let releaseRead: () => void = () => undefined;
  const readGate = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  return {
    batches,
    releaseRead: () => releaseRead(),
    engine: {
      initAndMigrate: async () => ({ backend: 'indexeddb' as const, migratedKeys: 0 }),
      exportAllRawRecords: async () => {
        await readGate;
        return records;
      },
      setItems: async (entries: readonly WorkspaceStorageEntry[]) => {
        batches.push(entries.map(([key, value]) => [key, value]));
      },
    },
  };
}

const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

test('hydration drops a saved paper without title instead of crashing the library', () => {
  const { state, rejected } = buildHydratedWorkspaceState({
    savedPapers: [
      { id: 'p-broken' },
      {
        id: 'p-ok',
        title: 'Valid paper',
        authors: ['Ana Silva'],
        isRetracted: true,
        retractionNoticeUrl: 'https://retractionwatch.com/notice',
        sourceRanks: { openalex: 2, pubmed: -1 },
      },
      'not-an-object',
    ],
    libraryGroups: [{ id: 'g1', name: 'Group' }, { id: '', name: 'Nameless id' }],
    selectedPlatformIds: [],
    searchLogs: Array.from({ length: 120 }, (_, i) => ({ id: `log-${i}`, query: `q${i}` })),
    dedupOverrides: { splitPairs: ['a::b', 7] },
    customColumns: 'corrupted',
    activeSaveGroupId: 42,
  });

  assert.deepEqual(state.savedPapers.map((p) => p.id), ['p-ok']);
  assert.equal(state.savedPapers[0].isRetracted, true);
  assert.equal(state.savedPapers[0].retractionNoticeUrl, 'https://retractionwatch.com/notice');
  assert.deepEqual(state.savedPapers[0].sourceRanks, { openalex: 2 });
  assert.deepEqual(state.libraryGroups.map((g) => g.id), ['g1']);
  assert.deepEqual(state.selectedPlatformIds, [...DEFAULT_SELECTED_PLATFORM_IDS]);
  assert.equal(state.searchLogs.length, 100);
  assert.deepEqual(state.dedupOverrides, { splitPairs: ['a::b'] });
  assert.deepEqual(state.customColumns, []);
  assert.equal(state.activeSaveGroupId, null);
  assert.deepEqual(
    rejected.map((r) => [r.key, r.index]),
    [
      ['savedPapers', 0],
      ['savedPapers', 2],
      ['libraryGroups', 1],
      ['customColumns', null],
      ['activeSaveGroupId', null],
    ]
  );
});

test('actions dispatched before hydration are replayed on the stored library and persisted', async () => {
  const { store, actions } = createTestWorkspace();
  const clock = createManualTimers();
  const fake = createFakeEngine({
    savedPapers: [{ id: 'stored', title: 'Stored paper', authors: [] }],
    selectedPlatformIds: ['openalex'],
  });
  const persistence = connectWorkspacePersistence(store, fake.engine, { timers: clock.timers });

  const hydration = persistence.hydrate();
  actions.toggleSavePaper(makePaper({ id: 'early', title: 'Saved while loading' }));
  actions.togglePlatform('core');
  assert.equal(store.getSnapshot().hydrated, false);
  clock.advance(1000);
  assert.equal(fake.batches.length, 0, 'nothing is written before hydration');

  fake.releaseRead();
  await hydration;

  const state = store.getState();
  assert.equal(store.getSnapshot().hydrated, true);
  assert.deepEqual(state.savedPapers.map((p) => p.id), ['early', 'stored']);
  assert.deepEqual(state.selectedPlatformIds, ['openalex', 'core']);

  clock.advance(400);
  const writtenKeys = fake.batches.flat().map(([key]) => key).sort();
  assert.deepEqual(writtenKeys, ['savedPapers', 'selectedPlatformIds']);
});

test('a second hydrate call does not overwrite the hydrated store', () => {
  const { store, actions } = createTestWorkspace();
  store.hydrate(buildHydratedWorkspaceState({}).state);
  actions.toggleSavePaper(makePaper({ id: 'after' }));
  assert.equal(store.hydrate(buildHydratedWorkspaceState({}).state), false);
  assert.deepEqual(store.getState().savedPapers.map((p) => p.id), ['after']);
});

test('writes are debounced per key and flush sends pending keys in one batch', async () => {
  const { store, actions } = createTestWorkspace();
  const clock = createManualTimers();
  const fake = createFakeEngine();
  fake.releaseRead();
  const persistence = connectWorkspacePersistence(store, fake.engine, { timers: clock.timers, debounceMs: 400 });
  await persistence.hydrate();
  actions.importPapers([
    { ...makePaper({ id: 'p1' }), savedAt: '', researcherNotes: '', relevanceTag: 'media' },
  ]);
  clock.advance(400);
  fake.batches.length = 0;

  for (const notes of ['K', 'Ke', 'Key', 'Key s', 'Key study']) {
    actions.updateNotes('p1', notes);
    clock.advance(100);
  }
  assert.equal(fake.batches.length, 0, 'typing keeps postponing the write');
  clock.advance(300);
  assert.equal(fake.batches.length, 1);
  const [[key, value]] = fake.batches[0];
  assert.equal(key, 'savedPapers');
  assert.equal((value as Array<{ researcherNotes: string }>)[0].researcherNotes, 'Key study');

  actions.updateNotes('p1', 'Edited again');
  actions.setActiveSaveGroup('grp-x');
  assert.equal(clock.pendingCount, 2);
  await persistence.flush();
  assert.equal(clock.pendingCount, 0);
  assert.equal(fake.batches.length, 2);
  assert.deepEqual(fake.batches[1].map(([k]) => k).sort(), ['activeSaveGroupId', 'savedPapers']);
});

test('dispose flushes pending writes and ignores a hydration that finishes later', async () => {
  const { store, actions } = createTestWorkspace();
  const clock = createManualTimers();
  const fake = createFakeEngine({ savedPapers: [{ id: 'stored', title: 'Stored', authors: [] }] });
  const persistence = connectWorkspacePersistence(store, fake.engine, { timers: clock.timers });
  const hydration = persistence.hydrate();
  await persistence.dispose();
  fake.releaseRead();
  await hydration;
  assert.equal(store.getSnapshot().hydrated, false);

  const second = connectWorkspacePersistence(store, fake.engine, { timers: clock.timers });
  await second.hydrate();
  assert.deepEqual(store.getState().savedPapers.map((p) => p.id), ['stored']);
  actions.updateNotes('stored', 'note');
  await second.dispose();
  assert.equal(fake.batches.length, 1);
  assert.equal(fake.batches[0][0][0], 'savedPapers');
});

test('a failed read keeps the session usable without writing defaults over stored data', async () => {
  const { store, actions } = createTestWorkspace();
  const clock = createManualTimers();
  const errors: unknown[] = [];
  const batches: WorkspaceStorageEntry[][] = [];
  const persistence = connectWorkspacePersistence(
    store,
    {
      initAndMigrate: async () => ({ backend: 'indexeddb' as const, migratedKeys: 0 }),
      exportAllRawRecords: async () => {
        throw new Error('read failed');
      },
      setItems: async (entries) => {
        batches.push([...entries]);
      },
    },
    { timers: clock.timers, onError: (error) => errors.push(error) }
  );
  actions.togglePlatform('core');
  await persistence.hydrate();
  assert.equal(store.getSnapshot().hydrated, true);
  assert.ok(store.getState().selectedPlatformIds.includes('core'));
  actions.togglePlatform('lens');
  clock.advance(1000);
  await persistence.flush();
  assert.equal(batches.length, 0);
  assert.equal(errors.length, 1);
});

test('pagehide and visibilitychange to hidden trigger a flush', async () => {
  const listeners = new Map<string, () => void>();
  const target = {
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
  };
  const doc = { ...target, visibilityState: 'visible' as DocumentVisibilityState };
  let flushes = 0;
  const unbind = bindFlushToPageLifecycle(
    { flush: async () => { flushes += 1; } },
    { window: target, document: doc }
  );

  listeners.get('visibilitychange')?.();
  assert.equal(flushes, 0);
  doc.visibilityState = 'hidden';
  listeners.get('visibilitychange')?.();
  listeners.get('pagehide')?.();
  assert.equal(flushes, 2);
  unbind();
  assert.equal(listeners.size, 0);
  await flushMicrotasks();
});
