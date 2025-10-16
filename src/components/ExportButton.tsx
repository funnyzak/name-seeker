import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ExportButtonProps, ExportFormat, SearchResultStatus } from '../types';
import { tauriApi } from '../services/tauriApi';

const ExportButton: React.FC<ExportButtonProps> = ({ 
  results, 
  username, 
  disabled = false,
  onExportSuccess,
  onExportError 
}) => {
  const { t, i18n } = useTranslation(['export', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only export results with Found status
  const foundResults = results.filter(r => r.status === SearchResultStatus.FOUND);
  const hasResults = foundResults.length > 0;
  const isDisabled = disabled || !hasResults || isExporting;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/ /g, '_').replace(/:/g, '-');
      const filePath = await tauriApi.exportResults({
        format,
        username,
        results: foundResults,
        timestamp
      });
      const formatName = format.toUpperCase();
      onExportSuccess?.(t('export:messages.exportSuccess', { format: formatName, path: filePath }));
      
      try {
        await tauriApi.openDirectory(filePath);
      } catch (error) {
        console.error('Failed to open directory:', error);
        const errorMessage = error instanceof Error ? error.message : t('export:messages.unknownError');
        onExportError?.(t('export:messages.openDirectoryFailed', { error: errorMessage }));
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      // Format results as text
      const resultText = foundResults
        .map(r => `${r.site}: ${r.url || 'N/A'}`)
        .join('\n');
      
      const time = new Date().toLocaleString(i18n.language);
      const header = t('export:messages.resultHeader', { username, time, count: foundResults.length });
      const fullText = header + resultText;

      await tauriApi.copyToClipboard(fullText);
      onExportSuccess?.(t('export:messages.copied', { count: foundResults.length }));
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      const errorMessage = error instanceof Error ? error.message : t('export:messages.unknownError');
      onExportError?.(t('export:messages.copyFailed', { error: errorMessage }));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={`export-dropdown ${isOpen ? 'open' : ''}`}
    >
      <button
        className="export-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        aria-label={
          isExporting 
            ? t('export:messages.exporting')
            : !hasResults 
            ? t('export:messages.noResults')
            : t('export:messages.exportResults')
        }
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="export-icon" aria-hidden="true">
          {isExporting ? '⏳' : '📥'}
        </span>
        <span>{isExporting ? t('export:actions.exporting') : t('export:actions.export')}</span>
        <span className="dropdown-arrow" aria-hidden="true">▼</span>
      </button>

      {isOpen && (
        <div className="export-menu" role="menu">
          <button
            className="export-menu-item"
            onClick={handleCopyToClipboard}
            disabled={isExporting}
            role="menuitem"
            aria-label={t('export:actions.copyToClipboard')}
          >
            <span className="icon" aria-hidden="true">📋</span>
            <span>{t('export:actions.copyToClipboard')}</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.PDF)}
            disabled={isExporting}
            role="menuitem"
            aria-label={t('export:actions.exportAsPDF')}
          >
            <span className="icon" aria-hidden="true">📄</span>
            <span>{t('export:actions.exportAsPDF')}</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.CSV)}
            disabled={isExporting}
            role="menuitem"
            aria-label={t('export:actions.exportAsCSV')}
          >
            <span className="icon" aria-hidden="true">📊</span>
            <span>{t('export:actions.exportAsCSV')}</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.JSON)}
            disabled={isExporting}
            role="menuitem"
            aria-label={t('export:actions.exportAsJSON')}
          >
            <span className="icon" aria-hidden="true">📝</span>
            <span>{t('export:actions.exportAsJSON')}</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.TXT)}
            disabled={isExporting}
            role="menuitem"
            aria-label={t('export:actions.exportAsTXT')}
          >
            <span className="icon" aria-hidden="true">📝</span>
            <span>{t('export:actions.exportAsTXT')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;

