import { proseLanguage } from '../../i18n/localized';
import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Scale,
  Share2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useWorkspaceActions } from '../../state/workspace';
import type { CustomExtractionColumn, LibraryGroup, SavedPaperItem } from '../../types/academic';
import { trackAcademicEvent } from '../../utils/analytics';
import {
  exportSavedPapersCsv,
  exportSavedPapersRis,
  exportSynthesisLatexTable,
  exportSynthesisMarkdown,
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
} from '../../utils/citationExporter';
import {
  canUseNativeShare,
  copyTextSafely,
  shareOrDownloadFile,
  shareTextSafely,
} from '../../utils/fileDownload';
import { MobileSheet } from '../ui/MobileSheet';
import { CustomColumnsManager } from './CustomColumnsManager';
import type { LibrarySlotView, LibrarySubTab } from './libraryShared';

interface LibraryToolbarProps {
  slotItems: SavedPaperItem[];
  selectedSlotView: LibrarySlotView;
  activeGroupObj: LibraryGroup | null;
  currentSlotTitle: string;
  groupNameMap: Record<string, string>;
  customColumns: CustomExtractionColumn[];
  subTab: LibrarySubTab;
  onSubTabChange: (tab: LibrarySubTab) => void;
  onOpenBlindScreening: () => void;
}

/** Slot header, responsive export sheet/bar, sub-tab switcher and custom-column manager. */
export function LibraryToolbar({
  slotItems,
  selectedSlotView,
  activeGroupObj,
  currentSlotTitle,
  groupNameMap,
  customColumns,
  subTab,
  onSubTabChange,
  onOpenBlindScreening,
}: LibraryToolbarProps) {
  const { language, t } = useI18n();
  // File-name slugs follow the prose language (pt or en), like the export contents.
  const isEn = proseLanguage(language) === 'en';
  const actions = useWorkspaceActions();
  const [bulkCopied, setBulkCopied] = useState<string | null>(null);
  const [showCustomColsManager, setShowCustomColsManager] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [confirmClearPending, setConfirmClearPending] = useState(false);

  const buildCitationsText = (format: 'abnt' | 'apa' | 'bibtex') =>
    slotItems
      .map((item) =>
        format === 'abnt'
          ? formatAbntCitation(item)
          : format === 'apa'
          ? formatApaCitation(item)
          : formatBibtexEntry(item)
      )
      .join('\n\n');

  const handleCopyAll = async (format: 'abnt' | 'apa' | 'bibtex') => {
    if (slotItems.length === 0) return;
    const text = buildCitationsText(format);
    const ok = await copyTextSafely(text);
    if (!ok) return;
    trackAcademicEvent('citation_export', {
      format,
      items_count: slotItems.length,
    });
    setBulkCopied(format);
    window.setTimeout(() => setBulkCopied(null), 2000);
  };

  const handleShareCitations = async (format: 'abnt' | 'apa') => {
    if (slotItems.length === 0) return;
    const text = buildCitationsText(format);
    const outcome = await shareTextSafely(`${currentSlotTitle} (${format.toUpperCase()})`, text);
    if (outcome === 'copied') {
      setBulkCopied(format);
      window.setTimeout(() => setBulkCopied(null), 2000);
    }
    if (outcome !== 'cancelled' && outcome !== 'failed') {
      trackAcademicEvent('citation_export', {
        format,
        items_count: slotItems.length,
      });
    }
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

  const handleDownloadCsv = async () => {
    if (slotItems.length === 0) return;
    const csv = exportSavedPapersCsv(slotItems, groupNameMap, language, customColumns);
    const dateStamp = new Date().toISOString().slice(0, 10);
    await shareOrDownloadFile(
      `cartograph-prisma-${getExportSlug()}-${dateStamp}.csv`,
      csv,
      'text/csv;charset=utf-8;',
      currentSlotTitle
    );
    trackAcademicEvent('citation_export', {
      format: 'csv',
      items_count: slotItems.length,
    });
  };

  const handleDownloadBibtex = async () => {
    if (slotItems.length === 0) return;
    const bib = slotItems.map(formatBibtexEntry).join('\n\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    await shareOrDownloadFile(
      `cartograph-refs-${getExportSlug()}-${dateStamp}.bib`,
      bib,
      'application/x-bibtex;charset=utf-8;',
      currentSlotTitle
    );
    trackAcademicEvent('citation_export', {
      format: 'bibtex',
      items_count: slotItems.length,
    });
  };

  const handleDownloadRis = async () => {
    if (slotItems.length === 0) return;
    const ris = exportSavedPapersRis(slotItems);
    const dateStamp = new Date().toISOString().slice(0, 10);
    await shareOrDownloadFile(
      `cartograph-refs-${getExportSlug()}-${dateStamp}.ris`,
      ris,
      'application/x-research-info-systems;charset=utf-8;',
      currentSlotTitle
    );
    trackAcademicEvent('citation_export', {
      format: 'ris',
      items_count: slotItems.length,
    });
  };

  const handleDownloadMarkdown = async () => {
    if (slotItems.length === 0) return;
    const md = exportSynthesisMarkdown(slotItems, groupNameMap, language, customColumns);
    const dateStamp = new Date().toISOString().slice(0, 10);
    await shareOrDownloadFile(
      `cartograph-synthesis-${getExportSlug()}-${dateStamp}.md`,
      md,
      'text/markdown;charset=utf-8;',
      currentSlotTitle
    );
    trackAcademicEvent('citation_export', {
      format: 'markdown',
      items_count: slotItems.length,
    });
  };

  const handleDownloadLatex = async () => {
    if (slotItems.length === 0) return;
    const tex = exportSynthesisLatexTable(slotItems, language);
    const dateStamp = new Date().toISOString().slice(0, 10);
    await shareOrDownloadFile(
      `cartograph-table-${getExportSlug()}-${dateStamp}.tex`,
      tex,
      'application/x-tex;charset=utf-8;',
      currentSlotTitle
    );
    trackAcademicEvent('citation_export', {
      format: 'latex',
      items_count: slotItems.length,
    });
  };

  const handleConfirmClearLibrary = () => {
    actions.clearLibrary(selectedSlotView === 'all' ? undefined : selectedSlotView);
    setConfirmClearPending(false);
    setExportSheetOpen(false);
  };

  const nativeShareAvailable = canUseNativeShare();

  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 sm:p-5 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            {activeGroupObj && (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: activeGroupObj.color }}
              />
            )}
            <h2 className="text-[18px] sm:text-[19px] font-semibold text-[var(--text-primary)] truncate">
              {currentSlotTitle}
            </h2>
            <span className="text-[13px] font-medium px-2.5 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] tabular-nums shrink-0">
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

        {/* Desktop Export Actions Bar (>= 768px) */}
        {slotItems.length > 0 && (
          <div className="hidden md:flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              title={t('exportCsvTitle')}
            >
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              <span>{t('exportCsvCount', { count: slotItems.length })}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBibtex}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
              <span>{t('downloadBib')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadRis}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
              <span>{t('downloadRis')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
              <span>{t('exportMarkdownBtn')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadLatex}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
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
                  <Check className="w-4 h-4 text-[var(--meta-green)]" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                )}
                <span>{t('copyAll', { format: fmt })}</span>
              </button>
            ))}

            {!confirmClearPending ? (
              <button
                type="button"
                onClick={() => setConfirmClearPending(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                title={selectedSlotView === 'all' ? t('clearAllTitle') : t('clearSlotTitle')}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>{selectedSlotView === 'all' ? t('clearAll') : t('clearSlot')}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {t('confirmClearSlotMsg')}
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmClearPending(false)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-medium text-[var(--text-secondary)] cursor-pointer"
                >
                  {t('cancelActionBtn')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearLibrary}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                >
                  {t('confirmActionBtn')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Concise Sub-Tabs & Action Bar (< 768px) */}
      <div className="md:hidden space-y-2.5 border-t border-[var(--divider)] pt-3">
        <div
          role="tablist"
          aria-label={t('savedTitle', { count: slotItems.length, label: t('studyPlural') })}
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'matrix'}
            onClick={() => onSubTabChange('matrix')}
            className={`min-h-11 px-2 py-1.5 rounded-lg text-[11.5px] font-semibold leading-tight flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors ${
              subTab === 'matrix'
                ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 tabular-nums">
              {t('subTabMatrix', { count: slotItems.length })}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'prisma'}
            onClick={() => onSubTabChange('prisma')}
            className={`min-h-11 px-2 py-1.5 rounded-lg text-[11.5px] font-semibold leading-tight flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors ${
              subTab === 'prisma'
                ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <GitBranch className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{t('subTabPrisma')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'bibliometrics'}
            onClick={() => onSubTabChange('bibliometrics')}
            className={`min-h-11 px-2 py-1.5 rounded-lg text-[11.5px] font-semibold leading-tight flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors ${
              subTab === 'bibliometrics'
                ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{t('subTabBibliometrics')}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {slotItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={onOpenBlindScreening}
                className="flex-1 min-w-[140px] min-h-11 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
              >
                <Scale className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                <span className="truncate">{t('blindScreeningBtn')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmClearPending(false);
                  setExportSheetOpen(true);
                }}
                className="flex-1 min-w-[140px] min-h-11 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer transition-opacity shadow-xs"
              >
                {nativeShareAvailable ? (
                  <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{t('exportSheetBtn')}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowCustomColsManager((prev) => !prev)}
            aria-expanded={showCustomColsManager}
            className={`min-h-11 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-colors border ${
              slotItems.length === 0 ? 'w-full' : ''
            } ${
              showCustomColsManager
                ? 'bg-[var(--bg-canvas)] border-[var(--link-academic)]/40 text-[var(--link-academic)] shadow-xs'
                : 'bg-[var(--bg-canvas)] border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
            <span className="tabular-nums">{t('customColsBtn', { count: customColumns.length })}</span>
          </button>
        </div>
      </div>

      {/* Desktop Sub-Tab Switcher (>= 768px) */}
      <div className="hidden md:flex flex-wrap items-center gap-2 border-t border-[var(--divider)] pt-3.5">
        <button
          type="button"
          onClick={() => onSubTabChange('matrix')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
            subTab === 'matrix'
              ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
          <span>{t('subTabMatrix', { count: slotItems.length })}</span>
        </button>

        <button
          type="button"
          onClick={() => onSubTabChange('prisma')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
            subTab === 'prisma'
              ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <GitBranch className="w-4 h-4" aria-hidden="true" />
          <span>{t('subTabPrisma')}</span>
        </button>

        <button
          type="button"
          onClick={() => onSubTabChange('bibliometrics')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
            subTab === 'bibliometrics'
              ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <BarChart3 className="w-4 h-4" aria-hidden="true" />
          <span>{t('subTabBibliometrics')}</span>
        </button>

        {slotItems.length > 0 && (
          <button
            type="button"
            onClick={onOpenBlindScreening}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
          >
            <Scale className="w-4 h-4 text-[var(--link-academic)]" aria-hidden="true" />
            <span>{t('blindScreeningBtn')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowCustomColsManager((prev) => !prev)}
          aria-expanded={showCustomColsManager}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
            showCustomColsManager
              ? 'bg-[var(--bg-canvas)] text-[var(--link-academic)] shadow-xs'
              : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-[var(--link-academic)]" aria-hidden="true" />
          <span>{t('customColsBtn', { count: customColumns.length })}</span>
        </button>
      </div>

      {showCustomColsManager && (
        <CustomColumnsManager
          customColumns={customColumns}
          newColLabel={newColLabel}
          onNewColLabelChange={setNewColLabel}
          onSaveColumns={actions.setCustomColumns}
        />
      )}

      {/* Mobile Export & Sample Management Bottom Sheet */}
      <MobileSheet
        open={exportSheetOpen}
        onClose={() => {
          setExportSheetOpen(false);
          setConfirmClearPending(false);
        }}
        title={t('exportSheetTitle')}
        subtitle={`${currentSlotTitle} · ${slotItems.length} ${
          slotItems.length === 1 ? t('studySingular') : t('studyPlural')
        }`}
        closeLabel={t('mobileCloseSheetBtn')}
        dragHandleLabel={t('mobileDragHandleLabel')}
        initialSnap="auto"
      >
        <div className="space-y-5">
          {/* Group 1: Matrices & Manuscript Synthesis */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('exportGroupMatrices')}
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="w-full min-h-11 px-4 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-sm font-semibold inline-flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t('exportCsvCount', { count: slotItems.length })}</span>
                </span>
                {nativeShareAvailable ? (
                  <Share2 className="w-4 h-4 shrink-0 opacity-80" aria-hidden="true" />
                ) : (
                  <Download className="w-4 h-4 shrink-0 opacity-80" aria-hidden="true" />
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13.5px] font-medium text-[var(--text-primary)] inline-flex items-center justify-center gap-2 hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                  <span>{t('exportMarkdownBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadLatex}
                  className="min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13.5px] font-medium text-[var(--text-primary)] inline-flex items-center justify-center gap-2 hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                  <span>{t('exportLatexBtn')}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Group 2: Reference Managers */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('exportGroupManagers')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadBibtex}
                className="min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13.5px] font-medium text-[var(--text-primary)] inline-flex items-center justify-center gap-2 hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <Download className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                <span>{t('downloadBib')}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadRis}
                className="min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13.5px] font-medium text-[var(--text-primary)] inline-flex items-center justify-center gap-2 hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <Download className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
                <span>{t('downloadRis')}</span>
              </button>
            </div>
          </section>

          {/* Group 3: Copy or Share Formatted Citations */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('exportGroupCitations')}
            </h3>
            <div className="space-y-2">
              {(['abnt', 'apa'] as const).map((fmt) => (
                <div key={fmt} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyAll(fmt)}
                    className="flex-1 min-h-11 px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13.5px] font-medium text-[var(--text-primary)] inline-flex items-center justify-center gap-2 hover:bg-[var(--bg-subtle)] cursor-pointer uppercase"
                  >
                    {bulkCopied === fmt ? (
                      <Check className="w-4 h-4 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                    )}
                    <span>{t('copyAll', { format: fmt })}</span>
                  </button>

                  {nativeShareAvailable && (
                    <button
                      type="button"
                      onClick={() => handleShareCitations(fmt)}
                      aria-label={`${t('shareActionBtn')} ${fmt.toUpperCase()}`}
                      className="min-h-11 px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13px] font-medium text-[var(--link-academic)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t('shareActionBtn')}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Group 4: Danger Zone with 2-step confirmation */}
          <section className="space-y-2 pt-2 border-t border-[var(--divider)]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              {t('exportGroupDangerZone')}
            </h3>

            {!confirmClearPending ? (
              <button
                type="button"
                onClick={() => setConfirmClearPending(true)}
                className="w-full min-h-11 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm font-semibold text-rose-700 dark:text-rose-300 inline-flex items-center justify-center gap-2 hover:bg-rose-500/15 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{selectedSlotView === 'all' ? t('clearAll') : t('clearSlot')}</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <div className="flex items-start gap-2.5 text-[13px] text-[var(--text-primary)] leading-snug">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t('confirmClearSlotMsg')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearPending(false)}
                    className="min-h-11 px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-sm font-medium text-[var(--text-primary)] cursor-pointer"
                  >
                    {t('cancelActionBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClearLibrary}
                    className="min-h-11 px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 cursor-pointer"
                  >
                    {t('confirmActionBtn')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </MobileSheet>
    </div>
  );
}
