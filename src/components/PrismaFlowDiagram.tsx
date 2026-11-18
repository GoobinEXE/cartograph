import { proseLanguage } from '../i18n/localized';
import React, { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Prisma2020Counts, ScreeningStatus } from '../types/academic';
import { generatePrismaMethodologyText } from '../utils/prismaFlow';
import { trackAcademicEvent } from '../utils/analytics';
import {
  canUseNativeShare,
  copyTextSafely,
  shareOrDownloadFile,
} from '../utils/fileDownload';
import { serializeThemedSvg } from '../utils/svgSerializer';
import { useI18n } from '../i18n/context';
import {
  ArrowDown,
  Check,
  Copy,
  Download,
  FileText,
  GitBranch,
  ListChecks,
  Maximize2,
  RotateCcw,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface PrismaFlowDiagramProps {
  counts: Prisma2020Counts;
  onSelectStatusFilter?: (status: 'all' | ScreeningStatus) => void;
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value * 100) / 100));
}

interface PointerPoint {
  x: number;
  y: number;
}

export const PrismaFlowDiagram: React.FC<PrismaFlowDiagramProps> = ({
  counts,
  onSelectStatusFilter,
}) => {
  const { language, t } = useI18n();
  const isEn = proseLanguage(language) === 'en';
  const [copiedText, setCopiedText] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'vertical' | 'svg'>('vertical');
  const [svgZoom, setSvgZoom] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const inlineViewportRef = useRef<HTMLDivElement | null>(null);
  const lightboxViewportRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef<Map<number, PointerPoint>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isLightboxOpen]);

  const handleCopyMethodology = async () => {
    const text = generatePrismaMethodologyText(counts, language);
    const ok = await copyTextSafely(text);
    if (ok) {
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleDownloadSvg = async () => {
    const svgElement =
      svgRef.current ??
      (document.getElementById('prisma-flow-svg') as SVGSVGElement | null);
    if (!svgElement) return;

    const svgString = serializeThemedSvg(svgElement);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const outcome = await shareOrDownloadFile(
      `cartograph-prisma-2020-flow-${dateStamp}.svg`,
      svgString,
      'image/svg+xml;charset=utf-8',
      'PRISMA 2020'
    );
    if (outcome !== 'cancelled') {
      trackAcademicEvent('citation_export', {
        format: 'prisma_svg',
        items_count: counts.includedStudies,
      });
    }
  };

  const sourceEntries = Object.entries(counts.bySource).filter(([, c]) => c > 0);
  const reasonEntries = Object.entries(counts.excludedReasons).filter(([, c]) => c > 0);
  const pendingCount = Math.max(
    0,
    counts.screenedTotal - counts.excludedScreening - counts.includedStudies
  );

  const handleViewportPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    viewport: HTMLDivElement | null
  ) => {
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = { dist: Math.max(1, dist), zoom: svgZoom };
      panStartRef.current = null;
      return;
    }

    if (activePointersRef.current.size === 1 && viewport && svgZoom > 1) {
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
    }
  };

  const handleViewportPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
    viewport: HTMLDivElement | null
  ) => {
    if (!activePointersRef.current.has(event.pointerId)) return;
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const nextZoom = clampZoom(
        pinchStartRef.current.zoom * (dist / pinchStartRef.current.dist)
      );
      setSvgZoom(nextZoom);
      return;
    }

    if (
      activePointersRef.current.size === 1 &&
      panStartRef.current &&
      viewport &&
      event.pointerType === 'mouse'
    ) {
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      viewport.scrollLeft = panStartRef.current.scrollLeft - dx;
      viewport.scrollTop = panStartRef.current.scrollTop - dy;
    }
  };

  const handleViewportPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      panStartRef.current = null;
    }
  };

  const renderZoomToolbar = (inLightbox: boolean) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSvgZoom((z) => clampZoom(z - ZOOM_STEP))}
          disabled={svgZoom <= MIN_ZOOM}
          aria-label={t('prismaZoomOutBtn')}
          title={t('prismaZoomOutBtn')}
          className="w-11 h-11 inline-flex items-center justify-center rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setSvgZoom(1)}
          aria-label={t('prismaZoomResetBtn')}
          title={t('prismaZoomResetBtn')}
          className="min-w-11 h-11 px-2.5 inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-mono font-semibold tabular-nums text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
          <span>{Math.round(svgZoom * 100)}%</span>
        </button>

        <button
          type="button"
          onClick={() => setSvgZoom((z) => clampZoom(z + ZOOM_STEP))}
          disabled={svgZoom >= MAX_ZOOM}
          aria-label={t('prismaZoomInBtn')}
          title={t('prismaZoomInBtn')}
          className="w-11 h-11 inline-flex items-center justify-center rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleDownloadSvg}
          className="min-h-11 px-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--link-academic)] text-white text-xs font-semibold hover:opacity-95 cursor-pointer"
        >
          {canUseNativeShare() ? (
            <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{t('prismaShareSvgBtn')}</span>
        </button>

        {!inLightbox && (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label={t('prismaZoomInBtn')}
            title={t('prismaZoomInBtn')}
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );

  const renderOfficialSvg = (viewportRef: React.RefObject<HTMLDivElement>, zoomed: boolean) => (
    <div
      ref={viewportRef}
      onPointerDown={(e) => handleViewportPointerDown(e, viewportRef.current)}
      onPointerMove={(e) => handleViewportPointerMove(e, viewportRef.current)}
      onPointerUp={handleViewportPointerEnd}
      onPointerCancel={handleViewportPointerEnd}
      className="overflow-auto overscroll-contain touch-pan-x touch-pan-y rounded-xl border border-[var(--divider)] bg-[var(--bg-canvas)] p-2 sm:p-3"
    >
      <div
        className="mx-auto"
        style={{
          width: zoomed ? `${Math.round(svgZoom * 100)}%` : '100%',
          minWidth: zoomed && svgZoom > 1 ? `${Math.round(760 * svgZoom)}px` : undefined,
        }}
      >
        <svg
          ref={svgRef}
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
            <rect x="0" y="0" width="130" height="120" rx="6" fill="var(--bg-subtle)" opacity="0.85" />
            <text x="65" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              {isEn ? 'IDENTIFICATION' : 'IDENTIFICAÇÃO'}
            </text>

            <rect
              x="160"
              y="0"
              width="360"
              height="120"
              rx="8"
              fill="var(--bg-canvas)"
              stroke="var(--divider)"
              strokeWidth="1.5"
            />
            <text x="180" y="26" fontSize="13" fontWeight="700" fill="currentColor">
              {isEn
                ? `Records identified from databases (${counts.identifiedTotal})`
                : `Registros identificados nas bases (${counts.identifiedTotal})`}
            </text>
            <text x="180" y="46" fontSize="11" fill="var(--text-secondary)">
              {isEn ? 'Multi-database federated search:' : 'Busca federada multicêntrica:'}
            </text>
            {sourceEntries.slice(0, 4).map(([src, count], idx) => (
              <text key={src} x="180" y={64 + idx * 14} fontSize="10.5" fill="var(--text-secondary)">
                • {src}: {count}
              </text>
            ))}
            {sourceEntries.length > 4 && (
              <text x="340" y="64" fontSize="10.5" fill="var(--text-secondary)">
                {isEn
                  ? `+ ${sourceEntries.length - 4} other sources`
                  : `+ outras ${sourceEntries.length - 4} bases`}
              </text>
            )}

            <line x1="520" y1="60" x2="580" y2="60" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

            <rect
              x="590"
              y="15"
              width="290"
              height="90"
              rx="8"
              fill="var(--bg-canvas)"
              stroke="var(--divider)"
              strokeWidth="1.5"
            />
            <text x="610" y="42" fontSize="12.5" fontWeight="700" fill="currentColor">
              {isEn
                ? `Duplicate records removed (${counts.duplicatesRemoved})`
                : `Duplicatas removidas (${counts.duplicatesRemoved})`}
            </text>
            <text x="610" y="62" fontSize="11" fill="var(--text-secondary)">
              {isEn ? 'Deterministic multi-criteria deduplication' : 'Deduplicação multicritério determinística'}
            </text>
            <text x="610" y="78" fontSize="10.5" fill="var(--text-secondary)">
              {isEn ? '(Canonical DOI + Jaro-Winkler similarity)' : '(DOI canônico + similaridade Jaro-Winkler)'}
            </text>
          </g>

          <line x1="360" y1="140" x2="360" y2="185" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

          {/* Phase 2: Screening */}
          <g transform="translate(20, 190)">
            <rect x="0" y="0" width="130" height="130" rx="6" fill="var(--bg-subtle)" opacity="0.85" />
            <text x="65" y="70" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              {isEn ? 'SCREENING' : 'TRIAGEM'}
            </text>

            <rect
              x="160"
              y="10"
              width="360"
              height="110"
              rx="8"
              fill="var(--bg-canvas)"
              stroke="var(--divider)"
              strokeWidth="1.5"
            />
            <text x="180" y="40" fontSize="13" fontWeight="700" fill="currentColor">
              {isEn
                ? `Records screened by title & abstract (${counts.screenedTotal})`
                : `Registros triados por título e resumo (${counts.screenedTotal})`}
            </text>
            <text x="180" y="62" fontSize="11" fill="var(--text-secondary)">
              {isEn ? 'Initial thematic eligibility assessment' : 'Avaliação de elegibilidade temática inicial'}
            </text>
            <text x="180" y="80" fontSize="11" fill="var(--text-secondary)">
              {isEn
                ? `Pending screening: ${pendingCount}`
                : `Pendentes de triagem: ${pendingCount}`}
            </text>

            <line x1="520" y1="65" x2="580" y2="65" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

            <rect
              x="590"
              y="0"
              width="290"
              height="130"
              rx="8"
              fill="var(--bg-canvas)"
              stroke="var(--divider)"
              strokeWidth="1.5"
            />
            <text x="610" y="28" fontSize="12.5" fontWeight="700" fill="currentColor">
              {isEn
                ? `Records excluded (${counts.excludedScreening})`
                : `Registros excluídos (${counts.excludedScreening})`}
            </text>
            {reasonEntries.length === 0 ? (
              <text x="610" y="52" fontSize="11" fill="var(--text-secondary)">
                {isEn ? 'No studies excluded so far' : 'Nenhum estudo excluído até o momento'}
              </text>
            ) : (
              reasonEntries.slice(0, 4).map(([reason, count], idx) => (
                <text key={reason} x="610" y={50 + idx * 16} fontSize="10" fill="var(--text-secondary)">
                  • {reason.slice(0, 32)}: {count}
                </text>
              ))
            )}
          </g>

          <line x1="360" y1="320" x2="360" y2="365" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

          {/* Phase 3: Eligibility & Full Text */}
          <g transform="translate(20, 370)">
            <rect x="0" y="0" width="130" height="90" rx="6" fill="var(--bg-subtle)" opacity="0.85" />
            <text x="65" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              {isEn ? 'ELIGIBILITY' : 'ELEGIBILIDADE'}
            </text>

            <rect
              x="160"
              y="0"
              width="360"
              height="90"
              rx="8"
              fill="var(--bg-canvas)"
              stroke="var(--divider)"
              strokeWidth="1.5"
            />
            <text x="180" y="32" fontSize="13" fontWeight="700" fill="currentColor">
              {isEn
                ? `Reports assessed for eligibility (${counts.fullTextAssessed})`
                : `Relatórios avaliados na íntegra (${counts.fullTextAssessed})`}
            </text>
            <text x="180" y="54" fontSize="11" fill="var(--text-secondary)">
              {isEn
                ? 'Full-text retrieval and methodological appraisal'
                : 'Recuperação de texto completo e análise metodológica'}
            </text>
          </g>

          <line x1="360" y1="460" x2="360" y2="505" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />

          {/* Phase 4: Included */}
          <g transform="translate(20, 510)">
            <rect x="0" y="0" width="130" height="90" rx="6" fill="var(--bg-subtle)" opacity="0.85" />
            <text x="65" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
              {isEn ? 'INCLUDED' : 'INCLUSÃO'}
            </text>

            <rect
              x="160"
              y="0"
              width="360"
              height="90"
              rx="8"
              fill="var(--bg-canvas)"
              stroke="var(--link-academic)"
              strokeWidth="2"
            />
            <text x="180" y="32" fontSize="13.5" fontWeight="700" fill="var(--link-academic)">
              {isEn
                ? `Studies included in review (${counts.includedStudies})`
                : `Estudos incluídos na revisão final (${counts.includedStudies})`}
            </text>
            <text x="180" y="54" fontSize="11" fill="var(--text-secondary)">
              {isEn
                ? 'Studies meeting all inclusion criteria'
                : 'Estudos que atendem integralmente aos critérios de inclusão'}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header and Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--divider)] pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
              PRISMA 2020
            </span>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {isEn
                ? 'Official Screening & Eligibility Flow Diagram'
                : 'Fluxograma Oficial de Triagem e Elegibilidade'}
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {isEn
              ? 'Deterministic generation aligned with international evidence synthesis guidelines.'
              : 'Geração determinística em conformidade com as diretrizes internacionais de síntese de evidência.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyMethodology}
            className="min-h-11 md:min-h-0 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer border border-[var(--divider)]"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>{isEn ? 'Copied!' : 'Copiado!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEn ? 'Copy PRISMA Methods Text' : 'Copiar Metodologia PRISMA'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="min-h-11 md:min-h-0 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--link-academic)] text-white hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
          >
            {canUseNativeShare() ? (
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{isEn ? 'Export Vector SVG' : 'Exportar SVG Vetorial'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Mode Switcher: Interactive Vertical Flow <-> Vector SVG (< 768px) */}
      <div className="md:hidden space-y-3">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)]">
          <button
            type="button"
            aria-pressed={mobileViewMode === 'vertical'}
            onClick={() => setMobileViewMode('vertical')}
            className={`min-h-11 px-3 py-2 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mobileViewMode === 'vertical'
                ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <ListChecks className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('prismaMobileVerticalBtn')}</span>
          </button>

          <button
            type="button"
            aria-pressed={mobileViewMode === 'svg'}
            onClick={() => setMobileViewMode('svg')}
            className={`min-h-11 px-3 py-2 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mobileViewMode === 'svg'
                ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <GitBranch className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('prismaMobileSvgBtn')}</span>
          </button>
        </div>

        {/* Mobile Vertical PRISMA 2020 Stepper */}
        {mobileViewMode === 'vertical' && (
          <div className="space-y-2.5">
            {onSelectStatusFilter && (
              <p className="text-xs text-[var(--text-muted)] px-1">
                {t('prismaTapToFilterHint')}
              </p>
            )}

            {/* Phase 1: Identification */}
            <section className="rounded-2xl bg-[var(--bg-canvas)] border border-[var(--divider)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[var(--bg-subtle)] text-[var(--text-primary)]">
                  {isEn ? 'IDENTIFICATION' : 'IDENTIFICAÇÃO'}
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  {counts.identifiedTotal}
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? `Records identified from databases (${counts.identifiedTotal})`
                    : `Registros identificados nas bases (${counts.identifiedTotal})`}
                </h4>
                {sourceEntries.length > 0 && (
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    {sourceEntries.map(([src, count]) => (
                      <li key={src} className="flex items-center justify-between gap-2">
                        <span className="truncate">• {src}</span>
                        <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                          {count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-2.5 border-t border-[var(--divider)] flex items-center justify-between gap-2 text-sm">
                <span className="text-[var(--text-secondary)]">
                  {isEn ? 'Duplicate records removed' : 'Duplicatas removidas'}
                </span>
                <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                  {counts.duplicatesRemoved}
                </span>
              </div>
            </section>

            <div className="flex justify-center text-[var(--text-muted)]" aria-hidden="true">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Phase 2: Screening */}
            <section className="rounded-2xl bg-[var(--bg-canvas)] border border-[var(--divider)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[var(--bg-subtle)] text-[var(--text-primary)]">
                  {isEn ? 'SCREENING' : 'TRIAGEM'}
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  {counts.screenedTotal}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!onSelectStatusFilter}
                  onClick={() => onSelectStatusFilter?.('all')}
                  className="w-full min-h-11 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] flex items-center justify-between gap-2 text-left text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer disabled:cursor-default"
                >
                  <span>
                    {isEn ? 'Records screened (title & abstract)' : 'Registros triados (título e resumo)'}
                  </span>
                  <span className="font-mono tabular-nums text-[var(--link-academic)]">
                    {counts.screenedTotal}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!onSelectStatusFilter}
                  onClick={() => onSelectStatusFilter?.('unscreened')}
                  className="w-full min-h-11 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-left text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 cursor-pointer disabled:cursor-default"
                >
                  <span>{t('decisionPending')}</span>
                  <span className="font-mono font-semibold tabular-nums">{pendingCount}</span>
                </button>

                <button
                  type="button"
                  disabled={!onSelectStatusFilter}
                  onClick={() => onSelectStatusFilter?.('excluded')}
                  className="w-full min-h-11 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-left text-sm font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 cursor-pointer disabled:cursor-default"
                >
                  <span>
                    {isEn ? 'Records excluded' : 'Registros excluídos'}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {counts.excludedScreening}
                  </span>
                </button>
              </div>

              {reasonEntries.length > 0 && (
                <ul className="space-y-1 pt-1 text-sm text-[var(--text-secondary)]">
                  {reasonEntries.map(([reason, count]) => (
                    <li key={reason} className="flex items-start justify-between gap-2">
                      <span>• {reason}</span>
                      <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex justify-center text-[var(--text-muted)]" aria-hidden="true">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Phase 3: Eligibility */}
            <section className="rounded-2xl bg-[var(--bg-canvas)] border border-[var(--divider)] p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[var(--bg-subtle)] text-[var(--text-primary)]">
                  {isEn ? 'ELIGIBILITY' : 'ELEGIBILIDADE'}
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  {counts.fullTextAssessed}
                </span>
              </div>
              <h4 className="text-[15px] font-semibold text-[var(--text-primary)]">
                {isEn
                  ? `Reports assessed for eligibility (${counts.fullTextAssessed})`
                  : `Relatórios avaliados na íntegra (${counts.fullTextAssessed})`}
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">
                {isEn
                  ? 'Full-text retrieval and methodological appraisal'
                  : 'Recuperação de texto completo e análise metodológica'}
              </p>
            </section>

            <div className="flex justify-center text-[var(--text-muted)]" aria-hidden="true">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Phase 4: Included */}
            <section>
              <button
                type="button"
                disabled={!onSelectStatusFilter}
                onClick={() => onSelectStatusFilter?.('included')}
                className="w-full min-h-12 text-left rounded-2xl bg-[var(--bg-canvas)] border-2 border-[var(--link-academic)] p-4 space-y-1.5 hover:bg-[var(--accent-blue-tint)]/40 transition-colors cursor-pointer disabled:cursor-default"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
                    {isEn ? 'INCLUDED' : 'INCLUSÃO'}
                  </span>
                  <span className="text-lg font-bold font-mono tabular-nums text-[var(--link-academic)]">
                    {counts.includedStudies}
                  </span>
                </div>
                <h4 className="text-base font-bold text-[var(--link-academic)]">
                  {isEn
                    ? `Studies included in review (${counts.includedStudies})`
                    : `Estudos incluídos na revisão final (${counts.includedStudies})`}
                </h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  {isEn
                    ? 'Studies meeting all inclusion criteria'
                    : 'Estudos que atendem integralmente aos critérios de inclusão'}
                </p>
              </button>
            </section>
          </div>
        )}

        {/* Mobile Vector SVG + Zoom Controls */}
        {mobileViewMode === 'svg' && !isLightboxOpen && (
          <div className="space-y-3">
            {renderZoomToolbar(false)}
            {renderOfficialSvg(inlineViewportRef, true)}
          </div>
        )}
      </div>

      {/* Desktop Vector SVG (>= 768px) */}
      {!isLightboxOpen && (
        <div className="hidden md:block space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('prismaZoomInBtn')}</span>
            </button>
          </div>
          {renderOfficialSvg(inlineViewportRef, false)}
        </div>
      )}

      {/* Fullscreen Pinch-to-Zoom Lightbox */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="PRISMA 2020"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
          className="fixed inset-0 z-50 bg-[var(--bg-canvas)] flex flex-col"
        >
          <div className="shrink-0 px-4 py-3 border-b border-[var(--divider)] bg-[var(--bg-secondary)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-[var(--accent-blue-tint)] text-[var(--link-academic)]">
                PRISMA 2020
              </span>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                {t('prismaMobileSvgBtn')}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label={t('mobileCloseSheetBtn')}
              className="w-11 h-11 inline-flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="shrink-0 px-4 py-2.5 border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
            {renderZoomToolbar(true)}
          </div>

          <div className="flex-1 min-h-0 p-3 sm:p-5 flex flex-col">
            {renderOfficialSvg(lightboxViewportRef, true)}
          </div>
        </div>
      )}

      {/* Synthesized Academic Text Preview */}
      <div className="bg-[var(--bg-canvas)] rounded-xl p-4 border border-[var(--divider)] text-[13px] md:text-xs text-[var(--text-secondary)] leading-relaxed space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
          <FileText className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <span>
            {isEn
              ? 'Pre-formatted Methods Summary (PRISMA 2020 Guideline):'
              : 'Síntese Metodológica Pré-Formatada (Diretriz PRISMA 2020):'}
          </span>
        </div>
        <p className="italic">{generatePrismaMethodologyText(counts, language)}</p>
      </div>
    </div>
  );
};
