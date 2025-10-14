import React from 'react';
import DisclaimerModal from './components/DisclaimerModal';
import SearchForm from './components/SearchForm';
import ResultsDisplay from './components/ResultsDisplay';
import { useDisclaimer } from './hooks/useDisclaimer';
import { useSearch } from './hooks/useSearch';
import './App.css';

const App: React.FC = () => {
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
    startSearch
  } = useSearch();

  const handleSearchSubmit = async (username: string) => {
    try {
      await startSearch(username);
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

      {/* 主应用内容 */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="icon">🔍</span>
            Search My Name
          </h1>
          <p className="app-subtitle">
            在数百个网站上发现您的数字足迹
          </p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {/* 搜索表单 */}
          <section className="search-section">
            <SearchForm
              isSearching={isSearching}
              onSubmit={handleSearchSubmit}
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
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            ⚠️ 请负责任地使用本工具，仅用于合法的自助研究目的
          </p>
          <p className="footer-note">
            本工具在本地运行，不会收集或传输任何个人信息
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
