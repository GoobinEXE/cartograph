import { Prisma2020Counts, SavedPaperItem, ScreeningExclusionReason } from '../types/academic';

export const SCREENING_REASON_LABELS: Record<ScreeningExclusionReason, string> = {
  populacao_inadequada: 'População/Amostra fora do escopo',
  desenho_incompativel: 'Delineamento de estudo não compatível',
  desfecho_irrelevante: 'Desfecho de interesse não avaliado',
  texto_completo_inacessivel: 'Texto completo não recuperado/indisponível',
  duplicata_residual: 'Duplicata residual de outra base',
  outro: 'Outro critério metodológico específico',
};

/**
 * Computes official PRISMA 2020 counts from saved items and search stats.
 */
export function calculatePrisma2020Counts(
  items: SavedPaperItem[],
  totalIdentifiedBeforeDedup: number = 0,
  duplicatesCount: number = 0,
  sourceBreakdown: Record<string, number> = {}
): Prisma2020Counts {
  const bySource = { ...sourceBreakdown };
  let identifiedTotal = totalIdentifiedBeforeDedup;

  // If before-dedup stats are empty, reconstruct from items
  if (identifiedTotal === 0 && items.length > 0) {
    items.forEach((item) => {
      const src = item.sourceLabel || 'Bases Acadêmicas';
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
        SCREENING_REASON_LABELS[reasonKey as ScreeningExclusionReason] || reasonKey;
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
 * Generates ready-to-publish PRISMA 2020 methodological synthesis text (ABNT standard).
 */
export function generatePrismaMethodologyText(counts: Prisma2020Counts): string {
  const sourceList = Object.entries(counts.bySource)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => `${name} (n = ${count})`)
    .join(', ');

  const reasonList = Object.entries(counts.excludedReasons)
    .map(([reason, count]) => `${reason} (n = ${count})`)
    .join('; ');

  return `O processo de busca e seleção seguiu as recomendações da diretriz PRISMA 2020 (Preferred Reporting Items for Systematic Reviews and Meta-Analyses). Foram identificados inicialmente ${counts.identifiedTotal} registros por meio de busca federada nas seguintes bases de dados: ${sourceList || 'bases científicas abertas'}. Antes do início da triagem, ${counts.duplicatesRemoved} registros duplicados foram identificados e removidos por algoritmo de deduplicação multicritério determinístico (DOI canônico e similaridade textual Jaro-Winkler). Restaram ${counts.screenedTotal} registros para triagem de títulos e resumos. Desses, ${counts.excludedScreening} estudos foram excluídos pelos seguintes motivos: ${reasonList || 'critérios de elegibilidade predefinidos'}. Ao final do processo, ${counts.includedStudies} estudos atenderam plenamente a todos os critérios de inclusão e foram incorporados à síntese qualitativa e quantitativa da revisão.`;
}

