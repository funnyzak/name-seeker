import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectLanguage, setStoredLanguage } from './types';

// Import translation resources
import enCommon from './locales/en/common.json';
import enSearch from './locales/en/search.json';
import enResults from './locales/en/results.json';
import enExport from './locales/en/export.json';
import enModals from './locales/en/modals.json';
import enToast from './locales/en/toast.json';
import enErrors from './locales/en/errors.json';

import zhCommon from './locales/zh/common.json';
import zhSearch from './locales/zh/search.json';
import zhResults from './locales/zh/results.json';
import zhExport from './locales/zh/export.json';
import zhModals from './locales/zh/modals.json';
import zhToast from './locales/zh/toast.json';
import zhErrors from './locales/zh/errors.json';

// Configure translation resources
const resources = {
  en: {
    common: enCommon,
    search: enSearch,
    results: enResults,
    export: enExport,
    modals: enModals,
    toast: enToast,
    errors: enErrors,
  },
  zh: {
    common: zhCommon,
    search: zhSearch,
    results: zhResults,
    export: zhExport,
    modals: zhModals,
    toast: zhToast,
    errors: zhErrors,
  },
};

// Detect initial language
const initialLanguage = detectLanguage();

// Initialize i18next
i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'search', 'results', 'export', 'modals', 'toast', 'errors'],
  supportedLngs: ['en', 'zh'],

  // Interpolation configuration
  interpolation: {
    escapeValue: false, // React already prevents XSS
  },

  // Debug mode (development environment)
  debug: import.meta.env.DEV,

  // React configuration
  react: {
    useSuspense: false,
  },
});

// Listen for language changes, auto-persist and update HTML lang attribute
i18n.on('languageChanged', (lng: string) => {
  setStoredLanguage(lng as 'en' | 'zh');
  document.documentElement.lang = lng;

  if (import.meta.env.DEV) {
    console.log('🌍 Language changed to:', lng);
  }
});

// Set initial HTML lang attribute
document.documentElement.lang = initialLanguage;

// Development environment logging
if (import.meta.env.DEV) {
  console.log('✅ i18n initialized successfully');
  console.log('📍 Current language:', i18n.language);
  console.log('📚 Available namespaces:', i18n.options.ns);
  console.log('🌍 Supported languages:', i18n.options.supportedLngs);
}

export default i18n;
