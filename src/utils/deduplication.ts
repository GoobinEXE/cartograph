import {
  ApiSourceId,
  DeduplicationSummary,
  DedupOverrideRule,
  MergeClusterEntry,
  MergeRuleMatched,
  NormalizedPaper,
  SavedPaperItem,
} from '../types/academic';

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

function mergeSourceIds(primary: NormalizedPaper, secondary: NormalizedPaper): ApiSourceId[] {
  return Array.from(
    new Set<ApiSourceId>([
      primary.source,
      ...(primary.sources ?? []),
      secondary.source,
      ...(secondary.sources ?? []),
    ])
  );
}

function mergeSourceRanks(
  primary: NormalizedPaper,
  secondary: NormalizedPaper
): Partial<Record<ApiSourceId, number>> | undefined {
  const merged: Partial<Record<ApiSourceId, number>> = {
    ...(primary.sourceRanks ?? {}),
  };
  if (secondary.sourceRanks) {
    for (const [src, rank] of Object.entries(secondary.sourceRanks) as Array<[ApiSourceId, number | undefined]>) {
      if (typeof rank === 'number' && rank > 0) {
        const existing = merged[src];
        merged[src] = typeof existing === 'number' ? Math.min(existing, rank) : rank;
      }
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
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
    publicationType: primary.publicationType || secondary.publicationType,
    isRetracted: Boolean(primary.isRetracted || secondary.isRetracted),
    retractionNoticeUrl: primary.retractionNoticeUrl || secondary.retractionNoticeUrl,
    sources: mergeSourceIds(primary, secondary),
    sourceRanks: mergeSourceRanks(primary, secondary),
  };
}

interface IndexedRecord {
  paper: NormalizedPaper;
  firstIdx: number;
  constituents: NormalizedPaper[];
  ruleMatched?: MergeRuleMatched;
  similarityScore?: number;
}

export function makePairKey(idA: string, idB: string): string {
  return idA <= idB ? `${idA}::${idB}` : `${idB}::${idA}`;
}

function hasSplitConflict(
  a: IndexedRecord,
  b: IndexedRecord,
  splitSet: Set<string>
): boolean {
  if (splitSet.size === 0) return false;
  for (const cA of a.constituents) {
    for (const cB of b.constituents) {
      if (splitSet.has(makePairKey(cA.id, cB.id))) {
        return true;
      }
    }
  }
  return false;
}

function combineIndexedRecords(
  primary: IndexedRecord,
  secondary: IndexedRecord,
  rule: MergeRuleMatched,
  score: number
): IndexedRecord {
  return {
    paper: mergePaperRecords(primary.paper, secondary.paper),
    firstIdx: Math.min(primary.firstIdx, secondary.firstIdx),
    constituents: [...primary.constituents, ...secondary.constituents],
    ruleMatched: primary.ruleMatched ?? rule,
    similarityScore:
      primary.similarityScore !== undefined
        ? Math.min(primary.similarityScore, score)
        : score,
  };
}

/**
 * Multi-criteria deterministic deduplication engine for academic records.
 * Preserves first-seen insertion order so incremental/streaming arrivals enrich in-place
 * without reordering already rendered results, while retaining merge clusters for audit.
 */
export function deduplicatePapersAdvanced(
  papers: NormalizedPaper[],
  overrides?: DedupOverrideRule
): {
  papers: NormalizedPaper[];
  summary: DeduplicationSummary;
  mergeClusters: MergeClusterEntry[];
} {
  const originalCount = papers.length;
  if (originalCount <= 1) {
    return {
      papers: papers.map((p) => ({
        ...p,
        sources: p.sources?.length ? p.sources : [p.source],
      })),
      summary: {
        originalCount,
        uniqueCount: originalCount,
        duplicatesRemoved: 0,
        mergedByDoi: 0,
        mergedByPmidOrArxiv: 0,
        mergedByFuzzyTitle: 0,
      },
      mergeClusters: [],
    };
  }

  const splitSet = new Set<string>(overrides?.splitPairs ?? []);
  let mergedByDoi = 0;
  let mergedByPmidOrArxiv = 0;
  let mergedByFuzzyTitle = 0;

  // Step 1: Group by exact Canonical DOI while retaining earliest arrival index
  const doiBuckets = new Map<string, IndexedRecord[]>();
  const nonDoiPapers: IndexedRecord[] = [];

  papers.forEach((rawPaper, idx) => {
    const normalizedPaper: NormalizedPaper = {
      ...rawPaper,
      sources: rawPaper.sources?.length ? [...rawPaper.sources] : [rawPaper.source],
      sourceRanks: rawPaper.sourceRanks ? { ...rawPaper.sourceRanks } : undefined,
    };
    const cleanDoi = normalizeDoi(normalizedPaper.doi);
    const candidate: IndexedRecord = {
      paper: cleanDoi ? { ...normalizedPaper, doi: cleanDoi } : normalizedPaper,
      firstIdx: idx,
      constituents: [normalizedPaper],
    };

    if (cleanDoi) {
      const bucket = doiBuckets.get(cleanDoi) ?? [];
      const targetIdx = bucket.findIndex((rec) => !hasSplitConflict(rec, candidate, splitSet));
      if (targetIdx >= 0) {
        bucket[targetIdx] = combineIndexedRecords(bucket[targetIdx], candidate, 'doi', 1.0);
        mergedByDoi++;
      } else {
        bucket.push(candidate);
      }
      doiBuckets.set(cleanDoi, bucket);
    } else {
      nonDoiPapers.push(candidate);
    }
  });

  // Intermediate list after DOI dedup, restored to arrival order
  const phase1List: IndexedRecord[] = [
    ...Array.from(doiBuckets.values()).flat(),
    ...nonDoiPapers,
  ].sort((a, b) => a.firstIdx - b.firstIdx);

  // Step 2: Group by secondary exact persistent IDs (arXiv ID or PMID)
  const idBuckets = new Map<string, IndexedRecord[]>();
  const remainingPapers: IndexedRecord[] = [];

  for (const item of phase1List) {
    const arxivId = extractArxivId(item.paper.url) || extractArxivId(item.paper.id);
    const pmid = extractPmid(item.paper.url) || extractPmid(item.paper.id);
    const persistentKey = arxivId ? `arxiv:${arxivId}` : pmid ? `pmid:${pmid}` : null;

    if (persistentKey) {
      const bucket = idBuckets.get(persistentKey) ?? [];
      const targetIdx = bucket.findIndex((rec) => !hasSplitConflict(rec, item, splitSet));
      if (targetIdx >= 0) {
        bucket[targetIdx] = combineIndexedRecords(bucket[targetIdx], item, 'pmid-arxiv', 1.0);
        mergedByPmidOrArxiv++;
      } else {
        bucket.push(item);
      }
      idBuckets.set(persistentKey, bucket);
    } else {
      remainingPapers.push(item);
    }
  }

  // Intermediate list after persistent ID dedup, restored to arrival order
  const candidates: IndexedRecord[] = [
    ...Array.from(idBuckets.values()).flat(),
    ...remainingPapers,
  ].sort((a, b) => a.firstIdx - b.firstIdx);

  // Step 3: Fuzzy title + First Author + Year matching (preserving earliest index order)
  const finalRecords: IndexedRecord[] = [];
  const processedIndices = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (processedIndices.has(i)) continue;

    let current = candidates[i];
    const currentNormTitle = normalizeTitleForComparison(current.paper.title);
    const currentAuthor = getFirstAuthorSurname(current.paper.authors);

    for (let j = i + 1; j < candidates.length; j++) {
      if (processedIndices.has(j)) continue;

      const compare = candidates[j];
      if (hasSplitConflict(current, compare, splitSet)) continue;

      const compareNormTitle = normalizeTitleForComparison(compare.paper.title);

      // Fast preliminary length check: if length difference > 35%, skip
      const lenDiff = Math.abs(currentNormTitle.length - compareNormTitle.length);
      const maxLen = Math.max(currentNormTitle.length, compareNormTitle.length);
      if (maxLen > 0 && lenDiff / maxLen > 0.35) continue;

      // Jaro-Winkler similarity calculation
      const similarity = jaroWinklerSimilarity(currentNormTitle, compareNormTitle);

      if (similarity >= 0.90) {
        // Confirm with Year tolerance (+/- 1 year) or Author match
        const yearDiff =
          current.paper.year && compare.paper.year
            ? Math.abs(current.paper.year - compare.paper.year)
            : 0;
        const compareAuthor = getFirstAuthorSurname(compare.paper.authors);
        const authorMatches =
          !currentAuthor || !compareAuthor || currentAuthor === compareAuthor;

        if (yearDiff <= 1 && authorMatches) {
          current = combineIndexedRecords(current, compare, 'fuzzy-title', similarity);
          processedIndices.add(j);
          mergedByFuzzyTitle++;
        }
      }
    }

    finalRecords.push(current);
    processedIndices.add(i);
  }

  const finalUniqueList = finalRecords.map((r) => r.paper);
  const mergeClusters: MergeClusterEntry[] = finalRecords
    .filter((r) => r.constituents.length > 1)
    .map((r) => ({
      clusterId: `cluster-${r.paper.id}`,
      mergedPaperId: r.paper.id,
      ruleMatched: r.ruleMatched ?? 'doi',
      similarityScore: Number((r.similarityScore ?? 1.0).toFixed(4)),
      constituents: r.constituents,
    }));

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
    mergeClusters,
  };
}

export interface LibraryDiffResult {
  unseen: NormalizedPaper[];
  matched: Array<{ paper: NormalizedPaper; existingItem: SavedPaperItem }>;
}

/**
 * Partitions search results into unseen papers and papers already present
 * in the active saved library (Living Review Diff).
 */
export function partitionResultsAgainstLibrary(
  results: NormalizedPaper[],
  savedItems: SavedPaperItem[]
): LibraryDiffResult {
  if (results.length === 0 || savedItems.length === 0) {
    return { unseen: [...results], matched: [] };
  }

  const savedById = new Map<string, SavedPaperItem>();
  const savedByDoi = new Map<string, SavedPaperItem>();
  const savedByPersistentId = new Map<string, SavedPaperItem>();
  const savedFuzzyEntries: Array<{
    normTitle: string;
    authorSurname: string;
    year: number | null;
    item: SavedPaperItem;
  }> = [];

  for (const item of savedItems) {
    savedById.set(item.id, item);
    const cleanDoi = normalizeDoi(item.doi);
    if (cleanDoi && !savedByDoi.has(cleanDoi)) {
      savedByDoi.set(cleanDoi, item);
    }
    const arxivId = extractArxivId(item.url) || extractArxivId(item.id);
    const pmid = extractPmid(item.url) || extractPmid(item.id);
    if (arxivId && !savedByPersistentId.has(`arxiv:${arxivId}`)) {
      savedByPersistentId.set(`arxiv:${arxivId}`, item);
    }
    if (pmid && !savedByPersistentId.has(`pmid:${pmid}`)) {
      savedByPersistentId.set(`pmid:${pmid}`, item);
    }
    const normTitle = normalizeTitleForComparison(item.title);
    if (normTitle) {
      savedFuzzyEntries.push({
        normTitle,
        authorSurname: getFirstAuthorSurname(item.authors),
        year: item.year,
        item,
      });
    }
  }

  const unseen: NormalizedPaper[] = [];
  const matched: Array<{ paper: NormalizedPaper; existingItem: SavedPaperItem }> = [];

  for (const paper of results) {
    let existing = savedById.get(paper.id);
    if (!existing) {
      const cleanDoi = normalizeDoi(paper.doi);
      if (cleanDoi) existing = savedByDoi.get(cleanDoi);
    }
    if (!existing) {
      const arxivId = extractArxivId(paper.url) || extractArxivId(paper.id);
      const pmid = extractPmid(paper.url) || extractPmid(paper.id);
      if (arxivId) existing = savedByPersistentId.get(`arxiv:${arxivId}`);
      if (!existing && pmid) existing = savedByPersistentId.get(`pmid:${pmid}`);
    }
    if (!existing) {
      const paperNormTitle = normalizeTitleForComparison(paper.title);
      const paperAuthor = getFirstAuthorSurname(paper.authors);
      for (const entry of savedFuzzyEntries) {
        const lenDiff = Math.abs(paperNormTitle.length - entry.normTitle.length);
        const maxLen = Math.max(paperNormTitle.length, entry.normTitle.length);
        if (maxLen > 0 && lenDiff / maxLen > 0.35) continue;
        if (jaroWinklerSimilarity(paperNormTitle, entry.normTitle) >= 0.90) {
          const yearDiff = paper.year && entry.year ? Math.abs(paper.year - entry.year) : 0;
          const authorMatches =
            !paperAuthor || !entry.authorSurname || paperAuthor === entry.authorSurname;
          if (yearDiff <= 1 && authorMatches) {
            existing = entry.item;
            break;
          }
        }
      }
    }

    if (existing) {
      matched.push({ paper, existingItem: existing });
    } else {
      unseen.push(paper);
    }
  }

  return { unseen, matched };
}

