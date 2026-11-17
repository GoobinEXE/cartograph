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
    <div className="mt-2.5 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--divider)] space-y-2 text-[13px]">
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
export function QualityAppraisalSection({ item, isExpanded, onToggleExpanded, onChange }: QualityAppraisalSectionProps) {
  const { language, t } = useI18n();
  const currentAppraisal = item.qualityAppraisal || createEmptyQualityAppraisal('rob2');

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--link-academic)] hover:underline cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
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
            {getQualityRatingLabel(
              item.qualityAppraisal.overall,
              language
            )}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2.5 p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--divider)] space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                {t('qualityToolLabel')}
              </span>
              <select
                value={currentAppraisal.tool}
                onChange={(e) => onChange(createEmptyQualityAppraisal(e.target.value as QualityToolId))}
                className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] font-medium cursor-pointer"
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

          <div className="space-y-2">
            {getQualityChecklistDefinition(currentAppraisal.tool, language).criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 border-t border-[var(--divider)]"
              >
                <span className="text-[var(--text-secondary)]">
                  {criterion.label}
                </span>
                <select
                  value={currentAppraisal.criteria[criterion.id] || 'unclear'}
                  onChange={(e) => {
                    const nextCriteria = {
                      ...currentAppraisal.criteria,
                      [criterion.id]: e.target.value as QualityRating,
                    };
                    onChange({
                      ...currentAppraisal,
                      criteria: nextCriteria,
                      overall: computeOverallQuality(nextCriteria),
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] shrink-0 cursor-pointer"
                >
                  <option value="low">{t('qualityScoreLow')}</option>
                  <option value="some_concerns">{t('qualityScoreSome')}</option>
                  <option value="high">{t('qualityScoreHigh')}</option>
                  <option value="unclear">{t('qualityScoreUnclear')}</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
