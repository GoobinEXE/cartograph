import { useRef, useState, type ChangeEvent } from 'react';
import { FileSearch, HardDriveDownload, Loader2, Upload } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { resolveIdentifierBatch } from '../../services/doiBatchResolver';
import {
  useWorkspace,
  type BackupRestoreMode,
  type BackupRestoreResult,
} from '../../state/workspace';
import type { SavedPaperItem } from '../../types/academic';
import { parseAbstractMetadata } from '../../utils/abstractParser';
import { parseImportedReferences } from '../../utils/bibImporter';
import { triggerFileDownload } from '../../utils/citationExporter';
import {
  exportWorkspaceBackup,
  parseWorkspaceBackup,
  type CartographBackupPayload,
} from '../../utils/workspaceBackup';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import {
  resolveImportTargetGroup,
  SAVED_CARD_DRAWER_HEADER_CLASS,
  SAVED_CARD_DRAWER_TITLE_CLASS,
  type LibrarySlotView,
} from './libraryShared';

interface LibraryBackupSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedSlotView: LibrarySlotView;
  ownedPlatformIds?: string[];
  onRestoreBackup: (payload: CartographBackupPayload, mode: BackupRestoreMode) => BackupRestoreResult;
}

/** JSON workspace backup and restore, BibTeX/RIS import and batch DOI/PMID/arXiv resolution. */
export function LibraryBackupSection({
  isOpen,
  onToggle,
  selectedSlotView,
  ownedPlatformIds,
  onRestoreBackup,
}: LibraryBackupSectionProps) {
  const { language, t } = useI18n();
  const { state: workspace, actions } = useWorkspace();
  const {
    savedPapers: items,
    libraryGroups: groups,
    selectedPlatformIds,
    activeSaveGroupId,
    searchLogs,
    dedupOverrides,
    customColumns,
  } = workspace;
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [showBatchDoiPanel, setShowBatchDoiPanel] = useState(false);
  const [batchDoiText, setBatchDoiText] = useState('');
  const [isResolvingBatchDoi, setIsResolvingBatchDoi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleResolveBatchDoi = async () => {
    if (!batchDoiText.trim() || isResolvingBatchDoi) return;
    setIsResolvingBatchDoi(true);
    try {
      const { papers, unresolved } = await resolveIdentifierBatch(batchDoiText);
      const targetGroup = resolveImportTargetGroup(selectedSlotView, activeSaveGroupId);
      const toImport: SavedPaperItem[] = papers.map((p) => ({
        ...p,
        savedAt: new Date().toISOString(),
        researcherNotes: '',
        relevanceTag: 'alta',
        screeningStatus: 'unscreened',
        extractedMetadata: parseAbstractMetadata(p.title, p.abstractText, p.publicationType, language),
      }));
      const summary = toImport.length > 0 ? actions.importPapers(toImport, targetGroup) : { added: 0, skippedDuplicates: 0 };
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

  const handleFileImport = async (e: ChangeEvent<HTMLInputElement>) => {
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

      const targetGroup = resolveImportTargetGroup(selectedSlotView, activeSaveGroupId);
      const summary = actions.importPapers(detected.items, targetGroup);
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

  return (
    <CollapsibleSection
      isOpen={isOpen}
      onToggle={onToggle}
      className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-3"
      headerClassName={SAVED_CARD_DRAWER_HEADER_CLASS}
      titleClassName={SAVED_CARD_DRAWER_TITLE_CLASS}
      contentClassName="space-y-3"
      title={
        <>
          <HardDriveDownload className="w-4 h-4 text-[var(--meta-green)] shrink-0" />
          <span className="truncate">{t('localBackupTitle')}</span>
        </>
      }
    >
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
    </CollapsibleSection>
  );
}
