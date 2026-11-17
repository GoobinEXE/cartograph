/**
 * Narrowing helpers for untrusted JSON from third-party APIs. Every accessor accepts
 * `unknown` and never throws, so a provider that renames or drops a field degrades to an
 * empty value instead of crashing the parser (and the screen that renders its output).
 */

export type JsonRecord = Readonly<Record<string, unknown>>;

const EMPTY_RECORD: JsonRecord = Object.freeze({});

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The value as an object, or a frozen empty object, so property chains stay safe. */
export function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : EMPTY_RECORD;
}

export function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Array entries that are objects; anything else is skipped. */
export function asRecords(value: unknown): JsonRecord[] {
  return asArray(value).filter(isRecord);
}

/** Trimmed non-empty string; finite numbers are stringified (IDs often arrive as numbers). */
export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/** First argument that resolves to a non-empty string. */
export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const str = asString(value);
    if (str !== undefined) return str;
  }
  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Array of strings/numbers as trimmed strings, empty entries dropped. */
export function asStringList(value: unknown, limit = Number.POSITIVE_INFINITY): string[] {
  const out: string[] = [];
  for (const entry of asArray(value)) {
    const str = asString(entry);
    if (str !== undefined) out.push(str);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Deterministic short ID (FNV-1a, base36) for records an API returns without an identifier.
 * The same record always maps to the same ID, which keeps deduplication, "already saved"
 * checks and relevance ranking reproducible across searches.
 */
export function stableHashId(...parts: Array<string | number | null | undefined>): string {
  const input = parts.map((part) => (part === null || part === undefined ? '' : String(part))).join('␟');
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
