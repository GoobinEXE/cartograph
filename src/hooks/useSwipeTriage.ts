import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

const DEFAULT_DECELERATION_RATE = 0.99;
const DEFAULT_THRESHOLD_RATIO = 0.32;
const MIN_COMMIT_THRESHOLD_PX = 110;
const MIN_COMMIT_DISPLACEMENT_PX = 24;
const DRAG_HYSTERESIS_PX = 10;
const STAMP_FADE_DEADZONE_PX = 16;
const ROTATION_FACTOR_DEG_PER_PX = 0.035;
const VELOCITY_WINDOW_MS = 100;
const MIN_VELOCITY_DT_MS = 8;
const MAX_VELOCITY_PX_PER_SEC = 4500;

const SNAP_BACK_TRANSFORM_CSS = 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1)';
const SNAP_BACK_OPACITY_CSS = 'opacity 180ms cubic-bezier(0.23, 1, 0.32, 1)';

export type SwipeTriageDecision = 'include' | 'exclude' | 'cancel';

export interface EvaluateHorizontalSwipeParams {
  dx: number;
  velocityPxPerSec: number;
  cardWidth: number;
  decelerationRate?: number;
  thresholdRatio?: number;
}

/**
 * Evaluates whether a released horizontal card drag should commit to include/exclude or cancel,
 * using Apple WWDC exponential momentum projection and directional displacement guards.
 */
export function evaluateHorizontalSwipeCommit({
  dx,
  velocityPxPerSec,
  cardWidth,
  decelerationRate = DEFAULT_DECELERATION_RATE,
  thresholdRatio = DEFAULT_THRESHOLD_RATIO,
}: EvaluateHorizontalSwipeParams): SwipeTriageDecision {
  if (!Number.isFinite(dx) || !Number.isFinite(velocityPxPerSec)) {
    return 'cancel';
  }

  const safeWidth = Number.isFinite(cardWidth) && cardWidth > 0 ? cardWidth : 0;
  const safeRatio =
    Number.isFinite(thresholdRatio) && thresholdRatio > 0
      ? thresholdRatio
      : DEFAULT_THRESHOLD_RATIO;
  const hasValidDeceleration =
    Number.isFinite(decelerationRate) && decelerationRate > 0 && decelerationRate < 1;

  const projectedMomentum = hasValidDeceleration
    ? ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate)
    : 0;
  const projectedX = dx + projectedMomentum;
  const commitThreshold = Math.max(MIN_COMMIT_THRESHOLD_PX, safeWidth * safeRatio);

  if (projectedX >= commitThreshold && dx > MIN_COMMIT_DISPLACEMENT_PX) {
    return 'include';
  }
  if (projectedX <= -commitThreshold && dx < -MIN_COMMIT_DISPLACEMENT_PX) {
    return 'exclude';
  }
  return 'cancel';
}

/**
 * Orders pending (unscreened) IDs for the current session by placing deferred IDs at the tail
 * in FIFO defer order without mutating ScreeningStatus in storage.
 */
export function rotateDeferredQueue(unscreenedIds: string[], deferredIds: string[]): string[] {
  if (unscreenedIds.length === 0) return [];
  if (deferredIds.length === 0) return [...unscreenedIds];

  const unscreenedSet = new Set(unscreenedIds);
  const deferredSet = new Set<string>();
  const deferredTail: string[] = [];

  for (const id of deferredIds) {
    if (unscreenedSet.has(id) && !deferredSet.has(id)) {
      deferredSet.add(id);
      deferredTail.push(id);
    }
  }

  if (deferredTail.length === 0) {
    return [...unscreenedIds];
  }

  const pendingHead = unscreenedIds.filter((id) => !deferredSet.has(id));
  return [...pendingHead, ...deferredTail];
}

export interface UseSwipeTriageOptions {
  cardRef: RefObject<HTMLElement | null>;
  includeStampRef?: RefObject<HTMLElement | null>;
  excludeStampRef?: RefObject<HTMLElement | null>;
  enabled: boolean;
  onCommitInclude: () => void;
  onCommitExclude: () => void;
  /** Identifier of the active card; resets residual GPU transforms when switching cards. */
  cardKey?: string;
  reducedMotion?: boolean;
  /** Allows mouse pointer dragging on wide viewports; defaults to narrow (<768px) or touch/pen. */
  allowMouseOnDesktop?: boolean;
}

export interface SwipeTriageHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface HorizontalVelocitySample {
  x: number;
  time: number;
}

interface SwipeSession {
  pointerId: number;
  lock: 'pending' | 'horizontal' | 'vertical';
  startX: number;
  startY: number;
  cardWidth: number;
  hasCapture: boolean;
  previousUserSelect: string;
  samples: HorizontalVelocitySample[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isBlockedInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, option, button, a, [contenteditable="true"], [role="button"], [role="switch"], [role="slider"]'
    )
  );
}

function computeHorizontalReleaseVelocity(
  samples: HorizontalVelocitySample[],
  releaseX: number,
  now: number
): number {
  if (samples.length === 0) return 0;
  const latest = samples[samples.length - 1];
  if (now - latest.time > VELOCITY_WINDOW_MS) {
    return 0;
  }

  let oldest = samples[0];
  for (let i = 0; i < samples.length; i += 1) {
    if (now - samples[i].time <= VELOCITY_WINDOW_MS) {
      oldest = samples[i];
      break;
    }
  }

  const dt = now - oldest.time;
  if (dt < MIN_VELOCITY_DT_MS) return 0;
  const velocity = ((releaseX - oldest.x) / dt) * 1000;
  return clamp(velocity, -MAX_VELOCITY_PX_PER_SEC, MAX_VELOCITY_PX_PER_SEC);
}

/**
 * Coordinates 1:1 GPU-accelerated horizontal swipe triage with strict 10px directional hysteresis,
 * multi-touch lock, direct DOM stamp opacity updates, and reduced-motion opacity fallback.
 */
export function useSwipeTriage({
  cardRef,
  includeStampRef,
  excludeStampRef,
  enabled,
  onCommitInclude,
  onCommitExclude,
  cardKey,
  reducedMotion,
  allowMouseOnDesktop = false,
}: UseSwipeTriageOptions): SwipeTriageHandlers {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const activePointerIdRef = useRef<number | null>(null);
  const sessionRef = useRef<SwipeSession | null>(null);

  const onCommitIncludeRef = useRef(onCommitInclude);
  onCommitIncludeRef.current = onCommitInclude;
  const onCommitExcludeRef = useRef(onCommitExclude);
  onCommitExcludeRef.current = onCommitExclude;

  const isReducedMotion = reducedMotion ?? prefersReducedMotion;

  useEffect(() => {
    if (reducedMotion !== undefined) return;
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
  }, [reducedMotion]);

  const resetVisualsImmediately = useCallback(
    (cardEl: HTMLElement | null) => {
      if (cardEl) {
        cardEl.style.transition = 'none';
        cardEl.style.transform = isReducedMotion ? 'none' : 'translate3d(0, 0, 0)';
        cardEl.style.opacity = '1';
      }
      if (includeStampRef?.current) {
        includeStampRef.current.style.transition = 'none';
        includeStampRef.current.style.opacity = '0';
      }
      if (excludeStampRef?.current) {
        excludeStampRef.current.style.transition = 'none';
        excludeStampRef.current.style.opacity = '0';
      }
    },
    [excludeStampRef, includeStampRef, isReducedMotion]
  );

  const snapVisualsToRest = useCallback(
    (cardEl: HTMLElement | null) => {
      if (cardEl) {
        if (isReducedMotion) {
          cardEl.style.transition = SNAP_BACK_OPACITY_CSS;
          cardEl.style.transform = 'none';
          cardEl.style.opacity = '1';
        } else {
          cardEl.style.transition = SNAP_BACK_TRANSFORM_CSS;
          cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
          cardEl.style.opacity = '1';
        }
      }
      if (includeStampRef?.current) {
        includeStampRef.current.style.transition = SNAP_BACK_OPACITY_CSS;
        includeStampRef.current.style.opacity = '0';
      }
      if (excludeStampRef?.current) {
        excludeStampRef.current.style.transition = SNAP_BACK_OPACITY_CSS;
        excludeStampRef.current.style.opacity = '0';
      }
    },
    [excludeStampRef, includeStampRef, isReducedMotion]
  );

  const releaseSession = useCallback(
    (session: SwipeSession | null, cardEl: HTMLElement | null) => {
      if (session) {
        if (cardEl) {
          cardEl.style.userSelect = session.previousUserSelect;
          if (session.hasCapture) {
            try {
              if (cardEl.hasPointerCapture(session.pointerId)) {
                cardEl.releasePointerCapture(session.pointerId);
              }
            } catch {
              // Pointer capture may already have been released by browser teardown.
            }
          }
        }
        session.hasCapture = false;
      }
      sessionRef.current = null;
      activePointerIdRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (!enabled) {
      const session = sessionRef.current;
      const cardEl = cardRef.current;
      releaseSession(session, cardEl);
      snapVisualsToRest(cardEl);
    }
  }, [cardRef, enabled, releaseSession, snapVisualsToRest]);

  useEffect(() => {
    releaseSession(sessionRef.current, cardRef.current);
    resetVisualsImmediately(cardRef.current);
  }, [cardKey, cardRef, releaseSession, resetVisualsImmediately]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (activePointerIdRef.current !== null) return;
      if (event.pointerType === 'mouse') {
        if (event.button !== 0) return;
        const isDesktop =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(min-width: 768px)').matches;
        if (isDesktop && !allowMouseOnDesktop) return;
      }
      if (isBlockedInteractiveTarget(event.target)) return;

      const cardEl = cardRef.current;
      if (!cardEl) return;

      activePointerIdRef.current = event.pointerId;
      sessionRef.current = {
        pointerId: event.pointerId,
        lock: 'pending',
        startX: event.clientX,
        startY: event.clientY,
        cardWidth: Math.max(1, cardEl.getBoundingClientRect().width),
        hasCapture: false,
        previousUserSelect: cardEl.style.userSelect,
        samples: [{ x: event.clientX, time: performance.now() }],
      };
    },
    [allowMouseOnDesktop, cardRef, enabled]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || activePointerIdRef.current !== event.pointerId) return;
      if (session.lock === 'vertical') return;

      const cardEl = cardRef.current;
      if (!cardEl) return;

      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (session.lock === 'pending') {
        if (Math.hypot(dx, dy) < DRAG_HYSTERESIS_PX) {
          return;
        }

        // Strict directional hysteresis: cancel horizontal swipe if vertical scroll dominates.
        if (absDy > absDx) {
          session.lock = 'vertical';
          return;
        }

        session.lock = 'horizontal';
        session.cardWidth = Math.max(1, cardEl.getBoundingClientRect().width);
        session.previousUserSelect = cardEl.style.userSelect;
        cardEl.style.userSelect = 'none';
        cardEl.style.transition = 'none';
        if (includeStampRef?.current) {
          includeStampRef.current.style.transition = 'none';
        }
        if (excludeStampRef?.current) {
          excludeStampRef.current.style.transition = 'none';
        }

        try {
          cardEl.setPointerCapture(event.pointerId);
          session.hasCapture = true;
        } catch {
          session.hasCapture = false;
        }
      }

      const now = performance.now();
      session.samples.push({ x: event.clientX, time: now });
      while (session.samples.length > 2 && now - session.samples[0].time > VELOCITY_WINDOW_MS) {
        session.samples.shift();
      }

      const commitThreshold = Math.max(
        MIN_COMMIT_THRESHOLD_PX,
        session.cardWidth * DEFAULT_THRESHOLD_RATIO
      );

      if (isReducedMotion) {
        cardEl.style.transform = 'none';
        const progress = clamp(absDx / commitThreshold, 0, 1);
        cardEl.style.opacity = String(1 - progress * 0.35);
      } else {
        cardEl.style.transform = `translate3d(${dx}px, 0, 0) rotate(${dx * ROTATION_FACTOR_DEG_PER_PX}deg)`;
      }

      const stampDenom = Math.max(1, commitThreshold - STAMP_FADE_DEADZONE_PX);
      if (dx > STAMP_FADE_DEADZONE_PX) {
        const includeOpacity = clamp((dx - STAMP_FADE_DEADZONE_PX) / stampDenom, 0, 1);
        if (includeStampRef?.current) {
          includeStampRef.current.style.opacity = String(includeOpacity);
        }
        if (excludeStampRef?.current) {
          excludeStampRef.current.style.opacity = '0';
        }
      } else if (dx < -STAMP_FADE_DEADZONE_PX) {
        const excludeOpacity = clamp((-dx - STAMP_FADE_DEADZONE_PX) / stampDenom, 0, 1);
        if (excludeStampRef?.current) {
          excludeStampRef.current.style.opacity = String(excludeOpacity);
        }
        if (includeStampRef?.current) {
          includeStampRef.current.style.opacity = '0';
        }
      } else {
        if (includeStampRef?.current) {
          includeStampRef.current.style.opacity = '0';
        }
        if (excludeStampRef?.current) {
          excludeStampRef.current.style.opacity = '0';
        }
      }
    },
    [cardRef, excludeStampRef, includeStampRef, isReducedMotion]
  );

  const finishSwipe = useCallback(
    (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
      const session = sessionRef.current;
      if (!session || activePointerIdRef.current !== event.pointerId) return;

      const cardEl = cardRef.current;
      const wasHorizontal = session.lock === 'horizontal';
      const dx = event.clientX - session.startX;
      const cardWidth = session.cardWidth;
      const samples = session.samples;

      releaseSession(session, cardEl);

      if (!wasHorizontal) {
        return;
      }

      if (cancelled) {
        snapVisualsToRest(cardEl);
        return;
      }

      const velocityPxPerSec = computeHorizontalReleaseVelocity(
        samples,
        event.clientX,
        performance.now()
      );
      const decision = evaluateHorizontalSwipeCommit({
        dx,
        velocityPxPerSec,
        cardWidth,
      });

      if (decision === 'include' || decision === 'exclude') {
        if (decision === 'include') {
          onCommitIncludeRef.current();
        } else {
          onCommitExcludeRef.current();
        }
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(() => {
            if (cardEl && cardEl.isConnected) {
              snapVisualsToRest(cardEl);
            }
          });
        } else {
          snapVisualsToRest(cardEl);
        }
        return;
      }

      snapVisualsToRest(cardEl);
    },
    [cardRef, releaseSession, snapVisualsToRest]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      finishSwipe(event, false);
    },
    [finishSwipe]
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      finishSwipe(event, true);
    },
    [finishSwipe]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
