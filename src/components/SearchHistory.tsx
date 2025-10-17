import React from 'react';
import { useTranslation } from 'react-i18next';

interface SearchHistoryProps {
  history: string[];
  onSelect: (username: string) => void;
  onRemove: (username: string) => void;
  onClear: () => void;
  show: boolean;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelect,
  onRemove,
  onClear,
  show,
}) => {
  const { t } = useTranslation('search');
  if (!show || history.length === 0) {
    return null;
  }

  return (
    <div className="search-history-dropdown" role="listbox">
      <div className="search-history-header">
        <span className="history-title">{t('history.recentSearches')}</span>
        <button
          type="button"
          className="history-clear-button"
          onClick={e => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={t('history.clearHistoryAriaLabel')}
        >
          {t('history.clearHistory')}
        </button>
      </div>
      <ul className="search-history-list">
        {history.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="search-history-item"
            role="option"
          >
            <button
              type="button"
              className="history-item-button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              title={t('history.searchPrefix', { item })}
            >
              <span className="history-icon">🔍</span>
              <span className="history-text">{item}</span>
            </button>
            <button
              type="button"
              className="history-remove-button"
              onClick={e => {
                e.stopPropagation();
                onRemove(item);
              }}
              aria-label={t('history.deleteRecord', { item })}
              title={t('history.deleteRecordTitle')}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchHistory;
