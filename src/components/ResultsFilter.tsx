import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ResultsFilterProps {
  onFilterChange: (filter: string) => void;
  resultsCount: number;
}

const ResultsFilter: React.FC<ResultsFilterProps> = ({ onFilterChange, resultsCount }) => {
  const { t } = useTranslation('results');
  const [filter, setFilter] = useState('');

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilter(value);
    onFilterChange(value);
  };

  const handleClear = () => {
    setFilter('');
    onFilterChange('');
  };

  return (
    <div className="results-filter">
      <div className="filter-input-wrapper">
        <span className="filter-icon">🔍</span>
        <input
          type="text"
          className="filter-input"
          placeholder={t('filter.filterPlaceholder')}
          value={filter}
          onChange={handleFilterChange}
          aria-label={t('filter.filterAriaLabel')}
        />
        {filter && (
          <button
            type="button"
            className="filter-clear-button"
            onClick={handleClear}
            aria-label={t('filter.clearFilter')}
            title={t('filter.clearFilterTitle')}
          >
            ×
          </button>
        )}
      </div>
      {filter && (
        <span className="filter-count">
          {t('filter.showingResults', { count: resultsCount })}
        </span>
      )}
    </div>
  );
};

export default ResultsFilter;

