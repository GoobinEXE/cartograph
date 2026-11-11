import { ExtractedPaperMetadata } from '../types/academic';

/**
 * Common headings used in structured academic abstracts (English & Portuguese).
 */
const SECTION_PATTERNS = [
  {
    type: 'objective',
    regex: /(?:^|\n|\.\s+)(?:OBJECTIVE|OBJECTIVES|AIM|AIMS|BACKGROUND|PURPOSE|CONTEXT|INTRODUÇÃO|OBJETIVO|OBJETIVOS):\s*/i,
  },
  {
    type: 'methods',
    regex: /(?:^|\n|\.\s+)(?:METHODS|METHODOLOGY|DESIGN|PARTICIPANTS|STUDY DESIGN|SETTING|INTERVENTIONS|MÉTODOS|METODOLOGIA|DELINEAMENTO|CASUÍSTICA):\s*/i,
  },
  {
    type: 'results',
    regex: /(?:^|\n|\.\s+)(?:RESULTS|FINDINGS|PRINCIPAL FINDINGS|RESULTADOS|ACHADOS):\s*/i,
  },
  {
    type: 'conclusion',
    regex: /(?:^|\n|\.\s+)(?:CONCLUSION|CONCLUSIONS|IMPLICATIONS|CONCLUSÃO|CONCLUSÕES):\s*/i,
  },
];

/**
 * Deterministic regex patterns to extract sample size (N).
 */
const SAMPLE_SIZE_REGEXES = [
  /(?:\b[Nn]\s*=\s*)([0-9]{1,3}(?:[,\.][0-9]{3})*|[0-9]+)/,
  /(?:sample\s+(?:size\s+)?(?:of\s+)?)([0-9]{1,3}(?:[,\.][0-9]{3})*|[0-9]+)\s+(?:participants|patients|subjects|cases|individuals|respondents|students)/i,
  /(?:amostra\s+de\s+)([0-9]{1,3}(?:[,\.][0-9]{3})*|[0-9]+)\s+(?:participantes|pacientes|indivíduos|sujeitos)/i,
  /([0-9]{1,3}(?:[,\.][0-9]{3})*|[0-9]+)\s+(?:patients|participants|subjects|individuals|cases)\s+(?:were\s+(?:enrolled|included|randomized|studied)|participated)/i,
  /([0-9]{1,3}(?:[,\.][0-9]{3})*|[0-9]+)\s+(?:pacientes|participantes|sujeitos)\s+(?:foram\s+(?:incluídos|avaliados|recrutados))/i,
];

/**
 * Deterministic patterns to detect study design.
 */
const STUDY_DESIGN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: 'Ensaio Clínico Randomizado (RCT)',
    regex: /\b(?:randomized controlled trial|randomised controlled trial|RCT|ensaio clínico randomizado|placebo-controlled)\b/i,
  },
  {
    label: 'Revisão Sistemática / Meta-análise',
    regex: /\b(?:systematic review|meta-analysis|meta-analytic|revisão sistemática|metanálise|PRISMA guideline)\b/i,
  },
  {
    label: 'Estudo de Coorte (Prospectivo/Retrospectivo)',
    regex: /\b(?:cohort study|prospective cohort|retrospective cohort|estudo de coorte|longitudinal study)\b/i,
  },
  {
    label: 'Estudo de Caso-Controle',
    regex: /\b(?:case-control study|case control study|estudo de caso-controle)\b/i,
  },
  {
    label: 'Estudo Transversal (Cross-Sectional)',
    regex: /\b(?:cross-sectional study|cross sectional survey|estudo transversal|inquérito populacional)\b/i,
  },
  {
    label: 'Quase-Experimental / Série Temporal',
    regex: /\b(?:quasi-experimental|interrupted time series|difference-in-differences|quase-experimental)\b/i,
  },
  {
    label: 'Estudo Qualitativo',
    regex: /\b(?:qualitative study|grounded theory|phenomenological|estudo qualitativo|entrevistas semiestruturadas)\b/i,
  },
  {
    label: 'Relato ou Série de Casos',
    regex: /\b(?:case report|case series|relato de caso|série de casos)\b/i,
  },
];

/**
 * Extracts sample size (N) deterministically from text.
 */
export function extractSampleSize(text: string): string | undefined {
  for (const regex of SAMPLE_SIZE_REGEXES) {
    const match = text.match(regex);
    if (match) {
      const num = match[1].replace(/\s+/g, '');
      return `N = ${num}`;
    }
  }
  return undefined;
}

/**
 * Detects study design based on title, venue, and abstract text.
 */
export function detectStudyDesign(
  title: string,
  abstractText?: string | null,
  publicationType?: string
): string | undefined {
  const combined = `${title} ${publicationType || ''} ${abstractText || ''}`;
  for (const item of STUDY_DESIGN_PATTERNS) {
    if (item.regex.test(combined)) {
      return item.label;
    }
  }
  return undefined;
}

/**
 * Parses an academic abstract deterministically into structured sections:
 * Objective, Methods, Results, Conclusion, Sample Size, and Study Design.
 */
export function parseAbstractMetadata(
  title: string,
  abstractText?: string | null,
  publicationType?: string
): ExtractedPaperMetadata {
  const studyDesign = detectStudyDesign(title, abstractText, publicationType);

  if (!abstractText || !abstractText.trim()) {
    return {
      studyDesign,
      hasStructuredAbstract: false,
    };
  }

  const text = abstractText.trim();
  const sampleSize = extractSampleSize(text);

  // Find occurrences of section headers
  interface FoundSection {
    type: string;
    index: number;
    headerLength: number;
  }

  const found: FoundSection[] = [];

  for (const sec of SECTION_PATTERNS) {
    const match = text.match(sec.regex);
    if (match && typeof match.index === 'number') {
      found.push({
        type: sec.type,
        index: match.index,
        headerLength: match[0].length,
      });
    }
  }

  // If at least 2 distinct structured headings exist, treat as structured abstract
  if (found.length >= 2) {
    found.sort((a, b) => a.index - b.index);

    const sections: Record<string, string> = {};

    for (let i = 0; i < found.length; i++) {
      const current = found[i];
      const startPos = current.index + current.headerLength;
      const endPos = i < found.length - 1 ? found[i + 1].index : text.length;
      const content = text.slice(startPos, endPos).trim();
      sections[current.type] = content;
    }

    return {
      objective: sections.objective,
      methods: sections.methods,
      sampleSize: sampleSize || (sections.methods ? extractSampleSize(sections.methods) : undefined),
      studyDesign,
      results: sections.results,
      conclusion: sections.conclusion,
      hasStructuredAbstract: true,
    };
  }

  // Non-structured abstract fallback: heuristically extract first sentence as objective, last as conclusion
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let fallbackObjective: string | undefined;
  let fallbackConclusion: string | undefined;

  if (sentences.length >= 3) {
    fallbackObjective = sentences[0];
    fallbackConclusion = sentences[sentences.length - 1];
  } else if (sentences.length > 0) {
    fallbackObjective = sentences[0];
  }

  return {
    objective: fallbackObjective,
    sampleSize,
    studyDesign,
    conclusion: fallbackConclusion,
    hasStructuredAbstract: false,
  };
}

