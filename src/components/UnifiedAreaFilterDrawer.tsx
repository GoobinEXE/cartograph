import React, { useMemo } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { countSourcesForScope, mapAreaToSearchScope } from '../data/apiSources';
import {
  getLocalizedThematicAreas,
  PLATFORMS,
  THEMATIC_AREAS,
} from '../data/platforms';
import { useI18n } from '../i18n/context';
import { ThematicArea, UserAccessConfig } from '../types/academic';
import { renderAreaIcon } from '../utils/areaIcons';

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
    <div className="border-b border-[var(--divider)] pb-3">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleOpen();
          }
        }}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-secondary)] group select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        <div className="flex items-center gap-1.5 min-w-0">
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
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedArea !== 'all' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectArea('all');
              }}
              className="text-xs text-[var(--link-academic)] hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
            >
              {t('clearFilter')}
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
              isOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="space-y-0.5 text-[13.5px] pt-1.5">
          <button
            type="button"
            onClick={() => onSelectArea('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
              selectedArea === 'all'
                ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
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
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)] ${
                  isSelected
                    ? 'bg-[var(--bg-subtle)] text-[var(--link-academic)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {renderAreaIcon(areaKey, 'w-3.5 h-3.5 text-[var(--text-muted)] shrink-0')}
                  <span className="truncate">{meta.label}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
                  {countsByArea[areaKey]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
