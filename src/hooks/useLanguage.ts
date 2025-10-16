import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_CONFIG, type SupportedLanguage, normalizeLanguage } from '../i18n/types';

interface UseLanguageReturn {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  availableLanguages: Array<{
    code: SupportedLanguage;
    name: string;
    nativeName: string;
    flag: string;
  }>;
  isLoading: boolean;
  error: string | null;
}

export const useLanguage = (): UseLanguageReturn => {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalize current language code
  const currentLanguage = normalizeLanguage(i18n.language || 'en');

  // Use useMemo to cache available languages list
  const availableLanguages = useMemo(() => 
    Object.entries(LANGUAGE_CONFIG).map(([code, config]) => ({
      code: code as SupportedLanguage,
      name: config.name,
      nativeName: config.nativeName,
      flag: config.flag,
    }))
  , []);

  const setLanguage = async (language: SupportedLanguage): Promise<void> => {
    if (language === currentLanguage) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // i18n.changeLanguage will automatically trigger languageChanged event
      // The listener in index.ts will handle localStorage and HTML lang attribute updates
      await i18n.changeLanguage(language);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change language';
      console.error('Failed to change language:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for language changes, reset loading state
  useEffect(() => {
    const handleLanguageChange = () => {
      setIsLoading(false);
      setError(null);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  return {
    currentLanguage,
    setLanguage,
    availableLanguages,
    isLoading,
    error,
  };
};
