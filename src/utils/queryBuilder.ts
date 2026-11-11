import { BooleanQueryState } from '../types/academic';

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

  // Try local bridge first, then fallback to direct API or glossary
  try {
    const res = await fetch(`/api/translate?q=${encodeURIComponent(trimmed)}&from=pt&to=en`);
    if (res.ok) {
      const data = await res.json();
      if (data?.translated && typeof data.translated === 'string') {
        return data.translated;
      }
    }
  } catch {
    // Fallback to direct MyMemory CORS request
  }

  try {
    const directRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=pt|en`
    );
    if (directRes.ok) {
      const data = await directRes.json();
      const candidate = data?.responseData?.translatedText;
      if (candidate && typeof candidate === 'string') {
        return candidate;
      }
    }
  } catch {
    // Offline glossary fallback
  }

  let fallback = trimmed;
  for (const [pattern, replacement] of ACADEMIC_PT_EN_GLOSSARY) {
    fallback = fallback.replace(pattern, replacement);
  }
  return fallback;
}

