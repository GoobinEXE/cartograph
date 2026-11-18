import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Keyboard,
  Microscope,
  RotateCcw,
  Scale,
  Share2,
  Upload,
  Users,
  Vibrate,
  X,
  XCircle,
} from 'lucide-react';
import {
  SavedPaperItem,
  ScreeningExclusionReason,
  ScreeningStatus,
} from '../types/academic';
import { getScreeningReasonLabels } from '../utils/prismaFlow';
import {
  CohensKappaResult,
  computeCohensKappa,
  exportBlindReviewPackage,
  parseBlindReviewPackage,
} from '../utils/interRaterKappa';
import { parseAbstractMetadata } from '../utils/abstractParser';
import { canUseNativeShare, shareOrDownloadFile } from '../utils/fileDownload';
import { LAYOUT_STORAGE_KEYS } from '../utils/layoutPreferences';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { useWorkspaceActions, type WorkspaceActions } from '../state/workspace';
import { useSwipeTriage, rotateDeferredQueue } from '../hooks/useSwipeTriage';
import { MobileSheet } from './ui/MobileSheet';
import { useI18n } from '../i18n/context';

interface BlindScreeningModalProps {
  isOpen: boolean;
  items: SavedPaperItem[];
  groupName?: string;
  onUpdateScreening: (id: string, status: ScreeningStatus, reason?: string) => void;
  onClose: () => void;
}

type ModalMode = 'focus' | 'dual';
type MobileAutoExcludeMode = 'ask' | 'default';

interface ScreeningUndoEntry {
  paperId: string;
  prevStatus: ScreeningStatus;
  prevReason?: string;
  prevIndex: number;
  title: string;
}

const UNDO_TOAST_DURATION_MS = 5000;

function readInitialHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEYS.mobileTriageHaptics);
    return raw !== 'false' && raw !== '0' && raw !== 'off';
  } catch {
    return true;
  }
}

function readInitialAutoExcludeMode(): MobileAutoExcludeMode {
  if (typeof window === 'undefined') return 'ask';
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEYS.mobileTriageAutoExclude);
    return raw === 'default' ? 'default' : 'ask';
  } catch {
    return 'ask';
  }
}

function persistStoragePreference(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}

function useOptionalWorkspaceActions(): WorkspaceActions | null {
  try {
    return useWorkspaceActions();
  } catch {
    return null;
  }
}

export const BlindScreeningModal: React.FC<BlindScreeningModalProps> = ({
  isOpen,
  items,
  groupName,
  onUpdateScreening,
  onClose,
}) => {
  const { t, language } = useI18n();
  const workspaceActions = useOptionalWorkspaceActions();

  const reasonLabels = useMemo(() => getScreeningReasonLabels(language), [language]);
  const reasonEntries = useMemo(
    () => Object.entries(reasonLabels) as [ScreeningExclusionReason, string][],
    [reasonLabels]
  );

  const [mode, setMode] = useState<ModalMode>('focus');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [defaultExclusionReason, setDefaultExclusionReason] =
    useState<ScreeningExclusionReason>('populacao_inadequada');
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(readInitialHapticsEnabled);
  const [autoExclude, setAutoExclude] = useState<MobileAutoExcludeMode>(readInitialAutoExcludeMode);
  const [reasonSheetOpen, setReasonSheetOpen] = useState(false);

  const [sessionOrderIds, setSessionOrderIds] = useState<string[]>(() =>
    items.map((it) => it.id)
  );
  const [deferredIds, setDeferredIds] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<ScreeningUndoEntry[]>([]);
  const [undoVisible, setUndoVisible] = useState(false);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [r2Decisions, setR2Decisions] = useState<Record<
    string,
    { status: ScreeningStatus; reason?: string }
  > | null>(null);
  const [r2Error, setR2Error] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const includeStampRef = useRef<HTMLSpanElement | null>(null);
  const excludeStampRef = useRef<HTMLSpanElement | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const wasOpenRef = useRef(false);

  const nativeShareAvailable = useMemo(() => canUseNativeShare(), []);

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

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearUndoTimer();
    };
  }, [clearUndoTimer]);

  // Reset session state and jump to first unscreened item whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      setReasonSheetOpen(false);
      setUndoVisible(false);
      clearUndoTimer();
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setDeferredIds([]);
      setUndoStack([]);
      setUndoVisible(false);
      clearUndoTimer();
      setSessionOrderIds(items.map((it) => it.id));
      const firstPending = items.findIndex(
        (it) => (it.screeningStatus || 'unscreened') === 'unscreened'
      );
      setCurrentIndex(firstPending >= 0 ? firstPending : 0);
    }
  }, [clearUndoTimer, isOpen, items]);

  // Reconcile session order when items are added/removed while modal remains open
  useEffect(() => {
    if (!isOpen) return;
    setSessionOrderIds((prev) => {
      const itemIdSet = new Set(items.map((it) => it.id));
      const kept = prev.filter((id) => itemIdSet.has(id));
      const keptSet = new Set(kept);
      const added = items.map((it) => it.id).filter((id) => !keptSet.has(id));
      const next = [...kept, ...added];
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [isOpen, items]);

  const orderedItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const result: SavedPaperItem[] = [];
    const seen = new Set<string>();

    for (const id of sessionOrderIds) {
      const item = byId.get(id);
      if (item && !seen.has(id)) {
        seen.add(id);
        result.push(item);
      }
    }
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
    return result;
  }, [items, sessionOrderIds]);

  // Clamp index if orderedItems array shrinks while open
  useEffect(() => {
    if (orderedItems.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= orderedItems.length) {
      setCurrentIndex(orderedItems.length - 1);
    }
  }, [orderedItems.length, currentIndex]);

  const currentItem = orderedItems[currentIndex] ?? null;

  const scheduleUndoHide = useCallback(() => {
    clearUndoTimer();
    if (typeof window === 'undefined') return;
    undoTimerRef.current = window.setTimeout(() => {
      undoTimerRef.current = null;
      setUndoVisible(false);
    }, UNDO_TOAST_DURATION_MS);
  }, [clearUndoTimer]);

  const triggerDecisionHaptic = useCallback(() => {
    if (!hapticsEnabled || prefersReducedMotion) return;
    if (typeof navigator !== 'undefined') {
      navigator.vibrate?.(12);
    }
  }, [hapticsEnabled, prefersReducedMotion]);

  const applyDecisionAndAdvance = useCallback(
    (status: ScreeningStatus, reason?: ScreeningExclusionReason) => {
      if (!currentItem) return;
      const resolvedReason =
        status === 'excluded'
          ? reason ||
            (currentItem.exclusionReason as ScreeningExclusionReason | undefined) ||
            defaultExclusionReason
          : undefined;

      if (status === 'included' || status === 'excluded') {
        const entry: ScreeningUndoEntry = {
          paperId: currentItem.id,
          prevStatus: currentItem.screeningStatus || 'unscreened',
          prevReason: currentItem.exclusionReason,
          prevIndex: currentIndex,
          title: currentItem.title,
        };
        setUndoStack((prev) => [entry, ...prev]);
        setUndoVisible(true);
        scheduleUndoHide();
        triggerDecisionHaptic();
      }

      onUpdateScreening(currentItem.id, status, resolvedReason);

      const nextPendingAfter = orderedItems.findIndex(
        (it, idx) =>
          idx > currentIndex && (it.screeningStatus || 'unscreened') === 'unscreened'
      );
      if (nextPendingAfter >= 0) {
        setCurrentIndex(nextPendingAfter);
      } else if (currentIndex < orderedItems.length - 1) {
        setCurrentIndex((prev) => Math.min(orderedItems.length - 1, prev + 1));
      }
    },
    [
      currentIndex,
      currentItem,
      defaultExclusionReason,
      onUpdateScreening,
      orderedItems,
      scheduleUndoHide,
      triggerDecisionHaptic,
    ]
  );

  const handleDeferCurrent = useCallback(() => {
    if (!currentItem) return;
    if (currentItem.screeningStatus && currentItem.screeningStatus !== 'unscreened') {
      onUpdateScreening(currentItem.id, 'unscreened');
    }
    workspaceActions?.updateRelevance(currentItem.id, 'revisar');

    const nextDeferred = [
      ...deferredIds.filter((id) => id !== currentItem.id),
      currentItem.id,
    ];
    setDeferredIds(nextDeferred);

    const statusById = new Map<string, ScreeningStatus>(
      orderedItems.map((it) => [
        it.id,
        it.id === currentItem.id ? 'unscreened' : it.screeningStatus || 'unscreened',
      ])
    );
    const currentIds = orderedItems.map((it) => it.id);
    const unscreenedIds = currentIds.filter((id) => statusById.get(id) === 'unscreened');
    const rotatedUnscreened = rotateDeferredQueue(unscreenedIds, nextDeferred);

    let rotatedCursor = 0;
    const nextOrder = currentIds.map((id) => {
      if (statusById.get(id) === 'unscreened') {
        const nextId = rotatedUnscreened[rotatedCursor];
        rotatedCursor += 1;
        return nextId ?? id;
      }
      return id;
    });

    setSessionOrderIds(nextOrder);

    if (nextOrder[currentIndex] === currentItem.id) {
      const firstRemainingPending = nextOrder.findIndex(
        (id) => id !== currentItem.id && statusById.get(id) === 'unscreened'
      );
      if (firstRemainingPending >= 0) {
        setCurrentIndex(firstRemainingPending);
      }
    }
  }, [
    currentIndex,
    currentItem,
    deferredIds,
    onUpdateScreening,
    orderedItems,
    workspaceActions,
  ]);

  const handleTriggerMobileExclude = useCallback(() => {
    if (!currentItem) return;
    if (autoExclude === 'default') {
      applyDecisionAndAdvance('excluded', defaultExclusionReason);
      return;
    }
    setReasonSheetOpen(true);
  }, [applyDecisionAndAdvance, autoExclude, currentItem, defaultExclusionReason]);

  const handleUndoLastDecision = useCallback(() => {
    const top = undoStack[0];
    if (!top) return;
    const remaining = undoStack.slice(1);
    setUndoStack(remaining);
    onUpdateScreening(top.paperId, top.prevStatus, top.prevReason);

    const targetIndex = orderedItems.findIndex((it) => it.id === top.paperId);
    setCurrentIndex(
      targetIndex >= 0 ? targetIndex : Math.min(Math.max(0, orderedItems.length - 1), top.prevIndex)
    );

    if (remaining.length === 0) {
      clearUndoTimer();
      setUndoVisible(false);
    } else {
      scheduleUndoHide();
    }
  }, [clearUndoTimer, onUpdateScreening, orderedItems, scheduleUndoHide, undoStack]);

  const handleToggleHaptics = useCallback(() => {
    setHapticsEnabled((prev) => {
      const next = !prev;
      persistStoragePreference(LAYOUT_STORAGE_KEYS.mobileTriageHaptics, next ? 'true' : 'false');
      return next;
    });
  }, []);

  const handleToggleAutoExclude = useCallback(() => {
    setAutoExclude((prev) => {
      const next: MobileAutoExcludeMode = prev === 'default' ? 'ask' : 'default';
      persistStoragePreference(LAYOUT_STORAGE_KEYS.mobileTriageAutoExclude, next);
      return next;
    });
  }, []);

  const swipeHandlers = useSwipeTriage({
    cardRef,
    includeStampRef,
    excludeStampRef,
    enabled: isOpen && mode === 'focus' && Boolean(currentItem) && !reasonSheetOpen,
    onCommitInclude: () => applyDecisionAndAdvance('included'),
    onCommitExclude: handleTriggerMobileExclude,
    cardKey: currentItem?.id,
    reducedMotion: prefersReducedMotion,
  });

  // Keyboard Focus shortcuts guarded against form controls, modifier keys, and open reason sheet
  useEffect(() => {
    if (!isOpen || reasonSheetOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (mode !== 'focus' || !currentItem) return;

      const lower = e.key.toLowerCase();
      if (lower === 'i') {
        e.preventDefault();
        applyDecisionAndAdvance('included');
      } else if (lower === 'e') {
        e.preventDefault();
        applyDecisionAndAdvance('excluded');
      } else if (lower === 'u') {
        e.preventDefault();
        applyDecisionAndAdvance('unscreened');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(orderedItems.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    applyDecisionAndAdvance,
    currentItem,
    isOpen,
    mode,
    onClose,
    orderedItems.length,
    reasonSheetOpen,
  ]);

  const abstractMeta = useMemo(() => {
    if (!currentItem) return null;
    if (currentItem.abstractText) {
      return parseAbstractMetadata(
        currentItem.title,
        currentItem.abstractText,
        currentItem.publicationType,
        language
      );
    }
    return (
      currentItem.extractedMetadata ||
      parseAbstractMetadata(
        currentItem.title,
        currentItem.abstractText,
        currentItem.publicationType,
        language
      )
    );
  }, [currentItem, language]);

  const kappaResult: CohensKappaResult | null = useMemo(() => {
    if (!r2Decisions) return null;
    return computeCohensKappa(items, r2Decisions);
  }, [items, r2Decisions]);

  if (!isOpen) return null;

  const handleExportBlindPackage = () => {
    const json = exportBlindReviewPackage(items, groupName);
    const stamp = new Date().toISOString().slice(0, 10);
    void shareOrDownloadFile(
      `cartograph-blind-review-${stamp}.cartograph-blind.json`,
      json,
      'application/json;charset=utf-8',
      t('blindScreeningTitle')
    );
  };

  const handleImportR2File = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setR2Error(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseBlindReviewPackage(content);
      if (!parsed.ok) {
        setR2Error(parsed.error);
        setR2Decisions(null);
      } else {
        setR2Decisions(parsed.decisions);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const renderStatusBadge = (status: ScreeningStatus) => {
    if (status === 'included') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('decisionInclude')}</span>
        </span>
      );
    }
    if (status === 'excluded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('decisionExclude')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t('decisionPending')}</span>
      </span>
    );
  };

  const safePdfUrl = currentItem ? sanitizeExternalUrl(currentItem.pdfUrl) : null;
  const topUndo = undoStack[0] ?? null;
  const isFocusDeckActive = orderedItems.length > 0 && mode === 'focus' && currentItem !== null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-stretch justify-center md:items-center bg-black/50 backdrop-blur-xs p-0 md:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t('blindScreeningTitle')}
      >
        <div className="bg-[var(--bg-canvas)] w-full h-dvh max-h-dvh rounded-none border-0 md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-2xl md:border md:border-[var(--divider)] md:shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 md:py-4 border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Scale className="w-5 h-5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
              <h2 className="font-heading text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] truncate">
                {t('blindScreeningTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 md:w-9 md:h-9 -mr-1.5 md:mr-0 inline-flex items-center justify-center rounded-full md:rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
              aria-label={t('closeModalBtn')}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="shrink-0 flex items-center gap-2 px-4 md:px-5 py-2 border-b border-[var(--divider)] bg-[var(--bg-canvas)]">
            <button
              type="button"
              onClick={() => setMode('focus')}
              className={`inline-flex items-center gap-2 min-h-10 md:min-h-0 px-3.5 py-2 md:py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                mode === 'focus'
                  ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Keyboard className="w-4 h-4" aria-hidden="true" />
              <span>{t('blindFocusTab')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('dual')}
              className={`inline-flex items-center gap-2 min-h-10 md:min-h-0 px-3.5 py-2 md:py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                mode === 'dual'
                  ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Scale className="w-4 h-4" aria-hidden="true" />
              <span>{t('blindDualTab')}</span>
            </button>
          </div>

          {/* Body */}
          {orderedItems.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="py-12 text-center text-[14px] text-[var(--text-secondary)]">
                {t('blindNoStudies')}
              </div>
            </div>
          ) : isFocusDeckActive && currentItem ? (
            <>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden md:overflow-y-auto md:p-5 md:space-y-4">
                {/* Top progress + keyboard hint (desktop) / swipe hint + haptics toggle (mobile) */}
                <div className="shrink-0 px-4 pt-2.5 pb-2 md:p-0">
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-semibold text-[var(--text-primary)] truncate">
                        {t('blindQueueProgress', {
                          current: currentIndex + 1,
                          total: orderedItems.length,
                        })}
                      </span>
                      <div className="flex md:hidden items-center gap-1">
                        <button
                          type="button"
                          disabled={currentIndex === 0}
                          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                          aria-label={t('blindPrevBtn')}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={currentIndex >= orderedItems.length - 1}
                          onClick={() =>
                            setCurrentIndex((prev) =>
                              Math.min(orderedItems.length - 1, prev + 1)
                            )
                          }
                          aria-label={t('blindNextBtn')}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <span className="hidden md:flex font-mono text-[11px] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-md">
                      {t('blindShortcutsHint')}
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleHaptics}
                      aria-pressed={hapticsEnabled}
                      className={`flex md:hidden items-center gap-1.5 min-h-9 px-2.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                        hapticsEnabled
                          ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/30 text-[var(--link-academic)]'
                          : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-muted)]'
                      }`}
                    >
                      <Vibrate className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t('triageHapticsToggle')}</span>
                    </button>
                  </div>

                  <p className="md:hidden text-[11px] leading-snug text-[var(--text-muted)] mt-1">
                    {t('triageSwipeHint')}
                  </p>
                </div>

                {/* Swipeable Card Stage (single scrollable container on mobile) */}
                <div className="flex-1 min-h-0 px-3 pb-2.5 md:p-0 flex flex-col md:flex-none overflow-hidden md:overflow-visible">
                  <div
                    key={currentItem.id}
                    ref={cardRef}
                    {...swipeHandlers}
                    className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y md:flex-none md:overflow-visible bg-[var(--bg-secondary)] border border-[var(--divider)] rounded-2xl md:rounded-xl p-4 md:p-5 space-y-3 will-change-transform"
                  >
                    {/* Visual Include / Exclude Stamps (DOM-driven opacity during swipe) */}
                    <div
                      className="sticky top-0 z-20 h-0 overflow-visible pointer-events-none flex items-start justify-between"
                      aria-hidden="true"
                    >
                      <span
                        ref={includeStampRef}
                        style={{ opacity: 0 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-emerald-500 bg-[var(--bg-canvas)]/95 text-emerald-700 dark:text-emerald-300 font-heading text-xs font-bold tracking-wider shadow-md -rotate-6 select-none"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        {t('triageStampInclude')}
                      </span>
                      <span
                        ref={excludeStampRef}
                        style={{ opacity: 0 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-rose-500 bg-[var(--bg-canvas)]/95 text-rose-700 dark:text-rose-300 font-heading text-xs font-bold tracking-wider shadow-md rotate-6 select-none"
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        {t('triageStampExclude')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                        <span className="font-mono font-semibold text-[var(--text-secondary)]">
                          {currentItem.year || 's.d.'}
                        </span>
                        {currentItem.venue && <span>· {currentItem.venue}</span>}
                        {currentItem.doi && (
                          <span className="font-mono break-all">· DOI: {currentItem.doi}</span>
                        )}
                      </div>
                      {renderStatusBadge(currentItem.screeningStatus || 'unscreened')}
                    </div>

                    <h3 className="font-heading text-[18px] font-semibold text-[var(--text-primary)] leading-snug">
                      {currentItem.title}
                    </h3>

                    {currentItem.authors.length > 0 && (
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        {currentItem.authors.slice(0, 6).join(', ')}
                        {currentItem.authors.length > 6 ? ' et al.' : ''}
                      </p>
                    )}

                    {/* Deterministic Fast-Triage Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {currentItem.isRetracted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-600 text-white">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('retractedBadge')}</span>
                        </span>
                      )}

                      {abstractMeta?.studyDesign && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--link-academic)] border border-[var(--divider)]">
                          <Microscope className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{abstractMeta.studyDesign}</span>
                        </span>
                      )}

                      {abstractMeta?.sampleSize && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--meta-green)] border border-[var(--divider)] font-mono">
                          <Users className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{abstractMeta.sampleSize}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--divider)] font-mono">
                        {t('citedByCount', { count: currentItem.citationCount ?? 0 })}
                      </span>

                      {safePdfUrl && (
                        <a
                          href={safePdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full text-xs font-semibold bg-[var(--accent-blue-tint)] text-[var(--link-academic)] border border-[var(--link-academic)]/25 hover:opacity-90 active:scale-[0.97] transition-opacity"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('triageViewPdfBtn')}</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>

                    {/* Abstract flows without nested scroll on mobile */}
                    <div className="bg-[var(--bg-canvas)] rounded-xl md:rounded-lg p-3.5 md:p-4 text-[15.5px] leading-[1.65] md:text-[14px] md:leading-relaxed text-[var(--text-primary)] border border-[var(--divider)] md:max-h-[38vh] md:overflow-y-auto">
                      {currentItem.abstractText || t('noStructuredSectionsNotice')}
                    </div>
                  </div>
                </div>

                {/* Desktop Action Controls */}
                <div className="hidden md:flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyDecisionAndAdvance('included')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                      <span>{t('blindIncludeKey')}</span>
                    </button>

                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyDecisionAndAdvance('excluded')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                        <span>{t('blindExcludeKey')}</span>
                      </button>
                      <select
                        aria-label={t('prismaDecisionLabel')}
                        value={defaultExclusionReason}
                        onChange={(e) =>
                          setDefaultExclusionReason(
                            e.target.value as ScreeningExclusionReason
                          )
                        }
                        className="px-2.5 py-2 rounded-lg text-base md:text-xs bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)]"
                      >
                        {reasonEntries.map(([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyDecisionAndAdvance('unscreened')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                      <span>{t('blindPendingKey')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      <span>{t('blindPrevBtn')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={currentIndex >= orderedItems.length - 1}
                      onClick={() =>
                        setCurrentIndex((prev) => Math.min(orderedItems.length - 1, prev + 1))
                      }
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
                    >
                      <span>{t('blindNextBtn')}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Relative Footer Host: Floating 5s Undo Pill + Mobile Sticky Thumb Dock */}
              <div className="relative shrink-0">
                {undoVisible && topUndo && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="absolute left-3 right-3 bottom-full mb-2.5 z-30 md:static md:mx-5 md:mb-3 md:mt-0"
                  >
                    <div className="flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-lg">
                      <span className="text-xs font-medium truncate">
                        {t('triageUndoMsg', { title: topUndo.title })}
                      </span>
                      <button
                        type="button"
                        onClick={handleUndoLastDecision}
                        className="min-h-10 px-3 rounded-full bg-[var(--link-academic)] text-white text-xs font-semibold shrink-0 inline-flex items-center gap-1.5 active:scale-[0.97] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t('triageUndoAction')}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex md:hidden items-center gap-2 border-t border-[var(--divider)] bg-[var(--bg-canvas)]/90 glass-chrome px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                  <button
                    type="button"
                    onClick={handleTriggerMobileExclude}
                    className="flex-1 min-h-12 px-3 rounded-xl bg-rose-600 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.97] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                  >
                    <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('decisionExclude')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeferCurrent}
                    title={t('triageDeferHint')}
                    aria-label={`${t('triageDeferBtn')} — ${t('triageDeferHint')}`}
                    className="min-h-12 px-3.5 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35 text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                  >
                    <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('triageDeferBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyDecisionAndAdvance('included')}
                    className="flex-1 min-h-12 px-3 rounded-xl bg-emerald-600 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.97] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
                  >
                    <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('decisionInclude')}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] space-y-5">
              {/* Blind Export / Import Controls */}
              <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
                <button
                  type="button"
                  onClick={handleExportBlindPackage}
                  className="inline-flex items-center gap-2 min-h-11 md:min-h-0 px-4 py-2 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {nativeShareAvailable ? (
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>
                    {nativeShareAvailable
                      ? t('triageShareBlindJsonBtn')
                      : t('blindExportPkgBtn')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 min-h-11 md:min-h-0 px-4 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
                  <span>{t('blindImportPkgBtn')}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  aria-label={t('blindImportPkgBtn')}
                  className="hidden text-base md:text-xs"
                  onChange={handleImportR2File}
                />
              </div>

              {r2Error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[13px] text-rose-600 dark:text-rose-300">
                  {r2Error}
                </div>
              )}

              {kappaResult && (
                <div className="space-y-4">
                  {/* Kappa Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
                      <div className="text-xs text-[var(--text-muted)]">
                        {t('blindKappaLabel')}
                      </div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                        {kappaResult.kappa.toFixed(3)}
                      </div>
                      <div className="text-xs text-[var(--link-academic)] font-medium mt-0.5 capitalize">
                        {kappaResult.interpretation}
                      </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
                      <div className="text-xs text-[var(--text-muted)]">
                        {t('blindAgreementLabel', { n: kappaResult.overlappingCount })}
                      </div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                        {(kappaResult.observedAgreement * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                        +{kappaResult.bothIncluded} / -{kappaResult.bothExcluded}
                      </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
                      <div className="text-xs text-[var(--text-muted)]">
                        {t('blindConflictsTitle', {
                          count: kappaResult.conflicts.length,
                        })}
                      </div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                        {kappaResult.conflicts.length}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                        R1+/R2-: {kappaResult.onlyR1Included} · R1-/R2+:{' '}
                        {kappaResult.onlyR2Included}
                      </div>
                    </div>
                  </div>

                  {/* Conflict Resolver List */}
                  <div className="space-y-2.5">
                    <h3 className="font-heading text-[14px] font-semibold text-[var(--text-primary)]">
                      {t('blindConflictsTitle', {
                        count: kappaResult.conflicts.length,
                      })}
                    </h3>
                    {kappaResult.conflicts.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-500/10 text-[13px] text-emerald-700 dark:text-emerald-300">
                        {t('blindNoConflicts')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {kappaResult.conflicts.map((conflict) => {
                          return (
                            <div
                              key={conflict.item.id}
                              className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                                  {conflict.item.title}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                                  <span>
                                    R1: <strong>{conflict.r1Status}</strong>
                                  </span>
                                  <span>·</span>
                                  <span>
                                    R2: <strong>{conflict.r2Status}</strong>
                                  </span>
                                  {conflict.r2Reason && (
                                    <span>({conflict.r2Reason})</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateScreening(conflict.item.id, 'included')
                                  }
                                  className="min-h-11 md:min-h-0 px-3.5 py-2 md:px-3 md:py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                >
                                  {t('blindResolveKeep')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateScreening(
                                      conflict.item.id,
                                      'excluded',
                                      defaultExclusionReason
                                    )
                                  }
                                  className="min-h-11 md:min-h-0 px-3.5 py-2 md:px-3 md:py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                                >
                                  {t('blindResolveDrop')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet of PRISMA Exclusion Reasons */}
      <MobileSheet
        open={isOpen && reasonSheetOpen}
        onClose={() => setReasonSheetOpen(false)}
        title={t('triageChooseReasonTitle')}
        subtitle={
          currentItem ? (
            <span className="line-clamp-2">{currentItem.title}</span>
          ) : undefined
        }
        closeLabel={t('mobileCloseSheetBtn')}
        dragHandleLabel={t('mobileDragHandleLabel')}
        zIndexClass="z-[70]"
      >
        <div className="space-y-3">
          <button
            type="button"
            role="switch"
            aria-checked={autoExclude === 'default'}
            onClick={handleToggleAutoExclude}
            className="w-full min-h-12 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
          >
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-[var(--text-primary)]">
                {t('triageAutoReasonToggle')}
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] truncate mt-0.5">
                {reasonLabels[defaultExclusionReason]}
              </div>
            </div>
            <span
              aria-hidden="true"
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                autoExclude === 'default'
                  ? 'bg-[var(--link-academic)]'
                  : 'bg-[var(--bg-hover)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  autoExclude === 'default' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>

          <div className="space-y-2">
            {reasonEntries.map(([code, label]) => {
              const isSelected =
                (currentItem?.exclusionReason || defaultExclusionReason) === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setDefaultExclusionReason(code);
                    setReasonSheetOpen(false);
                    applyDecisionAndAdvance('excluded', code);
                  }}
                  className={`min-h-12 w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left text-[14px] font-medium border transition-colors active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/12 border-rose-500/40 text-rose-700 dark:text-rose-300'
                      : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <span>{label}</span>
                  {isSelected && (
                    <Check
                      className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </MobileSheet>
    </>
  );
};
