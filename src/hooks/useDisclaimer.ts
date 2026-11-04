import { useState, useEffect, useCallback } from 'react';
import { tauriApi } from '../services/tauriApi';
import { exit } from '@tauri-apps/plugin-process';

export const useDisclaimer = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [failure, setFailure] = useState<'saveFailed' | 'exitFailed' | null>(
    null
  );
  const [busy, setBusy] = useState(false);
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
      setBusy(true);
      setFailure(null);
      await tauriApi.setDisclaimerAccepted();
      setShowDisclaimer(false);
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Error accepting disclaimer:', error);
      setFailure('saveFailed');
    } finally {
      setBusy(false);
    }
  }, []);

  // Decline disclaimer
  const declineDisclaimer = useCallback(async () => {
    setBusy(true);
    try {
      await exit(0);
    } catch {
      setFailure('exitFailed');
    } finally {
      setBusy(false);
    }
  }, []);

  // Check when component mounts
  useEffect(() => {
    checkFirstLaunch();
  }, [checkFirstLaunch]);

  return {
    isFirstLaunch,
    showDisclaimer,
    failure,
    busy,
    isLoading,
    acceptDisclaimer,
    declineDisclaimer,
    checkFirstLaunch,
  };
};
