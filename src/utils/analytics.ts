import { track as vercelTrack } from '@vercel/analytics';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsEventName =
  | 'federated_search'
  | 'multi_tab_launch'
  | 'preset_selected'
  | 'citation_export'
  | 'paper_saved'
  | 'library_group_action'
  | 'navigation_view';

export type AnalyticsEventParams = Record<string, string | number | boolean>;

export const ANALYTICS_CONSENT_STORAGE_KEY = 'cartograph_analytics_consent_v1';

export type AnalyticsConsentState = 'granted' | 'denied' | null;

const GA_MEASUREMENT_ID: string =
  (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_GA_MEASUREMENT_ID
  )?.trim() || '';

let gaInitialized = false;

export function isGaConfigured(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

export function getAnalyticsConsent(): AnalyticsConsentState {
  if (typeof window === 'undefined') return null;
  try {
    const val = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return val === 'granted' || val === 'denied' ? val : null;
  } catch {
    return null;
  }
}

function loadGtagScript(): void {
  if (typeof window === 'undefined' || gaInitialized || !GA_MEASUREMENT_ID) {
    return;
  }
  gaInitialized = true;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  }
  window.gtag = window.gtag || gtag;

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    GA_MEASUREMENT_ID
  )}`;
  document.head.appendChild(script);
}

/**
 * Usage metrics run unless the researcher explicitly refused them. Vercel Web Analytics and
 * Speed Insights are cookieless and aggregate; an explicit 'denied' still stops them, the
 * custom events below and Google Analytics.
 */
export function isAnalyticsAllowed(): boolean {
  return getAnalyticsConsent() !== 'denied';
}

/** Drop-in `beforeSend` for <Analytics /> and <SpeedInsights />: cancels events after an opt-out. */
export function analyticsBeforeSend<T>(event: T): T | null {
  return isAnalyticsAllowed() ? event : null;
}

export function grantAnalyticsConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'granted');
  } catch {
    // ignore storage errors
  }
  if (GA_MEASUREMENT_ID) {
    loadGtagScript();
    window.gtag?.('consent', 'update', {
      analytics_storage: 'granted',
    });
  }
}

export function denyAnalyticsConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'denied');
  } catch {
    // ignore storage errors
  }
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  }
}

/**
 * Inicializa Google Analytics 4 (gtag.js) apenas quando VITE_GA_MEASUREMENT_ID
 * estiver configurado e o usuário tiver concedido opt-in explícito (LGPD/GDPR).
 */
export function initPrivacyFirstAnalytics(): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
    return;
  }
  if (getAnalyticsConsent() === 'granted') {
    loadGtagScript();
  }
}

/**
 * Registra um evento agregado e anônimo (sem termos de busca ou dados pessoais)
 * tanto no Google Analytics 4 (quando configurado) quanto no Vercel Analytics.
 */
export function trackAcademicEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsEventParams = {}
): void {
  if (typeof window === 'undefined' || !isAnalyticsAllowed()) return;

  try {
    if (typeof window.gtag === 'function' && GA_MEASUREMENT_ID) {
      window.gtag('event', eventName, params);
    }
  } catch {
    // Falha silenciosa caso bloqueadores de conteúdo interceptem gtag
  }

  try {
    vercelTrack(eventName, params);
  } catch {
    // Falha silenciosa em ambientes offline/Tauri
  }
}
