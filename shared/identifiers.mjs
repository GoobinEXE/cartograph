// @ts-check
/**
 * Canonical persistent-identifier helpers shared by the app, the Vercel functions and the
 * launcher bridge. One implementation keeps deduplication (DOI level 1), the Unpaywall
 * proxy and every source adapter agreeing on what "the same DOI" means.
 */

/** Bare DOI syntax (prefix 10.NNNN/ + suffix), used to validate proxy input. */
export const BARE_DOI_PATTERN = /^10\.\d{4,9}\/\S+$/i;

/**
 * Lowercase, prefix-free DOI (`https://doi.org/`, `dx.doi.org/`, `doi:` removed), or null.
 * @param {string | null | undefined} doi
 * @returns {string | null}
 */
export function normalizeDoi(doi) {
  if (!doi) return null;
  const cleaned = String(doi)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();
  return cleaned || null;
}

/**
 * @param {string | null | undefined} doi
 * @returns {boolean}
 */
export function isBareDoi(doi) {
  const normalized = normalizeDoi(doi);
  return normalized !== null && BARE_DOI_PATTERN.test(normalized);
}
