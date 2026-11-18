import { ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import type {
  ExtractedPaperMetadata,
  QualityAppraisalResult,
  QualityRating,
  QualityToolId,
  SavedPaperItem,
} from '../../types/academic';
import {
  computeOverallQuality,
  createEmptyQualityAppraisal,
  getQualityChecklistDefinition,
  getQualityRatingLabel,
} from '../../utils/qualityChecklists';

/** Structured-abstract variables (objective, methods, sample, results, conclusion) of one paper. */
export function ExtractedVariablesPanel({ meta }: { meta: ExtractedPaperMetadata }) {
  const { t } = useI18n();
  return (
    <div className="mt-2.5 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--divider)] space-y-2 text-[13.5px] md:text-[13px] leading-relaxed">
      {meta.objective && (
        <div>
          <span className="font-semibold text-[var(--text-primary)]">
            {t('labelObjective')}{' '}
          </span>
          <span className="text-[var(--text-secondary)]">
            {meta.objective}
          </span>
        </div>
      )}
      {meta.methods && (
        <div>
          <span className="font-semibold text-[var(--text-primary)]">
            {t('labelMethodsDesign')}{' '}
          </span>
          <span className="text-[var(--text-secondary)]">
            {meta.methods}
          </span>
        </div>
      )}
      {meta.sampleSize && (
        <div>
          <span className="font-semibold text-[var(--text-primary)]">
            {t('labelSampleParticipants')}{' '}
          </span>
          <span className="text-[var(--text-secondary)]">
            {meta.sampleSize}
          </span>
        </div>
      )}
      {meta.results && (
        <div>
          <span className="font-semibold text-[var(--text-primary)]">
            {t('labelResults')}{' '}
          </span>
          <span className="text-[var(--text-secondary)]">
            {meta.results}
          </span>
        </div>
      )}
      {meta.conclusion && (
        <div>
          <span className="font-semibold text-[var(--text-primary)]">
            {t('labelConclusion')}{' '}
          </span>
          <span className="text-[var(--text-secondary)]">
            {meta.conclusion}
          </span>
        </div>
      )}
      {!meta.objective &&
        !meta.methods &&
        !meta.results &&
        !meta.conclusion && (
          <div className="text-[var(--text-muted)] italic">
            {t('noStructuredSectionsNotice')}
          </div>
        )}
    </div>
  );
}

interface QualityAppraisalSectionProps {
  item: SavedPaperItem;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onChange: (appraisal: QualityAppraisalResult) => void;
}

/** Quality appraisal checklist (Cochrane RoB 2, JBI quasi-experimental, CASP qualitative). */
export function QualityAppraisalSection({
  item,
  isExpanded,
  onToggleExpanded,
  onChange,
}: QualityAppraisalSectionProps) {
  const { language, t } = useI18n();
  const currentAppraisal = item.qualityAppraisal || createEmptyQualityAppraisal('rob2');

  const ratingOptions: ReadonlyArray<{
    value: QualityRating;
    label: string;
    activeClass: string;
  }> = [
    {
      value: 'low',
      label: t('qualityScoreLow'),
      activeClass: 'bg-emerald-600 text-white border-emerald-600',
    },
    {
      value: 'some_concerns',
      label: t('qualityScoreSome'),
      activeClass: 'bg-amber-600 text-white border-amber-600',
    },
    {
      value: 'high',
      label: t('qualityScoreHigh'),
      activeClass: 'bg-rose-600 text-white border-rose-600',
    },
    {
      value: 'unclear',
      label: t('qualityScoreUnclear'),
      activeClass:
        'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] border-[var(--btn-primary-bg)]',
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
          className="min-h-10 md:min-h-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t('qualityAppraisalBtn')}</span>
        </button>
        {item.qualityAppraisal && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              item.qualityAppraisal.overall === 'low'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : item.qualityAppraisal.overall === 'high'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            }`}
          >
            {item.qualityAppraisal.tool.toUpperCase()} ·{' '}
            {getQualityRatingLabel(item.qualityAppraisal.overall, language)}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2.5 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--divider)] space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                {t('qualityToolLabel')}
              </span>
              <select
                value={currentAppraisal.tool}
                onChange={(e) =>
                  onChange(createEmptyQualityAppraisal(e.target.value as QualityToolId))
                }
                aria-label={t('qualityToolLabel')}
                className="min-h-10 md:min-h-0 px-2.5 py-1.5 md:py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-xs text-[var(--text-primary)] font-medium cursor-pointer"
              >
                <option value="rob2">Cochrane RoB 2</option>
                <option value="jbi_quasi">JBI Quasi-Experimental</option>
                <option value="casp_qual">CASP Qualitative</option>
              </select>
            </div>
            <span className="font-semibold text-[var(--text-primary)]">
              {t('qualityOverallLabel')}{' '}
              {getQualityRatingLabel(currentAppraisal.overall, language)}
            </span>
          </div>

          <div className="space-y-3">
            {getQualityChecklistDefinition(currentAppraisal.tool, language).criteria.map(
              (criterion) => {
                const currentRating: QualityRating =
                  currentAppraisal.criteria[criterion.id] || 'unclear';
                return (
                  <div
                    key={criterion.id}
                    className="space-y-2 pt-2.5 border-t border-[var(--divider)]"
                  >
                    <span className="block text-[13px] md:text-xs font-medium text-[var(--text-secondary)] leading-snug">
                      {criterion.label}
                    </span>
                    <div
                      role="group"
                      aria-label={criterion.label}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                    >
                      {ratingOptions.map((opt) => {
                        const isSelected = currentRating === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              const nextCriteria: Record<string, QualityRating> = {
                                ...currentAppraisal.criteria,
                                [criterion.id]: opt.value,
                              };
                              onChange({
                                ...currentAppraisal,
                                criteria: nextCriteria,
                                overall: computeOverallQuality(nextCriteria),
                                updatedAt: new Date().toISOString(),
                              });
                            }}
                            className={`min-h-10 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-center leading-tight ${
                              isSelected
                                ? opt.activeClass
                                : 'bg-[var(--bg-secondary)] border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
