import React, { useState, useMemo } from 'react';
import ResultItem from './ResultItem';
import ProgressIndicator from './ProgressIndicator';
import ExportButton from './ExportButton';
import ResultsFilter from './ResultsFilter';
import type { ResultsDisplayProps } from '../types';

interface CollapsedSections {
  found: boolean;
  notFound: boolean;
  error: boolean;
  pending: boolean;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  progress,
  isSearching,
  query,
  onExportSuccess,
  onExportError,
  onClearResults
}) => {
  const [collapsed, setCollapsed] = useState<CollapsedSections>({
    found: false,
    notFound: true,  // 默认折叠 Not Found
    error: false,
    pending: false
  });
  const [filterText, setFilterText] = useState('');

  // 使用 useMemo 缓存筛选后的结果
  const filteredResults = useMemo(() => {
    if (!filterText.trim()) {
      return results;
    }
    
    const searchTerm = filterText.toLowerCase();
    return results.filter(r => 
      r.site.toLowerCase().includes(searchTerm) ||
      (r.category && r.category.toLowerCase().includes(searchTerm)) ||
      (r.url && r.url.toLowerCase().includes(searchTerm))
    );
  }, [results, filterText]);

  const foundResults = filteredResults.filter(r => r.status === 'Found');
  const notFoundResults = filteredResults.filter(r => r.status === 'NotFound');
  const errorResults = filteredResults.filter(r => r.status === 'Error');
  const pendingResults = filteredResults.filter(r => r.status === 'Pending');

  const hasResults = results.length > 0 || isSearching;

  const toggleSection = (section: keyof CollapsedSections) => {
    setCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!hasResults) {
    return (
      <div className="empty-state" role="status" aria-label="暂无搜索结果">
        <div className="empty-icon" aria-hidden="true">🔍</div>
        <h3>开始你的搜索</h3>
        <p className="empty-description">输入用户名或邮箱，将帮您在数百个网站上查找相关信息</p>
        <div className="empty-features">
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">⚡</span>
            <span>快速搜索</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">🌐</span>
            <span>多网站覆盖</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">📊</span>
            <span>结果导出</span>
          </div>
        </div>
        <div className="empty-shortcuts">
          <p className="shortcuts-title">快捷键提示：</p>
          <ul className="shortcuts-list">
            <li><kbd>/</kbd> 聚焦搜索框</li>
            <li><kbd>Esc</kbd> 停止搜索</li>
            <li><kbd>Ctrl+H</kbd> 显示帮助</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container" role="region" aria-label="搜索结果">
      {/* 结果头部：标题和导出按钮 */}
      {results.length > 0 && (
        <div className="results-header">
          <h3 className="results-title" id="results-heading">
            搜索结果 <span className="results-count" aria-label={`显示 ${filteredResults.length} 个，共 ${results.length} 个结果`}>({filteredResults.length}/{results.length})</span>
          </h3>
          <div className="results-actions">
            <ResultsFilter 
              onFilterChange={setFilterText}
              resultsCount={filteredResults.length}
            />
            {!isSearching && (
              <>
                <ExportButton 
                  results={results} 
                  username={query}
                  disabled={isSearching}
                  onExportSuccess={onExportSuccess}
                  onExportError={onExportError}
                />
                {onClearResults && (
                  <button
                    className="btn btn-clear"
                    onClick={onClearResults}
                    aria-label="清除搜索结果"
                    title="清除所有搜索结果"
                  >
                    <span className="btn-icon" aria-hidden="true">🗑️</span>
                    <span className="btn-text">清除结果</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 进度指示器 */}
      <ProgressIndicator progress={progress} isSearching={isSearching} />

      {/* 结果区域滚动容器 */}
      <div className="section-wrapper" role="main" aria-labelledby="results-heading">
        {foundResults.length > 0 && (
          <div className="results-section">
            <h3 
              className="section-header found-header"
              onClick={() => toggleSection('found')}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsed.found}
              aria-controls="found-results-list"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('found');
                }
              }}
            >
              <span>✓ 找到的用户 ({foundResults.length})</span>
              <span className={`collapse-icon ${collapsed.found ? 'collapsed' : ''}`} aria-hidden="true">
                ▼
              </span>
            </h3>
            <div 
              id="found-results-list"
              className={`results-list ${collapsed.found ? 'collapsed' : ''}`}
              role="list"
              aria-label="找到的用户列表"
            >
              {foundResults.reverse().map((result, index) => (
                <ResultItem key={`found-${result.site}-${index}`} result={result} />
              ))}
            </div>
          </div>
        )}

        {pendingResults.length > 0 && isSearching && (
          <div className="results-section">
            <h3 
              className="section-header pending-header"
              onClick={() => toggleSection('pending')}
            >
              <span>⏳ 正在检查 ({pendingResults.length})</span>
              <span className={`collapse-icon ${collapsed.pending ? 'collapsed' : ''}`}>
                ▼
              </span>
            </h3>
            <div className={`results-list ${collapsed.pending ? 'collapsed' : ''}`}>
              {pendingResults.reverse().map((result, index) => (
                <ResultItem key={`pending-${result.site}-${index}`} result={result} />
              ))}
            </div>
          </div>
        )}

        {errorResults.length > 0 && (
          <div className="results-section">
            <h3 
              className="section-header error-header"
              onClick={() => toggleSection('error')}
            >
              <span>⚠ 错误 ({errorResults.length})</span>
              <span className={`collapse-icon ${collapsed.error ? 'collapsed' : ''}`}>
                ▼
              </span>
            </h3>
            <div className={`results-list ${collapsed.error ? 'collapsed' : ''}`}>
              {errorResults.reverse().map((result, index) => (
                <ResultItem key={`error-${result.site}-${index}`} result={result} />
              ))}
            </div>
          </div>
        )}

        {notFoundResults.length > 0 && (
          <div className="results-section">
            <h3 
              className="section-header not-found-header"
              onClick={() => toggleSection('notFound')}
            >
              <span>✗ 未找到 ({notFoundResults.length})</span>
              <span className={`collapse-icon ${collapsed.notFound ? 'collapsed' : ''}`}>
                ▼
              </span>
            </h3>
            <div className={`results-list ${collapsed.notFound ? 'collapsed' : ''}`}>
              {notFoundResults.reverse().map((result, index) => (
                <ResultItem key={`notfound-${result.site}-${index}`} result={result} />
              ))}
            </div>
          </div>
        )}
      </div>

      {!isSearching && (results.length > 0 || progress.checked_sites > 0) && (
        <div className="search-summary">
          {/* {progress.current_site === undefined && progress.checked_sites < progress.total_sites && (
            <div className="search-stopped-notice">
              <span className="stopped-icon">⏸️</span>
              搜索已被停止，显示已完成检查的结果
            </div>
          )} */}
          <div className="summary-stats">
            <span className="summary-stat found">
              找到: {foundResults.length}
            </span>
            <span className="summary-stat not-found">
              未找到: {notFoundResults.length}
            </span>
            <span className="summary-stat error">
              错误: {errorResults.length}
            </span>
            <span className="summary-stat total">
              总计: {results.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;