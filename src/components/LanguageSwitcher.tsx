import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { LANGUAGE_CONFIG, type SupportedLanguage } from '../i18n/types';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'buttons';
  size?: 'small' | 'medium' | 'large';
  onError?: (error: string) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  variant = 'dropdown',
  size = 'medium',
  onError
}) => {
  const { t } = useTranslation('common');
  const { currentLanguage, setLanguage, isLoading, error } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentConfig = LANGUAGE_CONFIG[currentLanguage];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for errors and notify parent component
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleLanguageChange = async (language: SupportedLanguage) => {
    if (language === currentLanguage || isLoading) return;

    await setLanguage(language);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!isLoading) {
      setIsOpen(!isOpen);
    }
  };

  if (variant === 'buttons') {
    return (
      <div className={`language-switcher-buttons ${className}`}>
        {Object.entries(LANGUAGE_CONFIG).map(([code, config]) => (
          <button
            key={code}
            onClick={() => handleLanguageChange(code as SupportedLanguage)}
            className={`
              language-button
              ${currentLanguage === code ? 'active' : ''}
              ${size}
            `}
            title={config.name}
            aria-label={`Switch to ${config.name}`}
            disabled={isLoading}
            aria-disabled={isLoading}
          >
            <span className="flag">{config.flag}</span>
            <span className="code">{config.code.toUpperCase()}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`language-switcher-dropdown ${className}`} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`
          language-dropdown-trigger
          ${isOpen ? 'open' : ''}
          ${size}
        `}
        aria-label={t('label.language')}
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={isLoading}
        aria-disabled={isLoading}
      >
        <span className="flag">{currentConfig.flag}</span>
        <span className="code">{currentConfig.code.toUpperCase()}</span>
        <span className="arrow">{isLoading ? '⏳' : '▼'}</span>
      </button>
      
      {isOpen && !isLoading && (
        <div className="language-dropdown-menu">
          {Object.entries(LANGUAGE_CONFIG).map(([code, config]) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code as SupportedLanguage)}
              className={`
                language-option
                ${currentLanguage === code ? 'active' : ''}
              `}
              aria-label={`Switch to ${config.name}`}
              disabled={currentLanguage === code}
            >
              <span className="flag">{config.flag}</span>
              <div className="language-info">
                <span className="name">{config.nativeName}</span>
                <span className="english-name">{config.name}</span>
              </div>
              {currentLanguage === code && (
                <span className="checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
