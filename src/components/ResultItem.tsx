import React from 'react';
import { tauriApi } from '../services/tauriApi';
import type { ResultItemProps } from '../types';

const ResultItem: React.FC<ResultItemProps> = ({ result }) => {
  const handleUrlClick = async () => {
    if (result.url) {
      try {
        await tauriApi.openUrl(result.url);
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
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
    <div className={`result-item ${getStatusClass()}`}>
      <div className="result-status">
        <span className="status-icon">{getStatusIcon()}</span>
      </div>

      <div className="result-content">
        <div className="site-name">
          <h4>{result.site}</h4>
        </div>

        <div className="result-details">
          {result.status === 'Found' && result.url && (
            <button
              className="result-link"
              onClick={handleUrlClick}
              title="点击访问个人资料页面"
            >
              查看资料
            </button>
          )}

          {result.status === 'NotFound' && (
            <span className="result-message">未找到相关用户</span>
          )}

          {result.status === 'Error' && (
            <span className="result-message error-text">
              {result.error || '检查时发生错误'}
            </span>
          )}

          {result.status === 'Pending' && (
            <span className="result-message">正在检查...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultItem;