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

/** Pick the first supported language in the system's preference order. */
export const detectLanguage = (): SupportedLanguage => {
  for (const locale of [...(navigator.languages ?? []), navigator.language]) {
    const code = locale?.toLowerCase().split(/[-_]/)[0];
    if (code === 'zh' || code === 'en') return code;
  }
  return 'en';
};
