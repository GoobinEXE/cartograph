import type { ComponentType, SVGProps } from 'react';
import { BookMarked, FileText, History, LayoutGrid, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/context';
import type { Translations } from '../i18n/translations';
import type { AppTab } from '../utils/seo';
import { PrismSpectralBar } from './PrismLogo';

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
 * Compact viewport navigation (< `md`, 768px): the four primary workspace destinations pinned
 * within thumb reach and padded clear of home indicators and landscape safe areas. The top header
 * navigation takes over from `md` up.
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
      className="md:hidden glass-chrome fixed inset-x-0 bottom-0 z-40 border-t border-[var(--divider)] bg-[var(--bg-canvas)]/90 pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const isCurrent = item.key !== 'history' && activeTab === item.key;
          const showSpinner = item.key === 'federated' && isSearching;
          const Icon = showSpinner ? Loader2 : item.icon;
          const labelText = t(item.label);
          const hasCount = item.count !== undefined && item.count > 0;
          return (
            <li key={item.key}>
              <button
                type="button"
                data-full-bleed="true"
                onClick={() => (item.key === 'history' ? onOpenHistory() : onNavigate(item.key))}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={hasCount ? `${labelText} (${item.count})` : labelText}
                className={`group relative w-full min-h-[56px] py-1.5 flex flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium cursor-pointer select-none transition-colors active:bg-[var(--bg-subtle)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--link-academic)] ${
                  isCurrent ? 'text-[var(--link-academic)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {isCurrent && (
                  <PrismSpectralBar className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-9 rounded-full" />
                )}
                <span
                  className={`relative pressable inline-flex items-center justify-center px-3 py-0.5 rounded-full transition-colors duration-150 ${
                    isCurrent ? 'bg-[var(--accent-blue-tint)]' : ''
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`w-[21px] h-[21px] ${showSpinner ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    strokeWidth={isCurrent ? 2.25 : 1.75}
                  />
                  {hasCount && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 left-[26px] min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--link-academic)] text-[var(--bg-canvas)] text-[10.5px] font-semibold leading-[18px] text-center tabular-nums"
                    >
                      {item.count! > 999 ? '999+' : item.count}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-full px-1 leading-tight">{labelText}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
