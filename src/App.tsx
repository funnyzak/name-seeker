import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DisclaimerModal from './components/DisclaimerModal';
import AboutModal from './components/AboutModal';
import SearchForm from './components/SearchForm';
import ResultsDisplay from './components/ResultsDisplay';
import ToastContainer from './components/ToastContainer';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useDisclaimer } from './hooks/useDisclaimer';
import { useSearch } from './hooks/useSearch';
import { useToast } from './hooks/useToast';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { SearchType } from './types';
import logoImage from './assets/logo.png';
import './App.css';

const App: React.FC = () => {
  const [showAbout, setShowAbout] = useState(false);
  const { t } = useTranslation(['common', 'search', 'toast']);

  const { showDisclaimer, isLoading, acceptDisclaimer, declineDisclaimer } = useDisclaimer();
  const { toasts, removeToast, success, error, info } = useToast();
  const { isSearching, searchType, query, results, progress, startSearch, stopSearch, clearResults } = useSearch();
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory();

  const handleSearchSubmit = async (searchQuery: string, type: SearchType) => {
    try {
      await startSearch(searchQuery, type, {
        maxConcurrentRequests: 30,
        timeoutSeconds: 30,
        excludeNsfw: true,
        categoryFilter: undefined,
      });
      info(t('toast:info.searchStarting'));
    } catch (err) {
      console.error('Search failed:', err);
      error(t('toast:error.searchFailed'));
    }
  };

  // Keyboard shortcuts configuration
  useKeyboardShortcuts([
    {
      key: '/',
      callback: () => {
        const input = document.querySelector('.search-input') as HTMLInputElement;
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
          stopSearch();
          info(t('toast:info.searchStopped'));
        }
      },
      description: t('search:shortcuts.stop'),
    },
    {
      key: 'h',
      ctrl: true,
      callback: () => {
        setShowAbout(true);
      },
      description: t('search:shortcuts.help'),
    },
  ]);

  if (isLoading) {
    return (
      <div className='app-loading' role="status" aria-live="polite">
        <div className='loading-spinner' aria-hidden="true"></div>
        <p className='loading-text'>{t('common:message.loading')}</p>
        <p className='loading-subtext'>{t('common:message.pleaseWait')}</p>
      </div>
    );
  }

  return (
    <div className='app'>
      {/* Toast notification container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Disclaimer modal */}
      <DisclaimerModal
        isOpen={showDisclaimer}
        onAccept={acceptDisclaimer}
        onDecline={declineDisclaimer}
      />

      {/* About modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        {t('common:action.continue')}
      </a>

      {/* Main application content */}
      <main className='app-main' id="main-content">
        <div className='container'>
          {/* Top toolbar */}
          <header role="banner">
            <div className='app-toolbar'>
              <button 
                className='toolbar-title-button'
                onClick={() => setShowAbout(true)}
                aria-label={`${t('common:app.name')} - ${t('common:label.about')}`}
                title={t('common:label.about')}
              >
                <h1 className='toolbar-title'>
                  <img 
                    src={logoImage}
                    alt={`${t('common:app.name')} Logo`}
                    className='app-logo'
                    aria-hidden="true"
                  />
                  <span className='app-name'>{t('common:app.name')}</span>
                </h1>
              </button>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {import.meta.env.DEV && (
                  <LanguageSwitcher 
                    variant="dropdown" 
                    size="small"
                    onError={(errorMsg) => error(`Language Error: ${errorMsg}`)}
                  />
                )}
                <button 
                  className='about-button' 
                  onClick={() => setShowAbout(true)}
                  aria-label={t('common:label.about')}
                >
                  {t('common:label.about')}
                </button>
              </div>
            </div>
            {/* Search form */}
            <section className='search-section'>
              <SearchForm
                isSearching={isSearching}
                searchType={searchType}
                onSubmit={handleSearchSubmit}
                onStopSearch={stopSearch}
                searchHistory={history}
                onAddToHistory={addToHistory}
                onRemoveFromHistory={removeFromHistory}
                onClearHistory={clearHistory}
                onError={error}
                onWarning={(msg) => info(msg)}
              />
            </section>
          </header>

          {/* Results display */}
          <ResultsDisplay
            results={results}
            progress={progress}
            isSearching={isSearching}
            query={query}
            onExportSuccess={success}
            onExportError={error}
            onClearResults={() => {
              clearResults();
              info(t('toast:success.resultsCleared'));
            }}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
