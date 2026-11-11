import React, { useState } from 'react';
import { Prisma2020Counts } from '../types/academic';
import { generatePrismaMethodologyText } from '../utils/prismaFlow';
import { triggerFileDownload } from '../utils/citationExporter';
import { Check, Copy, Download, FileText } from 'lucide-react';

interface PrismaFlowDiagramProps {
  counts: Prisma2020Counts;
}

export const PrismaFlowDiagram: React.FC<PrismaFlowDiagramProps> = ({ counts }) => {
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyMethodology = async () => {
    const text = generatePrismaMethodologyText(counts);
    await navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadSvg = () => {
    const svgElement = document.getElementById('prisma-flow-svg');
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-prisma-2020-flow-${dateStamp}.svg`,
      svgString,
      'image/svg+xml;charset=utf-8;'
    );
  };

  const sourceEntries = Object.entries(counts.bySource).filter(([_, c]) => c > 0);
  const reasonEntries = Object.entries(counts.excludedReasons).filter(([_, c]) => c > 0);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 space-y-6">
      {/* Header and Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-[var(--accent-subtle)] text-[var(--link-academic)]">
              PRISMA 2020
            </span>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Fluxograma Oficial de Triagem e Elegibilidade
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Geração determinística em conformidade com as diretrizes internacionais de síntese de evidência.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMethodology}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer border border-[var(--border-subtle)]"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar Metodologia PRISMA
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--link-academic)] text-white hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar SVG Vetorial
          </button>
        </div>
      </div>

      {/* Interactive Visual PRISMA 2020 Flow Representation */}
      <div className="overflow-x-auto py-2">
        <svg
          id="prisma-flow-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 920 620"
          className="w-full max-w-[920px] mx-auto text-[var(--text-primary)] font-sans select-none"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="currentColor" opacity="0.6" />
            </marker>
          </defs>

          {/* Phase 1: Identification */}
          <g transform="translate(20, 20)">
            {/* Phase Label Left Ribbon */}
            <rect x="0" y="0" width="130" height="120" rx="6" fill="var(--bg-subtle)" opacity="0.8" />
            <text x="65" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              IDENTIFICAÇÃO
            </text>

            {/* Box 1.1: Identified Studies */}
            <rect
              x="160"
              y="0"
              width="360"
              height="120"
              rx="8"
              fill="var(--bg-card)"
              stroke="var(--border-subtle)"
              strokeWidth="1.5"
            />
            <text x="180" y="26" fontSize="13" fontWeight="700" fill="currentColor">
              Registros identificados nas bases ({counts.identifiedTotal})
            </text>
            <text x="180" y="46" fontSize="11" fill="var(--text-secondary)">
              Busca federada multicêntrica:
            </text>
            {sourceEntries.slice(0, 4).map(([src, count], idx) => (
              <text key={src} x="180" y={64 + idx * 14} fontSize="10.5" fill="var(--text-secondary)">
                • {src}: {count}
              </text>
            ))}
            {sourceEntries.length > 4 && (
              <text x="340" y="64" fontSize="10.5" fill="var(--text-secondary)">
                + outras {sourceEntries.length - 4} bases
              </text>
            )}

            {/* Arrow from 1.1 to Duplicates Removed */}
            <line x1="520" y1="60" x2="580" y2="60" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

            {/* Box 1.2: Duplicates Removed */}
            <rect
              x="590"
              y="15"
              width="290"
              height="90"
              rx="8"
              fill="var(--bg-card)"
              stroke="var(--border-subtle)"
              strokeWidth="1.5"
            />
            <text x="610" y="42" fontSize="12.5" fontWeight="700" fill="currentColor">
              Duplicatas removidas ({counts.duplicatesRemoved})
            </text>
            <text x="610" y="62" fontSize="11" fill="var(--text-secondary)">
              Deduplicação multicritério determinística
            </text>
            <text x="610" y="78" fontSize="10.5" fill="var(--text-secondary)">
              (DOI canônico + similaridade Jaro-Winkler)
            </text>
          </g>

          {/* Arrow from Phase 1 to Phase 2 */}
          <line x1="360" y1="140" x2="360" y2="185" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

          {/* Phase 2: Screening */}
          <g transform="translate(20, 190)">
            <rect x="0" y="0" width="130" height="130" rx="6" fill="var(--bg-subtle)" opacity="0.8" />
            <text x="65" y="70" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              TRIAGEM
            </text>

            {/* Box 2.1: Screened Records */}
            <rect
              x="160"
              y="10"
              width="360"
              height="110"
              rx="8"
              fill="var(--bg-card)"
              stroke="var(--border-subtle)"
              strokeWidth="1.5"
            />
            <text x="180" y="40" fontSize="13" fontWeight="700" fill="currentColor">
              Registros triados por título e resumo ({counts.screenedTotal})
            </text>
            <text x="180" y="62" fontSize="11" fill="var(--text-secondary)">
              Avaliação de elegibilidade temática inicial
            </text>
            <text x="180" y="80" fontSize="11" fill="var(--text-secondary)">
              Pendentes de triagem: {Math.max(0, counts.screenedTotal - counts.excludedScreening - counts.includedStudies)}
            </text>

            {/* Arrow to Excluded */}
            <line x1="520" y1="65" x2="580" y2="65" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

            {/* Box 2.2: Excluded with reasons */}
            <rect
              x="590"
              y="0"
              width="290"
              height="130"
              rx="8"
              fill="var(--bg-card)"
              stroke="var(--border-subtle)"
              strokeWidth="1.5"
            />
            <text x="610" y="28" fontSize="12.5" fontWeight="700" fill="currentColor">
              Registros excluídos ({counts.excludedScreening})
            </text>
            {reasonEntries.length === 0 ? (
              <text x="610" y="52" fontSize="11" fill="var(--text-secondary)">
                Nenhum estudo excluído até o momento
              </text>
            ) : (
              reasonEntries.slice(0, 4).map(([reason, count], idx) => (
                <text key={reason} x="610" y={50 + idx * 16} fontSize="10" fill="var(--text-secondary)">
                  • {reason.slice(0, 32)}: {count}
                </text>
              ))
            )}
          </g>

          {/* Arrow from Phase 2 to Phase 3 */}
          <line x1="360" y1="320" x2="360" y2="365" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

          {/* Phase 3: Eligibility & Full Text */}
          <g transform="translate(20, 370)">
            <rect x="0" y="0" width="130" height="90" rx="6" fill="var(--bg-subtle)" opacity="0.8" />
            <text x="65" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              ELEGIBILIDADE
            </text>

            {/* Box 3.1: Full text assessed */}
            <rect
              x="160"
              y="0"
              width="360"
              height="90"
              rx="8"
              fill="var(--bg-card)"
              stroke="var(--border-subtle)"
              strokeWidth="1.5"
            />
            <text x="180" y="32" fontSize="13" fontWeight="700" fill="currentColor">
              Relatórios avaliados na íntegra ({counts.fullTextAssessed})
            </text>
            <text x="180" y="54" fontSize="11" fill="var(--text-secondary)">
              Recuperação de texto completo e análise metodológica
            </text>
          </g>

          {/* Arrow from Phase 3 to Phase 4 */}
          <line x1="360" y1="460" x2="360" y2="505" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

          {/* Phase 4: Included */}
          <g transform="translate(20, 510)">
            <rect x="0" y="0" width="130" height="90" rx="6" fill="var(--bg-subtle)" opacity="0.8" />
            <text x="65" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              INCLUSÃO
            </text>

            {/* Box 4.1: Studies Included */}
            <rect
              x="160"
              y="0"
              width="360"
              height="90"
              rx="8"
              fill="var(--bg-card)"
              stroke="var(--link-academic)"
              strokeWidth="2"
            />
            <text x="180" y="32" fontSize="13.5" fontWeight="700" fill="var(--link-academic)">
              Estudos incluídos na revisão final ({counts.includedStudies})
            </text>
            <text x="180" y="54" fontSize="11" fill="var(--text-secondary)">
              Estudos que atendem integralmente aos critérios de inclusão
            </text>
          </g>
        </svg>
      </div>

      {/* Synthesized Academic Text Preview */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
          <FileText className="w-4 h-4 text-[var(--link-academic)]" />
          Síntese Metodológica Pré-Formatada (Diretriz PRISMA 2020):
        </div>
        <p className="italic">{generatePrismaMethodologyText(counts)}</p>
      </div>
    </div>
  );
};

