import { isBareDoi, normalizeDoi } from '../../shared/identifiers.mjs';

const DOI_REGEX = /(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[^\s,;"'<>]+)/gi;
const ARXIV_URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)(?:\.pdf)?/gi;
const ARXIV_PREFIX_REGEX = /\barxiv:\s*(\d{4}\.\d{4,5}(?:v\d+)?)\b/gi;
const PUBMED_URL_REGEX = /(?:https?:\/\/)?pubmed\.ncbi\.nlm\.nih\.gov\/(\d{6,9})\/?/gi;
const PMID_PREFIX_REGEX = /\bpmid:?\s*(\d{6,9})\b/gi;
const PURE_PMID_LINE_REGEX = /^\d{7,8}$/;
const PURE_ARXIV_LINE_REGEX = /^(\d{4}\.\d{4,5})(?:v\d+)?$/i;

interface ExtractedMatch {
  index: number;
  token: string;
}

function stripTrailingDoiNoise(candidate: string): string {
  let clean = candidate.replace(/[.,;:!?\]\}]+$/, '');
  while (clean.endsWith(')')) {
    const opens = (clean.match(/\(/g) ?? []).length;
    const closes = (clean.match(/\)/g) ?? []).length;
    if (closes <= opens) break;
    clean = clean.slice(0, -1).replace(/[.,;:!?\]\}]+$/, '');
  }
  return clean;
}

function blankRange(chars: string[], start: number, end: number): void {
  for (let i = start; i < end && i < chars.length; i += 1) {
    if (chars[i] !== '\n' && chars[i] !== '\r') {
      chars[i] = ' ';
    }
  }
}

/**
 * Deterministically extracts and deduplicates academic identifiers (DOI, arXiv ID, PMID)
 * from raw text pasted from messaging apps, emails, web links, or bibliography lines.
 */
export function extractAcademicIdentifiers(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  const chars = raw.split('');
  const matches: ExtractedMatch[] = [];

  const scanAndBlank = (
    regex: RegExp,
    formatMatch: (match: RegExpExecArray) => string | null
  ): void => {
    const working = chars.join('');
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(working)) !== null) {
      const token = formatMatch(match);
      if (token) {
        matches.push({ index: match.index, token });
        blankRange(chars, match.index, match.index + match[0].length);
      }
    }
  };

  // 1. DOIs first so numeric/version fragments inside DOI suffixes are not misread as PMIDs/arXiv IDs.
  scanAndBlank(DOI_REGEX, (match) => {
    const cleaned = stripTrailingDoiNoise(match[1]);
    const normalized = normalizeDoi(cleaned);
    if (!normalized || !isBareDoi(normalized)) {
      return null;
    }
    return normalized;
  });

  // 2. arXiv URLs and explicit arXiv: prefixes.
  const formatArxiv = (rawId: string): string =>
    `arXiv:${rawId.toLowerCase().replace(/v\d+$/i, '')}`;

  scanAndBlank(ARXIV_URL_REGEX, (match) => formatArxiv(match[1]));
  scanAndBlank(ARXIV_PREFIX_REGEX, (match) => formatArxiv(match[1]));

  // 3. PubMed URLs and explicit PMID prefixes.
  scanAndBlank(PUBMED_URL_REGEX, (match) => `PMID:${match[1]}`);
  scanAndBlank(PMID_PREFIX_REGEX, (match) => `PMID:${match[1]}`);

  // 4. Standalone pure lines (7-8 digit PMIDs or bare YYMM.NNNNN arXiv IDs).
  const remaining = chars.join('');
  let offset = 0;
  for (const line of remaining.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/[.,;]+$/, '');
    if (PURE_PMID_LINE_REGEX.test(trimmed)) {
      matches.push({ index: offset, token: `PMID:${trimmed}` });
    } else {
      const bareArxiv = PURE_ARXIV_LINE_REGEX.exec(trimmed);
      if (bareArxiv) {
        matches.push({ index: offset, token: formatArxiv(bareArxiv[1]) });
      }
    }
    offset += line.length + 1;
  }

  matches.sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const item of matches) {
    if (!seen.has(item.token)) {
      seen.add(item.token);
      deduped.push(item.token);
    }
  }
  return deduped;
}
