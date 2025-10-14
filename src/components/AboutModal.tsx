import React from 'react';
import type { AboutModalProps } from '../types';

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container about-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>关于 Search My Name</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="about-content">
            <div className="about-section">
              <h3>版本信息</h3>
              <p>Search My Name v1.0.0</p>
              <p>一个跨平台的用户名搜索工具</p>
            </div>

            <div className="about-section">
              <h3>功能特性</h3>
              <ul>
                <li>在数百个网站上搜索用户名</li>
                <li>实时显示搜索进度</li>
                <li>本地运行，保护隐私</li>
                <li>跨平台桌面应用</li>
              </ul>
            </div>

            <div className="about-section">
              <h3>使用声明</h3>
              <p>
                本工具仅供教育和合法的自助研究目的使用。
                请遵守相关法律法规，负责任地使用本工具。
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