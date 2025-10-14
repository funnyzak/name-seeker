import React, { useState } from 'react';
import type { SearchFormProps } from '../types';

const SearchForm: React.FC<SearchFormProps> = ({ isSearching, onSubmit, onStopSearch }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('请输入用户名或邮箱');
      return;
    }

    if (username.trim().length < 2) {
      setError('用户名至少需要2个字符');
      return;
    }

    setError('');
    onSubmit(username.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (error) {
      setError('');
    }
  };

  const handleStopSearch = () => {
    if (onStopSearch) {
      onStopSearch();
    }
  };

  return (
    <div className="search-form-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="input-group">
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            placeholder="输入用户名或邮箱地址..."
            className={`search-input ${error ? 'error' : ''}`}
            disabled={isSearching}
            autoFocus
          />
          {error && <span className="error-message">{error}</span>}
        </div>

        <div className="button-group">
          <button
            type="submit"
            disabled={isSearching || !username.trim()}
            className={`search-button ${isSearching ? 'searching' : ''}`}
          >
            {isSearching ? (
              <>
                <div className="spinner"></div>
                搜索中...
              </>
            ) : (
              '开始搜索'
            )}
          </button>

          {isSearching && (
            <button
              type="button"
              onClick={handleStopSearch}
              className="stop-button"
              title="停止搜索"
            >
              <div className="stop-icon">⏹</div>
              停止
            </button>
          )}
        </div>
      </form>

      {isSearching && (
        <div className="searching-hint">
          <p>
            🔄 正在搜索中，这可能需要几分钟时间...
            <br />
            <small>将检查数百个网站以查找相关用户信息</small>
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchForm;