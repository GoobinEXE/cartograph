import React from 'react';
import { BooleanQueryState } from '../types/academic';
import { compileBooleanQuery } from '../utils/queryBuilder';
import { useI18n } from '../i18n/context';
import { RotateCcw, Check } from 'lucide-react';

interface BooleanBuilderDrawerProps {
  state: BooleanQueryState;
  onChange: (next: BooleanQueryState) => void;
  onApplyCompiledQuery: (compiled: string) => void;
}

export const BooleanBuilderDrawer: React.FC<BooleanBuilderDrawerProps> = ({
  state,
  onChange,
  onApplyCompiledQuery,
}) => {
  const { t } = useI18n();
  const compiledPreview = compileBooleanQuery(state);

  const handleReset = () => {
    onChange({
      mainConcept: '',
      andTerms: '',
      orTerms: '',
      notTerms: '',
      exactPhrase: '',
      yearFrom: '',
      studyDesign: 'any',
    });
  };

  return (
    <div className="mt-3 bg-[var(--bg-secondary)] rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">
            {t('bbTitle')}
          </h3>
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
            {t('bbSubtitle')}
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t('bbClear')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t('bbMainConcept')}
          </label>
          <input
            type="text"
            value={state.mainConcept}
            onChange={(e) => onChange({ ...state, mainConcept: e.target.value })}
            placeholder={t('bbMainConceptPh')}
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t('bbAndTerms')} <span className="text-[var(--text-muted)] font-mono">(AND)</span>
          </label>
          <input
            type="text"
            value={state.andTerms}
            onChange={(e) => onChange({ ...state, andTerms: e.target.value })}
            placeholder={t('bbAndTermsPh')}
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t('bbOrTerms')} <span className="text-[var(--text-muted)] font-mono">(OR)</span>
          </label>
          <input
            type="text"
            value={state.orTerms}
            onChange={(e) => onChange({ ...state, orTerms: e.target.value })}
            placeholder={t('bbOrTermsPh')}
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t('bbExactPhrase')}
          </label>
          <input
            type="text"
            value={state.exactPhrase}
            onChange={(e) => onChange({ ...state, exactPhrase: e.target.value })}
            placeholder={t('bbExactPhrasePh')}
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t('bbNotTerms')} <span className="text-[var(--text-muted)] font-mono">(NOT)</span>
          </label>
          <input
            type="text"
            value={state.notTerms}
            onChange={(e) => onChange({ ...state, notTerms: e.target.value })}
            placeholder={t('bbNotTermsPh')}
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 truncate">
              {t('bbStartYear')}
            </label>
            <select
              value={state.yearFrom}
              onChange={(e) => onChange({ ...state, yearFrom: e.target.value })}
              className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] cursor-pointer"
            >
              <option value="">{t('bbAnyYear')}</option>
              <option value="2025">Desde 2025</option>
              <option value="2024">Desde 2024</option>
              <option value="2022">Desde 2022</option>
              <option value="2020">Desde 2020</option>
              <option value="2015">Desde 2015</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 truncate">
              {t('bbStudyDesign')}
            </label>
            <select
              value={state.studyDesign}
              onChange={(e) =>
                onChange({
                  ...state,
                  studyDesign: e.target.value as BooleanQueryState['studyDesign'],
                })
              }
              className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] cursor-pointer"
            >
              <option value="any">{t('bbAllDesigns')}</option>
              <option value="systematic-review">{t('bbSystematicReview')}</option>
              <option value="rct">{t('bbRct')}</option>
              <option value="empirical-causal">{t('bbEmpiricalCausal')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[var(--bg-canvas)] rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0">
          <span className="text-xs text-[var(--text-muted)] shrink-0">{t('bbCompiledString')}</span>
          <code className="text-xs text-[var(--text-primary)] font-mono truncate">
            {compiledPreview || t('bbCompiledEmpty')}
          </code>
        </div>
        <button
          type="button"
          disabled={!compiledPreview}
          onClick={() => onApplyCompiledQuery(compiledPreview)}
          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-opacity shrink-0 cursor-pointer ${
            compiledPreview
              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t('bbApplyBtn')}</span>
        </button>
      </div>
    </div>
  );
};
