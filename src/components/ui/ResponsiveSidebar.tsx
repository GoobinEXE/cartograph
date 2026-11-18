import { useEffect, useState, type ReactNode } from 'react';
import { ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { MobileSheet } from './MobileSheet';

/** Breakpoint where the sidebar column appears (Tailwind `lg`). Below it the sidebar is a sheet. */
const DESKTOP_QUERY = '(min-width: 1024px)';

interface ResponsiveSidebarProps {
  /** Accessible name of the sidebar landmark (and of the sheet dialog on mobile). */
  ariaLabel: string;
  /** Text of the mobile trigger button and default sheet title. */
  triggerLabel: string;
  /** Optional override for the mobile sheet title (defaults to `triggerLabel`). */
  title?: string;
  /** Optional short status shown at the right of the trigger, e.g. "6 of 128 active". */
  triggerHint?: ReactNode;
  /** Optional count of active filters shown as a pill on the mobile trigger and sheet header. */
  activeCount?: number;
  /** Alias for `activeCount`. */
  badgeCount?: number;
  /** Optional action control placed in the mobile sheet header beside the close button. */
  headerAction?: ReactNode;
  /** Optional handler to clear active filters from the mobile sheet header. */
  onClearFilters?: () => void;
  /** Optional accessible label for the sheet close button. */
  closeLabel?: string;
  /** Extra classes for the scrolling content (vertical rhythm between drawers). */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * Left column of the three workspace tabs. From `lg` up it renders as the sticky desktop sidebar;
 * below `lg` it renders a 44px+ touch trigger and mounts the same subtree inside `MobileSheet`
 * with half-snap height and OS-native drag physics.
 */
export function ResponsiveSidebar({
  ariaLabel,
  triggerLabel,
  title,
  triggerHint,
  activeCount,
  badgeCount,
  headerAction,
  onClearFilters,
  closeLabel,
  contentClassName = 'space-y-4',
  children,
}: ResponsiveSidebarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(media.matches);
    const onMediaChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) setOpen(false);
    };
    media.addEventListener('change', onMediaChange);
    return () => media.removeEventListener('change', onMediaChange);
  }, []);

  const resolvedCount = activeCount ?? badgeCount;
  const resolvedTitle = title ?? triggerLabel;
  const resolvedCloseLabel = closeLabel ?? t('mobileCloseSheetBtn');

  const resolvedHeaderActions =
    headerAction ??
    (onClearFilters && resolvedCount !== undefined && resolvedCount > 0 ? (
      <button
        type="button"
        onClick={onClearFilters}
        className="min-h-11 px-2.5 inline-flex items-center rounded-lg text-[13px] font-medium text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        {t('mobileClearFiltersBtn')}
      </button>
    ) : undefined);

  if (isDesktop) {
    return (
      <aside
        aria-label={ariaLabel}
        className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2 lg:pb-8 select-none"
      >
        <div className={contentClassName}>{children}</div>
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="lg:hidden w-full min-h-11 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out text-[var(--text-primary)] text-[15px] font-medium cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        <SlidersHorizontal className="w-4 h-4 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
        <span className="truncate">{triggerLabel}</span>
        {resolvedCount !== undefined && resolvedCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-[var(--accent-blue-tint)] text-[var(--link-academic)] tabular-nums shrink-0">
            {t('mobileActiveFiltersBadge', { count: resolvedCount })}
          </span>
        )}
        {triggerHint && (
          <span className="ml-auto text-[13px] font-normal text-[var(--text-muted)] truncate">
            {triggerHint}
          </span>
        )}
        <ChevronUp
          className={`w-4 h-4 text-[var(--text-muted)] shrink-0 ${triggerHint ? '' : 'ml-auto'}`}
          aria-hidden="true"
        />
      </button>

      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        mobileBreakpoint="lg"
        enableHalfSnap={true}
        initialSnap="half"
        title={resolvedTitle}
        subtitle={triggerHint}
        headerActions={resolvedHeaderActions}
        closeLabel={resolvedCloseLabel}
        dragHandleLabel={t('mobileDragHandleLabel')}
        footer={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full min-h-12 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[15px] font-semibold hover:opacity-90 active:scale-[0.98] transition-[transform,opacity] duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]"
          >
            {t('mobileSheetDone')}
          </button>
        }
      >
        <div className={`select-none ${contentClassName}`}>{children}</div>
      </MobileSheet>
    </>
  );
}
