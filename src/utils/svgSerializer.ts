export const LIGHT_THEME_SVG_FALLBACKS: Readonly<Record<string, string>> = {
  '--bg-canvas': '#FFFFFF',
  '--bg-secondary': '#F8F9FA',
  '--bg-subtle': '#F1F3F5',
  '--bg-hover': '#E9ECEF',
  '--bg-card': '#FFFFFF',
  '--divider': '#ECEEF1',
  '--border-subtle': '#ECEEF1',
  '--text-primary': '#111827',
  '--text-secondary': '#4B5563',
  '--text-muted': '#6B7280',
  '--link-academic': '#1A56DB',
  '--meta-green': '#057A55',
  '--btn-primary-bg': '#111827',
  '--btn-primary-fg': '#FFFFFF',
  '--accent-blue-tint': 'rgba(26, 86, 219, 0.08)',
  '--accent-subtle': 'rgba(26, 86, 219, 0.08)',
  '--chart-1': '#0284C7',
  '--chart-2': '#047857',
  '--chart-3': '#4F46E5',
};

const CSS_VAR_PATTERN = /var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\)/g;

/**
 * Replaces `var(--token)` CSS variable references and `currentColor` in serialized SVG markup
 * with concrete light-theme values so exported vectors render consistently outside the app DOM.
 */
export function resolveSvgCssVariables(
  svgMarkup: string,
  resolveVar?: (name: string) => string | undefined
): string {
  const withResolvedVars = svgMarkup.replace(
    CSS_VAR_PATTERN,
    (fullMatch, varName: string, fallback?: string) => {
      const resolved = resolveVar?.(varName)?.trim();
      if (resolved) return resolved;

      const staticFallback = LIGHT_THEME_SVG_FALLBACKS[varName];
      if (staticFallback) return staticFallback;

      const inlineFallback = fallback?.trim();
      return inlineFallback || fullMatch;
    }
  );

  return withResolvedVars.replace(/\bcurrentColor\b/gi, '#111827');
}

function ensureSvgXmlns(markup: string): string {
  if (/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(markup)) {
    return markup;
  }
  return markup.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

export function serializeThemedSvg(svgEl: SVGSVGElement): string {
  const target =
    typeof svgEl.cloneNode === 'function' ? (svgEl.cloneNode(true) as SVGSVGElement) : svgEl;

  if (
    typeof target.setAttribute === 'function' &&
    (typeof target.getAttribute !== 'function' || !target.getAttribute('xmlns'))
  ) {
    target.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  let rawSvg: string;
  if (typeof XMLSerializer !== 'undefined') {
    rawSvg = new XMLSerializer().serializeToString(target);
  } else {
    rawSvg = typeof target.outerHTML === 'string' ? target.outerHTML : '';
  }

  const withNamespace = ensureSvgXmlns(rawSvg);

  let probe: HTMLElement | null = null;
  let computedStyles: CSSStyleDeclaration | null = null;

  try {
    if (
      typeof document !== 'undefined' &&
      document.body &&
      typeof document.createElement === 'function' &&
      typeof getComputedStyle === 'function'
    ) {
      probe = document.createElement('div');
      probe.setAttribute('data-theme', 'light');
      probe.style.display = 'none';
      document.body.appendChild(probe);
      computedStyles = getComputedStyle(probe);
    }

    return resolveSvgCssVariables(withNamespace, (varName) =>
      computedStyles ? computedStyles.getPropertyValue(varName) : undefined
    );
  } finally {
    if (probe) {
      if (typeof document !== 'undefined' && document.body && probe.parentNode === document.body) {
        document.body.removeChild(probe);
      } else if (typeof probe.remove === 'function') {
        probe.remove();
      }
    }
  }
}
