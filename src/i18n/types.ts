import 'react-i18next';
import type common from './locales/en/common.json';
import type search from './locales/en/search.json';
import type results from './locales/en/results.json';
import type exportData from './locales/en/export.json';
import type modals from './locales/en/modals.json';
import type toast from './locales/en/toast.json';
import type errors from './locales/en/errors.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      search: typeof search;
      results: typeof results;
      export: typeof exportData;
      modals: typeof modals;
      toast: typeof toast;
      errors: typeof errors;
    };
  }
}

// Supported language types
export type SupportedLanguage = 'en' | 'zh';

// Language configuration
export const LANGUAGE_CONFIG = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
  },
} as const;

// Language switcher options
export type LanguageOption = {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
};

/**
 * Normalize language code
 * Convert "zh-CN", "zh-TW" etc. to "zh"
 * Convert "en-US", "en-GB" etc. to "en"
 */
export const normalizeLanguage = (language: string): SupportedLanguage => {
  // Extract first two characters of language code
  const languageCode = language.toLowerCase().split('-')[0];
  
  // Check if it's a supported language
  if (languageCode === 'zh' || languageCode === 'en') {
    return languageCode as SupportedLanguage;
  }
  
  // Default to English
  return 'en';
};

/**
 * Validate if language code is valid
 */
export const isValidLanguage = (language: string): language is SupportedLanguage => {
  return language === 'zh' || language === 'en';
};

/**
 * Language persistence storage key
 */
export const LANGUAGE_STORAGE_KEY = 'i18nextLng';

/**
 * Read language settings from localStorage
 */
export const getStoredLanguage = (): SupportedLanguage | null => {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && isValidLanguage(stored)) {
    return stored;
  }
  return null;
};

/**
 * Save language settings to localStorage
 */
export const setStoredLanguage = (language: SupportedLanguage): void => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

/**
 * Get preferred language from browser
 */
export const getBrowserLanguage = (): SupportedLanguage => {
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  return normalizeLanguage(browserLang);
};

/**
 * Detect and return the language that should be used
 * Priority: localStorage > browser language > default English
 */
export const detectLanguage = (): SupportedLanguage => {
  return getStoredLanguage() || getBrowserLanguage() || 'en';
};
