export type Lang = 'vi' | 'en';

const DEFAULT_LANG: Lang = 'vi';

/**
 * Get current language from URL param, localStorage, or default to 'vi'
 */
export function getLang(): Lang {
  if (typeof window === 'undefined') {
    return DEFAULT_LANG;
  }

  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam === 'vi' || langParam === 'en') {
    return langParam;
  }

  // Check localStorage
  const stored = localStorage.getItem('lang');
  if (stored === 'vi' || stored === 'en') {
    return stored;
  }

  // Default to Vietnamese
  return DEFAULT_LANG;
}

/**
 * Set language and save to localStorage
 */
export function setLang(lang: Lang): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
}

/**
 * Get translations for a specific language
 * This will be used on the server side (Astro)
 */
export async function getTranslations(lang: Lang = DEFAULT_LANG) {
  try {
    const translations = await import(`./translations/${lang}.json`);
    return translations.default;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    // Fallback to Vietnamese if translation file doesn't exist
    const fallback = await import(`./translations/vi.json`);
    return fallback.default;
  }
}
