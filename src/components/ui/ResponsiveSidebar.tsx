import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { useI18n } from '../../i18n/context';

/** Breakpoint where the sidebar column appears (Tailwind `lg`). Below it the sidebar is a sheet. */
const DESKTOP_QUERY = '(min-width: 1024px)';

interface ResponsiveSidebarProps {
  /** Accessible name of the sidebar landmark (and of the sheet dialog on mobile). */
  ariaLabel: string;
  /** Text of the mobile trigger button and of the sheet title. */
  triggerLabel: string;
  /** Optional short status shown at the right of the trigger, e.g. "6 of 128 active". */
  triggerHint?: ReactNode;
  /** Extra classes for the scrolling content (vertical rhythm between drawers). */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * Left column of the three workspace tabs. From `lg` up it is the sticky sidebar it always was;
 * below `lg` the same subtree is mounted once and shown as a bottom sheet, opened by a full-width
 * trigger above the content. Rendering the children a single time keeps drawer state and filter
 * inputs identical across the two presentations.
 */
export function ResponsiveSidebar({
  ariaLabel,
  triggerLabel,
  triggerHint,
  contentClassName = 'space-y-4',
  children,
}: ResponsiveSidebarProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetId = useId();
  const titleId = `${sheetId}-title`;

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const media = window.matchMedia(DESKTOP_QUERY);
    // Growing past the breakpoint turns the sheet back into the sidebar: drop the modal state.
    const onMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    media.addEventListener('change', onMediaChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener('change', onMediaChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={sheetId}
        className="lg:hidden w-full min-h-12 flex items-center gap-2.5 px-4 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[15px] font-medium cursor-pointer select-none"
      >
        <SlidersHorizontal className="w-4 h-4 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
        <span className="truncate">{triggerLabel}</span>
        {triggerHint && (
          <span className="ml-auto text-[13px] font-normal text-[var(--text-muted)] truncate">{triggerHint}</span>
        )}
        <ChevronUp
          className={`w-4 h-4 text-[var(--text-muted)] shrink-0 ${triggerHint ? '' : 'ml-auto'}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/45 backdrop-blur-xs mobile-sheet-backdrop"
          aria-hidden="true"
          onClick={close}
        />
      )}

      <aside
        id={sheetId}
        aria-label={ariaLabel}
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen || undefined}
        aria-labelledby={isOpen ? titleId : undefined}
        className={`${isOpen ? 'flex' : 'hidden'} mobile-sheet flex-col fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] rounded-t-2xl bg-[var(--bg-canvas)] border-t border-[var(--divider)] shadow-2xl
          lg:flex lg:sticky lg:inset-auto lg:top-24 lg:z-auto lg:max-h-[calc(100vh-7rem)] lg:rounded-none lg:bg-transparent lg:border-0 lg:shadow-none`}
      >
        <div className="lg:hidden shrink-0 px-4 pt-2 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-[var(--bg-hover)]" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3 pt-2">
            <h2 id={titleId} className="font-heading text-[17px] font-semibold text-[var(--text-primary)]">
              {triggerLabel}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="w-10 h-10 -mr-2 inline-flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              aria-label={t('mobileSheetClose')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain select-none px-4 pt-2 pb-4 lg:px-0 lg:pt-0 lg:pr-2 lg:pb-8 ${contentClassName}`}
        >
          {children}
        </div>

        <div className="lg:hidden shrink-0 border-t border-[var(--divider)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={close}
            className="w-full min-h-12 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[15px] font-semibold cursor-pointer select-none"
          >
            {t('mobileSheetDone')}
          </button>
        </div>
      </aside>
    </>
  );
}
