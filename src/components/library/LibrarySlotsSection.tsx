import { useState } from 'react';
import { Check, Edit3, Folder, FolderOpen, Inbox, Layers, Trash2, X } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useWorkspaceActions } from '../../state/workspace';
import type { LibraryGroup } from '../../types/academic';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { LibrarySlotView } from './libraryShared';

interface LibrarySlotsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  totalCount: number;
  ungroupedCount: number;
  countsByGroup: Record<string, number>;
  groups: LibraryGroup[];
  activeSaveGroupId: string | null;
  selectedSlotView: LibrarySlotView;
  onSelectSlotView: (view: LibrarySlotView) => void;
}

/** Library views (all papers, ungrouped, each research group) with inline rename and 2-step delete. */
export function LibrarySlotsSection({
  isOpen,
  onToggle,
  totalCount,
  ungroupedCount,
  countsByGroup,
  groups,
  activeSaveGroupId,
  selectedSlotView,
  onSelectSlotView,
}: LibrarySlotsSectionProps) {
  const { t } = useI18n();
  const actions = useWorkspaceActions();
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);

  const handleStartRename = (group: LibraryGroup) => {
    setConfirmDeleteGroupId(null);
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleConfirmRename = (groupId: string) => {
    const trimmed = editingGroupName.trim();
    if (trimmed) {
      actions.renameGroup(groupId, trimmed);
    }
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  return (
    <CollapsibleSection
      isOpen={isOpen}
      onToggle={onToggle}
      className="bg-[var(--bg-secondary)] rounded-2xl p-3 space-y-1"
      headerClassName="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-subtle)] select-none text-left"
      titleClassName="flex items-center gap-1.5 min-w-0"
      contentClassName="space-y-1 pt-1"
      title={
        <>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
            {t('librarySlotsTitle')}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-canvas)] text-[var(--text-secondary)] shrink-0 tabular-nums">
            {totalCount}
          </span>
        </>
      }
    >
      {/* Visão 1: Todos os Artigos */}
      <button
        type="button"
        onClick={() => onSelectSlotView('all')}
        className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer text-left ${
          selectedSlotView === 'all'
            ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-semibold'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('allPapersSlot')}</span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] shrink-0 tabular-nums">
          {totalCount}
        </span>
      </button>

      {/* Visão 2: Sem Grupo (Geral) */}
      <button
        type="button"
        onClick={() => {
          onSelectSlotView('ungrouped');
          actions.setActiveSaveGroup(null);
        }}
        className={`w-full min-h-11 lg:min-h-0 flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer text-left ${
          selectedSlotView === 'ungrouped'
            ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-semibold'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Inbox className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('ungroupedOption')}</span>
          {activeSaveGroupId === null && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--meta-green)]">
              {t('activeBadge')}
            </span>
          )}
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] shrink-0 tabular-nums">
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
        <div className="space-y-1">
          {groups.map((group) => {
            const isSelected = selectedSlotView === group.id;
            const isTargetSlot = activeSaveGroupId === group.id;
            const count = countsByGroup[group.id] || 0;
            const isEditing = editingGroupId === group.id;
            const isConfirmingDelete = confirmDeleteGroupId === group.id;

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
                      aria-label={t('renameGroupTitle')}
                      className="w-full min-h-10 lg:min-h-0 px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--divider)] text-base md:text-[13px] text-[var(--text-primary)] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleConfirmRename(group.id)}
                      className="min-w-10 min-h-10 inline-flex items-center justify-center rounded-lg text-[var(--meta-green)] hover:bg-[var(--bg-canvas)] cursor-pointer"
                      title={t('saveNameTitle')}
                      aria-label={t('saveNameTitle')}
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingGroupId(null)}
                      className="min-w-10 min-h-10 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] cursor-pointer"
                      title={t('cancelBtn')}
                      aria-label={t('cancelBtn')}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-3 py-1.5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSlotView(group.id);
                          actions.setActiveSaveGroup(group.id);
                        }}
                        className="min-h-10 lg:min-h-0 flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        {isSelected ? (
                          <FolderOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <Folder className="w-4 h-4 shrink-0 opacity-75" aria-hidden="true" />
                        )}
                        <span className="text-[13px] font-medium truncate">{group.name}</span>
                        {isTargetSlot && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--meta-green)] shrink-0">
                            {t('activeBadge')}
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartRename(group)}
                          className="min-w-10 min-h-10 inline-flex items-center justify-center rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-opacity cursor-pointer"
                          title={t('renameGroupTitle')}
                          aria-label={`${t('renameGroupTitle')}: ${group.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDeleteGroupId((prev) =>
                              prev === group.id ? null : group.id
                            )
                          }
                          className="min-w-10 min-h-10 inline-flex items-center justify-center rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-canvas)] transition-opacity cursor-pointer"
                          title={t('deleteGroupTitle')}
                          aria-label={`${t('deleteGroupTitle')}: ${group.name}`}
                          aria-expanded={isConfirmingDelete}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] tabular-nums">
                          {count}
                        </span>
                      </div>
                    </div>

                    {isConfirmingDelete && (
                      <div className="mx-2 mb-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                        <p className="text-xs text-[var(--text-primary)] leading-snug">
                          {t('confirmDeleteGroupMsg', { name: group.name })}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteGroupId(null)}
                            className="min-h-10 px-3 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            {t('cancelActionBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedSlotView === group.id) {
                                onSelectSlotView('all');
                              }
                              actions.deleteGroup(group.id);
                              setConfirmDeleteGroupId(null);
                            }}
                            className="min-h-10 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                          >
                            {t('confirmActionBtn')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}
