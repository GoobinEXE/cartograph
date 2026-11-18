import { localize } from '../../i18n/localized';
import { useState, type FormEvent } from 'react';
import { FolderPlus } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useWorkspaceActions } from '../../state/workspace';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import {
  GROUP_COLORS,
  SAVED_CARD_DRAWER_HEADER_CLASS,
  SAVED_CARD_DRAWER_TITLE_CLASS,
} from './libraryShared';

interface NewGroupSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  /** Called with the new group's ID so the library can switch to it. */
  onCreated: (groupId: string) => void;
}

/** Research-group creation form (name and colour). The new group also becomes the save target. */
export function NewGroupSection({ isOpen, onToggle, onCreated }: NewGroupSectionProps) {
  const { language, t } = useI18n();
  const actions = useWorkspaceActions();
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0].hex);

  const handleCreateNewGroup = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    const created = actions.createGroup(trimmed, newGroupColor);
    setNewGroupName('');
    // Automatically select the new group view and set it as default target slot
    onCreated(created.id);
    actions.setActiveSaveGroup(created.id);
  };

  return (
    <CollapsibleSection
      isOpen={isOpen}
      onToggle={onToggle}
      className="bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-3"
      headerClassName={SAVED_CARD_DRAWER_HEADER_CLASS}
      titleClassName={SAVED_CARD_DRAWER_TITLE_CLASS}
      title={
        <>
          <FolderPlus className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <span className="truncate">{t('newResearchGroupTitle')}</span>
        </>
      }
    >
      <form onSubmit={handleCreateNewGroup} className="space-y-3">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder={t('slotPlaceholder')}
          aria-label={t('newResearchGroupTitle')}
          className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5" aria-label={t('groupColorAria')}>
            {GROUP_COLORS.map((c) => {
              const label = `${t('colorPrefix')} ${localize(c.label, language)}`;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setNewGroupColor(c.hex)}
                  aria-label={label}
                  aria-pressed={newGroupColor === c.hex}
                  className={`w-8 h-8 md:w-5 md:h-5 rounded-full transition-transform cursor-pointer ${
                    newGroupColor === c.hex
                      ? 'scale-110 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-secondary)]'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={label}
                />
              );
            })}
          </div>

          <button
            type="submit"
            disabled={!newGroupName.trim()}
            className="min-h-11 md:min-h-0 px-3.5 py-2 md:py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('createSlotPlusBtn')}
          </button>
        </div>
      </form>
    </CollapsibleSection>
  );
}
