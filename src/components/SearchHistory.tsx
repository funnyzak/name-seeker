import React from 'react';

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
  show
}) => {
  if (!show || history.length === 0) {
    return null;
  }

  return (
    <div className="search-history-dropdown" role="listbox">
      <div className="search-history-header">
        <span className="history-title">最近搜索</span>
        <button
          type="button"
          className="history-clear-button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label="清除搜索历史"
        >
          清除
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
              onClick={() => onSelect(item)}
              title={`搜索: ${item}`}
            >
              <span className="history-icon">🔍</span>
              <span className="history-text">{item}</span>
            </button>
            <button
              type="button"
              className="history-remove-button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              aria-label={`删除 ${item}`}
              title="删除此记录"
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

