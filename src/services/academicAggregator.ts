import {
  ApiSourceId,
  ByokCredentialEntry,
  NormalizedPaper,
  SearchScopeId,
  SourceFetchStatus,
  UserAccessConfig,
} from '../types/academic';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { SupportedLanguage, Translations, translate } from '../i18n/translations';
import { API_SOURCE_REGISTRY, sourceMatchesScope } from '../data/apiSources';
import { buildByokCacheSignature, getActiveByokEntry } from '../utils/accessConfig';
import { crossPlatformFetch, isTauriRuntime } from './httpClient';
import { SOURCE_RUNNERS } from './sourceRunners';
import { localizeUntitledPapers } from './adapterUtils';

export { crossPlatformFetch, isTauriRuntime };

/**
 * Raw records in arrival order plus per-source statuses. Deduplication is left to the caller,
 * which applies the researcher's split overrides once per snapshot instead of the aggregator
 * deduplicating every streamed flush without them.
 */
export interface FederatedSearchResult {
  rawPapers: NormalizedPaper[];
  statuses: SourceFetchStatus[];
}

export interface FederatedSearchProgress extends FederatedSearchResult {
  completedCount: number;
  totalCount: number;
}

export interface RunFederatedSearchOptions {
  signal?: AbortSignal;
  language?: SupportedLanguage;
  scope?: SearchScopeId;
  accessConfig?: UserAccessConfig;
  onProgress?: (progress: FederatedSearchProgress) => void;
}

const FEDERATED_CACHE_TTL_MS = 5 * 60 * 1000;
const FEDERATED_CACHE_MAX = 30;
const SOURCE_TIMEOUT_MS = 12_000;
const STREAM_COALESCE_MS = 60;
const federatedSearchCache = new Map<string, { timestamp: number; result: FederatedSearchResult }>();

function diagnoseSourceError(
  sourceId: ApiSourceId,
  label: string,
  err: unknown,
  language: SupportedLanguage = 'pt',
  usedCredential = false
): { errorMessage: string; errorDetail: string; rawError: string } {
  const tr = (key: keyof Translations) => translate(language, key, { label });
  const diagnosis = (messageKey: keyof Translations, detailKey: keyof Translations) => ({
    errorMessage: tr(messageKey),
    errorDetail: tr(detailKey),
    rawError,
  });
  const viaProxy = API_SOURCE_REGISTRY[sourceId]?.transport !== 'direct';
  const rawError = err instanceof Error ? err.message : String(err || tr('sourceErrUnknown'));
  const normalized = rawError.toLowerCase();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return diagnosis('sourceErrOfflineMsg', 'sourceErrOfflineDetail');
  }
  if (normalized.includes('timeout')) {
    return diagnosis('sourceErrTimeoutMsg', 'sourceErrTimeoutDetail');
  }

  const httpMatch = rawError.match(/\bHTTP\s+(\d{3})\b/i);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    if (status === 429) return diagnosis('sourceErrRateLimitMsg', 'sourceErrRateLimitDetail');
    if (status === 400 || status === 422) {
      return diagnosis('sourceErrRejectedQueryMsg', 'sourceErrRejectedQueryDetail');
    }
    if (status === 401 || status === 403) {
      return usedCredential
        ? diagnosis('sourceErrKeyRejectedMsg', 'sourceErrKeyRejectedDetail')
        : diagnosis('sourceErrForbiddenMsg', 'sourceErrForbiddenDetail');
    }
    if (status === 404) {
      return diagnosis(
        'sourceErrNotFoundMsg',
        viaProxy ? 'sourceErrNotFoundProxyDetail' : 'sourceErrNotFoundDirectDetail'
      );
    }
    if (status >= 500) return diagnosis('sourceErrServerMsg', 'sourceErrServerDetail');
  }

  const isNetworkOrCors = [
    'load failed',
    'failed to fetch',
    'networkerror',
    'network request failed',
    'err_failed',
  ].some((marker) => normalized.includes(marker));
  if (isNetworkOrCors) {
    if (sourceId === 'semanticscholar') {
      return diagnosis('sourceErrS2ThrottleMsg', 'sourceErrS2ThrottleDetail');
    }
    return viaProxy
      ? diagnosis('sourceErrProxyUnreachableMsg', 'sourceErrProxyUnreachableDetail')
      : diagnosis('sourceErrBlockedMsg', 'sourceErrBlockedDetail');
  }

  if (['json', 'unexpected token', 'syntaxerror', 'xml', 'domparser', 'html'].some((m) => normalized.includes(m))) {
    return diagnosis('sourceErrMaintenanceMsg', 'sourceErrMaintenanceDetail');
  }

  return diagnosis('sourceErrGenericMsg', 'sourceErrGenericDetail');
}

function runWithSourceAbortAndTimeout<T>(
  runner: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
  parentSignal?: AbortSignal
): Promise<T> {
  if (parentSignal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const controller = new AbortController();

  return new Promise<T>((resolve, reject) => {
    const onParentAbort = () => {
      clearTimeout(timer);
      controller.abort();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label}: timeout (${Math.round(timeoutMs / 1000)}s)`));
    }, timeoutMs);

    parentSignal?.addEventListener('abort', onParentAbort, { once: true });

    runner(controller.signal).then(
      (val) => {
        clearTimeout(timer);
        parentSignal?.removeEventListener('abort', onParentAbort);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        parentSignal?.removeEventListener('abort', onParentAbort);
        reject(err);
      }
    );
  });
}

export interface PlannedFederatedSource {
  id: ApiSourceId;
  label: string;
  credential: ByokCredentialEntry | null;
}

/**
 * Decides which sources a search runs, in registry order. API_SOURCE_REGISTRY is the single
 * source of truth for labels, scope membership and BYOK gating: a BYOK-only source joins
 * only with an active key, and an optional key upgrades an open source (label "(Key)").
 */
export function planFederatedSources(
  scope: SearchScopeId,
  accessConfig?: UserAccessConfig
): PlannedFederatedSource[] {
  return Object.values(API_SOURCE_REGISTRY).flatMap((meta) => {
    if (!sourceMatchesScope(meta.id, scope)) return [];
    const credential = meta.byokProviderId
      ? getActiveByokEntry(accessConfig, meta.byokProviderId)
      : null;
    if (meta.requiresByok && !credential) return [];
    return [
      {
        id: meta.id,
        label: credential && !meta.requiresByok ? `${meta.label} (Key)` : meta.label,
        credential,
      },
    ];
  });
}

export async function runFederatedSearch(
  query: string,
  yearFrom?: number,
  optionsOrCallback?: RunFederatedSearchOptions | ((statuses: SourceFetchStatus[]) => void)
): Promise<FederatedSearchResult> {
  const options: RunFederatedSearchOptions =
    typeof optionsOrCallback === 'function'
      ? { onProgress: (p) => optionsOrCallback(p.statuses) }
      : optionsOrCallback ?? {};
  const { signal, language = 'pt', scope = 'all', accessConfig, onProgress } = options;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const byokSig = buildByokCacheSignature(accessConfig);
  const cacheKey = `${query.trim().toLowerCase()}::${yearFrom ?? 'all'}::${language}::${scope}::${byokSig}`;
  const cached = federatedSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FEDERATED_CACHE_TTL_MS) {
    onProgress?.({
      ...cached.result,
      completedCount: cached.result.statuses.length,
      totalCount: cached.result.statuses.length,
    });
    return cached.result;
  }

  const sources = planFederatedSources(scope, accessConfig);

  const statuses: SourceFetchStatus[] = sources.map((s) => ({
    source: s.id,
    label: s.label,
    status: 'loading',
    count: 0,
  }));

  const allPapers: NormalizedPaper[] = [];
  let completedCount = 0;
  let hasEmittedFirstArticles = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const emitProgressSnapshot = () => {
    if (signal?.aborted || !onProgress) return;
    onProgress({
      rawPapers: [...allPapers],
      statuses: [...statuses],
      completedCount,
      totalCount: sources.length,
    });
  };

  // Emit the initial loading state for every scheduled source immediately
  emitProgressSnapshot();

  const onAbortCleanup = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };
  signal?.addEventListener('abort', onAbortCleanup, { once: true });

  try {
    await Promise.allSettled(
      sources.map(async (src, idx) => {
        const t0 = performance.now();
        let addedPapers = false;
        try {
          const res = await runWithSourceAbortAndTimeout(
            (srcSignal) =>
              SOURCE_RUNNERS[src.id]({ query, yearFrom, signal: srcSignal, credential: src.credential }),
            SOURCE_TIMEOUT_MS,
            src.label,
            signal
          );
          if (signal?.aborted) return;
          const latencyMs = Math.round(performance.now() - t0);
          statuses[idx] = {
            source: src.id,
            label: src.label,
            status: 'success',
            count: res.length,
            latencyMs,
          };
          if (res.length > 0) {
            const rankedRes = localizeUntitledPapers(res, language).map((paper, rankIdx) => ({
              ...paper,
              sourceRanks: {
                ...(paper.sourceRanks ?? {}),
                [src.id]: paper.sourceRanks?.[src.id] ?? rankIdx + 1,
              },
            }));
            allPapers.push(...rankedRes);
            addedPapers = true;
          }
        } catch (err) {
          if (signal?.aborted || (err as Error)?.name === 'AbortError') return;
          const latencyMs = Math.round(performance.now() - t0);
          const diagnostic = diagnoseSourceError(src.id, src.label, err, language, Boolean(src.credential));
          statuses[idx] = {
            source: src.id,
            label: src.label,
            status: 'error',
            count: 0,
            latencyMs,
            errorMessage: diagnostic.errorMessage,
            errorDetail: diagnostic.errorDetail,
            rawError: diagnostic.rawError,
          };
        }

        if (signal?.aborted) return;
        completedCount += 1;

        const isFinal = completedCount === sources.length;
        const shouldFlushImmediately =
          isFinal || (addedPapers && !hasEmittedFirstArticles);

        if (addedPapers) {
          hasEmittedFirstArticles = true;
        }

        if (shouldFlushImmediately) {
          if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
          }
          emitProgressSnapshot();
        } else if (!flushTimer && onProgress) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            emitProgressSnapshot();
          }, STREAM_COALESCE_MS);
        }
      })
    );
  } finally {
    signal?.removeEventListener('abort', onAbortCleanup);
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const finalResult: FederatedSearchResult = {
    rawPapers: [...allPapers],
    statuses,
  };

  if (federatedSearchCache.size >= FEDERATED_CACHE_MAX) {
    const oldestKey = federatedSearchCache.keys().next().value;
    if (oldestKey) federatedSearchCache.delete(oldestKey);
  }
  federatedSearchCache.set(cacheKey, { timestamp: Date.now(), result: finalResult });

  return finalResult;
}

/**
 * Dispatches multiple URLs via the local cross-platform Node bridge (Windows/Linux/macOS)
 * so the OS opens tabs natively without browser pop-up blocking. Falls back to window.open if offline.
 */
export async function launchUrlsCrossPlatform(
  urls: string[]
): Promise<{ usedNativeBridge: boolean; launchedCount: number }> {
  const safeUrls = urls
    .map((u) => sanitizeExternalUrl(u))
    .filter((u): u is string => Boolean(u));
  if (safeUrls.length === 0) return { usedNativeBridge: false, launchedCount: 0 };

  // 1. Detecção e execução em runtime nativo Tauri Desktop
  if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      let launched = 0;
      for (let i = 0; i < safeUrls.length; i++) {
        await openUrl(safeUrls[i]);
        launched++;
        if (i < safeUrls.length - 1) {
          await new Promise((r) => setTimeout(r, 110));
        }
      }
      return { usedNativeBridge: true, launchedCount: launched };
    } catch (tauriErr) {
      console.warn('[Tauri Opener] Falha ao despachar URL pelo plugin:', tauriErr);
    }
  }

  // 2. Node.js Local Bridge (/api/launch-urls) — only attempt when running on localhost
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalHost) {
    try {
      const res = await fetch('/api/launch-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: safeUrls }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          return {
            usedNativeBridge: true,
            launchedCount: Number(data.launchedCount || safeUrls.length),
          };
        }
      }
    } catch {
      // Fallback to browser window.open if running static build without bridge
    }
  }

  // 3. Fallback Web Standard
  let opened = 0;
  safeUrls.forEach((url) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) opened++;
  });

  return {
    usedNativeBridge: false,
    launchedCount: opened,
  };
}
