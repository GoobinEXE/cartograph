import { SupportedLanguage } from '../i18n/translations';
import {
  CustomExtractionColumn,
  DedupOverrideRule,
  LibraryGroup,
  QualityAppraisalResult,
  QualityRating,
  QualityToolId,
  RelatedPaperUrl,
  SavedPaperItem,
  SearchLogEntry,
  SearchScopeId,
} from '../types/academic';
import { computeOverallQuality } from './qualityChecklists';
import { parseAbstractMetadata } from './abstractParser';
import { sanitizeExternalUrl } from './urlSafety';
import { normalizeDoi } from './deduplication';
import type { WorkspaceStorageKey } from './storageEngine';

export const CARTOGRAPH_BACKUP_SCHEMA = 'cartograph-backup-v1' as const;
export const CARTOGRAPH_BACKUP_SCHEMA_V2 = 'cartograph-backup-v2' as const;

export interface CartographBackupPayload {
  schema: typeof CARTOGRAPH_BACKUP_SCHEMA | typeof CARTOGRAPH_BACKUP_SCHEMA_V2;
  exportedAt: string;
  version: string;
  savedPapers: SavedPaperItem[];
  groups: LibraryGroup[];
  selectedPlatformIds: string[];
  activeSaveGroupId?: string | null;
  ownedPlatformIds?: string[];
  searchLogs?: SearchLogEntry[];
  dedupOverrides?: DedupOverrideRule;
  customColumns?: CustomExtractionColumn[];
}

export type BackupParseResult =
  | { ok: true; payload: CartographBackupPayload }
  | { ok: false; error: string };

export interface WorkspaceBackupParams {
  version?: string;
  savedPapers: SavedPaperItem[];
  groups: LibraryGroup[];
  selectedPlatformIds: string[];
  activeSaveGroupId?: string | null;
  ownedPlatformIds?: string[];
  searchLogs?: SearchLogEntry[];
  dedupOverrides?: DedupOverrideRule;
  customColumns?: CustomExtractionColumn[];
  schemaVersion?: 1 | 2;
}

export function exportWorkspaceBackup(params: WorkspaceBackupParams): string {
  return JSON.stringify(buildWorkspaceBackupPayload(params), null, 2);
}

export function buildWorkspaceBackupPayload(params: WorkspaceBackupParams): CartographBackupPayload {
  // Note: personal API keys (BYOK) and institutional proxy credentials are intentionally excluded
  // from workspace backups so researchers can safely share review files without leaking secrets.
  const useV2 =
    params.schemaVersion === 2 ||
    params.searchLogs !== undefined ||
    params.dedupOverrides !== undefined ||
    params.customColumns !== undefined;

  const payload: CartographBackupPayload = {
    schema: useV2 ? CARTOGRAPH_BACKUP_SCHEMA_V2 : CARTOGRAPH_BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    version: params.version || '2.4.0',
    savedPapers: params.savedPapers,
    groups: params.groups,
    selectedPlatformIds: params.selectedPlatformIds,
    activeSaveGroupId: params.activeSaveGroupId ?? null,
    ...(params.ownedPlatformIds?.length ? { ownedPlatformIds: params.ownedPlatformIds } : {}),
    ...(params.searchLogs ? { searchLogs: params.searchLogs } : {}),
    ...(params.dedupOverrides ? { dedupOverrides: params.dedupOverrides } : {}),
    ...(params.customColumns?.length ? { customColumns: params.customColumns } : {}),
  };

  return payload;
}

/** A raw workspace record that failed sanitization and was kept apart for manual recovery. */
export interface EmergencyRejectedRecord {
  key: WorkspaceStorageKey;
  /** Position inside the stored array, or null when the whole value had an unexpected shape. */
  index: number | null;
  value: unknown;
}

/**
 * Emergency backup written by the ErrorBoundary. It is a regular v2 backup, so the library
 * importer restores it as-is; `emergencyRecovery` is ignored by `parseWorkspaceBackup`.
 */
export interface CartographEmergencyBackup extends CartographBackupPayload {
  emergencyRecovery: {
    capturedAt: string;
    rejectedRecords: EmergencyRejectedRecord[];
  };
}

export interface EmergencyBackupResult {
  json: string;
  savedPapers: number;
  groups: number;
  rejected: number;
}

function sanitizeRecordList<T>(
  key: WorkspaceStorageKey,
  raw: unknown,
  sanitize: (entry: unknown) => T | null,
  rejected: EmergencyRejectedRecord[]
): T[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    rejected.push({ key, index: null, value: raw });
    return [];
  }
  const out: T[] = [];
  raw.forEach((entry, index) => {
    const clean = sanitize(entry);
    if (clean === null) {
      rejected.push({ key, index, value: entry });
    } else {
      out.push(clean);
    }
  });
  return out;
}

/**
 * Builds a restorable backup from the raw workspace records (IndexedDB or legacy localStorage).
 * It reads only the workspace keys, so the access configuration (BYOK keys, InstToken,
 * institutional proxy) can never reach the file. Records that fail sanitization are kept
 * under `emergencyRecovery.rejectedRecords` instead of being dropped, since the crash that
 * triggered this export may come from exactly those records.
 */
export function buildEmergencyBackupFromRecords(
  records: Partial<Record<WorkspaceStorageKey, unknown>>,
  options?: { ownedPlatformIds?: string[]; version?: string }
): EmergencyBackupResult {
  const rejected: EmergencyRejectedRecord[] = [];

  const savedPapers = sanitizeRecordList('savedPapers', records.savedPapers, sanitizeSavedPaper, rejected);
  const groups = sanitizeRecordList('libraryGroups', records.libraryGroups, sanitizeGroup, rejected);
  const searchLogs = sanitizeRecordList('searchLogs', records.searchLogs, sanitizeSearchLogEntry, rejected);
  const customColumns = sanitizeRecordList(
    'customColumns',
    records.customColumns,
    sanitizeCustomColumn,
    rejected
  );
  const selectedPlatformIds = sanitizeRecordList(
    'selectedPlatformIds',
    records.selectedPlatformIds,
    (id) => (typeof id === 'string' && id.trim() ? id.trim() : null),
    rejected
  );

  const rawActiveGroup = records.activeSaveGroupId;
  const activeSaveGroupId = typeof rawActiveGroup === 'string' && rawActiveGroup.trim() ? rawActiveGroup : null;
  if (rawActiveGroup !== undefined && rawActiveGroup !== null && activeSaveGroupId === null) {
    rejected.push({ key: 'activeSaveGroupId', index: null, value: rawActiveGroup });
  }

  let dedupOverrides: DedupOverrideRule | undefined;
  const rawOverrides = records.dedupOverrides;
  if (rawOverrides !== undefined && rawOverrides !== null) {
    const rawSplit =
      typeof rawOverrides === 'object' ? (rawOverrides as Record<string, unknown>).splitPairs : undefined;
    if (Array.isArray(rawSplit)) {
      dedupOverrides = {
        splitPairs: rawSplit.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())),
      };
    } else {
      rejected.push({ key: 'dedupOverrides', index: null, value: rawOverrides });
    }
  }

  const payload: CartographEmergencyBackup = {
    ...buildWorkspaceBackupPayload({
      version: options?.version,
      savedPapers,
      groups,
      selectedPlatformIds,
      activeSaveGroupId,
      ownedPlatformIds: options?.ownedPlatformIds?.filter((id) => typeof id === 'string' && id.trim()),
      searchLogs,
      dedupOverrides,
      customColumns,
      schemaVersion: 2,
    }),
    emergencyRecovery: {
      capturedAt: new Date().toISOString(),
      rejectedRecords: rejected,
    },
  };

  return {
    json: JSON.stringify(payload, null, 2),
    savedPapers: savedPapers.length,
    groups: groups.length,
    rejected: rejected.length,
  };
}

export function sanitizeGroup(raw: unknown): LibraryGroup | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  if (typeof g.id !== 'string' || !g.id.trim()) return null;
  if (typeof g.name !== 'string' || !g.name.trim()) return null;

  return {
    id: g.id.trim().slice(0, 80),
    name: g.name.trim().slice(0, 120),
    description: typeof g.description === 'string' ? g.description.slice(0, 300) : undefined,
    color: typeof g.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(g.color) ? g.color : '#1a73e8',
    createdAt: typeof g.createdAt === 'string' ? g.createdAt : new Date().toISOString(),
  };
}

export function sanitizeSavedPaper(raw: unknown): SavedPaperItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== 'string' || !p.id.trim()) return null;
  if (typeof p.title !== 'string' || !p.title.trim()) return null;

  const doi = typeof p.doi === 'string' && p.doi.trim() ? p.doi.trim() : null;
  const bareDoi = normalizeDoi(doi);
  const fallbackDoiUrl = bareDoi ? `https://doi.org/${bareDoi}` : null;
  const safeUrl =
    sanitizeExternalUrl(typeof p.url === 'string' ? p.url : null) ||
    fallbackDoiUrl ||
    'https://scholar.google.com/';
  const safePdfUrl = sanitizeExternalUrl(typeof p.pdfUrl === 'string' ? p.pdfUrl : null);

  const authors = Array.isArray(p.authors)
    ? p.authors.filter((a): a is string => typeof a === 'string' && Boolean(a.trim()))
    : [];

  const abstractText = typeof p.abstractText === 'string' ? p.abstractText : null;
  const title = p.title.trim();
  const relevanceTag =
    p.relevanceTag === 'alta' || p.relevanceTag === 'media' || p.relevanceTag === 'revisar'
      ? p.relevanceTag
      : 'media';
  const screeningStatus =
    p.screeningStatus === 'included' ||
    p.screeningStatus === 'excluded' ||
    p.screeningStatus === 'unscreened'
      ? p.screeningStatus
      : 'unscreened';

  const relatedUrls: RelatedPaperUrl[] | undefined = Array.isArray(p.relatedUrls)
    ? p.relatedUrls
        .map((entry): RelatedPaperUrl | null => {
          if (!entry || typeof entry !== 'object') return null;
          const rec = entry as Record<string, unknown>;
          const safeEntryUrl = sanitizeExternalUrl(typeof rec.url === 'string' ? rec.url : null);
          if (!safeEntryUrl) return null;
          const kind =
            rec.kind === 'preprint' || rec.kind === 'published' || rec.kind === 'supplementary'
              ? rec.kind
              : 'supplementary';
          return {
            label: typeof rec.label === 'string' && rec.label.trim() ? rec.label.trim().slice(0, 120) : 'Link',
            url: safeEntryUrl,
            kind,
          };
        })
        .filter((e): e is RelatedPaperUrl => e !== null)
    : undefined;

  return {
    id: p.id.trim(),
    title,
    authors,
    year: typeof p.year === 'number' && Number.isFinite(p.year) ? p.year : null,
    venue: typeof p.venue === 'string' ? p.venue : '',
    doi,
    url: safeUrl,
    pdfUrl: safePdfUrl,
    isOpenAccess: Boolean(p.isOpenAccess),
    citationCount: typeof p.citationCount === 'number' && Number.isFinite(p.citationCount) ? p.citationCount : 0,
    abstractText,
    source: typeof p.source === 'string' ? (p.source as SavedPaperItem['source']) : 'openalex',
    sourceLabel: typeof p.sourceLabel === 'string' ? p.sourceLabel : 'Importado',
    sources: Array.isArray(p.sources)
      ? (p.sources.filter((s): s is SavedPaperItem['source'] => typeof s === 'string'))
      : undefined,
    publicationType: typeof p.publicationType === 'string' ? p.publicationType : undefined,
    savedAt: typeof p.savedAt === 'string' ? p.savedAt : new Date().toISOString(),
    researcherNotes: typeof p.researcherNotes === 'string' ? p.researcherNotes : '',
    relevanceTag,
    screeningStatus,
    exclusionReason:
      screeningStatus === 'excluded' && typeof p.exclusionReason === 'string'
        ? p.exclusionReason
        : undefined,
    extractedMetadata:
      p.extractedMetadata && typeof p.extractedMetadata === 'object'
        ? (p.extractedMetadata as SavedPaperItem['extractedMetadata'])
        : parseAbstractMetadata(title, abstractText),
    groupId: typeof p.groupId === 'string' ? p.groupId : null,
    ...(relatedUrls && relatedUrls.length > 0 ? { relatedUrls } : {}),
    ...(p.customFields && typeof p.customFields === 'object'
      ? { customFields: sanitizeCustomFields(p.customFields) }
      : {}),
    ...(sanitizeQualityAppraisal(p.qualityAppraisal)
      ? { qualityAppraisal: sanitizeQualityAppraisal(p.qualityAppraisal)! }
      : {}),
  };
}

function sanitizeCustomFields(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === 'string' && key.trim() && typeof val === 'string') {
      out[key.slice(0, 64)] = val.slice(0, 1000);
    }
  }
  return out;
}

function sanitizeQualityAppraisal(raw: unknown): QualityAppraisalResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const tool: QualityToolId | null =
    r.tool === 'rob2' || r.tool === 'jbi_quasi' || r.tool === 'casp_qual'
      ? r.tool
      : null;
  if (!tool || !r.criteria || typeof r.criteria !== 'object') return null;

  const validRatings = new Set<QualityRating>([
    'low',
    'some_concerns',
    'high',
    'unclear',
  ]);
  const criteria: Record<string, QualityRating> = {};
  for (const [k, v] of Object.entries(r.criteria as Record<string, unknown>)) {
    if (typeof k === 'string' && validRatings.has(v as QualityRating)) {
      criteria[k.slice(0, 64)] = v as QualityRating;
    }
  }
  return {
    tool,
    criteria,
    overall: computeOverallQuality(criteria),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  };
}

function sanitizeCustomColumn(raw: unknown): CustomExtractionColumn | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  if (typeof r.label !== 'string' || !r.label.trim()) return null;
  return {
    id: r.id.trim().slice(0, 64),
    label: r.label.trim().slice(0, 80),
    ...(typeof r.placeholder === 'string' && r.placeholder.trim()
      ? { placeholder: r.placeholder.trim().slice(0, 120) }
      : {}),
  };
}

function sanitizeSearchLogEntry(raw: unknown): SearchLogEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  if (typeof r.query !== 'string' || !r.query.trim()) return null;
  const validScopes = new Set<SearchScopeId>(['all', 'general', 'econ-policy', 'health', 'exact-tech']);
  const scope = validScopes.has(r.scope as SearchScopeId)
    ? (r.scope as SearchScopeId)
    : 'all';

  return {
    id: r.id.slice(0, 80),
    executedAt: typeof r.executedAt === 'string' ? r.executedAt : new Date().toISOString(),
    query: r.query.slice(0, 1000),
    yearFrom: typeof r.yearFrom === 'number' && Number.isFinite(r.yearFrom) ? r.yearFrom : null,
    scope,
    dedupEnabled: typeof r.dedupEnabled === 'boolean' ? r.dedupEnabled : true,
    totalRaw: typeof r.totalRaw === 'number' && Number.isFinite(r.totalRaw) ? r.totalRaw : 0,
    totalUnique: typeof r.totalUnique === 'number' && Number.isFinite(r.totalUnique) ? r.totalUnique : 0,
    bySource:
      r.bySource && typeof r.bySource === 'object'
        ? (r.bySource as SearchLogEntry['bySource'])
        : {},
  };
}

export function parseWorkspaceBackup(
  rawJson: string,
  language: SupportedLanguage = 'pt'
): BackupParseResult {
  const isEn = language === 'en';
  if (!rawJson || !rawJson.trim()) {
    return { ok: false, error: isEn ? 'Empty JSON file.' : 'Arquivo JSON vazio.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      error: isEn ? 'Invalid or corrupted JSON.' : 'JSON inválido ou corrompido.',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: isEn ? 'Invalid backup structure.' : 'Estrutura de backup inválida.',
    };
  }

  const obj = parsed as Record<string, unknown>;
  if (
    obj.schema !== CARTOGRAPH_BACKUP_SCHEMA &&
    obj.schema !== CARTOGRAPH_BACKUP_SCHEMA_V2
  ) {
    return {
      ok: false,
      error: isEn
        ? 'Backup schema format not recognized by Cartograph.'
        : 'Formato de schema não reconhecido pelo Cartograph.',
    };
  }

  if (!Array.isArray(obj.savedPapers)) {
    return {
      ok: false,
      error: isEn
        ? 'Missing papers list in backup file.'
        : 'Lista de artigos ausente no arquivo de backup.',
    };
  }

  const groups = Array.isArray(obj.groups)
    ? obj.groups.map(sanitizeGroup).filter((g): g is LibraryGroup => g !== null)
    : [];

  const savedPapers = obj.savedPapers
    .map(sanitizeSavedPaper)
    .filter((p): p is SavedPaperItem => p !== null);

  const selectedPlatformIds = Array.isArray(obj.selectedPlatformIds)
    ? obj.selectedPlatformIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    : [];

  const ownedPlatformIds = Array.isArray(obj.ownedPlatformIds)
    ? obj.ownedPlatformIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    : undefined;

  const searchLogs = Array.isArray(obj.searchLogs)
    ? obj.searchLogs
        .map(sanitizeSearchLogEntry)
        .filter((e): e is SearchLogEntry => e !== null)
    : undefined;

  let dedupOverrides: DedupOverrideRule | undefined;
  if (obj.dedupOverrides && typeof obj.dedupOverrides === 'object') {
    const rawSplit = (obj.dedupOverrides as Record<string, unknown>).splitPairs;
    if (Array.isArray(rawSplit)) {
      dedupOverrides = {
        splitPairs: rawSplit.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())),
      };
    }
  }

  const customColumns = Array.isArray(obj.customColumns)
    ? obj.customColumns
        .map(sanitizeCustomColumn)
        .filter((c): c is CustomExtractionColumn => c !== null)
    : undefined;

  return {
    ok: true,
    payload: {
      schema:
        obj.schema === CARTOGRAPH_BACKUP_SCHEMA_V2
          ? CARTOGRAPH_BACKUP_SCHEMA_V2
          : CARTOGRAPH_BACKUP_SCHEMA,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      version: typeof obj.version === 'string' ? obj.version : '2.4.0',
      savedPapers,
      groups,
      selectedPlatformIds,
      activeSaveGroupId: typeof obj.activeSaveGroupId === 'string' ? obj.activeSaveGroupId : null,
      ...(ownedPlatformIds ? { ownedPlatformIds } : {}),
      ...(searchLogs ? { searchLogs } : {}),
      ...(dedupOverrides ? { dedupOverrides } : {}),
      ...(customColumns ? { customColumns } : {}),
    },
  };
}
