import React from 'react';
import { useTranslation } from 'react-i18next';
import { tauriApi } from '../services/tauriApi';
import type { ResultItemProps } from '../types';

const ResultItem: React.FC<ResultItemProps> = ({ result }) => {
  const { t } = useTranslation('results');
  const [isOpening, setIsOpening] = React.useState(false);

  const handleUrlClick = async () => {
    if (result.url && !isOpening) {
      setIsOpening(true);
      try {
        await tauriApi.openUrl(result.url);
      } catch (error) {
        console.error('Failed to open URL:', error);
        // 可以在这里添加用户友好的错误提示
      } finally {
        setIsOpening(false);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleUrlClick();
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'Found':
        return '✓';
      case 'NotFound':
        return '✗';
      case 'Error':
        return '⚠';
      case 'Pending':
        return '⏳';
      default:
        return '?';
    }
  };

  const getStatusClass = () => {
    switch (result.status) {
      case 'Found':
        return 'found';
      case 'NotFound':
        return 'not-found';
      case 'Error':
        return 'error';
      case 'Pending':
        return 'pending';
      default:
        return '';
    }
  };

  return (
    <div className={`result-item ${getStatusClass()}`} role="listitem">
      <div className="result-status" aria-label={t('item.statusAriaLabel', { status: result.status })}>
        <span className="status-icon" aria-hidden="true">{getStatusIcon()}</span>
      </div>

      <div className="result-content">
        <div className="site-name">
          <h4>{result.site}</h4>
          {result.category && (
            <span className="category-tag">{result.category}</span>
          )}
        </div>

        <div className="result-details">
          {result.status === 'Found' && result.url && (
            <button
              className={`result-link ${isOpening ? 'opening' : ''}`}
              onClick={handleUrlClick}
              onKeyDown={handleKeyDown}
              title={t('item.clickToVisit')}
              disabled={isOpening}
              type="button"
            >
              {isOpening ? t('item.opening') : t('item.viewProfile')}
            </button>
          )}

          {result.status === 'NotFound' && (
            <span className="result-message">{t('item.userNotFound')}</span>
          )}

          {result.status === 'Error' && (
            <span className="result-message error-text">
              {result.error === '搜索被用户停止' ? '⏸️ ' + t('item.searchStopped') : (result.error || t('item.checking'))}
            </span>
          )}

          {result.status === 'Pending' && (
            <span className="result-message">{t('item.checking')}</span>
          )}
        </div>

        {result.metadata && result.metadata.length > 0 && (
          <div className="result-metadata">
            <div className="metadata-title">{t('item.detailsTitle')}</div>
            {result.metadata.map((item, index) => (
              <div key={index} className="metadata-item">
                <span className="metadata-name">{item.name}:</span>
                <span className="metadata-value">
                  {typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultItem;