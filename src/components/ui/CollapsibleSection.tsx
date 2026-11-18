import { useId, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface CollapsibleSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  /** Content of the toggle button: section name, badges, icon. */
  title: ReactNode;
  /**
   * Controls shown before the chevron (for example "Clear filter"). They sit outside the toggle
   * button, so they stay separate tab stops; their click handlers must stop propagation.
   */
  actions?: ReactNode;
  className?: string;
  /** Header row; it is also a pointer target, as before the toggle became a real button. */
  headerClassName?: string;
  /** Layout of the title inside the toggle button. */
  titleClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}

/**
 * Sidebar drawer: a header row whose title is a real `<button>` carrying `aria-expanded` and
 * `aria-controls`, and a panel that is only mounted while open (the previous conditional
 * rendering, so collapsed content keeps no state and costs no render).
 */
export function CollapsibleSection({
  isOpen,
  onToggle,
  title,
  actions,
  className,
  headerClassName = '',
  titleClassName = 'flex items-center gap-1.5 truncate',
  contentClassName,
  children,
}: CollapsibleSectionProps) {
  const baseId = useId();
  const buttonId = `${baseId}-toggle`;
  const panelId = `${baseId}-panel`;

  return (
    <div className={className}>
      <div className={`${headerClassName} group`} onClick={onToggle}>
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className={`flex-1 min-w-0 min-h-11 lg:min-h-0 text-left cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${titleClassName}`}
        >
          {title}
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          <ChevronDown
            aria-hidden="true"
            className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
              isOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div id={panelId} className={contentClassName}>
          {children}
        </div>
      )}
    </div>
  );
}

interface SidebarDrawersHeaderProps {
  allOpen: boolean;
  onToggleAll: () => void;
}

/** "Filters" heading with the expand/collapse-all control shared by the three sidebars. */
export function SidebarDrawersHeader({ allOpen, onToggleAll }: SidebarDrawersHeaderProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between px-2 pb-2.5 border-b border-[var(--divider)]">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
        <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
        <span>{t('filtersNavTitle')}</span>
      </div>
      <button
        type="button"
        onClick={onToggleAll}
        className="min-h-11 lg:min-h-0 inline-flex items-center px-2 -mr-2 lg:px-0 lg:mr-0 text-xs text-[var(--link-academic)] hover:underline cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] rounded"
        title={allOpen ? t('collapseAllTitle') : t('expandAllTitle')}
      >
        {allOpen ? t('collapseAll') : t('expandAll')}
      </button>
    </div>
  );
}
