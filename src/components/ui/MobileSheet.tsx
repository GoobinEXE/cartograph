import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSheetGesture } from '../../hooks/useSheetGesture';

const CLOSE_ANIMATION_MS = 220;
const DRAWER_ENTER_TRANSITION = 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)';
const DRAWER_EXIT_TRANSITION = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)';
const MODAL_TRANSITION =
  'transform 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 220ms cubic-bezier(0.23, 1, 0.32, 1)';
const BACKDROP_TRANSITION = 'opacity 220ms cubic-bezier(0.23, 1, 0.32, 1)';
const REDUCED_MOTION_TRANSITION = 'opacity 180ms cubic-bezier(0.23, 1, 0.32, 1)';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

const CONTAINER_LAYOUT_CLASSES: Record<'md' | 'lg', Record<'modal' | 'drawer-right', string>> = {
  md: {
    modal: 'items-end justify-center md:items-center md:p-6',
    'drawer-right': 'items-end justify-center md:items-stretch md:justify-end md:p-0',
  },
  lg: {
    modal: 'items-end justify-center lg:items-center lg:p-6',
    'drawer-right': 'items-end justify-center lg:items-stretch lg:justify-end lg:p-0',
  },
};

const PANEL_DESKTOP_CLASSES: Record<'md' | 'lg', Record<'modal' | 'drawer-right', string>> = {
  md: {
    modal: 'md:rounded-2xl md:border md:border-[var(--divider)] md:max-h-[85dvh] md:h-auto',
    'drawer-right':
      'md:h-dvh md:max-h-dvh md:rounded-none md:rounded-l-2xl md:border-t-0 md:border-l md:border-[var(--divider)]',
  },
  lg: {
    modal: 'lg:rounded-2xl lg:border lg:border-[var(--divider)] lg:max-h-[85dvh] lg:h-auto',
    'drawer-right':
      'lg:h-dvh lg:max-h-dvh lg:rounded-none lg:rounded-l-2xl lg:border-t-0 lg:border-l lg:border-[var(--divider)]',
  },
};

const MOBILE_ONLY_CLASS: Record<'md' | 'lg', string> = {
  md: 'md:hidden',
  lg: 'lg:hidden',
};

const DESKTOP_MEDIA_QUERY: Record<'md' | 'lg', string> = {
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
};

interface SavedScrollLockState {
  scrollX: number;
  scrollY: number;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  bodyOverscrollBehavior: string;
  htmlScrollBehavior: string;
}

let activeScrollLocks = 0;
let savedScrollState: SavedScrollLockState | null = null;

function acquireBodyScrollLock(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (activeScrollLocks === 0) {
    const { body, documentElement } = document;
    const scrollbarWidth = Math.max(0, window.innerWidth - documentElement.clientWidth);
    const computedPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    savedScrollState = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      htmlScrollBehavior: documentElement.style.scrollBehavior,
    };

    // Pinning body at -scrollY prevents iOS Safari rubber-band scrolling behind the sheet.
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollState.scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
    }
  }

  activeScrollLocks += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);

    if (activeScrollLocks === 0 && savedScrollState) {
      const state = savedScrollState;
      savedScrollState = null;
      const { body, documentElement } = document;

      body.style.overflow = state.bodyOverflow;
      body.style.position = state.bodyPosition;
      body.style.top = state.bodyTop;
      body.style.left = state.bodyLeft;
      body.style.right = state.bodyRight;
      body.style.width = state.bodyWidth;
      body.style.paddingRight = state.bodyPaddingRight;
      body.style.overscrollBehavior = state.bodyOverscrollBehavior;

      documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(state.scrollX, state.scrollY);
      documentElement.style.scrollBehavior = state.htmlScrollBehavior;
    }
  };
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return candidates.filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function isTopMostDialog(dialogEl: HTMLElement): boolean {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
  if (dialogs.length === 0) return false;
  return dialogs[dialogs.length - 1] === dialogEl;
}

export interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  initialSnap?: 'auto' | 'half' | 'full';
  enableHalfSnap?: boolean;
  desktopMode?: 'modal' | 'drawer-right';
  desktopMaxWidthClass?: string;
  mobileBreakpoint?: 'md' | 'lg';
  closeLabel?: string;
  dragHandleLabel?: string;
  zIndexClass?: string;
  bodyClassName?: string;
  ariaLabelledBy?: string;
}

/**
 * Accessible adaptive container: physical bottom sheet on mobile viewports,
 * centered dialog or right drawer on desktop, backed by PRISM semantic CSS tokens.
 */
export function MobileSheet({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  children,
  initialSnap = 'auto',
  enableHalfSnap = false,
  desktopMode = 'modal',
  desktopMaxWidthClass,
  mobileBreakpoint = 'md',
  closeLabel = 'Close',
  dragHandleLabel = 'Toggle sheet height',
  zIndexClass = 'z-50',
  bodyClassName = '',
  ariaLabelledBy,
}: MobileSheetProps) {
  const baseId = useId();
  const internalTitleId = `${baseId}-title`;
  const subtitleId = `${baseId}-subtitle`;
  const resolvedLabelledBy = ariaLabelledBy ?? internalTitleId;

  const snapFractions = useMemo(() => (enableHalfSnap ? [0.55, 1] : [1]), [enableHalfSnap]);
  const initialSnapIndex = useMemo(() => {
    if (!enableHalfSnap) return 0;
    return initialSnap === 'full' ? 1 : 0;
  }, [enableHalfSnap, initialSnap]);

  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [snapIndex, setSnapIndex] = useState(initialSnapIndex);

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(DESKTOP_MEDIA_QUERY[mobileBreakpoint]).matches;
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isClosing = isRendered && !open;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DESKTOP_MEDIA_QUERY[mobileBreakpoint]);
    setIsDesktop(media.matches);
    const onChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, [mobileBreakpoint]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      if (isRendered) {
        setIsVisible(true);
        return;
      }

      setSnapIndex(initialSnapIndex);
      setIsRendered(true);
      setIsVisible(false);

      let raf1 = 0;
      let raf2 = 0;
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }

    if (isRendered) {
      setIsVisible(false);
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        setIsRendered(false);
      }, CLOSE_ANIMATION_MS);

      return () => {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
      };
    }
  }, [open, isRendered, initialSnapIndex]);

  useEffect(() => {
    if (!isRendered) return;
    return acquireBodyScrollLock();
  }, [isRendered]);

  const restorePreviousFocus = useCallback(() => {
    const previous = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (previous && previous.isConnected && typeof previous.focus === 'function') {
      previous.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (!open || !isRendered) {
      if (!open) {
        restorePreviousFocus();
      }
      return;
    }

    const dialogEl = sheetRef.current;
    if (
      document.activeElement instanceof HTMLElement &&
      (!dialogEl || !dialogEl.contains(document.activeElement))
    ) {
      previouslyFocusedRef.current = document.activeElement;
    }

    if (dialogEl) {
      const autoFocusTarget = dialogEl.querySelector<HTMLElement>('[data-autofocus]');
      const focusTarget = autoFocusTarget ?? dialogEl;
      if (!dialogEl.contains(document.activeElement)) {
        focusTarget.focus({ preventScroll: true });
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const currentDialog = sheetRef.current;
      if (!currentDialog || !isTopMostDialog(currentDialog)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = getFocusableElements(currentDialog);
        if (focusable.length === 0) {
          event.preventDefault();
          currentDialog.focus({ preventScroll: true });
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (!(active instanceof HTMLElement) || !currentDialog.contains(active)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
          return;
        }

        if (event.shiftKey) {
          if (active === first || active === currentDialog) {
            event.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const currentDialog = sheetRef.current;
      if (!currentDialog || !isTopMostDialog(currentDialog)) return;
      const target = event.target;
      if (target instanceof Node && !currentDialog.contains(target)) {
        const focusable = getFocusableElements(currentDialog);
        (focusable[0] ?? currentDialog).focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, isRendered, restorePreviousFocus]);

  useEffect(() => {
    return () => {
      restorePreviousFocus();
    };
  }, [restorePreviousFocus]);

  const handleDismiss = useCallback(() => {
    onCloseRef.current();
  }, []);

  const { isDragging, gestureHandlers, consumeDragClickSuppression } = useSheetGesture({
    sheetRef,
    scrollBodyRef,
    backdropRef,
    enabled: open && !isClosing && !isDesktop,
    onDismiss: handleDismiss,
    snapFractions,
    onSnapChange: setSnapIndex,
    reducedMotion: prefersReducedMotion,
  });

  useEffect(() => {
    if (!isRendered || isDragging) return;
    const sheetEl = sheetRef.current;
    const backdropEl = backdropRef.current;
    if (!sheetEl) return;

    const showTarget = open && isVisible && !isClosing;

    if (backdropEl) {
      backdropEl.style.transition = BACKDROP_TRANSITION;
      backdropEl.style.opacity = showTarget ? '1' : '0';
    }

    if (prefersReducedMotion) {
      sheetEl.style.transition = REDUCED_MOTION_TRANSITION;
      sheetEl.style.opacity = showTarget ? '1' : '0';
      if (!isDesktop) {
        const fraction = snapFractions[snapIndex] ?? 1;
        const offsetPercent = (1 - fraction) * 100;
        sheetEl.style.transform = `translate3d(0, ${offsetPercent}%, 0)`;
      } else {
        sheetEl.style.transform = 'none';
      }
      return;
    }

    if (isDesktop) {
      sheetEl.style.transformOrigin = 'center';
      if (desktopMode === 'drawer-right') {
        sheetEl.style.transition = `${DRAWER_EXIT_TRANSITION}, opacity 220ms cubic-bezier(0.23, 1, 0.32, 1)`;
        sheetEl.style.transform = showTarget ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)';
        sheetEl.style.opacity = showTarget ? '1' : '0';
      } else {
        sheetEl.style.transition = MODAL_TRANSITION;
        sheetEl.style.transform = showTarget ? 'scale(1)' : 'scale(0.96)';
        sheetEl.style.opacity = showTarget ? '1' : '0';
      }
      return;
    }

    const activeFraction = snapFractions[snapIndex] ?? 1;
    const restingOffsetPercent = (1 - activeFraction) * 100;
    sheetEl.style.opacity = '1';
    sheetEl.style.transition = showTarget ? DRAWER_ENTER_TRANSITION : DRAWER_EXIT_TRANSITION;
    sheetEl.style.transform = showTarget
      ? `translate3d(0, ${restingOffsetPercent}%, 0)`
      : 'translate3d(0, 100%, 0)';
  }, [
    isRendered,
    isDragging,
    open,
    isVisible,
    isClosing,
    isDesktop,
    desktopMode,
    prefersReducedMotion,
    snapFractions,
    snapIndex,
  ]);

  const handleToggleHalfFull = useCallback(() => {
    if (consumeDragClickSuppression()) return;
    if (!enableHalfSnap) return;
    setSnapIndex((prev) => (prev === 0 ? 1 : 0));
  }, [consumeDragClickSuppression, enableHalfSnap]);

  if (!isRendered || typeof document === 'undefined') {
    return null;
  }

  const resolvedMaxWidthClass =
    desktopMaxWidthClass ?? (mobileBreakpoint === 'lg' ? 'lg:max-w-2xl' : 'md:max-w-2xl');

  const mobileHeightClass =
    enableHalfSnap || initialSnap === 'full'
      ? 'h-[92dvh] max-h-[92dvh]'
      : initialSnap === 'half'
        ? 'max-h-[55dvh]'
        : 'max-h-[92dvh]';

  const sheetSafeAreaStyle: CSSProperties | undefined = isDesktop
    ? undefined
    : {
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: footer ? undefined : 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        willChange: 'transform',
      };

  const footerSafeAreaStyle: CSSProperties | undefined = isDesktop
    ? undefined
    : {
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      };

  const mobileOnly = MOBILE_ONLY_CLASS[mobileBreakpoint];

  return createPortal(
    <>
      <div
        ref={backdropRef}
        className={`fixed inset-0 ${zIndexClass} bg-black/45 backdrop-blur-xs opacity-0`}
        aria-hidden="true"
        onClick={isClosing ? undefined : onClose}
      />

      <div
        className={`fixed inset-0 ${zIndexClass} flex pointer-events-none ${CONTAINER_LAYOUT_CLASSES[mobileBreakpoint][desktopMode]}`}
      >
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedLabelledBy}
          aria-describedby={subtitle ? subtitleId : undefined}
          tabIndex={-1}
          style={sheetSafeAreaStyle}
          onPointerDown={gestureHandlers.onPointerDown}
          onPointerMove={gestureHandlers.onPointerMove}
          onPointerUp={gestureHandlers.onPointerUp}
          onPointerCancel={gestureHandlers.onPointerCancel}
          className={`${isClosing ? 'pointer-events-none' : 'pointer-events-auto'} relative flex flex-col w-full ${mobileHeightClass} rounded-t-2xl bg-[var(--bg-canvas)] border-t border-[var(--divider)] shadow-2xl focus:outline-none ${PANEL_DESKTOP_CLASSES[mobileBreakpoint][desktopMode]} ${resolvedMaxWidthClass}`}
        >
          <div className="shrink-0 px-4 sm:px-6 pt-1.5 pb-3 border-b border-[var(--divider)]">
            <div className={`${mobileOnly} flex justify-center`}>
              {enableHalfSnap ? (
                <button
                  type="button"
                  data-sheet-drag-handle="true"
                  onClick={handleToggleHalfFull}
                  aria-label={dragHandleLabel}
                  aria-expanded={snapIndex === 1}
                  className="min-h-7 w-24 flex items-center justify-center rounded-full touch-none select-none cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                >
                  <span
                    className="w-10 h-1.5 rounded-full bg-[var(--text-muted)]/40"
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <div
                  data-sheet-drag-handle="true"
                  className="min-h-7 w-24 flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
                >
                  <span
                    className="w-10 h-1.5 rounded-full bg-[var(--text-muted)]/40"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

            <div
              data-sheet-drag-handle="true"
              className="flex items-start justify-between gap-3 pt-1 touch-pan-x"
            >
              <div className="min-w-0 flex-1">
                <h2
                  id={ariaLabelledBy ? undefined : internalTitleId}
                  className="font-heading text-[17px] font-semibold tracking-[-0.02em] leading-snug text-[var(--text-primary)]"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p
                    id={subtitleId}
                    className="mt-0.5 text-[13px] leading-snug text-[var(--text-secondary)]"
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {headerActions}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="w-11 h-11 -mr-2 shrink-0 inline-flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.97] active:bg-[var(--bg-subtle)] transition-[transform,background-color,color] duration-150 ease-out touch-manipulation select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={scrollBodyRef}
            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 pt-3 pb-4 ${bodyClassName}`}
          >
            {children}
          </div>

          {footer && (
            <div
              style={footerSafeAreaStyle}
              className="shrink-0 border-t border-[var(--divider)] bg-[var(--bg-canvas)] px-4 sm:px-6 pt-3 pb-3"
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
