import { SupportedLanguage } from '../i18n/translations';
import {
  QualityAppraisalResult,
  QualityRating,
  QualityToolId,
} from '../types/academic';

export interface QualityCriterionDefinition {
  id: string;
  labelPt: string;
  labelEn: string;
}

export interface QualityChecklistDefinition {
  id: QualityToolId;
  titlePt: string;
  titleEn: string;
  criteria: QualityCriterionDefinition[];
}

export const QUALITY_CHECKLISTS: Record<QualityToolId, QualityChecklistDefinition> = {
  rob2: {
    id: 'rob2',
    titlePt: 'Cochrane RoB 2 (Ensaios Randomizados)',
    titleEn: 'Cochrane RoB 2 (Randomized Trials)',
    criteria: [
      {
        id: 'd1_randomization',
        labelPt: 'D1: Processo de randomização e sigilo de alocação',
        labelEn: 'D1: Randomization process and allocation concealment',
      },
      {
        id: 'd2_deviations',
        labelPt: 'D2: Desvios das intervenções pretendidas (cegamento)',
        labelEn: 'D2: Deviations from intended interventions (blinding)',
      },
      {
        id: 'd3_missing_data',
        labelPt: 'D3: Dados de desfecho ausentes (perdas / atrito)',
        labelEn: 'D3: Missing outcome data (attrition bias)',
      },
      {
        id: 'd4_measurement',
        labelPt: 'D4: Mensuração do desfecho pelos avaliadores',
        labelEn: 'D4: Measurement of the outcome',
      },
      {
        id: 'd5_selection',
        labelPt: 'D5: Seleção do resultado reportado',
        labelEn: 'D5: Selection of the reported result',
      },
    ],
  },
  jbi_quasi: {
    id: 'jbi_quasi',
    titlePt: 'JBI Checklist (Estudos Quase-Experimentais)',
    titleEn: 'JBI Checklist (Quasi-Experimental Studies)',
    criteria: [
      {
        id: 'jbi_temporal',
        labelPt: '1. Clareza causal entre causa e efeito (precedência temporal)',
        labelEn: '1. Clear temporal sequence between cause and effect',
      },
      {
        id: 'jbi_comparison',
        labelPt: '2. Comparabilidade de linha de base entre grupos',
        labelEn: '2. Baseline comparability of participant groups',
      },
      {
        id: 'jbi_control',
        labelPt: '3. Presença de grupo controle / contrafactual equivalente',
        labelEn: '3. Presence of equivalent control group',
      },
      {
        id: 'jbi_measurement',
        labelPt: '4. Mensurações confiáveis e repetidas pré/pós-intervenção',
        labelEn: '4. Reliable multiple pre/post outcome measurements',
      },
      {
        id: 'jbi_stats',
        labelPt: '5. Análise estatística apropriada e controle de confundidores',
        labelEn: '5. Appropriate statistical analysis and confounder control',
      },
    ],
  },
  casp_qual: {
    id: 'casp_qual',
    titlePt: 'CASP Checklist (Pesquisa Qualitativa)',
    titleEn: 'CASP Checklist (Qualitative Research)',
    criteria: [
      {
        id: 'casp_aims',
        labelPt: '1. Declaração clara dos objetivos e adequação qualitativa',
        labelEn: '1. Clear statement of aims and qualitative suitability',
      },
      {
        id: 'casp_design',
        labelPt: '2. Desenho de pesquisa justificado para os objetivos',
        labelEn: '2. Research design justified to address aims',
      },
      {
        id: 'casp_recruitment',
        labelPt: '3. Estratégia de recrutamento e coleta de dados transparentes',
        labelEn: '3. Transparent recruitment and data collection strategy',
      },
      {
        id: 'casp_reflexivity',
        labelPt: '4. Reflexividade da relação pesquisador-participante',
        labelEn: '4. Researcher-participant relationship and reflexivity',
      },
      {
        id: 'casp_rigour',
        labelPt: '5. Rigor na análise de dados e saturação teórica',
        labelEn: '5. Sufficiently rigorous data analysis and saturation',
      },
    ],
  },
};

export function computeOverallQuality(
  criteria: Record<string, QualityRating>
): QualityRating {
  const values = Object.values(criteria);
  if (values.length === 0) return 'unclear';
  if (values.some((v) => v === 'high')) return 'high';
  if (values.some((v) => v === 'some_concerns')) return 'some_concerns';
  if (values.every((v) => v === 'unclear')) return 'unclear';
  if (values.some((v) => v === 'unclear')) return 'some_concerns';
  return 'low';
}

export function createEmptyQualityAppraisal(
  tool: QualityToolId
): QualityAppraisalResult {
  const def = QUALITY_CHECKLISTS[tool];
  const criteria: Record<string, QualityRating> = {};
  for (const c of def.criteria) {
    criteria[c.id] = 'unclear';
  }
  return {
    tool,
    criteria,
    overall: 'unclear',
    updatedAt: new Date().toISOString(),
  };
}

export function getQualityChecklistDefinition(
  tool: QualityToolId,
  language: SupportedLanguage
): {
  id: QualityToolId;
  title: string;
  criteria: Array<{ id: string; label: string }>;
} {
  const def = QUALITY_CHECKLISTS[tool];
  const isEn = language === 'en';
  return {
    id: def.id,
    title: isEn ? def.titleEn : def.titlePt,
    criteria: def.criteria.map((c) => ({
      id: c.id,
      label: isEn ? c.labelEn : c.labelPt,
    })),
  };
}

export function getQualityRatingLabel(
  rating: QualityRating,
  language: SupportedLanguage
): string {
  const isEn = language === 'en';
  switch (rating) {
    case 'low':
      return isEn ? 'Low risk / Adequate' : 'Baixo risco / Adequado';
    case 'some_concerns':
      return isEn ? 'Some concerns' : 'Algumas preocupações';
    case 'high':
      return isEn ? 'High risk / Flawed' : 'Alto risco / Crítico';
    case 'unclear':
    default:
      return isEn ? 'Unclear / Not evaluated' : 'Incerto / Não avaliado';
  }
}
