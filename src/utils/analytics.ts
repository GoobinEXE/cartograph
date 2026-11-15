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

const GA_MEASUREMENT_ID: string =
  (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_GA_MEASUREMENT_ID
  )?.trim() || '';

let gaInitialized = false;

/**
 * Inicializa Google Analytics 4 (gtag.js) de forma assíncrona e em estrita
 * conformidade com LGPD/GDPR (Consent Mode v2, IP anonimizado, sem cookies publicitários).
 */
export function initPrivacyFirstAnalytics(): void {
  if (typeof window === 'undefined' || gaInitialized || !GA_MEASUREMENT_ID) {
    return;
  }
  gaInitialized = true;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  }
  window.gtag = window.gtag || gtag;

  // Google Consent Mode v2 — nega armazenamento publicitário e rastreamento comportamental
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
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
 * Registra um evento agregado e anônimo (sem termos de busca ou dados pessoais)
 * tanto no Google Analytics 4 (quando configurado) quanto no Vercel Analytics.
 */
export function trackAcademicEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsEventParams = {}
): void {
  if (typeof window === 'undefined') return;

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
