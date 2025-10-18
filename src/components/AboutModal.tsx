import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AboutModalProps, AppInfo } from '../types';
import { tauriApi } from '../services/tauriApi';

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('modals');
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
      <div
        className="modal-container about-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <>
            {t('about.title')} {appInfo?.name}
          </>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="about-content">
            <div className="about-section">
              {loading ? (
                <p>{t('about.loading')}</p>
              ) : appInfo ? (
                <>
                  <div className="app-title-section">
                    <h3 className="app-title">{appInfo.name}</h3>
                    <span className="app-version">v{appInfo.version}</span>
                  </div>
                  <p className="app-description">
                    {t('about.longDescription')}
                  </p>
                  {appInfo.long_description && (
                    <p className="long-description">
                      {appInfo.long_description}
                    </p>
                  )}
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">{t('about.buildDate')}</span>
                      <span className="info-value">{appInfo.build_date}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">
                        {t('about.repository')}
                      </span>
                      <button
                        className="info-link"
                        onClick={() =>
                          handleOpenUrl(
                            'https://github.com/funnyzak/name-seeker'
                          )
                        }
                      >
                        funnyzak/name-seeker
                      </button>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('about.author')}</span>
                      <button
                        className="info-link"
                        onClick={() =>
                          handleOpenUrl('https://github.com/funnyzak')
                        }
                      >
                        funnyzak
                      </button>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('about.copyright')}</span>
                      <span className="info-value">
                        ©️ {new Date().getFullYear()} Funnyzak
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p>NameSeeker v1.0.0</p>
              )}
            </div>

            <div className="about-section">
              <h3>{t('about.features.title')}</h3>
              <ul>
                <li>{t('about.features.searching')}</li>
                <li>{t('about.features.realtimeDisplay')}</li>
                <li>{t('about.features.localPrivacy')}</li>
                <li>{t('about.features.crossPlatform')}</li>
                <li>{t('about.features.multipleFormats')}</li>
                <li>{t('about.features.smartFilter')}</li>
              </ul>
            </div>

            <div className="about-section">
              <h3>{t('about.dataSource.title')}</h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: t('about.dataSource.description'),
                }}
              ></p>
              <button
                className="btn btn-link"
                onClick={() =>
                  handleOpenUrl('https://github.com/WebBreacher/WhatsMyName')
                }
              >
                {t('about.dataSource.viewProject')}
              </button>
            </div>

            <div className="about-section">
              <h3>{t('about.acknowledgments.title')}</h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: t('about.acknowledgments.description'),
                }}
              ></p>
              <button
                className="btn btn-link"
                onClick={() =>
                  handleOpenUrl('https://github.com/p1ngul1n0/blackbird')
                }
              >
                {t('about.acknowledgments.viewProject')}
              </button>
            </div>

            <div className="about-section">
              <h3>{t('about.usageNotice.title')}</h3>
              <p>{t('about.usageNotice.description')}</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t('about.buttons.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
