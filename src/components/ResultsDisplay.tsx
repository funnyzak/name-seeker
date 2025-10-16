import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['results', 'common']);
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
      <div className="empty-state" role="status" aria-label={t('results:empty.ariaLabel')}>
        <div className="empty-icon" aria-hidden="true">🔍</div>
        <h3>{t('results:empty.title')}</h3>
        <p className="empty-description">{t('results:empty.description')}</p>
        <div className="empty-features">
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">⚡</span>
            <span>{t('results:empty.features.fastSearch')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">🌐</span>
            <span>{t('results:empty.features.multiSite')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">📊</span>
            <span>{t('results:empty.features.export')}</span>
          </div>
        </div>
        <div className="empty-shortcuts">
          <p className="shortcuts-title">{t('results:empty.shortcuts.title')}</p>
          <ul className="shortcuts-list">
            <li><kbd>/</kbd> {t('results:empty.shortcuts.focus')}</li>
            <li><kbd>Esc</kbd> {t('results:empty.shortcuts.stop')}</li>
            <li><kbd>Ctrl+H</kbd> {t('results:empty.shortcuts.help')}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container" role="region" aria-label={t('results:empty.resultsAriaLabel')}>
      {/* 结果头部：标题和导出按钮 */}
        <div className="results-header">
          <h3 className="results-title" id="results-heading">
            {t('results:title')} <span className="results-count" aria-label={t('results:actions.resultsCount', { filtered: filteredResults.length, total: results.length })}>({filteredResults.length}/{results.length})</span>
          </h3>
          <div className="results-actions">
            <ResultsFilter 
              onFilterChange={setFilterText}
              resultsCount={filteredResults.length}
            />
                <ExportButton 
                  results={results} 
                  username={query}
                  disabled={isSearching}
                  onExportSuccess={onExportSuccess}
                  onExportError={onExportError}
                />
                {onClearResults && !isSearching && (
                  <button
                    className="btn btn-clear"
                    onClick={onClearResults}
                    aria-label={t('results:actions.clearAriaLabel')}
                  >
                    <span className="btn-icon" aria-hidden="true">🗑️</span>
                    <span className="btn-text">{t('results:actions.reset')}</span>
                  </button>
                )}
          </div>
        </div>

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
              <span>✓ {t('results:categories.foundUsers')} ({foundResults.length})</span>
              <span className={`collapse-icon ${collapsed.found ? 'collapsed' : ''}`} aria-hidden="true">
                ▼
              </span>
            </h3>
            <div 
              id="found-results-list"
              className={`results-list ${collapsed.found ? 'collapsed' : ''}`}
              role="list"
              aria-label={t('results:categories.foundUsers')}
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
              <span>⏳ {t('results:categories.checking')} ({pendingResults.length})</span>
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
              <span>⚠ {t('results:categories.error')} ({errorResults.length})</span>
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
              <span>✗ {t('results:categories.notFound')} ({notFoundResults.length})</span>
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
              {t('results:summary.found')}: {foundResults.length}
            </span>
            <span className="summary-stat not-found">
              {t('results:categories.notFound')}: {notFoundResults.length}
            </span>
            <span className="summary-stat error">
              {t('results:summary.error')}: {errorResults.length}
            </span>
            <span className="summary-stat total">
              {t('results:summary.total')}: {results.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;