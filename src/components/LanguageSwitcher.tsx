import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { LANGUAGE_CONFIG, type SupportedLanguage } from '../i18n/types';

interface LanguageSwitcherProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onError?: (error: string) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  size = 'medium',
  onError,
}) => {
  const { t } = useTranslation('common');
  const { currentLanguage, setLanguage, isLoading, error } = useLanguage();

  const languageOrder = useMemo(
    () => Object.keys(LANGUAGE_CONFIG) as SupportedLanguage[],
    []
  );

  const currentConfig = LANGUAGE_CONFIG[currentLanguage];

  // Listen for errors and notify parent component
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const nextLanguage = useMemo(() => {
    const currentIndex = languageOrder.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % languageOrder.length;
    return languageOrder[nextIndex];
  }, [currentLanguage, languageOrder]);

  const handleCycleLanguage = async () => {
    if (isLoading) return;
    await setLanguage(nextLanguage);
  };

  const wrapperClassName = ['language-switcher-cycle', size, className]
    .filter(Boolean)
    .join(' ');

  const nextConfig = LANGUAGE_CONFIG[nextLanguage];

  return (
    <div className={wrapperClassName}>
      <button
        onClick={handleCycleLanguage}
        className="language-cycle-button"
        aria-label={`${t('label.language')}: ${currentConfig.nativeName} → ${nextConfig.nativeName}`}
        title={`${currentConfig.name} → ${nextConfig.name}`}
        disabled={isLoading}
        aria-disabled={isLoading}
      >
        <div className="language-current">
          <span className="flag">{currentConfig.flag}</span>
          <span className="code">{currentConfig.code.toUpperCase()}</span>
        </div>
        <span className="separator">→</span>
        <div className="language-next">
          <span className="flag muted">{nextConfig.flag}</span>
          <span className="code muted">{nextConfig.code.toUpperCase()}</span>
        </div>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
