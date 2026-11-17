import { proseLanguage } from '../../i18n/localized';
import { useState } from 'react';
import {
  BarChart3,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Scale,
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
  triggerFileDownload,
} from '../../utils/citationExporter';
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

/** Slot header, export bar, sub-tab switcher and custom-column manager above the library views. */
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
      .replace(/[̀-ͯ]/g, '')
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

  return (
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
                actions.clearLibrary(selectedSlotView === 'all' ? undefined : selectedSlotView)
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
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--divider)] pt-3.5">
        <button
          type="button"
          onClick={() => onSubTabChange('matrix')}
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
          onClick={() => onSubTabChange('prisma')}
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
          onClick={() => onSubTabChange('bibliometrics')}
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
            onClick={onOpenBlindScreening}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
          >
            <Scale className="w-4 h-4 text-[var(--link-academic)]" />
            <span>{t('blindScreeningBtn')}</span>
          </button>
        )}

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
      </div>

      {showCustomColsManager && (
        <CustomColumnsManager
          customColumns={customColumns}
          newColLabel={newColLabel}
          onNewColLabelChange={setNewColLabel}
          onSaveColumns={actions.setCustomColumns}
        />
      )}
    </div>
  );
}
