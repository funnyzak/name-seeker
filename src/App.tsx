import React, { useState } from 'react';
import DisclaimerModal from './components/DisclaimerModal';
import AboutModal from './components/AboutModal';
import SearchForm from './components/SearchForm';
import ResultsDisplay from './components/ResultsDisplay';
import ToastContainer from './components/ToastContainer';
import { useDisclaimer } from './hooks/useDisclaimer';
import { useSearch } from './hooks/useSearch';
import { useToast } from './hooks/useToast';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { SearchType } from './types';
import './App.css';

const App: React.FC = () => {
  const [showAbout, setShowAbout] = useState(false);

  const { showDisclaimer, isLoading, acceptDisclaimer, declineDisclaimer } = useDisclaimer();
  const { toasts, removeToast, success, error, info } = useToast();
  const { isSearching, searchType, query, results, progress, startSearch, stopSearch } = useSearch();
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory();

  const handleSearchSubmit = async (searchQuery: string, type: SearchType) => {
    try {
      await startSearch(searchQuery, type, {
        maxConcurrentRequests: 30,
        timeoutSeconds: 30,
        excludeNsfw: true,
        categoryFilter: undefined,
      });
      const typeText = type === SearchType.USERNAME ? '用户名' : '邮箱';
      info(`开始搜索${typeText}: ${searchQuery}`);
    } catch (err) {
      console.error('Search failed:', err);
      error(`搜索失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 快捷键配置
  useKeyboardShortcuts([
    {
      key: '/',
      callback: () => {
        const input = document.querySelector('.search-input') as HTMLInputElement;
        if (input && !isSearching) {
          input.focus();
        }
      },
      description: '聚焦到搜索框',
    },
    {
      key: 'Escape',
      callback: () => {
        if (isSearching) {
          stopSearch();
          info('搜索已停止');
        }
      },
      description: '停止搜索',
    },
    {
      key: 'h',
      ctrl: true,
      callback: () => {
        setShowAbout(true);
      },
      description: '显示帮助',
    },
  ]);

  if (isLoading) {
    return (
      <div className='app-loading' role="status" aria-live="polite">
        <div className='loading-spinner' aria-hidden="true"></div>
        <p className='loading-text'>正在加载应用...</p>
        <p className='loading-subtext'>请稍候片刻</p>
      </div>
    );
  }

  return (
    <div className='app'>
      {/* Toast通知容器 */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* 免责声明模态框 */}
      <DisclaimerModal
        isOpen={showDisclaimer}
        onAccept={acceptDisclaimer}
        onDecline={declineDisclaimer}
      />

      {/* 关于模态框 */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        跳转到主要内容
      </a>

      {/* 主应用内容 */}
      <main className='app-main' id="main-content">
        <div className='container'>
          {/* 顶部工具栏 */}
          <header role="banner">
            <div className='app-toolbar'>
              <h1 className='toolbar-title'>
                <span className='icon' aria-hidden="true">🔍</span>
                Search My Name
              </h1>
              <button 
                className='about-button' 
                onClick={() => setShowAbout(true)}
                aria-label="显示关于信息"
              >
                关于
              </button>
            </div>
            {/* 搜索表单 */}
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

          {/* 结果显示 */}
          <ResultsDisplay
            results={results}
            progress={progress}
            isSearching={isSearching}
            query={query}
            onExportSuccess={success}
            onExportError={error}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
