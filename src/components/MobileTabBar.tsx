import type { ComponentType, SVGProps } from 'react';
import { BookMarked, FileText, History, LayoutGrid, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/context';
import type { Translations } from '../i18n/translations';
import type { AppTab } from '../utils/seo';

interface MobileTabBarProps {
  /** `null` when no workspace tab is current (404 page, About, Feedback). */
  activeTab: AppTab | null;
  resultsCount: number;
  savedCount: number;
  historyCount: number;
  isSearching: boolean;
  onNavigate: (tab: AppTab) => void;
  onOpenHistory: () => void;
}

interface TabItem {
  key: 'platforms' | 'federated' | 'saved' | 'history';
  label: keyof Translations;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  count?: number;
}

/**
 * Phone navigation (< `sm`): the four workspace destinations of the header tab row, pinned to the
 * bottom edge within thumb reach and padded clear of the home indicator. The header row takes
 * over from `sm` up, so only one of the two is ever rendered visibly.
 */
export function MobileTabBar({
  activeTab,
  resultsCount,
  savedCount,
  historyCount,
  isSearching,
  onNavigate,
  onOpenHistory,
}: MobileTabBarProps) {
  const { t } = useI18n();

  const items: TabItem[] = [
    { key: 'platforms', label: 'mobileNavPlatforms', icon: LayoutGrid },
    { key: 'federated', label: 'mobileNavResults', icon: FileText, count: resultsCount },
    { key: 'saved', label: 'mobileNavLibrary', icon: BookMarked, count: savedCount },
    { key: 'history', label: 'mobileNavHistory', icon: History, count: historyCount },
  ];

  return (
    <nav
      aria-label={t('mobileNavAria')}
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--divider)] bg-[var(--bg-canvas)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const isCurrent = item.key !== 'history' && activeTab === item.key;
          const showSpinner = item.key === 'federated' && isSearching;
          const Icon = showSpinner ? Loader2 : item.icon;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => (item.key === 'history' ? onOpenHistory() : onNavigate(item.key))}
                aria-current={isCurrent ? 'page' : undefined}
                className={`relative w-full h-14 flex flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium cursor-pointer select-none transition-colors ${
                  isCurrent ? 'text-[var(--link-academic)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="relative">
                  <Icon
                    aria-hidden="true"
                    className={`w-[22px] h-[22px] ${showSpinner ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    strokeWidth={isCurrent ? 2.25 : 1.75}
                  />
                  {item.count !== undefined && item.count > 0 && (
                    <span className="absolute -top-1.5 left-[14px] min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--link-academic)] text-white text-[10.5px] font-semibold leading-[18px] text-center tabular-nums">
                      {item.count > 999 ? '999+' : item.count}
                    </span>
                  )}
                </span>
                <span>{t(item.label)}</span>
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-[var(--link-academic)]"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
