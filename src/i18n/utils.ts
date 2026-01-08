export type Lang = 'vi' | 'en';

const DEFAULT_LANG: Lang = 'vi';

/**
 * Get current language from URL param, localStorage, or default to 'vi'
 * @param url - Optional URL string for server-side rendering (Astro.url)
 */
export function getLang(url?: URL | string): Lang {
  // Server-side: check URL parameter from Astro.url
  if (typeof window === 'undefined') {
    if (url) {
      const urlObj = typeof url === 'string' ? new URL(url) : url;
      const langParam = urlObj.searchParams.get('lang');
      if (langParam === 'vi' || langParam === 'en') {
        return langParam;
      }
    }
    return DEFAULT_LANG;
  }

  // Client-side: Check URL parameter first
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
 * Get a safe fallback translation structure matching the expected shape
 * This prevents "Cannot read property of undefined" errors when translation files fail to load
 */
function getSafeFallbackTranslations() {
  return {
    hero: {
      name: '',
      role: '',
      summary: '',
      badge: '',
      buttons: {
        viewProjects: '',
        contact: '',
        downloadCV: ''
      },
      highlights: {
        frontend: '',
        frontendContent: '',
        backend: '',
        backendContent: '',
        devops: '',
        devopsContent: '',
        english: '',
        englishContent: '',
        other: '',
        otherContent: ''
      },
      avatarAlt: ''
    },
    projects: {
      labels: {
        role: '',
        tools: '',
        tasks: '',
        results: ''
      },
      items: [],
      galleryAlt: ''
    },
    timeline: {
      title: '',
      achievements: '',
      items: []
    },
    contact: {
      title: '',
      description: '',
      channels: {
        phone: '',
        zalo: '',
        telegram: '',
        email: ''
      }
    },
    layout: {
      title: '',
      description: ''
    }
  };
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
    try {
      const fallback = await import(`./translations/vi.json`);
      return fallback.default;
    } catch (fallbackError) {
      console.error(`Failed to load fallback Vietnamese translations:`, fallbackError);
      // Return a safe fallback structure matching the expected translation shape
      // to prevent "Cannot read property of undefined" errors
      return getSafeFallbackTranslations();
    }
  }
}
