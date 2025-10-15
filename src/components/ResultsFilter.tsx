import React, { useState } from 'react';

interface ResultsFilterProps {
  onFilterChange: (filter: string) => void;
  resultsCount: number;
}

const ResultsFilter: React.FC<ResultsFilterProps> = ({ onFilterChange, resultsCount }) => {
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
          placeholder="筛选结果..."
          value={filter}
          onChange={handleFilterChange}
          aria-label="筛选搜索结果"
        />
        {filter && (
          <button
            type="button"
            className="filter-clear-button"
            onClick={handleClear}
            aria-label="清除筛选"
            title="清除筛选"
          >
            ×
          </button>
        )}
      </div>
      {filter && (
        <span className="filter-count">
          显示 {resultsCount} 个结果
        </span>
      )}
    </div>
  );
};

export default ResultsFilter;

