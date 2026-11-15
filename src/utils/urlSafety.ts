/**
 * Validates external URLs coming from third-party APIs or user input.
 * Only http: and https: protocols are permitted to prevent javascript:/data: injection.
 */
export function sanitizeExternalUrl(
  rawUrl: string | null | undefined,
  options: { allowImplicitHttps?: boolean } = {}
): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const hasExplicitScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  if (!hasExplicitScheme) {
    if (!options.allowImplicitHttps || trimmed.startsWith('//')) {
      return null;
    }
    return sanitizeExternalUrl(`https://${trimmed}`, { allowImplicitHttps: false });
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
