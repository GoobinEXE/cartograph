import React from 'react';
import { BooleanQueryState } from '../types/academic';
import { compileBooleanQuery } from '../utils/queryBuilder';
import { useI18n } from '../i18n/context';
import { SlidersHorizontal, Sparkles, RotateCcw, Check } from 'lucide-react';

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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {t('bbTitle')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('bbSubtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('bbClear')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            {t('bbMainConcept')}
          </label>
          <input
            type="text"
            value={state.mainConcept}
            onChange={(e) => onChange({ ...state, mainConcept: e.target.value })}
            placeholder={t('bbMainConceptPh')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">
            {t('bbAndTerms')}
          </label>
          <input
            type="text"
            value={state.andTerms}
            onChange={(e) => onChange({ ...state, andTerms: e.target.value })}
            placeholder={t('bbAndTermsPh')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1.5">
            {t('bbOrTerms')}
          </label>
          <input
            type="text"
            value={state.orTerms}
            onChange={(e) => onChange({ ...state, orTerms: e.target.value })}
            placeholder={t('bbOrTermsPh')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
            {t('bbExactPhrase')}
          </label>
          <input
            type="text"
            value={state.exactPhrase}
            onChange={(e) => onChange({ ...state, exactPhrase: e.target.value })}
            placeholder={t('bbExactPhrasePh')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1.5">
            {t('bbNotTerms')}
          </label>
          <input
            type="text"
            value={state.notTerms}
            onChange={(e) => onChange({ ...state, notTerms: e.target.value })}
            placeholder={t('bbNotTermsPh')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
              {t('bbStartYear')}
            </label>
            <select
              value={state.yearFrom}
              onChange={(e) => onChange({ ...state, yearFrom: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">{t('bbAnyYear')}</option>
              <option value="2025">{t('bbFromYear', { year: 2025 })}</option>
              <option value="2024">{t('bbFromYear', { year: 2024 })}</option>
              <option value="2022">{t('bbFromYear', { year: 2022 })}</option>
              <option value="2020">{t('bbFromYear', { year: 2020 })}</option>
              <option value="2015">{t('bbFromYear', { year: 2015 })}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1.5">
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
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="any">{t('bbAllDesigns')}</option>
              <option value="systematic-review">{t('bbSystematicReview')}</option>
              <option value="rct">{t('bbRct')}</option>
              <option value="empirical-causal">{t('bbEmpiricalCausal')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5">
        <div className="flex items-center gap-2.5 overflow-x-auto">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">{t('bbCompiledString')}</span>
          <code className="text-xs text-cyan-300 font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            {compiledPreview || t('bbCompiledEmpty')}
          </code>
        </div>
        <button
          type="button"
          disabled={!compiledPreview}
          onClick={() => onApplyCompiledQuery(compiledPreview)}
          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            compiledPreview
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer shadow-sm'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4" />
          {t('bbApplyBtn')}
        </button>
      </div>
    </div>
  );
};
