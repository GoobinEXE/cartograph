import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { SupportedLanguage, TRANSLATIONS, Translations, translate } from './translations';

export { translate };

export const STORAGE_KEY_LANGUAGE = 'cartograph_language';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

/** Native names shown in the language menu; only languages present in TRANSLATIONS are offered. */
const LANGUAGE_NAMES: Record<string, Omit<LanguageOption, 'code'>> = {
  pt: { label: 'Português', nativeLabel: 'Português (BR/PT)' },
  en: { label: 'English', nativeLabel: 'English (US/UK)' },
  es: { label: 'Español', nativeLabel: 'Español' },
  fr: { label: 'Français', nativeLabel: 'Français' },
};

export const AVAILABLE_LANGUAGES: LanguageOption[] = (Object.keys(TRANSLATIONS) as SupportedLanguage[]).map(
  (code) => ({ code, ...(LANGUAGE_NAMES[code] ?? { label: code, nativeLabel: code }) })
);

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TRANSLATIONS, value);
}

/** First browser/OS locale whose primary subtag is a supported UI language; English otherwise. */
export function resolveLanguageFromTags(tags: readonly string[]): SupportedLanguage {
  for (const rawLang of tags) {
    if (!rawLang) continue;
    const primary = rawLang.trim().toLowerCase().split(/[-_]/)[0];
    if (isSupportedLanguage(primary)) return primary;
  }
  return 'en';
}

/** Value for <html lang>. */
export function htmlLangFor(language: SupportedLanguage): string {
  return language === 'pt' ? 'pt-BR' : language;
}

export function detectSystemLanguage(): SupportedLanguage {
  if (typeof window === 'undefined' && typeof navigator === 'undefined') {
    return 'en';
  }

  const candidates: string[] = [];
  if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages)) {
      candidates.push(...navigator.languages);
    }
    if (navigator.language) {
      candidates.push(navigator.language);
    }
  }

  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (intlLocale) {
      candidates.push(intlLocale);
    }
  } catch {
    // ignore Intl fallback error
  }

  return resolveLanguageFromTags(candidates);
}

function hasManualLanguageOverride(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang')?.toLowerCase();
    if (isSupportedLanguage(urlLang)) {
      return urlLang;
    }
  } catch {
    // ignore URL parsing error
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    if (isSupportedLanguage(saved)) {
      return saved;
    }
  } catch {
    // ignore storage error
  }

  return null;
}

export function detectBrowserLanguage(): SupportedLanguage {
  const override = hasManualLanguageOverride();
  if (override) return override;
  return detectSystemLanguage();
}

interface I18nContextType {
  language: SupportedLanguage;
  isAutoLanguage: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  resetToSystemLanguage: () => void;
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
  translations: Translations;
  availableLanguages: LanguageOption[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAutoLanguage, setIsAutoLanguage] = useState<boolean>(
    () => hasManualLanguageOverride() === null
  );
  const [language, setLanguageState] = useState<SupportedLanguage>(() => detectBrowserLanguage());

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    setIsAutoLanguage(false);
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
      document.documentElement.lang = htmlLangFor(lang);
    } catch {
      // ignore storage error
    }
  }, []);

  const resetToSystemLanguage = useCallback(() => {
    const systemLang = detectSystemLanguage();
    setLanguageState(systemLang);
    setIsAutoLanguage(true);
    try {
      localStorage.removeItem(STORAGE_KEY_LANGUAGE);
      document.documentElement.lang = htmlLangFor(systemLang);
    } catch {
      // ignore storage error
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = htmlLangFor(language);
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLanguageChange = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
        if (isSupportedLanguage(saved)) {
          return;
        }
      } catch {
        // ignore storage error
      }
      setIsAutoLanguage(true);
      setLanguageState(detectSystemLanguage());
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, []);

  const translations = TRANSLATIONS[language] || TRANSLATIONS.en;

  const t = useCallback(
    (key: keyof Translations, params?: Record<string, string | number>): string =>
      translate(language, key, params),
    [language]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        isAutoLanguage,
        setLanguage,
        resetToSystemLanguage,
        t,
        translations,
        availableLanguages: AVAILABLE_LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
