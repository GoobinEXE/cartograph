import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARTOGRAPH_BACKUP_SCHEMA,
  CARTOGRAPH_BACKUP_SCHEMA_V2,
  exportWorkspaceBackup,
  parseWorkspaceBackup,
} from '../src/utils/workspaceBackup.ts';
import type { LibraryGroup, SavedPaperItem } from '../src/types/academic.ts';

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
