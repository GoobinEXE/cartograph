import { proseLanguage } from '../i18n/localized';
import React, { useEffect, useState } from 'react';
import {
  Check,
  ExternalLink,
  KeyRound,
  Lock,
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

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subscriptionPlatforms = PLATFORMS.filter(
    (p) =>
      p.accessModel === 'pago' ||
      p.accessModel === 'aberto-institucional' ||
      p.accessModel === 'freemium'
  );

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-settings-title"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[var(--bg-canvas)] border border-[var(--divider)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--divider)] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="access-settings-title"
              className="text-lg font-heading font-semibold text-[var(--text-primary)] flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span>{t('accessModalTitle')}</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              {t('accessModalSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer shrink-0"
            aria-label={t('closeModalBtn')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-5 border-b border-[var(--divider)] flex items-center gap-5 overflow-x-auto bg-[var(--bg-secondary)]/50">
          <button
            type="button"
            onClick={() => setActiveTab('proxy')}
            className={`py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'proxy'
                ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <University className="w-3.5 h-3.5" />
            <span>{t('accessTabProxy')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('byok')}
            className={`py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'byok'
                ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t('accessTabByok')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'border-[var(--link-academic)] text-[var(--link-academic)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {t('accessTabSubscriptions')} ({config.ownedPlatformIds.length})
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'proxy' && (
            <div className="space-y-4">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.institutionalProxy.enabled}
                  onChange={(e) => updateProxy({ enabled: e.target.checked })}
                  className="mt-0.5 rounded accent-[var(--link-academic)] cursor-pointer"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
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
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)]"
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
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-[var(--divider)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  {t('proxyApplyToLabel')}
                </div>
                <div className="flex flex-wrap gap-3">
                  {(['pago', 'aberto-institucional', 'freemium'] as const).map((tier) => (
                    <label
                      key={tier}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer"
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
                      <div className="flex items-start justify-between gap-2">
                        <div>
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
                            {proseLanguage(language) === 'en' ? provider.descriptionEn : provider.descriptionPt}
                          </p>
                        </div>

                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[var(--link-academic)] hover:underline shrink-0"
                        >
                          <span>{t('byokGetKeyLink')}</span>
                          <ExternalLink className="w-3 h-3" />
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
                          className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)]"
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
                            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)]"
                          />
                        )}
                      </div>

                      {entry?.apiKey && (
                        <div className="flex items-center justify-between pt-0.5">
                          <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
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
                            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
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
                  value={config.unpaywallEmail ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      unpaywallEmail: e.target.value,
                    })
                  }
                  placeholder={t('unpaywallEmailPlaceholder')}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)]"
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

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectCapesBundle}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)] hover:opacity-90 cursor-pointer"
                  >
                    {t('subsSelectCapesBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, ownedPlatformIds: [] })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                  >
                    {t('subsClearAllBtn')}
                  </button>
                </div>

                <span className="text-xs text-[var(--text-muted)]">
                  {config.ownedPlatformIds.length} {t('subsCountLabel')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subscriptionPlatforms.map((platform) => {
                  const checked = config.ownedPlatformIds.includes(platform.id);
                  return (
                    <label
                      key={platform.id}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        checked
                          ? 'border-[var(--link-academic)] bg-[var(--accent-blue-tint)]/60'
                          : 'border-[var(--divider)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOwnedPlatform(platform.id)}
                        className="mt-0.5 rounded accent-[var(--link-academic)] cursor-pointer shrink-0"
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

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--divider)] bg-[var(--bg-secondary)]/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] min-w-0">
            <Lock className="w-3.5 h-3.5 shrink-0 text-[var(--meta-green)]" />
            <span className="truncate">{t('proxyLocalNotice')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 cursor-pointer shrink-0"
          >
            {t('closeModalBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
