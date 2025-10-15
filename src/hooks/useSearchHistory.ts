import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

export const useSearchHistory = () => {
  const [history, setHistory] = useState<string[]>([]);

  // 从 localStorage 加载历史记录
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  // 添加搜索记录
  const addToHistory = useCallback((username: string) => {
    if (!username.trim()) return;

    setHistory((prev) => {
      // 移除重复项
      const filtered = prev.filter(item => item !== username);
      // 添加到开头
      const updated = [username, ...filtered];
      // 限制数量
      const limited = updated.slice(0, MAX_HISTORY_ITEMS);
      
      // 保存到 localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
      
      return limited;
    });
  }, []);

  // 清除历史记录
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }, []);

  // 删除单个记录
  const removeFromHistory = useCallback((username: string) => {
    setHistory((prev) => {
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

