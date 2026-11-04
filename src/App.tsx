import { isTauri } from '@tauri-apps/api/core';
import AboutModal from './components/AboutModal';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DisclaimerModal from './components/DisclaimerModal';
import SearchForm from './components/SearchForm';
import ResultsDisplay from './components/ResultsDisplay';
import ToastContainer from './components/ToastContainer';
import { useDisclaimer } from './hooks/useDisclaimer';
import { useSearch } from './hooks/useSearch';
import { useToast } from './hooks/useToast';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { SearchType } from './types';
import logoImage from './assets/logo.svg';
import './App.css';
import './workspace.css';

const desktop = isTauri();
const macTitlebar = desktop && /Macintosh|Mac OS X/.test(navigator.userAgent);
const App: React.FC = () => {
  const [showAbout, setShowAbout] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const { t } = useTranslation(['common', 'search', 'toast']);

  const {
    showDisclaimer,
    failure,
    busy,
    isLoading,
    acceptDisclaimer,
    declineDisclaimer,
  } = useDisclaimer();
  const { toasts, removeToast, success, error } = useToast();
  const {
    isSearching,
    query,
    results,
    progress,
    searchNumber,
    outcome,
    startSearch,
    stopSearch,
    clearResults,
  } = useSearch({
    onError: msg => error(t('toast:error.searchFailed', { defaultValue: msg })),
  });
  const { history, addToHistory, clearHistory, removeFromHistory } =
    useSearchHistory();

  const isSearchIdle = !query && !isSearching;

  const handleSearchSubmit = async (searchQuery: string, type: SearchType) => {
    try {
      await startSearch(searchQuery, type, {
        maxConcurrentRequests: 30,
        timeoutSeconds: 30,
        excludeNsfw: true,
        categoryFilter: undefined,
      });
    } catch {
      error(t('toast:error.searchFailed'));
      return false;
    }
    return true;
  };

  const requestStop = async () => {
    if (!(await stopSearch())) error(t('toast:error.stopFailed'));
  };

  // Keyboard shortcuts configuration
  useKeyboardShortcuts([
    {
      key: '/',
      callback: () => {
        const input = document.querySelector(
          '.search-input'
        ) as HTMLInputElement;
        if (input && !isSearching) {
          input.focus();
        }
      },
      description: t('search:shortcuts.focus'),
    },
    {
      key: 'Escape',
      callback: () => {
        if (isSearching) {
          void requestStop();
        }
      },
      description: t('search:shortcuts.stop'),
    },
  ]);

  if (isLoading) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="loading-text">{t('common:message.loading')}</p>
        <p className="loading-subtext">{t('common:message.pleaseWait')}</p>
      </div>
    );
  }

  return (
    <div className="app fingerprint-app">
      {/* Toast notification container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Disclaimer modal */}
      <DisclaimerModal
        isOpen={showDisclaimer}
        failure={failure}
        busy={busy}
        onAccept={acceptDisclaimer}
        onDecline={declineDisclaimer}
      />

      {showAbout && <AboutModal isOpen onClose={() => setShowAbout(false)} />}

      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        {t('common:action.continue')}
      </a>

      {/* Main application content */}
      <main className="app-main" id="main-content">
        <div className="container">
          {/* Top toolbar */}
          <header role="banner">
            <div
              className={`app-toolbar ${macTitlebar ? 'mac-titlebar' : desktop ? 'system-titlebar' : ''}`}
              data-tauri-drag-region={macTitlebar ? '' : undefined}
            >
              <h1 className="toolbar-title">
                <img
                  src={logoImage}
                  alt={`${t('common:app.name')} Logo`}
                  className="app-logo"
                  aria-hidden="true"
                />
                <span className="app-name">{t('common:app.name')}</span>
              </h1>
            </div>
            {/* Search form */}
            <section className="search-section">
              <SearchForm
                key={formVersion}
                isSearching={isSearching}
                idle={isSearchIdle}
                onSubmit={handleSearchSubmit}
                onStopSearch={requestStop}
                searchHistory={history}
                onAddToHistory={addToHistory}
                onRemoveFromHistory={removeFromHistory}
                onClearHistory={clearHistory}
              />
            </section>
          </header>

          {/* Results display */}
          {!isSearchIdle ? (
            <ResultsDisplay
              key={searchNumber}
              outcome={outcome}
              results={results}
              progress={progress}
              isSearching={isSearching}
              query={query}
              onExportSuccess={success}
              onExportError={error}
              onClearResults={() => {
                clearResults();
                setFormVersion(version => version + 1);
              }}
            />
          ) : history.length === 0 ? (
            <section
              className="first-search-results"
              aria-label={t('results:title')}
            >
              <div className="empty-preview" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h2>{t('results:title')}</h2>
              <p>{t('results:empty.firstSearch')}</p>
            </section>
          ) : null}
          {isSearchIdle && (
            <footer className="app-about-footer">
              <button
                className="app-about-link"
                aria-haspopup="dialog"
                onClick={event => {
                  event.currentTarget.focus({ preventScroll: true });
                  setShowAbout(true);
                }}
              >
                {t('common:label.about')}
              </button>
            </footer>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
