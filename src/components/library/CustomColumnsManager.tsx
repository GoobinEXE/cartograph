import { Plus, X } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import type { CustomExtractionColumn } from '../../types/academic';

interface CustomColumnsManagerProps {
  customColumns: CustomExtractionColumn[];
  /** Draft label, owned by the toolbar so it survives hiding the manager. */
  newColLabel: string;
  onNewColLabelChange: (label: string) => void;
  onSaveColumns: (columns: CustomExtractionColumn[]) => void;
}

/** Adds and removes the researcher's own extraction columns (matrix inputs and CSV/Markdown export). */
export function CustomColumnsManager({
  customColumns,
  newColLabel,
  onNewColLabelChange,
  onSaveColumns,
}: CustomColumnsManagerProps) {
  const { t } = useI18n();

  return (
    <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
          {t('customColsManagerTitle')}
        </h4>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const label = newColLabel.trim();
          if (!label) return;
          const id =
            label
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '') || `col_${Date.now()}`;
          const uniqueId = customColumns.some((c) => c.id === id)
            ? `${id}_${Date.now().toString().slice(-4)}`
            : id;
          onSaveColumns([...customColumns, { id: uniqueId, label }]);
          onNewColLabelChange('');
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          value={newColLabel}
          onChange={(e) => onNewColLabelChange(e.target.value)}
          placeholder={t('customColNamePlaceholder')}
          aria-label={t('customColNamePlaceholder')}
          className="flex-1 min-w-[200px] min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />
        <button
          type="submit"
          className="min-h-11 md:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2 md:py-1.5 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{t('customColAddBtn')}</span>
        </button>
      </form>
      {customColumns.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">{t('customColEmpty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {customColumns.map((col) => (
            <span
              key={col.id}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs font-medium text-[var(--text-primary)]"
            >
              <span>{col.label}</span>
              <button
                type="button"
                onClick={() => onSaveColumns(customColumns.filter((c) => c.id !== col.id))}
                className="min-w-9 min-h-9 inline-flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-subtle)] cursor-pointer"
                aria-label={`Remove ${col.label}`}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
