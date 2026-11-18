import { proseLanguage } from '../i18n/localized';
import React, { useEffect, useState } from 'react';
import {
  Check,
  ExternalLink,
  KeyRound,
  Lock,
  Search,
  Shield,
  Trash2,
  University,
  X,
} from 'lucide-react';
import { BYOK_PROVIDERS } from '../data/byokProviders';
import { PLATFORMS } from '../data/platforms';
import { useI18n } from '../i18n/context';
import { AccessSettingsTab, ByokProviderId, UserAccessConfig } from '../types/academic';
import { CAPES_CAFE_COVERED_PLATFORM_IDS } from '../utils/accessConfig';
import { rewriteUrlWithInstitutionalProxy } from '../utils/institutionalProxy';
import { MobileSheet } from './ui/MobileSheet';

interface AccessSettingsModalProps {
  isOpen: boolean;
  config: UserAccessConfig;
  initialTab?: AccessSettingsTab;
  onChange: (next: UserAccessConfig) => void;
  onClose: () => void;
}

const PREVIEW_SAMPLE_URL = 'https://www.sciencedirect.com/search?qs=monetary+policy';

export const AccessSettingsModal: React.FC<AccessSettingsModalProps> = ({
  isOpen,
  config,
  initialTab = 'proxy',
  onChange,
  onClose,
}) => {
  const { language, t } = useI18n();
  const [activeTab, setActiveTab] = useState<AccessSettingsTab>(initialTab);
  const [subFilter, setSubFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSubFilter('');
    }
  }, [isOpen, initialTab]);

  const subscriptionPlatforms = PLATFORMS.filter(
    (p) =>
      p.accessModel === 'pago' ||
      p.accessModel === 'aberto-institucional' ||
      p.accessModel === 'freemium'
  );

  const normalizedFilter = subFilter.trim().toLowerCase();
  const filteredSubscriptionPlatforms = normalizedFilter
    ? subscriptionPlatforms.filter(
        (p) =>
          p.name.toLowerCase().includes(normalizedFilter) ||
          p.shortTag.toLowerCase().includes(normalizedFilter) ||
          p.accessModel.toLowerCase().includes(normalizedFilter)
      )
    : subscriptionPlatforms;

  const updateProxy = (patch: Partial<UserAccessConfig['institutionalProxy']>) => {
    onChange({
      ...config,
      institutionalProxy: {
        ...config.institutionalProxy,
        ...patch,
      },
    });
  };

  const toggleApplyModel = (model: 'pago' | 'aberto-institucional' | 'freemium') => {
    const current = config.institutionalProxy.applyToModels;
    const exists = current.includes(model);
    const nextModels = exists
      ? current.filter((m) => m !== model)
      : [...current, model];
    if (nextModels.length === 0) return;
    updateProxy({ applyToModels: nextModels });
  };

  const updateByokField = (
    providerId: ByokProviderId,
    field: 'apiKey' | 'secondaryToken' | 'enabled',
    value: string | boolean
  ) => {
    const prevEntry = config.byokKeys[providerId] ?? {
      apiKey: '',
      secondaryToken: undefined,
      enabled: true,
    };
    const nextEntry = {
      ...prevEntry,
      [field]: value,
    };
    const nextMap = { ...config.byokKeys };
    if (!nextEntry.apiKey.trim()) {
      delete nextMap[providerId];
    } else {
      nextMap[providerId] = {
        apiKey: nextEntry.apiKey,
        secondaryToken: nextEntry.secondaryToken || undefined,
        enabled: nextEntry.enabled,
      };
    }
    onChange({
      ...config,
      byokKeys: nextMap,
    });
  };

  const clearByokProvider = (providerId: ByokProviderId) => {
    const nextMap = { ...config.byokKeys };
    delete nextMap[providerId];
    onChange({
      ...config,
      byokKeys: nextMap,
    });
  };

  const toggleOwnedPlatform = (platformId: string) => {
    const exists = config.ownedPlatformIds.includes(platformId);
    const nextOwned = exists
      ? config.ownedPlatformIds.filter((id) => id !== platformId)
      : [...config.ownedPlatformIds, platformId];
    onChange({
      ...config,
      ownedPlatformIds: nextOwned,
    });
  };

  const selectCapesBundle = () => {
    const validIds = new Set(subscriptionPlatforms.map((p) => p.id));
    const merged = Array.from(
      new Set([
        ...config.ownedPlatformIds,
        ...CAPES_CAFE_COVERED_PLATFORM_IDS.filter((id) => validIds.has(id)),
      ])
    );
    onChange({
      ...config,
      ownedPlatformIds: merged,
    });
  };

  const previewUrl = rewriteUrlWithInstitutionalProxy(
    PREVIEW_SAMPLE_URL,
    config.institutionalProxy,
    'pago'
  );

  return (
    <MobileSheet
      open={isOpen}
      onClose={onClose}
      desktopMode="modal"
      desktopMaxWidthClass="md:max-w-2xl"
      initialSnap="full"
      closeLabel={t('mobileCloseSheetBtn')}
      dragHandleLabel={t('mobileDragHandleLabel')}
      title={
        <span className="inline-flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--link-academic)] shrink-0" aria-hidden="true" />
          <span>{t('accessModalTitle')}</span>
        </span>
      }
      subtitle={t('accessModalSubtitle')}
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-1.5 text-[11px] leading-snug text-[var(--text-muted)] min-w-0">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0 text-[var(--meta-green)]" aria-hidden="true" />
            <span>{t('proxyLocalNotice')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-11 md:min-h-0 px-4 py-2 md:py-1.5 rounded-full text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer shrink-0"
          >
            {t('closeModalBtn')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 -mt-3 px-4 sm:px-6 border-b border-[var(--divider)] bg-[var(--bg-canvas)]/95 backdrop-blur-xs">
          <div
            role="tablist"
            className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar pr-6"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'proxy'}
              onClick={() => setActiveTab('proxy')}
              className={`min-h-11 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'proxy'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <University className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('accessTabProxy')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'byok'}
              onClick={() => setActiveTab('byok')}
              className={`min-h-11 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'byok'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('accessTabByok')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'subscriptions'}
              onClick={() => setActiveTab('subscriptions')}
              className={`min-h-11 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums ${
                activeTab === 'subscriptions'
                  ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {t('accessTabSubscriptions')} ({config.ownedPlatformIds.length})
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'proxy' && (
          <div className="space-y-4">
            <label className="min-h-11 flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={config.institutionalProxy.enabled}
                onChange={(e) => updateProxy({ enabled: e.target.checked })}
                className="mt-0.5 rounded accent-[var(--link-academic)] cursor-pointer shrink-0"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {t('proxyEnableLabel')}
              </span>
            </label>

            <div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                {t('proxyPresetsLabel')}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateProxy({
                      presetId: 'capes-cafe',
                      mode: 'suffix-domain',
                      proxyTemplate: '.ezXX.periodicos.capes.gov.br',
                      enabled: true,
                    })
                  }
                  className={`min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    config.institutionalProxy.presetId === 'capes-cafe'
                      ? 'border-[var(--link-academic)] bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                      : 'border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {t('proxyPresetCapes')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateProxy({
                      presetId: 'ezproxy-prefix',
                      mode: 'prefix',
                      proxyTemplate: 'https://ezproxy.universidade.br/login?url={url}',
                      enabled: true,
                    })
                  }
                  className={`min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    config.institutionalProxy.presetId === 'ezproxy-prefix'
                      ? 'border-[var(--link-academic)] bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                      : 'border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {t('proxyPresetEzproxy')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {t('proxyModeLabel')}
                </label>
                <select
                  value={config.institutionalProxy.mode}
                  onChange={(e) =>
                    updateProxy({
                      mode: e.target.value === 'suffix-domain' ? 'suffix-domain' : 'prefix',
                      presetId: 'custom',
                    })
                  }
                  className="w-full min-h-11 md:min-h-0 px-3 py-2 rounded-lg text-base md:text-sm bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)]"
                >
                  <option value="prefix">{t('proxyModePrefix')}</option>
                  <option value="suffix-domain">{t('proxyModeCapesCafe')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {t('proxyTemplateLabel')}
                </label>
                <input
                  type="text"
                  value={config.institutionalProxy.proxyTemplate}
                  onChange={(e) =>
                    updateProxy({
                      proxyTemplate: e.target.value,
                      presetId: 'custom',
                    })
                  }
                  placeholder={t('proxyTemplatePlaceholder')}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full min-h-11 md:min-h-0 px-3 py-2 rounded-lg text-base md:text-sm bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                {t('proxyApplyToLabel')}
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {(['pago', 'aberto-institucional', 'freemium'] as const).map((tier) => (
                  <label
                    key={tier}
                    className="min-h-11 md:min-h-0 inline-flex items-center gap-2 px-2.5 md:px-0 py-1.5 md:py-0 rounded-lg md:rounded-none bg-[var(--bg-secondary)] md:bg-transparent text-xs text-[var(--text-primary)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.institutionalProxy.applyToModels.includes(tier)}
                      onChange={() => toggleApplyModel(tier)}
                      className="rounded accent-[var(--link-academic)] cursor-pointer"
                    />
                    <span>
                      {tier === 'pago'
                        ? t('accessModelPaid')
                        : tier === 'aberto-institucional'
                          ? t('accessModelInstitutional')
                          : t('accessModelFreemium')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)]">
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1">
                {t('proxyPreviewLabel')}
              </div>
              <div className="text-xs font-mono text-[var(--meta-green)] break-all">
                {previewUrl}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'byok' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t('byokIntro')}
            </p>

            <div className="grid grid-cols-1 gap-3">
              {BYOK_PROVIDERS.map((provider) => {
                const entry = config.byokKeys[provider.id];
                const isActive = Boolean(entry?.enabled && entry?.apiKey?.trim());
                return (
                  <div
                    key={provider.id}
                    className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {provider.name}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              isActive
                                ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                            }`}
                          >
                            {isActive ? t('byokStatusActive') : t('byokStatusInactive')}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {proseLanguage(language) === 'en'
                            ? provider.descriptionEn
                            : provider.descriptionPt}
                        </p>
                      </div>

                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-11 md:min-h-0 inline-flex items-center gap-1 text-xs text-[var(--link-academic)] hover:underline shrink-0"
                      >
                        <span>{t('byokGetKeyLink')}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="password"
                        value={entry?.apiKey ?? ''}
                        onChange={(e) =>
                          updateByokField(provider.id, 'apiKey', e.target.value)
                        }
                        placeholder={`${t('byokKeyLabel')}: ${provider.keyPlaceholder}`}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg text-base md:text-xs bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)]"
                      />

                      {provider.supportsSecondaryToken && (
                        <input
                          type="password"
                          value={entry?.secondaryToken ?? ''}
                          onChange={(e) =>
                            updateByokField(provider.id, 'secondaryToken', e.target.value)
                          }
                          placeholder={provider.secondaryPlaceholder || t('byokInstTokenLabel')}
                          autoComplete="off"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg text-base md:text-xs bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)]"
                        />
                      )}
                    </div>

                    {entry?.apiKey && (
                      <div className="flex items-center justify-between pt-0.5">
                        <label className="min-h-11 md:min-h-0 inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={(e) =>
                              updateByokField(provider.id, 'enabled', e.target.checked)
                            }
                            className="rounded accent-[var(--link-academic)] cursor-pointer"
                          />
                          <span>{t('byokToggleEnable')}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => clearByokProvider(provider.id)}
                          className="min-h-11 md:min-h-0 inline-flex items-center gap-1 px-2 md:px-0 text-xs text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{t('byokClearBtn')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--divider)] space-y-1.5">
              <label
                htmlFor="unpaywall-email-input"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                {t('unpaywallEmailLabel')}
              </label>
              <input
                id="unpaywall-email-input"
                type="email"
                inputMode="email"
                value={config.unpaywallEmail ?? ''}
                onChange={(e) =>
                  onChange({
                    ...config,
                    unpaywallEmail: e.target.value,
                  })
                }
                placeholder={t('unpaywallEmailPlaceholder')}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg text-base md:text-xs bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)]"
              />
              <p className="text-[11px] text-[var(--text-muted)]">{t('unpaywallEmailHint')}</p>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t('subsIntro')}
            </p>

            <div className="relative">
              <Search
                className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('accessTabSubscriptions')}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full min-h-11 md:min-h-9 pl-9 pr-10 py-2 md:py-1.5 rounded-xl md:rounded-lg text-base md:text-xs bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              {subFilter.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubFilter('')}
                  aria-label={t('clearFilter')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectCapesBundle}
                  className="min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)] hover:opacity-90 cursor-pointer"
                >
                  {t('subsSelectCapesBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...config, ownedPlatformIds: [] })}
                  className="min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg text-xs font-medium border border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                >
                  {t('subsClearAllBtn')}
                </button>
              </div>

              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                {config.ownedPlatformIds.length} {t('subsCountLabel')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredSubscriptionPlatforms.map((platform) => {
                const checked = config.ownedPlatformIds.includes(platform.id);
                return (
                  <label
                    key={platform.id}
                    className={`min-h-11 flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      checked
                        ? 'border-[var(--link-academic)] bg-[var(--accent-blue-tint)]/60'
                        : 'border-[var(--divider)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOwnedPlatform(platform.id)}
                      className="rounded accent-[var(--link-academic)] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {platform.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {platform.accessModel}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MobileSheet>
  );
};
