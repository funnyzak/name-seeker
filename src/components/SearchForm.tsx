import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SearchHistory from './SearchHistory';
import { SearchType } from '../types';
import type { SearchFormProps } from '../types';

const SearchForm: React.FC<SearchFormProps> = ({ 
  isSearching,
  searchType: initialSearchType,
  onSubmit, 
  onStopSearch,
  searchHistory,
  onAddToHistory,
  onRemoveFromHistory,
  onClearHistory,
  onError,
  onWarning
}) => {
  const { t } = useTranslation(['search', 'common']);
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(initialSearchType || SearchType.USERNAME);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close history when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      if (onError) {
        onError(t('search:validation.emptyQuery'));
      }
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(query.trim())) {
     setSearchType(SearchType.EMAIL);
    } else {
      setSearchType(SearchType.USERNAME);
    }

    // Basic length validation
    if (searchType === SearchType.USERNAME && query.trim().length < 2) {
      if (onWarning) {
        onWarning(t('search:validation.usernameTooShort'));
      }
      return;
    }

    setShowHistory(false);
    
    // Add to search history
    if (onAddToHistory) {
      onAddToHistory(query.trim());
    }
    
    onSubmit(query.trim(), searchType);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // const handleSearchTypeChange = (type: SearchType) => {
  //   setSearchType(type);
  //   setQuery('');
  // };

  const handleInputFocus = () => {
    if (searchHistory && searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleHistorySelect = (selectedQuery: string) => {
    setQuery(selectedQuery);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleHistoryRemove = (queryToRemove: string) => {
    if (onRemoveFromHistory) {
      onRemoveFromHistory(queryToRemove);
    }
  };

  const handleHistoryClear = () => {
    if (onClearHistory) {
      onClearHistory();
    }
    setShowHistory(false);
  };

  const handleStopSearch = () => {
    if (onStopSearch) {
      onStopSearch();
    }
  };

  return (
    <div className="search-form-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className="search-form-compact">
        {/* Search type selection dropdown */}
        {/* <select 
          className="type-selector-dropdown"
          value={searchType}
          onChange={(e) => handleSearchTypeChange(e.target.value as SearchType)}
          disabled={isSearching}
          aria-label={t('search:form.searchTypeLabel')}
        >
          <option value={SearchType.USERNAME}>👤 {t('search:form.searchTypeUsername')}</option>
          <option value={SearchType.EMAIL}>📧 {t('search:form.searchTypeEmail')}</option>
        </select> */}

        {/* Input field container */}
        <div className="input-wrapper">
          <div className="input-group">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={searchType === SearchType.USERNAME ? t('search:form.inputPlaceholder') : t('search:form.inputPlaceholder')}
              className="search-input"
              disabled={isSearching}
              autoFocus
              aria-label={searchType === SearchType.USERNAME ? t('search:form.inputLabel') : t('search:form.inputLabel')}
            />
            
            {/* Search history dropdown */}
            <SearchHistory
              history={searchHistory || []}
              onSelect={handleHistorySelect}
              onRemove={handleHistoryRemove}
              onClear={handleHistoryClear}
              show={showHistory && !isSearching}
            />
          </div>
        </div>

        {/* Button group */}
        <div className="button-group-compact">
         { !isSearching && <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className={`search-button-compact ${isSearching ? 'searching' : ''}`}
            aria-label={isSearching ? t('common:status.loading') : t('search:form.searchButton')}
          >
            {isSearching ? (
              <>
                <div className="spinner" aria-hidden="true"></div>
                {t('common:status.loading')}
              </>
            ) : (
              t('search:form.searchButton')
            )}
          </button>}

          {isSearching && (
            <button
              type="button"
              onClick={handleStopSearch}
              className="stop-button-compact"
              aria-label={t('search:form.stopButton')}
            >
              <div className="stop-icon" aria-hidden="true">⏹</div>
              {t('search:form.stopButton')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchForm;