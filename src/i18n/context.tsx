import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupportedLanguage, TRANSLATIONS, Translations } from './translations';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'pt', label: 'Português', nativeLabel: 'Português (BR/PT)' },
  { code: 'en', label: 'English', nativeLabel: 'English (US/UK)' },
  { code: 'es', label: 'Español', nativeLabel: 'Español' },
  { code: 'fr', label: 'Français', nativeLabel: 'Français' },
];

export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';

  const saved = localStorage.getItem('cartograph_language');
  if (saved && (saved === 'pt' || saved === 'en' || saved === 'es' || saved === 'fr')) {
    return saved;
  }

  const browserLangs =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || 'en'];

  for (const rawLang of browserLangs) {
    const code = rawLang.toLowerCase().slice(0, 2);
    if (code === 'pt') return 'pt';
    if (code === 'es') return 'es';
    if (code === 'fr') return 'fr';
    if (code === 'en') return 'en';
  }

  return 'en';
}

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
  translations: Translations;
  availableLanguages: LanguageOption[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => detectBrowserLanguage());

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('cartograph_language', lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore storage error
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const translations = TRANSLATIONS[language] || TRANSLATIONS.en;

  const t = (key: keyof Translations, params?: Record<string, string | number>): string => {
    let str = translations[key] || TRANSLATIONS.en[key] || String(key);
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
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
