import { ByokCredentialEntry, ByokProviderId } from '../types/academic';
import {
  buildByokProxyPath,
  buildDedicatedProxyPath,
  buildDedicatedUpstreamUrl,
  buildFreeProxyPath,
  buildFreeProxyUpstreamUrl,
  type DedicatedProxySource,
  type FreeProxyProvider,
} from '../../shared/upstreams.mjs';

export function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

export function cleanDoi(rawDoi?: string | null): string | null {
  if (!rawDoi) return null;
  const trimmed = rawDoi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .toLowerCase();
  return trimmed || null;
}

export async function crossPlatformFetch(
  proxyUrl: string,
  directUrl: string,
  init?: RequestInit
): Promise<Response> {
  if (isTauriRuntime()) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      return await tauriFetch(directUrl, init);
    } catch {
      // Fallback to standard fetch if plugin fails to load
    }
  }

  const checkAborted = () => {
    if (init?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  };

  checkAborted();

  let lastHttpStatus: number | null = null;
  let lastNetworkError: string | null = null;

  try {
    const proxyRes = await fetch(proxyUrl, init);
    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && !contentType.includes('text/html')) {
      return proxyRes;
    }
    if (!proxyRes.ok) lastHttpStatus = proxyRes.status;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    lastNetworkError = err instanceof Error ? err.message : String(err);
  }

  checkAborted();

  try {
    const cloudProxyRes = await fetch(`https://cartographsearch.vercel.app${proxyUrl}`, init);
    const contentType = cloudProxyRes.headers.get('content-type') || '';
    if (cloudProxyRes.ok && !contentType.includes('text/html')) {
      return cloudProxyRes;
    }
    if (!cloudProxyRes.ok) lastHttpStatus = cloudProxyRes.status;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    lastNetworkError = err instanceof Error ? err.message : String(err);
  }

  checkAborted();

  try {
    const directRes = await fetch(directUrl, init);
    if (directRes.ok) {
      return directRes;
    }
    lastHttpStatus = directRes.status;
    throw new Error(`HTTP ${directRes.status}`);
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (lastHttpStatus) {
      throw new Error(`HTTP ${lastHttpStatus} (${msg})`);
    }
    throw new Error(lastNetworkError || msg);
  }
}

export async function fetchViaByokProxy(
  provider: ByokProviderId,
  query: string,
  limit: number,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<Response> {
  const proxyUrl = buildByokProxyPath(provider, query, limit, yearFrom);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Cartograph-Key': credential.apiKey.trim(),
  };
  if (credential.secondaryToken?.trim()) {
    headers['X-Cartograph-Inst-Token'] = credential.secondaryToken.trim();
  }

  const res = await fetch(proxyUrl, {
    method: 'GET',
    headers,
    signal,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res;
}

/** Generic academic proxy source: same-origin proxy first, upstream URL as direct fallback. */
export async function fetchFreeProxyJson(
  provider: FreeProxyProvider,
  query: string,
  limit: number,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<unknown> {
  const res = await crossPlatformFetch(
    buildFreeProxyPath(provider, query, limit, yearFrom),
    buildFreeProxyUpstreamUrl(provider, query, limit, yearFrom),
    { headers: { Accept: 'application/json' }, signal }
  );
  return (await res.json()) as unknown;
}

/** Sources with a dedicated proxy route (/api/arxiv, /api/zenodo, /api/osti, /api/ntrs). */
export function fetchDedicatedSource(
  source: DedicatedProxySource,
  query: string,
  limit: number,
  init?: RequestInit
): Promise<Response> {
  return crossPlatformFetch(
    buildDedicatedProxyPath(source, query, limit),
    buildDedicatedUpstreamUrl(source, query, limit),
    init
  );
}
