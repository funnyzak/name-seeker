import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectLanguage, setStoredLanguage } from './types';

// 导入翻译资源
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

// 配置翻译资源
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

// 检测初始语言
const initialLanguage = detectLanguage();

// 初始化 i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'search', 'results', 'export', 'modals', 'toast', 'errors'],
    supportedLngs: ['en', 'zh'],
    
    // 插值配置
    interpolation: {
      escapeValue: false, // React 已经防止 XSS
    },
    
    // 调试模式（开发环境）
    debug: process.env.NODE_ENV === 'development',
    
    // React 配置
    react: {
      useSuspense: false,
    },
  });

// 监听语言变化，自动持久化和更新 HTML lang 属性
i18n.on('languageChanged', (lng: string) => {
  setStoredLanguage(lng as 'en' | 'zh');
  document.documentElement.lang = lng;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🌍 Language changed to:', lng);
  }
});

// 设置初始 HTML lang 属性
document.documentElement.lang = initialLanguage;

// 开发环境日志
if (process.env.NODE_ENV === 'development') {
  console.log('✅ i18n initialized successfully');
  console.log('📍 Current language:', i18n.language);
  console.log('📚 Available namespaces:', i18n.options.ns);
  console.log('🌍 Supported languages:', i18n.options.supportedLngs);
}

export default i18n;
