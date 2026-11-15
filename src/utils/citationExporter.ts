import { SupportedLanguage } from '../i18n/translations';
import { NormalizedPaper, SavedPaperItem } from '../types/academic';

function formatAuthorAbnt(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AUTOR DESCONHECIDO';
  if (parts.length === 1) return parts[0].toUpperCase();
  const last = parts[parts.length - 1].toUpperCase();
  const rest = parts.slice(0, -1).join(' ');
  return `${last}, ${rest}`;
}

function formatAuthorApa(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Unknown';
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0]?.toUpperCase() || ''}.`)
    .join(' ');
  return `${last}, ${initials}`;
}

export function formatAbntCitation(paper: NormalizedPaper): string {
  const authors =
    paper.authors.length === 0
      ? 'AUTOR DESCONHECIDO'
      : paper.authors.length > 3
      ? `${formatAuthorAbnt(paper.authors[0])} et al.`
      : paper.authors.map(formatAuthorAbnt).join('; ');

  const year = paper.year || 's.d.';
  const doiPart = paper.doi ? ` DOI: https://doi.org/${paper.doi}.` : '';
  const urlPart = !paper.doi && paper.url ? ` Disponível em: ${paper.url}.` : '';

  return `${authors}. ${paper.title}. ${paper.venue}, ${year}.${doiPart}${urlPart}`;
}

export function formatApaCitation(paper: NormalizedPaper): string {
  const authors =
    paper.authors.length === 0
      ? 'Unknown Author'
      : paper.authors.map(formatAuthorApa).join(', ');
  const year = paper.year ? `(${paper.year})` : '(n.d.)';
  const doiPart = paper.doi ? ` https://doi.org/${paper.doi}` : ` ${paper.url}`;

  return `${authors} ${year}. ${paper.title}. ${paper.venue}.${doiPart}`;
}

export function formatBibtexEntry(paper: NormalizedPaper): string {
  const firstAuthorLast =
    paper.authors[0]
      ?.trim()
      .split(/\s+/)
      .pop()
      ?.replace(/[^a-zA-Z]/g, '')
      .toLowerCase() || 'paper';
  const year = paper.year || '2026';
  const firstTitleWord =
    paper.title
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase() || 'study';
  const citeKey = `${firstAuthorLast}${year}${firstTitleWord}`;

  const authorsBib = paper.authors.length > 0 ? paper.authors.join(' and ') : 'Unknown';

  const lines = [
    `@article{${citeKey},`,
    `  title = {${paper.title}},`,
    `  author = {${authorsBib}},`,
    `  journal = {${paper.venue}},`,
    `  year = {${year}},`,
  ];
  if (paper.doi) {
    lines.push(`  doi = {${paper.doi}},`);
  }
  if (paper.url) {
    lines.push(`  url = {${paper.url}}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Neutralize spreadsheet formula injection (CWE-1236) in Excel/LibreOffice
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  const escaped = neutralized.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportSavedPapersCsv(
  items: SavedPaperItem[],
  groupNameMap?: Record<string, string>,
  language: SupportedLanguage = 'pt'
): string {
  const isEn = language === 'en';
  const headers = isEn
    ? [
        'Group_Slot',
        'Title',
        'Authors',
        'Year',
        'Venue_Source',
        'Citations',
        'Open_Access',
        'DOI',
        'Free_PDF_URL',
        'Page_URL',
        'Indexing_Database',
        'Priority',
        'PRISMA_Screening_Status',
        'Exclusion_Reason',
        'Study_Design',
        'Sample_Size_N',
        'Extracted_Objective',
        'Extracted_Methods',
        'Extracted_Results',
        'Extracted_Conclusion',
        'Researcher_Notes',
        'Abstract',
        'ABNT_Citation',
        'APA_Citation',
      ]
    : [
        'Grupo_Slot',
        'Titulo',
        'Autores',
        'Ano',
        'Periodico_Fonte',
        'Citacoes',
        'Open_Access',
        'DOI',
        'Link_PDF_Gratuito',
        'Link_Pagina',
        'Base_Indexadora',
        'Prioridade',
        'Status_Triagem_PRISMA',
        'Motivo_Exclusao',
        'Delineamento_Estudo',
        'Amostra_N',
        'Objetivo_Extraido',
        'Metodologia_Extraida',
        'Resultados_Extraidos',
        'Conclusao_Extraida',
        'Notas_Fichamento',
        'Resumo_Abstract',
        'Referencia_ABNT',
        'Referencia_APA',
      ];

  const rows = items.map((item) => {
    const meta = item.extractedMetadata;
    const screeningLabel = isEn
      ? item.screeningStatus === 'included'
        ? 'INCLUDED'
        : item.screeningStatus === 'excluded'
        ? 'EXCLUDED'
        : 'PENDING'
      : item.screeningStatus === 'included'
      ? 'INCLUIDO'
      : item.screeningStatus === 'excluded'
      ? 'EXCLUIDO'
      : 'PENDENTE';
    const groupLabel =
      item.groupId && groupNameMap?.[item.groupId]
        ? groupNameMap[item.groupId]
        : isEn
        ? 'Ungrouped (General)'
        : 'Sem Grupo (Geral)';
    const priorityLabel = isEn
      ? item.relevanceTag === 'alta'
        ? 'HIGH'
        : item.relevanceTag === 'media'
        ? 'MEDIUM'
        : 'REVIEW'
      : item.relevanceTag.toUpperCase();

    return [
      escapeCsvCell(groupLabel),
      escapeCsvCell(item.title),
      escapeCsvCell(item.authors.join('; ')),
      escapeCsvCell(item.year ?? ''),
      escapeCsvCell(item.venue),
      escapeCsvCell(item.citationCount),
      escapeCsvCell(item.isOpenAccess ? (isEn ? 'Yes' : 'Sim') : isEn ? 'No' : 'Nao'),
      escapeCsvCell(item.doi ? `https://doi.org/${item.doi}` : ''),
      escapeCsvCell(item.pdfUrl ?? ''),
      escapeCsvCell(item.url),
      escapeCsvCell(item.sourceLabel),
      escapeCsvCell(priorityLabel),
      escapeCsvCell(screeningLabel),
      escapeCsvCell(item.exclusionReason ?? ''),
      escapeCsvCell(meta?.studyDesign ?? ''),
      escapeCsvCell(meta?.sampleSize ?? ''),
      escapeCsvCell(meta?.objective ?? ''),
      escapeCsvCell(meta?.methods ?? ''),
      escapeCsvCell(meta?.results ?? ''),
      escapeCsvCell(meta?.conclusion ?? ''),
      escapeCsvCell(item.researcherNotes),
      escapeCsvCell(item.abstractText ?? ''),
      escapeCsvCell(formatAbntCitation(item)),
      escapeCsvCell(formatApaCitation(item)),
    ];
  });

  // Prepend UTF-8 BOM (\uFEFF) for seamless opening in Microsoft Excel (Windows/macOS) and LibreOffice (Linux)
  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

