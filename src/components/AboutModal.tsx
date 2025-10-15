import React, { useState, useEffect } from 'react';
import type { AboutModalProps, AppInfo } from '../types';
import { tauriApi } from '../services/tauriApi';

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !appInfo) {
      loadAppInfo();
    }
  }, [isOpen, appInfo]);

  const loadAppInfo = async () => {
    setLoading(true);
    try {
      const info = await tauriApi.getAppInfo();
      setAppInfo(info);
    } catch (error) {
      console.error('Failed to load app info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await tauriApi.openUrl(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container about-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <>关于 {appInfo?.name}</>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="about-content">
            <div className="about-section">
              {loading ? (
                <p>加载中...</p>
              ) : appInfo ? (
                <>
                  <div className="app-title-section">
                    <h3 className="app-title">{appInfo.name}</h3>
                    <span className="app-version">v{appInfo.version}</span>
                  </div>
                  <p className="app-description">
                    Search My Name 是一款强大的跨平台桌面应用，可以在数百个网站上搜索用户名和邮箱，帮助你快速发现你的数字足迹。基于 WhatsMyName 项目数据，支持导出搜索结果为 PDF、CSV、JSON 等格式。
                  </p>
                  {appInfo.long_description && (
                    <p className="long-description">{appInfo.long_description}</p>
                  )}
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">构建日期</span>
                      <span className="info-value">{appInfo.build_date}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">作者</span>
                      <button 
                        className="info-link" 
                        onClick={() => handleOpenUrl('https://github.com/funnyzak')}
                      >
                        funnyzak
                      </button>
                    </div>
                    <div className="info-item">
                      <span className="info-label">版权</span>
                      <span className="info-value">©️ {new Date().getFullYear()} Funnyzak</span>
                    </div>
                  </div>
                </>
              ) : (
                <p>Search My Name v1.0.0</p>
              )}
            </div>

            <div className="about-section">
              <h3>功能特性</h3>
              <ul>
                <li>在数百个网站上搜索用户名和邮箱</li>
                <li>实时显示搜索进度</li>
                <li>本地运行，保护隐私</li>
                <li>跨平台桌面应用</li>
                <li>支持多种导出格式</li>
                <li>智能过滤和分类</li>
              </ul>
            </div>

            <div className="about-section">
              <h3>数据来源</h3>
              <p>
                本应用基于 <strong>WhatsMyName</strong> 项目的数据源，该项目维护了 600+ 个网站的搜索规则。
                感谢 <strong>WebBreacher</strong> 团队的开源贡献。
              </p>
              <button 
                className="btn btn-link" 
                onClick={() => handleOpenUrl('https://github.com/WebBreacher/WhatsMyName')}
              >
                查看 WhatsMyName 项目
              </button>
            </div>

            <div className="about-section">
              <h3>特别感谢</h3>
              <p>
                感谢 <strong>Blackbird</strong> 项目的启发和参考。
                Blackbird 是一个强大的 OSINT 工具，集成了 AI 分析功能。
              </p>
              <button 
                className="btn btn-link" 
                onClick={() => handleOpenUrl('https://github.com/p1ngul1n0/blackbird')}
              >
                查看 Blackbird 项目
              </button>
            </div>

            <div className="about-section">
              <h3>使用声明</h3>
              <p>
                本工具仅供教育和合法的自助研究目的使用。
                请遵守相关法律法规，负责任地使用本工具。
                不得用于非法用途或侵犯他人隐私。
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;