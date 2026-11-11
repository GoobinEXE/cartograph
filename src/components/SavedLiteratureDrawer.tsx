import React, { useMemo, useState } from 'react';
import {
  DeduplicationSummary,
  SavedPaperItem,
  ScreeningExclusionReason,
  ScreeningStatus,
} from '../types/academic';
import {
  exportSavedPapersCsv,
  formatAbntCitation,
  formatApaCitation,
  formatBibtexEntry,
  triggerFileDownload,
} from '../utils/citationExporter';
import { calculatePrisma2020Counts, SCREENING_REASON_LABELS } from '../utils/prismaFlow';
import { PrismaFlowDiagram } from './PrismaFlowDiagram';
import { parseAbstractMetadata } from '../utils/abstractParser';
import { useI18n } from '../i18n/context';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  GitBranch,
  HelpCircle,
  Microscope,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';

interface SavedLiteratureDrawerProps {
  items: SavedPaperItem[];
  dedupSummary?: DeduplicationSummary | null;
  sourceBreakdown?: Record<string, number>;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateRelevance: (id: string, relevance: SavedPaperItem['relevanceTag']) => void;
  onUpdateScreening: (id: string, status: ScreeningStatus, reason?: string) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export const SavedLiteratureDrawer: React.FC<SavedLiteratureDrawerProps> = ({
  items,
  dedupSummary,
  sourceBreakdown,
  onUpdateNotes,
  onUpdateRelevance,
  onUpdateScreening,
  onRemoveItem,
  onClearAll,
}) => {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<'matrix' | 'prisma'>('matrix');
  const [filterScreening, setFilterScreening] = useState<'all' | ScreeningStatus>('all');
  const [bulkCopied, setBulkCopied] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const prismaCounts = useMemo(() => {
    const totalIdentified = dedupSummary?.originalCount || 0;
    const duplicatesCount = dedupSummary?.duplicatesRemoved || 0;
    return calculatePrisma2020Counts(items, totalIdentified, duplicatesCount, sourceBreakdown);
  }, [items, dedupSummary, sourceBreakdown]);

  const filteredItems = useMemo(() => {
    if (filterScreening === 'all') return items;
    return items.filter((item) => (item.screeningStatus || 'unscreened') === filterScreening);
  }, [items, filterScreening]);

  const handleCopyAll = async (format: 'abnt' | 'apa' | 'bibtex') => {
    if (items.length === 0) return;
    const text = items
      .map((item) =>
        format === 'abnt'
          ? formatAbntCitation(item)
          : format === 'apa'
          ? formatApaCitation(item)
          : formatBibtexEntry(item)
      )
      .join('\n\n');

    await navigator.clipboard.writeText(text);
    setBulkCopied(format);
    setTimeout(() => setBulkCopied(null), 2000);
  };

  const handleDownloadCsv = () => {
    if (items.length === 0) return;
    const csv = exportSavedPapersCsv(items);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-prisma-matrix-${dateStamp}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
  };

  const handleDownloadBibtex = () => {
    if (items.length === 0) return;
    const bib = items.map(formatBibtexEntry).join('\n\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-references-${dateStamp}.bib`,
      bib,
      'application/x-bibtex;charset=utf-8;'
    );
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
          {t('emptySavedTitle')}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t('emptySavedDesc')}
        </p>
      </div>
    );
  }

  const countLabel = items.length === 1 ? t('studySingular') : t('studyPlural');

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Controls: Mode Switcher & Export Bar */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {t('savedTitle', { count: items.length, label: countLabel })}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Gestão determinística de literatura, triagem sistemática e síntese PRISMA 2020.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              title="Baixar planilha compatível com Excel e LibreOffice"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Matriz PRISMA (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBibtex}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>{t('downloadBib')}</span>
            </button>

            {(['abnt', 'apa'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => handleCopyAll(fmt)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer uppercase"
              >
                {bulkCopied === fmt ? (
                  <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                )}
                <span>{t('copyAll', { format: fmt })}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('clearAll')}</span>
            </button>
          </div>
        </div>

        {/* Sub-Tab Switcher: Matriz vs Fluxograma PRISMA */}
        <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={() => setSubTab('matrix')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              subTab === 'matrix'
                ? 'bg-[var(--bg-card)] text-[var(--link-academic)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Matriz de Fichamento ({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('prisma')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              subTab === 'prisma'
                ? 'bg-[var(--bg-card)] text-[var(--link-academic)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Fluxograma PRISMA 2020</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: PRISMA 2020 FLOW DIAGRAM */}
      {subTab === 'prisma' && <PrismaFlowDiagram counts={prismaCounts} />}

      {/* VIEW 2: SYSTEMATIC SCREENING & MATRIX VIEW */}
      {subTab === 'matrix' && (
        <div className="space-y-4">
          {/* Screening Status Quick Filter Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Filter className="w-3.5 h-3.5" />
              <span className="font-semibold text-[var(--text-primary)]">Triagem Sistemática:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `Todos (${items.length})` },
                  { id: 'included', label: `Incluídos (${prismaCounts.includedStudies})` },
                  { id: 'excluded', label: `Excluídos (${prismaCounts.excludedScreening})` },
                  {
                    id: 'unscreened',
                    label: `Pendentes (${Math.max(
                      0,
                      items.length - prismaCounts.includedStudies - prismaCounts.excludedScreening
                    )})`,
                  },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterScreening(f.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    filterScreening === f.id
                      ? 'bg-[var(--bg-card)] text-[var(--link-academic)] shadow-xs'
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
              const meta =
                item.extractedMetadata ||
                parseAbstractMetadata(item.title, item.abstractText, item.publicationType);
              const isDetailsOpen = Boolean(expandedDetails[item.id]);
              const currentStatus = item.screeningStatus || 'unscreened';

              return (
                <div key={item.id} className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <h4 className="text-[16px] font-semibold text-[var(--link-academic)] leading-snug">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {item.title}
                        </a>
                      </h4>
                      <div className="text-[13px] text-[var(--meta-green)] mt-0.5">
                        {item.authors.length > 0 ? item.authors.join(', ') : t('noAuthors')}
                        {item.venue && <span> - {item.venue}</span>}
                        {item.year && <span>, {item.year}</span>}
                        <span> - {item.sourceLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={item.relevanceTag}
                        onChange={(e) =>
                          onUpdateRelevance(
                            item.id,
                            e.target.value as SavedPaperItem['relevanceTag']
                          )
                        }
                        className="bg-[var(--bg-canvas)] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] cursor-pointer"
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      {meta.studyDesign && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--bg-canvas)] text-[var(--link-academic)] border border-[var(--border-subtle)]">
                          <Microscope className="w-3 h-3" />
                          {meta.studyDesign}
                        </span>
                      )}
                      {meta.sampleSize && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--bg-canvas)] text-[var(--meta-green)] border border-[var(--border-subtle)]">
                          <Users className="w-3 h-3" />
                          {meta.sampleSize}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Systematic Screening Action Buttons (Included / Excluded / Pending) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-subtle)]">
                    <span className="text-xs font-semibold text-[var(--text-primary)] mr-1">
                      Decisão PRISMA:
                    </span>

                    <button
                      type="button"
                      onClick={() => onUpdateScreening(item.id, 'included')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        currentStatus === 'included'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Incluir</span>
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
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        currentStatus === 'excluded'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateScreening(item.id, 'unscreened')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        currentStatus === 'unscreened'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xs'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Pendente</span>
                    </button>

                    {/* If Excluded: Reason Selector */}
                    {currentStatus === 'excluded' && (
                      <select
                        value={item.exclusionReason || 'populacao_inadequada'}
                        onChange={(e) => onUpdateScreening(item.id, 'excluded', e.target.value)}
                        className="bg-[var(--bg-canvas)] border border-rose-300 dark:border-rose-900/40 rounded-lg px-2.5 py-1 text-xs text-rose-700 dark:text-rose-300 cursor-pointer font-medium"
                      >
                        {Object.entries(SCREENING_REASON_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Formatted ABNT Reference Preview */}
                  <div className="bg-[var(--bg-canvas)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="font-semibold text-[var(--text-primary)] select-none">ABNT: </span>
                    {formatAbntCitation(item)}
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
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {isDetailsOpen
                          ? 'Ocultar Variáveis Metodológicas Extraídas'
                          : 'Ver Variáveis Metodológicas Extraídas (Objetivo, Métodos, Resultados)'}
                      </span>
                    </button>

                    {isDetailsOpen && (
                      <div className="mt-2 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] space-y-2 text-xs">
                        {meta.objective && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Objetivo: </span>
                            <span className="text-[var(--text-secondary)]">{meta.objective}</span>
                          </div>
                        )}
                        {meta.methods && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Métodos / Delineamento: </span>
                            <span className="text-[var(--text-secondary)]">{meta.methods}</span>
                          </div>
                        )}
                        {meta.sampleSize && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Amostra / Participantes: </span>
                            <span className="text-[var(--text-secondary)]">{meta.sampleSize}</span>
                          </div>
                        )}
                        {meta.results && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Resultados: </span>
                            <span className="text-[var(--text-secondary)]">{meta.results}</span>
                          </div>
                        )}
                        {meta.conclusion && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Conclusão: </span>
                            <span className="text-[var(--text-secondary)]">{meta.conclusion}</span>
                          </div>
                        )}
                        {!meta.objective && !meta.methods && !meta.results && !meta.conclusion && (
                          <div className="text-[var(--text-muted)] italic">
                            Resumo sem marcações canônicas de seções estruturadas.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Researcher Notes Input */}
                  <div>
                    <textarea
                      rows={2}
                      value={item.researcherNotes}
                      onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                      placeholder={t('notesPlaceholder')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20 transition-all border border-[var(--border-subtle)]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--link-academic)] hover:underline"
                    >
                      {t('openSource')}
                    </a>
                    {item.pdfUrl && (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--meta-green)] hover:underline"
                      >
                        [PDF] {t('downloadFullPdf')}
                      </a>
                    )}
                    <span>Citado por {item.citationCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
