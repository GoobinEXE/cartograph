import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARTOGRAPH_BACKUP_SCHEMA,
  CARTOGRAPH_BACKUP_SCHEMA_V2,
  buildEmergencyBackupFromRecords,
  exportWorkspaceBackup,
  parseWorkspaceBackup,
  type CartographEmergencyBackup,
} from '../src/utils/workspaceBackup.ts';
import { STORAGE_KEY_USER_ACCESS_CONFIG } from '../src/utils/accessConfig.ts';
import { WORKSPACE_STORAGE_KEYS, createWorkspaceStorageEngine } from '../src/utils/storageEngine.ts';
import type { LibraryGroup, SavedPaperItem } from '../src/types/academic.ts';
import { createMemoryLocalStorage } from './_memoryStorage.ts';

const SECRET_MARKERS = ['byokKeys', 'apiKey', 'secondaryToken', 'proxyTemplate', 'sk-test-SECRET', 'INST-TOKEN-SECRET'];

test('exportWorkspaceBackup and parseWorkspaceBackup round-trip groups, papers, and sanitize URLs', () => {
  const groups: LibraryGroup[] = [
    {
      id: 'grp-ia',
      name: 'IA em Saúde',
      color: '#1a73e8',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  const savedPapers: SavedPaperItem[] = [
    {
      id: 'p-1',
      title: 'Clinical Triage Models',
      authors: ['Ana Silva'],
      year: 2025,
      venue: 'Lancet Digital',
      doi: '10.1016/test',
      url: 'javascript:alert(1)',
      pdfUrl: 'https://example.org/p1.pdf',
      isOpenAccess: true,
      citationCount: 12,
      abstractText: 'Objective: Evaluate triage.',
      source: 'openalex',
      sourceLabel: 'OpenAlex',
      savedAt: '2026-01-02T00:00:00.000Z',
      researcherNotes: 'Key paper',
      relevanceTag: 'alta',
      screeningStatus: 'included',
      groupId: 'grp-ia',
      relatedUrls: [
        { label: 'arXiv Preprint', url: 'https://arxiv.org/abs/2501.00001', kind: 'preprint' },
        { label: 'Bad JS URL', url: 'javascript:alert(2)', kind: 'supplementary' },
      ],
    },
  ];

  const json = exportWorkspaceBackup({
    savedPapers,
    groups,
    selectedPlatformIds: ['openalex', 'pubmed'],
    activeSaveGroupId: 'grp-ia',
    ownedPlatformIds: ['scopus', 'sciencedirect'],
  });

  // Never leak BYOK / secret keywords into backups
  assert.equal(json.includes('byokKeys'), false);
  assert.equal(json.includes('apiKey'), false);

  const parsed = parseWorkspaceBackup(json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.payload.schema, CARTOGRAPH_BACKUP_SCHEMA);
    assert.equal(parsed.payload.groups.length, 1);
    assert.equal(parsed.payload.savedPapers.length, 1);
    assert.equal(parsed.payload.savedPapers[0].url, 'https://doi.org/10.1016/test');
    assert.equal(parsed.payload.savedPapers[0].pdfUrl, 'https://example.org/p1.pdf');
    assert.deepEqual(parsed.payload.savedPapers[0].relatedUrls, [
      { label: 'arXiv Preprint', url: 'https://arxiv.org/abs/2501.00001', kind: 'preprint' },
    ]);
    assert.deepEqual(parsed.payload.selectedPlatformIds, ['openalex', 'pubmed']);
    assert.deepEqual(parsed.payload.ownedPlatformIds, ['scopus', 'sciencedirect']);
  }
});

test('parseWorkspaceBackup rejects invalid JSON or wrong schema', () => {
  const invalid = parseWorkspaceBackup('{"schema": "other"}');
  assert.equal(invalid.ok, false);
  const broken = parseWorkspaceBackup('{not json');
  assert.equal(broken.ok, false);
});

test('exportWorkspaceBackup supports v2 schema with searchLogs and dedupOverrides without leaking secrets', () => {
  const json = exportWorkspaceBackup({
    savedPapers: [],
    groups: [],
    selectedPlatformIds: ['openalex'],
    searchLogs: [
      {
        id: 'log-1',
        executedAt: '2026-02-01T10:00:00.000Z',
        query: 'causal inference',
        yearFrom: 2020,
        scope: 'econ-policy',
        dedupEnabled: true,
        totalRaw: 42,
        totalUnique: 31,
        bySource: { openalex: { status: 'success', count: 25, latencyMs: 320 } },
      },
    ],
    dedupOverrides: { splitPairs: ['oa-1::cr-1'] },
    customColumns: [{ id: 'effect_size', label: 'Effect Size' }],
  });

  assert.equal(json.includes('byokKeys'), false);
  assert.equal(json.includes('proxyTemplate'), false);

  const parsed = parseWorkspaceBackup(json, 'en');
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.payload.schema, CARTOGRAPH_BACKUP_SCHEMA_V2);
    assert.equal(parsed.payload.searchLogs?.length, 1);
    assert.equal(parsed.payload.searchLogs?.[0].scope, 'econ-policy');
    assert.deepEqual(parsed.payload.dedupOverrides, { splitPairs: ['oa-1::cr-1'] });
    assert.deepEqual(parsed.payload.customColumns, [{ id: 'effect_size', label: 'Effect Size' }]);
  }
});

function makeStoredPaper(id: string, title: string): Record<string, unknown> {
  return {
    id,
    title,
    authors: ['Ana Silva'],
    year: 2024,
    venue: 'Journal',
    doi: `10.1000/${id}`,
    url: `https://doi.org/10.1000/${id}`,
    pdfUrl: null,
    isOpenAccess: false,
    citationCount: 3,
    abstractText: null,
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    savedAt: '2026-03-01T00:00:00.000Z',
    researcherNotes: 'nota',
    relevanceTag: 'alta',
    screeningStatus: 'unscreened',
    groupId: 'grp-1',
  };
}

test('emergency backup reads the real storage path without leaking the access config', async () => {
  const accessConfig = {
    institutionalProxy: {
      enabled: true,
      mode: 'prefix',
      proxyTemplate: 'https://proxy.example.edu/login?url={url}',
      presetId: 'custom',
      applyToModels: ['pago'],
    },
    ownedPlatformIds: ['scopus'],
    byokKeys: {
      scopus: { apiKey: 'sk-test-SECRET', secondaryToken: 'INST-TOKEN-SECRET', enabled: true },
    },
    unpaywallEmail: 'pesquisadora@example.edu',
  };
  const ls = createMemoryLocalStorage({
    [WORKSPACE_STORAGE_KEYS.savedPapers]: JSON.stringify([makeStoredPaper('p-1', 'Valid paper')]),
    [WORKSPACE_STORAGE_KEYS.libraryGroups]: JSON.stringify([
      { id: 'grp-1', name: 'Revisão', color: '#01ABE8', createdAt: '2026-01-01T00:00:00.000Z' },
    ]),
    [WORKSPACE_STORAGE_KEYS.selectedPlatformIds]: JSON.stringify(['openalex']),
    [STORAGE_KEY_USER_ACCESS_CONFIG]: JSON.stringify(accessConfig),
    cartograph_theme_v1: 'dark',
  });
  const engine = createWorkspaceStorageEngine({ idbFactory: null, localStorage: ls });
  const records = await engine.exportAllRawRecords();

  const backup = buildEmergencyBackupFromRecords(records, {
    ownedPlatformIds: accessConfig.ownedPlatformIds,
  });

  for (const marker of [...SECRET_MARKERS, 'pesquisadora@example.edu', 'proxy.example.edu']) {
    assert.equal(backup.json.includes(marker), false, `emergency backup leaked: ${marker}`);
  }
  assert.equal(backup.savedPapers, 1);
  assert.equal(backup.groups, 1);
  assert.equal(backup.rejected, 0);

  const parsed = parseWorkspaceBackup(backup.json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.payload.schema, CARTOGRAPH_BACKUP_SCHEMA_V2);
    assert.equal(parsed.payload.savedPapers[0].id, 'p-1');
    assert.equal(parsed.payload.groups[0].id, 'grp-1');
    assert.deepEqual(parsed.payload.selectedPlatformIds, ['openalex']);
    assert.deepEqual(parsed.payload.ownedPlatformIds, ['scopus']);
  }
});

test('emergency backup keeps unreadable records apart instead of dropping them', () => {
  const corrupted = { id: 'p-2' };
  const backup = buildEmergencyBackupFromRecords({
    savedPapers: [makeStoredPaper('p-1', 'Valid paper'), corrupted],
    libraryGroups: 'not-an-array',
    activeSaveGroupId: 42,
    dedupOverrides: { splitPairs: ['a::b', 7] },
  });

  assert.equal(backup.savedPapers, 1);
  assert.equal(backup.groups, 0);
  assert.equal(backup.rejected, 3);

  const raw = JSON.parse(backup.json) as CartographEmergencyBackup;
  assert.deepEqual(raw.emergencyRecovery.rejectedRecords, [
    { key: 'savedPapers', index: 1, value: corrupted },
    { key: 'libraryGroups', index: null, value: 'not-an-array' },
    { key: 'activeSaveGroupId', index: null, value: 42 },
  ]);
  assert.deepEqual(raw.dedupOverrides, { splitPairs: ['a::b'] });

  const parsed = parseWorkspaceBackup(backup.json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.payload.savedPapers.length, 1);
    assert.equal(parsed.payload.activeSaveGroupId, null);
  }
});

test('emergency backup of an empty workspace is still a valid restorable file', () => {
  const backup = buildEmergencyBackupFromRecords({});
  assert.equal(backup.savedPapers, 0);
  assert.equal(backup.rejected, 0);
  const parsed = parseWorkspaceBackup(backup.json);
  assert.equal(parsed.ok, true);
});
