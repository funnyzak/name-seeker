import { useState, useEffect, useCallback } from 'react';
import { tauriApi } from '../services/tauriApi';
import { exit } from '@tauri-apps/plugin-process';

export const useDisclaimer = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 检查是否为首次启动
  const checkFirstLaunch = useCallback(async () => {
    try {
      const firstLaunch = await tauriApi.isFirstLaunch();
      setIsFirstLaunch(firstLaunch);
      setShowDisclaimer(firstLaunch);
    } catch (error) {
      console.error('Error checking first launch:', error);
      // 出错时默认显示免责声明以确保用户安全
      setShowDisclaimer(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 接受免责声明
  const acceptDisclaimer = useCallback(async () => {
    try {
      await tauriApi.setDisclaimerAccepted();
      setShowDisclaimer(false);
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Error accepting disclaimer:', error);
      // 即使出错也关闭对话框，避免用户卡住
      setShowDisclaimer(false);
    }
  }, []);

  // 拒绝免责声明
  const declineDisclaimer = useCallback(async () => {
    setShowDisclaimer(false);
    await exit(0);
  }, []);

  // 组件挂载时检查
  useEffect(() => {
    checkFirstLaunch();
  }, [checkFirstLaunch]);

  return {
    isFirstLaunch,
    showDisclaimer,
    isLoading,
    acceptDisclaimer,
    declineDisclaimer,
    checkFirstLaunch
  };
};