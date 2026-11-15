import { BooleanQueryState } from '../types/academic';

export type PicoFramework = 'pico' | 'peco' | 'pcc';

export interface PicoQueryFields {
  framework: PicoFramework;
  population: string;
  interventionOrExposure: string;
  comparison: string;
  outcomeOrContext: string;
}

export type QueryDialect = 'generic' | 'pubmed' | 'scopus' | 'wos' | 'arxiv' | 'ieee';

function splitSynonymousBlock(raw: string): string {
  const tokens = raw
    .split(/[;,]|\bOR\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length === 0) return '';
  if (tokens.length === 1) {
    return tokens[0].includes(' ') ? `"${tokens[0].replace(/^"+|"+$/g, '')}"` : tokens[0];
  }
  const formatted = tokens.map((tok) =>
    tok.includes(' ') ? `"${tok.replace(/^"+|"+$/g, '')}"` : tok
  );
  return `(${formatted.join(' OR ')})`;
}

export function compilePicoQuery(fields: PicoQueryFields): string {
  const parts: string[] = [];
  const pBlock = splitSynonymousBlock(fields.population);
  const iBlock = splitSynonymousBlock(fields.interventionOrExposure);
  const cBlock = fields.framework !== 'pcc' ? splitSynonymousBlock(fields.comparison) : '';
  const oBlock = splitSynonymousBlock(fields.outcomeOrContext);

  if (pBlock) parts.push(pBlock);
  if (iBlock) parts.push(iBlock);
  if (cBlock) parts.push(cBlock);
  if (oBlock) parts.push(oBlock);

  return parts.join(' AND ');
}

function wrapTermForDialect(term: string, dialect: QueryDialect): string {
  const clean = term.trim().replace(/^"+|"+$/g, '');
  if (!clean) return '';
  const quoted = clean.includes(' ') ? `"${clean}"` : clean;
  switch (dialect) {
    case 'pubmed':
      return `${quoted}[Title/Abstract]`;
    case 'arxiv':
      return `(ti:${quoted} OR abs:${quoted})`;
    case 'ieee':
      return `"Document Title":${quoted}`;
    case 'wos':
    case 'scopus':
    case 'generic':
    default:
      return quoted;
  }
}

export function translateQueryToDialect(
  state: BooleanQueryState,
  dialect: QueryDialect,
  rawQueryOverride?: string
): string {
  const baseQuery = rawQueryOverride?.trim() || compileBooleanQuery(state);
  if (!baseQuery && !state.mainConcept.trim() && !state.exactPhrase.trim()) return '';
  if (dialect === 'generic') return baseQuery;

  const positiveGroups: string[] = [];
  if (state.mainConcept.trim()) {
    positiveGroups.push(wrapTermForDialect(state.mainConcept.trim(), dialect));
  }
  if (state.exactPhrase.trim()) {
    positiveGroups.push(wrapTermForDialect(state.exactPhrase.trim(), dialect));
  }
  if (state.andTerms.trim()) {
    state.andTerms
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => positiveGroups.push(wrapTermForDialect(t, dialect)));
  }
  if (state.orTerms.trim()) {
    const orList = state.orTerms
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => wrapTermForDialect(t, dialect));
    if (orList.length > 0) {
      positiveGroups.push(`(${orList.join(' OR ')})`);
    }
  }

  // Fallback when user typed directly into main search bar instead of structured fields
  if (positiveGroups.length === 0 && baseQuery) {
    positiveGroups.push(wrapTermForDialect(baseQuery, dialect));
  }

  const notTerms = state.notTerms
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => wrapTermForDialect(t, dialect));

  const joinedPos = positiveGroups.join(' AND ');

  if (dialect === 'scopus') {
    const notClause = notTerms.length > 0 ? ` AND NOT (${notTerms.join(' OR ')})` : '';
    const yearClause =
      state.yearFrom && Number(state.yearFrom) > 1900 ? ` AND PUBYEAR > ${Number(state.yearFrom) - 1}` : '';
    return `TITLE-ABS-KEY(${joinedPos})${notClause}${yearClause}`;
  }

  if (dialect === 'wos') {
    const notClause = notTerms.length > 0 ? ` NOT (${notTerms.join(' OR ')})` : '';
    const yearClause =
      state.yearFrom && Number(state.yearFrom) > 1900 ? ` AND PY=(${state.yearFrom}-2026)` : '';
    return `TS=(${joinedPos})${notClause}${yearClause}`;
  }

  if (dialect === 'arxiv') {
    const notClause = notTerms.length > 0 ? ` ANDNOT (${notTerms.join(' OR ')})` : '';
    return `${joinedPos}${notClause}`;
  }

  if (dialect === 'pubmed') {
    const notClause = notTerms.length > 0 ? ` NOT (${notTerms.join(' OR ')})` : '';
    const yearClause =
      state.yearFrom && Number(state.yearFrom) > 1900
        ? ` AND ("${state.yearFrom}/01/01"[Date - Publication] : "3000"[Date - Publication])`
        : '';
    return `(${joinedPos})${notClause}${yearClause}`;
  }

  // IEEE
  const notClause = notTerms.length > 0 ? ` NOT (${notTerms.join(' OR ')})` : '';
  return `${joinedPos}${notClause}`;
}

const ACADEMIC_PT_EN_GLOSSARY: Array<[RegExp, string]> = [
  [/\baprendizado de m[aá]quina\b/gi, 'machine learning'],
  [/\bintelig[eê]ncia artificial\b/gi, 'artificial intelligence'],
  [/\bpol[ií]ticas p[uú]blicas\b/gi, 'public policy'],
  [/\brevis[aã]o sistem[aá]tica\b/gi, 'systematic review'],
  [/\bmeta-an[aá]lise\b/gi, 'meta-analysis'],
  [/\binfer[eê]ncia causal\b/gi, 'causal inference'],
  [/\bsa[uú]de p[uú]blica\b/gi, 'public health'],
  [/\bensaios? cl[ií]nicos? randomizados?\b/gi, 'randomized controlled trial'],
  [/\bprocessamento de linguagem natural\b/gi, 'natural language processing'],
  [/\bredes neurais\b/gi, 'neural networks'],
  [/\bmudancas? clim[aá]ticas?\b/gi, 'climate change'],
  [/\bseguran[cç]a da informa[cç][aã]o\b/gi, 'information security'],
  [/\beduca[cç][aã]o superior\b/gi, 'higher education'],
  [/\bdesenvolvimento sustent[aá]vel\b/gi, 'sustainable development'],
  [/\baten[cç][aã]o prim[aá]ria\b/gi, 'primary health care'],
  [/\bpropriedade intelectual\b/gi, 'intellectual property'],
  [/\bnormas? t[eé]cnicas?\b/gi, 'technical standards'],
  [/\bciberseguran[cç]a\b/gi, 'cybersecurity'],
  [/\bcomputa[cç][aã]o qu[aã]ntica\b/gi, 'quantum computing'],
  [/\benergias? renov[aá]veis\b/gi, 'renewable energy'],
  [/\bbiodiversidade\b/gi, 'biodiversity'],
  [/\bexpress[aã]o g[eê]nica\b/gi, 'gene expression'],
  [/\bci[eê]ncia dos materiais\b/gi, 'materials science'],
];

export function compileBooleanQuery(state: BooleanQueryState): string {
  const parts: string[] = [];

  if (state.mainConcept.trim()) {
    parts.push(state.mainConcept.trim());
  }

  if (state.exactPhrase.trim()) {
    const cleanExact = state.exactPhrase.trim().replace(/^"+|"+$/g, '');
    parts.push(`"${cleanExact}"`);
  }

  if (state.andTerms.trim()) {
    const andList = state.andTerms
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (andList.length > 0) {
      parts.push(andList.map((t) => (t.includes(' ') ? `"${t}"` : t)).join(' AND '));
    }
  }

  if (state.orTerms.trim()) {
    const orList = state.orTerms
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (orList.length === 1) {
      parts.push(orList[0]);
    } else if (orList.length > 1) {
      parts.push(`(${orList.map((t) => (t.includes(' ') ? `"${t}"` : t)).join(' OR ')})`);
    }
  }

  if (state.studyDesign === 'systematic-review') {
    parts.push('("systematic review" OR "meta-analysis")');
  } else if (state.studyDesign === 'rct') {
    parts.push('("randomized controlled trial" OR "clinical trial")');
  } else if (state.studyDesign === 'empirical-causal') {
    parts.push('("causal inference" OR "difference-in-differences" OR "instrumental variables" OR econometric)');
  }

  let compiled = parts.join(' AND ');

  if (state.notTerms.trim()) {
    const notList = state.notTerms
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (notList.length > 0) {
      const notClause = notList.map((t) => `NOT ${t.includes(' ') ? `"${t}"` : t}`).join(' ');
      compiled = compiled ? `${compiled} ${notClause}` : notClause;
    }
  }

  return compiled.trim();
}

export async function translateAcademicQueryPtToEn(queryText: string): Promise<string> {
  const trimmed = queryText.trim();
  if (!trimmed) return '';

  // Try backend /api/translate first, then fall back to deterministic PT-EN glossary
  try {
    const res = await fetch(`/api/translate?q=${encodeURIComponent(trimmed)}&from=pt&to=en`);
    if (res.ok) {
      const data = await res.json();
      if (
        data?.ok &&
        typeof data?.translated === 'string' &&
        data.translated.trim() &&
        data.translated.trim().toLowerCase() !== trimmed.toLowerCase()
      ) {
        return data.translated.trim();
      }
    }
  } catch {
    // Offline or quota-limited glossary fallback
  }

  let fallback = trimmed;
  for (const [pattern, replacement] of ACADEMIC_PT_EN_GLOSSARY) {
    fallback = fallback.replace(pattern, replacement);
  }
  return fallback;
}

/**
 * Returns deterministic English academic equivalents matched from the PT-EN glossary
 * without network calls, allowing cross-lingual relevance scoring.
 */
export function extractGlossaryEnglishEquivalents(queryText: string): string[] {
  const equivalents: string[] = [];
  for (const [pattern, replacement] of ACADEMIC_PT_EN_GLOSSARY) {
    pattern.lastIndex = 0;
    if (pattern.test(queryText)) {
      equivalents.push(replacement);
    }
    pattern.lastIndex = 0;
  }
  return equivalents;
}

