const ALLOWED_EXACT_ORIGINS = new Set([
  'https://cartographsearch.com',
  'https://www.cartographsearch.com',
  'https://cartographsearch.vercel.app',
]);

const VERCEL_PREVIEW_ORIGIN_RE = /^https:\/\/cartographsearch-[a-z0-9-]+\.vercel\.app$/i;
const LOCAL_DEV_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i;

export const CARTOGRAPH_USER_AGENT =
  'Cartograph/2.4 (Academic Metasearch Hub; https://cartographsearch.com)';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const memoryRateLimits = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5000;

export interface MinimalRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface MinimalResponse {
  status: (code: number) => MinimalResponse;
  setHeader: (name: string, value: string) => void;
  json: (data: unknown) => void;
  send: (body: string) => void;
  end: () => void;
}

function getHeader(req: MinimalRequest, name: string): string {
  const val = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  if (Array.isArray(val)) return val[0] || '';
  return typeof val === 'string' ? val : '';
}

export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_EXACT_ORIGINS.has(origin)) return true;
  if (VERCEL_PREVIEW_ORIGIN_RE.test(origin)) return true;
  if (process.env.VERCEL_ENV !== 'production' && LOCAL_DEV_ORIGIN_RE.test(origin)) {
    return true;
  }
  return false;
}

export function setApiSecurityHeaders(res: MinimalResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export function applyCorsHeaders(
  req: MinimalRequest,
  res: MinimalResponse,
  allowedMethods: string
): boolean {
  setApiSecurityHeaders(res);
  const origin = getHeader(req, 'origin').trim();
  res.setHeader('Vary', 'Origin');

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Cartograph-Key, X-Cartograph-Inst-Token'
    );
  }

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      res.status(403).json({ ok: false, error: 'Origem não autorizada' });
      return true;
    }
    res.status(204).end();
    return true;
  }

  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ ok: false, error: 'Origem não autorizada' });
    return true;
  }

  return false;
}

export function getClientIp(req: MinimalRequest): string {
  const xff = getHeader(req, 'x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = getHeader(req, 'x-real-ip').trim();
  return realIp || 'unknown';
}

export async function enforceRateLimit(
  req: MinimalRequest,
  res: MinimalResponse,
  options: { keyPrefix: string; maxRequests: number; windowMs: number }
): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `${options.keyPrefix}:${ip}`;
  const now = Date.now();

  // Prune expired buckets when map grows large
  if (memoryRateLimits.size >= MAX_BUCKETS) {
    for (const [k, bucket] of memoryRateLimits.entries()) {
      if (bucket.resetAt <= now) {
        memoryRateLimits.delete(k);
      }
    }
    if (memoryRateLimits.size >= MAX_BUCKETS) {
      memoryRateLimits.clear();
    }
  }

  let bucket = memoryRateLimits.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + options.windowMs };
  }
  bucket.count += 1;
  memoryRateLimits.set(key, bucket);

  const remaining = Math.max(0, options.maxRequests - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (bucket.count > options.maxRequests) {
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      ok: false,
      error: 'Limite de requisições atingido. Aguarde alguns instantes.',
    });
    return false;
  }

  return true;
}

export function getQueryStringParam(req: MinimalRequest, key: string): string {
  const raw = req.query?.[key];
  if (Array.isArray(raw)) return raw[0] || '';
  return typeof raw === 'string' ? raw : '';
}

export function validateSearchParams(
  req: MinimalRequest,
  res: MinimalResponse,
  options: {
    limitKey: string;
    defaultLimit: number;
    maxLimit: number;
    maxQueryLength?: number;
  }
): { query: string; limit: number } | null {
  const maxQueryLength = options.maxQueryLength ?? 300;
  const rawQuery = getQueryStringParam(req, 'q')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim();

  if (!rawQuery) {
    res.status(400).json({ ok: false, error: 'Parâmetro q ausente' });
    return null;
  }

  if (rawQuery.length > maxQueryLength) {
    res.status(400).json({
      ok: false,
      error: `Parâmetro q excede o limite de ${maxQueryLength} caracteres`,
    });
    return null;
  }

  const rawLimit = Number(getQueryStringParam(req, options.limitKey) || options.defaultLimit);
  const safeLimit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(1, Math.floor(rawLimit)), options.maxLimit)
    : options.defaultLimit;

  return { query: rawQuery, limit: safeLimit };
}

export function setEdgeCacheHeaders(res: MinimalResponse, sMaxAgeSeconds = 300): void {
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${sMaxAgeSeconds * 2}`
  );
}
