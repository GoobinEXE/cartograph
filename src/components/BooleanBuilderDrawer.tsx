import React, { useState } from 'react';
import { BooleanQueryState } from '../types/academic';
import {
  compileBooleanQuery,
  compilePicoQuery,
  PicoFramework,
  PicoQueryFields,
  QueryDialect,
  translateQueryToDialect,
} from '../utils/queryBuilder';
import { useI18n } from '../i18n/context';
import {
  formatMeshInsertionTerm,
  MeshDescriptorSuggestion,
  suggestMeshTerms,
} from '../services/meshSuggest';
import { RotateCcw, Check, Copy, Loader2, Sparkles } from 'lucide-react';

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
  const [builderMode, setBuilderMode] = useState<'boolean' | 'pico'>('boolean');
  const [picoFields, setPicoFields] = useState<PicoQueryFields>({
    framework: 'pico',
    population: '',
    interventionOrExposure: '',
    comparison: '',
    outcomeOrContext: '',
  });
  const [dialect, setDialect] = useState<QueryDialect>('generic');
  const [dialectCopied, setDialectCopied] = useState(false);
  const [meshQuery, setMeshQuery] = useState('');
  const [meshLoading, setMeshLoading] = useState(false);
  const [meshSuggestions, setMeshSuggestions] = useState<MeshDescriptorSuggestion[] | null>(null);
  const [meshError, setMeshError] = useState<string | null>(null);

  const handleFetchMesh = async () => {
    const q = meshQuery.trim();
    if (q.length < 2) return;
    setMeshLoading(true);
    setMeshError(null);
    const res = await suggestMeshTerms(q);
    setMeshLoading(false);
    if (!res.ok) {
      setMeshError(res.error || 'NCBI MeSH error');
      setMeshSuggestions([]);
      return;
    }
    setMeshSuggestions(res.terms);
  };

  const handleInsertMeshTerm = (heading: string) => {
    const term = formatMeshInsertionTerm(heading);
    if (builderMode === 'pico') {
      const prev = picoFields.interventionOrExposure.trim();
      setPicoFields({
        ...picoFields,
        interventionOrExposure: prev ? `${prev}, ${term}` : term,
      });
      return;
    }
    const prevOr = state.orTerms.trim();
    onChange({
      ...state,
      orTerms: prevOr ? `${prevOr}, ${term}` : term,
    });
  };

  const compiledPreview = compileBooleanQuery(state);
  const picoCompiledPreview = compilePicoQuery(picoFields);
  const activeCompiledPreview =
    builderMode === 'pico' ? picoCompiledPreview : compiledPreview;
  const dialectPreview = translateQueryToDialect(
    state,
    dialect,
    builderMode === 'pico' ? picoCompiledPreview : undefined
  );

  const handleReset = () => {
    if (builderMode === 'pico') {
      setPicoFields({
        framework: picoFields.framework,
        population: '',
        interventionOrExposure: '',
        comparison: '',
        outcomeOrContext: '',
      });
      return;
    }
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

  const handleCopyDialect = async () => {
    if (!dialectPreview) return;
    try {
      await navigator.clipboard.writeText(dialectPreview);
      setDialectCopied(true);
      setTimeout(() => setDialectCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="mt-3 bg-[var(--bg-secondary)] rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            {t('bbTitle')}
          </h3>
          <div className="inline-flex items-center gap-1 bg-[var(--bg-canvas)] p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setBuilderMode('boolean')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                builderMode === 'boolean'
                  ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              AND / OR / NOT
            </button>
            <button
              type="button"
              onClick={() => setBuilderMode('pico')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                builderMode === 'pico'
                  ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('picoBuilderTab')}
            </button>
          </div>
          <span className="text-xs text-[var(--text-muted)] hidden md:inline">
            {t('bbSubtitle')}
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('bbClear')}</span>
        </button>
      </div>

      {builderMode === 'pico' ? (
        <div className="space-y-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['pico', 'peco', 'pcc'] as PicoFramework[]).map((fw) => (
              <button
                key={fw}
                type="button"
                onClick={() => setPicoFields({ ...picoFields, framework: fw })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase cursor-pointer transition-colors ${
                  picoFields.framework === fw
                    ? 'bg-[var(--link-academic)] text-white'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {fw}
              </button>
            ))}
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              picoFields.framework === 'pcc' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            } gap-3`}
          >
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {t('picoPopulationLabel')}
              </label>
              <input
                type="text"
                value={picoFields.population}
                onChange={(e) =>
                  setPicoFields({ ...picoFields, population: e.target.value })
                }
                placeholder="ex.: older adults, adolescents"
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {picoFields.framework === 'peco'
                  ? t('picoExposureLabel')
                  : picoFields.framework === 'pcc'
                  ? t('picoConceptLabel')
                  : t('picoInterventionLabel')}
              </label>
              <input
                type="text"
                value={picoFields.interventionOrExposure}
                onChange={(e) =>
                  setPicoFields({
                    ...picoFields,
                    interventionOrExposure: e.target.value,
                  })
                }
                placeholder="ex.: telehealth, mindfulness"
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
              />
            </div>

            {picoFields.framework !== 'pcc' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {t('picoComparisonLabel')}
                </label>
                <input
                  type="text"
                  value={picoFields.comparison}
                  onChange={(e) =>
                    setPicoFields({ ...picoFields, comparison: e.target.value })
                  }
                  placeholder="ex.: placebo, usual care"
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {picoFields.framework === 'pcc'
                  ? t('picoContextLabel')
                  : t('picoOutcomeLabel')}
              </label>
              <input
                type="text"
                value={picoFields.outcomeOrContext}
                onChange={(e) =>
                  setPicoFields({
                    ...picoFields,
                    outcomeOrContext: e.target.value,
                  })
                }
                placeholder={
                  picoFields.framework === 'pcc'
                    ? 'ex.: primary care, Brazil'
                    : 'ex.: mortality, hospital readmission'
                }
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
              />
            </div>
          </div>
        </div>
      ) : (
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
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
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
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
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
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
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
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
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
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/20"
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
              className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] cursor-pointer"
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
              className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] cursor-pointer"
            >
              <option value="any">{t('bbAllDesigns')}</option>
              <option value="systematic-review">{t('bbSystematicReview')}</option>
              <option value="rct">{t('bbRct')}</option>
              <option value="empirical-causal">{t('bbEmpiricalCausal')}</option>
            </select>
          </div>
        </div>
      </div>
      )}

      <div className="space-y-2">
        {/* NCBI MeSH Controlled Vocabulary Suggester */}
        <div className="bg-[var(--bg-canvas)] rounded-lg px-3 py-2 border border-[var(--divider)] space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[var(--link-academic)]" />
              <span>{t('meshSuggesterTitle')}:</span>
            </span>
            <input
              type="text"
              value={meshQuery}
              onChange={(e) => setMeshQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleFetchMesh();
                }
              }}
              placeholder={t('meshSuggesterPh')}
              className="flex-1 min-w-[200px] px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
            <button
              type="button"
              disabled={meshLoading || meshQuery.trim().length < 2}
              onClick={() => void handleFetchMesh()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
            >
              {meshLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{t('meshSuggestBtn')}</span>
            </button>
          </div>
          {meshError && (
            <div className="text-[11px] text-rose-500">{meshError}</div>
          )}
          {meshSuggestions !== null && !meshError && (
            meshSuggestions.length === 0 ? (
              <div className="text-[11px] text-[var(--text-muted)]">
                {t('meshEmptyResult')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {meshSuggestions.map((m) => (
                  <button
                    key={m.uid}
                    type="button"
                    title={m.scopeNote || m.heading}
                    onClick={() => handleInsertMeshTerm(m.heading)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    <span>+ {m.heading}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[var(--bg-canvas)] rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto min-w-0">
            <span className="text-[13px] text-[var(--text-muted)] shrink-0">{t('bbCompiledString')}</span>
            <code className="text-[13px] text-[var(--text-primary)] font-mono truncate">
              {activeCompiledPreview || t('bbCompiledEmpty')}
            </code>
          </div>
          <button
            type="button"
            disabled={!activeCompiledPreview}
            onClick={() => onApplyCompiledQuery(activeCompiledPreview)}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-opacity shrink-0 cursor-pointer ${
              activeCompiledPreview
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{builderMode === 'pico' ? t('picoApplyBtn') : t('bbApplyBtn')}</span>
          </button>
        </div>

        {/* Database Syntax Dialect Translator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[var(--bg-canvas)] rounded-lg px-3 py-2 border border-[var(--divider)]">
          <div className="flex items-center gap-2 overflow-x-auto min-w-0">
            <label
              htmlFor="dialect-select"
              className="text-xs font-medium text-[var(--text-secondary)] shrink-0"
            >
              {t('dialectTranslatorLabel')}:
            </label>
            <select
              id="dialect-select"
              value={dialect}
              onChange={(e) => setDialect(e.target.value as QueryDialect)}
              className="px-2 py-1 rounded-md text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              <option value="generic">Generic Boolean</option>
              <option value="pubmed">PubMed / MEDLINE</option>
              <option value="scopus">Scopus</option>
              <option value="wos">Web of Science</option>
              <option value="arxiv">arXiv</option>
              <option value="ieee">IEEE Xplore</option>
            </select>
            <code className="text-xs text-[var(--text-primary)] font-mono truncate">
              {dialectPreview || t('bbCompiledEmpty')}
            </code>
          </div>
          <button
            type="button"
            disabled={!dialectPreview}
            onClick={handleCopyDialect}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0"
          >
            {dialectCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
            <span>{t('dialectCopyBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
