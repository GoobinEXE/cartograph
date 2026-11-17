import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceReducer } from '../src/state/workspace/workspaceReducer.ts';
import { createInitialWorkspaceState, UNGROUPED_SLOT } from '../src/state/workspace/workspaceState.ts';
import type { CartographBackupPayload } from '../src/utils/workspaceBackup.ts';
import { createTestWorkspace, makePaper, makeSaved } from './_workspaceFixtures.ts';

test('toggleSavePaper saves into the active group, then unsaves on the second call', () => {
  const { store, actions, tracked } = createTestWorkspace();
  actions.setActiveSaveGroup('grp-a');
  const paper = makePaper({ id: 'p1', abstractText: 'Methods: randomized controlled trial with 120 participants.' });

  actions.toggleSavePaper(paper);
  const saved = store.getState().savedPapers;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].groupId, 'grp-a');
  assert.equal(saved[0].savedAt, '2026-03-04T05:06:07.000Z');
  assert.equal(saved[0].screeningStatus, 'unscreened');
  assert.equal(saved[0].relevanceTag, 'alta');
  assert.ok(saved[0].extractedMetadata);
  assert.deepEqual(tracked, [{ event: 'paper_saved', params: { source_api: 'openalex' } }]);

  actions.toggleSavePaper(paper);
  assert.equal(store.getState().savedPapers.length, 0);
  assert.equal(tracked.length, 1, 'unsaving is not tracked as a save');
});

test('an explicit null target saves without group even when a save group is active', () => {
  const { store, actions } = createTestWorkspace();
  actions.setActiveSaveGroup('grp-a');
  actions.toggleSavePaper(makePaper({ id: 'p1' }), null);
  assert.equal(store.getState().savedPapers[0].groupId, null);
});

test('screening keeps the exclusion reason only while excluded', () => {
  const { store, actions } = createTestWorkspace();
  actions.toggleSavePaper(makePaper({ id: 'p1' }));

  actions.updateScreening('p1', 'excluded', 'desenho_incompativel');
  assert.equal(store.getState().savedPapers[0].screeningStatus, 'excluded');
  assert.equal(store.getState().savedPapers[0].exclusionReason, 'desenho_incompativel');

  actions.updateScreening('p1', 'included', 'desenho_incompativel');
  assert.equal(store.getState().savedPapers[0].screeningStatus, 'included');
  assert.equal(store.getState().savedPapers[0].exclusionReason, undefined);
});

test('notes, relevance, custom fields and group assignment update one paper', () => {
  const { store, actions } = createTestWorkspace();
  actions.importPapers([makeSaved({ id: 'p1', title: 'First' }), makeSaved({ id: 'p2', title: 'Second paper' })]);

  actions.updateNotes('p1', 'Key comparator study');
  actions.updateRelevance('p1', 'revisar');
  actions.updateCustomField('p1', 'outcome', 'Mortality');
  actions.assignPaperGroup('p2', 'grp-b');

  const [p1, p2] = ['p1', 'p2'].map((id) => store.getState().savedPapers.find((p) => p.id === id));
  assert.equal(p1?.researcherNotes, 'Key comparator study');
  assert.equal(p1?.relevanceTag, 'revisar');
  assert.deepEqual(p1?.customFields, { outcome: 'Mortality' });
  assert.equal(p2?.groupId, 'grp-b');
  assert.equal(p2?.researcherNotes, '');
});

test('an update for an unknown paper returns the same state object', () => {
  const state = createInitialWorkspaceState();
  assert.equal(workspaceReducer(state, { type: 'paper/setNotes', paperId: 'missing', notes: 'x' }), state);
  assert.equal(workspaceReducer(state, { type: 'paper/remove', paperId: 'missing' }), state);
});

test('deleting a group moves its papers to ungrouped and clears the active save group', () => {
  const { store, actions } = createTestWorkspace();
  const group = actions.createGroup('  Health economics  ', '#AEB932');
  assert.equal(group.name, 'Health economics');
  assert.equal(group.id, 'grp-1772600767000-r1');
  actions.setActiveSaveGroup(group.id);
  actions.toggleSavePaper(makePaper({ id: 'p1' }));
  actions.toggleSavePaper(makePaper({ id: 'p2', title: 'Unrelated second study' }), null);

  actions.deleteGroup(group.id);
  const state = store.getState();
  assert.deepEqual(state.libraryGroups, []);
  assert.equal(state.activeSaveGroupId, null);
  assert.deepEqual(
    state.savedPapers.map((p) => [p.id, p.groupId]),
    [
      ['p2', null],
      ['p1', null],
    ]
  );
});

test('renaming ignores blank names and clearing the ungrouped slot keeps grouped papers', () => {
  const { store, actions } = createTestWorkspace();
  const group = actions.createGroup('Trials');
  actions.renameGroup(group.id, '   ');
  assert.equal(store.getState().libraryGroups[0].name, 'Trials');
  actions.renameGroup(group.id, 'RCTs');
  assert.equal(store.getState().libraryGroups[0].name, 'RCTs');

  actions.importPapers([
    makeSaved({ id: 'in-group', title: 'Randomized trial of school meals', groupId: group.id }),
    makeSaved({ id: 'orphan', title: 'Orphan record pointing at a deleted group', groupId: 'grp-gone' }),
    makeSaved({ id: 'loose', title: 'Cohort of coastal fisheries', groupId: null }),
  ]);
  actions.clearLibrary(UNGROUPED_SLOT);
  assert.deepEqual(store.getState().savedPapers.map((p) => p.id), ['in-group']);
});

test('import skips duplicates through the identity rule, including inside the batch', () => {
  const { store, actions } = createTestWorkspace();
  actions.importPapers([
    makeSaved({ id: 'lib-1', title: 'Synthetic Controls in Municipal Finance', doi: '10.1000/SC.1', year: 2020 }),
  ]);
  actions.setActiveSaveGroup('grp-target');

  const result = actions.importPapers([
    makeSaved({ id: 'bib-1', title: 'Another title entirely', doi: 'https://doi.org/10.1000/sc.1' }),
    makeSaved({ id: 'bib-2', title: 'Synthetic controls in municipal finance.', year: 2021 }),
    makeSaved({ id: 'bib-3', title: 'Coral Reef Bleaching Under Ocean Warming', year: 2022 }),
    makeSaved({ id: 'bib-4', title: 'Coral reef bleaching under ocean warming', year: 2022 }),
  ]);

  assert.deepEqual(result, { added: 1, skippedDuplicates: 3 });
  const [first] = store.getState().savedPapers;
  assert.equal(first.id, 'bib-3');
  assert.equal(first.groupId, 'grp-target');
  assert.equal(store.getState().savedPapers.length, 2);
});

function makeBackup(overrides: Partial<CartographBackupPayload> = {}): CartographBackupPayload {
  return {
    schema: 'cartograph-backup-v2',
    exportedAt: '2026-02-01T00:00:00.000Z',
    version: '2.4.0',
    savedPapers: [],
    groups: [],
    selectedPlatformIds: [],
    activeSaveGroupId: null,
    ...overrides,
  };
}

test('backup merge appends unseen groups, logs and columns and imports papers without group fallback', () => {
  const { store, actions } = createTestWorkspace();
  actions.createGroup('Existing');
  actions.setActiveSaveGroup(store.getState().libraryGroups[0].id);
  actions.importPapers([makeSaved({ id: 'shared', title: 'Shared study', doi: '10.1/shared', groupId: null })], null);
  actions.appendSearchLog({
    id: 'log-local',
    executedAt: '2026-01-01T00:00:00.000Z',
    query: 'local',
    yearFrom: null,
    scope: 'all',
    dedupEnabled: true,
    totalRaw: 1,
    totalUnique: 1,
    bySource: {},
  });
  actions.splitMergePair('b', 'a');

  const result = actions.restoreBackup(
    makeBackup({
      groups: [
        { id: 'grp-new', name: 'Imported', color: '#1a73e8', createdAt: '2026-01-01T00:00:00.000Z' },
        ...store.getState().libraryGroups,
      ],
      savedPapers: [
        makeSaved({ id: 'shared-copy', title: 'Shared study', doi: '10.1/SHARED' }),
        makeSaved({ id: 'fresh', title: 'Fresh study from the backup', groupId: null }),
      ],
      selectedPlatformIds: ['openalex', 'core'],
      searchLogs: [
        { id: 'log-local', executedAt: '', query: 'dup', yearFrom: null, scope: 'all', dedupEnabled: true, totalRaw: 0, totalUnique: 0, bySource: {} },
        { id: 'log-remote', executedAt: '', query: 'remote', yearFrom: null, scope: 'all', dedupEnabled: true, totalRaw: 0, totalUnique: 0, bySource: {} },
      ],
      dedupOverrides: { splitPairs: ['a::b', 'c::d'] },
      customColumns: [{ id: 'outcome', label: 'Outcome' }],
    }),
    'merge'
  );

  assert.deepEqual(result, { papersAdded: 1, groupsAdded: 1 });
  const state = store.getState();
  assert.equal(state.savedPapers[0].id, 'fresh');
  assert.equal(state.savedPapers[0].groupId, null, 'merge never assigns the active save group');
  assert.deepEqual(state.libraryGroups.map((g) => g.name), ['Existing', 'Imported']);
  assert.ok(state.selectedPlatformIds.includes('core'));
  assert.ok(state.selectedPlatformIds.includes('scholar'), 'merge keeps the current selection');
  assert.deepEqual(state.searchLogs.map((l) => l.id), ['log-local', 'log-remote']);
  assert.deepEqual(state.dedupOverrides.splitPairs, ['a::b', 'c::d']);
  assert.deepEqual(state.customColumns, [{ id: 'outcome', label: 'Outcome' }]);
});

test('backup replace swaps the library and keeps the selection when the backup has none', () => {
  const { store, actions } = createTestWorkspace();
  actions.importPapers([makeSaved({ id: 'old', title: 'Old library paper' })]);
  actions.setCustomColumns([{ id: 'keep', label: 'Keep' }]);
  const selectionBefore = store.getState().selectedPlatformIds;

  const result = actions.restoreBackup(
    makeBackup({
      savedPapers: [makeSaved({ id: 'new-1', title: 'Restored one' }), makeSaved({ id: 'new-2', title: 'Restored two' })],
      groups: [{ id: 'grp-r', name: 'Restored', color: '#1a73e8', createdAt: '2026-01-01T00:00:00.000Z' }],
      activeSaveGroupId: 'grp-r',
    }),
    'replace'
  );

  assert.deepEqual(result, { papersAdded: 2, groupsAdded: 1 });
  const state = store.getState();
  assert.deepEqual(state.savedPapers.map((p) => p.id), ['new-1', 'new-2']);
  assert.equal(state.activeSaveGroupId, 'grp-r');
  assert.equal(state.selectedPlatformIds, selectionBefore);
  assert.deepEqual(state.customColumns, [{ id: 'keep', label: 'Keep' }]);
});

test('linking a preprint folds it into the published record', () => {
  const { store, actions } = createTestWorkspace();
  actions.importPapers([
    makeSaved({ id: 'pub', title: 'Published version', researcherNotes: 'Journal notes' }),
    makeSaved({
      id: 'pre',
      title: 'Preprint version with another wording',
      source: 'arxiv',
      url: 'https://arxiv.org/abs/2401.00001',
      pdfUrl: 'https://arxiv.org/pdf/2401.00001',
      researcherNotes: 'Preprint notes',
      year: 2023,
    }),
  ]);
  actions.linkRelatedPaper('pub', 'pre');
  const state = store.getState();
  assert.deepEqual(state.savedPapers.map((p) => p.id), ['pub']);
  const target = state.savedPapers[0];
  assert.equal(target.researcherNotes, 'Journal notes\n\nPreprint notes');
  assert.equal(target.pdfUrl, 'https://arxiv.org/pdf/2401.00001');
  assert.deepEqual(
    target.relatedUrls?.map((r) => [r.kind, r.label]),
    [
      ['preprint', 'ARXIV (2023)'],
      ['preprint', 'ARXIV PDF'],
    ]
  );
});

test('presets add all portals and remove only those no other active preset needs', () => {
  const { store, actions } = createTestWorkspace();
  actions.setSelectedPlatformIds([]);
  const presets = [
    { id: 'health', platformIds: ['pubmed', 'scielo'] },
    { id: 'latam', platformIds: ['scielo', 'redalyc'] },
  ];
  actions.togglePreset(presets[0], presets);
  actions.togglePreset(presets[1], presets);
  assert.deepEqual(store.getState().selectedPlatformIds, ['pubmed', 'scielo', 'redalyc']);
  actions.togglePreset(presets[0], presets);
  assert.deepEqual(store.getState().selectedPlatformIds, ['scielo', 'redalyc']);
});

test('search logs keep the newest 100 entries and split pairs are not duplicated', () => {
  const { store, actions } = createTestWorkspace();
  for (let i = 0; i < 105; i += 1) {
    actions.appendSearchLog({
      id: `log-${i}`,
      executedAt: '',
      query: `q${i}`,
      yearFrom: null,
      scope: 'all',
      dedupEnabled: true,
      totalRaw: 0,
      totalUnique: 0,
      bySource: {},
    });
  }
  assert.equal(store.getState().searchLogs.length, 100);
  assert.equal(store.getState().searchLogs[0].id, 'log-104');

  actions.splitMergePair('z', 'a');
  const overrides = store.getState().dedupOverrides;
  actions.splitMergePair('a', 'z');
  assert.equal(store.getState().dedupOverrides, overrides);
  assert.deepEqual(overrides.splitPairs, ['a::z']);
});
