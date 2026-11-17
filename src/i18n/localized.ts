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
