import React from 'react';
import { useTranslation } from 'react-i18next';
import { tauriApi } from '../services/tauriApi';
import type { ResultItemProps } from '../types';

const ResultItem: React.FC<ResultItemProps> = ({ result }) => {
  const { t } = useTranslation('results');
  const [isOpening, setIsOpening] = React.useState(false);

  const [openFailed, setOpenFailed] = React.useState(false);
  const handleUrlClick = async () => {
    if (result.url && !isOpening) {
      setIsOpening(true);
      setOpenFailed(false);
      try {
        await tauriApi.openUrl(result.url);
      } catch {
        setOpenFailed(true);
      } finally {
        setIsOpening(false);
      }
    }
  };

  return (
    <div className="lookup-row" role="listitem">
      <div className="result-content">
        <strong>{result.site}</strong>
        <small>{result.category}</small>
        <div className="result-details">
          {result.status === 'Found' && result.url && (
            <button
              className={`result-link ${isOpening ? 'opening' : ''}`}
              onClick={handleUrlClick}
              title={t('item.clickToVisit')}
              disabled={isOpening}
              type="button"
            >
              {isOpening ? t('item.opening') : t('item.viewProfile')}
            </button>
          )}

          {result.status === 'Error' && (
            <span className="result-message error-text">
              {result.error === 'Search stopped by user'
                ? t('item.searchStopped')
                : result.error === 'No site response'
                  ? t('item.noResponse')
                  : result.error || t('item.checking')}
            </span>
          )}

          {result.status === 'Pending' && (
            <span className="result-message">{t('item.checking')}</span>
          )}
        </div>

        {openFailed && (
          <span className="row-error" role="alert">
            {t('item.openFailed')}
          </span>
        )}
        {result.metadata && result.metadata.length > 0 && (
          <div className="result-metadata">
            <div className="metadata-title">{t('item.detailsTitle')}</div>
            {result.metadata.map((item, index) => (
              <div key={index} className="metadata-item">
                <span className="metadata-name">{item.name}:</span>
                <span className="metadata-value">
                  {typeof item.value === 'string'
                    ? item.value
                    : JSON.stringify(item.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ResultItem);
