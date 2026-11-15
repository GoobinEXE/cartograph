import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { triggerFileDownload } from '../utils/citationExporter';
import { useI18n } from '../i18n/context';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Download,
  Keyboard,
  Scale,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

interface BlindScreeningModalProps {
  isOpen: boolean;
  items: SavedPaperItem[];
  groupName?: string;
  onUpdateScreening: (id: string, status: ScreeningStatus, reason?: string) => void;
  onClose: () => void;
}

type ModalMode = 'focus' | 'dual';

export const BlindScreeningModal: React.FC<BlindScreeningModalProps> = ({
  isOpen,
  items,
  groupName,
  onUpdateScreening,
  onClose,
}) => {
  const { t, language } = useI18n();
  const reasonLabels = useMemo(() => getScreeningReasonLabels(language), [language]);
  const reasonEntries = useMemo(
    () => Object.entries(reasonLabels) as [ScreeningExclusionReason, string][],
    [reasonLabels]
  );

  const [mode, setMode] = useState<ModalMode>('focus');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [defaultExclusionReason, setDefaultExclusionReason] =
    useState<ScreeningExclusionReason>('populacao_inadequada');

  const [r2Decisions, setR2Decisions] = useState<Record<
    string,
    { status: ScreeningStatus; reason?: string }
  > | null>(null);
  const [r2Error, setR2Error] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Jump to first unscreened item whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    const firstPending = items.findIndex((it) => it.screeningStatus === 'unscreened');
    setCurrentIndex(firstPending >= 0 ? firstPending : 0);
  }, [isOpen]);

  // Clamp index if items array changes while open
  useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= items.length) {
      setCurrentIndex(items.length - 1);
    }
  }, [items.length, currentIndex]);

  const currentItem = items[currentIndex] ?? null;

  const applyDecisionAndAdvance = (
    status: ScreeningStatus,
    reason?: ScreeningExclusionReason
  ) => {
    if (!currentItem) return;
    const resolvedReason =
      status === 'excluded'
        ? reason ||
          (currentItem.exclusionReason as ScreeningExclusionReason | undefined) ||
          defaultExclusionReason
        : undefined;
    onUpdateScreening(currentItem.id, status, resolvedReason);
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
    }
  };

  // Keyboard Focus shortcuts guarded against form controls and modifier keys
  useEffect(() => {
    if (!isOpen) return;

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
        setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const kappaResult: CohensKappaResult | null = useMemo(() => {
    if (!r2Decisions) return null;
    return computeCohensKappa(items, r2Decisions);
  }, [items, r2Decisions]);

  if (!isOpen) return null;

  const handleExportBlindPackage = () => {
    const json = exportBlindReviewPackage(items, groupName);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-blind-review-${stamp}.cartograph-blind.json`,
      json,
      'application/json;charset=utf-8'
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
          <Check className="w-3.5 h-3.5" />
          <span>{t('decisionInclude')}</span>
        </span>
      );
    }
    if (status === 'excluded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300">
          <XCircle className="w-3.5 h-3.5" />
          <span>{t('decisionExclude')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <Clock className="w-3.5 h-3.5" />
        <span>{t('decisionPending')}</span>
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('blindScreeningTitle')}
    >
      <div className="bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Scale className="w-5 h-5 text-[var(--link-academic)] shrink-0" />
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] truncate">
              {t('blindScreeningTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            aria-label={t('closeModalBtn')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--divider)] bg-[var(--bg-canvas)]">
          <button
            type="button"
            onClick={() => setMode('focus')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
              mode === 'focus'
                ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>{t('blindFocusTab')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('dual')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
              mode === 'dual'
                ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{t('blindDualTab')}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[var(--text-secondary)]">
              {t('blindNoStudies')}
            </div>
          ) : mode === 'focus' && currentItem ? (
            <div className="space-y-4">
              {/* Top progress + keyboard hint */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">
                  {t('blindQueueProgress', {
                    current: currentIndex + 1,
                    total: items.length,
                  })}
                </span>
                <span className="font-mono text-[11px] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-md">
                  {t('blindShortcutsHint')}
                </span>
              </div>

              {/* Paper Card */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--divider)] rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {currentItem.year || 's.d.'}
                    </span>
                    {currentItem.venue && <span>· {currentItem.venue}</span>}
                    {currentItem.doi && (
                      <span className="font-mono">· DOI: {currentItem.doi}</span>
                    )}
                  </div>
                  {renderStatusBadge(currentItem.screeningStatus || 'unscreened')}
                </div>

                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] leading-snug">
                  {currentItem.title}
                </h3>

                {currentItem.authors.length > 0 && (
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    {currentItem.authors.slice(0, 6).join(', ')}
                    {currentItem.authors.length > 6 ? ' et al.' : ''}
                  </p>
                )}

                <div className="bg-[var(--bg-canvas)] rounded-lg p-4 text-[14px] text-[var(--text-primary)] leading-relaxed max-h-[38vh] overflow-y-auto border border-[var(--divider)]">
                  {currentItem.abstractText || t('noStructuredSectionsNotice')}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyDecisionAndAdvance('included')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t('blindIncludeKey')}</span>
                  </button>

                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyDecisionAndAdvance('excluded')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
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
                      className="px-2.5 py-2 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)]"
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
                    <Clock className="w-4 h-4 text-[var(--text-muted)]" />
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
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('blindPrevBtn')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= items.length - 1}
                    onClick={() =>
                      setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))
                    }
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
                  >
                    <span>{t('blindNextBtn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Blind Export / Import Controls */}
              <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
                <button
                  type="button"
                  onClick={handleExportBlindPackage}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('blindExportPkgBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>{t('blindImportPkgBtn')}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
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
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
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
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        R1+/R2-: {kappaResult.onlyR1Included} · R1-/R2+:{' '}
                        {kappaResult.onlyR2Included}
                      </div>
                    </div>
                  </div>

                  {/* Conflict Resolver List */}
                  <div className="space-y-2.5">
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
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
                                    R1:{' '}
                                    <strong>
                                      {conflict.r1Status}
                                    </strong>
                                  </span>
                                  <span>·</span>
                                  <span>
                                    R2:{' '}
                                    <strong>
                                      {conflict.r2Status}
                                    </strong>
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
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
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
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
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
    </div>
  );
};
