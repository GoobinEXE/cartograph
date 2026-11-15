import { LibraryGroup, SavedPaperItem } from '../types/academic';
import { parseAbstractMetadata } from './abstractParser';
import { sanitizeExternalUrl } from './urlSafety';

export const CARTOGRAPH_BACKUP_SCHEMA = 'cartograph-backup-v1' as const;

export interface CartographBackupPayload {
  schema: typeof CARTOGRAPH_BACKUP_SCHEMA;
  exportedAt: string;
  version: string;
  savedPapers: SavedPaperItem[];
  groups: LibraryGroup[];
  selectedPlatformIds: string[];
  activeSaveGroupId?: string | null;
}

export type BackupParseResult =
  | { ok: true; payload: CartographBackupPayload }
  | { ok: false; error: string };

export function exportWorkspaceBackup(params: {
  version?: string;
  savedPapers: SavedPaperItem[];
  groups: LibraryGroup[];
  selectedPlatformIds: string[];
  activeSaveGroupId?: string | null;
}): string {
  const payload: CartographBackupPayload = {
    schema: CARTOGRAPH_BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    version: params.version || '2.4.0',
    savedPapers: params.savedPapers,
    groups: params.groups,
    selectedPlatformIds: params.selectedPlatformIds,
    activeSaveGroupId: params.activeSaveGroupId ?? null,
  };

  return JSON.stringify(payload, null, 2);
}

function sanitizeGroup(raw: unknown): LibraryGroup | null {
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

function sanitizeSavedPaper(raw: unknown): SavedPaperItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== 'string' || !p.id.trim()) return null;
  if (typeof p.title !== 'string' || !p.title.trim()) return null;

  const doi = typeof p.doi === 'string' && p.doi.trim() ? p.doi.trim() : null;
  const fallbackDoiUrl = doi ? `https://doi.org/${doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')}` : null;
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
  };
}

export function parseWorkspaceBackup(rawJson: string): BackupParseResult {
  if (!rawJson || !rawJson.trim()) {
    return { ok: false, error: 'Arquivo JSON vazio.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'JSON inválido ou corrompido.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Estrutura de backup inválida.' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.schema !== CARTOGRAPH_BACKUP_SCHEMA) {
    return { ok: false, error: 'Formato de schema não reconhecido pelo Cartograph.' };
  }

  if (!Array.isArray(obj.savedPapers)) {
    return { ok: false, error: 'Lista de artigos ausente no arquivo de backup.' };
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

  return {
    ok: true,
    payload: {
      schema: CARTOGRAPH_BACKUP_SCHEMA,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      version: typeof obj.version === 'string' ? obj.version : '2.4.0',
      savedPapers,
      groups,
      selectedPlatformIds,
      activeSaveGroupId: typeof obj.activeSaveGroupId === 'string' ? obj.activeSaveGroupId : null,
    },
  };
}
