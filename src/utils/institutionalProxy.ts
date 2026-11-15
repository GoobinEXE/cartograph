import { AccessModel, InstitutionalProxyConfig } from '../types/academic';
import { sanitizeExternalUrl } from './urlSafety';

export const DEFAULT_INSTITUTIONAL_PROXY: InstitutionalProxyConfig = {
  enabled: false,
  mode: 'prefix',
  proxyTemplate: '',
  presetId: 'ezproxy-prefix',
  applyToModels: ['pago', 'aberto-institucional'],
};

/**
 * Rewrites an academic publisher/article URL to route through the researcher's
 * institutional proxy (EZProxy prefix, template `{url}`, or CAPES CAFe domain suffix).
 * Pure and safe: rejects non-http(s) URLs and avoids double-proxying.
 */
export function rewriteUrlWithInstitutionalProxy(
  rawUrl: string,
  config: InstitutionalProxyConfig,
  accessModel?: AccessModel
): string {
  const safeTarget = sanitizeExternalUrl(rawUrl);
  if (!safeTarget) return rawUrl;
  if (!config.enabled) return safeTarget;

  if (accessModel) {
    if (accessModel === 'gratuito' || !config.applyToModels.includes(accessModel)) {
      return safeTarget;
    }
  }

  const template = config.proxyTemplate.trim();
  if (!template) return safeTarget;

  if (config.mode === 'suffix-domain') {
    const cleanSuffix = template.replace(/^\.+/, '').replace(/^https?:\/\//i, '').split('/')[0]?.trim();
    if (!cleanSuffix || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanSuffix)) {
      return safeTarget;
    }
    try {
      const parsed = new URL(safeTarget);
      if (parsed.hostname.endsWith(cleanSuffix)) {
        return safeTarget;
      }
      const hyphenatedHost = parsed.hostname.replace(/\./g, '-');
      parsed.hostname = `${hyphenatedHost}.${cleanSuffix}`;
      parsed.protocol = 'https:';
      return sanitizeExternalUrl(parsed.toString()) || safeTarget;
    } catch {
      return safeTarget;
    }
  }

  // Prefix / template mode
  const hasPlaceholder = template.includes('{url}');
  const proxyCandidate = hasPlaceholder
    ? template.replace(/\{url\}/g, encodeURIComponent(safeTarget))
    : buildPrefixProxyUrl(template, safeTarget);

  const safeProxyUrl = sanitizeExternalUrl(proxyCandidate);
  if (!safeProxyUrl) return safeTarget;

  try {
    const targetParsed = new URL(safeTarget);
    const proxyBaseParsed = new URL(safeProxyUrl);
    if (targetParsed.hostname === proxyBaseParsed.hostname) {
      return safeTarget;
    }
  } catch {
    return safeTarget;
  }

  return safeProxyUrl;
}

function buildPrefixProxyUrl(prefix: string, targetUrl: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) return targetUrl;
  const encoded = encodeURIComponent(targetUrl);
  if (trimmed.endsWith('=')) {
    return `${trimmed}${encoded}`;
  }
  if (trimmed.includes('?')) {
    return `${trimmed}&url=${encoded}`;
  }
  const normalizedBase = trimmed.endsWith('/') ? `${trimmed}login` : trimmed;
  return `${normalizedBase}?url=${encoded}`;
}

export function buildDoiProxyUrl(
  doi: string | null | undefined,
  config: InstitutionalProxyConfig
): string | null {
  if (!doi) return null;
  const clean = doi
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  if (!clean) return null;
  const doiUrl = `https://doi.org/${clean}`;
  return rewriteUrlWithInstitutionalProxy(doiUrl, config, 'pago');
}
