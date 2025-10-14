import React, { useState } from 'react';
import DisclaimerModal from './components/DisclaimerModal';
import AboutModal from './components/AboutModal';
import SearchForm from './components/SearchForm';
import ResultsDisplay from './components/ResultsDisplay';
import { useDisclaimer } from './hooks/useDisclaimer';
import { useSearch } from './hooks/useSearch';
import './App.css';

const App: React.FC = () => {
  const [showAbout, setShowAbout] = useState(false);

  const {
    showDisclaimer,
    isLoading,
    acceptDisclaimer,
    declineDisclaimer
  } = useDisclaimer();

  const {
    isSearching,
    results,
    progress,
    startSearch,
    stopSearch
  } = useSearch();

  const handleSearchSubmit = async (username: string) => {
    try {
      await startSearch(username, {
        maxConcurrentRequests: 30,
        timeoutSeconds: 30,
        excludeNsfw: true,
        categoryFilter: undefined
      });
    } catch (error) {
      console.error('Search failed:', error);
      // 这里可以添加错误通知
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>正在加载应用...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* 免责声明模态框 */}
      <DisclaimerModal
        isOpen={showDisclaimer}
        onAccept={acceptDisclaimer}
        onDecline={declineDisclaimer}
      />

      {/* 关于模态框 */}
      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />

      {/* 主应用内容 */}
      <main className="app-main">
        <div className="container">
          {/* 顶部工具栏 */}
          <header className="app-toolbar">
            <div className="toolbar-title">
              <span className="icon">🔍</span>
              Search My Name
            </div>
            <button
              className="about-button"
              onClick={() => setShowAbout(true)}
            >
              关于
            </button>
          </header>

          {/* 搜索表单 */}
          <section className="search-section">
            <SearchForm
              isSearching={isSearching}
              onSubmit={handleSearchSubmit}
              onStopSearch={stopSearch}
            />
          </section>

          {/* 结果显示 */}
          <section className="results-section">
            <ResultsDisplay
              results={results}
              progress={progress}
              isSearching={isSearching}
            />
          </section>

          {/* 底部信息 */}
          <footer className="app-footer">
            <p>
              ⚠️ 请负责任地使用本工具，仅用于合法的自助研究目的
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
