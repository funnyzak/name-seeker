import React from 'react';
import ResultItem from './ResultItem';
import ProgressIndicator from './ProgressIndicator';
import type { ResultsDisplayProps } from '../types';

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  progress,
  isSearching
}) => {
  const foundResults = results.filter(r => r.status === 'Found');
  const notFoundResults = results.filter(r => r.status === 'NotFound');
  const errorResults = results.filter(r => r.status === 'Error');
  const pendingResults = results.filter(r => r.status === 'Pending');

  const hasResults = results.length > 0 || isSearching;

  if (!hasResults) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>开始您的第一次搜索</h3>
        <p>输入用户名或邮箱，我们将帮您在数百个网站上查找相关信息</p>
      </div>
    );
  }

  return (
    <div className="results-container">
      <ProgressIndicator progress={progress} isSearching={isSearching} />

      {foundResults.length > 0 && (
        <div className="results-section">
          <h3 className="section-header found-header">
            ✓ 找到的用户 ({foundResults.length})
          </h3>
          <div className="results-list">
            {foundResults.map((result, index) => (
              <ResultItem key={`found-${result.site}-${index}`} result={result} />
            ))}
          </div>
        </div>
      )}

      {pendingResults.length > 0 && isSearching && (
        <div className="results-section">
          <h3 className="section-header pending-header">
            ⏳ 正在检查 ({pendingResults.length})
          </h3>
          <div className="results-list">
            {pendingResults.map((result, index) => (
              <ResultItem key={`pending-${result.site}-${index}`} result={result} />
            ))}
          </div>
        </div>
      )}

      {notFoundResults.length > 0 && (
        <div className="results-section">
          <h3 className="section-header not-found-header">
            ✗ 未找到 ({notFoundResults.length})
          </h3>
          <div className="results-list collapsed">
            {notFoundResults.slice(0, 5).map((result, index) => (
              <ResultItem key={`notfound-${result.site}-${index}`} result={result} />
            ))}
            {notFoundResults.length > 5 && (
              <div className="collapsed-hint">
                还有 {notFoundResults.length - 5} 个未找到的结果...
              </div>
            )}
          </div>
        </div>
      )}

      {errorResults.length > 0 && (
        <div className="results-section">
          <h3 className="section-header error-header">
            ⚠ 错误 ({errorResults.length})
          </h3>
          <div className="results-list">
            {errorResults.map((result, index) => (
              <ResultItem key={`error-${result.site}-${index}`} result={result} />
            ))}
          </div>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="search-summary">
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