import React, { useState, useRef, useEffect } from 'react';
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
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(initialSearchType || SearchType.USERNAME);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭历史记录
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
      const message = searchType === SearchType.USERNAME ? '请输入用户名' : '请输入邮箱';
      if (onError) {
        onError(message);
      }
      return;
    }

    // 基本长度验证
    if (searchType === SearchType.USERNAME && query.trim().length < 2) {
      if (onWarning) {
        onWarning('用户名至少需要2个字符');
      }
      return;
    }

    // 简单的邮箱格式检查
    if (searchType === SearchType.EMAIL && !query.includes('@')) {
      if (onError) {
        onError('请输入有效的邮箱地址');
      }
      return;
    }

    setShowHistory(false);
    
    // 添加到历史记录
    if (onAddToHistory) {
      onAddToHistory(query.trim());
    }
    
    onSubmit(query.trim(), searchType);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    setQuery('');
  };

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
        {/* 搜索类型选择下拉 */}
        <select 
          className="type-selector-dropdown"
          value={searchType}
          onChange={(e) => handleSearchTypeChange(e.target.value as SearchType)}
          disabled={isSearching}
          aria-label="选择搜索类型"
        >
          <option value={SearchType.USERNAME}>👤 用户名</option>
          <option value={SearchType.EMAIL}>📧 邮箱</option>
        </select>

        {/* 输入框容器 */}
        <div className="input-wrapper">
          <div className="input-group">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={searchType === SearchType.USERNAME ? '输入用户名... (按 / 快速聚焦)' : '输入邮箱地址... (按 / 快速聚焦)'}
              className="search-input"
              disabled={isSearching}
              autoFocus
              aria-label={searchType === SearchType.USERNAME ? '搜索用户名' : '搜索邮箱'}
            />
            
            {/* 搜索历史下拉 */}
            <SearchHistory
              history={searchHistory || []}
              onSelect={handleHistorySelect}
              onRemove={handleHistoryRemove}
              onClear={handleHistoryClear}
              show={showHistory && !isSearching}
            />
          </div>
        </div>

        {/* 按钮组 */}
        <div className="button-group-compact">
         { !isSearching && <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className={`search-button-compact ${isSearching ? 'searching' : ''}`}
            aria-label={isSearching ? '正在搜索' : '开始搜索'}
          >
            {isSearching ? (
              <>
                <div className="spinner" aria-hidden="true"></div>
                搜索中
              </>
            ) : (
              '搜索'
            )}
          </button>}

          {isSearching && (
            <button
              type="button"
              onClick={handleStopSearch}
              className="stop-button-compact"
              aria-label="停止当前搜索"
            >
              <div className="stop-icon" aria-hidden="true">⏹</div>
              停止
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchForm;