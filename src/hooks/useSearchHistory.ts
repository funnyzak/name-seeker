import { useState, useCallback } from 'react';

const STORAGE_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

export const useSearchHistory = () => {
  // Initialize state with data from localStorage using lazy initialization
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
    return [];
  });

  // Add search record
  const addToHistory = useCallback((username: string) => {
    if (!username.trim()) return;

    setHistory(prev => {
      // Remove duplicate items
      const filtered = prev.filter(item => item !== username);
      // Add to the beginning
      const updated = [username, ...filtered];
      // Limit the number of items
      const limited = updated.slice(0, MAX_HISTORY_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      } catch (error) {
        console.error('Failed to save search history:', error);
      }

      return limited;
    });
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }, []);

  // Remove single record
  const removeFromHistory = useCallback((username: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item !== username);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update search history:', error);
      }
      return updated;
    });
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
};
