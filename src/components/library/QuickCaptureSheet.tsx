import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ClipboardPaste, FileSearch, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { resolveIdentifierBatch } from '../../services/doiBatchResolver';
import { resolveUnpaywallPdf } from '../../services/unpaywallResolver';
import { useWorkspaceActions } from '../../state/workspace';
import type { LibraryGroup, SavedPaperItem } from '../../types/academic';
import { parseAbstractMetadata } from '../../utils/abstractParser';
import { extractAcademicIdentifiers } from '../../utils/identifierExtractor';
import { MobileSheet } from '../ui/MobileSheet';

interface QuickCaptureSheetProps {
  open: boolean;
  onClose: () => void;
  groups: LibraryGroup[];
  defaultTargetGroupId: string | null;
  unpaywallEmail?: string;
  onImported?: (addedCount: number) => void;
}

/**
 * Bottom sheet / modal for capturing DOIs, PMIDs, or arXiv IDs pasted from field notes,
 * messaging apps, or clipboard, with real-time deterministic detection and Unpaywall lookup.
 */
export function QuickCaptureSheet({
  open,
  onClose,
  groups,
  defaultTargetGroupId,
  unpaywallEmail,
  onImported,
}: QuickCaptureSheetProps) {
  const { language, t } = useI18n();
  const actions = useWorkspaceActions();
  const slotSelectId = useId();
  const textareaId = useId();

  const [rawText, setRawText] = useState('');
  const [targetGroupId, setTargetGroupId] = useState<string | null>(defaultTargetGroupId);
  const [isResolving, setIsResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setTargetGroupId(defaultTargetGroupId);
      setErrorMsg(null);
      setResultMsg(null);
    } else {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open, defaultTargetGroupId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const detectedIds = useMemo(() => extractAcademicIdentifiers(rawText), [rawText]);

  const handlePasteFromClipboard = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard ||
      typeof navigator.clipboard.readText !== 'function'
    ) {
      textareaRef.current?.focus();
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setRawText((prev) => (prev.trim() ? `${prev.trim()}\n${text.trim()}` : text.trim()));
        setErrorMsg(null);
        setResultMsg(null);
      } else {
        textareaRef.current?.focus();
      }
    } catch {
      textareaRef.current?.focus();
    }
  };

  const handleResolveAndSave = async () => {
    if (isResolving) return;
    if (detectedIds.length === 0) {
      setErrorMsg(t('quickCaptureEmptyErr'));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsResolving(true);
    setErrorMsg(null);
    setResultMsg(null);

    try {
      const { papers, unresolved } = await resolveIdentifierBatch(
        detectedIds.join('\n'),
        controller.signal,
        language
      );

      if (controller.signal.aborted) return;

      const cleanEmail = unpaywallEmail?.trim();
      const enrichedPapers = [...papers];
      if (cleanEmail && enrichedPapers.length > 0) {
        const missingPdfIndices = enrichedPapers
          .map((p, idx) => (p.doi && !p.pdfUrl ? idx : -1))
          .filter((idx) => idx >= 0);

        const UNPAYWALL_CONCURRENCY = 3;
        for (let i = 0; i < missingPdfIndices.length; i += UNPAYWALL_CONCURRENCY) {
          if (controller.signal.aborted) break;
          const chunk = missingPdfIndices.slice(i, i + UNPAYWALL_CONCURRENCY);
          await Promise.allSettled(
            chunk.map(async (paperIdx) => {
              const target = enrichedPapers[paperIdx];
              if (!target.doi) return;
              const oa = await resolveUnpaywallPdf(target.doi, cleanEmail, controller.signal);
              if (oa.ok && (oa.bestPdfUrl || oa.bestLandingUrl)) {
                enrichedPapers[paperIdx] = {
                  ...target,
                  pdfUrl: oa.bestPdfUrl || target.pdfUrl,
                  isOpenAccess: target.isOpenAccess || oa.isOa || Boolean(oa.bestPdfUrl),
                };
              }
            })
          );
        }
      }

      if (controller.signal.aborted) return;

      const nowIso = new Date().toISOString();
      const toImport: SavedPaperItem[] = enrichedPapers.map((p) => ({
        ...p,
        savedAt: nowIso,
        researcherNotes: '',
        relevanceTag: 'alta',
        screeningStatus: 'unscreened',
        extractedMetadata: parseAbstractMetadata(
          p.title,
          p.abstractText,
          p.publicationType,
          language
        ),
      }));

      const summary =
        toImport.length > 0
          ? actions.importPapers(toImport, targetGroupId)
          : { added: 0, skippedDuplicates: 0 };

      if (summary.added > 0) {
        setResultMsg(
          unresolved.length > 0
            ? t('batchDoiResultFeedback', {
                added: summary.added,
                unresolved: unresolved.length,
              })
            : t('quickCaptureSuccess', { count: summary.added })
        );
        setRawText('');
        onImported?.(summary.added);
      } else if (toImport.length > 0 && summary.skippedDuplicates > 0) {
        setResultMsg(
          t('importSuccessFeedback', {
            format: 'DOI/ID',
            added: 0,
            skipped: summary.skippedDuplicates,
          })
        );
      } else {
        setErrorMsg(
          t('batchDoiResultFeedback', {
            added: 0,
            unresolved: unresolved.length || detectedIds.length,
          })
        );
      }
    } catch {
      if (!controller.signal.aborted) {
        setErrorMsg(t('sourceErrGenericMsg', { label: 'Crossref / OpenAlex' }));
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsResolving(false);
    }
  };

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <FileSearch className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <span>{t('quickCaptureTitle')}</span>
        </span>
      }
      subtitle={t('quickCaptureDesc')}
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-xl"
      initialSnap="auto"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 rounded-xl text-sm font-medium bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            {t('closeModalBtn')}
          </button>
          <button
            type="button"
            disabled={isResolving || detectedIds.length === 0}
            onClick={handleResolveAndSave}
            className="min-h-11 px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isResolving ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            )}
            <span>
              {isResolving ? t('quickCaptureResolving') : t('quickCaptureResolveBtn')}
            </span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="min-h-11 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13.5px] font-medium text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('quickCapturePasteClipboard')}</span>
          </button>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold tabular-nums bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)]">
            {detectedIds.length} ID{detectedIds.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={textareaId}
            className="sr-only"
          >
            {t('quickCaptureTitle')}
          </label>
          <textarea
            ref={textareaRef}
            id={textareaId}
            rows={4}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setErrorMsg(null);
              setResultMsg(null);
            }}
            placeholder={t('quickCaptureInputPh')}
            className="w-full px-3.5 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-base leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/30"
          />
        </div>

        {detectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-live="polite">
            {detectedIds.slice(0, 6).map((token) => (
              <span
                key={token}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--accent-blue-tint)] text-[var(--link-academic)] font-mono text-xs tabular-nums max-w-[240px] truncate"
                title={token}
              >
                {token}
              </span>
            ))}
            {detectedIds.length > 6 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] font-mono text-xs tabular-nums">
                +{detectedIds.length - 6}
              </span>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor={slotSelectId}
            className="block text-xs font-semibold text-[var(--text-secondary)]"
          >
            {t('saveToSlotTitle')}
          </label>
          <select
            id={slotSelectId}
            value={targetGroupId ?? ''}
            onChange={(e) => setTargetGroupId(e.target.value ? e.target.value : null)}
            className="w-full min-h-11 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
          >
            <option value="">{t('ungroupedOption')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {t('slotPrefix')} {g.name}
              </option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[13px] text-rose-700 dark:text-rose-300"
          >
            {errorMsg}
          </div>
        )}

        {resultMsg && (
          <div
            role="status"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[13px] text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{resultMsg}</span>
          </div>
        )}
      </div>
    </MobileSheet>
  );
}
