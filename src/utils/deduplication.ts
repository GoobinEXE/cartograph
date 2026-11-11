import { DeduplicationSummary, NormalizedPaper } from '../types/academic';

/**
 * Normalizes a DOI string to a standard lowercase prefix-free representation.
 */
export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  const cleaned = doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  return cleaned || null;
}

/**
 * Extracts a normalized arXiv identifier if present in ID or URL.
 */
export function extractArxivId(str: string): string | null {
  const match = str.match(/(?:arxiv\.org\/(?:abs|pdf)\/|arxiv:)([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?|[a-z\-]+(?:\.[a-z]{2})?\/[0-9]{7})/i);
  return match ? match[1].toLowerCase().replace(/v[0-9]+$/, '') : null;
}

/**
 * Extracts a normalized PubMed ID (PMID) if present.
 */
export function extractPmid(str: string): string | null {
  const match = str.match(/(?:pubmed\.ncbi\.nlm\.nih\.gov\/|pmid:?\s*)([0-9]{6,9})/i);
  return match ? match[1] : null;
}

/**
 * Normalizes title for phonetics/orthography comparison:
 * lowercase, removes diacritics/accents, removes punctuation, trims spaces.
 */
export function normalizeTitleForComparison(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the first author's normalized surname.
 */
export function getFirstAuthorSurname(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  const first = authors[0].trim();
  // If formatted as "LAST, First"
  if (first.includes(',')) {
    return first.split(',')[0].trim().toLowerCase();
  }
  // Otherwise take last word
  const parts = first.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Computes Jaro-Winkler string similarity (range 0.0 to 1.0).
 * Proven gold standard in deterministic bibliographic record linkage.
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) {
      k++;
    }
    if (s1[i] !== s2[k]) {
      transpositions++;
    }
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix scaling (up to 4 matching initial chars with standard scale 0.1)
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(len1, len2));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Merges two duplicate paper records preserving the richest data from both.
 */
function mergePaperRecords(primary: NormalizedPaper, secondary: NormalizedPaper): NormalizedPaper {
  return {
    ...primary,
    doi: primary.doi || secondary.doi,
    pdfUrl: primary.pdfUrl || secondary.pdfUrl,
    isOpenAccess: primary.isOpenAccess || secondary.isOpenAccess,
    citationCount: Math.max(primary.citationCount, secondary.citationCount),
    abstractText:
      primary.abstractText && primary.abstractText.length >= (secondary.abstractText?.length || 0)
        ? primary.abstractText
        : secondary.abstractText || primary.abstractText,
    authors:
      primary.authors.length >= secondary.authors.length ? primary.authors : secondary.authors,
    venue: primary.venue !== 'Periódico Científico' ? primary.venue : secondary.venue,
    year: primary.year || secondary.year,
  };
}

/**
 * Multi-criteria deterministic deduplication engine for academic records.
 * Runs in O(n) for exact keys and targeted O(k^2) bucket comparison for fuzzy titles.
 */
export function deduplicatePapersAdvanced(papers: NormalizedPaper[]): {
  papers: NormalizedPaper[];
  summary: DeduplicationSummary;
} {
  const originalCount = papers.length;
  if (originalCount <= 1) {
    return {
      papers: [...papers],
      summary: {
        originalCount,
        uniqueCount: originalCount,
        duplicatesRemoved: 0,
        mergedByDoi: 0,
        mergedByPmidOrArxiv: 0,
        mergedByFuzzyTitle: 0,
      },
    };
  }

  let mergedByDoi = 0;
  let mergedByPmidOrArxiv = 0;
  let mergedByFuzzyTitle = 0;

  // Step 1: Group by exact Canonical DOI
  const doiMap = new Map<string, NormalizedPaper>();
  const nonDoiPapers: NormalizedPaper[] = [];

  for (const paper of papers) {
    const cleanDoi = normalizeDoi(paper.doi);
    if (cleanDoi) {
      const existing = doiMap.get(cleanDoi);
      if (existing) {
        doiMap.set(cleanDoi, mergePaperRecords(existing, paper));
        mergedByDoi++;
      } else {
        doiMap.set(cleanDoi, { ...paper, doi: cleanDoi });
      }
    } else {
      nonDoiPapers.push(paper);
    }
  }

  // Intermediate list after DOI dedup
  const phase1List: NormalizedPaper[] = [...Array.from(doiMap.values()), ...nonDoiPapers];

  // Step 2: Group by secondary exact persistent IDs (arXiv ID or PMID)
  const idMap = new Map<string, NormalizedPaper>();
  const remainingPapers: NormalizedPaper[] = [];

  for (const paper of phase1List) {
    const arxivId = extractArxivId(paper.url) || extractArxivId(paper.id);
    const pmid = extractPmid(paper.url) || extractPmid(paper.id);
    const persistentKey = arxivId ? `arxiv:${arxivId}` : pmid ? `pmid:${pmid}` : null;

    if (persistentKey) {
      const existing = idMap.get(persistentKey);
      if (existing) {
        idMap.set(persistentKey, mergePaperRecords(existing, paper));
        mergedByPmidOrArxiv++;
      } else {
        idMap.set(persistentKey, paper);
      }
    } else {
      remainingPapers.push(paper);
    }
  }

  // Intermediate list after persistent ID dedup
  const candidates: NormalizedPaper[] = [...Array.from(idMap.values()), ...remainingPapers];

  // Step 3: Fuzzy title + First Author + Year matching
  const finalUniqueList: NormalizedPaper[] = [];
  const processedIndices = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (processedIndices.has(i)) continue;

    let current = candidates[i];
    const currentNormTitle = normalizeTitleForComparison(current.title);
    const currentAuthor = getFirstAuthorSurname(current.authors);

    for (let j = i + 1; j < candidates.length; j++) {
      if (processedIndices.has(j)) continue;

      const compare = candidates[j];
      const compareNormTitle = normalizeTitleForComparison(compare.title);

      // Fast preliminary length check: if length difference > 35%, skip
      const lenDiff = Math.abs(currentNormTitle.length - compareNormTitle.length);
      const maxLen = Math.max(currentNormTitle.length, compareNormTitle.length);
      if (maxLen > 0 && lenDiff / maxLen > 0.35) continue;

      // Jaro-Winkler similarity calculation
      const similarity = jaroWinklerSimilarity(currentNormTitle, compareNormTitle);

      if (similarity >= 0.90) {
        // Confirm with Year tolerance (+/- 1 year) or Author match
        const yearDiff =
          current.year && compare.year ? Math.abs(current.year - compare.year) : 0;
        const compareAuthor = getFirstAuthorSurname(compare.authors);
        const authorMatches =
          !currentAuthor || !compareAuthor || currentAuthor === compareAuthor;

        if (yearDiff <= 1 && authorMatches) {
          current = mergePaperRecords(current, compare);
          processedIndices.add(j);
          mergedByFuzzyTitle++;
        }
      }
    }

    finalUniqueList.push(current);
    processedIndices.add(i);
  }

  const uniqueCount = finalUniqueList.length;
  const duplicatesRemoved = originalCount - uniqueCount;

  return {
    papers: finalUniqueList,
    summary: {
      originalCount,
      uniqueCount,
      duplicatesRemoved,
      mergedByDoi,
      mergedByPmidOrArxiv,
      mergedByFuzzyTitle,
    },
  };
}

