import React from 'react';
import { Compass, Database, Globe, Layers, Search } from 'lucide-react';
import { PrismMonogram, PrismSpectralBar } from './PrismLogo';
import { useI18n } from '../i18n/context';
import { PLATFORMS } from '../data/platforms';
import { OPEN_FEDERATED_SOURCE_COUNT } from '../data/apiSources';

interface NotFoundViewProps {
  invalidPath: string;
  onNavigateTab: (tab: 'platforms' | 'federated' | 'saved' | 'feedback' | 'about') => void;
  onFocusSearch?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  invalidPath,
  onNavigateTab,
  onFocusSearch,
}) => {
  const { t } = useI18n();
  const counts = { platforms: PLATFORMS.length, apis: OPEN_FEDERATED_SOURCE_COUNT };

  return (
    <section
      aria-labelledby="not-found-heading"
      className="max-w-3xl mx-auto my-8 sm:my-14 bg-[var(--bg-secondary)] border border-[var(--divider)] rounded-2xl overflow-hidden"
    >
      <PrismSpectralBar className="h-1 w-full" />

      <div className="p-6 sm:p-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-mono text-[var(--link-academic)]">
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('notFoundCode')}</span>
          </div>
          <PrismMonogram className="h-7 w-auto opacity-85" />
        </div>

        <div className="space-y-3">
          <h1
            id="not-found-heading"
            className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)] tracking-tight"
          >
            {t('notFoundTitle')}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            {t('notFoundDescription', counts)}
          </p>
        </div>

        {invalidPath && (
          <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] overflow-x-auto">
            <span>{t('notFoundPathLabel')}</span>
            <code className="text-[var(--text-primary)] font-semibold">{invalidPath}</code>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('platforms')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--link-academic)] text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span>{t('notFoundBtnPlatforms', counts)}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('federated')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--divider)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-[var(--link-academic)]" aria-hidden="true" />
            <span>{t('notFoundBtnFederated', counts)}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('saved')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--divider)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[var(--meta-green)]" aria-hidden="true" />
            <span>{t('notFoundBtnSaved')}</span>
          </button>

          {onFocusSearch && (
            <button
              type="button"
              onClick={() => {
                onNavigateTab('platforms');
                setTimeout(() => onFocusSearch(), 60);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--divider)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>{t('notFoundBtnSearch')}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
