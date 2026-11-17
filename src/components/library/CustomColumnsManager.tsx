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
              .replace(/[̀-ͯ]/g, '')
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
          className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--divider)] text-xs font-medium text-[var(--text-primary)]"
            >
              <span>{col.label}</span>
              <button
                type="button"
                onClick={() => onSaveColumns(customColumns.filter((c) => c.id !== col.id))}
                className="text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                aria-label={`Remove ${col.label}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
