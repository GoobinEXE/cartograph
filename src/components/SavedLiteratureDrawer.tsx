import React, { Suspense, lazy, useMemo, useRef, useState } from 'react';
const BibliometricsPanel = lazy(() =>
  import('./BibliometricsPanel').then((m) => ({ default: m.BibliometricsPanel }))
);
import {
  CustomExtractionColumn,
  DedupOverrideRule,
  DeduplicationSummary,
  LibraryGroup,
  NormalizedPaper,
  QualityAppraisalResult,
  QualityRating,
  QualityToolId,
  SavedPaperItem,
  ScreeningStatus,
  SearchLogEntry,
  UserAccessConfig,
} from '../types/academic';
import {
  computeOverallQuality,
  createEmptyQualityAppraisal,
  getQualityChecklistDefinition,
  getQualityRatingLabel,
} from '../utils/qualityChecklists';
import { CitationChaserModal } from './CitationChaserModal';
import { BlindScreeningModal } from './BlindScreeningModal';
import { resolveIdentifierBatch } from '../services/doiBatchResolver';
import { resolveUnpaywallPdf } from '../services/unpaywallResolver';
import {
  exportSavedPapersCsv,
  exportSavedPapersRis,
  exportSynthesisLatexTable,
  exportSynthesisMarkdown,
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
  formatInTextCitation,
  triggerFileDownload,
} from '../utils/citationExporter';
import { calculatePrisma2020Counts, getScreeningReasonLabels } from '../utils/prismaFlow';
import { PrismaFlowDiagram } from './PrismaFlowDiagram';
import { parseAbstractMetadata } from '../utils/abstractParser';
import { trackAcademicEvent } from '../utils/analytics';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import {
  CartographBackupPayload,
  exportWorkspaceBackup,
  parseWorkspaceBackup,
} from '../utils/workspaceBackup';
import { parseImportedReferences } from '../utils/bibImporter';
import { useI18n } from '../i18n/context';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  HardDriveDownload,
  HelpCircle,
  Inbox,
  Layers,
  Link2,
  Loader2,
  Microscope,
  Pin,
  Plus,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';

const GROUP_COLORS = [
  { hex: '#01ABE8', label: 'Ciano', labelEn: 'Cyan' },
  { hex: '#AEB932', label: 'Oliva', labelEn: 'Olive' },
  { hex: '#E97635', label: 'Âmbar', labelEn: 'Amber' },
  { hex: '#DA0082', label: 'Magenta', labelEn: 'Magenta' },
  { hex: '#6366F1', label: 'Índigo', labelEn: 'Indigo' },
  { hex: '#10B981', label: 'Esmeralda', labelEn: 'Emerald' },
];

export type LibrarySlotView = 'all' | 'ungrouped' | string;

interface SavedLiteratureDrawerProps {
  items: SavedPaperItem[];
  groups: LibraryGroup[];
  selectedPlatformIds: string[];
  ownedPlatformIds?: string[];
  userAccessConfig?: UserAccessConfig;
  searchLogs?: SearchLogEntry[];
  dedupOverrides?: DedupOverrideRule;
  customColumns?: CustomExtractionColumn[];
  onSaveCustomColumns?: (cols: CustomExtractionColumn[]) => void;
  activeSaveGroupId: string | null;
  onSelectActiveSaveGroup: (groupId: string | null) => void;
  onCreateGroup: (name: string, color?: string) => LibraryGroup;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onAssignPaperGroup: (paperId: string, groupId: string | null) => void;
  dedupSummary?: DeduplicationSummary | null;
  sourceBreakdown?: Record<string, number>;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateCustomField?: (id: string, columnId: string, value: string) => void;
  onUpdateQualityAppraisal?: (id: string, appraisal: QualityAppraisalResult) => void;
  onUpdateRelevance: (id: string, relevance: SavedPaperItem['relevanceTag']) => void;
  onUpdateScreening: (id: string, status: ScreeningStatus, reason?: string) => void;
  onRemoveItem: (id: string) => void;
  onLinkRelatedPaper?: (targetId: string, sourceId: string) => void;
  onClearAll: (onlyGroupId?: string | 'ungrouped') => void;
  onImportPapers: (
    imported: SavedPaperItem[],
    targetGroupId?: string | null
  ) => { added: number; skippedDuplicates: number };
  onRestoreBackup: (
    payload: CartographBackupPayload,
    mode: 'merge' | 'replace'
  ) => { papersAdded: number; groupsAdded: number };
}

export const SavedLiteratureDrawer: React.FC<SavedLiteratureDrawerProps> = ({
  items,
  groups,
  selectedPlatformIds,
  ownedPlatformIds,
  userAccessConfig,
  searchLogs,
  dedupOverrides,
  customColumns = [],
  onSaveCustomColumns,
  activeSaveGroupId,
  onSelectActiveSaveGroup,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onAssignPaperGroup,
  dedupSummary,
  sourceBreakdown,
  onUpdateNotes,
  onUpdateCustomField,
  onUpdateQualityAppraisal,
  onUpdateRelevance,
  onUpdateScreening,
  onRemoveItem,
  onLinkRelatedPaper,
  onClearAll,
  onImportPapers,
  onRestoreBackup,
}) => {
  const { language, t } = useI18n();
  const isEn = language === 'en';
  const [selectedSlotView, setSelectedSlotView] = useState<LibrarySlotView>('all');
  const [savedSortBy, setSavedSortBy] = useState<'recent' | 'year' | 'citations' | 'title'>('recent');
  const [sidebarDrawers, setSidebarDrawers] = useState<
    Record<'sort' | 'slots' | 'defaultTarget' | 'newGroup' | 'backup', boolean>
  >(() => {
    try {
      const saved = localStorage.getItem('cartograph_saved_sidebar_drawers_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            sort: parsed.sort !== false,
            slots: parsed.slots !== false,
            defaultTarget: parsed.defaultTarget !== false,
            newGroup: parsed.newGroup === true,
            backup: parsed.backup === true,
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      sort: true,
      slots: true,
      defaultTarget: true,
      newGroup: groups.length === 0,
      backup: false,
    };
  });

  const toggleSidebarDrawer = (
    key: 'sort' | 'slots' | 'defaultTarget' | 'newGroup' | 'backup'
  ) => {
    setSidebarDrawers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('cartograph_saved_sidebar_drawers_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const allDrawersOpen = Object.values(sidebarDrawers).every(Boolean);

  const toggleAllSidebarDrawers = () => {
    const targetState = !allDrawersOpen;
    const next = {
      sort: targetState,
      slots: targetState,
      defaultTarget: targetState,
      newGroup: targetState,
      backup: targetState,
    };
    setSidebarDrawers(next);
    try {
      localStorage.setItem('cartograph_saved_sidebar_drawers_v1', JSON.stringify(next));
    } catch {
      // ignore
    }
  };
  const [subTab, setSubTab] = useState<'matrix' | 'prisma' | 'bibliometrics'>('matrix');
  const [filterScreening, setFilterScreening] = useState<'all' | ScreeningStatus>('all');
  const [bulkCopied, setBulkCopied] = useState<string | null>(null);
  const [copiedInTextKey, setCopiedInTextKey] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [linkingTargetId, setLinkingTargetId] = useState<string | null>(null);
  const [linkCandidateId, setLinkCandidateId] = useState<string>('');
  const [showBatchDoiPanel, setShowBatchDoiPanel] = useState(false);
  const [batchDoiText, setBatchDoiText] = useState('');
  const [isResolvingBatchDoi, setIsResolvingBatchDoi] = useState(false);
  const [chaseSeedPaper, setChaseSeedPaper] = useState<NormalizedPaper | null>(null);
  const [blindScreeningOpen, setBlindScreeningOpen] = useState(false);
  const [showCustomColsManager, setShowCustomColsManager] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [expandedQuality, setExpandedQuality] = useState<Record<string, boolean>>({});
  const [unpaywallState, setUnpaywallState] = useState<
    Record<string, { status: 'loading' | 'found' | 'not_found'; pdfUrl?: string }>
  >({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const savedIdSet = useMemo(() => new Set(items.map((it) => it.id)), [items]);

  const handleFindUnpaywall = async (item: SavedPaperItem) => {
    if (!item.doi) return;
    setUnpaywallState((prev) => ({ ...prev, [item.id]: { status: 'loading' } }));
    const res = await resolveUnpaywallPdf(item.doi, userAccessConfig?.unpaywallEmail);
    const resolved = res.bestPdfUrl || res.bestLandingUrl;
    if (res.ok && resolved) {
      setUnpaywallState((prev) => ({ ...prev, [item.id]: { status: 'found', pdfUrl: resolved } }));
    } else {
      setUnpaywallState((prev) => ({ ...prev, [item.id]: { status: 'not_found' } }));
    }
  };

  const handleResolveBatchDoi = async () => {
    if (!batchDoiText.trim() || isResolvingBatchDoi) return;
    setIsResolvingBatchDoi(true);
    try {
      const { papers, unresolved } = await resolveIdentifierBatch(batchDoiText);
      const targetGroup =
        selectedSlotView !== 'all' && selectedSlotView !== 'ungrouped'
          ? selectedSlotView
          : activeSaveGroupId;
      const toImport: SavedPaperItem[] = papers.map((p) => ({
        ...p,
        savedAt: new Date().toISOString(),
        researcherNotes: '',
        relevanceTag: 'alta',
        screeningStatus: 'unscreened',
        extractedMetadata: parseAbstractMetadata(p.title, p.abstractText, p.publicationType, language),
      }));
      const summary = toImport.length > 0 ? onImportPapers(toImport, targetGroup) : { added: 0, skippedDuplicates: 0 };
      setImportFeedback(
        t('batchDoiResultFeedback', {
          added: summary.added,
          unresolved: unresolved.length,
        })
      );
      if (summary.added > 0) {
        setBatchDoiText('');
        setShowBatchDoiPanel(false);
      }
    } finally {
      setIsResolvingBatchDoi(false);
    }
  };

  // New group creation state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0].hex);

  // Inline rename state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Map groupId -> groupName for CSV export and badges
  const groupNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [groups]);

  // Counts per slot
  const ungroupedCount = useMemo(
    () => items.filter((item) => !item.groupId || !groupNameMap[item.groupId]).length,
    [items, groupNameMap]
  );

  const countsByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    groups.forEach((g) => {
      map[g.id] = 0;
    });
    items.forEach((item) => {
      if (item.groupId && map[item.groupId] !== undefined) {
        map[item.groupId] += 1;
      }
    });
    return map;
  }, [items, groups]);

  // Items filtered by the currently selected slot/group in the left sidebar
  const slotItems = useMemo(() => {
    if (selectedSlotView === 'all') return items;
    if (selectedSlotView === 'ungrouped') {
      return items.filter((item) => !item.groupId || !groupNameMap[item.groupId]);
    }
    return items.filter((item) => item.groupId === selectedSlotView);
  }, [items, selectedSlotView, groupNameMap]);

  // PRISMA 2020 counts computed for the active slot/group
  const prismaCounts = useMemo(() => {
    const isAll = selectedSlotView === 'all';
    const totalIdentified = isAll ? dedupSummary?.originalCount || slotItems.length : slotItems.length;
    const duplicatesCount = isAll ? dedupSummary?.duplicatesRemoved || 0 : 0;
    return calculatePrisma2020Counts(
      slotItems,
      totalIdentified,
      duplicatesCount,
      isAll ? sourceBreakdown : undefined,
      language
    );
  }, [slotItems, selectedSlotView, dedupSummary, sourceBreakdown, language]);

  // Items further filtered by PRISMA screening status (all / included / excluded / unscreened) and sorted
  const filteredItems = useMemo(() => {
    const base =
      filterScreening === 'all'
        ? slotItems
        : slotItems.filter((item) => (item.screeningStatus || 'unscreened') === filterScreening);

    if (savedSortBy === 'recent') return base;
    return [...base].sort((a, b) => {
      if (savedSortBy === 'year') return (b.year || 0) - (a.year || 0);
      if (savedSortBy === 'citations') return (b.citationCount || 0) - (a.citationCount || 0);
      return a.title.localeCompare(b.title);
    });
  }, [slotItems, filterScreening, savedSortBy]);

  const activeGroupObj = useMemo(
    () => groups.find((g) => g.id === selectedSlotView) || null,
    [groups, selectedSlotView]
  );

  const handleCreateNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    const created = onCreateGroup(trimmed, newGroupColor);
    setNewGroupName('');
    // Automatically select the new group view and set it as default target slot
    setSelectedSlotView(created.id);
    onSelectActiveSaveGroup(created.id);
  };

  const handleStartRename = (group: LibraryGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleConfirmRename = (groupId: string) => {
    const trimmed = editingGroupName.trim();
    if (trimmed) {
      onRenameGroup(groupId, trimmed);
    }
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  const handleCopyAll = async (format: 'abnt' | 'apa' | 'bibtex') => {
    if (slotItems.length === 0) return;
    const text = slotItems
      .map((item) =>
        format === 'abnt'
          ? formatAbntCitation(item)
          : format === 'apa'
          ? formatApaCitation(item)
          : formatBibtexEntry(item)
      )
      .join('\n\n');

    await navigator.clipboard.writeText(text);
    trackAcademicEvent('citation_export', {
      format,
      items_count: slotItems.length,
    });
    setBulkCopied(format);
    setTimeout(() => setBulkCopied(null), 2000);
  };

  const getExportSlug = () => {
    if (selectedSlotView === 'all') return isEn ? 'all' : 'todos';
    if (selectedSlotView === 'ungrouped') return isEn ? 'ungrouped' : 'sem-grupo';
    const name = activeGroupObj?.name || (isEn ? 'group' : 'grupo');
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleDownloadCsv = () => {
    if (slotItems.length === 0) return;
    const csv = exportSavedPapersCsv(slotItems, groupNameMap, language, customColumns);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-prisma-${getExportSlug()}-${dateStamp}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    trackAcademicEvent('citation_export', {
      format: 'csv',
      items_count: slotItems.length,
    });
  };

  const handleDownloadBibtex = () => {
    if (slotItems.length === 0) return;
    const bib = slotItems.map(formatBibtexEntry).join('\n\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-refs-${getExportSlug()}-${dateStamp}.bib`,
      bib,
      'application/x-bibtex;charset=utf-8;'
    );
    trackAcademicEvent('citation_export', {
      format: 'bibtex',
      items_count: slotItems.length,
    });
  };

  const handleDownloadRis = () => {
    if (slotItems.length === 0) return;
    const ris = exportSavedPapersRis(slotItems);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-refs-${getExportSlug()}-${dateStamp}.ris`,
      ris,
      'application/x-research-info-systems;charset=utf-8;'
    );
    trackAcademicEvent('citation_export', {
      format: 'ris',
      items_count: slotItems.length,
    });
  };

  const handleDownloadMarkdown = () => {
    if (slotItems.length === 0) return;
    const md = exportSynthesisMarkdown(slotItems, groupNameMap, language, customColumns);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-synthesis-${getExportSlug()}-${dateStamp}.md`,
      md,
      'text/markdown;charset=utf-8;'
    );
    trackAcademicEvent('citation_export', {
      format: 'markdown',
      items_count: slotItems.length,
    });
  };

  const handleDownloadLatex = () => {
    if (slotItems.length === 0) return;
    const tex = exportSynthesisLatexTable(slotItems, language);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-table-${getExportSlug()}-${dateStamp}.tex`,
      tex,
      'application/x-tex;charset=utf-8;'
    );
    trackAcademicEvent('citation_export', {
      format: 'latex',
      items_count: slotItems.length,
    });
  };

  const handleCopyInText = async (item: SavedPaperItem, style: 'abnt' | 'apa') => {
    const text = formatInTextCitation(item, style, 'parenthetical');
    try {
      await navigator.clipboard.writeText(text);
      const key = `${style}-${item.id}`;
      setCopiedInTextKey(key);
      setTimeout(() => setCopiedInTextKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadBackupJson = () => {
    const json = exportWorkspaceBackup({
      savedPapers: items,
      groups,
      selectedPlatformIds,
      activeSaveGroupId,
      ownedPlatformIds,
      searchLogs,
      dedupOverrides,
      customColumns,
      schemaVersion: 2,
    });
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-backup-${dateStamp}.json`,
      json,
      'application/json;charset=utf-8;'
    );
    setImportFeedback(t('backupExportedFeedback'));
    setTimeout(() => setImportFeedback(null), 4000);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const content = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = parseWorkspaceBackup(content, language);
        if (!parsed.ok) {
          setImportFeedback(t('backupFailedFeedback', { error: parsed.error }));
          return;
        }
        const result = onRestoreBackup(parsed.payload, restoreMode);
        setImportFeedback(
          restoreMode === 'replace'
            ? t('backupRestoredFeedback', {
                papers: parsed.payload.savedPapers.length,
                groups: parsed.payload.groups.length,
              })
            : t('backupMergedFeedback', {
                papers: result.papersAdded,
                groups: result.groupsAdded,
              })
        );
        return;
      }

      const detected = parseImportedReferences(file.name, content);
      if (detected.format === 'unknown' || detected.items.length === 0) {
        setImportFeedback(t('importInvalidFeedback'));
        return;
      }

      const targetGroup =
        selectedSlotView !== 'all' && selectedSlotView !== 'ungrouped'
          ? selectedSlotView
          : activeSaveGroupId;
      const summary = onImportPapers(detected.items, targetGroup);
      setImportFeedback(
        t('importSuccessFeedback', {
          format: detected.format.toUpperCase(),
          added: summary.added,
          skipped: summary.skippedDuplicates,
        })
      );
    } catch {
      setImportFeedback(t('importReadErrorFeedback'));
    }
  };

  const currentSlotTitle =
    selectedSlotView === 'all'
      ? t('allLibraryPapersTitle')
      : selectedSlotView === 'ungrouped'
      ? t('ungroupedOption')
      : `${t('slotPrefix')} ${activeGroupObj?.name || t('groupFallbackName')}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[295px_1fr] xl:grid-cols-[310px_1fr] gap-6 items-start pb-14">
      {/* COLUNA ESQUERDA: GERENCIADOR DE SLOTS & GRUPOS DE PESQUISA */}
      <aside
        className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pr-2 pb-8 select-none"
        aria-label={t('savedSidebarAria')}
      >
        {/* Header com Ação Rápida de Expandir / Recolher Todas */}
        <div className="flex items-center justify-between px-2 pb-2.5 border-b border-[var(--divider)]">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>{t('filtersNavTitle')}</span>
          </div>
          <button
            type="button"
            onClick={toggleAllSidebarDrawers}
            className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] rounded"
            title={allDrawersOpen ? t('collapseAllTitle') : t('expandAllTitle')}
          >
            {allDrawersOpen ? t('collapseAll') : t('expandAll')}
          </button>
        </div>

        {/* 1. Sort Controls (Primary ordering control — top priority) */}
        <div className="border-b border-[var(--divider)] pb-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('sort')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('sort');
              }
            }}
            aria-expanded={sidebarDrawers.sort}
            className="w-full flex items-center justify-between py-1.5 px-2 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {t('sortByLabel')}
              </span>
              {savedSortBy !== 'recent' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--link-academic)]/15 text-[var(--link-academic)] shrink-0">
                  {savedSortBy === 'year'
                    ? t('sortShortYear')
                    : savedSortBy === 'citations'
                    ? t('sortShortCitations')
                    : t('savedSortShortTitle')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {savedSortBy !== 'recent' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSavedSortBy('recent');
                  }}
                  className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  {t('clearFilter')}
                </button>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                  sidebarDrawers.sort ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </div>
          </div>

          {sidebarDrawers.sort && (
            <div className="space-y-0.5 text-[13.5px]">
              {(['recent', 'year', 'citations', 'title'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSavedSortBy(mode)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    savedSortBy === mode
                      ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode === 'recent' && t('savedSortRecent')}
                  {mode === 'year' && t('savedSortYear')}
                  {mode === 'citations' && t('savedSortCitations')}
                  {mode === 'title' && t('savedSortTitle')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Lista de Visões e Slots da Biblioteca (Primary navigation) */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-3 space-y-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('slots')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('slots');
              }
            }}
            aria-expanded={sidebarDrawers.slots}
            className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-subtle)] group select-none text-left"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                {t('librarySlotsTitle')}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-canvas)] text-[var(--text-secondary)] shrink-0 tabular-nums">
                {items.length}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0 ${
                sidebarDrawers.slots ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </div>

          {sidebarDrawers.slots && (
            <div className="space-y-1 pt-1">
              {/* Visão 1: Todos os Artigos */}
              <button
                type="button"
                onClick={() => setSelectedSlotView('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer text-left ${
                  selectedSlotView === 'all'
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('allPapersSlot')}</span>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] shrink-0">
                  {items.length}
                </span>
              </button>

              {/* Visão 2: Sem Grupo (Geral) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedSlotView('ungrouped');
                  onSelectActiveSaveGroup(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer text-left ${
                  selectedSlotView === 'ungrouped'
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Inbox className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('ungroupedOption')}</span>
                  {activeSaveGroupId === null && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--meta-green)]">
                      {t('activeBadge')}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] shrink-0">
                  {ungroupedCount}
                </span>
              </button>

              {/* Divisória para Grupos Criados pelo Usuário */}
              <div className="pt-2 pb-1 px-2.5 flex items-center justify-between text-[13px] font-semibold text-[var(--text-muted)] border-t border-[var(--divider)]">
                <span>{t('researchGroupsCount', { count: groups.length })}</span>
              </div>

              {groups.length === 0 ? (
                <div className="px-3 py-3 text-center text-[13px] text-[var(--text-muted)] leading-relaxed">
                  {t('noGroupsHint')}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {groups.map((group) => {
                    const isSelected = selectedSlotView === group.id;
                    const isTargetSlot = activeSaveGroupId === group.id;
                    const count = countsByGroup[group.id] || 0;
                    const isEditing = editingGroupId === group.id;

                    return (
                      <div
                        key={group.id}
                        className={`group rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                            : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {isEditing ? (
                          <div className="p-2 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRename(group.id);
                                if (e.key === 'Escape') setEditingGroupId(null);
                              }}
                              className="w-full px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] text-[var(--text-primary)] focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmRename(group.id)}
                              className="p-1 text-[var(--meta-green)] hover:opacity-80 cursor-pointer"
                              title={t('saveNameTitle')}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGroupId(null)}
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                              title={t('cancelBtn')}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3 py-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSlotView(group.id);
                                onSelectActiveSaveGroup(group.id);
                              }}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: group.color }}
                              />
                              {isSelected ? (
                                <FolderOpen className="w-4 h-4 shrink-0" />
                              ) : (
                                <Folder className="w-4 h-4 shrink-0 opacity-75" />
                              )}
                              <span className="text-[13px] font-medium truncate">{group.name}</span>
                              {isTargetSlot && (
                                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--meta-green)] shrink-0">
                                  {t('activeBadge')}
                                </span>
                              )}
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartRename(group)}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity cursor-pointer"
                                title={t('renameGroupTitle')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedSlotView === group.id) {
                                    setSelectedSlotView('all');
                                  }
                                  onDeleteGroup(group.id);
                                }}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-500 transition-opacity cursor-pointer"
                                title={t('deleteGroupTitle')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                                {count}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Seletor do Slot Ativo para Novos Salvamentos */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-2.5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('defaultTarget')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('defaultTarget');
              }
            }}
            aria-expanded={sidebarDrawers.defaultTarget}
            className="w-full flex items-center justify-between gap-2 cursor-pointer group select-none text-left"
          >
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] min-w-0">
              <Pin className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span className="truncate">{t('defaultSaveTargetTitle')}</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0 ${
                sidebarDrawers.defaultTarget ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </div>

          {sidebarDrawers.defaultTarget && (
            <div className="space-y-2">
              <select
                value={activeSaveGroupId ?? ''}
                onChange={(e) => onSelectActiveSaveGroup(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
              >
                <option value="">{t('ungroupedOption')}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {t('slotPrefix')} {g.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] leading-snug">
                {t('defaultSaveTargetDescPrefix')}{' '}
                <em>{t('tabFederated', { count: 0 }).replace(/\s*\(\d+\)\s*$/, '')}</em>{' '}
                {t('defaultSaveTargetDescSuffix')}
              </p>
            </div>
          )}
        </div>

        {/* 4. Criar Novo Slot / Grupo de Pesquisa (Secondary creation action) */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('newGroup')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('newGroup');
              }
            }}
            aria-expanded={sidebarDrawers.newGroup}
            className="w-full flex items-center justify-between gap-2 cursor-pointer group select-none text-left"
          >
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] min-w-0">
              <FolderPlus className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span className="truncate">{t('newResearchGroupTitle')}</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0 ${
                sidebarDrawers.newGroup ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </div>

          {sidebarDrawers.newGroup && (
            <form onSubmit={handleCreateNewGroup} className="space-y-2.5">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t('slotPlaceholder')}
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5" aria-label={t('groupColorAria')}>
                  {GROUP_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewGroupColor(c.hex)}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        newGroupColor === c.hex
                          ? 'scale-125 ring-2 ring-[var(--text-primary)] ring-offset-1 ring-offset-[var(--bg-secondary)]'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={`${t('colorPrefix')} ${isEn ? c.labelEn : c.label}`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('createSlotPlusBtn')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 5. Backup & Importação (.bib / .ris / .json — Utility maintenance) */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSidebarDrawer('backup')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSidebarDrawer('backup');
              }
            }}
            aria-expanded={sidebarDrawers.backup}
            className="w-full flex items-center justify-between gap-2 cursor-pointer group select-none text-left"
          >
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] min-w-0">
              <HardDriveDownload className="w-4 h-4 text-[var(--meta-green)] shrink-0" />
              <span className="truncate">{t('localBackupTitle')}</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0 ${
                sidebarDrawers.backup ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </div>

          {sidebarDrawers.backup && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {t('localBackupDesc')}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".bib,.ris,.json"
                onChange={handleFileImport}
                className="hidden"
              />

              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <label htmlFor="restore-mode-select" className="shrink-0">
                  {t('restoreModeLabel')}
                </label>
                <select
                  id="restore-mode-select"
                  value={restoreMode}
                  onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                  className="flex-1 px-2 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="merge">{t('restoreModeMerge')}</option>
                  <option value="replace">{t('restoreModeReplace')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[var(--link-academic)]" />
                  <span>{t('importBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBackupJson}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  title={t('backupJsonTitle')}
                >
                  <HardDriveDownload className="w-3.5 h-3.5 text-[var(--meta-green)]" />
                  <span>{t('backupJsonBtn')}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBatchDoiPanel((prev) => !prev)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] hover:bg-[var(--bg-hover)] text-[var(--link-academic)] transition-colors cursor-pointer"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>{t('batchDoiBtn')}</span>
              </button>

              {showBatchDoiPanel && (
                <div className="space-y-2 p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)]">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {t('batchDoiTitle')}
                  </div>
                  <textarea
                    rows={3}
                    value={batchDoiText}
                    onChange={(e) => setBatchDoiText(e.target.value)}
                    placeholder={t('batchDoiPlaceholder')}
                    className="w-full px-2.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                  />
                  <button
                    type="button"
                    disabled={!batchDoiText.trim() || isResolvingBatchDoi}
                    onClick={handleResolveBatchDoi}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] cursor-pointer disabled:opacity-45"
                  >
                    {isResolvingBatchDoi && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isResolvingBatchDoi ? t('batchDoiResolving') : t('batchDoiResolveAction')}
                    </span>
                  </button>
                </div>
              )}

              {importFeedback && (
                <div className="text-xs px-2.5 py-2 rounded-lg bg-[var(--accent-blue-tint)] text-[var(--link-academic)] leading-snug">
                  {importFeedback}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* COLUNA DIREITA: MATRIZ DE FICHAMENTO & FLUXO PRISMA DO SLOT SELECIONADO */}
      <div className="min-w-0 space-y-5">
        {/* Top Controls: Slot Header, Mode Switcher & Export Bar */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                {activeGroupObj && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: activeGroupObj.color }}
                  />
                )}
                <h2 className="text-[19px] font-semibold text-[var(--text-primary)]">
                  {currentSlotTitle}
                </h2>
                <span className="text-[13px] font-medium px-2.5 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                  {slotItems.length} {slotItems.length === 1 ? t('studySingular') : t('studyPlural')}
                </span>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                {selectedSlotView === 'all'
                  ? t('slotAllDesc')
                  : selectedSlotView === 'ungrouped'
                  ? t('slotUngroupedDesc')
                  : t('slotGroupDesc', { name: activeGroupObj?.name ?? t('groupFallbackName') })}
              </p>
            </div>

            {slotItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                  title={t('exportCsvTitle')}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{t('exportCsvCount', { count: slotItems.length })}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBibtex}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>{t('downloadBib')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRis}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>{t('downloadRis')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>{t('exportMarkdownBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadLatex}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>{t('exportLatexBtn')}</span>
                </button>

                {(['abnt', 'apa'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleCopyAll(fmt)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer uppercase"
                  >
                    {bulkCopied === fmt ? (
                      <Check className="w-4 h-4 text-[var(--meta-green)]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                    <span>{t('copyAll', { format: fmt })}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    onClearAll(selectedSlotView === 'all' ? undefined : selectedSlotView)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                  title={selectedSlotView === 'all' ? t('clearAllTitle') : t('clearSlotTitle')}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {selectedSlotView === 'all' ? t('clearAll') : t('clearSlot')}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Sub-Tab Switcher: Matriz vs Fluxograma PRISMA */}
          <div className="flex items-center gap-2 border-t border-[var(--divider)] pt-3.5">
            <button
              type="button"
              onClick={() => setSubTab('matrix')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                subTab === 'matrix'
                  ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('subTabMatrix', { count: slotItems.length })}</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('prisma')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                subTab === 'prisma'
                  ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>{t('subTabPrisma')}</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('bibliometrics')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                subTab === 'bibliometrics'
                  ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('subTabBibliometrics')}</span>
            </button>

            {slotItems.length > 0 && (
              <button
                type="button"
                onClick={() => setBlindScreeningOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
              >
                <Scale className="w-4 h-4 text-[var(--link-academic)]" />
                <span>{t('blindScreeningBtn')}</span>
              </button>
            )}

            {onSaveCustomColumns && (
              <button
                type="button"
                onClick={() => setShowCustomColsManager((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                  showCustomColsManager
                    ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-[var(--link-academic)]" />
                <span>{t('customColsBtn', { count: customColumns.length })}</span>
              </button>
            )}
          </div>

          {showCustomColsManager && onSaveCustomColumns && (
            <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {t('customColsManagerTitle')}
                </h4>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const label = newColLabel.trim();
                  if (!label) return;
                  const id =
                    label
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '_')
                      .replace(/^_|_$/g, '') || `col_${Date.now()}`;
                  const uniqueId = customColumns.some((c) => c.id === id)
                    ? `${id}_${Date.now().toString().slice(-4)}`
                    : id;
                  onSaveCustomColumns([...customColumns, { id: uniqueId, label }]);
                  setNewColLabel('');
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  value={newColLabel}
                  onChange={(e) => setNewColLabel(e.target.value)}
                  placeholder={t('customColNamePlaceholder')}
                  className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('customColAddBtn')}</span>
                </button>
              </form>
              {customColumns.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">{t('customColEmpty')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {customColumns.map((col) => (
                    <span
                      key={col.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs font-medium text-[var(--text-primary)]"
                    >
                      <span>{col.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onSaveCustomColumns(customColumns.filter((c) => c.id !== col.id))
                        }
                        className="text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                        aria-label={`Remove ${col.label}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empty State for the Selected Slot */}
        {slotItems.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-10 text-center space-y-2.5">
            <Folder className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" />
            <h3 className="text-[17px] font-semibold text-[var(--text-primary)]">
              {selectedSlotView === 'all'
                ? t('emptySavedTitle')
                : selectedSlotView === 'ungrouped'
                ? t('emptyUngroupedTitle')
                : t('emptyGroupTitle', { name: activeGroupObj?.name ?? t('groupFallbackName') })}
            </h3>
            <p className="text-[15px] text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
              {selectedSlotView === 'all' ? t('emptySavedDesc') : t('emptySlotDesc')}
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: PRISMA 2020 FLOW DIAGRAM */}
            {subTab === 'prisma' && <PrismaFlowDiagram counts={prismaCounts} />}

            {/* VIEW 1B: PURE-SVG BIBLIOMETRICS DASHBOARD */}
            {subTab === 'bibliometrics' && (
              <Suspense fallback={null}>
                <BibliometricsPanel items={slotItems} />
              </Suspense>
            )}

            {/* VIEW 2: SYSTEMATIC SCREENING & MATRIX VIEW */}
            {subTab === 'matrix' && (
              <div className="space-y-4">
                {/* Screening Status Quick Filter Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl text-[13px]">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Filter className="w-4 h-4" />
                    <span className="font-semibold text-[var(--text-primary)]">
                      {t('systematicScreeningLabel', { title: currentSlotTitle })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: t('filterAllCount', { count: slotItems.length }) },
                        {
                          id: 'included',
                          label: t('filterIncludedCount', { count: prismaCounts.includedStudies }),
                        },
                        {
                          id: 'excluded',
                          label: t('filterExcludedCount', {
                            count: prismaCounts.excludedScreening,
                          }),
                        },
                        {
                          id: 'unscreened',
                          label: t('filterPendingCount', {
                            count: Math.max(
                              0,
                              slotItems.length -
                                prismaCounts.includedStudies -
                                prismaCounts.excludedScreening
                            ),
                          }),
                        },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterScreening(f.id)}
                        className={`px-2.5 py-1 rounded-md text-[13px] font-medium cursor-pointer transition-colors ${
                          filterScreening === f.id
                            ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-4">
                  {filteredItems.map((item) => {
                    const meta = item.abstractText
                      ? parseAbstractMetadata(
                          item.title,
                          item.abstractText,
                          item.publicationType,
                          language
                        )
                      : item.extractedMetadata ||
                        parseAbstractMetadata(
                          item.title,
                          item.abstractText,
                          item.publicationType,
                          language
                        );
                    const isDetailsOpen = Boolean(expandedDetails[item.id]);
                    const currentStatus = item.screeningStatus || 'unscreened';
                    const itemGroup = item.groupId
                      ? groups.find((g) => g.id === item.groupId)
                      : null;

                    return (
                      <div
                        key={item.id}
                        className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-3.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              {itemGroup ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--divider)]">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: itemGroup.color }}
                                  />
                                  <span>{itemGroup.name}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--divider)]">
                                  {t('ungroupedShort')}
                                </span>
                              )}

                              {item.isRetracted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-600 text-white">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{t('retractedBadge')}</span>
                                </span>
                              )}
                            </div>

                            <h4 className="text-[18px] font-medium text-[var(--link-academic)] leading-snug">
                              {sanitizeExternalUrl(item.url) ? (
                                <a
                                  href={sanitizeExternalUrl(item.url)!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {item.title}
                                </a>
                              ) : (
                                <span className="text-[var(--text-primary)]">{item.title}</span>
                              )}
                            </h4>
                            <div className="text-[13.5px] text-[var(--meta-green)] mt-1">
                              {item.authors.length > 0
                                ? item.authors.join(', ')
                                : t('noAuthors')}
                              {item.venue && <span> - {item.venue}</span>}
                              {item.year && <span>, {item.year}</span>}
                              <span> - {item.sourceLabel}</span>
                            </div>
                          </div>

                          {/* Group / Slot Assignment + Priority + Remove Controls */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* Move between Groups or to Ungrouped */}
                            <div className="inline-flex items-center gap-1.5 bg-[var(--bg-canvas)] rounded-lg px-2.5 py-1 border border-[var(--divider)]">
                              <Folder className="w-3.5 h-3.5 text-[var(--link-academic)] shrink-0" />
                              <select
                                value={item.groupId && groupNameMap[item.groupId] ? item.groupId : ''}
                                onChange={(e) =>
                                  onAssignPaperGroup(
                                    item.id,
                                    e.target.value ? e.target.value : null
                                  )
                                }
                                className="bg-transparent text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none"
                                title={t('movePaperGroupTitle')}
                              >
                                <option value="">{t('ungroupedOption')}</option>
                                {groups.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {t('slotPrefix')} {g.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <select
                              value={item.relevanceTag}
                              onChange={(e) =>
                                onUpdateRelevance(
                                  item.id,
                                  e.target.value as SavedPaperItem['relevanceTag']
                                )
                              }
                              className="bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-lg px-2.5 py-1 text-[13px] font-medium text-[var(--text-primary)] cursor-pointer"
                            >
                              <option value="alta">{t('priorityHigh')}</option>
                              <option value="media">{t('priorityMedium')}</option>
                              <option value="revisar">{t('priorityReview')}</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                              title={t('removeTooltip')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Deterministic Badges: Study Design & Sample Size */}
                        {(meta.studyDesign || meta.sampleSize) && (
                          <div className="flex flex-wrap items-center gap-2">
                            {meta.studyDesign && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--link-academic)] border border-[var(--divider)]">
                                <Microscope className="w-3.5 h-3.5" />
                                {meta.studyDesign}
                              </span>
                            )}
                            {meta.sampleSize && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--meta-green)] border border-[var(--divider)]">
                                <Users className="w-3.5 h-3.5" />
                                {meta.sampleSize}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Systematic Screening Action Buttons (Included / Excluded / Pending) */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--divider)]">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)] mr-1">
                            {t('prismaDecisionLabel')}
                          </span>

                          <button
                            type="button"
                            onClick={() => onUpdateScreening(item.id, 'included')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                              currentStatus === 'included'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('decisionInclude')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateScreening(
                                item.id,
                                'excluded',
                                item.exclusionReason || 'populacao_inadequada'
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                              currentStatus === 'excluded'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)]'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{t('decisionExclude')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onUpdateScreening(item.id, 'unscreened')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                              currentStatus === 'unscreened'
                                ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--divider)] shadow-xs'
                                : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>{t('decisionPending')}</span>
                          </button>

                          {/* If Excluded: Reason Selector */}
                          {currentStatus === 'excluded' && (
                            <select
                              value={item.exclusionReason || 'populacao_inadequada'}
                              onChange={(e) =>
                                onUpdateScreening(item.id, 'excluded', e.target.value)
                              }
                              className="bg-[var(--bg-canvas)] border border-rose-300 dark:border-rose-900/40 rounded-lg px-2.5 py-1 text-[13px] text-rose-700 dark:text-rose-300 cursor-pointer font-medium"
                            >
                              {Object.entries(getScreeningReasonLabels(language)).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Formatted ABNT Reference Preview + In-text Copy */}
                        <div className="bg-[var(--bg-canvas)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-secondary)] leading-relaxed space-y-2">
                          <div>
                            <span className="font-semibold text-[var(--text-primary)] select-none">
                              ABNT:{' '}
                            </span>
                            {formatAbntCitation(item)}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--divider)]">
                            {(['abnt', 'apa'] as const).map((styleKey) => {
                              const activeKey = `${styleKey}-${item.id}`;
                              const isCopied = copiedInTextKey === activeKey;
                              return (
                                <button
                                  key={styleKey}
                                  type="button"
                                  onClick={() => handleCopyInText(item, styleKey)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                >
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>
                                    {isCopied
                                      ? t('inTextCopiedLabel')
                                      : styleKey === 'abnt'
                                      ? t('copyInTextAbnt')
                                      : t('copyInTextApa')}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Extracted Structured Abstract Drawer Toggle */}
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDetails((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>
                              {isDetailsOpen ? t('hideExtractedVars') : t('showExtractedVars')}
                            </span>
                          </button>

                          {isDetailsOpen && (
                            <div className="mt-2.5 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--divider)] space-y-2 text-[13px]">
                              {meta.objective && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {t('labelObjective')}{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.objective}
                                  </span>
                                </div>
                              )}
                              {meta.methods && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {t('labelMethodsDesign')}{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.methods}
                                  </span>
                                </div>
                              )}
                              {meta.sampleSize && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {t('labelSampleParticipants')}{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.sampleSize}
                                  </span>
                                </div>
                              )}
                              {meta.results && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {t('labelResults')}{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.results}
                                  </span>
                                </div>
                              )}
                              {meta.conclusion && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {t('labelConclusion')}{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.conclusion}
                                  </span>
                                </div>
                              )}
                              {!meta.objective &&
                                !meta.methods &&
                                !meta.results &&
                                !meta.conclusion && (
                                  <div className="text-[var(--text-muted)] italic">
                                    {t('noStructuredSectionsNotice')}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>

                        {/* Custom Extraction Columns Inputs */}
                        {customColumns.length > 0 && onUpdateCustomField && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {customColumns.map((col) => (
                              <div key={col.id}>
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                                  {col.label}
                                </label>
                                <input
                                  type="text"
                                  value={item.customFields?.[col.id] ?? ''}
                                  onChange={(e) =>
                                    onUpdateCustomField(item.id, col.id, e.target.value)
                                  }
                                  placeholder={col.placeholder || col.label}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quality Appraisal Checklist Drawer (RoB 2 / JBI / CASP) */}
                        {onUpdateQualityAppraisal && (
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedQuality((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                  }))
                                }
                                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                <span>{t('qualityAppraisalBtn')}</span>
                              </button>
                              {item.qualityAppraisal && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    item.qualityAppraisal.overall === 'low'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : item.qualityAppraisal.overall === 'high'
                                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {item.qualityAppraisal.tool.toUpperCase()} ·{' '}
                                  {getQualityRatingLabel(
                                    item.qualityAppraisal.overall,
                                    language
                                  )}
                                </span>
                              )}
                            </div>

                            {expandedQuality[item.id] && (() => {
                              const currentAppraisal =
                                item.qualityAppraisal ||
                                createEmptyQualityAppraisal('rob2');
                              const def = getQualityChecklistDefinition(
                                currentAppraisal.tool,
                                language
                              );
                              return (
                                <div className="mt-2.5 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--divider)] space-y-3 text-xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[var(--text-primary)]">
                                        {t('qualityToolLabel')}
                                      </span>
                                      <select
                                        value={currentAppraisal.tool}
                                        onChange={(e) =>
                                          onUpdateQualityAppraisal(
                                            item.id,
                                            createEmptyQualityAppraisal(
                                              e.target.value as QualityToolId
                                            )
                                          )
                                        }
                                        className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] font-medium cursor-pointer"
                                      >
                                        <option value="rob2">Cochrane RoB 2</option>
                                        <option value="jbi_quasi">JBI Quasi-Experimental</option>
                                        <option value="casp_qual">CASP Qualitative</option>
                                      </select>
                                    </div>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                      {t('qualityOverallLabel')}{' '}
                                      {getQualityRatingLabel(currentAppraisal.overall, language)}
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {def.criteria.map((criterion) => (
                                      <div
                                        key={criterion.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 border-t border-[var(--divider)]"
                                      >
                                        <span className="text-[var(--text-secondary)]">
                                          {criterion.label}
                                        </span>
                                        <select
                                          value={currentAppraisal.criteria[criterion.id] || 'unclear'}
                                          onChange={(e) => {
                                            const nextCriteria = {
                                              ...currentAppraisal.criteria,
                                              [criterion.id]: e.target.value as QualityRating,
                                            };
                                            onUpdateQualityAppraisal(item.id, {
                                              ...currentAppraisal,
                                              criteria: nextCriteria,
                                              overall: computeOverallQuality(nextCriteria),
                                              updatedAt: new Date().toISOString(),
                                            });
                                          }}
                                          className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] shrink-0 cursor-pointer"
                                        >
                                          <option value="low">{t('qualityScoreLow')}</option>
                                          <option value="some_concerns">{t('qualityScoreSome')}</option>
                                          <option value="high">{t('qualityScoreHigh')}</option>
                                          <option value="unclear">{t('qualityScoreUnclear')}</option>
                                        </select>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Researcher Notes Input */}
                        <div>
                          <textarea
                            rows={2}
                            value={item.researcherNotes}
                            onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                            placeholder={t('notesPlaceholder')}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20 transition-all border border-[var(--divider)]"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-5 text-[13px] text-[var(--text-muted)]">
                          {sanitizeExternalUrl(item.url) && (
                            <a
                              href={sanitizeExternalUrl(item.url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[var(--link-academic)] hover:underline"
                            >
                              {t('openSource')}
                            </a>
                          )}
                          {sanitizeExternalUrl(item.pdfUrl) && (
                            <a
                              href={sanitizeExternalUrl(item.pdfUrl)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[var(--meta-green)] hover:underline"
                            >
                              [PDF] {t('downloadFullPdf')}
                            </a>
                          )}
                          {!sanitizeExternalUrl(item.pdfUrl) &&
                            sanitizeExternalUrl(unpaywallState[item.id]?.pdfUrl) && (
                              <a
                                href={sanitizeExternalUrl(unpaywallState[item.id]?.pdfUrl)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                [{t('unpaywallFoundBadge')}]
                              </a>
                            )}
                          {!sanitizeExternalUrl(item.pdfUrl) &&
                            !sanitizeExternalUrl(unpaywallState[item.id]?.pdfUrl) &&
                            item.doi && (
                              <button
                                type="button"
                                disabled={unpaywallState[item.id]?.status === 'loading'}
                                onClick={() => handleFindUnpaywall(item)}
                                className="inline-flex items-center gap-1 font-medium text-[var(--link-academic)] hover:underline cursor-pointer disabled:opacity-50"
                              >
                                {unpaywallState[item.id]?.status === 'loading' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileSearch className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {unpaywallState[item.id]?.status === 'not_found'
                                    ? t('unpaywallNotFoundMsg')
                                    : t('findOaPdfBtn')}
                                </span>
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => setChaseSeedPaper(item)}
                            className="inline-flex items-center gap-1 font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>{t('chaseCitationsBtn')}</span>
                          </button>

                          <span>{t('citedByCount', { count: item.citationCount })}</span>

                          {onLinkRelatedPaper && items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (linkingTargetId === item.id) {
                                  setLinkingTargetId(null);
                                  setLinkCandidateId('');
                                } else {
                                  const firstCandidate = items.find((other) => other.id !== item.id);
                                  setLinkingTargetId(item.id);
                                  setLinkCandidateId(firstCandidate?.id ?? '');
                                }
                              }}
                              className="inline-flex items-center gap-1 font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>{t('linkPreprintAction')}</span>
                            </button>
                          )}
                        </div>

                        {item.relatedUrls && item.relatedUrls.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                            <span className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1">
                              <Link2 className="w-3.5 h-3.5 text-[var(--link-academic)]" />
                              {t('relatedLinksTitle')}:
                            </span>
                            {item.relatedUrls.map((rel, relIdx) => {
                              const safeRel = sanitizeExternalUrl(rel.url);
                              if (!safeRel) return null;
                              return (
                                <a
                                  key={`${safeRel}-${relIdx}`}
                                  href={safeRel}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--link-academic)] hover:underline"
                                >
                                  [{rel.kind === 'preprint' ? 'Preprint' : rel.kind === 'published' ? 'Published' : 'Ref'}] {rel.label}
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {linkingTargetId === item.id && onLinkRelatedPaper && (
                          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs">
                            <select
                              value={linkCandidateId}
                              onChange={(e) => setLinkCandidateId(e.target.value)}
                              className="flex-1 min-w-[200px] bg-[var(--bg-subtle)] border border-[var(--divider)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
                            >
                              {items
                                .filter((other) => other.id !== item.id)
                                .map((other) => (
                                  <option key={other.id} value={other.id}>
                                    [{other.source.toUpperCase()} {other.year ?? 's.d.'}] {other.title.slice(0, 75)}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={!linkCandidateId}
                              onClick={() => {
                                if (linkCandidateId) {
                                  onLinkRelatedPaper(item.id, linkCandidateId);
                                  setLinkingTargetId(null);
                                  setLinkCandidateId('');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[var(--link-academic)] text-white font-medium cursor-pointer disabled:opacity-50"
                            >
                              {t('linkPreprintAction')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingTargetId(null);
                                setLinkCandidateId('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CitationChaserModal
        seedPaper={chaseSeedPaper}
        accessConfig={userAccessConfig}
        savedIds={savedIdSet}
        activeSaveGroupId={activeSaveGroupId}
        onToggleSave={(paper, targetGroup) => {
          if (savedIdSet.has(paper.id)) {
            onRemoveItem(paper.id);
          } else {
            onImportPapers(
              [
                {
                  ...paper,
                  savedAt: new Date().toISOString(),
                  researcherNotes: '',
                  relevanceTag: 'alta',
                  screeningStatus: 'unscreened',
                  extractedMetadata: parseAbstractMetadata(
                    paper.title,
                    paper.abstractText,
                    paper.publicationType,
                    language
                  ),
                },
              ],
              targetGroup ?? activeSaveGroupId
            );
          }
        }}
        onClose={() => setChaseSeedPaper(null)}
      />

      <BlindScreeningModal
        isOpen={blindScreeningOpen}
        items={slotItems}
        groupName={activeGroupObj?.name}
        onUpdateScreening={onUpdateScreening}
        onClose={() => setBlindScreeningOpen(false)}
      />
    </div>
  );
};
