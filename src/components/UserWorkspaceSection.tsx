import React from 'react';
import { ChevronRight, KeyRound, Library, Settings2, University, User } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { AccessSettingsTab, UserAccessConfig } from '../types/academic';

export const USER_WORKSPACE_SECTION_TAG = 'user-workspace';

interface UserWorkspaceSectionProps {
  config: UserAccessConfig;
  onOpenAccessSettings: (initialTab?: AccessSettingsTab) => void;
}

/**
 * Dedicated user-scoped sidebar container grouping all user-configurable settings
 * (institutional proxy, BYOK credentials, subscriptions) for future user account expansion.
 */
export const UserWorkspaceSection: React.FC<UserWorkspaceSectionProps> = ({
  config,
  onOpenAccessSettings,
}) => {
  const { t } = useI18n();

  const isProxyActive = Boolean(
    config.institutionalProxy.enabled && config.institutionalProxy.proxyTemplate.trim()
  );

  const activeByokCount = Object.values(config.byokKeys).filter((entry) =>
    Boolean(entry?.enabled && entry?.apiKey?.trim())
  ).length;

  const subscriptionsCount = config.ownedPlatformIds.length;

  const items: Array<{
    id: AccessSettingsTab;
    icon: React.ReactElement;
    label: string;
    value: string;
    valueClass: string;
  }> = [
    {
      id: 'proxy',
      icon: <University className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />,
      label: t('userProxyRowLabel'),
      value: isProxyActive ? t('userProxyActive') : t('userProxyOff'),
      valueClass: isProxyActive
        ? 'text-[var(--meta-green)] font-medium'
        : 'text-[var(--text-muted)]',
    },
    {
      id: 'byok',
      icon: <KeyRound className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />,
      label: t('userByokRowLabel'),
      value: t('userByokActiveCount', { count: activeByokCount }),
      valueClass:
        activeByokCount > 0
          ? 'text-[var(--link-academic)] font-medium'
          : 'text-[var(--text-muted)]',
    },
    {
      id: 'subscriptions',
      icon: <Library className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />,
      label: t('userSubsRowLabel'),
      value: t('userSubsCount', { count: subscriptionsCount }),
      valueClass:
        subscriptionsCount > 0
          ? 'text-[var(--text-primary)] font-medium'
          : 'text-[var(--text-muted)]',
    },
  ];

  return (
    <section
      data-user-section={USER_WORKSPACE_SECTION_TAG}
      data-user-tag="user-configurable"
      aria-label={t('userWorkspaceTitle')}
      className="mt-2 rounded-2xl border border-[var(--divider)] bg-[var(--bg-secondary)] p-3.5 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="w-3.5 h-3.5 text-[var(--link-academic)] shrink-0" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
            {t('userWorkspaceTitle')}
          </span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--divider)] shrink-0">
          {t('userAccountBadge')}
        </span>
      </div>

      <div className="space-y-0.5 text-[12.5px]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenAccessSettings(item.id)}
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
          >
            <span className="flex items-center gap-2 min-w-0 text-[var(--text-secondary)]">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
            <span className={`inline-flex items-center gap-1 shrink-0 tabular-nums ${item.valueClass}`}>
              <span>{item.value}</span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onOpenAccessSettings('proxy')}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--divider)] text-[12.5px] font-medium text-[var(--text-primary)] hover:border-[var(--link-academic)] hover:text-[var(--link-academic)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-academic)]"
      >
        <Settings2 className="w-3.5 h-3.5 shrink-0" />
        <span>{t('userWorkspaceManageBtn')}</span>
      </button>
    </section>
  );
};
