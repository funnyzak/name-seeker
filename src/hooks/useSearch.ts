import { useState, useCallback, useEffect } from 'react';
import { tauriApi } from '../services/tauriApi';
import type {
  SearchResult,
  SearchProgress,
  SearchUpdatePayload,
  SearchFinished,
  SearchResultStatus
} from '../types';

export const useSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [progress, setProgress] = useState<SearchProgress>({
    total_sites: 0,
    checked_sites: 0,
    found_count: 0,
    error_count: 0
  });

  // 初始化搜索状态
  const initializeSearch = useCallback((totalSites: number) => {
    setResults([]);
    setProgress({
      total_sites: totalSites,
      checked_sites: 0,
      found_count: 0,
      error_count: 0
    });
    setIsSearching(true);
  }, []);

  // 更新单个搜索结果
  const updateResult = useCallback((payload: SearchUpdatePayload) => {
    setResults(prevResults => {
      const existingIndex = prevResults.findIndex(r => r.site === payload.site);

      const newResult: SearchResult = {
        site: payload.site,
        status: payload.status,
        url: payload.url,
        error: payload.error
      };

      if (existingIndex >= 0) {
        const updatedResults = [...prevResults];
        updatedResults[existingIndex] = newResult;
        return updatedResults;
      } else {
        return [...prevResults, newResult];
      }
    });

    // 更新进度
    setProgress(prev => ({
      ...prev,
      checked_sites: prev.checked_sites + 1,
      found_count: payload.status === 'Found' ? prev.found_count + 1 : prev.found_count,
      error_count: payload.status === 'Error' ? prev.error_count + 1 : prev.error_count
    }));
  }, []);

  // 完成搜索
  const finishSearch = useCallback((payload: SearchFinished) => {
    setIsSearching(false);
    setProgress(prev => ({
      ...prev,
      total_sites: payload.total_sites,
      found_count: payload.found_count
    }));
  }, []);

  // 开始搜索
  const startSearch = useCallback(async (username: string) => {
    if (!username.trim()) {
      throw new Error('Username cannot be empty');
    }

    try {
      await tauriApi.startSearch(username.trim());
    } catch (error) {
      console.error('Failed to start search:', error);
      setIsSearching(false);
      throw error;
    }
  }, []);

  // 设置事件监听器
  useEffect(() => {
    let unsubscribers: (() => void)[] = [];

    const setupListeners = async () => {
      try {
        const unsubUpdate = await tauriApi.onSearchUpdate(updateResult);
        const unsubFinished = await tauriApi.onSearchFinished(finishSearch);

        unsubscribers = [unsubUpdate, unsubFinished];
      } catch (error) {
        console.error('Failed to setup search listeners:', error);
      }
    };

    setupListeners();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [updateResult, finishSearch]);

  // 根据状态过滤结果
  const getResultsByStatus = useCallback((status: SearchResultStatus) => {
    return results.filter(result => result.status === status);
  }, [results]);

  // 获取统计信息
  const getStats = useCallback(() => {
    const found = results.filter(r => r.status === 'Found').length;
    const notFound = results.filter(r => r.status === 'NotFound').length;
    const errors = results.filter(r => r.status === 'Error').length;
    const pending = results.filter(r => r.status === 'Pending').length;

    return { found, notFound, errors, pending, total: results.length };
  }, [results]);

  return {
    isSearching,
    results,
    progress,
    startSearch,
    initializeSearch,
    getResultsByStatus,
    getStats
  };
};