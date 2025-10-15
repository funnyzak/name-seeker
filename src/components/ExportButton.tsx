import React, { useState, useRef, useEffect } from 'react';
import { ExportButtonProps, ExportFormat, SearchResultStatus } from '../types';
import { tauriApi } from '../services/tauriApi';

const ExportButton: React.FC<ExportButtonProps> = ({ 
  results, 
  username, 
  disabled = false,
  onExportSuccess,
  onExportError 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 只导出 Found 状态的结果
  const foundResults = results.filter(r => r.status === SearchResultStatus.FOUND);
  const hasResults = foundResults.length > 0;
  const isDisabled = disabled || !hasResults || isExporting;

  // 点击外部关闭下拉菜单
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
      onExportSuccess?.(`成功导出为 ${formatName} 到 ${filePath}`);
      
      try {
        await tauriApi.openDirectory(filePath);
      } catch (error) {
        console.error('打开目录失败:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        onExportError?.(`打开目录失败: ${errorMessage}`);
      }
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      // 格式化结果为文本
      const resultText = foundResults
        .map(r => `${r.site}: ${r.url || 'N/A'}`)
        .join('\n');
      
      const header = `搜索结果 - ${username}\n生成时间: ${new Date().toLocaleString('zh-CN')}\n找到 ${foundResults.length} 个结果\n\n`;
      const fullText = header + resultText;

      await tauriApi.copyToClipboard(fullText);
      onExportSuccess?.(`已复制 ${foundResults.length} 个结果到剪贴板`);
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      onExportError?.(`复制失败: ${errorMessage}`);
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
            ? '正在导出' 
            : !hasResults 
            ? '没有可导出的结果' 
            : '导出搜索结果'
        }
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="export-icon" aria-hidden="true">
          {isExporting ? '⏳' : '📥'}
        </span>
        <span>{isExporting ? '导出中...' : '导出'}</span>
        <span className="dropdown-arrow" aria-hidden="true">▼</span>
      </button>

      {isOpen && (
        <div className="export-menu" role="menu">
          <button
            className="export-menu-item"
            onClick={handleCopyToClipboard}
            disabled={isExporting}
            role="menuitem"
            aria-label="复制到剪贴板"
          >
            <span className="icon" aria-hidden="true">📋</span>
            <span>复制到剪贴板</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.PDF)}
            disabled={isExporting}
            role="menuitem"
          >
            <span className="icon" aria-hidden="true">📄</span>
            <span>导出为 PDF</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.CSV)}
            disabled={isExporting}
            role="menuitem"
            aria-label="导出为CSV格式"
          >
            <span className="icon" aria-hidden="true">📊</span>
            <span>导出为 CSV</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.JSON)}
            disabled={isExporting}
            role="menuitem"
            aria-label="导出为JSON格式"
          >
            <span className="icon" aria-hidden="true">📝</span>
            <span>导出为 JSON</span>
          </button>
          <button
            className="export-menu-item"
            onClick={() => handleExport(ExportFormat.TXT)}
            disabled={isExporting}
            role="menuitem"
            aria-label="导出为TXT格式"
          >
            <span className="icon" aria-hidden="true">📝</span>
            <span>导出为 TXT</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;

