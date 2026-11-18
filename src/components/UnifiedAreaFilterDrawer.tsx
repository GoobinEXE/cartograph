import React, { useMemo } from 'react';
import { Globe } from 'lucide-react';
import { countSourcesForScope, mapAreaToSearchScope } from '../data/apiSources';
import {
  getLocalizedThematicAreas,
  PLATFORMS,
  THEMATIC_AREAS,
} from '../data/platforms';
import { useI18n } from '../i18n/context';
import { ThematicArea, UserAccessConfig } from '../types/academic';
import { renderAreaIcon } from '../utils/areaIcons';
import { CollapsibleSection } from './ui/CollapsibleSection';

interface UnifiedAreaFilterDrawerProps {
  selectedArea: 'all' | ThematicArea;
  onSelectArea: (area: 'all' | ThematicArea) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  mode: 'platforms' | 'metasearch';
  accessConfig?: UserAccessConfig;
}

/** Shared collapsible drawer unifying directory fields and metasearch API scope. */
export const UnifiedAreaFilterDrawer: React.FC<UnifiedAreaFilterDrawerProps> = ({
  selectedArea,
  onSelectArea,
  isOpen,
  onToggleOpen,
  mode,
  accessConfig,
}) => {
  const { t } = useI18n();
  const localizedThematicAreas = useMemo(() => getLocalizedThematicAreas(t), [t]);

  const countsByArea = useMemo(() => {
    const map: Record<'all' | ThematicArea, number> = {
      all:
        mode === 'platforms'
          ? PLATFORMS.length
          : countSourcesForScope('all', accessConfig),
      multidisciplinar: 0,
      tecnologia: 0,
      ia: 0,
      saude: 0,
      'ciencias-exatas': 0,
      biociencias: 0,
      geociencias: 0,
      'economia-politicas': 0,
      'patentes-normas': 0,
      arte: 0,
      games: 0,
      software: 0,
      hardware: 0,
    };

    for (const areaKey of THEMATIC_AREAS) {
      map[areaKey] =
        mode === 'platforms'
          ? PLATFORMS.filter((p) => p.thematicAreas.includes(areaKey)).length
          : countSourcesForScope(mapAreaToSearchScope(areaKey), accessConfig);
    }

    return map;
  }, [mode, accessConfig]);

  const activeCountHint = countsByArea[selectedArea];

  return (
    <CollapsibleSection
      isOpen={isOpen}
      onToggle={onToggleOpen}
      className="border-b border-[var(--divider)] pb-3"
      headerClassName="w-full min-h-11 md:min-h-0 flex items-center justify-between py-2 md:py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] select-none text-left touch-manipulation"
      titleClassName="flex items-center gap-1.5 min-w-0"
      contentClassName="space-y-1 md:space-y-0.5 text-[14px] md:text-[13.5px] pt-2 md:pt-1.5"
      title={
        <>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
            {t('thematicScopeDrawerTitle')}
          </span>
          {selectedArea !== 'all' ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)] truncate max-w-[115px] shrink-0">
              {localizedThematicAreas[selectedArea]?.shortLabel || selectedArea}
            </span>
          ) : mode === 'metasearch' ? (
            <span className="text-[11px] text-[var(--text-muted)] shrink-0">
              {t('scopeActiveApisHint', { count: activeCountHint })}
            </span>
          ) : null}
        </>
      }
      actions={
        selectedArea !== 'all' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectArea('all');
            }}
            className="min-h-9 md:min-h-0 px-2 md:px-0 text-xs text-[var(--link-academic)] hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
          >
            {t('clearFilter')}
          </button>
        )
      }
    >
      <button
        type="button"
        onClick={() => onSelectArea('all')}
        className={`w-full min-h-11 md:min-h-0 flex items-center justify-between px-3 md:px-2.5 py-2 md:py-1.5 rounded-xl md:rounded-lg transition-colors cursor-pointer text-left touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
          selectedArea === 'all'
            ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2.5 md:gap-2 truncate">
          <Globe className="w-4 h-4 md:w-3.5 md:h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          <span className="truncate">{t('areaAll')}</span>
        </div>
        <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
          {countsByArea.all}
        </span>
      </button>

      {THEMATIC_AREAS.map((areaKey) => {
        const meta = localizedThematicAreas[areaKey];
        const isSelected = selectedArea === areaKey;
        return (
          <button
            key={areaKey}
            type="button"
            onClick={() => onSelectArea(areaKey)}
            className={`w-full min-h-11 md:min-h-0 flex items-center justify-between px-3 md:px-2.5 py-2 md:py-1.5 rounded-xl md:rounded-lg transition-colors cursor-pointer text-left touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
              isSelected
                ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-2 truncate">
              {renderAreaIcon(areaKey, 'w-4 h-4 md:w-3.5 md:h-3.5 text-[var(--text-muted)] shrink-0')}
              <span className="truncate">{meta.label}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
              {countsByArea[areaKey]}
            </span>
          </button>
        );
      })}
    </CollapsibleSection>
  );
};
