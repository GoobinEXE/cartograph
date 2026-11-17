/**
 * Text that ships with a data catalog (source docs, platform descriptions, checklists)
 * instead of the UI dictionary. Portuguese and English are mandatory; any other UI
 * language falls back to English when its own variant is absent, so adding a language
 * never leaves a catalog entry blank.
 */
export interface LocalizedText {
  pt: string;
  en: string;
  es?: string;
  fr?: string;
}

export function localize(text: LocalizedText, language: string): string {
  const variant = (text as unknown as Record<string, string | undefined>)[language];
  return variant && variant.trim() ? variant : text.en;
}

export type ProseLanguage = 'pt' | 'en';

/**
 * Long-form content (About pages, legal text, export headings, methodology paragraphs) is
 * written in Portuguese and English. Every other UI language reads the English version;
 * short interface strings live in the dictionary and exist in all UI languages.
 */
export function proseLanguage(language: string): ProseLanguage {
  return language === 'pt' ? 'pt' : 'en';
}

const INTL_LOCALES: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es',
  fr: 'fr-FR',
};

/** BCP 47 locale for Intl date/number formatting in the given UI language. */
export function intlLocale(language: string): string {
  return INTL_LOCALES[language] ?? 'en-US';
}
