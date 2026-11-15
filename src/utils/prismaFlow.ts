import { SupportedLanguage } from '../i18n/translations';
import { Prisma2020Counts, SavedPaperItem, ScreeningExclusionReason } from '../types/academic';

export const SCREENING_REASON_LABELS: Record<ScreeningExclusionReason, string> = {
  populacao_inadequada: 'População/Amostra fora do escopo',
  desenho_incompativel: 'Delineamento de estudo não compatível',
  desfecho_irrelevante: 'Desfecho de interesse não avaliado',
  texto_completo_inacessivel: 'Texto completo não recuperado/indisponível',
  duplicata_residual: 'Duplicata residual de outra base',
  retracao_identificada: 'Artigo retratado pelo periódico/editora',
  outro: 'Outro critério metodológico específico',
};

export const SCREENING_REASON_LABELS_EN: Record<ScreeningExclusionReason, string> = {
  populacao_inadequada: 'Population/sample out of scope',
  desenho_incompativel: 'Incompatible study design',
  desfecho_irrelevante: 'Outcome of interest not assessed',
  texto_completo_inacessivel: 'Full text unavailable/unretrieved',
  duplicata_residual: 'Residual duplicate from another database',
  retracao_identificada: 'Retracted publication / erratum notice',
  outro: 'Other specific methodological criterion',
};

export function getScreeningReasonLabels(
  language: SupportedLanguage = 'pt'
): Record<ScreeningExclusionReason, string> {
  return language === 'en' ? SCREENING_REASON_LABELS_EN : SCREENING_REASON_LABELS;
}

/**
 * Computes official PRISMA 2020 counts from saved items and search stats.
 */
export function calculatePrisma2020Counts(
  items: SavedPaperItem[],
  totalIdentifiedBeforeDedup: number = 0,
  duplicatesCount: number = 0,
  sourceBreakdown: Record<string, number> = {},
  language: SupportedLanguage = 'pt'
): Prisma2020Counts {
  const bySource = { ...sourceBreakdown };
  let identifiedTotal = totalIdentifiedBeforeDedup;
  const reasonLabels = getScreeningReasonLabels(language);

  // If before-dedup stats are empty, reconstruct from items
  if (identifiedTotal === 0 && items.length > 0) {
    items.forEach((item) => {
      const src =
        item.sourceLabel || (language === 'en' ? 'Academic Databases' : 'Bases Acadêmicas');
      bySource[src] = (bySource[src] || 0) + 1;
    });
    identifiedTotal = items.length + duplicatesCount;
  }

  const screenedTotal = items.length;
  let excludedScreening = 0;
  const excludedReasons: Record<string, number> = {};
  let includedStudies = 0;

  for (const item of items) {
    if (item.screeningStatus === 'excluded') {
      excludedScreening++;
      const reasonKey = item.exclusionReason || 'outro';
      const label =
        reasonLabels[reasonKey as ScreeningExclusionReason] || reasonKey;
      excludedReasons[label] = (excludedReasons[label] || 0) + 1;
    } else if (item.screeningStatus === 'included') {
      includedStudies++;
    }
  }

  const fullTextAssessed = screenedTotal - excludedScreening;
  const excludedFullText = 0; // Can be segmented in deeper stages

  return {
    identifiedTotal: Math.max(identifiedTotal, screenedTotal + duplicatesCount),
    bySource,
    duplicatesRemoved: duplicatesCount,
    screenedTotal,
    excludedScreening,
    excludedReasons,
    fullTextAssessed,
    excludedFullText,
    includedStudies,
  };
}

/**
 * Generates ready-to-publish PRISMA 2020 methodological synthesis text.
 */
export function generatePrismaMethodologyText(
  counts: Prisma2020Counts,
  language: SupportedLanguage = 'pt'
): string {
  const sourceList = Object.entries(counts.bySource)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => `${name} (n = ${count})`)
    .join(', ');

  const reasonList = Object.entries(counts.excludedReasons)
    .map(([reason, count]) => `${reason} (n = ${count})`)
    .join('; ');

  if (language === 'en') {
    return `The search and selection process followed the PRISMA 2020 guidelines (Preferred Reporting Items for Systematic Reviews and Meta-Analyses). A total of ${counts.identifiedTotal} records were initially identified through federated search across the following databases: ${sourceList || 'open scientific databases'}. Prior to screening, ${counts.duplicatesRemoved} duplicate records were identified and removed using a deterministic multi-criteria deduplication algorithm (canonical DOI and Jaro-Winkler textual similarity). This left ${counts.screenedTotal} records for title and abstract screening. Of these, ${counts.excludedScreening} studies were excluded for the following reasons: ${reasonList || 'predefined eligibility criteria'}. Ultimately, ${counts.includedStudies} studies met all inclusion criteria and were incorporated into the qualitative and quantitative synthesis of the review.`;
  }

  return `O processo de busca e seleção seguiu as recomendações da diretriz PRISMA 2020 (Preferred Reporting Items for Systematic Reviews and Meta-Analyses). Foram identificados inicialmente ${counts.identifiedTotal} registros por meio de busca federada nas seguintes bases de dados: ${sourceList || 'bases científicas abertas'}. Antes do início da triagem, ${counts.duplicatesRemoved} registros duplicados foram identificados e removidos por algoritmo de deduplicação multicritério determinístico (DOI canônico e similaridade textual Jaro-Winkler). Restaram ${counts.screenedTotal} registros para triagem de títulos e resumos. Desses, ${counts.excludedScreening} estudos foram excluídos pelos seguintes motivos: ${reasonList || 'critérios de elegibilidade predefinidos'}. Ao final do processo, ${counts.includedStudies} estudos atenderam plenamente a todos os critérios de inclusão e foram incorporados à síntese qualitativa e quantitativa da revisão.`;
}
