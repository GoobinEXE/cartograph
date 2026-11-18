import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BooleanQueryState } from '../types/academic';
import {
  compileBooleanQuery,
  compilePicoQuery,
  PicoFramework,
  PicoQueryFields,
  QueryDialect,
  translateQueryToDialect,
} from '../utils/queryBuilder';
import { copyTextSafely } from '../utils/fileDownload';
import { useI18n } from '../i18n/context';
import {
  formatMeshInsertionTerm,
  MeshDescriptorSuggestion,
  suggestMeshTerms,
} from '../services/meshSuggest';
import { MobileSheet } from './ui/MobileSheet';
import { Check, Copy, Loader2, RotateCcw, Sparkles } from 'lucide-react';

interface BooleanBuilderDrawerProps {
  state: BooleanQueryState;
  onChange: (next: BooleanQueryState) => void;
  onApplyCompiledQuery: (compiled: string) => void;
  onClose?: () => void;
}

type BooleanTextFieldKey = 'mainConcept' | 'andTerms' | 'orTerms' | 'exactPhrase' | 'notTerms';
type PicoTextFieldKey =
  | 'population'
  | 'interventionOrExposure'
  | 'comparison'
  | 'outcomeOrContext';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChangeMedia = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', onChangeMedia);
    return () => media.removeEventListener('change', onChangeMedia);
  }, [query]);

  return matches;
}

export const BooleanBuilderDrawer: React.FC<BooleanBuilderDrawerProps> = ({
  state,
  onChange,
  onApplyCompiledQuery,
  onClose,
}) => {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 767.98px)');

  const [builderMode, setBuilderMode] = useState<'boolean' | 'pico'>('boolean');
  const [picoFields, setPicoFields] = useState<PicoQueryFields>({
    framework: 'pico',
    population: '',
    interventionOrExposure: '',
    comparison: '',
    outcomeOrContext: '',
  });
  const [activeBooleanField, setActiveBooleanField] =
    useState<BooleanTextFieldKey>('mainConcept');
  const [activePicoField, setActivePicoField] = useState<PicoTextFieldKey>('population');
  const [meshTargetBoolean, setMeshTargetBoolean] = useState<
    'orTerms' | 'andTerms' | 'mainConcept' | 'notTerms'
  >('orTerms');
  const [meshTargetPico, setMeshTargetPico] =
    useState<PicoTextFieldKey>('interventionOrExposure');
  const [meshToast, setMeshToast] = useState<string | null>(null);

  const [dialect, setDialect] = useState<QueryDialect>('generic');
  const [dialectCopied, setDialectCopied] = useState(false);
  const [meshQuery, setMeshQuery] = useState('');
  const [meshLoading, setMeshLoading] = useState(false);
  const [meshSuggestions, setMeshSuggestions] = useState<MeshDescriptorSuggestion[] | null>(null);
  const [meshError, setMeshError] = useState<string | null>(null);

  const inputRefs = useRef<Partial<Record<BooleanTextFieldKey | PicoTextFieldKey, HTMLInputElement | null>>>({});
  const meshToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (meshToastTimerRef.current !== null) {
        window.clearTimeout(meshToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (picoFields.framework === 'pcc' && meshTargetPico === 'comparison') {
      setMeshTargetPico('interventionOrExposure');
    }
    if (picoFields.framework === 'pcc' && activePicoField === 'comparison') {
      setActivePicoField('population');
    }
  }, [picoFields.framework, meshTargetPico, activePicoField]);

  const booleanFieldLabels = useMemo<Record<BooleanTextFieldKey, string>>(
    () => ({
      mainConcept: t('bbMainConcept'),
      andTerms: t('bbAndTerms'),
      orTerms: t('bbOrTerms'),
      exactPhrase: t('bbExactPhrase'),
      notTerms: t('bbNotTerms'),
    }),
    [t]
  );

  const picoFieldLabels = useMemo<Record<PicoTextFieldKey, string>>(
    () => ({
      population: t('picoPopulationLabel'),
      interventionOrExposure:
        picoFields.framework === 'peco'
          ? t('picoExposureLabel')
          : picoFields.framework === 'pcc'
          ? t('picoConceptLabel')
          : t('picoInterventionLabel'),
      comparison: t('picoComparisonLabel'),
      outcomeOrContext:
        picoFields.framework === 'pcc' ? t('picoContextLabel') : t('picoOutcomeLabel'),
    }),
    [t, picoFields.framework]
  );

  const focusAndPlaceCaret = (fieldKey: BooleanTextFieldKey | PicoTextFieldKey, caretPos: number) => {
    window.requestAnimationFrame(() => {
      const el = inputRefs.current[fieldKey];
      if (!el) return;
      el.focus({ preventScroll: true });
      try {
        el.setSelectionRange(caretPos, caretPos);
      } catch {
        // Ignore selection errors on unsupported input types
      }
    });
  };

  const insertTokenIntoField = (
    fieldKey: BooleanTextFieldKey | PicoTextFieldKey,
    currentValue: string,
    updateValue: (next: string) => void,
    mode: 'comma' | 'quote'
  ) => {
    const el = inputRefs.current[fieldKey];
    const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : currentValue.length;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : currentValue.length;

    if (mode === 'quote') {
      const selected = currentValue.slice(start, end);
      const wrapped = `"${selected}"`;
      const next = currentValue.slice(0, start) + wrapped + currentValue.slice(end);
      updateValue(next);
      const nextCaret = selected ? start + wrapped.length : start + 1;
      focusAndPlaceCaret(fieldKey, nextCaret);
      return;
    }

    const trimmedEnd = currentValue.trimEnd();
    if (!trimmedEnd) {
      focusAndPlaceCaret(fieldKey, 0);
      return;
    }
    const next = trimmedEnd.endsWith(',') ? `${trimmedEnd} ` : `${trimmedEnd}, `;
    updateValue(next);
    focusAndPlaceCaret(fieldKey, next.length);
  };

  const insertRawAtCaret = (
    fieldKey: BooleanTextFieldKey | PicoTextFieldKey,
    currentValue: string,
    updateValue: (next: string) => void,
    rawToken: string
  ) => {
    const el = inputRefs.current[fieldKey];
    const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : currentValue.length;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : currentValue.length;
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    const cleanToken = rawToken.trim();
    const prefix = before.length === 0 || /\s$/.test(before) ? '' : ' ';
    const suffix = after.length === 0 || /^\s/.test(after) ? ' ' : ' ';
    const insertion = `${prefix}${cleanToken}${suffix}`;
    const next = `${before}${insertion}${after}`;
    updateValue(next);
    focusAndPlaceCaret(fieldKey, before.length + insertion.length);
  };

  const handleChipAction = (chip: 'and' | 'or' | 'not' | 'phrase') => {
    if (builderMode === 'pico') {
      const currentVal = picoFields[activePicoField];
      const updatePico = (next: string) =>
        setPicoFields((prev) => ({ ...prev, [activePicoField]: next }));

      if (chip === 'phrase') {
        insertTokenIntoField(activePicoField, currentVal, updatePico, 'quote');
        return;
      }
      if (chip === 'or') {
        insertRawAtCaret(activePicoField, currentVal, updatePico, 'OR');
        return;
      }
      if (chip === 'and') {
        const order: PicoTextFieldKey[] =
          picoFields.framework === 'pcc'
            ? ['population', 'interventionOrExposure', 'outcomeOrContext']
            : ['population', 'interventionOrExposure', 'comparison', 'outcomeOrContext'];
        const currentIdx = order.indexOf(activePicoField);
        const nextKey = order[(currentIdx + 1) % order.length];
        setActivePicoField(nextKey);
        focusAndPlaceCaret(nextKey, picoFields[nextKey].length);
      }
      return;
    }

    const currentVal = state[activeBooleanField];
    const updateBoolField = (field: BooleanTextFieldKey, next: string) =>
      onChange({ ...state, [field]: next });

    if (chip === 'phrase') {
      insertTokenIntoField(
        activeBooleanField,
        currentVal,
        (next) => updateBoolField(activeBooleanField, next),
        'quote'
      );
      return;
    }

    if (chip === 'and') {
      if (activeBooleanField === 'mainConcept') {
        insertRawAtCaret(
          'mainConcept',
          state.mainConcept,
          (next) => updateBoolField('mainConcept', next),
          'AND'
        );
      } else {
        setActiveBooleanField('andTerms');
        insertTokenIntoField(
          'andTerms',
          state.andTerms,
          (next) => updateBoolField('andTerms', next),
          'comma'
        );
      }
      return;
    }

    if (chip === 'or') {
      if (activeBooleanField === 'mainConcept') {
        insertRawAtCaret(
          'mainConcept',
          state.mainConcept,
          (next) => updateBoolField('mainConcept', next),
          'OR'
        );
      } else {
        setActiveBooleanField('orTerms');
        insertTokenIntoField(
          'orTerms',
          state.orTerms,
          (next) => updateBoolField('orTerms', next),
          'comma'
        );
      }
      return;
    }

    if (chip === 'not') {
      if (activeBooleanField === 'mainConcept') {
        insertRawAtCaret(
          'mainConcept',
          state.mainConcept,
          (next) => updateBoolField('mainConcept', next),
          'NOT'
        );
      } else {
        setActiveBooleanField('notTerms');
        insertTokenIntoField(
          'notTerms',
          state.notTerms,
          (next) => updateBoolField('notTerms', next),
          'comma'
        );
      }
    }
  };

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

  const showMeshInsertedFeedback = (heading: string, fieldLabel: string) => {
    setMeshToast(t('booleanMeshInsertedToast', { term: heading, field: fieldLabel }));
    if (meshToastTimerRef.current !== null) {
      window.clearTimeout(meshToastTimerRef.current);
    }
    meshToastTimerRef.current = window.setTimeout(() => {
      setMeshToast(null);
    }, 2600);
  };

  const handleInsertMeshTerm = (heading: string) => {
    const term = formatMeshInsertionTerm(heading);
    if (builderMode === 'pico') {
      const target =
        picoFields.framework === 'pcc' && meshTargetPico === 'comparison'
          ? 'interventionOrExposure'
          : meshTargetPico;
      const prev = picoFields[target].trim();
      setPicoFields({
        ...picoFields,
        [target]: prev ? `${prev}, ${term}` : term,
      });
      showMeshInsertedFeedback(heading, picoFieldLabels[target]);
      return;
    }

    const prev = state[meshTargetBoolean].trim();
    const separator = meshTargetBoolean === 'mainConcept' ? ' ' : ', ';
    onChange({
      ...state,
      [meshTargetBoolean]: prev ? `${prev}${separator}${term}` : term,
    });
    showMeshInsertedFeedback(heading, booleanFieldLabels[meshTargetBoolean]);
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
    const ok = await copyTextSafely(dialectPreview);
    if (ok) {
      setDialectCopied(true);
      setTimeout(() => setDialectCopied(false), 1800);
    }
  };

  const handleApply = () => {
    if (!activeCompiledPreview) return;
    onApplyCompiledQuery(activeCompiledPreview);
    if (isMobile) {
      onClose?.();
    }
  };

  const resetButton = (
    <button
      type="button"
      onClick={handleReset}
      className="inline-flex items-center gap-1 min-h-10 md:min-h-0 px-2.5 md:px-2 py-1 rounded-lg text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
    >
      <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{t('bbClear')}</span>
    </button>
  );

  const modeSwitcher = (
    <div className="inline-flex items-center gap-1 bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent p-0.5 rounded-lg">
      <button
        type="button"
        onClick={() => setBuilderMode('boolean')}
        className={`min-h-9 md:min-h-0 px-3 md:px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors touch-manipulation ${
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
        className={`min-h-9 md:min-h-0 px-3 md:px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors touch-manipulation ${
          builderMode === 'pico'
            ? 'bg-[var(--bg-secondary)] text-[var(--link-academic)] shadow-xs'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        {t('picoBuilderTab')}
      </button>
    </div>
  );

  const operatorChipsStrip = (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-2.5">
      <button
        type="button"
        onClick={() => handleChipAction('and')}
        className="min-h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-semibold font-mono text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] shrink-0 cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        {t('booleanChipAnd')}
      </button>
      <button
        type="button"
        onClick={() => handleChipAction('or')}
        className="min-h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-semibold font-mono text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] shrink-0 cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        {t('booleanChipOr')}
      </button>
      <button
        type="button"
        disabled={builderMode === 'pico'}
        onClick={() => handleChipAction('not')}
        className="min-h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-semibold font-mono text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        {t('booleanChipNot')}
      </button>
      <button
        type="button"
        onClick={() => handleChipAction('phrase')}
        className="min-h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--divider)] text-xs font-semibold font-mono text-[var(--meta-green)] hover:bg-[var(--bg-subtle)] shrink-0 cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        {t('booleanChipExactPhrase')}
      </button>
    </div>
  );

  const builderBody = (
    <>
      {isMobile && <div className="mb-3 flex items-center justify-between gap-2">{modeSwitcher}</div>}

      {operatorChipsStrip}

      {builderMode === 'pico' ? (
        <div className="space-y-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['pico', 'peco', 'pcc'] as PicoFramework[]).map((fw) => (
              <button
                key={fw}
                type="button"
                onClick={() => setPicoFields({ ...picoFields, framework: fw })}
                className={`min-h-10 md:min-h-0 px-3 py-1.5 md:py-1 rounded-lg text-xs font-semibold uppercase cursor-pointer transition-colors touch-manipulation ${
                  picoFields.framework === fw
                    ? 'bg-[var(--link-academic)] text-white'
                    : 'bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
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
                ref={(el) => {
                  inputRefs.current.population = el;
                }}
                type="text"
                value={picoFields.population}
                onFocus={() => setActivePicoField('population')}
                onChange={(e) =>
                  setPicoFields({ ...picoFields, population: e.target.value })
                }
                placeholder={t('picoPopulationPh')}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {picoFieldLabels.interventionOrExposure}
              </label>
              <input
                ref={(el) => {
                  inputRefs.current.interventionOrExposure = el;
                }}
                type="text"
                value={picoFields.interventionOrExposure}
                onFocus={() => setActivePicoField('interventionOrExposure')}
                onChange={(e) =>
                  setPicoFields({
                    ...picoFields,
                    interventionOrExposure: e.target.value,
                  })
                }
                placeholder={t('picoInterventionPh')}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
              />
            </div>

            {picoFields.framework !== 'pcc' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {t('picoComparisonLabel')}
                </label>
                <input
                  ref={(el) => {
                    inputRefs.current.comparison = el;
                  }}
                  type="text"
                  value={picoFields.comparison}
                  onFocus={() => setActivePicoField('comparison')}
                  onChange={(e) =>
                    setPicoFields({ ...picoFields, comparison: e.target.value })
                  }
                  placeholder={t('picoComparisonPh')}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {picoFieldLabels.outcomeOrContext}
              </label>
              <input
                ref={(el) => {
                  inputRefs.current.outcomeOrContext = el;
                }}
                type="text"
                value={picoFields.outcomeOrContext}
                onFocus={() => setActivePicoField('outcomeOrContext')}
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
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
              ref={(el) => {
                inputRefs.current.mainConcept = el;
              }}
              type="text"
              value={state.mainConcept}
              onFocus={() => setActiveBooleanField('mainConcept')}
              onChange={(e) => onChange({ ...state, mainConcept: e.target.value })}
              placeholder={t('bbMainConceptPh')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('bbAndTerms')} <span className="text-[var(--text-muted)] font-mono">(AND)</span>
            </label>
            <input
              ref={(el) => {
                inputRefs.current.andTerms = el;
              }}
              type="text"
              value={state.andTerms}
              onFocus={() => setActiveBooleanField('andTerms')}
              onChange={(e) => onChange({ ...state, andTerms: e.target.value })}
              placeholder={t('bbAndTermsPh')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('bbOrTerms')} <span className="text-[var(--text-muted)] font-mono">(OR)</span>
            </label>
            <input
              ref={(el) => {
                inputRefs.current.orTerms = el;
              }}
              type="text"
              value={state.orTerms}
              onFocus={() => setActiveBooleanField('orTerms')}
              onChange={(e) => onChange({ ...state, orTerms: e.target.value })}
              placeholder={t('bbOrTermsPh')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('bbExactPhrase')}
            </label>
            <input
              ref={(el) => {
                inputRefs.current.exactPhrase = el;
              }}
              type="text"
              value={state.exactPhrase}
              onFocus={() => setActiveBooleanField('exactPhrase')}
              onChange={(e) => onChange({ ...state, exactPhrase: e.target.value })}
              placeholder={t('bbExactPhrasePh')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('bbNotTerms')} <span className="text-[var(--text-muted)] font-mono">(NOT)</span>
            </label>
            <input
              ref={(el) => {
                inputRefs.current.notTerms = el;
              }}
              type="text"
              value={state.notTerms}
              onFocus={() => setActiveBooleanField('notTerms')}
              onChange={(e) => onChange({ ...state, notTerms: e.target.value })}
              placeholder={t('bbNotTermsPh')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--link-academic)]/25"
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
                className="w-full min-h-11 md:min-h-0 px-2 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] cursor-pointer"
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
                className="w-full min-h-11 md:min-h-0 px-2 py-2 md:py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] md:border-transparent text-base md:text-[13px] text-[var(--text-primary)] cursor-pointer"
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

      <div className="space-y-2.5">
        {/* NCBI MeSH Controlled Vocabulary Suggester */}
        <div className="bg-[var(--bg-canvas)] rounded-xl md:rounded-lg px-3 py-2.5 md:py-2 border border-[var(--divider)] space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[var(--link-academic)]" aria-hidden="true" />
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              className="flex-1 min-w-[180px] min-h-11 md:min-h-0 px-2.5 py-2 md:py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] md:border-transparent text-base md:text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
            <button
              type="button"
              disabled={meshLoading || meshQuery.trim().length < 2}
              onClick={() => void handleFetchMesh()}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 md:min-h-0 px-3 md:px-2.5 py-2 md:py-1 rounded-md text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] md:border-transparent text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer touch-manipulation"
            >
              {meshLoading && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
              <span>{t('meshSuggestBtn')}</span>
            </button>
          </div>

          {/* Explicit MeSH Target Field Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor="mesh-target-select"
                className="text-xs font-medium text-[var(--text-muted)] shrink-0"
              >
                {t('booleanMeshTargetLabel')}
              </label>
              {builderMode === 'pico' ? (
                <select
                  id="mesh-target-select"
                  value={meshTargetPico}
                  onChange={(e) => setMeshTargetPico(e.target.value as PicoTextFieldKey)}
                  className="min-h-10 md:min-h-0 px-2.5 py-1.5 md:py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-xs font-medium text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="population">{picoFieldLabels.population}</option>
                  <option value="interventionOrExposure">
                    {picoFieldLabels.interventionOrExposure}
                  </option>
                  {picoFields.framework !== 'pcc' && (
                    <option value="comparison">{picoFieldLabels.comparison}</option>
                  )}
                  <option value="outcomeOrContext">{picoFieldLabels.outcomeOrContext}</option>
                </select>
              ) : (
                <select
                  id="mesh-target-select"
                  value={meshTargetBoolean}
                  onChange={(e) =>
                    setMeshTargetBoolean(
                      e.target.value as 'orTerms' | 'andTerms' | 'mainConcept' | 'notTerms'
                    )
                  }
                  className="min-h-10 md:min-h-0 px-2.5 py-1.5 md:py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-xs font-medium text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="orTerms">{t('bbOrTerms')}</option>
                  <option value="andTerms">{t('bbAndTerms')}</option>
                  <option value="mainConcept">{t('bbMainConcept')}</option>
                  <option value="notTerms">{t('bbNotTerms')}</option>
                </select>
              )}
            </div>

            {meshToast && (
              <span
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--meta-green)]"
              >
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{meshToast}</span>
              </span>
            )}
          </div>

          {meshError && <div className="text-xs text-rose-500">{meshError}</div>}
          {meshSuggestions !== null && !meshError && (
            meshSuggestions.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">{t('meshEmptyResult')}</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {meshSuggestions.map((m) => (
                  <button
                    key={m.uid}
                    type="button"
                    title={m.scopeNote || m.heading}
                    onClick={() => handleInsertMeshTerm(m.heading)}
                    className="min-h-9 md:min-h-0 inline-flex items-center gap-1 px-2.5 md:px-2 py-1 md:py-0.5 rounded-full text-xs md:text-[11px] font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--link-academic)] hover:bg-[var(--bg-subtle)] cursor-pointer touch-manipulation"
                  >
                    <span>+ {m.heading}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Desktop Compiled Preview + Apply Bar (moved to MobileSheet footer on <768px) */}
        {!isMobile && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[var(--bg-canvas)] rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[13px] text-[var(--text-muted)] shrink-0">
                {t('bbCompiledString')}
              </span>
              <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
                <code className="text-[13px] text-[var(--text-primary)] font-mono whitespace-nowrap">
                  {activeCompiledPreview || t('bbCompiledEmpty')}
                </code>
              </div>
            </div>
            <button
              type="button"
              disabled={!activeCompiledPreview}
              onClick={handleApply}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-opacity shrink-0 cursor-pointer ${
                activeCompiledPreview
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{builderMode === 'pico' ? t('picoApplyBtn') : t('bbApplyBtn')}</span>
            </button>
          </div>
        )}

        {/* Database Syntax Dialect Translator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[var(--bg-canvas)] rounded-xl md:rounded-lg px-3 py-2.5 md:py-2 border border-[var(--divider)]">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0 flex-1">
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
              className="min-h-10 md:min-h-0 px-2.5 md:px-2 py-1.5 md:py-1 rounded-md text-base md:text-xs bg-[var(--bg-secondary)] border border-[var(--divider)] md:border-transparent text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              <option value="generic">Generic Boolean</option>
              <option value="pubmed">PubMed / MEDLINE</option>
              <option value="scopus">Scopus</option>
              <option value="wos">Web of Science</option>
              <option value="arxiv">arXiv</option>
              <option value="ieee">IEEE Xplore</option>
            </select>
            <div className="w-full sm:w-auto flex-1 min-w-0 overflow-x-auto no-scrollbar">
              <code className="text-xs text-[var(--text-primary)] font-mono whitespace-nowrap">
                {dialectPreview || t('bbCompiledEmpty')}
              </code>
            </div>
          </div>
          <button
            type="button"
            disabled={!dialectPreview}
            onClick={() => void handleCopyDialect()}
            className="min-h-10 md:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 md:px-2.5 py-2 md:py-1 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--divider)] md:border-transparent text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0 touch-manipulation"
          >
            {dialectCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
            )}
            <span>{t('dialectCopyBtn')}</span>
          </button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    const mobileFooter = (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 min-w-0 bg-[var(--bg-secondary)] border border-[var(--divider)] rounded-xl px-3 py-2">
          <span className="text-xs text-[var(--text-muted)] shrink-0">
            {t('bbCompiledString')}
          </span>
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <code className="text-[13px] text-[var(--text-primary)] font-mono whitespace-nowrap">
              {activeCompiledPreview || t('bbCompiledEmpty')}
            </code>
          </div>
        </div>
        <button
          type="button"
          disabled={!activeCompiledPreview}
          onClick={handleApply}
          className={`min-h-12 w-full inline-flex items-center justify-center gap-2 px-4 rounded-xl text-[15px] font-semibold transition-opacity touch-manipulation select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
            activeCompiledPreview
              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{builderMode === 'pico' ? t('picoApplyBtn') : t('bbApplyBtn')}</span>
        </button>
      </div>
    );

    return (
      <MobileSheet
        open={true}
        onClose={() => onClose?.()}
        initialSnap="full"
        mobileBreakpoint="md"
        title={t('bbTitle')}
        subtitle={t('bbSubtitle')}
        closeLabel={t('mobileCloseSheetBtn')}
        dragHandleLabel={t('mobileDragHandleLabel')}
        headerActions={resetButton}
        footer={mobileFooter}
        bodyClassName="bg-[var(--bg-secondary)]/45"
      >
        {builderBody}
      </MobileSheet>
    );
  }

  return (
    <div className="mt-3 bg-[var(--bg-secondary)] rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            {t('bbTitle')}
          </h3>
          {modeSwitcher}
          <span className="text-xs text-[var(--text-muted)] hidden md:inline">
            {t('bbSubtitle')}
          </span>
        </div>
        {resetButton}
      </div>

      {builderBody}
    </div>
  );
};
