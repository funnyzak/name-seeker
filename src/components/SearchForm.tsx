import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchType, type SearchFormProps } from '../types';

function validationError(value: string, type: SearchType) {
  if (!value) return 'required';
  if (type === SearchType.EMAIL) return null;
  if (value.includes('@')) return 'invalidEmail';
  const bytes = new window.TextEncoder().encode(value).length;
  if (bytes < 2) return 'usernameTooShort';
  if (bytes > 100) return 'usernameTooLong';
  return /^[\p{L}\p{N}_.-]+$/u.test(value) ? null : 'invalidUsername';
}

export default function SearchForm({
  idle,
  isSearching,
  onSubmit,
  onStopSearch,
  searchHistory = [],
  onAddToHistory,
  onRemoveFromHistory,
  onClearHistory,
}: SearchFormProps) {
  const { t } = useTranslation('search');
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function search(raw: string) {
    if (isSearching || starting) return;
    const value = raw.trim();
    const type = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? SearchType.EMAIL
      : SearchType.USERNAME;
    const invalidKey = validationError(value, type);
    if (invalidKey) {
      setInvalid(invalidKey);
      input.current?.focus();
      return;
    }
    setInvalid(null);
    setStarting(true);
    try {
      if (await onSubmit(value, type)) onAddToHistory?.(value);
    } finally {
      setStarting(false);
    }
  }
  return (
    <>
      <form
        className="query-form"
        onSubmit={e => {
          e.preventDefault();
          void search(draft);
        }}
      >
        <label htmlFor="lookup">{t('form.inputLabel')}</label>
        <div className={'query-line' + (idle && !draft ? ' fingerprint' : '')}>
          <input
            id="lookup"
            ref={input}
            className="search-input"
            placeholder={idle ? t('form.example') : undefined}
            autoFocus
            value={draft}
            readOnly={isSearching || starting}
            aria-invalid={!!invalid}
            aria-describedby={
              invalid ? 'query-error' : idle ? 'query-hint' : undefined
            }
            onChange={e => {
              setDraft(e.target.value);
              setInvalid(null);
            }}
          />
          {isSearching ? (
            <button
              type="button"
              className="halt"
              onClick={event => {
                event.preventDefault();
                onStopSearch?.();
              }}
            >
              {t('form.stopButton')}
            </button>
          ) : (
            <button disabled={starting || !draft.trim()}>
              {t('form.searchButton')}
            </button>
          )}
        </div>
        {idle && !invalid && (
          <small id="query-hint">
            <span>{t('form.submitHint')}</span>
            <span>{t('shortcuts.focus')}</span>
          </small>
        )}
        {invalid && (
          <span id="query-error" role="alert">
            {t('validation.' + invalid)}
          </span>
        )}
      </form>
      {idle && searchHistory.length > 0 && (
        <section className="recents">
          <header>
            <h2>{t('history.recentSearches')}</h2>
            <button
              onClick={() => {
                onClearHistory?.();
                input.current?.focus();
              }}
            >
              {t('history.clearHistory')}
            </button>
          </header>
          {searchHistory.map(item => (
            <div key={item}>
              <button
                className="recent-query"
                title={t('history.runAgain')}
                aria-label={t('history.runAgain') + ' · ' + item}
                disabled={starting}
                onClick={() => {
                  setDraft(item);
                  void search(item);
                }}
              >
                <span>{item}</span>
                <span className="recent-action" aria-hidden="true">
                  ↵
                </span>
              </button>
              <button
                aria-label={t('history.deleteRecord', { item })}
                onClick={() => {
                  onRemoveFromHistory?.(item);
                  input.current?.focus();
                }}
              >
                ×
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
