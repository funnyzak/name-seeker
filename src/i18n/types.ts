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

// 支持的语言类型
export type SupportedLanguage = 'en' | 'zh';

// 语言配置
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

// 语言切换器选项
export type LanguageOption = {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
};

/**
 * 规范化语言代码
 * 将 "zh-CN", "zh-TW" 等转换为 "zh"
 * 将 "en-US", "en-GB" 等转换为 "en"
 */
export const normalizeLanguage = (language: string): SupportedLanguage => {
  // 提取语言代码的前两位
  const languageCode = language.toLowerCase().split('-')[0];
  
  // 检查是否为支持的语言
  if (languageCode === 'zh' || languageCode === 'en') {
    return languageCode as SupportedLanguage;
  }
  
  // 默认返回英语
  return 'en';
};

/**
 * 验证语言代码是否有效
 */
export const isValidLanguage = (language: string): language is SupportedLanguage => {
  return language === 'zh' || language === 'en';
};

/**
 * 语言持久化存储 key
 */
export const LANGUAGE_STORAGE_KEY = 'i18nextLng';

/**
 * 从 localStorage 读取语言设置
 */
export const getStoredLanguage = (): SupportedLanguage | null => {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && isValidLanguage(stored)) {
    return stored;
  }
  return null;
};

/**
 * 保存语言设置到 localStorage
 */
export const setStoredLanguage = (language: SupportedLanguage): void => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

/**
 * 从浏览器获取首选语言
 */
export const getBrowserLanguage = (): SupportedLanguage => {
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  return normalizeLanguage(browserLang);
};

/**
 * 检测并返回应该使用的语言
 * 优先级: localStorage > 浏览器语言 > 默认英语
 */
export const detectLanguage = (): SupportedLanguage => {
  return getStoredLanguage() || getBrowserLanguage() || 'en';
};
