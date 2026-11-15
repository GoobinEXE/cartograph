import React, { useMemo, useState } from 'react';
import {
  DeduplicationSummary,
  LibraryGroup,
  SavedPaperItem,
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
import { trackAcademicEvent } from '../utils/analytics';
import { useI18n } from '../i18n/context';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  HelpCircle,
  Inbox,
  Layers,
  Microscope,
  Pin,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';

const GROUP_COLORS = [
  { hex: '#01ABE8', label: 'Ciano' },
  { hex: '#AEB932', label: 'Oliva' },
  { hex: '#E97635', label: 'Âmbar' },
  { hex: '#DA0082', label: 'Magenta' },
  { hex: '#6366F1', label: 'Índigo' },
  { hex: '#10B981', label: 'Esmeralda' },
];

export type LibrarySlotView = 'all' | 'ungrouped' | string;

interface SavedLiteratureDrawerProps {
  items: SavedPaperItem[];
  groups: LibraryGroup[];
  activeSaveGroupId: string | null;
  onSelectActiveSaveGroup: (groupId: string | null) => void;
  onCreateGroup: (name: string, color?: string) => LibraryGroup;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onAssignPaperGroup: (paperId: string, groupId: string | null) => void;
  dedupSummary?: DeduplicationSummary | null;
  sourceBreakdown?: Record<string, number>;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateRelevance: (id: string, relevance: SavedPaperItem['relevanceTag']) => void;
  onUpdateScreening: (id: string, status: ScreeningStatus, reason?: string) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: (onlyGroupId?: string | 'ungrouped') => void;
}

export const SavedLiteratureDrawer: React.FC<SavedLiteratureDrawerProps> = ({
  items,
  groups,
  activeSaveGroupId,
  onSelectActiveSaveGroup,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onAssignPaperGroup,
  dedupSummary,
  sourceBreakdown,
  onUpdateNotes,
  onUpdateRelevance,
  onUpdateScreening,
  onRemoveItem,
  onClearAll,
}) => {
  const { t } = useI18n();
  const [selectedSlotView, setSelectedSlotView] = useState<LibrarySlotView>('all');
  const [subTab, setSubTab] = useState<'matrix' | 'prisma'>('matrix');
  const [filterScreening, setFilterScreening] = useState<'all' | ScreeningStatus>('all');
  const [bulkCopied, setBulkCopied] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

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
      isAll ? sourceBreakdown : undefined
    );
  }, [slotItems, selectedSlotView, dedupSummary, sourceBreakdown]);

  // Items further filtered by PRISMA screening status (all / included / excluded / unscreened)
  const filteredItems = useMemo(() => {
    if (filterScreening === 'all') return slotItems;
    return slotItems.filter((item) => (item.screeningStatus || 'unscreened') === filterScreening);
  }, [slotItems, filterScreening]);

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
    if (selectedSlotView === 'all') return 'todos';
    if (selectedSlotView === 'ungrouped') return 'sem-grupo';
    const name = activeGroupObj?.name || 'grupo';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleDownloadCsv = () => {
    if (slotItems.length === 0) return;
    const csv = exportSavedPapersCsv(slotItems, groupNameMap);
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

  const currentSlotTitle =
    selectedSlotView === 'all'
      ? 'Todos os Artigos da Biblioteca'
      : selectedSlotView === 'ungrouped'
      ? 'Sem Grupo (Geral)'
      : `Slot: ${activeGroupObj?.name || 'Grupo'}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[295px_1fr] xl:grid-cols-[310px_1fr] gap-6 items-start pb-14">
      {/* COLUNA ESQUERDA: GERENCIADOR DE SLOTS & GRUPOS DE PESQUISA */}
      <aside
        className="space-y-4 lg:sticky lg:top-24"
        aria-label="Gerenciamento de grupos e slots de pesquisa"
      >
        {/* 1. Criar Novo Slot / Grupo de Pesquisa */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <FolderPlus className="w-4 h-4 text-[var(--link-academic)]" />
              <span>Novo Slot / Grupo de Pesquisa</span>
            </div>
          </div>

          <form onSubmit={handleCreateNewGroup} className="space-y-2.5">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ex: Jogos de IA, Medicamentos..."
              className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5" aria-label="Cor do grupo">
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
                    title={`Cor: ${c.label}`}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Criar Slot
              </button>
            </div>
          </form>
        </div>

        {/* 2. Seletor do Slot Ativo para Novos Salvamentos */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
            <Pin className="w-4 h-4 text-[var(--link-academic)]" />
            <span>Destino Padrão ao Salvar Artigos</span>
          </div>
          <select
            value={activeSaveGroupId ?? ''}
            onChange={(e) => onSelectActiveSaveGroup(e.target.value ? e.target.value : null)}
            className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
          >
            <option value="">Sem grupo (Geral)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                Slot: {g.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-muted)] leading-snug">
            Artigos salvos na aba <em>Artigos Encontrados</em> irão automaticamente para este destino.
          </p>
        </div>

        {/* 3. Lista de Visões e Slots da Biblioteca */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-3 space-y-1">
          <div className="px-2.5 py-1 text-[13px] font-semibold text-[var(--text-muted)]">
            Slots da Biblioteca
          </div>

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
              <span className="truncate">Todos os Artigos</span>
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
              <span className="truncate">Sem Grupo (Geral)</span>
              {activeSaveGroupId === null && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--meta-green)]">
                  Ativo
                </span>
              )}
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] shrink-0">
              {ungroupedCount}
            </span>
          </button>

          {/* Divisória para Grupos Criados pelo Usuário */}
          <div className="pt-2 pb-1 px-2.5 flex items-center justify-between text-[13px] font-semibold text-[var(--text-muted)] border-t border-[var(--divider)]">
            <span>Grupos de Pesquisa ({groups.length})</span>
          </div>

          {groups.length === 0 ? (
            <div className="px-3 py-3 text-center text-[13px] text-[var(--text-muted)] leading-relaxed">
              Nenhum grupo criado ainda. Crie slots acima (ex.: <em>Jogos de IA</em>, <em>Medicamentos</em>) para separar suas pesquisas.
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
                          title="Salvar nome"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          title="Cancelar"
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
                              Ativo
                            </span>
                          )}
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartRename(group)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity cursor-pointer"
                            title="Renomear grupo"
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
                            title="Excluir grupo (os artigos são mantidos em Sem Grupo)"
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
                  ? 'Exibindo todos os artigos salvos em todos os grupos e itens sem grupo.'
                  : selectedSlotView === 'ungrouped'
                  ? 'Exibindo artigos salvos de forma avulsa, sem vínculo a nenhum grupo específico.'
                  : `Revisão de literatura e matriz PRISMA 2020 isolada para o grupo "${activeGroupObj?.name}".`}
              </p>
            </div>

            {slotItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                  title="Baixar planilha CSV dos artigos deste slot"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar CSV ({slotItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBibtex}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>{t('downloadBib')}</span>
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
                  title={
                    selectedSlotView === 'all'
                      ? 'Remover todos os artigos da biblioteca'
                      : 'Remover os artigos deste slot'
                  }
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {selectedSlotView === 'all' ? t('clearAll') : 'Limpar Slot'}
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
              <span>Matriz de Fichamento ({slotItems.length})</span>
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
              <span>Fluxograma PRISMA 2020</span>
            </button>
          </div>
        </div>

        {/* Empty State for the Selected Slot */}
        {slotItems.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-10 text-center space-y-2.5">
            <Folder className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" />
            <h3 className="text-[17px] font-semibold text-[var(--text-primary)]">
              {selectedSlotView === 'all'
                ? t('emptySavedTitle')
                : selectedSlotView === 'ungrouped'
                ? 'Nenhum artigo salvo sem grupo'
                : `O grupo "${activeGroupObj?.name}" ainda não possui artigos`}
            </h3>
            <p className="text-[15px] text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
              {selectedSlotView === 'all'
                ? t('emptySavedDesc')
                : 'Realize uma busca na aba "Artigos Encontrados" para salvar novos estudos diretamente neste slot, ou mova artigos já existentes usando o seletor de grupo em cada card.'}
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: PRISMA 2020 FLOW DIAGRAM */}
            {subTab === 'prisma' && <PrismaFlowDiagram counts={prismaCounts} />}

            {/* VIEW 2: SYSTEMATIC SCREENING & MATRIX VIEW */}
            {subTab === 'matrix' && (
              <div className="space-y-4">
                {/* Screening Status Quick Filter Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl text-[13px]">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Filter className="w-4 h-4" />
                    <span className="font-semibold text-[var(--text-primary)]">
                      Triagem Sistemática ({currentSlotTitle}):
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: `Todos (${slotItems.length})` },
                        { id: 'included', label: `Incluídos (${prismaCounts.includedStudies})` },
                        { id: 'excluded', label: `Excluídos (${prismaCounts.excludedScreening})` },
                        {
                          id: 'unscreened',
                          label: `Pendentes (${Math.max(
                            0,
                            slotItems.length -
                              prismaCounts.includedStudies -
                              prismaCounts.excludedScreening
                          )})`,
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
                    const meta =
                      item.extractedMetadata ||
                      parseAbstractMetadata(
                        item.title,
                        item.abstractText,
                        item.publicationType
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
                                  Sem grupo
                                </span>
                              )}
                            </div>

                            <h4 className="text-[18px] font-medium text-[var(--link-academic)] leading-snug">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {item.title}
                              </a>
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
                                title="Mover artigo para outro slot ou deixar sem grupo"
                              >
                                <option value="">Sem grupo (Geral)</option>
                                {groups.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    Slot: {g.name}
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
                            Decisão PRISMA:
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
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                              currentStatus === 'excluded'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)]'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Excluir</span>
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
                            <span>Pendente</span>
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
                              {Object.entries(SCREENING_REASON_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Formatted ABNT Reference Preview */}
                        <div className="bg-[var(--bg-canvas)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                          <span className="font-semibold text-[var(--text-primary)] select-none">
                            ABNT:{' '}
                          </span>
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
                            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>
                              {isDetailsOpen
                                ? 'Ocultar Variáveis Metodológicas Extraídas'
                                : 'Ver Variáveis Metodológicas Extraídas (Objetivo, Métodos, Resultados)'}
                            </span>
                          </button>

                          {isDetailsOpen && (
                            <div className="mt-2.5 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--divider)] space-y-2 text-[13px]">
                              {meta.objective && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    Objetivo:{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.objective}
                                  </span>
                                </div>
                              )}
                              {meta.methods && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    Métodos / Delineamento:{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.methods}
                                  </span>
                                </div>
                              )}
                              {meta.sampleSize && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    Amostra / Participantes:{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.sampleSize}
                                  </span>
                                </div>
                              )}
                              {meta.results && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    Resultados:{' '}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {meta.results}
                                  </span>
                                </div>
                              )}
                              {meta.conclusion && (
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    Conclusão:{' '}
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
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20 transition-all border border-[var(--divider)]"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-5 text-[13px] text-[var(--text-muted)]">
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
          </>
        )}
      </div>
    </div>
  );
};
