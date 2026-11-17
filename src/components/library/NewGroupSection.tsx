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
  const isEn = language === 'en';
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
          <FolderPlus className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
          <span className="truncate">{t('newResearchGroupTitle')}</span>
        </>
      }
    >
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
    </CollapsibleSection>
  );
}
