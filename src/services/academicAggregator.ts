import {
  ApiSourceId,
  ByokCredentialEntry,
  DeduplicationSummary,
  NormalizedPaper,
  SearchScopeId,
  SourceFetchStatus,
  UserAccessConfig,
} from '../types/academic';
import { deduplicatePapersAdvanced } from '../utils/deduplication';
import { sanitizeExternalUrl } from '../utils/urlSafety';
import { SupportedLanguage } from '../i18n/translations';
import { API_SOURCE_REGISTRY, sourceMatchesScope } from '../data/apiSources';
import { buildByokCacheSignature, getActiveByokEntry } from '../utils/accessConfig';
import { crossPlatformFetch, isTauriRuntime } from './httpClient';
import { SOURCE_RUNNERS } from './sourceRunners';

export { crossPlatformFetch, isTauriRuntime };

export function deduplicatePapers(papers: NormalizedPaper[]): NormalizedPaper[] {
  return deduplicatePapersAdvanced(papers).papers;
}

export interface FederatedSearchResult {
  papers: NormalizedPaper[];
  rawPapers: NormalizedPaper[];
  statuses: SourceFetchStatus[];
  deduplicationSummary: DeduplicationSummary;
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
  const isEn = language === 'en';
  const viaProxy = API_SOURCE_REGISTRY[sourceId]?.transport !== 'direct';
  const rawError = err instanceof Error ? err.message : String(err || (isEn ? 'Unknown error' : 'Erro desconhecido'));
  const normalized = rawError.toLowerCase();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      errorMessage: isEn
        ? 'Internet connection unavailable on this device.'
        : 'Conexão com a internet indisponível no dispositivo.',
      errorDetail: isEn
        ? 'Restore network access and run the search again.'
        : 'Restabeleça o acesso à rede e execute a pesquisa novamente.',
      rawError,
    };
  }

  if (normalized.includes('timeout') || normalized.includes('12s')) {
    return {
      errorMessage: isEn
        ? `${label} exceeded the response timeout for this query.`
        : `${label} excedeu o tempo limite de resposta para esta consulta.`,
      errorDetail: isEn
        ? 'Query complexity or temporary repository slowness prevented records from returning. Reduce the number of keywords or retry in a few moments.'
        : 'O volume de termos pesquisados ou a lentidão momentânea da base impediu o retorno dos registros. Reduza o número de palavras-chave ou repita a operação em instantes.',
      rawError,
    };
  }

  const httpMatch = rawError.match(/\bHTTP\s+(\d{3})\b/i);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    if (status === 429) {
      return {
        errorMessage: isEn
          ? `${label} reached its temporary rate limit for consecutive queries.`
          : `${label} atingiu o limite temporário de consultas consecutivas.`,
        errorDetail: isEn
          ? 'The provider restricts consecutive request volume. Wait about 1 minute before querying this source again.'
          : 'O provedor restringe o volume de pesquisas enviadas em sequência. Aguarde aproximadamente 1 minuto antes de realizar uma nova consulta nesta fonte.',
        rawError,
      };
    }
    if (status === 400 || status === 422) {
      return {
        errorMessage: isEn
          ? `${label} rejected the query terms or filters provided.`
          : `${label} recusou os termos ou filtros informados nesta pesquisa.`,
        errorDetail: isEn
          ? 'Boolean operators (AND, OR, NOT), quotes, special symbols, or year filters may not be supported by this source. Try direct keywords.'
          : 'Operadores lógicos (AND, OR, NOT), aspas, símbolos especiais ou filtros de ano podem ser incompatíveis com esta base. Utilize apenas palavras-chave diretas.',
        rawError,
      };
    }
    if (status === 401 || status === 403) {
      if (usedCredential) {
        return {
          errorMessage: isEn
            ? `${label} rejected the configured API key or institutional token.`
            : `${label} recusou a chave de API ou token institucional configurado.`,
          errorDetail: isEn
            ? 'Review your key and optional InstToken in Institutional Access & API Keys settings.'
            : 'Verifique sua chave e o InstToken opcional nas configurações de Acesso Institucional & Chaves de API.',
          rawError,
        };
      }
      return {
        errorMessage: isEn
          ? `Automated access to ${label} is restricted by the origin portal.`
          : `O acesso automatizado ao ${label} encontra-se restrito pelo portal de origem.`,
        errorDetail: isEn
          ? 'Select another available source or open the portal directly in the "Platforms & Portals" tab.'
          : 'Selecione outra base disponível ou acesse o portal diretamente pela aba "Bases & Portais".',
        rawError,
      };
    }
    if (status === 404) {
      return {
        errorMessage: isEn
          ? `The ${label} search service is unavailable at the configured endpoint.`
          : `O serviço de pesquisa do ${label} encontra-se indisponível no endereço configurado.`,
        errorDetail: viaProxy
          ? (isEn
              ? 'The proxy service for this source is currently inactive. Use the remaining sources while connectivity is restored.'
              : 'O serviço intermediário de acesso a esta base está inativo no momento. Utilize as demais fontes enquanto a conexão é restabelecida.')
          : (isEn
              ? 'The repository may be undergoing maintenance or its search endpoint may be temporarily disabled.'
              : 'A base pode estar em manutenção ou com o serviço de busca temporariamente desativado.'),
        rawError,
      };
    }
    if (status >= 500) {
      return {
        errorMessage: isEn
          ? `${label} experienced an internal error while processing the request.`
          : `${label} apresentou instabilidade interna ao processar a solicitação.`,
        errorDetail: isEn
          ? 'The failure occurred on the scientific database provider side. Wait a few minutes before retrying.'
          : 'A falha ocorreu no sistema do provedor da base científica. Aguarde alguns minutos antes de repetir a consulta.',
        rawError,
      };
    }
  }

  const isNetworkOrCors =
    normalized.includes('load failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('err_failed');

  if (isNetworkOrCors) {
    if (sourceId === 'semanticscholar') {
      return {
        errorMessage: isEn
          ? 'Semantic Scholar reached its public request limit or temporarily restricted access.'
          : 'O Semantic Scholar atingiu o limite de consultas públicas ou restringiu temporariamente o acesso.',
        errorDetail: isEn
          ? 'Under high load, Semantic Scholar throttles requests briefly without returning CORS details to the browser. Wait about 1 minute to retry or use the other sources.'
          : 'Sob alta demanda, o Semantic Scholar interrompe novas pesquisas por alguns instantes sem retornar detalhes ao navegador. Aguarde aproximadamente 1 minuto para consultar esta base novamente ou utilize as demais fontes.',
        rawError,
      };
    }

    if (viaProxy) {
      return {
        errorMessage: isEn
          ? `Could not connect to ${label}.`
          : `Não foi possível estabelecer conexão com o ${label}.`,
        errorDetail: isEn
          ? 'The proxy service required for this source is unavailable or blocked right now. Retry later or select another source.'
          : 'O serviço intermediário necessário para consultar esta base está indisponível ou bloqueado no momento. Repita a operação mais tarde ou selecione outra fonte.',
        rawError,
      };
    }

    return {
      errorMessage: isEn
        ? `Communication with ${label} was blocked or interrupted during the query.`
        : `A comunicação com o ${label} foi bloqueada ou interrompida durante a consulta.`,
      errorDetail: isEn
        ? 'This may be caused by temporary origin rate limits or browser extensions/network tools such as VPNs, antivirus shields, or content blockers. Retry shortly.'
        : 'A restrição pode decorrer de limite temporário do portal de origem ou de bloqueios externos no navegador, como VPN, antivírus ou bloqueadores de conteúdo. Repita a pesquisa em instantes.',
      rawError,
    };
  }

  if (
    normalized.includes('json') ||
    normalized.includes('unexpected token') ||
    normalized.includes('syntaxerror') ||
    normalized.includes('xml') ||
    normalized.includes('domparser') ||
    normalized.includes('html')
  ) {
    return {
      errorMessage: isEn
        ? `${label} returned a notice or maintenance page instead of bibliographic records.`
        : `${label} retornou uma página de aviso ou manutenção em vez dos registros bibliográficos.`,
      errorDetail: isEn
        ? 'The portal may be undergoing scheduled updates. Try querying again later.'
        : 'O portal pode estar passando por atualização programada. Repita a consulta mais tarde.',
      rawError,
    };
  }

  return {
    errorMessage: isEn
      ? `Could not complete the search in ${label}.`
      : `Não foi possível concluir a pesquisa em ${label}.`,
    errorDetail: isEn
      ? 'Retry in a few moments or switch back to "All sources" to view results from the remaining databases.'
      : 'Repita a operação em alguns instantes ou retorne para "Todas as fontes" para visualizar os resultados das demais bases.',
    rawError,
  };
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
    const rawSnapshot = [...allPapers];
    const { papers, summary } = deduplicatePapersAdvanced(rawSnapshot);
    onProgress({
      papers,
      rawPapers: rawSnapshot,
      statuses: [...statuses],
      deduplicationSummary: summary,
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
            const rankedRes = res.map((paper, rankIdx) => ({
              ...paper,
              title: language === 'en' && paper.title === 'Sem título' ? 'Untitled' : paper.title,
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

  const rawPapers = [...allPapers];
  const { papers: dedupedPapers, summary } = deduplicatePapersAdvanced(rawPapers);
  const finalResult: FederatedSearchResult = {
    papers: dedupedPapers,
    rawPapers,
    statuses,
    deduplicationSummary: summary,
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
