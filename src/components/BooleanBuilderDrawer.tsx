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
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
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
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('bbClear')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            {t('bbMainConcept')}
          </label>
          <input
            type="text"
            value={state.mainConcept}
            onChange={(e) => onChange({ ...state, mainConcept: e.target.value })}
            placeholder={t('bbMainConceptPh')}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <span>{t('bbAndTerms')}</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded">AND</span>
          </label>
          <input
            type="text"
            value={state.andTerms}
            onChange={(e) => onChange({ ...state, andTerms: e.target.value })}
            placeholder={t('bbAndTermsPh')}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <span>{t('bbOrTerms')}</span>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-1 rounded">OR</span>
          </label>
          <input
            type="text"
            value={state.orTerms}
            onChange={(e) => onChange({ ...state, orTerms: e.target.value })}
            placeholder={t('bbOrTermsPh')}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <span>{t('bbExactPhrase')}</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1 rounded">"..."</span>
          </label>
          <input
            type="text"
            value={state.exactPhrase}
            onChange={(e) => onChange({ ...state, exactPhrase: e.target.value })}
            placeholder={t('bbExactPhrasePh')}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <span>{t('bbNotTerms')}</span>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1 rounded">NOT</span>
          </label>
          <input
            type="text"
            value={state.notTerms}
            onChange={(e) => onChange({ ...state, notTerms: e.target.value })}
            placeholder={t('bbNotTermsPh')}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('bbStartYear')}
            </label>
            <select
              value={state.yearFrom}
              onChange={(e) => onChange({ ...state, yearFrom: e.target.value })}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-all"
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-all"
            >
              <option value="any">{t('bbAllDesigns')}</option>
              <option value="systematic-review">{t('bbSystematicReview')}</option>
              <option value="rct">{t('bbRct')}</option>
              <option value="empirical-causal">{t('bbEmpiricalCausal')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/90 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">{t('bbCompiledString')}</span>
          <code className="text-xs text-cyan-300 font-mono bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800/80 truncate">
            {compiledPreview || t('bbCompiledEmpty')}
          </code>
        </div>
        <button
          type="button"
          disabled={!compiledPreview}
          onClick={() => onApplyCompiledQuery(compiledPreview)}
          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            compiledPreview
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-950/50'
              : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t('bbApplyBtn')}</span>
        </button>
      </div>
    </div>
  );
};
