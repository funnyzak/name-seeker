import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SearchResultStatus as Status,
  type ResultsDisplayProps,
} from '../types';
import ResultItem from './ResultItem';
import ExportButton from './ExportButton';

const groups = [
  [Status.FOUND, 'summary.found'],
  [Status.NOT_FOUND, 'categories.notFound'],
  [Status.ERROR, 'summary.error'],
] as const;
export default function ResultsDisplay({
  results,
  progress,
  isSearching,
  outcome,
  query,
  onExportSuccess,
  onExportError,
  onClearResults,
}: ResultsDisplayProps) {
  const { t } = useTranslation('results');
  const [group, setGroup] = useState<Status>(Status.FOUND);
  const [filter, setFilter] = useState('');
  const filterInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [group, filter]);
  const term = filter.trim().toLowerCase();
  const visible = results
    .filter(
      r =>
        r.status === group &&
        [r.site, r.category, r.url].some(v => v?.toLowerCase().includes(term))
    )
    .reverse();
  return (
    <section className="lookup-results">
      <header className="lookup-heading">
        <h2>{t(isSearching ? 'ui.running' : 'title')}</h2>
        <span>
          {isSearching
            ? progress.total_sites
              ? progress.checked_sites + ' / ' + progress.total_sites
              : ''
            : t('ui.checked', { count: progress.checked_sites })}
        </span>
      </header>
      {isSearching && (
        <progress
          aria-label={t('ui.running')}
          max={progress.total_sites || 1}
          value={progress.total_sites ? progress.checked_sites : undefined}
        />
      )}
      <div
        className="status-switch"
        role="group"
        aria-label={t('filter.byStatus')}
      >
        {groups.map(([status, label]) => (
          <button
            key={status}
            aria-pressed={status === group}
            onClick={() => setGroup(status)}
          >
            {t(label)}{' '}
            <span>{results.filter(r => r.status === status).length}</span>
          </button>
        ))}
      </div>
      <div className="lookup-tools">
        <input
          ref={filterInput}
          type="search"
          aria-label={t('filter.filterAriaLabel')}
          placeholder={t('filter.filterPlaceholder')}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={event => {
            if (
              event.key === 'Escape' &&
              filter &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.stopPropagation();
              setFilter('');
            }
          }}
        />
        <ExportButton
          results={results}
          username={query}
          disabled={isSearching}
          onExportSuccess={onExportSuccess}
          onExportError={onExportError}
        />
      </div>
      <div
        ref={scroller}
        className="lookup-list"
        role="list"
        aria-label={t('title')}
      >
        {visible.map(r => (
          <ResultItem key={r.site} result={r} />
        ))}
        {!visible.length && (
          <p className="no-match" role="status">
            {t(term ? 'ui.noMatch' : isSearching ? 'ui.waiting' : 'ui.none')}
            {term && (
              <button
                onClick={() => {
                  setFilter('');
                  filterInput.current?.focus();
                }}
              >
                {t('filter.clear')}
              </button>
            )}
          </p>
        )}
      </div>
      <footer>
        <span role="status">
          {t(isSearching ? 'ui.stopHint' : 'ui.' + outcome)}
          {!isSearching &&
            outcome === 'stopped' &&
            results.length > 0 &&
            ' · ' + t('ui.retained')}
        </span>
        {!isSearching && (
          <button onClick={onClearResults}>{t('actions.reset')}</button>
        )}
      </footer>
    </section>
  );
}
