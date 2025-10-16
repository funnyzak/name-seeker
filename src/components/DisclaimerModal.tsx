import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DisclaimerModalProps } from '../types';

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  isOpen,
  onAccept,
  onDecline
}) => {
  const { t } = useTranslation('modals');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{t('modals:disclaimer.title')}</h2>
        </div>

        <div className="modal-content">
          <div className="disclaimer-section">
            <h3>{t('modals:disclaimer.sections.warning.title')}</h3>
            <p>{t('modals:disclaimer.sections.warning.text')}</p>
          </div>

          <div className="disclaimer-section">
            <h3>{t('modals:disclaimer.sections.terms.title')}</h3>
            <ul>
              {(t('modals:disclaimer.sections.terms.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="disclaimer-section">
            <h3>{t('modals:disclaimer.sections.disclaimer.title')}</h3>
            <p>{t('modals:disclaimer.sections.disclaimer.text')}</p>
          </div>

          <div className="disclaimer-section">
            <h3>{t('modals:disclaimer.sections.privacy.title')}</h3>
            <p>{t('modals:disclaimer.sections.privacy.text')}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-decline"
            onClick={onDecline}
          >
            {t('modals:disclaimer.buttons.decline')}
          </button>
          <button
            className="btn btn-accept"
            onClick={onAccept}
          >
            {t('modals:disclaimer.buttons.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;