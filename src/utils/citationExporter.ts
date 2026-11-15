import { SupportedLanguage } from '../i18n/translations';
import {
  CustomExtractionColumn,
  NormalizedPaper,
  SavedPaperItem,
} from '../types/academic';
import { getQualityRatingLabel } from './qualityChecklists';

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
  language: SupportedLanguage = 'pt',
  customColumns: CustomExtractionColumn[] = []
): string {
  const isEn = language === 'en';
  const baseHeaders = isEn
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

  const headers = [
    ...baseHeaders,
    isEn ? 'Quality_Tool' : 'Ferramenta_Qualidade',
    isEn ? 'Quality_Overall' : 'Avaliacao_Qualidade',
    ...customColumns.map((col) => escapeCsvCell(col.label)),
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
      escapeCsvCell(item.qualityAppraisal?.tool ?? ''),
      escapeCsvCell(
        item.qualityAppraisal
          ? getQualityRatingLabel(item.qualityAppraisal.overall, language)
          : ''
      ),
      ...customColumns.map((col) =>
        escapeCsvCell(item.customFields?.[col.id] ?? '')
      ),
    ];
  });

  // Prepend UTF-8 BOM (\uFEFF) for seamless opening in Microsoft Excel (Windows/macOS) and LibreOffice (Linux)
  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

function extractSurname(fullName: string): string {
  const cleaned = fullName.trim();
  if (!cleaned) return 'Unknown';
  if (cleaned.includes(',')) {
    return cleaned.split(',')[0].trim() || 'Unknown';
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || 'Unknown';
}

function formatRisAuthorName(fullName: string): string {
  const cleaned = fullName.trim();
  if (!cleaned) return 'Unknown';
  if (cleaned.includes(',')) return cleaned;
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(' ');
  return `${last}, ${rest}`;
}

export function formatInTextCitation(
  paper: NormalizedPaper,
  style: 'abnt' | 'apa',
  mode: 'parenthetical' | 'narrative' = 'parenthetical'
): string {
  const yearLabel = paper.year ?? (style === 'abnt' ? 's.d.' : 'n.d.');
  const surnames = paper.authors.map(extractSurname).filter(Boolean);

  if (style === 'abnt') {
    if (surnames.length === 0) {
      return mode === 'narrative'
        ? `Autor Desconhecido (${yearLabel})`
        : `(AUTOR DESCONHECIDO, ${yearLabel})`;
    }
    if (mode === 'parenthetical') {
      if (surnames.length > 3) {
        return `(${surnames[0].toUpperCase()} et al., ${yearLabel})`;
      }
      return `(${surnames.map((s) => s.toUpperCase()).join('; ')}, ${yearLabel})`;
    }
    if (surnames.length === 1) return `${surnames[0]} (${yearLabel})`;
    if (surnames.length === 2) return `${surnames[0]} e ${surnames[1]} (${yearLabel})`;
    if (surnames.length === 3) return `${surnames[0]}, ${surnames[1]} e ${surnames[2]} (${yearLabel})`;
    return `${surnames[0]} et al. (${yearLabel})`;
  }

  // APA 7th edition
  if (surnames.length === 0) {
    return mode === 'narrative' ? `Unknown (${yearLabel})` : `(Unknown, ${yearLabel})`;
  }
  if (mode === 'parenthetical') {
    if (surnames.length === 1) return `(${surnames[0]}, ${yearLabel})`;
    if (surnames.length === 2) return `(${surnames[0]} & ${surnames[1]}, ${yearLabel})`;
    return `(${surnames[0]} et al., ${yearLabel})`;
  }
  if (surnames.length === 1) return `${surnames[0]} (${yearLabel})`;
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]} (${yearLabel})`;
  return `${surnames[0]} et al. (${yearLabel})`;
}

export function formatRisEntry(paper: NormalizedPaper): string {
  const lines: string[] = [
    'TY  - JOUR',
    `TI  - ${paper.title.replace(/[\r\n]+/g, ' ').trim()}`,
  ];
  for (const author of paper.authors) {
    if (author.trim()) {
      lines.push(`AU  - ${formatRisAuthorName(author)}`);
    }
  }
  if (paper.year) {
    lines.push(`PY  - ${paper.year}`);
  }
  if (paper.venue) {
    lines.push(`JO  - ${paper.venue.replace(/[\r\n]+/g, ' ').trim()}`);
  }
  if (paper.doi) {
    lines.push(`DO  - ${paper.doi}`);
  }
  if (paper.url) {
    lines.push(`UR  - ${paper.url}`);
  }
  if (paper.pdfUrl) {
    lines.push(`L1  - ${paper.pdfUrl}`);
  }
  if (paper.abstractText) {
    lines.push(`AB  - ${paper.abstractText.replace(/[\r\n]+/g, ' ').trim()}`);
  }
  lines.push(`DB  - ${paper.sourceLabel}`);
  lines.push('ER  - ');
  return lines.join('\n');
}

export function exportSavedPapersRis(items: NormalizedPaper[]): string {
  if (items.length === 0) return '';
  return `${items.map(formatRisEntry).join('\n\n')}\n`;
}

export function escapeLatex(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  return raw
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

export function exportSynthesisLatexTable(
  items: SavedPaperItem[],
  language: SupportedLanguage = 'pt'
): string {
  const isEn = language === 'en';
  const colStudy = isEn ? 'Study (Author, Year)' : 'Estudo (Autor, Ano)';
  const colDesign = isEn ? 'Design' : 'Delineamento';
  const colSample = isEn ? 'Sample ($N$)' : 'Amostra ($N$)';
  const colFindings = isEn ? 'Findings / Notes' : 'Achados / Notas';
  const caption = isEn
    ? 'Synthesis matrix of selected studies'
    : 'Matriz de sintese dos estudos selecionados';

  const rows = items.map((item) => {
    const firstAuthor = item.authors[0] ? extractSurname(item.authors[0]) : 'N/A';
    const etAl = item.authors.length > 1 ? ' et al.' : '';
    const studyLabel = `${firstAuthor}${etAl} (${item.year ?? 's.d.'})`;
    const design = item.extractedMetadata?.studyDesign || item.publicationType || '-';
    const sample = item.extractedMetadata?.sampleSize || '-';
    const summary =
      item.researcherNotes.trim() ||
      item.extractedMetadata?.conclusion ||
      item.extractedMetadata?.results ||
      item.title;
    return `    ${escapeLatex(studyLabel)} & ${escapeLatex(design)} & ${escapeLatex(sample)} & ${escapeLatex(summary.slice(0, 140))} \\\\`;
  });

  return [
    '\\begin{table}[htbp]',
    '  \\centering',
    `  \\caption{${escapeLatex(caption)}}`,
    '  \\label{tab:cartograph_synthesis}',
    '  \\begin{tabular}{lllp{6.5cm}}',
    '    \\toprule',
    `    \\textbf{${colStudy}} & \\textbf{${colDesign}} & \\textbf{${colSample}} & \\textbf{${colFindings}} \\\\`,
    '    \\midrule',
    ...rows,
    '    \\bottomrule',
    '  \\end{tabular}',
    '\\end{table}',
  ].join('\n');
}

export function exportSynthesisMarkdown(
  items: SavedPaperItem[],
  groupNameMap?: Record<string, string>,
  language: SupportedLanguage = 'pt',
  customColumns: CustomExtractionColumn[] = []
): string {
  const isEn = language === 'en';
  const today = new Date().toISOString().slice(0, 10);
  const escapeMdCell = (val: string | number | null | undefined) =>
    String(val ?? '-')
      .replace(/\|/g, '\\|')
      .replace(/[\r\n]+/g, ' ')
      .trim();

  const extraHeaders = [
    isEn ? 'Quality Appraisal' : 'Qualidade (RoB/JBI)',
    ...customColumns.map((col) => escapeMdCell(col.label)),
  ];
  const baseHeaderRow = isEn
    ? ['Study', 'Year', 'Design', 'Sample (N)', 'Status', 'Citation']
    : ['Estudo', 'Ano', 'Delineamento', 'Amostra (N)', 'Triagem', 'Citação'];
  const allHeaders = [...baseHeaderRow, ...extraHeaders];

  const headerLines = [
    '---',
    'type: literature-synthesis',
    `generated: ${today}`,
    `studies_count: ${items.length}`,
    'generator: Cartograph',
    '---',
    '',
    `# ${isEn ? 'Literature Synthesis Matrix' : 'Matriz de Síntese Bibliográfica'} (${items.length})`,
    '',
    `| ${allHeaders.join(' | ')} |`,
    `| ${allHeaders.map(() => '---').join(' | ')} |`,
  ];

  const tableRows = items.map((item) => {
    const cite = formatInTextCitation(item, isEn ? 'apa' : 'abnt', 'narrative');
    const design = item.extractedMetadata?.studyDesign || '-';
    const sample = item.extractedMetadata?.sampleSize || '-';
    const status = item.screeningStatus || 'unscreened';
    const qualityCell = item.qualityAppraisal
      ? `${item.qualityAppraisal.tool.toUpperCase()}: ${getQualityRatingLabel(item.qualityAppraisal.overall, language)}`
      : '-';
    const customCells = customColumns.map((col) =>
      escapeMdCell(item.customFields?.[col.id] || '-')
    );
    return `| ${escapeMdCell(item.title)} | ${item.year ?? '-'} | ${escapeMdCell(design)} | ${escapeMdCell(sample)} | ${status} | ${escapeMdCell(cite)} | ${escapeMdCell(qualityCell)} |${customCells.length > 0 ? ` ${customCells.join(' | ')} |` : ''}`;
  });

  const detailBlocks = items.flatMap((item, idx) => {
    const groupLabel =
      item.groupId && groupNameMap?.[item.groupId]
        ? groupNameMap[item.groupId]
        : isEn
        ? 'Ungrouped'
        : 'Sem Grupo';
    const meta = item.extractedMetadata;
    const lines = [
      '',
      `## ${idx + 1}. ${item.title}`,
      `- **${isEn ? 'Slot' : 'Grupo'}:** ${groupLabel} | **${isEn ? 'Source' : 'Base'}:** ${item.sourceLabel} | **${isEn ? 'Year' : 'Ano'}:** ${item.year ?? '-'}`,
      `- **ABNT:** ${formatAbntCitation(item)}`,
      `- **APA:** ${formatApaCitation(item)}`,
    ];
    if (item.doi) {
      lines.push(`- **DOI:** https://doi.org/${item.doi}`);
    }
    if (item.pdfUrl) {
      lines.push(`- **PDF:** ${item.pdfUrl}`);
    }
    if (meta?.objective) lines.push(`- **${isEn ? 'Objective' : 'Objetivo'}:** ${meta.objective}`);
    if (meta?.methods) lines.push(`- **${isEn ? 'Methods' : 'Métodos'}:** ${meta.methods}`);
    if (meta?.results) lines.push(`- **${isEn ? 'Results' : 'Resultados'}:** ${meta.results}`);
    if (meta?.conclusion) lines.push(`- **${isEn ? 'Conclusion' : 'Conclusão'}:** ${meta.conclusion}`);
    if (item.researcherNotes.trim()) {
      lines.push(`- **${isEn ? 'Notes' : 'Notas'}:** ${item.researcherNotes.trim()}`);
    }
    return lines;
  });

  return [...headerLines, ...tableRows, ...detailBlocks].join('\n');
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

