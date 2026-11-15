import {
  ApiSourceId,
  NormalizedPaper,
  RankedPaperResult,
  RelevanceBreakdown,
} from '../types/academic';
import { API_SOURCE_AUTHORITY_WEIGHTS } from '../data/apiSources';
import { detectStudyDesign } from './abstractParser';
import { extractGlossaryEnglishEquivalents } from './queryBuilder';

export interface RelevanceRankingOptions {
  /** Reference year for age-normalized citation velocity and recency decay (defaults to current year). */
  referenceYear?: number;
}

export interface ParsedRelevanceQuery {
  raw: string;
  positivePhrases: string[];
  positiveTerms: string[];
  excludedPhrases: string[];
  excludedTerms: string[];
  synonymPhrases: string[];
  synonymTerms: string[];
  contiguousQueryPhrase: string | null;
}

const RRF_K = 60;
const AVG_TITLE_LEN = 11;
const AVG_ABSTRACT_LEN = 160;
const BM25_K1 = 1.2;
const BM25_B_TITLE = 0.5;
const BM25_B_ABSTRACT = 0.35;
const RECENCY_TAU_YEARS = 8;

const WEIGHT_LEXICAL = 0.45;
const WEIGHT_CONSENSUS = 0.25;
const WEIGHT_IMPACT_RECENCY = 0.20;
const WEIGHT_QUALITY_ACCESS = 0.10;

const SOURCE_AUTHORITY_WEIGHT: Record<ApiSourceId, number> = API_SOURCE_AUTHORITY_WEIGHTS;

const STOP_WORDS = new Set([
  // English
  'a', 'an', 'the', 'and', 'or', 'not', 'of', 'in', 'on', 'for', 'to', 'with',
  'by', 'from', 'as', 'at', 'is', 'are', 'was', 'were', 'be', 'been', 'into',
  'via', 'using', 'based', 'between', 'among', 'about', 'under', 'over',
  // Portuguese
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das',
  'dos', 'e', 'ou', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com',
  'sem', 'sobre', 'entre', 'que', 'como', 'nao',
  // Spanish & French common connectors
  'el', 'la', 'los', 'las', 'del', 'con', 'y', 'en', 'un', 'une', 'des', 'du',
  'le', 'les', 'et', 'dans', 'pour', 'avec', 'sur',
]);

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function normalizeAcademicText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lightAcademicStem(token: string): string {
  if (token.length < 5) return token;
  if (token.endsWith('ies') && token.length > 5) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('oes') && token.length > 5) {
    return `${token.slice(0, -3)}ao`;
  }
  if (token.endsWith('es') && token.length > 5 && !token.endsWith('ses')) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('is') && !token.endsWith('us')) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenizeNormalized(normalizedText: string): string[] {
  if (!normalizedText) return [];
  return normalizedText.split(' ').filter(Boolean);
}

function extractTokensFromText(rawText: string, keepStopWordsFallback = false): string[] {
  const norm = normalizeAcademicText(rawText);
  const rawTokens = tokenizeNormalized(norm);
  const filtered = rawTokens.filter((tok) => tok.length >= 2 && !STOP_WORDS.has(tok));
  if (filtered.length > 0 || !keepStopWordsFallback) {
    return filtered;
  }
  return rawTokens.filter((tok) => tok.length >= 2);
}

/**
 * Parses a scientific search query supporting Boolean operators (AND, OR, NOT),
 * negated terms (-term / NOT term), quoted exact phrases, and PT->EN glossary synonyms.
 */
export function parseRelevanceQuery(rawQuery: string): ParsedRelevanceQuery {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return {
      raw: '',
      positivePhrases: [],
      positiveTerms: [],
      excludedPhrases: [],
      excludedTerms: [],
      synonymPhrases: [],
      synonymTerms: [],
      contiguousQueryPhrase: null,
    };
  }

  const positivePhrases: string[] = [];
  const excludedPhrases: string[] = [];
  const excludedTerms: string[] = [];

  // 1. Extract explicit NOT "phrase" or -"phrase"
  let remaining = trimmed.replace(
    /(?:^|\s)(?:NOT\s+|-)["“]([^"”]+)["”]/gi,
    (_m, phrase: string) => {
      const norm = normalizeAcademicText(phrase);
      if (norm) excludedPhrases.push(norm);
      return ' ';
    }
  );

  // 2. Extract positive quoted phrases
  remaining = remaining.replace(/["“]([^"”]+)["”]/g, (_m, phrase: string) => {
    const norm = normalizeAcademicText(phrase);
    if (norm) positivePhrases.push(norm);
    return ' ';
  });

  // 3. Extract explicit NOT term or -term
  remaining = remaining.replace(/(?:^|\s)(?:NOT\s+|-)([^\s()]+)/gi, (_m, term: string) => {
    const clean = normalizeAcademicText(term);
    if (clean && !STOP_WORDS.has(clean)) {
      excludedTerms.push(clean);
    }
    return ' ';
  });

  // 4. Strip Boolean operators and parentheses for positive term extraction
  const positiveText = remaining
    .replace(/[()]/g, ' ')
    .replace(/\b(?:AND|OR|NOT)\b/g, ' ');

  const termSet = new Set<string>();
  for (const tok of extractTokensFromText(positiveText, true)) {
    termSet.add(tok);
  }
  // Ensure terms inside positive quoted phrases also contribute to term coverage
  for (const phrase of positivePhrases) {
    for (const tok of extractTokensFromText(phrase, true)) {
      termSet.add(tok);
    }
  }
  const positiveTerms = Array.from(termSet);

  // 5. Deterministic PT->EN glossary equivalents for cross-lingual queries
  const eqPhrases = extractGlossaryEnglishEquivalents(trimmed)
    .map((p) => normalizeAcademicText(p))
    .filter(Boolean);
  const synPhraseSet = new Set(eqPhrases);
  const synTermSet = new Set<string>();
  for (const p of eqPhrases) {
    for (const tok of extractTokensFromText(p, false)) {
      if (!termSet.has(tok)) {
        synTermSet.add(tok);
      }
    }
  }

  // Contiguous multi-word sequence when user writes an unquoted natural phrase
  const cleanContiguous = normalizeAcademicText(positiveText);
  const contiguousQueryPhrase =
    cleanContiguous.includes(' ') && positivePhrases.length === 0 ? cleanContiguous : null;

  return {
    raw: trimmed,
    positivePhrases: Array.from(new Set(positivePhrases)),
    positiveTerms,
    excludedPhrases: Array.from(new Set(excludedPhrases)),
    excludedTerms: Array.from(new Set(excludedTerms)),
    synonymPhrases: Array.from(synPhraseSet),
    synonymTerms: Array.from(synTermSet),
    contiguousQueryPhrase,
  };
}

function buildFrequencyMaps(tokens: string[]): {
  exact: Map<string, number>;
  stemmed: Map<string, number>;
} {
  const exact = new Map<string, number>();
  const stemmed = new Map<string, number>();
  for (const tok of tokens) {
    exact.set(tok, (exact.get(tok) ?? 0) + 1);
    const stem = lightAcademicStem(tok);
    stemmed.set(stem, (stemmed.get(stem) ?? 0) + 1);
  }
  return { exact, stemmed };
}

function countTermOccurrences(
  term: string,
  maps: { exact: Map<string, number>; stemmed: Map<string, number> }
): number {
  const exactCount = maps.exact.get(term) ?? 0;
  if (exactCount > 0) return exactCount;
  const stem = lightAcademicStem(term);
  // Stem fallback weighted at 0.85 so exact lexical match always wins ties
  return (maps.stemmed.get(stem) ?? 0) * 0.85;
}

function containsWholeTerm(normalizedHaystack: string, term: string): boolean {
  if (!normalizedHaystack || !term) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(normalizedHaystack);
}

function computeLexicalMetrics(
  paper: NormalizedPaper,
  parsed: ParsedRelevanceQuery
): {
  lexicalScore: number;
  matchedTermsCount: number;
  totalQueryTerms: number;
  hasExactPhraseMatch: boolean;
  hasExcludedTermHit: boolean;
  exclusionPenalty: number;
} {
  const normTitle = normalizeAcademicText(paper.title || '');
  const normAbstract = normalizeAcademicText(paper.abstractText || '');
  const normVenue = normalizeAcademicText(paper.venue || '');

  // Check NOT exclusions first
  let exclusionPenalty = 0;
  for (const exPhrase of parsed.excludedPhrases) {
    if (normTitle.includes(exPhrase)) {
      exclusionPenalty = Math.max(exclusionPenalty, 0.6);
    } else if (normAbstract.includes(exPhrase)) {
      exclusionPenalty = Math.max(exclusionPenalty, 0.3);
    }
  }
  for (const exTerm of parsed.excludedTerms) {
    if (containsWholeTerm(normTitle, exTerm)) {
      exclusionPenalty = Math.max(exclusionPenalty, 0.55);
    } else if (containsWholeTerm(normAbstract, exTerm)) {
      exclusionPenalty = Math.max(exclusionPenalty, 0.25);
    }
  }
  const hasExcludedTermHit = exclusionPenalty > 0;

  const totalQueryTerms = parsed.positiveTerms.length;
  if (totalQueryTerms === 0 && parsed.positivePhrases.length === 0) {
    return {
      lexicalScore: 0.5,
      matchedTermsCount: 0,
      totalQueryTerms: 0,
      hasExactPhraseMatch: false,
      hasExcludedTermHit,
      exclusionPenalty,
    };
  }

  const titleTokens = tokenizeNormalized(normTitle);
  const abstractTokens = tokenizeNormalized(normAbstract);
  const venueTokens = tokenizeNormalized(normVenue);

  const titleMaps = buildFrequencyMaps(titleTokens);
  const abstractMaps = buildFrequencyMaps(abstractTokens);
  const venueMaps = buildFrequencyMaps(venueTokens);

  const titleNormFactor =
    1 - BM25_B_TITLE + BM25_B_TITLE * (Math.max(1, titleTokens.length) / AVG_TITLE_LEN);
  const abstractNormFactor =
    1 -
    BM25_B_ABSTRACT +
    BM25_B_ABSTRACT * (Math.max(1, abstractTokens.length) / AVG_ABSTRACT_LEN);

  // Maximum theoretical saturated BM25F contribution per term (when strongly matched in title)
  const maxTermBm25 = ((3.0 + 1.0) * (BM25_K1 + 1)) / (3.0 + 1.0 + BM25_K1);

  let titleMatchedCount = 0;
  let anyMatchedCount = 0;
  let bm25Sum = 0;

  for (const term of parsed.positiveTerms) {
    const tfTitle = countTermOccurrences(term, titleMaps);
    const tfAbstract = countTermOccurrences(term, abstractMaps);
    const tfVenue = countTermOccurrences(term, venueMaps);

    if (tfTitle > 0) titleMatchedCount += 1;
    if (tfTitle > 0 || tfAbstract > 0) anyMatchedCount += 1;

    const weightedTf =
      3.0 * (tfTitle / titleNormFactor) +
      1.0 * (tfAbstract / abstractNormFactor) +
      (tfVenue > 0 ? 0.35 : 0);

    if (weightedTf > 0) {
      bm25Sum += (weightedTf * (BM25_K1 + 1)) / (weightedTf + BM25_K1);
    }
  }

  const titleCoverage = totalQueryTerms > 0 ? titleMatchedCount / totalQueryTerms : 0;
  const fullCoverage = totalQueryTerms > 0 ? anyMatchedCount / totalQueryTerms : 0;
  const bm25Normalized =
    totalQueryTerms > 0 ? clamp(bm25Sum / (totalQueryTerms * maxTermBm25), 0, 1) : 0;

  // Phrase proximity / exact phrase bonus
  let hasExactPhraseMatch = false;
  let phraseBonus = 0;

  if (parsed.positivePhrases.length > 0) {
    let phraseHits = 0;
    for (const phrase of parsed.positivePhrases) {
      if (normTitle.includes(phrase)) {
        phraseHits += 1;
        hasExactPhraseMatch = true;
      } else if (normAbstract.includes(phrase)) {
        phraseHits += 0.55;
        hasExactPhraseMatch = true;
      }
    }
    phraseBonus = clamp((phraseHits / parsed.positivePhrases.length) * 0.16, 0, 0.16);
  } else if (parsed.contiguousQueryPhrase) {
    if (normTitle.includes(parsed.contiguousQueryPhrase)) {
      phraseBonus = 0.12;
      hasExactPhraseMatch = true;
    } else if (normAbstract.includes(parsed.contiguousQueryPhrase)) {
      phraseBonus = 0.05;
      hasExactPhraseMatch = true;
    }
  }

  let baseLexical =
    0.46 * titleCoverage + 0.27 * fullCoverage + 0.15 * bm25Normalized + phraseBonus;

  // Cross-lingual PT->EN glossary bridge when direct query didn't fully cover English abstracts
  if (parsed.synonymTerms.length > 0 && baseLexical < 0.75) {
    let synTitleHits = 0;
    let synAnyHits = 0;
    for (const sTerm of parsed.synonymTerms) {
      const tfT = countTermOccurrences(sTerm, titleMaps);
      const tfA = countTermOccurrences(sTerm, abstractMaps);
      if (tfT > 0) synTitleHits += 1;
      if (tfT > 0 || tfA > 0) synAnyHits += 1;
    }
    const synPhraseHit = parsed.synonymPhrases.some(
      (p) => normTitle.includes(p) || normAbstract.includes(p)
    );
    const synCoverage =
      0.5 * (synTitleHits / parsed.synonymTerms.length) +
      0.3 * (synAnyHits / parsed.synonymTerms.length) +
      (synPhraseHit ? 0.2 : 0);
    baseLexical = Math.max(baseLexical, synCoverage * 0.78);
  }

  return {
    lexicalScore: clamp(baseLexical, 0, 1),
    matchedTermsCount: anyMatchedCount,
    totalQueryTerms,
    hasExactPhraseMatch,
    hasExcludedTermHit,
    exclusionPenalty,
  };
}

/**
 * Computes Reciprocal Rank Fusion (RRF, k=60) + multi-database corroboration score.
 */
function computeConsensusMetrics(paper: NormalizedPaper): {
  consensusScore: number;
  sourcesCount: number;
} {
  const sourcesList =
    paper.sources && paper.sources.length > 0 ? paper.sources : [paper.source];
  const uniqueSources = Array.from(new Set(sourcesList));
  const sourcesCount = uniqueSources.length;

  let rrfSum = 0;
  for (const srcId of uniqueSources) {
    const rank = paper.sourceRanks?.[srcId] ?? 10;
    const authority = SOURCE_AUTHORITY_WEIGHT[srcId] ?? 1.0;
    rrfSum += authority / (RRF_K + Math.max(1, rank));
  }

  // Smooth saturation calibrated so 1 source @ #1 ≈ 0.42, 3 sources near top ≈ 0.68, 5+ ≈ 0.78
  const rrfNormalized = rrfSum / (rrfSum + 0.025);
  const corroborationBonus = Math.min(0.22, Math.max(0, sourcesCount - 1) * 0.08);

  return {
    consensusScore: clamp(rrfNormalized + corroborationBonus, 0, 1),
    sourcesCount,
  };
}

/**
 * Computes time-normalized citation velocity and recency decay, preventing
 * the citation Matthew Effect from burying recent papers.
 */
function computeImpactRecencyMetrics(
  paper: NormalizedPaper,
  referenceYear: number
): {
  impactRecencyScore: number;
  citationVelocity: number;
} {
  const citations = Math.max(0, paper.citationCount || 0);

  if (!paper.year || paper.year < 1800 || paper.year > referenceYear + 1) {
    const fallbackImpact = Math.min(
      1,
      Math.log10(1 + citations) / Math.log10(1 + 5000)
    );
    return {
      impactRecencyScore: citations > 0 ? 0.25 + 0.55 * fallbackImpact : 0.15,
      citationVelocity: 0,
    };
  }

  const yearsOld = Math.max(0, referenceYear - paper.year);
  const ageYears = Math.max(1, yearsOld + 1);
  const citationVelocity = citations / ageYears;

  const velocityNorm = Math.min(
    1,
    Math.log10(1 + citationVelocity * 4) / Math.log10(1 + 200 * 4)
  );
  const totalNorm = Math.min(
    1,
    Math.log10(1 + citations) / Math.log10(1 + 5000)
  );
  const impactSub = 0.65 * velocityNorm + 0.35 * totalNorm;
  const recencySub = Math.exp(-yearsOld / RECENCY_TAU_YEARS);

  // Freshness lag protection: papers <= 1 year old rarely have accumulated citations yet
  const score =
    yearsOld <= 1 && citations === 0
      ? 0.75 * recencySub + 0.25 * impactSub
      : 0.55 * impactSub + 0.45 * recencySub;

  return {
    impactRecencyScore: clamp(score, 0, 1),
    citationVelocity: Math.round(citationVelocity * 10) / 10,
  };
}

/**
 * Computes evidence hierarchy, metadata completeness, and Open Access utility.
 */
function computeQualityAccessScore(paper: NormalizedPaper): number {
  const studyDesign = detectStudyDesign(
    paper.title,
    paper.abstractText,
    paper.publicationType
  );
  const pubType = (paper.publicationType || '').toLowerCase();

  let evidenceSub = 0.18;
  if (studyDesign?.includes('Revisão Sistemática')) {
    evidenceSub = 0.45;
  } else if (studyDesign?.includes('Ensaio Clínico Randomizado')) {
    evidenceSub = 0.4;
  } else if (studyDesign) {
    evidenceSub = 0.28;
  } else if (pubType.includes('article') || pubType.includes('review')) {
    evidenceSub = 0.22;
  } else if (
    pubType.includes('preprint') ||
    pubType.includes('dataset') ||
    paper.source === 'figshare' ||
    paper.source === 'datacite'
  ) {
    evidenceSub = 0.1;
  }

  const abstractLen = paper.abstractText?.trim().length ?? 0;
  let completenessSub = 0;
  if (abstractLen >= 120) completenessSub += 0.18;
  else if (abstractLen >= 30) completenessSub += 0.1;
  if (paper.doi) completenessSub += 0.1;
  if (paper.authors.length > 0) completenessSub += 0.07;

  const oaSub = paper.pdfUrl ? 0.2 : paper.isOpenAccess ? 0.12 : 0;

  return clamp(evidenceSub + completenessSub + oaSub, 0, 1);
}

/**
 * Computes the multi-signal relevance breakdown (0-100) for a single paper against a parsed query.
 */
export function scorePaperWithParsedQuery(
  paper: NormalizedPaper,
  parsedQuery: ParsedRelevanceQuery,
  options: RelevanceRankingOptions = {}
): RelevanceBreakdown {
  const referenceYear = options.referenceYear ?? new Date().getFullYear();

  const lexical = computeLexicalMetrics(paper, parsedQuery);
  const consensus = computeConsensusMetrics(paper);
  const impact = computeImpactRecencyMetrics(paper, referenceYear);
  const qualityAccessScore = computeQualityAccessScore(paper);

  const hasPositiveCriteria =
    parsedQuery.positiveTerms.length > 0 || parsedQuery.positivePhrases.length > 0;

  // Topical gate: off-topic highly cited papers cannot outrank on-topic matches
  const topicalGate = hasPositiveCriteria
    ? 0.25 + 0.75 * Math.min(1, lexical.lexicalScore / 0.35)
    : 1;

  const nonLexicalWeighted =
    WEIGHT_CONSENSUS * consensus.consensusScore +
    WEIGHT_IMPACT_RECENCY * impact.impactRecencyScore +
    WEIGHT_QUALITY_ACCESS * qualityAccessScore;

  let rawCombined = WEIGHT_LEXICAL * lexical.lexicalScore + topicalGate * nonLexicalWeighted;
  if (lexical.exclusionPenalty > 0) {
    rawCombined *= 1 - lexical.exclusionPenalty;
  }

  return {
    totalScore: Math.round(clamp(rawCombined * 100, 0, 100) * 10) / 10,
    lexicalScore: Math.round(lexical.lexicalScore * 100),
    consensusScore: Math.round(consensus.consensusScore * 100),
    impactRecencyScore: Math.round(impact.impactRecencyScore * 100),
    qualityAccessScore: Math.round(qualityAccessScore * 100),
    matchedTermsCount: lexical.matchedTermsCount,
    totalQueryTerms: lexical.totalQueryTerms,
    citationVelocity: impact.citationVelocity,
    sourcesCount: consensus.sourcesCount,
    hasExactPhraseMatch: lexical.hasExactPhraseMatch,
    hasExcludedTermHit: lexical.hasExcludedTermHit,
  };
}

/**
 * Computes the relevance breakdown for a paper given a raw search query string.
 */
export function computePaperRelevance(
  paper: NormalizedPaper,
  query: string,
  options: RelevanceRankingOptions = {}
): RelevanceBreakdown {
  const parsed = parseRelevanceQuery(query);
  return scorePaperWithParsedQuery(paper, parsed, options);
}

/**
 * Ranks a list of papers deterministically by composite scientific relevance.
 */
export function rankPapersByRelevance(
  papers: NormalizedPaper[],
  query: string,
  options: RelevanceRankingOptions = {}
): RankedPaperResult[] {
  const parsed = parseRelevanceQuery(query);
  const indexed = papers.map((paper, originalIdx) => ({
    paper,
    breakdown: scorePaperWithParsedQuery(paper, parsed, options),
    originalIdx,
  }));

  indexed.sort((a, b) => {
    if (b.breakdown.totalScore !== a.breakdown.totalScore) {
      return b.breakdown.totalScore - a.breakdown.totalScore;
    }
    if (b.breakdown.lexicalScore !== a.breakdown.lexicalScore) {
      return b.breakdown.lexicalScore - a.breakdown.lexicalScore;
    }
    if (b.paper.citationCount !== a.paper.citationCount) {
      return b.paper.citationCount - a.paper.citationCount;
    }
    const yearDiff = (b.paper.year || 0) - (a.paper.year || 0);
    if (yearDiff !== 0) return yearDiff;
    return a.originalIdx - b.originalIdx;
  });

  return indexed.map(({ paper, breakdown }) => ({ paper, breakdown }));
}
