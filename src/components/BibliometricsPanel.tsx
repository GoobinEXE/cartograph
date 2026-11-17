import React, { useMemo, useRef } from 'react';
import { SavedPaperItem } from '../types/academic';
import { computeBibliometrics } from '../utils/bibliometrics';
import { triggerFileDownload } from '../utils/citationExporter';
import { useI18n } from '../i18n/context';
import { BarChart3, Download } from 'lucide-react';

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

  const handleExportSvg = () => {
    if (!svgExportRef.current) return;
    const serializer = new XMLSerializer();
    // Theme tokens (var(--chart-1), currentColor) do not resolve in a standalone file, and
    // exported charts land on white pages (theses, papers): always bake the light-theme
    // values, read from the tokens through a probe element scoped to data-theme="light".
    const probe = document.createElement('div');
    probe.setAttribute('data-theme', 'light');
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const lightTokens = getComputedStyle(probe);
    const textColor = lightTokens.getPropertyValue('--text-primary').trim() || 'black';
    const rawSvg = serializer
      .serializeToString(svgExportRef.current)
      .replace(/var\((--[a-z0-9-]+)\)/gi, (match, name: string) => lightTokens.getPropertyValue(name).trim() || match)
      .replace(/currentColor/g, textColor);
    probe.remove();
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cartograph-bibliometrics-${stamp}.svg`,
      rawSvg,
      'image/svg+xml;charset=utf-8'
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-[var(--link-academic)]" />
          <div>
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span>{t('biblioExportSvgBtn')}</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiStudies')}</div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
            {stats.totalPapers}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {stats.yearRange.min && stats.yearRange.max
              ? `${stats.yearRange.min}–${stats.yearRange.max}`
              : '-'}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiOpenAccess')}</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.openAccessPercent}%
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {stats.openAccessCount} / {stats.totalPapers}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiTotalCitations')}</div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
            {stats.totalCitations}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--divider)]">
          <div className="text-xs text-[var(--text-muted)]">{t('biblioKpiMedianCitations')}</div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
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
              viewBox="0 0 720 220"
              className="w-full min-w-[460px] h-48"
              role="img"
              aria-label={t('biblioChartYearTitle')}
            >
              <rect x="0" y="0" width="720" height="220" fill="transparent" />
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
                const barHeight = Math.max(4, (bucket.count / maxYearCount) * 145);
                const y = 180 - barHeight;
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
                      x={x + barWidth / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize="11"
                      fill="currentColor"
                    >
                      {bucket.count}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="198"
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                      fillOpacity="0.7"
                    >
                      {bucket.year}
                    </text>
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
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
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
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
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
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
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
                <span className="font-mono text-[11px] text-[var(--link-academic)]">
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
