import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProgressIndicatorProps } from '../types';

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  isSearching
}) => {
  const { t } = useTranslation('search');
  if (!isSearching && progress.checked_sites === 0) {
    return null;
  }

  const percentage = progress.total_sites > 0
    ? Math.round((progress.checked_sites / progress.total_sites) * 100)
    : 0;

  return (
    <div className="progress-container">
      <div className="progress-info">
        <div className="progress-text">
          <span>{t('progress.progressLabel', { checked: progress.checked_sites, total: progress.total_sites })}</span>
          <span className="percentage"> {percentage}%</span>
        </div>

        <div className="progress-stats">
          <span className="stat found">
            ✓ {t('progress.foundLabel', { count: progress.found_count })}
          </span>
          <span className="stat error">
            ✗ {t('progress.errorLabel', { count: progress.error_count })}
          </span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isSearching && (
        <div className="searching-status">
          <div className="pulse-dot"></div>
          <span>
            {t('progress.searchingStatus', { currentSite: progress.current_site })}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;