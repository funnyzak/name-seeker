import React, {
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
} from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { useTranslation } from 'react-i18next';
import ResultItem from './ResultItem';
import ProgressIndicator from './ProgressIndicator';
import ExportButton from './ExportButton';
import ResultsFilter from './ResultsFilter';
import type { ResultsDisplayProps, SearchResult } from '../types';

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
  onClearResults,
}) => {
  const { t } = useTranslation(['results', 'common']);
  const [collapsed, setCollapsed] = useState<CollapsedSections>({
    found: false,
    notFound: true, // Default collapse Not Found
    error: false,
    pending: false,
  });
  const [filterText, setFilterText] = useState('');
  const [listWidth, setListWidth] = useState<number>(360);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width for virtualized lists
  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current && typeof window !== 'undefined') {
        const style = window.getComputedStyle(containerRef.current);
        const padding =
          parseFloat(style.paddingLeft || '0') +
          parseFloat(style.paddingRight || '0');
        const width = Math.max(240, containerRef.current.clientWidth - padding);
        setListWidth(width);
      }
    };
    measure();

    const ObserverCtor =
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? window.ResizeObserver
        : null;
    const observer = ObserverCtor ? new ObserverCtor(measure) : null;
    if (observer && containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer?.disconnect();
  }, [collapsed]);

  // Fallback update on window resize if ResizeObserver is unavailable
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setListWidth(containerRef.current.clientWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use useMemo to cache filtered results
  const filteredResults = useMemo(() => {
    if (!filterText.trim()) {
      return results;
    }

    const searchTerm = filterText.toLowerCase();
    return results.filter(
      r =>
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
      [section]: !prev[section],
    }));
  };

  const renderVirtualList = (
    sectionId: string,
    data: typeof results,
    estimatedHeight: number,
    ariaLabel: string
  ) => {
    const displayData = [...data].reverse();

    if (displayData.length < 120) {
      return (
        <div
          id={sectionId}
          className="results-list"
          role="list"
          aria-label={ariaLabel}
        >
          {displayData.map((result, index) => (
            <ResultItem
              key={`${sectionId}-${result.site}-${index}`}
              result={result}
            />
          ))}
        </div>
      );
    }

    const Row = ({
      index,
      style,
      data,
    }: ListChildComponentProps<SearchResult[]>) => (
      <div style={style} role="listitem">
        <ResultItem result={data[index]} />
      </div>
    );

    const height = Math.min(estimatedHeight, displayData.length * 72);
    const width = Math.max(listWidth, 320);

    return (
      <div id={sectionId} className="results-list" role="list">
        <List
          height={height}
          itemCount={displayData.length}
          itemSize={72}
          width={width}
          itemData={displayData}
        >
          {Row}
        </List>
      </div>
    );
  };

  if (!hasResults) {
    return (
      <div
        className="empty-state"
        role="status"
        aria-label={t('results:empty.ariaLabel')}
      >
        <div className="empty-icon" aria-hidden="true">
          🔍
        </div>
        <h3>{t('results:empty.title')}</h3>
        <p className="empty-description">{t('results:empty.description')}</p>
        <div className="empty-features">
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              ⚡
            </span>
            <span>{t('results:empty.features.fastSearch')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              🌐
            </span>
            <span>{t('results:empty.features.multiSite')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              📊
            </span>
            <span>{t('results:empty.features.export')}</span>
          </div>
        </div>
        <div className="empty-shortcuts">
          <p className="shortcuts-title">
            {t('results:empty.shortcuts.title')}
          </p>
          <ul className="shortcuts-list">
            <li>
              <kbd>/</kbd> {t('results:empty.shortcuts.focus')}
            </li>
            <li>
              <kbd>Esc</kbd> {t('results:empty.shortcuts.stop')}
            </li>
            <li>
              <kbd>Ctrl+H</kbd> {t('results:empty.shortcuts.help')}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      className="results-container"
      role="region"
      aria-label={t('results:empty.resultsAriaLabel')}
    >
      {/* Results header: title and export buttons */}
      <div className="results-header">
        <h3 className="results-title" id="results-heading">
          {t('results:title')}{' '}
          <span
            className="results-count"
            aria-label={t('results:actions.resultsCount', {
              filtered: filteredResults.length,
              total: results.length,
            })}
          >
            ({filteredResults.length}/{results.length})
          </span>
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
              <span className="btn-icon" aria-hidden="true">
                🗑️
              </span>
              <span className="btn-text">{t('results:actions.reset')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {isSearching && (
        <ProgressIndicator progress={progress} isSearching={isSearching} />
      )}

      {/* Results area scroll container */}
      <div
        className="section-wrapper"
        role="main"
        aria-labelledby="results-heading"
        ref={containerRef}
      >
        {foundResults.length > 0 && (
          <div className="results-section">
            <h3
              className="section-header found-header"
              onClick={() => toggleSection('found')}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsed.found}
              aria-controls="found-results-list"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('found');
                }
              }}
            >
              <span>
                ✓ {t('results:categories.foundUsers')} ({foundResults.length})
              </span>
              <span
                className={`collapse-icon ${collapsed.found ? 'collapsed' : ''}`}
                aria-hidden="true"
              >
                ▼
              </span>
            </h3>
            <div
              id="found-results-list"
              className={`results-list ${collapsed.found ? 'collapsed' : ''}`}
              role="list"
              aria-label={t('results:categories.foundUsers')}
            >
              {!collapsed.found &&
                renderVirtualList(
                  'found-results-list',
                  foundResults,
                  420,
                  t('results:categories.foundUsers')
                )}
            </div>
          </div>
        )}

        {pendingResults.length > 0 && isSearching && (
          <div className="results-section">
            <h3
              className="section-header pending-header"
              onClick={() => toggleSection('pending')}
            >
              <span>
                ⏳ {t('results:categories.checking')} ({pendingResults.length})
              </span>
              <span
                className={`collapse-icon ${collapsed.pending ? 'collapsed' : ''}`}
              >
                ▼
              </span>
            </h3>
            <div
              className={`results-list ${collapsed.pending ? 'collapsed' : ''}`}
            >
              {!collapsed.pending &&
                renderVirtualList(
                  'pending-results',
                  pendingResults,
                  300,
                  t('results:categories.checking')
                )}
            </div>
          </div>
        )}

        {errorResults.length > 0 && (
          <div className="results-section">
            <h3
              className="section-header error-header"
              onClick={() => toggleSection('error')}
            >
              <span>
                ⚠ {t('results:categories.error')} ({errorResults.length})
              </span>
              <span
                className={`collapse-icon ${collapsed.error ? 'collapsed' : ''}`}
              >
                ▼
              </span>
            </h3>
            <div
              className={`results-list ${collapsed.error ? 'collapsed' : ''}`}
            >
              {!collapsed.error &&
                renderVirtualList(
                  'error-results',
                  errorResults,
                  360,
                  t('results:categories.error')
                )}
            </div>
          </div>
        )}

        {notFoundResults.length > 0 && (
          <div className="results-section">
            <h3
              className="section-header not-found-header"
              onClick={() => toggleSection('notFound')}
            >
              <span>
                ✗ {t('results:categories.notFound')} ({notFoundResults.length})
              </span>
              <span
                className={`collapse-icon ${collapsed.notFound ? 'collapsed' : ''}`}
              >
                ▼
              </span>
            </h3>
            <div
              className={`results-list ${collapsed.notFound ? 'collapsed' : ''}`}
            >
              {!collapsed.notFound &&
                renderVirtualList(
                  'notfound-results',
                  notFoundResults,
                  420,
                  t('results:categories.notFound')
                )}
            </div>
          </div>
        )}
      </div>

      {!isSearching && (results.length > 0 || progress.checked_sites > 0) && (
        <div className="search-summary">
          {/* {progress.current_site === undefined && progress.checked_sites < progress.total_sites && (
            <div className="search-stopped-notice">
              <span className="stopped-icon">⏸️</span>
              Search was stopped, showing completed checked results
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
