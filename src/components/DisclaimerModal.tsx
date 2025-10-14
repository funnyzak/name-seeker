import React from 'react';
import type { DisclaimerModalProps } from '../types';

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  isOpen,
  onAccept,
  onDecline
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>使用条款与免责声明</h2>
        </div>

        <div className="modal-content">
          <div className="disclaimer-section">
            <h3>⚠️ 重要提示</h3>
            <p>
              本工具仅用于教育和合法的自助研究目的。使用本工具搜索用户名时，
              您必须遵守适用的法律法规和服务条款。
            </p>
          </div>

          <div className="disclaimer-section">
            <h3>📋 使用条件</h3>
            <ul>
              <li>仅用于搜索您自己的用户名或获得明确授权的用户名</li>
              <li>不得用于恶意目的、骚扰或侵犯他人隐私</li>
              <li>遵守所有相关网站的条款和服务协议</li>
              <li>尊重他人的隐私权和数字身份</li>
            </ul>
          </div>

          <div className="disclaimer-section">
            <h3>⚖️ 免责声明</h3>
            <p>
              本工具按"原样"提供，不提供任何明示或暗示的保证。
              开发者不对使用本工具产生的任何后果承担责任。
              用户需自行承担使用风险。
            </p>
          </div>

          <div className="disclaimer-section">
            <h3>🔒 隐私说明</h3>
            <p>
              本工具仅在本地运行，不会收集、存储或传输任何个人信息。
              所有搜索操作都在您的设备上完成。
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-decline"
            onClick={onDecline}
          >
            拒绝并退出
          </button>
          <button
            className="btn btn-accept"
            onClick={onAccept}
          >
            我已阅读并同意
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;