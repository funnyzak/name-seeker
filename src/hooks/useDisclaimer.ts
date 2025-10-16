import { useState, useEffect, useCallback } from 'react';
import { tauriApi } from '../services/tauriApi';
import { exit } from '@tauri-apps/plugin-process';

export const useDisclaimer = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if it's the first launch
  const checkFirstLaunch = useCallback(async () => {
    try {
      const firstLaunch = await tauriApi.isFirstLaunch();
      setIsFirstLaunch(firstLaunch);
      setShowDisclaimer(firstLaunch);
    } catch (error) {
      console.error('Error checking first launch:', error);
      setShowDisclaimer(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Accept disclaimer
  const acceptDisclaimer = useCallback(async () => {
    try {
      await tauriApi.setDisclaimerAccepted();
      setShowDisclaimer(false);
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Error accepting disclaimer:', error);
      setShowDisclaimer(false);
    }
  }, []);

  // Decline disclaimer
  const declineDisclaimer = useCallback(async () => {
    setShowDisclaimer(false);
    await exit(0);
  }, []);

  // Check when component mounts
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