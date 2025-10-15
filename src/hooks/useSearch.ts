import { useState, useCallback, useEffect } from 'react';
import { tauriApi } from '../services/tauriApi';
import type {
  SearchResult,
  SearchProgress,
  SearchProgressPayload,
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
    error_count: 0,
    current_site: undefined
  });

  // 更新单个搜索结果
  const updateResult = useCallback((payload: SearchUpdatePayload) => {
    setResults(prevResults => {
      const existingIndex = prevResults.findIndex(r => r.site === payload.site);

      const newResult: SearchResult = {
        site: payload.site,
        status: payload.status,
        url: payload.url,
        error: payload.error,
        category: undefined, // 后端暂未提供
        metadata: undefined  // 后端暂未提供
      };

      if (existingIndex >= 0) {
        const updatedResults = [...prevResults];
        updatedResults[existingIndex] = newResult;
        return updatedResults;
      } else {
        return [...prevResults, newResult];
      }
    });
  }, []);

  // 更新搜索进度
  const updateProgress = useCallback((payload: SearchProgressPayload) => {
    setProgress({
      total_sites: payload.total_sites,
      checked_sites: payload.checked_sites,
      found_count: payload.found_count,
      error_count: payload.error_count,
      current_site: payload.current_site
    });
  }, []);

  // 完成搜索
  const finishSearch = useCallback((payload: SearchFinished) => {
    setIsSearching(false);

    // 使用后端提供的准确数据更新进度
    setProgress(prev => ({
      ...prev,
      total_sites: payload.total_sites,
      checked_sites: payload.total_sites, // 搜索完成时，所有网站都已检查
      found_count: payload.found_count,
      current_site: undefined // 清除当前正在检查的网站
    }));

    // 确保所有剩余的 Pending 状态都被正确处理
    setResults(prevResults =>
      prevResults.map(result => {
        if (result.status === 'Pending') {
          return {
            ...result,
            status: 'NotFound' as SearchResultStatus,
            error: '检查完成，未找到用户'
          };
        }
        return result;
      })
    );
  }, []);

  // 搜索错误处理
  const handleSearchError = useCallback((error: string) => {
    console.error('Search error:', error);
    setIsSearching(false);
    // 这里可以添加错误通知逻辑
  }, []);

  // 搜索停止处理
  const handleSearchStopped = useCallback(() => {
    setIsSearching(false);

    // 将所有 Pending 状态的结果标记为未完成，让用户知道这些网站没有被检查
    setResults(prevResults =>
      prevResults.map(result => {
        if (result.status === 'Pending') {
          return {
            ...result,
            status: 'Error' as SearchResultStatus,
            error: '搜索被用户停止'
          };
        }
        return result;
      })
    );

    // 更新进度显示，显示搜索已停止
    setProgress(prev => ({
      ...prev,
      current_site: undefined
    }));
  }, []);

  // 开始搜索
  const startSearch = useCallback(async (
    username: string,
    options?: {
      maxConcurrentRequests?: number;
      timeoutSeconds?: number;
      excludeNsfw?: boolean;
      categoryFilter?: string;
    }
  ) => {
    if (!username.trim()) {
      throw new Error('Username cannot be empty');
    }

    // 验证用户名格式
    const isValid = await tauriApi.validateUsername(username.trim());
    if (!isValid) {
      throw new Error('Invalid username format');
    }

    // 重置状态
    setResults([]);
    setProgress({
      total_sites: 0,
      checked_sites: 0,
      found_count: 0,
      error_count: 0,
      current_site: undefined
    });
    setIsSearching(true);

    try {
      await tauriApi.startSearch(username.trim(), options);
    } catch (error) {
      console.error('Failed to start search:', error);
      setIsSearching(false);
      throw error;
    }
  }, []);

  // 停止搜索
  const stopSearch = useCallback(async () => {
    try {
      const stopped = await tauriApi.stopSearch();
      return stopped;
    } catch (error) {
      console.error('Failed to stop search:', error);
      return false;
    }
  }, []);

  // 设置事件监听器
  useEffect(() => {
    let unsubscribers: (() => void)[] = [];

    const setupListeners = async () => {
      try {
        const unsubUpdate = await tauriApi.onSearchUpdate(updateResult);
        const unsubProgress = await tauriApi.onSearchProgress(updateProgress);
        const unsubFinished = await tauriApi.onSearchFinished(finishSearch);
        const unsubError = await tauriApi.onSearchError(handleSearchError);
        const unsubStopped = await tauriApi.onSearchStopped(handleSearchStopped);

        unsubscribers = [unsubUpdate, unsubProgress, unsubFinished, unsubError, unsubStopped];
      } catch (error) {
        console.error('Failed to setup search listeners:', error);
      }
    };

    setupListeners();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [updateResult, updateProgress, finishSearch, handleSearchError, handleSearchStopped]);

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
    stopSearch,
    getResultsByStatus,
    getStats
  };
};