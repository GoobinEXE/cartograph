import React, { useMemo, useRef } from 'react';
import { SavedPaperItem } from '../types/academic';
import { computeBibliometrics } from '../utils/bibliometrics';
import { canUseNativeShare, shareOrDownloadFile } from '../utils/fileDownload';
import { serializeThemedSvg } from '../utils/svgSerializer';
import { useI18n } from '../i18n/context';
import { BarChart3, Download, Share2 } from 'lucide-react';

interface BibliometricsPanelProps {
  items: SavedPaperItem[];
}

export const BibliometricsPanel: React.FC<BibliometricsPanelProps> = ({ items }) => {
  const { t } = useI18n();
  const stats = useMemo(() => computeBibliometrics(items), [items]);
  const svgExportRef = useRef<SVGSVGElement | null>(null);

  const maxYearCount = Math.max(1, ...stats.yearHistogram.map((d) => d.count));
  const maxSourceCount = Math.max(1, ...stats.topSources.map((d) => d.count));
  const maxAuthorCount = Math.max(1, ...stats.topAuthors.map((d) => d.count));
  const maxVenueCount = Math.max(1, ...stats.topVenues.map((d) => d.count));
  const rotateYearLabels = stats.yearHistogram.length > 12;
  const thinYearLabels = stats.yearHistogram.length > 26;

  const handleExportSvg = async () => {
    if (!svgExportRef.current) return;
    const svgMarkup = serializeThemedSvg(svgExportRef.current);
    const stamp = new Date().toISOString().slice(0, 10);
    await shareOrDownloadFile(
      `cartograph-bibliometrics-${stamp}.svg`,
      svgMarkup,
      'image/svg+xml;charset=utf-8',
      t('biblioTitle')
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <BarChart3 className="w-5 h-5 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
              {t('biblioTitle')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {t('biblioSubtitle', { count: stats.totalPapers })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportSvg}
          className="min-h-11 md:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
        >
          {canUseNativeShare() ? (
            <Share2 className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
          ) : (
            <Download className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
          )}
          <span>{t('biblioExportSvgBtn')}</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiStudies')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1">
            {stats.totalPapers}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
            {stats.yearRange.min && stats.yearRange.max
              ? `${stats.yearRange.min}–${stats.yearRange.max}`
              : '-'}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiOpenAccess')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.openAccessPercent}%
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
            {stats.openAccessCount} / {stats.totalPapers}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiTotalCitations')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1">
            {stats.totalCitations}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiMedianCitations')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1">
            {stats.medianCitations}
          </div>
        </div>
      </div>

      {/* Publication Year Pure SVG Histogram */}
      <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)] space-y-3">
        <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
          {t('biblioChartYearTitle')}
        </h4>
        {stats.yearHistogram.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">-</p>
        ) : (
          <div className="overflow-x-auto">
            <svg
              ref={svgExportRef}
              viewBox={rotateYearLabels ? '0 0 720 242' : '0 0 720 220'}
              className={`w-full min-w-[460px] ${rotateYearLabels ? 'h-52' : 'h-48'}`}
              role="img"
              aria-label={t('biblioChartYearTitle')}
            >
              <rect
                x="0"
                y="0"
                width="720"
                height={rotateYearLabels ? 242 : 220}
                fill="transparent"
              />
              <line
                x1="40"
                y1="180"
                x2="700"
                y2="180"
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              {stats.yearHistogram.map((bucket, idx) => {
                const slotWidth = 650 / stats.yearHistogram.length;
                const barWidth = Math.max(8, Math.min(38, slotWidth * 0.65));
                const x = 45 + idx * slotWidth + (slotWidth - barWidth) / 2;
                const centerX = x + barWidth / 2;
                const barHeight = Math.max(4, (bucket.count / maxYearCount) * 145);
                const y = 180 - barHeight;
                const showYearLabel =
                  !thinYearLabels ||
                  idx % 2 === 0 ||
                  idx === stats.yearHistogram.length - 1;
                return (
                  <g key={bucket.year}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill="var(--chart-1)"
                      fillOpacity="0.88"
                    />
                    <text
                      x={centerX}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize="11"
                      fill="currentColor"
                    >
                      {bucket.count}
                    </text>
                    {showYearLabel && (
                      <text
                        x={centerX}
                        y={rotateYearLabels ? 194 : 198}
                        textAnchor={rotateYearLabels ? 'end' : 'middle'}
                        transform={
                          rotateYearLabels ? `rotate(-40 ${centerX} 194)` : undefined
                        }
                        fontSize="10"
                        fill="currentColor"
                        fillOpacity="0.7"
                      >
                        {bucket.year}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Sources, Venues & Top Authors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Databases */}
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)] space-y-2.5">
          <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
            {t('biblioChartSourcesTitle')}
          </h4>
          <div className="space-y-2">
            {stats.topSources.map((src) => (
              <div key={src.label} className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span className="truncate pr-2">{src.label}</span>
                  <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                    {src.count}
                  </span>
                </div>
                <svg viewBox="0 0 200 8" className="w-full h-2">
                  <rect width="200" height="8" rx="4" fill="currentColor" fillOpacity="0.08" />
                  <rect
                    width={Math.max(8, (src.count / maxSourceCount) * 200)}
                    height="8"
                    rx="4"
                    fill="var(--chart-1)"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Top Venues */}
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)] space-y-2.5">
          <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
            {t('biblioChartVenuesTitle')}
          </h4>
          <div className="space-y-2">
            {stats.topVenues.map((venue) => (
              <div key={venue.label} className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span className="truncate pr-2">{venue.label}</span>
                  <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                    {venue.count}
                  </span>
                </div>
                <svg viewBox="0 0 200 8" className="w-full h-2">
                  <rect width="200" height="8" rx="4" fill="currentColor" fillOpacity="0.08" />
                  <rect
                    width={Math.max(8, (venue.count / maxVenueCount) * 200)}
                    height="8"
                    rx="4"
                    fill="var(--chart-2)"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Top Authors (Lotka) */}
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)] space-y-2.5">
          <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
            {t('biblioChartAuthorsTitle')}
          </h4>
          <div className="space-y-2">
            {stats.topAuthors.map((author) => (
              <div key={author.label} className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span className="truncate pr-2">{author.label}</span>
                  <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                    {author.count}
                  </span>
                </div>
                <svg viewBox="0 0 200 8" className="w-full h-2">
                  <rect width="200" height="8" rx="4" fill="currentColor" fillOpacity="0.08" />
                  <rect
                    width={Math.max(8, (author.count / maxAuthorCount) * 200)}
                    height="8"
                    rx="4"
                    fill="var(--chart-3)"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Extracted Terms */}
      {stats.topKeywords.length > 0 && (
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)] space-y-2.5">
          <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
            {t('biblioKeywordsTitle')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {stats.topKeywords.map((kw) => (
              <span
                key={kw.term}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)]"
              >
                <span>{kw.term}</span>
                <span className="font-mono tabular-nums text-[11px] text-[var(--link-academic)]">
                  {kw.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
