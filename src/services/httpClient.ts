import { ByokCredentialEntry, ByokProviderId } from '../types/academic';
import {
  CARTOGRAPH_USER_AGENT,
  buildByokProxyPath,
  buildByokUpstreamSpec,
  buildDedicatedProxyPath,
  buildDedicatedUpstreamUrl,
  buildFreeProxyPath,
  buildFreeProxyUpstreamUrl,
  type DedicatedProxySource,
  type FreeProxyProvider,
} from '../../shared/upstreams.mjs';

/**
 * Network policy for every academic request (single module, three runtimes):
 *
 * - Tauri desktop: call the upstream directly through the native HTTP plugin (no CORS,
 *   scope `https://**` in src-tauri/capabilities). BYOK keys go straight to the provider.
 * - Web: call the same-origin proxy. A JSON/XML answer means the proxy exists: success is
 *   returned, and an error skips the cloud proxy (same code, same failure) and tries the
 *   direct URL once, reporting the proxy status if the browser cannot reach the upstream.
 *   An HTML answer or a network failure means there is no proxy on this origin (static
 *   hosting, Vite without the bridge); then the cloud proxy and the direct URL are tried.
 * - BYOK on the web uses the same-origin proxy only: personal keys never leave for a
 *   second host.
 */

type EnvBag = { env?: Record<string, string | undefined> };

/** Hosted proxy used when the current origin serves no /api (override with VITE_CLOUD_PROXY_ORIGIN). */
export const CLOUD_PROXY_ORIGIN = (
  (import.meta as ImportMeta & EnvBag).env?.VITE_CLOUD_PROXY_ORIGIN?.trim() ||
  'https://cartographsearch.vercel.app'
).replace(/\/+$/, '');

export class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number, label?: string) {
    // "HTTP <status>" is the contract diagnoseSourceError() parses.
    super(label ? `${label} HTTP ${status}` : `HTTP ${status}`);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

/**
 * The launcher bridge (server/launcher-bridge.mjs) runs only on the researcher's machine, so
 * its routes (/api/health, /api/launch-urls) exist only on a loopback origin: never on the
 * Vercel deployment, where probing them just logs a 404, and never inside Tauri, which opens
 * tabs through its own opener plugin.
 */
export function isLocalBridgeOrigin(): boolean {
  if (typeof window === 'undefined' || !window.location || isTauriRuntime()) return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function isAbortError(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === 'AbortError';
}

function throwIfAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

async function tauriFetch(url: string, init?: RequestInit): Promise<Response> {
  const { fetch: nativeFetch } = await import('@tauri-apps/plugin-http');
  return nativeFetch(url, init);
}

/** True when the response was produced by one of our proxy functions (not an SPA fallback page). */
function isProxyPayload(res: Response): boolean {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  return !contentType.includes('text/html') && (contentType.includes('json') || contentType.includes('xml'));
}

function currentOrigin(): string | null {
  return typeof window !== 'undefined' && window.location ? window.location.origin : null;
}

export async function crossPlatformFetch(
  proxyPath: string,
  directUrl: string,
  init?: RequestInit
): Promise<Response> {
  throwIfAborted(init?.signal);

  if (isTauriRuntime()) {
    const res = await tauriFetch(directUrl, init);
    if (!res.ok) throw new HttpStatusError(res.status);
    return res;
  }

  const proxyCandidates = [proxyPath];
  if (currentOrigin() !== CLOUD_PROXY_ORIGIN) proxyCandidates.push(`${CLOUD_PROXY_ORIGIN}${proxyPath}`);

  let lastNetworkError: string | null = null;
  let proxyErrorStatus: number | null = null;
  for (const candidate of proxyCandidates) {
    let res: Response;
    try {
      res = await fetch(candidate, init);
    } catch (err) {
      if (isAbortError(err)) throw err;
      lastNetworkError = err instanceof Error ? err.message : String(err);
      continue;
    }
    if (isProxyPayload(res)) {
      if (res.ok) return res;
      // A proxy answered with an error (query rejected by its validation, upstream
      // blocking server egress IPs, rate limit). The cloud proxy runs the same code and
      // would fail the same way, so skip it and give the browser's own route one try.
      proxyErrorStatus = res.status;
      break;
    }
    // HTML or unknown payload: no proxy deployed on this origin, try the next candidate.
    throwIfAborted(init?.signal);
  }

  // Last resort: only CORS-enabled upstreams succeed from a plain browser context.
  try {
    const res = await fetch(directUrl, init);
    if (res.ok) return res;
    throw new HttpStatusError(res.status);
  } catch (err) {
    if (isAbortError(err) || err instanceof HttpStatusError) throw err;
    // Direct access blocked (typically CORS): the proxy status explains the failure better.
    if (proxyErrorStatus !== null) throw new HttpStatusError(proxyErrorStatus);
    throw new Error(lastNetworkError || (err instanceof Error ? err.message : String(err)));
  }
}

/** Direct JSON request to a CORS-enabled API (works the same in the browser and in Tauri). */
export async function fetchJsonDirect(url: string, label: string, init?: RequestInit): Promise<unknown> {
  throwIfAborted(init?.signal);
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) throw new HttpStatusError(res.status, label);
  return (await res.json()) as unknown;
}

export async function fetchViaByokProxy(
  provider: ByokProviderId,
  query: string,
  limit: number,
  credential: ByokCredentialEntry,
  yearFrom?: number,
  signal?: AbortSignal
): Promise<Response> {
  const apiKey = credential.apiKey.trim();
  const instToken = credential.secondaryToken?.trim() || undefined;

  if (isTauriRuntime()) {
    const spec = buildByokUpstreamSpec(provider, {
      query,
      limit,
      apiKey,
      instToken,
      yearFrom,
      userAgent: CARTOGRAPH_USER_AGENT,
    });
    const res = await tauriFetch(spec.url, {
      method: spec.method,
      headers: spec.headers,
      body: spec.body,
      signal,
    });
    if (!res.ok) throw new HttpStatusError(res.status);
    return res;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Cartograph-Key': apiKey,
  };
  if (instToken) headers['X-Cartograph-Inst-Token'] = instToken;

  const res = await fetch(buildByokProxyPath(provider, query, limit, yearFrom), {
    method: 'GET',
    headers,
    signal,
  });
  if (!res.ok) throw new HttpStatusError(res.status);
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
