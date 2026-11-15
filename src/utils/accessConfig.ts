import { BYOK_PROVIDERS } from '../data/byokProviders';
import { ByokCredentialEntry, ByokProviderId, UserAccessConfig } from '../types/academic';
import { DEFAULT_INSTITUTIONAL_PROXY } from './institutionalProxy';

export const STORAGE_KEY_USER_ACCESS_CONFIG = 'cartograph_access_config_v1';

export const CAPES_CAFE_COVERED_PLATFORM_IDS: string[] = [
  'capes',
  'wos',
  'scopus',
  'ieeexplore',
  'sciencedirect',
  'springer',
  'acmdl',
  'wiley',
  'jstor',
  'taylorfrancis',
  'oxfordacademic',
  'cambridgecore',
  'sage',
  'proquest',
  'cochrane',
  'ieeetog',
  'sigsoft',
  'ieeemicro',
  'saemobilus',
  'oecd_ilibrary',
];

export function createDefaultUserAccessConfig(): UserAccessConfig {
  return {
    institutionalProxy: { ...DEFAULT_INSTITUTIONAL_PROXY },
    ownedPlatformIds: [],
    byokKeys: {},
  };
}

export function sanitizeUserAccessConfig(raw: unknown): UserAccessConfig {
  const base = createDefaultUserAccessConfig();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  if (obj.institutionalProxy && typeof obj.institutionalProxy === 'object') {
    const p = obj.institutionalProxy as Record<string, unknown>;
    const applyModelsRaw = Array.isArray(p.applyToModels) ? p.applyToModels : [];
    const applyModels = applyModelsRaw.filter(
      (m): m is 'pago' | 'aberto-institucional' | 'freemium' =>
        m === 'pago' || m === 'aberto-institucional' || m === 'freemium'
    );
    base.institutionalProxy = {
      enabled: Boolean(p.enabled),
      mode: p.mode === 'suffix-domain' ? 'suffix-domain' : 'prefix',
      proxyTemplate: typeof p.proxyTemplate === 'string' ? p.proxyTemplate.trim().slice(0, 300) : '',
      presetId:
        p.presetId === 'capes-cafe' || p.presetId === 'ezproxy-prefix' ? p.presetId : 'custom',
      applyToModels: applyModels.length > 0 ? applyModels : ['pago', 'aberto-institucional'],
    };
  }

  if (Array.isArray(obj.ownedPlatformIds)) {
    base.ownedPlatformIds = Array.from(
      new Set(
        obj.ownedPlatformIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
      )
    );
  }

  if (obj.byokKeys && typeof obj.byokKeys === 'object') {
    const rawKeys = obj.byokKeys as Record<string, unknown>;
    const validIds = new Set<string>(BYOK_PROVIDERS.map((p) => p.id));
    for (const [k, v] of Object.entries(rawKeys)) {
      if (!validIds.has(k) || !v || typeof v !== 'object') continue;
      const entry = v as Record<string, unknown>;
      const apiKey = typeof entry.apiKey === 'string' ? entry.apiKey.trim().slice(0, 512) : '';
      const secondaryToken =
        typeof entry.secondaryToken === 'string'
          ? entry.secondaryToken.trim().slice(0, 512)
          : undefined;
      if (apiKey) {
        base.byokKeys[k as ByokProviderId] = {
          apiKey,
          secondaryToken: secondaryToken || undefined,
          enabled: entry.enabled !== false,
        };
      }
    }
  }

  if (typeof obj.unpaywallEmail === 'string') {
    const email = obj.unpaywallEmail.trim().slice(0, 160);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      base.unpaywallEmail = email;
    }
  }

  return base;
}

export function loadUserAccessConfig(): UserAccessConfig {
  if (typeof localStorage === 'undefined') return createDefaultUserAccessConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_ACCESS_CONFIG);
    if (!raw) return createDefaultUserAccessConfig();
    return sanitizeUserAccessConfig(JSON.parse(raw));
  } catch {
    return createDefaultUserAccessConfig();
  }
}

export function saveUserAccessConfig(config: UserAccessConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_USER_ACCESS_CONFIG, JSON.stringify(config));
  } catch {
    // ignore quota errors
  }
}

export function getActiveByokEntry(
  config: UserAccessConfig | undefined,
  providerId: ByokProviderId
): ByokCredentialEntry | null {
  const entry = config?.byokKeys?.[providerId];
  if (!entry || !entry.enabled || !entry.apiKey.trim()) return null;
  return entry;
}

export function buildByokCacheSignature(config?: UserAccessConfig): string {
  if (!config?.byokKeys) return 'no-byok';
  const active = (Object.entries(config.byokKeys) as Array<[ByokProviderId, ByokCredentialEntry | undefined]>)
    .filter(([, entry]) => Boolean(entry && entry.enabled && entry.apiKey.trim()))
    .map(([id, entry]) => `${id}:${entry!.apiKey.length}:${entry!.secondaryToken ? 1 : 0}`)
    .sort();
  return active.length > 0 ? active.join('|') : 'no-byok';
}
