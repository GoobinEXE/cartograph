import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { canUseNativeShare, copyTextSafely, shareTextSafely } from '../utils/fileDownload';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { MobileSheet } from './ui/MobileSheet';

export interface WebLaunchTarget {
  id: string;
  name: string;
  shortTag: string;
  url: string;
}

interface WebLaunchDrawerProps {
  isOpen: boolean;
  query: string;
  targets: WebLaunchTarget[];
  blockedOrBrowserLimited: boolean;
  onClose: () => void;
}

interface ResolvedWebLaunchTarget extends WebLaunchTarget {
  safeHref: string;
  hostname: string;
}

export const WebLaunchDrawer: React.FC<WebLaunchDrawerProps> = ({
  isOpen,
  query,
  targets,
  blockedOrBrowserLimited,
  onClose,
}) => {
  const { t } = useI18n();
  const [openedIds, setOpenedIds] = useState<Set<string>>(() => new Set());
  const [hideOpened, setHideOpened] = useState(false);
  const [queryCopied, setQueryCopied] = useState(false);
  const [linksFeedback, setLinksFeedback] = useState<'shared' | 'copied' | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    setOpenedIds(new Set());
    setQueryCopied(false);
    setLinksFeedback(null);
    setCopiedAll(false);
  }, [query, targets]);

  const safeTargets = useMemo<ResolvedWebLaunchTarget[]>(() => {
    return targets
      .map((target) => {
        const safeHref = sanitizeExternalUrl(target.url);
        if (!safeHref) return null;
        let hostname = safeHref;
        try {
          hostname = new URL(safeHref).hostname.replace(/^www\./, '');
        } catch {
          // Keep full URL as fallback if URL parsing fails
        }
        return {
          ...target,
          safeHref,
          hostname,
        };
      })
      .filter((item): item is ResolvedWebLaunchTarget => item !== null);
  }, [targets]);

  const markOpened = (id: string) => {
    setOpenedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const totalCount = safeTargets.length;
  const openedCount = safeTargets.reduce((acc, item) => acc + (openedIds.has(item.id) ? 1 : 0), 0);
  const progressPercent = totalCount > 0 ? Math.round((openedCount / totalCount) * 100) : 0;
  const nextItem = safeTargets.find((item) => !openedIds.has(item.id)) ?? null;
  const visibleTargets = hideOpened
    ? safeTargets.filter((item) => !openedIds.has(item.id))
    : safeTargets;

  const formattedLinksPayload = useMemo(
    () => safeTargets.map((item) => `${item.name}: ${item.safeHref}`).join('\n'),
    [safeTargets]
  );

  const handleCopyQuery = async () => {
    if (!query.trim()) return;
    const ok = await copyTextSafely(query);
    if (ok) {
      setQueryCopied(true);
      window.setTimeout(() => setQueryCopied(false), 2200);
    }
  };

  const handleShareSessionLinks = async () => {
    if (!formattedLinksPayload) return;
    const body = query.trim() ? `${query.trim()}\n\n${formattedLinksPayload}` : formattedLinksPayload;
    const result = await shareTextSafely(
      t('webLaunchTitle', { count: totalCount }),
      body
    );
    if (result === 'shared' || result === 'copied') {
      setLinksFeedback(result);
      window.setTimeout(() => setLinksFeedback(null), 2400);
    }
  };

  const handleCopyAllUrls = async () => {
    if (!formattedLinksPayload) return;
    const ok = await copyTextSafely(formattedLinksPayload);
    if (ok) {
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const nativeShareAvailable = canUseNativeShare();

  const footer = (
    <div className="space-y-2.5">
      {nextItem ? (
        <a
          href={nextItem.safeHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => markOpened(nextItem.id)}
          className="min-h-12 w-full inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[15px] font-semibold hover:opacity-90 active:scale-[0.98] transition-[transform,opacity] duration-150 touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]"
        >
          <span className="truncate">
            {t('launchQueueNextBtn', {
              current: Math.min(totalCount, openedCount + 1),
              total: totalCount,
              name: nextItem.name,
            })}
          </span>
          <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </a>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-[13.5px] font-medium text-[var(--meta-green)] py-1">
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('launchQueueAllDone')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenedIds(new Set())}
              className="flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
            >
              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('launchQueueResetBtn')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[14px] font-semibold hover:opacity-90 transition-opacity cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
            >
              {t('webLaunchCloseBtn')}
            </button>
          </div>
        </div>
      )}

      <div className="hidden sm:flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('webLaunchTip')}</span>
        </span>
        {nextItem && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] font-medium cursor-pointer hover:bg-[var(--bg-hover)] shrink-0"
          >
            {t('webLaunchCloseBtn')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <MobileSheet
      open={isOpen && totalCount > 0}
      onClose={onClose}
      title={t('webLaunchTitle', { count: totalCount })}
      subtitle={blockedOrBrowserLimited ? t('webLaunchBlockedDesc') : t('webLaunchDirectDesc')}
      initialSnap="full"
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-xl"
      closeLabel={t('webLaunchCloseAria')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      bodyClassName="!px-0 !pt-0 !pb-2"
      footer={footer}
    >
      {/* Queue Progress + Query Copy + Share Controls */}
      <div className="px-4 sm:px-6 py-3 bg-[var(--bg-secondary)] border-b border-[var(--divider)] space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--text-primary)] tabular-nums">
              {t('launchQueueProgress', { opened: openedCount, total: totalCount })}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={hideOpened}
              onClick={() => setHideOpened((prev) => !prev)}
              className={`min-h-9 md:min-h-0 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                hideOpened
                  ? 'bg-[var(--accent-blue-tint)] border-[var(--link-academic)]/40 text-[var(--link-academic)]'
                  : 'bg-[var(--bg-canvas)] border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {t('launchQueueHideOpenedToggle')}
            </button>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden"
            role="progressbar"
            aria-label={t('launchQueueProgress', { opened: openedCount, total: totalCount })}
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--meta-green)] transition-[width] duration-250 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-xl px-3 py-2">
          <span className="shrink-0 font-medium">{t('webLaunchQueryLabel')}</span>
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <code className="font-mono text-[var(--text-primary)] whitespace-nowrap">{query}</code>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyQuery()}
            className="flex-1 min-w-[130px] min-h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)] cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
          >
            {queryCopied ? (
              <Check className="w-3.5 h-3.5 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
            )}
            <span>{queryCopied ? t('launchQueueQueryCopied') : t('launchQueueCopyQueryBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleShareSessionLinks()}
            className="flex-1 min-w-[130px] min-h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)] cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
          >
            {linksFeedback ? (
              <Check className="w-3.5 h-3.5 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
            )}
            <span>
              {linksFeedback === 'shared'
                ? t('paperSharedFeedback')
                : linksFeedback === 'copied'
                ? t('webLaunchCopiedAll')
                : t('launchQueueShareSessionBtn')}
            </span>
          </button>

          {nativeShareAvailable && (
            <button
              type="button"
              onClick={() => void handleCopyAllUrls()}
              className="hidden sm:inline-flex min-h-10 items-center justify-center gap-1.5 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
            >
              {copiedAll ? (
                <Check className="w-3.5 h-3.5 text-[var(--meta-green)] shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
              )}
              <span>{copiedAll ? t('webLaunchCopiedAll') : t('webLaunchCopyAll')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Portals Queue List */}
      <div className="divide-y divide-[var(--divider)]">
        {visibleTargets.length === 0 ? (
          <div className="px-4 sm:px-6 py-8 text-center space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t('launchQueueAllDone')}
            </p>
            <button
              type="button"
              onClick={() => setOpenedIds(new Set())}
              className="min-h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs font-semibold text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('launchQueueResetBtn')}</span>
            </button>
          </div>
        ) : (
          visibleTargets.map((target) => {
            const isOpened = openedIds.has(target.id);
            const isUpNext = nextItem?.id === target.id;

            return (
              <div
                key={target.id}
                className={`px-4 sm:px-6 py-3 flex items-center justify-between gap-3 transition-colors ${
                  isUpNext
                    ? 'bg-[var(--accent-blue-tint)]/55'
                    : 'hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14.5px] sm:text-sm font-medium text-[var(--text-primary)] truncate">
                      {target.name}
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] shrink-0">
                      {target.shortTag}
                    </span>
                    {isOpened && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--meta-green)] shrink-0">
                        <Check className="w-3 h-3" aria-hidden="true" />
                        <span>{t('launchQueueOpenedBadge')}</span>
                      </span>
                    )}
                  </div>
                  <div className="md:hidden text-xs text-[var(--text-muted)] truncate mt-0.5 font-mono">
                    {target.hostname}
                  </div>
                  <div className="hidden md:block text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {target.safeHref}
                  </div>
                </div>

                <a
                  href={target.safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markOpened(target.id)}
                  className={`min-h-11 md:min-h-0 inline-flex items-center gap-1 px-3.5 md:px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-semibold shrink-0 transition-opacity touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                    isOpened
                      ? 'bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
                  }`}
                >
                  <span>{t('webLaunchOpenBtn')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            );
          })
        )}
      </div>
    </MobileSheet>
  );
};
