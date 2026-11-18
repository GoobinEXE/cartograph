import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

const DEFAULT_DECELERATION_RATE = 0.992;
const DEFAULT_RUBBERBAND_CONSTANT = 0.55;
const DEFAULT_DISMISS_THRESHOLD_RATIO = 0.42;
const DEFAULT_FLICK_VELOCITY_THRESHOLD_PX_PER_SEC = 650;
const DRAG_HYSTERESIS_PX = 10;
const VELOCITY_WINDOW_MS = 100;
const MIN_VELOCITY_DT_MS = 8;
const MAX_VELOCITY_PX_PER_SEC = 4500;
const SNAP_TRANSITION_CSS = 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)';
const BACKDROP_TRANSITION_CSS = 'opacity 220ms cubic-bezier(0.23, 1, 0.32, 1)';

export interface SheetSnapResolution {
  action: 'dismiss' | 'snap';
  targetTranslateY: number;
  snapIndex: number;
}

export interface ResolveSheetSnapParams {
  currentTranslateY: number;
  velocityPxPerSec: number;
  sheetHeight: number;
  snapOffsetsPx?: number[];
  dismissThresholdRatio?: number;
  flickVelocityThresholdPxPerSec?: number;
}

/**
 * Exponential momentum projection derived from Apple WWDC Designing Fluid Interfaces.
 * Estimates resting displacement from instantaneous release velocity in px/s.
 */
export function projectMomentum(
  velocityPxPerSec: number,
  decelerationRate = DEFAULT_DECELERATION_RATE,
): number {
  if (
    !Number.isFinite(velocityPxPerSec) ||
    velocityPxPerSec === 0 ||
    !Number.isFinite(decelerationRate) ||
    decelerationRate <= 0 ||
    decelerationRate >= 1
  ) {
    return 0;
  }
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive boundary damping that keeps over-drag strictly below the container dimension.
 */
export function rubberbandOffset(
  overshootPx: number,
  dimensionPx: number,
  constant = DEFAULT_RUBBERBAND_CONSTANT,
): number {
  if (
    !Number.isFinite(overshootPx) ||
    overshootPx === 0 ||
    !Number.isFinite(dimensionPx) ||
    dimensionPx <= 0 ||
    !Number.isFinite(constant) ||
    constant <= 0
  ) {
    return 0;
  }
  return (overshootPx * dimensionPx * constant) / (dimensionPx + constant * Math.abs(overshootPx));
}

/**
 * Resolves whether a released sheet should dismiss or settle onto its nearest snap offset.
 * Downward flicks dismiss immediately only when already at the lowest snap (or single-snap sheets).
 */
export function resolveSheetSnapOrDismiss({
  currentTranslateY,
  velocityPxPerSec,
  sheetHeight,
  snapOffsetsPx = [0],
  dismissThresholdRatio = DEFAULT_DISMISS_THRESHOLD_RATIO,
  flickVelocityThresholdPxPerSec = DEFAULT_FLICK_VELOCITY_THRESHOLD_PX_PER_SEC,
}: ResolveSheetSnapParams): SheetSnapResolution {
  const offsets = snapOffsetsPx.length > 0 ? snapOffsetsPx : [0];
  const safeHeight = Number.isFinite(sheetHeight) && sheetHeight > 0 ? sheetHeight : 0;
  const projectedY = currentTranslateY + projectMomentum(velocityPxPerSec);
  const lowestSnapOffset = Math.max(...offsets);
  const remainingTravel = Math.max(0, safeHeight - lowestSnapOffset);
  const dismissLimitPx = lowestSnapOffset + remainingTravel * dismissThresholdRatio;

  const isAtLowestSnap = offsets.length <= 1 || currentTranslateY >= lowestSnapOffset;
  const isDismissFlick = velocityPxPerSec >= flickVelocityThresholdPxPerSec && isAtLowestSnap;
  const exceedsDismissThreshold = safeHeight > 0 && projectedY > dismissLimitPx;

  if (isDismissFlick || exceedsDismissThreshold) {
    return {
      action: 'dismiss',
      targetTranslateY: safeHeight,
      snapIndex: -1,
    };
  }

  let bestIndex = 0;
  let bestOffset = offsets[0];
  let bestDistance = Math.abs(projectedY - bestOffset);

  for (let i = 1; i < offsets.length; i += 1) {
    const candidate = offsets[i];
    const distance = Math.abs(projectedY - candidate);
    if (
      distance < bestDistance ||
      (distance === bestDistance && velocityPxPerSec > 0 && candidate > bestOffset) ||
      (distance === bestDistance && velocityPxPerSec < 0 && candidate < bestOffset)
    ) {
      bestIndex = i;
      bestOffset = candidate;
      bestDistance = distance;
    }
  }

  return {
    action: 'snap',
    targetTranslateY: bestOffset,
    snapIndex: bestIndex,
  };
}

export interface UseSheetGestureOptions {
  sheetRef: RefObject<HTMLElement | null>;
  scrollBodyRef: RefObject<HTMLElement | null>;
  backdropRef?: RefObject<HTMLElement | null>;
  enabled: boolean;
  onDismiss: () => void;
  snapFractions?: number[];
  onSnapChange?: (snapIndex: number) => void;
  reducedMotion?: boolean;
}

export interface SheetGestureHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface UseSheetGestureResult {
  isDragging: boolean;
  gestureHandlers: SheetGestureHandlers;
  consumeDragClickSuppression: () => boolean;
}

interface VelocitySample {
  y: number;
  time: number;
}

interface GestureSession {
  pointerId: number;
  state: 'pending' | 'dragging' | 'rejected';
  startX: number;
  startY: number;
  dragAnchorY: number;
  baseTranslateY: number;
  currentTranslateY: number;
  sheetHeight: number;
  startedInHandle: boolean;
  startedInScrollBody: boolean;
  hasCapture: boolean;
  samples: VelocitySample[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readLiveTranslateY(element: HTMLElement): number {
  if (typeof window === 'undefined') return 0;
  const computedTransform = window.getComputedStyle(element).transform;
  if (!computedTransform || computedTransform === 'none') return 0;

  if (typeof DOMMatrixReadOnly !== 'undefined') {
    try {
      const matrix = new DOMMatrixReadOnly(computedTransform);
      return Number.isFinite(matrix.m42) ? matrix.m42 : 0;
    } catch {
      // Fall through to string parsing for non-standard CSS transform serialization.
    }
  }

  const matrix3dMatch = computedTransform.match(/^matrix3d\(([^)]+)\)$/);
  if (matrix3dMatch) {
    const parts = matrix3dMatch[1].split(',');
    const ty = Number.parseFloat(parts[13] ?? '0');
    return Number.isFinite(ty) ? ty : 0;
  }

  const matrix2dMatch = computedTransform.match(/^matrix\(([^)]+)\)$/);
  if (matrix2dMatch) {
    const parts = matrix2dMatch[1].split(',');
    const ty = Number.parseFloat(parts[5] ?? '0');
    return Number.isFinite(ty) ? ty : 0;
  }

  return 0;
}

function isBlockedInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest(
    'input, textarea, select, option, button, a, [contenteditable="true"], [role="slider"], [role="switch"]',
  );
  if (!interactive) return false;
  // Allow an explicit drag-handle button while blocking nested action/close buttons.
  return interactive.getAttribute('data-sheet-drag-handle') !== 'true';
}

function computeReleaseVelocity(samples: VelocitySample[], releaseY: number, now: number): number {
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
  const velocity = ((releaseY - oldest.y) / dt) * 1000;
  return clamp(velocity, -MAX_VELOCITY_PX_PER_SEC, MAX_VELOCITY_PX_PER_SEC);
}

/**
 * Coordinates 1:1 touch/pointer dragging, scroll-boundary handoff, momentum projection,
 * and rubber-band resistance for bottom sheets without non-passive touch listeners.
 */
export function useSheetGesture({
  sheetRef,
  scrollBodyRef,
  backdropRef,
  enabled,
  onDismiss,
  snapFractions = [1],
  onSnapChange,
  reducedMotion,
}: UseSheetGestureOptions): UseSheetGestureResult {
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const sessionRef = useRef<GestureSession | null>(null);
  const suppressClickRef = useRef(false);
  const clearSuppressTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (enabled) return;
    sessionRef.current = null;
    setIsDragging(false);
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (clearSuppressTimerRef.current !== null) {
        window.clearTimeout(clearSuppressTimerRef.current);
      }
    };
  }, []);

  const consumeDragClickSuppression = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const releaseCaptureIfHeld = useCallback((session: GestureSession, sheetEl: HTMLElement | null) => {
    if (!session.hasCapture || !sheetEl) return;
    try {
      if (sheetEl.hasPointerCapture(session.pointerId)) {
        sheetEl.releasePointerCapture(session.pointerId);
      }
    } catch {
      // Pointer may already be released by browser teardown.
    }
    session.hasCapture = false;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (sessionRef.current !== null) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (isBlockedInteractiveTarget(event.target)) return;

      const sheetEl = sheetRef.current;
      if (!sheetEl) return;

      if (clearSuppressTimerRef.current !== null) {
        window.clearTimeout(clearSuppressTimerRef.current);
        clearSuppressTimerRef.current = null;
      }
      suppressClickRef.current = false;

      const targetEl = event.target instanceof Element ? event.target : null;
      const startedInHandle = Boolean(targetEl?.closest('[data-sheet-drag-handle="true"]'));
      const startedInScrollBody = Boolean(
        scrollBodyRef.current && targetEl && scrollBodyRef.current.contains(targetEl),
      );

      sessionRef.current = {
        pointerId: event.pointerId,
        state: 'pending',
        startX: event.clientX,
        startY: event.clientY,
        dragAnchorY: event.clientY,
        baseTranslateY: 0,
        currentTranslateY: 0,
        sheetHeight: Math.max(1, sheetEl.getBoundingClientRect().height),
        startedInHandle,
        startedInScrollBody,
        hasCapture: false,
        samples: [{ y: event.clientY, time: performance.now() }],
      };
    },
    [enabled, scrollBodyRef, sheetRef],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (session.state === 'rejected') return;

      const sheetEl = sheetRef.current;
      if (!sheetEl) return;
      const backdropEl = backdropRef?.current ?? null;

      if (session.state === 'pending') {
        const dx = event.clientX - session.startX;
        const dy = event.clientY - session.startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.hypot(dx, dy) < DRAG_HYSTERESIS_PX) {
          return;
        }

        if (absDx >= absDy) {
          session.state = 'rejected';
          return;
        }

        if (!session.startedInHandle) {
          if (session.startedInScrollBody) {
            const scrollTop = scrollBodyRef.current ? scrollBodyRef.current.scrollTop : 0;
            if (scrollTop > 1 || dy <= 0 || dy <= absDx) {
              session.state = 'rejected';
              return;
            }
          } else if (dy <= 0 || dy <= absDx) {
            session.state = 'rejected';
            return;
          }
        }

        const liveY = isReducedMotion ? 0 : readLiveTranslateY(sheetEl);
        const height = Math.max(1, sheetEl.getBoundingClientRect().height);

        session.state = 'dragging';
        session.dragAnchorY = event.clientY;
        session.baseTranslateY = liveY;
        session.currentTranslateY = liveY;
        session.sheetHeight = height;
        session.samples = [{ y: event.clientY, time: performance.now() }];

        try {
          sheetEl.setPointerCapture(event.pointerId);
          session.hasCapture = true;
        } catch {
          session.hasCapture = false;
        }

        sheetEl.style.transition = 'none';
        if (backdropEl) {
          backdropEl.style.transition = 'none';
        }
        suppressClickRef.current = true;
        setIsDragging(true);
        return;
      }

      const now = performance.now();
      session.samples.push({ y: event.clientY, time: now });
      while (session.samples.length > 2 && now - session.samples[0].time > VELOCITY_WINDOW_MS) {
        session.samples.shift();
      }

      const dragDeltaY = event.clientY - session.dragAnchorY;
      const rawY = session.baseTranslateY + dragDeltaY;
      const clampedY =
        rawY < 0
          ? isReducedMotion
            ? 0
            : -rubberbandOffset(Math.abs(rawY), session.sheetHeight)
          : Math.min(session.sheetHeight, rawY);

      session.currentTranslateY = clampedY;

      if (!isReducedMotion) {
        sheetEl.style.transform = `translate3d(0, ${clampedY}px, 0)`;
      }
      if (backdropEl) {
        const progress =
          session.sheetHeight > 0
            ? clamp(1 - Math.max(0, clampedY) / session.sheetHeight, 0, 1)
            : 1;
        backdropEl.style.opacity = String(progress);
      }
    },
    [backdropRef, isReducedMotion, scrollBodyRef, sheetRef],
  );

  const finishGesture = useCallback(
    (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      const sheetEl = sheetRef.current;
      const backdropEl = backdropRef?.current ?? null;
      releaseCaptureIfHeld(session, sheetEl);
      sessionRef.current = null;

      if (session.state !== 'dragging') {
        return;
      }

      setIsDragging(false);
      if (suppressClickRef.current) {
        clearSuppressTimerRef.current = window.setTimeout(() => {
          suppressClickRef.current = false;
          clearSuppressTimerRef.current = null;
        }, 50);
      }

      if (!sheetEl) return;

      const fractions = snapFractions.length > 0 ? snapFractions : [1];
      const snapOffsetsPx = fractions.map((fraction) => (1 - clamp(fraction, 0.1, 1)) * session.sheetHeight);

      if (cancelled) {
        const nearestOnCancel = resolveSheetSnapOrDismiss({
          currentTranslateY: session.baseTranslateY,
          velocityPxPerSec: 0,
          sheetHeight: session.sheetHeight,
          snapOffsetsPx,
          dismissThresholdRatio: 2,
          flickVelocityThresholdPxPerSec: Number.POSITIVE_INFINITY,
        });

        sheetEl.style.transition = isReducedMotion ? 'none' : SNAP_TRANSITION_CSS;
        if (!isReducedMotion) {
          sheetEl.style.transform = `translate3d(0, ${nearestOnCancel.targetTranslateY}px, 0)`;
        }
        if (backdropEl) {
          backdropEl.style.transition = BACKDROP_TRANSITION_CSS;
          backdropEl.style.opacity = '1';
        }
        return;
      }

      const velocityPxPerSec = computeReleaseVelocity(
        session.samples,
        event.clientY,
        performance.now(),
      );
      const resolution = resolveSheetSnapOrDismiss({
        currentTranslateY: session.currentTranslateY,
        velocityPxPerSec,
        sheetHeight: session.sheetHeight,
        snapOffsetsPx,
      });

      sheetEl.style.transition = isReducedMotion ? 'none' : SNAP_TRANSITION_CSS;
      if (backdropEl) {
        backdropEl.style.transition = BACKDROP_TRANSITION_CSS;
      }

      if (resolution.action === 'dismiss') {
        if (!isReducedMotion) {
          sheetEl.style.transform = 'translate3d(0, 100%, 0)';
        }
        if (backdropEl) {
          backdropEl.style.opacity = '0';
        }
        onDismiss();
        return;
      }

      if (!isReducedMotion) {
        sheetEl.style.transform = `translate3d(0, ${resolution.targetTranslateY}px, 0)`;
      }
      if (backdropEl) {
        backdropEl.style.opacity = '1';
      }
      onSnapChange?.(resolution.snapIndex);
    },
    [backdropRef, isReducedMotion, onDismiss, onSnapChange, releaseCaptureIfHeld, sheetRef, snapFractions],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      finishGesture(event, false);
    },
    [finishGesture],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      finishGesture(event, true);
    },
    [finishGesture],
  );

  return {
    isDragging,
    gestureHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    consumeDragClickSuppression,
  };
}
